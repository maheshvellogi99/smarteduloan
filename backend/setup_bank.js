const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./src/models/User');
const Bank = require('./src/models/Bank');

mongoose.connect('mongodb://localhost:27017/smarteduloan').then(async () => {
  console.log('Connected to DB');
  
  let bankUser = await User.findOne({ email: 'bank@smartedu.com' });
  if (!bankUser) {
    const passwordHash = await bcrypt.hash('bank123', 10);
    bankUser = await User.create({
      name: 'State Bank Admin',
      email: 'bank@smartedu.com',
      passwordHash,
      role: 'bank'
    });
    console.log('Created Default Bank User: bank@smartedu.com / bank123');
  } else {
    console.log('Bank user already exists');
  }

  // Find SBI bank, delete it if it's orphaned, then re-create
  const existingSbi = await Bank.findOne({ bankCode: 'SBI' });
  if (existingSbi) {
     if (existingSbi.user.toString() !== bankUser._id.toString()) {
       console.log('Found conflicting SBI Bank document. Removing it to assign to our new user.');
       await Bank.deleteOne({ _id: existingSbi._id });
     } else {
       console.log('Bank document already correct.');
     }
  }

  let bankData = await Bank.findOne({ user: bankUser._id });
  if (!bankData) {
    await Bank.create({
      user: bankUser._id,
      bankName: 'State Bank of India',
      bankCode: 'SBI'
    });
    console.log('Created Default Bank Configuration (SBI)');
  }
  
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
