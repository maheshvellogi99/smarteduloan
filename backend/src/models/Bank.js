const mongoose = require('mongoose');

const bankSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    bankName: { type: String, required: true },
    bankCode: { type: String, required: true, unique: true },
    address: { type: String },
    contactPhone: { type: String }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Bank', bankSchema);
