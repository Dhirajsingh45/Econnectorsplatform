const mongoose = require('mongoose');

const faunaNodeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: {
    type: String,
    enum: ['vet', 'shelter', 'rescuer', 'transport', 'volunteer'],
    required: true
  },
  status: {
    type: String,
    enum: ['Available', 'Busy', 'Emergency Only', 'Offline'],
    default: 'Available'
  },
  activeRegion: { type: String, required: true },
  city: String,
  zone: String,
  trustLevel: { type: Number, default: 0 },
  responseHistory: { type: Number, default: 0 },
  rescueCredits: { type: Number, default: 0 },
  contact: String,
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('FaunaNode', faunaNodeSchema);
