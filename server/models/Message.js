const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // For DMs
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' }, // For Group chats
  text: { type: String, required: true },
  type: { type: String, enum: ['text', 'image', 'location', 'system'], default: 'text' },
  read: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);
