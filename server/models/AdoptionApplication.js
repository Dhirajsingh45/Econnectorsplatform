const mongoose = require('mongoose');

/**
 * AdoptionApplication — expanded schema for Phase 7
 *
 * Adds: homeVisitDate, references, fosterTransition, interviewNotes,
 * contractSignedAt, followUpSchedule, linkedFosterApplicationId
 */
const adoptionApplicationSchema = new mongoose.Schema({
  animal: { type: mongoose.Schema.Types.ObjectId, ref: 'Animal', required: true },
  applicant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // --- Household & Experience ---
  housingType: { type: String, required: true },
  hasOtherPets: { type: Boolean, default: false },
  otherPetsDescription: { type: String },
  experienceDescription: { type: String, required: true },
  dailySchedule: { type: String }, // e.g. "Work 9-5, home by 6pm, partner works from home"
  hasYard: { type: Boolean, default: false },
  householdAdults: { type: Number, default: 1 },
  householdChildren: { type: Number, default: 0 },
  allergiesInHousehold: { type: Boolean, default: false },

  // --- References ---
  references: [{
    name: { type: String },
    phone: { type: String },
    relationship: { type: String }
  }],

  // --- Application lifecycle ---
  status: {
    type: String,
    enum: ['PENDING', 'UNDER_REVIEW', 'HOME_VISIT_SCHEDULED', 'APPROVED', 'REJECTED', 'CANCELLED', 'ADOPTED'],
    default: 'PENDING'
  },
  reviewNotes: { type: String },
  interviewNotes: { type: String },
  homeVisitDate: { type: Date },
  homeVisitCompleted: { type: Boolean, default: false },

  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date },

  // Contract
  contractSignedAt: { type: Date },
  contractDocumentUrl: { type: String },

  // Post-adoption follow-up schedule
  followUpSchedule: [{
    dueDate: { type: Date },
    note: { type: String },
    completed: { type: Boolean, default: false }
  }],

  // If this was converted from a foster-to-adopt application
  linkedFosterApplicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'FosterApplication' },
  isFosterToAdopt: { type: Boolean, default: false },

  // Demo mode
  isDemo: { type: Boolean, default: false },
  demoSessionId: { type: String, default: null },

}, { timestamps: true });

module.exports = mongoose.model('AdoptionApplication', adoptionApplicationSchema);
