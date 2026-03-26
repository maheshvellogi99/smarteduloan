const mongoose = require('mongoose');

const bankProductSchema = new mongoose.Schema(
  {
    bank: { type: mongoose.Schema.Types.ObjectId, ref: 'Bank', required: true },
    name: { type: String, required: true },
    loanType: {
      type: String,
      enum: ['education', 'skill', 'personal'],
      required: true
    },
    minAmount: { type: Number, required: false, default: 10000 },
    maxAmount: { type: Number, required: false, default: 1000000 },
    interestRate: { type: Number, required: true },
    minTenureMonths: { type: Number, required: false, default: 6 },
    maxTenureMonths: { type: Number, required: false, default: 60 },
    minCreditScore: { type: Number, required: false, default: 300 },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('BankProduct', bankProductSchema);
