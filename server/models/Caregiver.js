const mongoose = require('mongoose');

const caregiverSchema = new mongoose.Schema({
  animal: { type: mongoose.Schema.Types.ObjectId, ref: 'Animal', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['PRIMARY_CAREGIVER', 'SECONDARY_CAREGIVER', 'FEEDER', 'NGO_GUARDIAN'], default: 'PRIMARY_CAREGIVER' },
  feedingLocation: {
    lat: Number,
    lng: Number,
    address: String
  },
  careLogs: [{
    action: { type: String, required: true }, // e.g. 'Fed', 'Medication Given', 'Observation'
    notes: String,
    photo: String,
    timestamp: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Caregiver', caregiverSchema);
