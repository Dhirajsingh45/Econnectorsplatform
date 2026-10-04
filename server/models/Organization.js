const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['ngo', 'shelter', 'vet_clinic', 'wildlife_trust'], 
    required: true 
  },
  registrationNumber: { type: String, required: true },
  contactEmail: { type: String, required: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String },
  location: {
    lat: { type: Number },
    lng: { type: Number },
  },
  verificationStatus: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected', 'suspended'], 
    default: 'pending' 
  },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  verifiedAt: { type: Date },
  managedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  activeVolunteersCount: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Organization', organizationSchema);
