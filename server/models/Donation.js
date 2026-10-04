const mongoose = require('mongoose');

const donationSchema = new mongoose.Schema({
  transactionId: { type: String, required: true, unique: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  donor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  donorName: { type: String },
  donorEmail: { type: String },
  isAnonymous: { type: Boolean, default: false },
  caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
  campaign: { type: String, default: 'General Welfare' },
  paymentStatus: { 
    type: String, 
    enum: ['PENDING', 'COMPLETED', 'FAILED'], 
    default: 'COMPLETED' 
  },
  provider: { type: String, default: 'Stripe' },
}, { timestamps: true });

module.exports = mongoose.model('Donation', donationSchema);
