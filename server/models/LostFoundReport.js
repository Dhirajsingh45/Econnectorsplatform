const mongoose = require('mongoose');

const lostFoundReportSchema = new mongoose.Schema({
  reportId: {
    type: String,
    unique: true,
    default: () => `LF-${Math.floor(100000 + Math.random() * 900000)}`
  },
  type: { 
    type: String, 
    enum: ['LOST', 'FOUND', 'SIGHTING'], 
    required: true 
  },
  species: { 
    type: String, 
    enum: ['dog', 'cat', 'cow', 'bull', 'goat', 'pig', 'bird', 'monkey', 'wildlife', 'other'], 
    required: true 
  },
  petName: { type: String, default: '' },
  photos: [{ type: String }],
  
  // Specific physical attributes for precise match scoring
  attributes: {
    breed: { type: String, default: '' },
    primaryColor: { type: String, default: '' },
    size: { type: String, enum: ['Small', 'Medium', 'Large', 'Extra Large', 'Unknown'], default: 'Unknown' },
    gender: { type: String, enum: ['Male', 'Female', 'Unknown'], default: 'Unknown' },
    distinctiveFeatures: { type: String, default: '' },
    hasCollar: { type: Boolean, default: false },
    collarDetails: { type: String, default: '' },
    isInjured: { type: Boolean, default: false },
    injuryDetails: { type: String, default: '' },
    canHoldSafely: { type: Boolean, default: false }
  },

  lastSeenLocation: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    address: { type: String, default: '' },
    area: { type: String, default: '' },
    city: { type: String, default: '' },
    approximateOnly: { type: Boolean, default: true } // Privacy safeguard
  },
  lastSeenTime: { type: Date, default: Date.now },

  // Contact details: phone is masked on public endpoints
  contactName: { type: String, required: true },
  contactPhone: { type: String, required: true },
  isPhonePublic: { type: Boolean, default: false },

  identifyingMarks: { type: String, default: '' },
  circumstances: { type: String, default: '' },

  status: { 
    type: String, 
    enum: ['ACTIVE', 'POSSIBLE_MATCH', 'VERIFYING', 'REUNITED', 'CLOSED', 'TRANSFERRED_TO_RESCUE'], 
    default: 'ACTIVE' 
  },

  // Cross-module linking
  matchedReport: { type: mongoose.Schema.Types.ObjectId, ref: 'LostFoundReport' },
  linkedAnimal: { type: mongoose.Schema.Types.ObjectId, ref: 'Animal' },
  rescueTask: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
  rescueReport: { type: mongoose.Schema.Types.ObjectId, ref: 'Report' },

  // Sighting logs linked to this lost animal report
  sightings: [{
    location: {
      lat: Number,
      lng: Number,
      address: String,
      area: String
    },
    sightedAt: { type: Date, default: Date.now },
    notes: String,
    photo: String,
    direction: String,
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],

  // Reunion verification record
  reunion: {
    reunitedAt: Date,
    notes: String,
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    handoverLocation: String
  },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('LostFoundReport', lostFoundReportSchema);

