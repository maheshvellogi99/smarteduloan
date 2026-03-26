const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./src/models/User');

mongoose.connect('mongodb://localhost:27017/smarteduloan', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  const admin = await User.findOne({ role: 'admin' });
  if (admin) {
    console.log('Admin found:', admin.email);
  } else {
    console.log('Admin not found, creating default admin@smartedu.com...');
    const passwordHash = await bcrypt.hash('admin123', 10);
    const newAdmin = await User.create({
      name: 'System Admin',
      email: 'admin@smartedu.com',
      passwordHash,
      role: 'admin'
    });
    console.log('Created admin:', newAdmin.email);
  }
  mongoose.disconnect();
}).catch(err => {
  console.error(err);
  mongoose.disconnect();
});
