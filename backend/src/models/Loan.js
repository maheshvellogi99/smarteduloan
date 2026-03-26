const mongoose = require('mongoose');

const loanSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    profile: { type: mongoose.Schema.Types.ObjectId, ref: 'StudentProfile', required: true },
    loanType: {
      type: String,
      enum: ['education', 'skill', 'personal'],
      required: true
    },
    principalAmount: { type: Number, required: true },
    interestRate: { type: Number, required: true },
    tenureMonths: { type: Number, required: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    adminDecisionNote: { type: String },
    adminApprovedAt: { type: Date },
    bank: { type: mongoose.Schema.Types.ObjectId, ref: 'Bank' },
    bankProduct: { type: mongoose.Schema.Types.ObjectId, ref: 'BankProduct' },
    bankVerified: { type: Boolean, default: false },
    bankVerifiedAt: { type: Date },
    bankVerifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAmount: { type: Number },          // amount bank manager sets at verification
    bankNote: { type: String },                // manager's note / instructions to student
    disbursementStatus: { type: String, enum: ['pending', 'disbursed'], default: 'pending' },
    disbursedAt: { type: Date },
    disbursedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    disbursedAmount: { type: Number },         // actual amount disbursed (may differ)
    disbursalNoticeSentAt: { type: Date },     // when the disbursal notice email was sent
    documents: [
      {
        docType: {
          type: String,
          enum: ['aadhaar', 'admission_letter', 'income_certificate', 'marksheet'],
          required: true
        },
        filename: String,
        originalName: String,
        mimeType: String,
        size: Number,
        url: String,
        status: {
          type: String,
          enum: ['pending', 'verified', 'rejected'],
          default: 'pending'
        },
        verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        verifiedAt: Date
      }
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Loan', loanSchema);

