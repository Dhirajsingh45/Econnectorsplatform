const mongoose = require('mongoose');

const abcCampaignSchema = new mongoose.Schema({
  campaignName: { type: String, required: true },
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  managedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  targetArea: { type: String, required: true },
  batchNumber: { type: String, required: true, unique: true },
  targetCount: { type: Number, default: 50 },
  animalsProcessed: [{
    animal: { type: mongoose.Schema.Types.ObjectId, ref: 'Animal' },
    capturedAt: { type: Date, default: Date.now },
    sterilizedAt: { type: Date },
    vaccinatedAt: { type: Date },
    releasedAt: { type: Date },
    releaseLocation: {
      lat: Number,
      lng: Number,
      address: String
    },
    veterinarian: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { 
      type: String, 
      enum: ['captured', 'sterilized', 'vaccinated', 'recovering', 'released'], 
      default: 'captured' 
    }
  }],
  status: { type: String, enum: ['ACTIVE', 'COMPLETED', 'SUSPENDED'], default: 'ACTIVE' }
}, { timestamps: true });

module.exports = mongoose.model('ABCCampaign', abcCampaignSchema);
