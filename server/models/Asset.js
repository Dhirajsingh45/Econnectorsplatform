const mongoose = require('mongoose');

const assetSchema = new mongoose.Schema({
  assetCode: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['Vehicle', 'Medical', 'Infrastructure', 'Equipment'], 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['Available', 'In Use', 'Maintenance', 'Retired'], 
    default: 'Available' 
  },
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lastUsed: { type: Date, default: Date.now },
  notes: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Asset', assetSchema);
