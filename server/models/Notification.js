const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: {
    type: String,
    enum: [
      'dispatch', 'assignment', 'escalation', 'verification',
      'system', 'medical', 'foster', 'adoption', 'lost_found', 'training'
    ],
    default: 'system'
  },
  read: { type: Boolean, default: false },
  link: { type: String },
}, { timestamps: true });

// Index for fast per-user queries
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, read: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
