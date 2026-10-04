const mongoose = require('mongoose');

const trainingCertificateSchema = new mongoose.Schema({
  certificateId: {
    type: String,
    unique: true,
    required: true,
    default: () => `FN-CERT-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`
  },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, required: true },
  moduleId: { type: String, required: true },
  moduleTitle: { type: String, required: true },
  category: { 
    type: String, 
    enum: ['rescue', 'foster', 'lost_found', 'community', 'wildlife'],
    required: true 
  },
  score: { type: Number, required: true },
  badgeAwarded: { type: String },
  issuedAt: { type: Date, default: Date.now },
  disclaimer: {
    type: String,
    default: 'This records completion of a FaunaNet community learning module. It is not a professional veterinary, government, emergency-response or regulated qualification.'
  }
}, { timestamps: true });

module.exports = mongoose.model('TrainingCertificate', trainingCertificateSchema);
