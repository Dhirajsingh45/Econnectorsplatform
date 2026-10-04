const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  description: { type: String, required: true },
  images: [{ type: String }],
  video: { type: String },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    address: { type: String },
    area: { type: String },
    city: { type: String },
    state: { type: String },
    country: { type: String },
    accuracy: { type: Number },
    source: { type: String, enum: ['gps', 'manual'], default: 'gps' },
    confirmed: { type: Boolean, default: false }
  },
  urgency: { 
    type: String, 
    enum: ['P4 - Low', 'P3 - Normal', 'P2 - High', 'P1 - Critical', 'Low', 'Medium', 'High', 'Critical'], 
    default: 'P3 - Normal' 
  },
  priorityLevel: {
    type: String,
    enum: ['P1', 'P2', 'P3', 'P4'],
    default: 'P3'
  },
  animalType: { 
    type: String, 
    enum: ['dog', 'cat', 'cow', 'bull', 'goat', 'pig', 'bird', 'monkey', 'wildlife', 'other'],
    default: 'dog'
  },
  status: { 
    type: String, 
    enum: [
      'NEW', 'TRIAGED', 'DISPATCHING', 'ASSIGNED', 'EN_ROUTE', 'ON_SCENE', 
      'RESCUED', 'AT_VET', 'RECOVERING', 'RESOLVED', 'CANCELLED', 'DUPLICATE', 'REJECTED',
      'pending', 'converted_to_task' // legacy compatibility
    ], 
    default: 'NEW' 
  },
  statusHistory: [{
    status: { type: String, required: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    note: { type: String },
    timestamp: { type: Date, default: Date.now }
  }],
  aiTriage: {
    suggestedSpecies: { type: String },
    injuryIndicators: [{ type: String }],
    severityScore: { type: Number, default: 0 },
    suggestedUrgency: { type: String, enum: ['P1', 'P2', 'P3', 'P4'] },
    recommendedResponderType: { type: String },
    duplicateLikelihood: { type: Number, default: 0 },
    animalDigitalId: { type: String },
  },
  humanDecision: {
    priority: { type: String, enum: ['P1', 'P2', 'P3', 'P4'] },
    overriddenBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    overrideReason: { type: String },
    timestamp: { type: Date }
  },
  isDuplicate: { type: Boolean, default: false },
  parentReport: { type: mongoose.Schema.Types.ObjectId, ref: 'Report' },
  animal: { type: mongoose.Schema.Types.ObjectId, ref: 'Animal' },
  isDemo: { type: Boolean, default: false },
  demoSessionId: { type: String, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Report', reportSchema);
