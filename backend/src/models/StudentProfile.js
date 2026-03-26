const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  docType: {
    type: String,
    enum: [
      'aadhar', 'pan', 'signature', 'photo', 'income_certificate',
      'father_aadhar', 'secondary_marks_memo', 'intermediate_certificate',
      'jee_mains_scorecard', 'jee_advanced_scorecard'
    ],
    required: true
  },
  filename: { type: String, required: true },
  originalName: { type: String },
  mimeType: { type: String },
  size: { type: Number },
  url: { type: String },
  status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
  adminNote: { type: String },
  uploadedAt: { type: Date, default: Date.now }
});

const studyScoreSchema = new mongoose.Schema({
  level: {
    type: String,
    enum: ['10th', '12th', 'diploma', 'ug_sem1', 'ug_sem2', 'ug_sem3', 'ug_sem4', 'ug_sem5', 'ug_sem6', 'ug_sem7', 'ug_sem8', 'pg'],
    required: true
  },
  institution: { type: String },
  year: { type: Number },
  percentage: { type: Number, min: 0, max: 100 },
  remarks: { type: String }
});

const studentProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    courseName: { type: String },
    academicScore: { type: Number, min: 0, max: 100, required: true },
    attendance: { type: Number, min: 0, max: 100, required: true },
    internshipStatus: { type: String, enum: ['none', 'ongoing', 'completed'], default: 'none' },
    familyIncome: { type: Number, min: 0, required: true },
    previousLoanHistory: { type: String, default: 'none' },
    spendingBehaviorScore: { type: Number, min: 0, max: 100, required: true },
    creditScore: { type: Number, min: 0, max: 900, default: 0 },
    riskCategory: { type: String, enum: ['low', 'medium', 'high'], default: 'high' },
    maxEligibleAmount: { type: Number, default: 0 },
    recommendedInterestRate: { type: Number, default: 0 },
    // New fields
    studyScores: [studyScoreSchema],
    documents: [documentSchema],
    jeeScore: {
      appeared: { type: Boolean, default: false },
      mainsRank: { type: Number },
      mainsPercentile: { type: Number },
      advancedRank: { type: Number },
      year: { type: Number }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('StudentProfile', studentProfileSchema);
