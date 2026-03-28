require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

transporter.verify((err) => {
  if (err) {
    console.error('SMTP Connection failed:', err.message);
    process.exit(1);
  } else {
    console.log('SMTP Config Ready!');
    transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.ADMIN_EMAIL,
      subject: 'Test Email from Antigravity',
      text: 'If you receive this, your App Password and .env are perfectly working!'
    }).then(() => {
      console.log('Test email sent successfully to', process.env.ADMIN_EMAIL);
      process.exit(0);
    }).catch(err => {
      console.error('Mailing failed:', err.message);
      process.exit(1);
    });
  }
});
