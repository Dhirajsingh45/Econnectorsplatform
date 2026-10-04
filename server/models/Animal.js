const mongoose = require('mongoose');

const animalSchema = new mongoose.Schema({
  animalId: { 
    type: String, 
    required: true, 
    unique: true, 
    default: () => `FN-ANIMAL-${Math.floor(100000 + Math.random() * 900000)}`
  },
  faunaId: { type: String },
  species: { 
    type: String, 
    enum: ['dog', 'cat', 'cow', 'bull', 'goat', 'pig', 'bird', 'monkey', 'wildlife', 'other'], 
    required: true 
  },
  breed: { type: String },
  estimatedAge: { type: String },
  sex: { type: String, enum: ['male', 'female', 'unknown'], default: 'unknown' },
  photographs: [{ type: String }],
  images: [{ type: String }], // backward compatibility
  videos: [{ type: String }],
  identifyingMarkings: { type: String },
  features: { type: String }, // backward compatibility
  location: {
    lat: { type: Number },
    lng: { type: Number },
    address: { type: String },
    area: { type: String },
    city: { type: String },
  },
  status: { 
    type: String, 
    enum: [
      'reported', 'verified', 'critical', 'triaged', 'rescued', 
      'under_treatment', 'recovering', 'sterilized', 'available_for_foster', 
      'fostered', 'available_for_adoption', 'adopted', 'released', 'resolved'
    ], 
    default: 'reported' 
  },
  sterilizationStatus: { type: String, enum: ['yes', 'no', 'unknown'], default: 'unknown' },
  vaccinationRecords: [{
    vaccineName: { type: String, required: true },
    dateAdministered: { type: Date, default: Date.now },
    nextDueDate: { type: Date },
    administeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String },
  }],
  sightings: [{ type: mongoose.Schema.Types.ObjectId, ref: 'AnimalSighting' }],
  rescueHistory: [{
    task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    action: String,
    timestamp: { type: Date, default: Date.now }
  }],
  history: [{
    status: String,
    timestamp: { type: Date, default: Date.now }
  }],
  healthLogs: [{
    condition: String,
    treatment: String,
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    timestamp: { type: Date, default: Date.now }
  }],
  caregiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  guardian: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  currentOrganization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  adoptionStatus: { 
    type: String, 
    enum: ['not_available', 'available_for_adoption', 'application_pending', 'adopted'], 
    default: 'not_available' 
  },
  fosterStatus: { 
    type: String, 
    enum: ['not_available', 'available_for_foster', 'application_pending', 'fostered'], 
    default: 'not_available' 
  },
  qrCode: { type: String },
  rfidChip: { type: String },
  microchipId: { type: String },
  featuresVector: [{ type: Number }],
  isDemo: { type: Boolean, default: false },
  demoSessionId: { type: String, default: null },
}, { timestamps: true });

// Auto-populate faunaId if not set
animalSchema.pre('save', function() {
  if (!this.faunaId && this.animalId) {
    this.faunaId = this.animalId;
  }
  if ((!this.photographs || this.photographs.length === 0) && this.images && this.images.length > 0) {
    this.photographs = this.images;
  }
});

module.exports = mongoose.model('Animal', animalSchema);
