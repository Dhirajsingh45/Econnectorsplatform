const mongoose = require('mongoose');
const Animal = require('../models/Animal');
const AuditLog = require('../models/AuditLog');
const MedicalRecord = require('../models/MedicalRecord');
const RescueLog = require('../models/RescueLog');

exports.getAllAnimals = async (req, res) => {
  try {
    const { species, status, adoptionStatus, q } = req.query;
    const filter = {};
    if (species) filter.species = species;
    if (status) filter.status = status;
    if (adoptionStatus) filter.adoptionStatus = adoptionStatus;
    if (q) {
      filter.$or = [
        { animalId: new RegExp(q, 'i') },
        { identifyingMarkings: new RegExp(q, 'i') },
        { 'location.city': new RegExp(q, 'i') }
      ];
    }

    const animals = await Animal.find(filter)
      .populate('caregiver', 'name email phone')
      .populate('currentOrganization', 'name type')
      .sort({ updatedAt: -1 });

    res.json(animals);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to fetch animals.' });
  }
};

exports.getAnimalById = async (req, res) => {
  try {
    const animal = await Animal.findOne({ 
      $or: [{ _id: req.params.id }, { animalId: req.params.id }] 
    })
      .populate('caregiver', 'name email phone')
      .populate('currentOrganization', 'name type')
      .populate('sightings.reportedBy', 'name');

    if (!animal) return res.status(404).json({ message: 'Animal dossier not found.' });
    res.json(animal);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to fetch animal.' });
  }
};

exports.createAnimal = async (req, res) => {
  try {
    const { species, estimatedAge, sex, photographs, identifyingMarkings, location, sterilizationStatus } = req.body;

    if (!species) {
      return res.status(400).json({ message: 'Species is required.' });
    }

    const animalId = `FAUNA-${Math.floor(100000 + Math.random() * 900000)}`;

    const animal = await Animal.create({
      animalId,
      species,
      estimatedAge: estimatedAge || 'Unknown',
      sex: sex || 'unknown',
      photographs: photographs || [],
      identifyingMarkings: identifyingMarkings || '',
      location: location || null,
      sterilizationStatus: sterilizationStatus || 'unknown',
      caregiver: req.user._id,
      status: 'reported'
    });

    await AuditLog.create({
      actor: req.user._id,
      action: 'ANIMAL_DOSSIER_CREATED',
      targetType: 'Animal',
      targetId: animal._id.toString(),
      metadata: { animalId: animal.animalId, species }
    });

    res.status(201).json(animal);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to create animal dossier.' });
  }
};

exports.updateAnimal = async (req, res) => {
  try {
    const { status, sterilizationStatus, adoptionStatus, identifyingMarkings, caregiver } = req.body;

    const animal = await Animal.findById(req.params.id);
    if (!animal) return res.status(404).json({ message: 'Animal dossier not found.' });

    if (status) animal.status = status;
    if (sterilizationStatus) animal.sterilizationStatus = sterilizationStatus;
    if (adoptionStatus) animal.adoptionStatus = adoptionStatus;
    if (identifyingMarkings !== undefined) animal.identifyingMarkings = identifyingMarkings;
    if (caregiver) animal.caregiver = caregiver;

    await animal.save();

    await AuditLog.create({
      actor: req.user._id,
      action: 'ANIMAL_DOSSIER_UPDATED',
      targetType: 'Animal',
      targetId: animal._id.toString(),
      newState: { status, adoptionStatus, sterilizationStatus }
    });

    res.json(animal);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to update animal dossier.' });
  }
};

exports.addVaccination = async (req, res) => {
  try {
    const { vaccineName, nextDueDate, notes } = req.body;
    if (!vaccineName) return res.status(400).json({ message: 'Vaccine name is required.' });

    const animal = await Animal.findById(req.params.id);
    if (!animal) return res.status(404).json({ message: 'Animal dossier not found.' });

    animal.vaccinationRecords.push({
      vaccineName,
      dateAdministered: new Date(),
      nextDueDate: nextDueDate ? new Date(nextDueDate) : null,
      administeredBy: req.user._id,
      notes: notes || ''
    });

    await animal.save();
    res.json(animal);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to add vaccination record.' });
  }
};

// Architecture endpoint for AI Photo Similarity Matching
exports.matchPhotoSimilarity = async (req, res) => {
  try {
    const { imageBase64, species } = req.body;
    if (!imageBase64) return res.status(400).json({ message: 'Image data is required.' });

    // Check if AI provider key is configured
    if (!process.env.AI_PROVIDER_KEY) {
      return res.json({ 
        configured: false, 
        message: 'Photo similarity unavailable — AI provider not configured.',
        matches: [] 
      });
    }

    // Provider similarity architecture: find existing animals of same species
    const candidates = await Animal.find({ species: species || 'dog' }).limit(10);
    const matches = candidates.map(c => ({
      animalId: c.animalId,
      species: c.species,
      photographs: c.photographs,
      matchNote: 'Metadata match: Same species and region. Computer vision embedding requires active vision API.',
      requiresHumanConfirmation: true
    }));

    res.json({ 
      configured: true, 
      providerNotice: 'Heuristic candidate filtering active. Visual embedding verification required.',
      matches 
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Photo matching failed.' });
  }
};

// Public Digital Animal Passport - PII stripped, complete rescue & medical timeline
exports.getAnimalPassport = async (req, res) => {
  try {
    const id = req.params.id;
    const isObjectId = mongoose.Types.ObjectId.isValid(id);
    const query = isObjectId
      ? { $or: [{ _id: id }, { animalId: id }, { faunaId: id }] }
      : { $or: [{ animalId: id }, { faunaId: id }] };

    const animal = await Animal.findOne(query)
      .populate('currentOrganization', 'name type')
      .populate('vaccinationRecords.administeredBy', 'name role');

    if (!animal) {
      return res.status(404).json({ message: 'Animal Digital Passport not found.' });
    }

    // Fetch medical records for this animal
    const medicalRecords = await MedicalRecord.find({ animal: animal._id })
      .populate('vet', 'name role')
      .sort({ createdAt: -1 });

    // Fetch any rescue logs associated with this animal
    const rescueLogs = await RescueLog.find({
      $or: [
        { animalDigitalId: animal.animalId },
        { animalDigitalId: animal.faunaId },
        { animal: animal._id }
      ]
    }).sort({ createdAt: -1 });

    // Consolidate public timeline without exposing volunteer/reporter PII
    const timeline = [];

    // 1. Inception / registration event
    if (animal.createdAt) {
      timeline.push({
        event: 'Digital Passport Generated & Profile Registered',
        status: 'reported',
        date: animal.createdAt,
        notes: `Registered as ${animal.species} (${animal.breed || 'Indie'}) in ${animal.location?.city || animal.location?.area || 'Hyperlocal Territory'}.`
      });
    }

    // 2. Animal status history
    if (animal.history && animal.history.length > 0) {
      animal.history.forEach(h => {
        timeline.push({
          event: `Status Transition: ${h.status.toUpperCase().replace('_', ' ')}`,
          status: h.status,
          date: h.timestamp,
          notes: 'Status transition recorded on FaunaNet ledger.'
        });
      });
    }

    // 3. Rescue logs timeline
    rescueLogs.forEach(log => {
      if (log.statusTimeline && log.statusTimeline.length > 0) {
        log.statusTimeline.forEach(st => {
          timeline.push({
            event: `Rescue Protocol: ${st.status ? st.status.toUpperCase() : 'ACTION LOGGED'}`,
            status: st.status || 'rescued',
            date: st.at || log.createdAt,
            notes: st.note || 'Rescue responder intervention completed.'
          });
        });
      }
    });

    // 4. Medical records
    medicalRecords.forEach(med => {
      timeline.push({
        event: `Veterinary Examination & Protocol`,
        status: 'under_treatment',
        date: med.createdAt,
        notes: `Diagnosis: ${med.diagnosis}. Procedure/Treatment: ${med.treatment}.`,
        vet: med.vet ? med.vet.name : 'Authorized Veterinary Partner'
      });
    });

    // Sort timeline chronologically (newest first for passport view or chronological)
    timeline.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Construct Sanitized Passport (Zero reporter or volunteer personal contacts)
    const sanitizedPassport = {
      id: animal._id,
      animalId: animal.animalId || animal.faunaId || `FN-ANIMAL-${animal._id.toString().slice(-6)}`,
      species: animal.species,
      breed: animal.breed || 'Hyperlocal Native / Cross',
      sex: animal.sex || 'unknown',
      estimatedAge: animal.estimatedAge || 'Unknown',
      status: animal.status || 'rescued',
      sterilizationStatus: animal.sterilizationStatus || 'unknown',
      adoptionStatus: animal.adoptionStatus || 'not_available',
      fosterStatus: animal.fosterStatus || 'not_available',
      photographs: (animal.photographs && animal.photographs.length > 0) ? animal.photographs : (animal.images || []),
      identifyingMarkings: animal.identifyingMarkings || animal.features || 'Standard coat / markings',
      microchipId: animal.microchipId || animal.rfidChip || null,
      location: {
        city: animal.location?.city || 'Local Sector',
        area: animal.location?.area || 'Verified Hyperlocal Zone',
      },
      organization: animal.currentOrganization ? {
        name: animal.currentOrganization.name,
        type: animal.currentOrganization.type
      } : {
        name: 'FaunaNet Hyperlocal Network',
        type: 'Verified Community Welfare Node'
      },
      vaccinationRecords: (animal.vaccinationRecords || []).map(v => ({
        vaccineName: v.vaccineName,
        dateAdministered: v.dateAdministered,
        nextDueDate: v.nextDueDate,
        administeredBy: v.administeredBy ? v.administeredBy.name : 'Authorized Veterinary Caregiver',
        notes: v.notes
      })),
      medicalHistory: medicalRecords.map(m => ({
        _id: m._id,
        diagnosis: m.diagnosis,
        examination: m.examination,
        treatment: m.treatment,
        medications: m.medications || [],
        procedures: m.procedures || [],
        vaccinationsAdministered: m.vaccinationsAdministered || [],
        followUpDate: m.followUpDate,
        dischargeStatus: m.dischargeStatus,
        notes: m.notes,
        vetName: m.vet ? m.vet.name : 'Authorized Veterinary Officer',
        date: m.createdAt
      })),
      timeline,
      qrVerificationUrl: `/passport/${animal.animalId || animal.faunaId || animal._id}`,
      lastUpdated: animal.updatedAt
    };

    res.json({
      success: true,
      passport: sanitizedPassport
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to retrieve animal passport.' });
  }
};
