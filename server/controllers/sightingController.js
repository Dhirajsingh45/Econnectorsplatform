const AnimalSighting = require('../models/AnimalSighting');
const Animal = require('../models/Animal');
const AuditLog = require('../models/AuditLog');

const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
  if (typeof lat1 !== 'number' || typeof lon1 !== 'number' || typeof lat2 !== 'number' || typeof lon2 !== 'number') {
    return 0;
  }
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(2));
};

exports.createSighting = async (req, res) => {
  try {
    const { animalId, location, photo, conditionNotes } = req.body;
    if (!animalId || !location || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
      return res.status(400).json({ message: 'Animal ID and valid location coordinates are required.' });
    }

    const animal = await Animal.findOne({ $or: [{ _id: animalId }, { animalId }] });
    if (!animal) return res.status(404).json({ message: 'Animal dossier not found.' });

    let distKm = 0;
    if (animal.location?.lat && animal.location?.lng) {
      distKm = calculateDistanceKm(animal.location.lat, animal.location.lng, location.lat, location.lng);
    }

    const sighting = await AnimalSighting.create({
      animal: animal._id,
      location,
      photo: photo || '',
      observer: req.user._id,
      conditionNotes: conditionNotes || '',
      distanceFromLastSightingKm: distKm
    });

    // Update animal's current location to latest sighting
    animal.location = location;
    animal.sightings.push(sighting._id);
    await animal.save();

    await AuditLog.create({
      actor: req.user._id,
      action: 'SIGHTING_RECORDED',
      targetType: 'AnimalSighting',
      targetId: sighting._id.toString(),
      metadata: { animalId: animal.animalId, distKm }
    });

    const populated = await AnimalSighting.findById(sighting._id).populate('observer', 'name email');
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to record sighting.' });
  }
};

exports.getSightingsByAnimal = async (req, res) => {
  try {
    const { animalId } = req.params;
    const animal = await Animal.findOne({ $or: [{ _id: animalId }, { animalId }] });
    if (!animal) return res.status(404).json({ message: 'Animal dossier not found.' });

    const sightings = await AnimalSighting.find({ animal: animal._id })
      .populate('observer', 'name email')
      .sort({ timestamp: -1 });

    res.json(sightings);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to fetch sightings.' });
  }
};
