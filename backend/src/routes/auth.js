const express = require('express');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const Bank = require('../models/Bank');
const { signToken } = require('../middleware/auth');

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, bankName, bankCode, contactPhone, age, dob } = req.body;

    const effectiveRole = role === 'admin' ? 'admin'
      : role === 'bank' ? 'bank' : 'student';

    if (effectiveRole === 'bank') {
      if (!bankName || !bankCode || !email || !password) {
        return res.status(400).json({
          message: 'Bank name, branch code, branch email and password are required'
        });
      }
      const existingBankCode = await Bank.findOne({ bankCode: bankCode.trim() });
      if (existingBankCode) {
        return res.status(409).json({ message: 'Bank branch code already registered' });
      }
    } else {
      if (!name || !email || !password) {
        return res.status(400).json({ message: 'Name, email and password are required' });
      }
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const userFields = {
      name: effectiveRole === 'bank' ? bankName.trim() : name,
      email,
      passwordHash,
      role: effectiveRole
    };
    if (effectiveRole === 'student') {
      if (age) userFields.age = Number(age);
      if (dob) userFields.dob = new Date(dob);
    }

    const user = await User.create(userFields);

    if (effectiveRole === 'bank') {
      await Bank.create({
        user: user._id,
        bankName: bankName.trim(),
        bankCode: bankCode.trim(),
        contactPhone: contactPhone ? contactPhone.trim() : undefined
      });
    }

    const token = signToken(user);
    res.status(201).json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'register yourself and try to login' });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ message: 'password is wrong re-enter password' });
    }

    const token = signToken(user);
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Login failed' });
  }
});

module.exports = router;

