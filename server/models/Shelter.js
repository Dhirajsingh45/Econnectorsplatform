const mongoose = require('mongoose');

const shelterSchema = new mongoose.Schema({
  name: { type: String, required: true },
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  managedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  capacityTotal: { type: Number, required: true, default: 20 },
  quarantineCapacity: { type: Number, default: 5 },
  location: {
    address: String,
    city: String,
    lat: Number,
    lng: Number,
  },
  supportedSpecies: [{ type: String }],
}, { timestamps: true });

module.exports = mongoose.model('Shelter', shelterSchema);
