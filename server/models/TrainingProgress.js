const mongoose = require('mongoose');

const trainingProgressSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  moduleId: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['enrolled', 'in_progress', 'completed'], 
    default: 'enrolled' 
  },
  completedLessons: [{ type: String }],
  quizAttempts: [{
    score: { type: Number, required: true },
    totalQuestions: { type: Number, required: true },
    passed: { type: Boolean, required: true },
    timestamp: { type: Date, default: Date.now }
  }],
  bestScore: { type: Number, default: 0 },
  completedAt: { type: Date },
  certificate: { type: mongoose.Schema.Types.ObjectId, ref: 'TrainingCertificate' }
}, { timestamps: true });

trainingProgressSchema.index({ user: 1, moduleId: 1 }, { unique: true });

module.exports = mongoose.model('TrainingProgress', trainingProgressSchema);
