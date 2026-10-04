const MedicalRecord = require('../models/MedicalRecord');
const Animal = require('../models/Animal');
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');
const { notifyUser, notifyMany } = require('../utils/notifyUser');

// ─── Create Medical Record ─────────────────────────────────────────────────────
exports.createMedicalRecord = async (req, res) => {
  try {
    if (!['vet', 'ngo', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only verified Veterinarians, NGOs, or Admins can create medical treatment records.' });
    }

    const {
      animalId, taskId,
      examination, diagnosis, treatment,
      vitals,
      medications, procedures, vaccinationsAdministered, surgeries,
      labResults,
      followUpDate, dischargeStatus, notes,
      clinicName, clinicAddress,
    } = req.body;

    if (!animalId || !examination || !diagnosis || !treatment) {
      return res.status(400).json({ message: 'Animal ID, examination, diagnosis, and treatment are required.' });
    }

    const animal = await Animal.findOne({ $or: [{ _id: animalId }, { animalId }] });
    if (!animal) return res.status(404).json({ message: 'Animal dossier not found.' });

    const record = await MedicalRecord.create({
      animal: animal._id,
      task: taskId || null,
      vet: req.user._id,
      examination,
      diagnosis,
      treatment,
      vitals: vitals || {},
      medications: medications || [],
      procedures: procedures || [],
      vaccinationsAdministered: vaccinationsAdministered || [],
      surgeries: surgeries || [],
      labResults: labResults || [],
      followUpDate: followUpDate ? new Date(followUpDate) : null,
      dischargeStatus: dischargeStatus || 'in_care',
      notes: notes || '',
      clinicName: clinicName || '',
      clinicAddress: clinicAddress || '',
    });

    // Also push vaccinations to the Animal dossier
    if (vaccinationsAdministered && vaccinationsAdministered.length > 0) {
      const vaccineDocs = vaccinationsAdministered.map(v => ({
        vaccineName: v,
        dateAdministered: new Date(),
        administeredBy: req.user._id,
      }));
      animal.vaccinationRecords.push(...vaccineDocs);
    }

    // Update animal status based on discharge state
    if (dischargeStatus === 'ready_for_shelter' || dischargeStatus === 'in_care') {
      animal.status = 'under_treatment';
    } else if (dischargeStatus === 'released_to_wild') {
      animal.status = 'released';
    } else if (dischargeStatus === 'ready_for_adoption') {
      animal.status = 'available_for_adoption';
      animal.adoptionStatus = 'available_for_adoption';
    }
    await animal.save();

    await AuditLog.create({
      actor: req.user._id,
      action: 'MEDICAL_RECORD_CREATED',
      targetType: 'MedicalRecord',
      targetId: record._id.toString(),
      metadata: { animalId: animal.animalId, diagnosis }
    });

    // Notify the caregiver/guardian if one is assigned
    if (animal.caregiver && animal.caregiver.toString() !== req.user._id.toString()) {
      await notifyUser(req, {
        recipient: animal.caregiver,
        title: '🏥 Medical Update',
        message: `A new medical record has been added for ${animal.species} ${animal.animalId}: ${diagnosis}. Status: ${(dischargeStatus || 'in_care').replace(/_/g, ' ')}.`,
        type: 'medical',
        link: '/app/health',
      });
    }

    // If ready for adoption, notify NGO/shelter staff
    if (dischargeStatus === 'ready_for_adoption') {
      const staff = await User.find({ role: { $in: ['ngo', 'shelter', 'admin'] }, isVerified: true }).select('_id');
      await notifyMany(req, staff.map(u => u._id), {
        title: '🐾 Animal Ready for Adoption',
        message: `${animal.species} ${animal.animalId} has been medically cleared and is now ready for adoption.`,
        type: 'adoption',
        link: '/app/adoption',
      });
    }

    const populated = await MedicalRecord.findById(record._id)
      .populate('vet', 'name email role')
      .populate('animal', 'animalId species photographs location status');

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to create medical record.' });
  }
};

// ─── Get Medical Records by Animal ─────────────────────────────────────────────
exports.getMedicalRecordsByAnimal = async (req, res) => {
  try {
    const { animalId } = req.params;
    const animal = await Animal.findOne({ $or: [{ _id: animalId }, { animalId }] });
    if (!animal) return res.status(404).json({ message: 'Animal dossier not found.' });

    const records = await MedicalRecord.find({ animal: animal._id })
      .populate('vet', 'name email role')
      .sort({ createdAt: -1 });

    res.json(records);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to fetch medical records.' });
  }
};

// ─── Get All Medical Records (staff view) ─────────────────────────────────────
exports.getAllMedicalRecords = async (req, res) => {
  try {
    const { dischargeStatus, limit = 100 } = req.query;
    const filter = {};
    if (dischargeStatus) filter.dischargeStatus = dischargeStatus;

    const records = await MedicalRecord.find(filter)
      .populate('vet', 'name email role')
      .populate('animal', 'animalId species photographs location status adoptionStatus')
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    res.json(records);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to fetch medical records.' });
  }
};

// ─── Get Single Medical Record ──────────────────────────────────────────────────
exports.getMedicalRecordById = async (req, res) => {
  try {
    const record = await MedicalRecord.findById(req.params.id)
      .populate('vet', 'name email role phone')
      .populate('animal', 'animalId species photographs location status adoptionStatus vaccinationRecords sterilizationStatus breed estimatedAge sex')
      .populate('task', 'taskId status urgency location');

    if (!record) return res.status(404).json({ message: 'Medical record not found.' });
    res.json(record);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to fetch medical record.' });
  }
};

// ─── Update Record (follow-up completion, status change) ──────────────────────
exports.updateMedicalRecord = async (req, res) => {
  try {
    if (!['vet', 'ngo', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const record = await MedicalRecord.findById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Medical record not found.' });

    const { dischargeStatus, followUpCompleted, followUpNotes, notes } = req.body;

    if (dischargeStatus) record.dischargeStatus = dischargeStatus;
    if (followUpCompleted !== undefined) record.followUpCompleted = Boolean(followUpCompleted);
    if (followUpNotes) record.followUpNotes = followUpNotes;
    if (notes) record.notes = notes;

    await record.save();

    // Cascade animal status update if discharge status changed
    if (dischargeStatus) {
      const animal = await Animal.findById(record.animal);
      if (animal) {
        if (dischargeStatus === 'ready_for_adoption') {
          animal.adoptionStatus = 'available_for_adoption';
          animal.status = 'available_for_adoption';
        } else if (dischargeStatus === 'released_to_wild') {
          animal.status = 'released';
        }
        await animal.save();
      }
    }

    await AuditLog.create({
      actor: req.user._id,
      action: 'MEDICAL_RECORD_UPDATED',
      targetType: 'MedicalRecord',
      targetId: record._id.toString(),
    });

    const updated = await MedicalRecord.findById(record._id)
      .populate('vet', 'name email role')
      .populate('animal', 'animalId species photographs location status');

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to update medical record.' });
  }
};

// ─── Medical Stats ─────────────────────────────────────────────────────────────
exports.getMedicalStats = async (req, res) => {
  try {
    const [total, inCare, readyForAdoption, released, deceased, withFollowUp] = await Promise.all([
      MedicalRecord.countDocuments(),
      MedicalRecord.countDocuments({ dischargeStatus: 'in_care' }),
      MedicalRecord.countDocuments({ dischargeStatus: 'ready_for_adoption' }),
      MedicalRecord.countDocuments({ dischargeStatus: 'released_to_wild' }),
      MedicalRecord.countDocuments({ dischargeStatus: 'deceased' }),
      MedicalRecord.countDocuments({ followUpDate: { $exists: true, $ne: null }, followUpCompleted: false }),
    ]);

    res.json({ total, inCare, readyForAdoption, released, deceased, withFollowUp });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to fetch medical stats.' });
  }
};
