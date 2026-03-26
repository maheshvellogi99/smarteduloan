const express = require('express');
const Bank = require('../models/Bank');
const BankProduct = require('../models/BankProduct');
const Loan = require('../models/Loan');
const { auth } = require('../middleware/auth');
const { sendStudentVerificationMail, sendAdminVerificationMail, sendAdminDisbursalMail,
        sendDisbursalNoticeMail, sendAdminDisbursalNoticeMail } = require('../services/emailService');

const router = express.Router();

// Public: list active bank products (for students when applying)
router.get('/products', async (req, res) => {
  try {
    const { loanType, amount, tenureMonths } = req.query;
    const filter = { isActive: true };
    if (loanType) filter.loanType = loanType;
    const products = await BankProduct.find(filter)
      .populate('bank', 'bankName bankCode')
      .sort({ interestRate: 1 });

    let result = products;
    if (amount) {
      const amt = Number(amount);
      result = result.filter((p) => amt >= p.minAmount && amt <= p.maxAmount);
    }
    if (tenureMonths) {
      const ten = Number(tenureMonths);
      result = result.filter((p) => ten >= p.minTenureMonths && ten <= p.maxTenureMonths);
    }

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch products' });
  }
});

// Bank: list my products
router.get('/my/products', auth('bank'), async (req, res) => {
  try {
    const bank = await Bank.findOne({ user: req.user.id });
    if (!bank) return res.status(404).json({ message: 'Bank profile not found' });

    const products = await BankProduct.find({ bank: bank._id }).sort({ loanType: 1 });
    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch products' });
  }
});

// Bank: create product
router.post('/my/products', auth('bank'), async (req, res) => {
  try {
    const bank = await Bank.findOne({ user: req.user.id });
    if (!bank) return res.status(404).json({ message: 'Bank profile not found' });

    const {
      name,
      loanType,
      minAmount,
      maxAmount,
      interestRate,
      minTenureMonths,
      maxTenureMonths
    } = req.body;

    if (!name || !loanType || minAmount == null || maxAmount == null || interestRate == null ||
        minTenureMonths == null || maxTenureMonths == null) {
      return res.status(400).json({
        message: 'name, loanType, minAmount, maxAmount, interestRate, minTenureMonths, maxTenureMonths are required'
      });
    }

    const product = await BankProduct.create({
      bank: bank._id,
      name,
      loanType,
      minAmount: Number(minAmount),
      maxAmount: Number(maxAmount),
      interestRate: Number(interestRate),
      minTenureMonths: Number(minTenureMonths),
      maxTenureMonths: Number(maxTenureMonths)
    });

    res.status(201).json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to create product' });
  }
});

// Bank: update product
router.patch('/my/products/:id', auth('bank'), async (req, res) => {
  try {
    const bank = await Bank.findOne({ user: req.user.id });
    if (!bank) return res.status(404).json({ message: 'Bank profile not found' });

    const product = await BankProduct.findOne({ _id: req.params.id, bank: bank._id });
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const updates = ['name', 'loanType', 'minAmount', 'maxAmount', 'interestRate', 'minTenureMonths', 'maxTenureMonths', 'isActive'];
    updates.forEach((k) => {
      if (req.body[k] !== undefined) product[k] = req.body[k];
    });
    await product.save();

    res.json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update product' });
  }
});

// Bank: delete product
router.delete('/my/products/:id', auth('bank'), async (req, res) => {
  try {
    const bank = await Bank.findOne({ user: req.user.id });
    if (!bank) return res.status(404).json({ message: 'Bank profile not found' });

    const product = await BankProduct.findOneAndDelete({ _id: req.params.id, bank: bank._id });
    if (!product) return res.status(404).json({ message: 'Product not found' });

    res.json({ message: 'Product deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to delete product' });
  }
});

// Bank: list assigned and admin-approved loans
router.get('/my/loans', auth('bank'), async (req, res) => {
  try {
    const bank = await Bank.findOne({ user: req.user.id });
    if (!bank) return res.status(404).json({ message: 'Bank profile not found' });

    // Only show loans that admin has approved — pending loans stay in admin queue
    const loans = await Loan.find({ bank: bank._id, status: 'approved' })
      .populate('student', 'name email')
      .populate('profile')
      .populate('bankProduct')
      .sort({ createdAt: -1 });

    res.json(loans);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch loans' });
  }
});

  // Bank: verify loan application (Bank's Step 2 approval)
router.post('/my/loans/:id/verify', auth('bank'), async (req, res) => {
  try {
    const bank = await Bank.findOne({ user: req.user.id });
    if (!bank) return res.status(404).json({ message: 'Bank profile not found' });

    const loan = await Loan.findOne({ _id: req.params.id, bank: bank._id })
      .populate('student', 'name email')
      .populate('profile');
    if (!loan) return res.status(404).json({ message: 'Loan not found' });

    if (loan.bankVerified) {
      return res.status(400).json({ message: 'Loan already verified by bank' });
    }

    const { approvedAmount, bankNote } = req.body;

    loan.bankVerified    = true;
    loan.bankVerifiedAt  = new Date();
    loan.bankVerifiedBy  = req.user.id;
    if (approvedAmount) loan.approvedAmount = Number(approvedAmount);
    if (bankNote)       loan.bankNote       = bankNote;
    await loan.save();

    // Send emails asynchronously — don't block the response
    const mailPayload = {
      studentEmail:   loan.student?.email,
      studentName:    loan.student?.name || 'Student',
      bankName:       bank.bankName,
      bankAddress:    bank.address || 'Please visit your nearest branch',
      bankPhone:      bank.contactPhone || '',
      proposedAmount: loan.principalAmount,
      approvedAmount: loan.approvedAmount || loan.principalAmount,
      loanType:       loan.loanType,
      interestRate:   loan.interestRate,
      tenureMonths:   loan.tenureMonths,
      bankNote:       loan.bankNote || ''
    };

    Promise.allSettled([
      sendStudentVerificationMail(mailPayload),
      sendAdminVerificationMail(mailPayload)
    ]).then(results => {
      results.forEach((r, i) => {
        if (r.status === 'rejected') console.error(`[Email] Mail ${i} failed:`, r.reason?.message);
      });
    });

    res.json(loan);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to verify loan' });
  }
});

// Bank: send disbursal notice email to student + admin
router.post('/my/loans/:id/disburse-notice', auth('bank'), async (req, res) => {
  try {
    const bank = await Bank.findOne({ user: req.user.id });
    if (!bank) return res.status(404).json({ message: 'Bank profile not found' });

    const loan = await Loan.findOne({ _id: req.params.id, bank: bank._id })
      .populate('student', 'name email');
    if (!loan) return res.status(404).json({ message: 'Loan not found' });

    if (!loan.bankVerified) {
      return res.status(400).json({ message: 'Loan must be verified before sending disbursal notice' });
    }

    const { disbursedAmount, bankNote } = req.body;

    // Save disbursed amount and note if provided
    if (disbursedAmount) loan.disbursedAmount = Number(disbursedAmount);
    if (bankNote)        loan.bankNote = bankNote;
    loan.disbursalNoticeSentAt = new Date();
    await loan.save();

    const noticePayload = {
      studentEmail:   loan.student?.email,
      studentName:    loan.student?.name || 'Student',
      bankName:       bank.bankName,
      bankAddress:    bank.address || 'Please visit your nearest branch',
      bankPhone:      bank.contactPhone || '',
      disbursedAmount: loan.disbursedAmount || loan.approvedAmount || loan.principalAmount,
      loanType:       loan.loanType,
      interestRate:   loan.interestRate,
      tenureMonths:   loan.tenureMonths,
      bankNote:       loan.bankNote || ''
    };

    Promise.allSettled([
      sendDisbursalNoticeMail(noticePayload),
      sendAdminDisbursalNoticeMail(noticePayload)
    ]).then(results => {
      results.forEach((r, i) => {
        if (r.status === 'rejected') console.error(`[Email] Disbursal notice ${i} failed:`, r.reason?.message);
      });
    });

    res.json({ message: 'Disbursal notice sent', loan });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to send disbursal notice' });
  }
});

// Bank: mark loan as disbursed — emails student AND admin
router.post('/my/loans/:id/disburse', auth('bank'), async (req, res) => {
  try {
    const bank = await Bank.findOne({ user: req.user.id });
    if (!bank) return res.status(404).json({ message: 'Bank profile not found' });

    const loan = await Loan.findOne({ _id: req.params.id, bank: bank._id })
      .populate('student', 'name email');
    if (!loan) return res.status(404).json({ message: 'Loan not found' });

    if (loan.status !== 'approved') {
      return res.status(400).json({ message: 'Only Admin approved loans can be disbursed' });
    }
    if (loan.disbursementStatus === 'disbursed') {
      return res.status(400).json({ message: 'Loan already disbursed' });
    }

    const { disbursedAmount, bankNote } = req.body;

    loan.disbursementStatus   = 'disbursed';
    loan.disbursedAt          = new Date();
    loan.disbursedBy          = req.user.id;
    if (disbursedAmount) loan.disbursedAmount = Number(disbursedAmount);
    if (bankNote)        loan.bankNote        = bankNote;
    await loan.save();

    const payload = {
      studentEmail:   loan.student?.email,
      studentName:    loan.student?.name || 'Student',
      bankName:       bank.bankName,
      bankAddress:    bank.address     || 'Please visit your nearest branch',
      bankPhone:      bank.contactPhone || '',
      disbursedAmount: loan.disbursedAmount || loan.approvedAmount || loan.principalAmount,
      loanType:       loan.loanType,
      interestRate:   loan.interestRate,
      tenureMonths:   loan.tenureMonths,
      bankNote:       loan.bankNote || ''
    };

    // Email student + admin (non-blocking)
    Promise.allSettled([
      sendDisbursalNoticeMail(payload),        // student
      sendAdminDisbursalNoticeMail(payload)    // admin
    ]).then(results => {
      results.forEach((r, i) => {
        if (r.status === 'rejected') console.error(`[Email] Disbursal mail ${i} failed:`, r.reason?.message);
      });
    });

    res.json(loan);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to disburse loan' });
  }
});

module.exports = router;
