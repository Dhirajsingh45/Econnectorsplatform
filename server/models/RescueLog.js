const mongoose = require('mongoose');

const rescueLogSchema = new mongoose.Schema({
  task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
  report: { type: mongoose.Schema.Types.ObjectId, ref: 'Report' },
  animalDigitalId: String,
  animalType: String,
  zone: String,
  responders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  beforeImages: [String],
  afterImages: [String],
  treatments: [String],
  outcome: String,
  verificationStatus: {
    type: String,
    enum: ['pending', 'community verified', 'NGO verified', 'veterinary verified'],
    default: 'pending'
  },
  statusTimeline: [{
    status: String,
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    note: String,
    at: { type: Date, default: Date.now }
  }],
  searchText: String,
}, { timestamps: true });

module.exports = mongoose.model('RescueLog', rescueLogSchema);
