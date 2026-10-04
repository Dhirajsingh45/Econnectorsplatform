const mongoose = require('mongoose');

const userSettingsSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  messengerSync: {
    whatsapp: { enabled: { type: Boolean, default: false }, reviewQueue: { type: Boolean, default: true } },
    telegram: { enabled: { type: Boolean, default: false }, reviewQueue: { type: Boolean, default: true } },
    discord: { enabled: { type: Boolean, default: false }, reviewQueue: { type: Boolean, default: true } },
  },
}, { timestamps: true });

module.exports = mongoose.model('UserSettings', userSettingsSchema);
