const mongoose = require('mongoose');

const fosterApplicationSchema = new mongoose.Schema({
  animal: { type: mongoose.Schema.Types.ObjectId, ref: 'Animal', required: true },
  applicant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Legacy top-level fields for backwards compatibility
  housingType: { type: String, default: 'Apartment' },
  hasOtherPets: { type: Boolean, default: false },
  durationWeeks: { type: Number, default: 4 },
  experienceDescription: { type: String, default: '' },
  
  // Comprehensive Multi-step Application Details
  details: {
    fullName: String,
    phone: String,
    email: String,
    city: String,
    housingType: { type: String, default: 'Apartment' },
    residenceOwnership: { type: String, enum: ['Owned', 'Rented', 'Other'], default: 'Owned' },
    landlordPermission: { type: Boolean, default: true },
    hasYard: { type: Boolean, default: false },
    existingPets: { type: String, default: 'None' },
    hasChildren: { type: Boolean, default: false },
    childrenAges: String,
    dailyHoursAway: { type: Number, default: 4 },
    emergencyAvailability: { type: Boolean, default: false },
    specialNeedsExperience: { type: Boolean, default: false },
    experienceSummary: String,
    feedingCommitment: { type: Boolean, default: true },
    vetVisitsCommitment: { type: Boolean, default: true },
    regularCheckinsCommitment: { type: Boolean, default: true }
  },

  status: { 
    type: String, 
    enum: [
      'DRAFT', 'SUBMITTED', 'PENDING', 'UNDER_REVIEW', 'MORE_INFO_REQUIRED', 
      'VERIFICATION', 'APPROVED', 'MEET_AND_GREET', 'PLACEMENT_SCHEDULED', 
      'ACTIVE', 'PLACED', 'COMPLETED', 'RETURNED', 'FOSTER_TO_ADOPT', 'REJECTED'
    ], 
    default: 'PENDING' 
  },
  reviewNotes: { type: String, default: '' },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  startDate: { type: Date },
  endDate: { type: Date },

  // Welfare Check-ins
  checkIns: [{
    date: { type: Date, default: Date.now },
    eatingNormally: { type: Boolean, default: true },
    drinkingNormally: { type: Boolean, default: true },
    sleepingNormally: { type: Boolean, default: true },
    medicationGiven: { type: Boolean, default: false },
    unusualBehavior: { type: Boolean, default: false },
    notes: { type: String, default: '' },
    photo: { type: String, default: '' },
    loggedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],

  // Foster Emergencies & Incident Escalations
  emergencies: [{
    date: { type: Date, default: Date.now },
    emergencyType: { 
      type: String, 
      enum: ['injury', 'serious_illness', 'escaped', 'behavioral_emergency', 'cannot_continue', 'other'],
      required: true 
    },
    severity: { type: String, enum: ['critical', 'urgent', 'moderate'], default: 'urgent' },
    description: { type: String, required: true },
    status: { type: String, enum: ['open', 'in_progress', 'resolved'], default: 'open' },
    resolvedAt: Date,
    resolutionNotes: String,
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],

  adoptedApplication: { type: mongoose.Schema.Types.ObjectId, ref: 'AdoptionApplication' }
}, { timestamps: true });

module.exports = mongoose.model('FosterApplication', fosterApplicationSchema);

