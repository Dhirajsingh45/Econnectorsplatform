const FosterApplication = require('../models/FosterApplication');
const Animal = require('../models/Animal');
const AdoptionApplication = require('../models/AdoptionApplication');
const AuditLog = require('../models/AuditLog');
const mongoose = require('mongoose');
const { notifyUser, notifyMany } = require('../utils/notifyUser');

// GET /api/foster/stats - Real metrics from database
exports.getFosterStats = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.json({ needingFoster: 0, availableFoster: 0, activePlacements: 0, pendingApplications: 0 });
    }

    const [availableFoster, activePlacements, pendingApplications] = await Promise.all([
      Animal.countDocuments({
        $or: [
          { fosterStatus: 'available_for_foster' },
          { status: 'available_for_foster' },
          { status: { $in: ['recovering', 'rescued'] }, fosterStatus: { $ne: 'fostered' } }
        ]
      }),
      FosterApplication.countDocuments({ status: { $in: ['PLACED', 'ACTIVE'] } }),
      FosterApplication.countDocuments({ status: { $in: ['PENDING', 'SUBMITTED', 'UNDER_REVIEW', 'VERIFICATION'] } })
    ]);

    res.json({
      needingFoster: availableFoster,
      availableFoster,
      activePlacements,
      pendingApplications
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to fetch foster stats.' });
  }
};

// GET /api/foster/animals - Discover animals needing foster
exports.getFosterAnimals = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.json([]);
    }

    const { species, urgency, city, search } = req.query;
    const filter = {
      $or: [
        { fosterStatus: 'available_for_foster' },
        { status: 'available_for_foster' },
        { status: { $in: ['recovering', 'rescued'] }, fosterStatus: { $ne: 'fostered' } }
      ]
    };

    if (species && species !== 'all') {
      filter.species = species.toLowerCase();
    }
    if (city) {
      filter['location.city'] = new RegExp(city, 'i');
    }
    if (search) {
      filter.$or = [
        { breed: new RegExp(search, 'i') },
        { identifyingMarkings: new RegExp(search, 'i') },
        { animalId: new RegExp(search, 'i') }
      ];
    }

    const animals = await Animal.find(filter)
      .select('animalId species breed estimatedAge sex photographs images location status fosterStatus sterilizationStatus vaccinationRecords createdAt')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(animals);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to fetch foster animals.' });
  }
};

// GET /api/foster/animals/:animalId - Detail view for a foster candidate
exports.getFosterAnimalDetail = async (req, res) => {
  try {
    const { animalId } = req.params;
    const animal = await Animal.findOne({ $or: [{ _id: mongoose.isValidObjectId(animalId) ? animalId : null }, { animalId }] })
      .populate('caregiver', 'name email phone')
      .populate('currentOrganization', 'name type');

    if (!animal) return res.status(404).json({ message: 'Animal not found.' });
    res.json(animal);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to fetch foster animal detail.' });
  }
};

// POST /api/foster - Submit multi-step foster application
exports.submitApplication = async (req, res) => {
  try {
    const { 
      animalId, 
      housingType, 
      hasOtherPets, 
      durationWeeks, 
      experienceDescription,
      details 
    } = req.body;

    if (!animalId) {
      return res.status(400).json({ message: 'Animal ID is required.' });
    }

    const animal = await Animal.findOne({ $or: [{ _id: mongoose.isValidObjectId(animalId) ? animalId : null }, { animalId }] });
    if (!animal) return res.status(404).json({ message: 'Animal dossier not found.' });

    // Check if user already has an active or pending application for this animal
    const existing = await FosterApplication.findOne({
      animal: animal._id,
      applicant: req.user._id,
      status: { $in: ['PENDING', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'ACTIVE', 'PLACED'] }
    });

    if (existing) {
      return res.status(409).json({ message: 'You already have an active application for this animal.' });
    }

    const application = await FosterApplication.create({
      animal: animal._id,
      applicant: req.user._id,
      housingType: housingType || details?.housingType || 'Apartment',
      hasOtherPets: hasOtherPets !== undefined ? Boolean(hasOtherPets) : Boolean(details?.existingPets && details.existingPets !== 'None'),
      durationWeeks: Number(durationWeeks || details?.durationWeeks || 4),
      experienceDescription: experienceDescription || details?.experienceSummary || 'Experienced caregiver applicant',
      details: details || {
        fullName: req.user.name,
        email: req.user.email,
        phone: req.user.phone || '',
        housingType: housingType || 'Apartment',
        residenceOwnership: 'Owned',
        landlordPermission: true,
        hasYard: false,
        existingPets: hasOtherPets ? 'Yes' : 'None',
        hasChildren: false,
        dailyHoursAway: 4,
        emergencyAvailability: true,
        specialNeedsExperience: false,
        experienceSummary: experienceDescription || 'Ready to provide a safe home.',
        feedingCommitment: true,
        vetVisitsCommitment: true,
        regularCheckinsCommitment: true
      },
      status: 'SUBMITTED'
    });

    animal.fosterStatus = 'application_pending';
    await animal.save();

    await AuditLog.create({
      actor: req.user._id,
      action: 'FOSTER_APPLICATION_SUBMITTED',
      targetType: 'FosterApplication',
      targetId: application._id.toString(),
      metadata: { animalId: animal.animalId }
    });

    const populated = await FosterApplication.findById(application._id)
      .populate('animal', 'animalId species photographs location status fosterStatus')
      .populate('applicant', 'name email phone');

    res.status(201).json(populated);
  } catch (error) {
    console.error('Foster application error:', error);
    res.status(500).json({ message: error.message || 'Failed to submit foster application.' });
  }
};

// GET /api/foster - Get applications (user's own or organization's)
exports.getApplications = async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === 'citizen' || req.user.role === 'volunteer') {
      filter.applicant = req.user._id;
    }

    const applications = await FosterApplication.find(filter)
      .populate('animal', 'animalId species photographs location status fosterStatus breed estimatedAge sex')
      .populate('applicant', 'name email phone role')
      .populate('reviewedBy', 'name email role')
      .sort({ createdAt: -1 });

    res.json(applications);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to fetch foster applications.' });
  }
};

// GET /api/foster/my-placements - Active foster animals currently cared for by the user
exports.getMyPlacements = async (req, res) => {
  try {
    const filter = {
      status: { $in: ['PLACED', 'ACTIVE'] }
    };
    if (req.user.role === 'citizen' || req.user.role === 'volunteer') {
      filter.applicant = req.user._id;
    }

    const placements = await FosterApplication.find(filter)
      .populate('animal')
      .populate('applicant', 'name email phone')
      .sort({ startDate: -1 });

    res.json(placements);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to fetch active foster placements.' });
  }
};

// PUT /api/foster/:id/review - Review and transition application state
exports.reviewApplication = async (req, res) => {
  try {
    if (!['ngo', 'shelter', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only verified Organizations or Admins can review foster applications.' });
    }

    const { status, reviewNotes } = req.body;
    const allowed = [
      'UNDER_REVIEW', 'MORE_INFO_REQUIRED', 'VERIFICATION', 'APPROVED', 
      'MEET_AND_GREET', 'PLACEMENT_SCHEDULED', 'ACTIVE', 'PLACED', 
      'COMPLETED', 'RETURNED', 'REJECTED'
    ];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: `Invalid status: ${status}` });
    }

    const application = await FosterApplication.findById(req.params.id);
    if (!application) return res.status(404).json({ message: 'Application not found.' });

    application.status = status;
    if (reviewNotes !== undefined) application.reviewNotes = reviewNotes;
    application.reviewedBy = req.user._id;

    if (['PLACED', 'ACTIVE'].includes(status)) {
      application.startDate = application.startDate || new Date();
      application.endDate = new Date(Date.now() + (application.durationWeeks || 4) * 7 * 24 * 60 * 60 * 1000);
    }
    await application.save();

    const animal = await Animal.findById(application.animal);
    if (animal) {
      if (['PLACED', 'ACTIVE'].includes(status)) {
        animal.fosterStatus = 'fostered';
        animal.status = 'fostered';
      } else if (['REJECTED', 'COMPLETED', 'RETURNED'].includes(status)) {
        animal.fosterStatus = 'available_for_foster';
      }
      await animal.save();
    }

    // Notify the applicant
    await notifyUser(req, {
      recipient: application.applicant,
      title: `🐾 Foster Application ${status.replace(/_/g, ' ')}`,
      message: `Your foster application status has changed to: ${status.replace(/_/g, ' ')}. ${reviewNotes ? 'Note: ' + reviewNotes : ''}`,
      type: 'foster',
      link: '/app/foster'
    });

    await AuditLog.create({
      actor: req.user._id,
      action: `FOSTER_APPLICATION_${status}`,
      targetType: 'FosterApplication',
      targetId: application._id.toString(),
    });

    const populated = await FosterApplication.findById(application._id)
      .populate('animal', 'animalId species photographs location status fosterStatus')
      .populate('applicant', 'name email phone');

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to review foster application.' });
  }
};

// POST /api/foster/:id/check-in - Record a recurring welfare check-in
exports.addCheckIn = async (req, res) => {
  try {
    const { 
      eatingNormally, 
      drinkingNormally, 
      sleepingNormally, 
      medicationGiven, 
      unusualBehavior, 
      notes, 
      photo 
    } = req.body;

    const application = await FosterApplication.findById(req.params.id);
    if (!application) return res.status(404).json({ message: 'Foster application not found.' });

    // Ensure only the applicant or assigned org/admin can log check-ins
    const isApplicant = application.applicant.toString() === req.user._id.toString();
    const isPrivileged = ['ngo', 'shelter', 'admin', 'vet'].includes(req.user.role);
    if (!isApplicant && !isPrivileged) {
      return res.status(403).json({ message: 'Not authorized to log check-ins for this foster record.' });
    }

    const checkIn = {
      date: new Date(),
      eatingNormally: eatingNormally !== undefined ? Boolean(eatingNormally) : true,
      drinkingNormally: drinkingNormally !== undefined ? Boolean(drinkingNormally) : true,
      sleepingNormally: sleepingNormally !== undefined ? Boolean(sleepingNormally) : true,
      medicationGiven: Boolean(medicationGiven),
      unusualBehavior: Boolean(unusualBehavior),
      notes: notes || '',
      photo: photo || '',
      loggedBy: req.user._id
    };

    application.checkIns.push(checkIn);
    await application.save();

    await AuditLog.create({
      actor: req.user._id,
      action: 'FOSTER_CHECKIN_LOGGED',
      targetType: 'FosterApplication',
      targetId: application._id.toString(),
      metadata: { unusualBehavior: checkIn.unusualBehavior }
    });

    res.status(201).json({ message: 'Check-in saved successfully.', checkIn, application });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to log foster check-in.' });
  }
};

// POST /api/foster/:id/emergency - Report a foster emergency / escalation
exports.reportEmergency = async (req, res) => {
  try {
    const { emergencyType, severity = 'urgent', description } = req.body;
    if (!emergencyType || !description) {
      return res.status(400).json({ message: 'Emergency type and detailed description are required.' });
    }

    const application = await FosterApplication.findById(req.params.id)
      .populate('animal');
    if (!application) return res.status(404).json({ message: 'Foster application not found.' });

    const emergency = {
      date: new Date(),
      emergencyType,
      severity,
      description,
      status: 'open',
      reportedBy: req.user._id
    };

    application.emergencies.push(emergency);
    await application.save();

    // Notify reviewing or parent organization/admins
    if (application.reviewedBy) {
      await notifyUser(req, {
        recipient: application.reviewedBy,
        title: `🚨 Foster Emergency: ${emergencyType}`,
        message: `Emergency reported for animal ${application.animal?.animalId || 'fostered'}: ${description.substring(0, 100)}`,
        type: 'foster',
        link: '/app/foster'
      });
    }

    await AuditLog.create({
      actor: req.user._id,
      action: 'FOSTER_EMERGENCY_REPORTED',
      targetType: 'FosterApplication',
      targetId: application._id.toString(),
      metadata: { emergencyType, severity }
    });

    res.status(201).json({ message: 'Emergency beacon broadcast to welfare network.', emergency, application });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to submit foster emergency.' });
  }
};

// POST /api/foster/:id/foster-to-adopt - Transition from foster to adoption workflow
exports.fosterToAdopt = async (req, res) => {
  try {
    const { notes } = req.body;
    const application = await FosterApplication.findById(req.params.id);
    if (!application) return res.status(404).json({ message: 'Foster application not found.' });

    if (application.applicant.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only the active foster caregiver can initiate foster-to-adopt.' });
    }

    // Create connected AdoptionApplication
    const adoptionApp = await AdoptionApplication.create({
      animal: application.animal,
      applicant: req.user._id,
      housingType: application.details?.housingType || application.housingType || 'Apartment',
      hasOtherPets: application.details?.existingPets ? application.details.existingPets !== 'None' : (application.hasOtherPets || false),
      experienceDescription: `Foster-to-adopt transition for animal under active foster care. Caregiver statement: ${notes || 'Immediate permanent adoption requested by foster parent.'}`,
      status: 'PENDING',
      isFosterToAdopt: true,
      linkedFosterApplicationId: application._id,
    });

    application.status = 'FOSTER_TO_ADOPT';
    application.adoptedApplication = adoptionApp._id;
    await application.save();

    const animal = await Animal.findById(application.animal);
    if (animal) {
      animal.adoptionStatus = 'application_pending';
      await animal.save();
    }

    await AuditLog.create({
      actor: req.user._id,
      action: 'FOSTER_TO_ADOPT_INITIATED',
      targetType: 'AdoptionApplication',
      targetId: adoptionApp._id.toString(),
      metadata: { fosterApplicationId: application._id.toString() }
    });

    res.status(201).json({
      message: 'Foster-to-adopt application successfully submitted and linked.',
      adoptionApplication: adoptionApp,
      fosterApplication: application
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to initiate foster-to-adopt transition.' });
  }
};

