const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  admins: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  zone: String, // Optional: link to a specific operational zone
  active: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Group', groupSchema);
