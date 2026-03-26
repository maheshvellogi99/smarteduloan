require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');

const authRoutes = require('./routes/auth');
const studentRoutes = require('./routes/student');
const adminRoutes = require('./routes/admin');
const bankRoutes = require('./routes/bank');
const User = require('./models/User');

const app = express();

// Use 5001 by default to avoid conflicts with system services on macOS
const PORT = process.env.PORT || 5001;
// NOTE: password contains '@', so it must be URL-encoded as '%40'
const MONGO_URI =
  process.env.MONGO_URI ||
  'mongodb+srv://Manoj:Manoj%40123@fsd.irbkac5.mongodb.net/?appName=FSD';

app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5001', 'https://smarteduloan.vercel.app'],
  credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
app.use(express.static(path.join(__dirname, '..', 'frontend', 'public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/bank', bankRoutes);

mongoose
  .connect(MONGO_URI)
  .then(async () => {
    console.log('Connected to MongoDB');

    try {
      // ensure a default admin user exists for demo / academic use
      const existingAdmin = await User.findOne({ role: 'admin' });
      if (!existingAdmin) {
        const bcrypt = require('bcrypt');
        const passwordHash = await bcrypt.hash('admin123', 10);
        const admin = await User.create({
          name: 'Default Admin',
          email: 'admin@smartedu.com',
          passwordHash,
          role: 'admin'
        });
        console.log('Created default admin user:', admin.email, '(password: admin123)');
      }
    } catch (seedErr) {
      console.error('Failed to ensure default admin user:', seedErr.message);
    }

    app.listen(PORT, () => {
      console.log(`Backend API listening on http://localhost:${PORT}`);
      console.log(`Frontend: run "npx serve public -p 3000" inside the frontend/ directory`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });
