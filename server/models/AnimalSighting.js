const mongoose = require('mongoose');

const animalSightingSchema = new mongoose.Schema({
  animal: { type: mongoose.Schema.Types.ObjectId, ref: 'Animal', required: true },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    address: { type: String },
    area: { type: String },
    city: { type: String }
  },
  photo: { type: String },
  observer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  conditionNotes: { type: String },
  distanceFromLastSightingKm: { type: Number },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('AnimalSighting', animalSightingSchema);
