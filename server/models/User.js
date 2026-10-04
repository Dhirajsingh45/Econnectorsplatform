const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['citizen', 'volunteer', 'ngo', 'vet', 'shelter', 'admin'], 
    default: 'citizen' 
  },
  avatar: { type: String },
  location: {
    lat: { type: Number },
    lng: { type: Number },
    address: { type: String },
    city: { type: String },
    state: { type: String },
  },
  availability: { 
    type: String, 
    enum: ['available', 'busy', 'offline'], 
    default: 'offline' 
  },
  serviceRadiusKm: { type: Number, default: 10 },
  supportedAnimalTypes: [{ type: String }],
  vehicleAvailable: { type: Boolean, default: false },
  equipment: [{ type: String }],
  experience: { type: String },
  verificationStatus: { 
    type: String, 
    enum: ['unverified', 'pending', 'approved', 'rejected'], 
    default: 'unverified' 
  },
  verificationNotes: { type: String },
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  level: { type: Number, default: 1 },
  points: { type: Number, default: 0 },
  trustScore: { type: Number, default: 0 },
  verifiedReportCount: { type: Number, default: 0 },
  completedTaskCount: { type: Number, default: 0 },
  trainingCompleted: [{
    moduleId: { type: Number },
    completedAt: { type: Date, default: Date.now },
  }],
  verified: { type: Boolean, default: false },
  language: { type: String, default: 'en' },
  theme: { type: String, default: 'dark' },
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
