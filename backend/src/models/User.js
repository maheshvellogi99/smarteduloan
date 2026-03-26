const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['student', 'admin', 'bank'], default: 'student' },
    // Student-only optional fields
    age: { type: Number },
    dob: { type: Date }
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);

