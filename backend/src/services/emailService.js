// services/emailService.js — Nodemailer transporter and email templates

const nodemailer = require('nodemailer');

// ── Transporter ────────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Verify transporter config on startup (non-fatal)
transporter.verify((err) => {
  if (err) console.warn('[Email] Transporter config issue:', err.message);
  else     console.log('[Email] SMTP transporter ready');
});

// ── Helpers ────────────────────────────────────────────────────────────────

/** Basic email format check — rejects obviously fake/blank addresses */
const isValidEmail = (email) =>
  typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());

/**
 * Silent send — never throws, never rejects.
 * If the address is invalid or SMTP returns an error (e.g. unknown user),
 * it just logs a soft warning so demo fake emails don't produce noise.
 */
const silentSend = async (mailOptions) => {
  const to = mailOptions.to;
  if (!isValidEmail(to)) {
    console.log(`[Email] Skipped (invalid address): ${to}`);
    return;
  }
  try {
    await transporter.sendMail(mailOptions);
    console.log(`[Email] Sent to ${to}`);
  } catch (err) {
    // Soft warning only — common for fake/non-existent email addresses
    console.warn(`[Email] Could not deliver to ${to}: ${err.message}`);
  }
};

const fmt = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

const nowIST = () => {
  const d = new Date();
  return d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'full', timeStyle: 'short' });
};

// Appointment date = 3 working days from now
const appointmentDate = () => {
  const d = new Date();
  let added = 0;
  while (added < 3) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) added++; // skip Sun & Sat
  }
  return d.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
};

// HTML wrapper
const html = (body) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background:#f1f5f9; margin:0; padding:0; }
    .wrap { max-width:600px; margin:2rem auto; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08); }
    .header { background:linear-gradient(135deg,#4f46e5,#2563eb); padding:2rem; text-align:center; }
    .header h1 { color:#fff; margin:0; font-size:1.5rem; letter-spacing:0.5px; }
    .header p  { color:rgba(255,255,255,0.8); margin:0.25rem 0 0; font-size:0.875rem; }
    .body   { padding:2rem; }
    .body h2 { color:#1e293b; font-size:1.1rem; margin:0 0 1rem; }
    .body p  { color:#475569; line-height:1.7; margin:0 0 0.75rem; font-size:0.9375rem; }
    .highlight { background:#f8fafc; border-left:4px solid #4f46e5; padding:1rem 1.25rem; border-radius:0 8px 8px 0; margin:1.25rem 0; }
    .highlight p { margin:0.25rem 0; font-size:0.875rem; }
    .highlight strong { color:#1e293b; }
    .doc-list { background:#f8fafc; border-radius:8px; padding:1rem 1.25rem; margin:1rem 0; }
    .doc-list p { margin:0 0 0.4rem; font-size:0.875rem; color:#475569; }
    .doc-list ul { margin:0.5rem 0 0; padding-left:1.25rem; }
    .doc-list ul li { color:#475569; font-size:0.875rem; margin-bottom:0.3rem; }
    .badge { display:inline-block; background:linear-gradient(135deg,#4f46e5,#2563eb); color:#fff; padding:0.25rem 0.75rem; border-radius:999px; font-size:0.8rem; font-weight:600; }
    .footer { background:#f8fafc; border-top:1px solid #e2e8f0; padding:1rem 2rem; text-align:center; color:#94a3b8; font-size:0.8rem; }
    a { color:#4f46e5; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <h1>🎓 SmartEduLoan</h1>
      <p>Education Loan Mediator Platform</p>
    </div>
    <div class="body">
      ${body}
    </div>
    <div class="footer">
      SmartEduLoan · Academic Project · This is an automated message, please do not reply.
    </div>
  </div>
</body>
</html>`;

// ── Email 1: Student — Bank Verification Successful ────────────────────────
async function sendStudentVerificationMail({ studentEmail, studentName, bankName, bankAddress, bankPhone,
  proposedAmount, approvedAmount, loanType, interestRate, tenureMonths, bankNote }) {
  const apptDate = appointmentDate();
  const apptTime = '10:30 AM – 1:00 PM IST';

  const subject = `✅ Loan Verified — Please Visit ${bankName} Branch`;

  const amountNoteHtml = approvedAmount && approvedAmount !== proposedAmount
    ? `<p style="color:#f59e0b; font-weight:600;">⚠️ Your approved amount of <strong>${fmt(approvedAmount)}</strong> differs from your proposed amount of <del>${fmt(proposedAmount)}</del>. Please carry this confirmation when visiting the branch.</p>`
    : '';

  const body = `
    <h2>Dear ${studentName},</h2>
    <p>Great news! <strong>${bankName}</strong> has reviewed and verified your education loan application on <strong>SmartEduLoan</strong>.</p>
    ${amountNoteHtml}

    <div class="highlight">
      <p><strong>📋 Approved Loan Details</strong></p>
      <p>Approved Amount: <strong>${fmt(approvedAmount || proposedAmount)}</strong></p>
      <p>Type: <strong>${(loanType || '').toUpperCase()}</strong></p>
      <p>Interest Rate: <strong>${interestRate}% p.a.</strong></p>
      <p>Tenure: <strong>${tenureMonths} months</strong></p>
    </div>

    <div class="highlight">
      <p><strong>📅 Branch Appointment</strong></p>
      <p>Date: <strong>${apptDate}</strong></p>
      <p>Time: <strong>${apptTime}</strong></p>
      <p>Bank: <strong>${bankName}</strong></p>
      <p>Address: <strong>${bankAddress}</strong></p>
      ${bankPhone ? `<p>Phone: <strong>${bankPhone}</strong></p>` : ''}
    </div>

    ${bankNote ? `<div class="highlight"><p><strong>💬 Message from Bank Manager</strong></p><p>${bankNote}</p></div>` : ''}

    <div class="doc-list">
      <p><strong>📎 Documents to Carry (Originals + Photocopies)</strong></p>
      <ul>
        <li>Aadhar Card (Self)</li>
        <li>PAN Card (Self)</li>
        <li>Father's / Guardian's Aadhar Card</li>
        <li>10th Grade Marks Memo / Certificate</li>
        <li>12th / Intermediate Certificate</li>
        <li>Income Certificate (issued by competent authority)</li>
        <li>JEE Mains / Advanced Score Card (if applicable)</li>
        <li>Passport-size Photographs (4 copies)</li>
        <li>Signature on plain white paper (3 copies)</li>
        <li>Admission letter / Fee structure from institution</li>
        <li>Bank passbook / cancelled cheque (savings account)</li>
      </ul>
    </div>

    <p>If you have any questions, please contact <strong>${bankName}</strong>${bankPhone ? ` at ${bankPhone}` : ''} or reach out via SmartEduLoan.</p>
    <p>Best of luck with your studies! 🎓</p>`;

  await silentSend({
    from: `"SmartEduLoan" <${process.env.EMAIL_USER}>`,
    to: studentEmail,
    subject,
    html: html(body)
  });
}


// ── Email 2: Admin — Bank Has Verified a Loan ─────────────────────────────
async function sendAdminVerificationMail({ studentName, studentEmail, bankName, loanAmount, loanType }) {
  const subject = `🏦 Bank Verification Done — ${studentName}'s Loan`;

  const body = `
    <h2>Loan Verification Update</h2>
    <p><strong>${bankName}</strong> has verified a student loan application on SmartEduLoan. Please log in to the Admin Portal to review and take the final approval decision.</p>

    <div class="highlight">
      <p><strong>Applicant:</strong> ${studentName} (${studentEmail})</p>
      <p><strong>Bank:</strong> ${bankName}</p>
      <p><strong>Loan Amount:</strong> ${fmt(loanAmount)}</p>
      <p><strong>Loan Type:</strong> ${(loanType || '').toUpperCase()}</p>
      <p><strong>Verified At:</strong> ${nowIST()}</p>
    </div>

    <p>Please log in to the <a href="http://localhost:5001/admin/applications.html">Admin Portal</a> and approve or reject this application.</p>`;

  await silentSend({
    from: `"SmartEduLoan" <${process.env.EMAIL_USER}>`,
    to: process.env.ADMIN_EMAIL,
    subject,
    html: html(body)
  });
}


// ── Email 3: Admin — Loan Disbursed ───────────────────────────────────────
async function sendAdminDisbursalMail({ studentName, studentEmail, bankName, loanAmount, loanType, tenureMonths }) {
  const subject = `💸 Loan Disbursed — ${studentName}`;

  const body = `
    <h2>Loan Disbursal Confirmation</h2>
    <p><strong>${bankName}</strong> has marked the following education loan as <span class="badge">DISBURSED</span>.</p>

    <div class="highlight">
      <p><strong>Applicant:</strong> ${studentName} (${studentEmail})</p>
      <p><strong>Bank:</strong> ${bankName}</p>
      <p><strong>Disbursed Amount:</strong> ${fmt(loanAmount)}</p>
      <p><strong>Loan Type:</strong> ${(loanType || '').toUpperCase()}</p>
      <p><strong>Tenure:</strong> ${tenureMonths} months</p>
      <p><strong>Disbursed At:</strong> ${nowIST()}</p>
    </div>

    <p>The loan has been successfully disbursed to the student. Please update your records accordingly.</p>`;

  await silentSend({
    from: `"SmartEduLoan" <${process.env.EMAIL_USER}>`,
    to: process.env.ADMIN_EMAIL,
    subject,
    html: html(body)
  });
}


// ── Email 4: Student — Disbursal Notice ────────────────────────────────────
async function sendDisbursalNoticeMail({ studentEmail, studentName, bankName, bankAddress, bankPhone,
  disbursedAmount, loanType, interestRate, tenureMonths, bankNote }) {

  const subject = `💰 Loan Disbursed — ${bankName} Account Credit Notice`;

  const body = `
    <h2>Dear ${studentName},</h2>
    <p>Your education loan has been <span class="badge">DISBURSED</span> by <strong>${bankName}</strong>. Please review the details below.</p>

    <div class="highlight">
      <p><strong>💰 Disbursement Details</strong></p>
      <p>Disbursed Amount: <strong style="font-size:1.1rem; color:#059669;">${fmt(disbursedAmount)}</strong></p>
      <p>Loan Type: <strong>${(loanType || '').toUpperCase()}</strong></p>
      <p>Interest Rate: <strong>${interestRate}% p.a.</strong></p>
      <p>Tenure: <strong>${tenureMonths} months</strong></p>
      <p>Date &amp; Time: <strong>${nowIST()}</strong></p>
    </div>

    <div class="highlight">
      <p><strong>🏦 Bank Details</strong></p>
      <p>Bank: <strong>${bankName}</strong></p>
      <p>Address: <strong>${bankAddress}</strong></p>
      ${bankPhone ? `<p>Phone: <strong>${bankPhone}</strong></p>` : ''}
    </div>

    ${bankNote ? `<div class="highlight"><p><strong>💬 Message from Bank Manager</strong></p><p>${bankNote}</p></div>` : ''}

    <div class="doc-list">
      <p><strong>📌 Next Steps</strong></p>
      <ul>
        <li>The amount will be credited to your registered bank account / institution account as per agreement</li>
        <li>Your first EMI will be due after the moratorium period as discussed</li>
        <li>Contact your bank for repayment schedule and EMI details</li>
        <li>Keep all loan documents safe for future reference</li>
      </ul>
    </div>

    <p>Congratulations and best of luck with your studies! 🎓</p>
    <p>For any queries, contact <strong>${bankName}</strong>${bankPhone ? ` at ${bankPhone}` : ''} or reach out via SmartEduLoan.</p>`;

  await silentSend({
    from: `"SmartEduLoan" <${process.env.EMAIL_USER}>`,
    to: studentEmail,
    subject,
    html: html(body)
  });
}

// ── Email 5: Admin — Disbursal Notice Sent ─────────────────────────────────
async function sendAdminDisbursalNoticeMail({ studentEmail, studentName, bankName, bankAddress,
  disbursedAmount, loanType, tenureMonths, bankNote }) {

  const subject = `📋 Disbursal Notice Sent — ${studentName}'s Loan (${bankName})`;

  const body = `
    <h2>Disbursal Notice Confirmation</h2>
    <p><strong>${bankName}</strong> has sent a disbursal notice to the student. Details are below for your records.</p>

    <div class="highlight">
      <p><strong>Applicant:</strong> ${studentName} (${studentEmail})</p>
      <p><strong>Bank:</strong> ${bankName}</p>
      <p><strong>Bank Address:</strong> ${bankAddress}</p>
      <p><strong>Disbursed Amount:</strong> <strong>${fmt(disbursedAmount)}</strong></p>
      <p><strong>Loan Type:</strong> ${(loanType || '').toUpperCase()}</p>
      <p><strong>Tenure:</strong> ${tenureMonths} months</p>
      <p><strong>Notice Sent At:</strong> ${nowIST()}</p>
      ${bankNote ? `<p><strong>Bank Manager Note:</strong> ${bankNote}</p>` : ''}
    </div>

    <p>Please log in to the <a href="http://localhost:5001/admin/applications.html">Admin Portal</a> and update the final loan records accordingly.</p>`;

  await silentSend({
    from: `"SmartEduLoan" <${process.env.EMAIL_USER}>`,
    to: process.env.ADMIN_EMAIL,
    subject,
    html: html(body)
  });
}

module.exports = {
  sendStudentVerificationMail,
  sendAdminVerificationMail,
  sendAdminDisbursalMail,
  sendDisbursalNoticeMail,
  sendAdminDisbursalNoticeMail
};
