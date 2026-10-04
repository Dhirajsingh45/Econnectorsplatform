const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  animalType: { type: String, default: 'animal' },
  type: { 
    type: String, 
    enum: ['Rescue', 'Feeding', 'Medical', 'Transport', 'Verification'], 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['NEW', 'Reported', 'Dispatched', 'Accepted', 'En Route', 'In Progress', 'Stabilized', 'Completed', 'Verified', 'EXPIRED', 'CANCELLED'], 
    default: 'Reported' 
  },
  urgency: { 
    type: String, 
    enum: ['P1', 'P2', 'P3', 'P4', 'Low', 'Medium', 'High', 'Critical'], 
    default: 'P3' 
  },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  animal: { type: mongoose.Schema.Types.ObjectId, ref: 'Animal' },
  report: { type: mongoose.Schema.Types.ObjectId, ref: 'Report' },
  location: {
    lat: Number,
    lng: Number,
    address: String,
    area: String,
    city: String,
    state: String,
    country: String,
    accuracy: Number,
    source: { type: String, enum: ['gps', 'manual'], default: 'gps' },
    confirmed: { type: Boolean, default: false }
  },
  proofImages: [String],
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  dispatch: {
    dispatchedAt: Date,
    slaDurationSeconds: { type: Number, default: 900 }, // Default 15 minute SLA
    slaExpiresAt: Date, // Server-derived timestamp
    acceptedAt: Date,
    enRouteAt: Date,
    onSceneAt: Date,
    rescuedAt: Date,
    stabilizedAt: Date,
    completedAt: Date,
    escalatedAt: Date,
    escalationState: {
      type: String,
      enum: ['none', 'volunteers_notified', 'ngo_notified', 'admin_notified', 'expired'],
      default: 'none'
    },
    eligibleResponders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    responderStatus: { type: String, default: 'Awaiting dispatch' },
    responderDistanceKm: Number,
    etaMinutes: Number,
    quickMessages: [{
      text: String,
      author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      at: { type: Date, default: Date.now }
    }]
  },
  checklist: {
    reviewCase: { type: Boolean, default: false },
    assessSceneSafety: { type: Boolean, default: false },
    locateAnimal: { type: Boolean, default: false },
    beginRescue: { type: Boolean, default: false },
    stabilizeAnimal: { type: Boolean, default: false },
    arrangeTransport: { type: Boolean, default: false },
    completeHandoff: { type: Boolean, default: false },
    updatedAt: { type: Date, default: Date.now }
  },
  concurrencyLock: { type: Boolean, default: false },
  isDemo: { type: Boolean, default: false },
  demoSessionId: { type: String, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Task', taskSchema);
