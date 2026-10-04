const AdoptionApplication = require('../models/AdoptionApplication');
const Animal = require('../models/Animal');
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');
const { notifyUser, notifyMany } = require('../utils/notifyUser');

// ─── Submit Adoption Application ───────────────────────────────────────────────
exports.submitApplication = async (req, res) => {
  try {
    const {
      animalId,
      housingType,
      hasOtherPets,
      otherPetsDescription,
      experienceDescription,
      dailySchedule,
      hasYard,
      householdAdults,
      householdChildren,
      allergiesInHousehold,
      references,
    } = req.body;

    if (!animalId || !housingType || !experienceDescription) {
      return res.status(400).json({ message: 'Animal ID, housing type, and experience description are required.' });
    }

    const animal = await Animal.findById(animalId);
    if (!animal) return res.status(404).json({ message: 'Animal not found.' });

    if (!['available_for_adoption', 'not_available'].includes(animal.adoptionStatus) &&
        animal.adoptionStatus !== 'not_available' &&
        animal.status !== 'healthy' &&
        animal.status !== 'rehabilitated' &&
        animal.status !== 'sterilized' &&
        animal.adoptionStatus !== 'available_for_adoption') {
      if (animal.adoptionStatus === 'adopted') {
        return res.status(400).json({ message: 'This animal has already been adopted.' });
      }
      if (animal.adoptionStatus === 'application_pending') {
        return res.status(400).json({ message: 'An adoption application is already pending for this animal.' });
      }
    }

    const application = await AdoptionApplication.create({
      animal: animal._id,
      applicant: req.user._id,
      housingType,
      hasOtherPets: Boolean(hasOtherPets),
      otherPetsDescription: otherPetsDescription || '',
      experienceDescription,
      dailySchedule: dailySchedule || '',
      hasYard: Boolean(hasYard),
      householdAdults: householdAdults || 1,
      householdChildren: householdChildren || 0,
      allergiesInHousehold: Boolean(allergiesInHousehold),
      references: Array.isArray(references) ? references : [],
    });

    animal.adoptionStatus = 'application_pending';
    await animal.save();

    await AuditLog.create({
      actor: req.user._id,
      action: 'ADOPTION_APPLICATION_SUBMITTED',
      targetType: 'AdoptionApplication',
      targetId: application._id.toString(),
      metadata: { animalId: animal.animalId }
    });

    // Notify NGO/shelter/admin staff about new application
    const staff = await User.find({ role: { $in: ['ngo', 'shelter', 'admin'] }, isVerified: true }).select('_id');
    await notifyMany(req, staff.map(u => u._id), {
      title: '🐾 New Adoption Application',
      message: `A new adoption application has been submitted for ${animal.species} ${animal.animalId} by ${req.user.name || 'a citizen'}.`,
      type: 'adoption',
      link: '/app/adoption',
    });

    const populated = await AdoptionApplication.findById(application._id)
      .populate('animal', 'animalId species photographs location status adoptionStatus')
      .populate('applicant', 'name email phone');

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to submit adoption application.' });
  }
};

// ─── Get Applications ──────────────────────────────────────────────────────────
exports.getApplications = async (req, res) => {
  try {
    const filter = {};
    // Citizens only see their own; staff see all
    if (req.user.role === 'citizen') {
      filter.applicant = req.user._id;
    }

    const applications = await AdoptionApplication.find(filter)
      .populate('animal', 'animalId species photographs location status adoptionStatus sterilizationStatus vaccinationRecords breed estimatedAge sex')
      .populate('applicant', 'name email phone role')
      .populate('reviewedBy', 'name role')
      .sort({ createdAt: -1 });

    res.json(applications);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to fetch adoption applications.' });
  }
};

// ─── Get Single Application ────────────────────────────────────────────────────
exports.getApplicationById = async (req, res) => {
  try {
    const application = await AdoptionApplication.findById(req.params.id)
      .populate('animal', 'animalId species photographs location status adoptionStatus sterilizationStatus vaccinationRecords breed estimatedAge sex')
      .populate('applicant', 'name email phone role')
      .populate('reviewedBy', 'name role')
      .populate('linkedFosterApplicationId', 'status createdAt');

    if (!application) return res.status(404).json({ message: 'Application not found.' });

    // Enforce ownership for citizens
    if (req.user.role === 'citizen' && application.applicant._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    res.json(application);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to fetch application.' });
  }
};

// ─── Review Application (NGO / Shelter / Admin) ────────────────────────────────
exports.reviewApplication = async (req, res) => {
  try {
    if (!['ngo', 'shelter', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only verified Organizations or Admins can review adoption applications.' });
    }

    const { status, reviewNotes, interviewNotes, homeVisitDate, homeVisitCompleted } = req.body;

    const validStatuses = ['UNDER_REVIEW', 'HOME_VISIT_SCHEDULED', 'APPROVED', 'REJECTED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: `Status must be one of: ${validStatuses.join(', ')}.` });
    }

    const application = await AdoptionApplication.findById(req.params.id)
      .populate('applicant', '_id name email')
      .populate('animal', 'animalId species');

    if (!application) return res.status(404).json({ message: 'Application not found.' });

    application.status = status;
    application.reviewNotes = reviewNotes || application.reviewNotes || '';
    application.interviewNotes = interviewNotes || application.interviewNotes || '';
    application.reviewedBy = req.user._id;
    application.reviewedAt = new Date();

    if (homeVisitDate) application.homeVisitDate = new Date(homeVisitDate);
    if (homeVisitCompleted !== undefined) application.homeVisitCompleted = Boolean(homeVisitCompleted);

    // If APPROVED — mark animal as adopted, generate follow-up schedule
    if (status === 'APPROVED') {
      const animal = await Animal.findById(application.animal._id || application.animal);
      if (animal) {
        animal.status = 'adopted';
        animal.adoptionStatus = 'adopted';
        await animal.save();
      }
      application.contractSignedAt = new Date();

      // Create a 30-day and 90-day follow-up
      application.followUpSchedule = [
        { dueDate: new Date(Date.now() + 30 * 86400000), note: '30-day welfare check-in', completed: false },
        { dueDate: new Date(Date.now() + 90 * 86400000), note: '90-day wellness follow-up', completed: false },
      ];

      // Notify applicant
      await notifyUser(req, {
        recipient: application.applicant._id,
        title: '🎉 Adoption Approved!',
        message: `Congratulations! Your adoption application for ${application.animal?.species} ${application.animal?.animalId} has been APPROVED. The shelter will contact you shortly to arrange pickup.`,
        type: 'adoption',
        link: '/app/adoption',
      });

    } else if (status === 'REJECTED') {
      const animal = await Animal.findById(application.animal._id || application.animal);
      if (animal && animal.adoptionStatus === 'application_pending') {
        animal.adoptionStatus = 'available_for_adoption';
        await animal.save();
      }

      await notifyUser(req, {
        recipient: application.applicant._id,
        title: 'Adoption Application Update',
        message: `Your adoption application for ${application.animal?.species} ${application.animal?.animalId} was not approved at this time. Reason: ${reviewNotes || 'Please contact the shelter for details.'}`,
        type: 'adoption',
        link: '/app/adoption',
      });

    } else if (status === 'HOME_VISIT_SCHEDULED') {
      await notifyUser(req, {
        recipient: application.applicant._id,
        title: '🏠 Home Visit Scheduled',
        message: `A home visit for your adoption application (${application.animal?.species} ${application.animal?.animalId}) has been scheduled${homeVisitDate ? ' for ' + new Date(homeVisitDate).toLocaleDateString() : ''}. Please ensure someone is available.`,
        type: 'adoption',
        link: '/app/adoption',
      });

    } else if (status === 'UNDER_REVIEW') {
      await notifyUser(req, {
        recipient: application.applicant._id,
        title: 'Application Under Review',
        message: `Your adoption application for ${application.animal?.species} ${application.animal?.animalId} is now under review by our team. We will contact you soon.`,
        type: 'adoption',
        link: '/app/adoption',
      });
    }

    await application.save();

    await AuditLog.create({
      actor: req.user._id,
      action: `ADOPTION_APPLICATION_${status}`,
      targetType: 'AdoptionApplication',
      targetId: application._id.toString(),
      metadata: { animalId: application.animal?.animalId, applicantId: application.applicant._id }
    });

    const updated = await AdoptionApplication.findById(application._id)
      .populate('animal', 'animalId species photographs location status adoptionStatus')
      .populate('applicant', 'name email phone')
      .populate('reviewedBy', 'name role');

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to review adoption application.' });
  }
};

// ─── Cancel Application (Applicant self-service) ──────────────────────────────
exports.cancelApplication = async (req, res) => {
  try {
    const application = await AdoptionApplication.findById(req.params.id)
      .populate('animal', 'animalId species adoptionStatus');

    if (!application) return res.status(404).json({ message: 'Application not found.' });

    if (application.applicant.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the applicant can cancel their own application.' });
    }

    if (['APPROVED', 'ADOPTED'].includes(application.status)) {
      return res.status(400).json({ message: 'Cannot cancel an already approved or completed adoption.' });
    }

    application.status = 'CANCELLED';
    await application.save();

    // Restore animal availability
    const animal = await Animal.findById(application.animal._id || application.animal);
    if (animal && animal.adoptionStatus === 'application_pending') {
      animal.adoptionStatus = 'available_for_adoption';
      await animal.save();
    }

    await AuditLog.create({
      actor: req.user._id,
      action: 'ADOPTION_APPLICATION_CANCELLED',
      targetType: 'AdoptionApplication',
      targetId: application._id.toString(),
    });

    res.json({ success: true, message: 'Application cancelled.' });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to cancel application.' });
  }
};

// ─── Get Adoption Stats (for staff dashboards) ─────────────────────────────────
exports.getAdoptionStats = async (req, res) => {
  try {
    if (!['ngo', 'shelter', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const [total, pending, underReview, homeVisit, approved, rejected] = await Promise.all([
      AdoptionApplication.countDocuments(),
      AdoptionApplication.countDocuments({ status: 'PENDING' }),
      AdoptionApplication.countDocuments({ status: 'UNDER_REVIEW' }),
      AdoptionApplication.countDocuments({ status: 'HOME_VISIT_SCHEDULED' }),
      AdoptionApplication.countDocuments({ status: 'APPROVED' }),
      AdoptionApplication.countDocuments({ status: 'REJECTED' }),
    ]);

    res.json({ total, pending, underReview, homeVisit, approved, rejected });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to fetch adoption stats.' });
  }
};
