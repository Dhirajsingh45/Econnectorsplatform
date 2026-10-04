const mongoose = require('mongoose');

/**
 * MedicalRecord — expanded schema for Phase 8
 *
 * Adds: vitals, follow-up completion, attachments, medications with completion tracking,
 * weight history, lab results reference, and vet clinic info.
 */
const medicalRecordSchema = new mongoose.Schema({
  animal: { type: mongoose.Schema.Types.ObjectId, ref: 'Animal', required: true },
  task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
  vet: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // ─── Clinical Details ───────────────────────────────────────────────────────
  examination: { type: String, required: true },
  diagnosis: { type: String, required: true },
  treatment: { type: String, required: true },

  // ─── Vitals at Time of Examination ─────────────────────────────────────────
  vitals: {
    weightKg: { type: Number },
    temperatureCelsius: { type: Number },
    heartRateBpm: { type: Number },
    respiratoryRate: { type: Number },
    mucousMembraneColor: { type: String }, // e.g. 'pink', 'pale', 'cyanotic'
    capillaryRefillTime: { type: String }, // e.g. '< 2s', '> 3s'
    bodyConditionScore: { type: Number, min: 1, max: 9 }, // BCS 1-9 scale
  },

  // ─── Medications ───────────────────────────────────────────────────────────
  medications: [{
    name: String,
    dosage: String,
    frequency: String,
    durationDays: Number,
    route: String, // e.g. 'oral', 'IV', 'topical', 'injection'
    completed: { type: Boolean, default: false }
  }],

  // ─── Procedures & Interventions ────────────────────────────────────────────
  procedures: [{ type: String }],
  vaccinationsAdministered: [{ type: String }],
  surgeries: [{ type: String }],

  // ─── Lab & Diagnostic Results ──────────────────────────────────────────────
  labResults: [{
    testName: String,
    result: String,
    referenceRange: String,
    conductedAt: { type: Date, default: Date.now }
  }],

  // ─── Follow-Up ─────────────────────────────────────────────────────────────
  followUpDate: { type: Date },
  followUpCompleted: { type: Boolean, default: false },
  followUpNotes: { type: String },

  // ─── Discharge & Status ────────────────────────────────────────────────────
  dischargeStatus: {
    type: String,
    enum: ['in_care', 'ready_for_shelter', 'released_to_wild', 'ready_for_adoption', 'deceased'],
    default: 'in_care'
  },

  // ─── Clinic / Institution ──────────────────────────────────────────────────
  clinicName: { type: String },
  clinicAddress: { type: String },

  notes: { type: String },

  // ─── Document Attachments ──────────────────────────────────────────────────
  attachments: [{ type: String }],

  // Demo mode
  isDemo: { type: Boolean, default: false },
  demoSessionId: { type: String, default: null },

}, { timestamps: true });

module.exports = mongoose.model('MedicalRecord', medicalRecordSchema);
