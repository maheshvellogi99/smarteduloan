const express = require('express');
const Loan = require('../models/Loan');
const StudentProfile = require('../models/StudentProfile');
const Bank = require('../models/Bank');
const { auth } = require('../middleware/auth');
const { sendBankApprovalMail } = require('../services/emailService');

const router = express.Router();

router.get('/banks', auth('admin'), async (req, res) => {
  try {
    const banks = await Bank.find({}).populate('user', 'name email').lean();
    
    // Attach products manually since it's a separate model
    const BankProduct = require('../models/BankProduct');
    const products = await BankProduct.find({});
    
    banks.forEach(bank => {
      bank.products = products.filter(p => p.bank.toString() === bank._id.toString());
    });
    
    res.json(banks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch banks' });
  }
});

router.post('/banks', auth('admin'), async (req, res) => {
  try {
    let { user } = req.body;
    const { bankName, bankCode, address, contactPhone } = req.body;
    
    const User = require('../models/User');
    
    if (!user) {
      // Auto-generate a user for this bank since frontend just sends bank details
      const bcrypt = require('bcrypt');
      const passwordHash = await bcrypt.hash('bank123', 10);
      const newBankUser = await User.create({
        name: bankName + ' Admin',
        email: `admin_${bankCode.toLowerCase()}@smartedu.com`,
        passwordHash,
        role: 'bank'
      });
      user = newBankUser._id;
    } else {
      const userObj = await User.findById(user);
      if (!userObj || userObj.role !== 'bank') {
        return res.status(400).json({ message: 'User must exist and have the bank role' });
      }
    }

    const bank = await Bank.create({ user, bankName, bankCode, address, contactPhone });
    res.status(201).json(bank);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to create bank' });
  }
});

router.post('/banks/:id/products', auth('admin'), async (req, res) => {
  try {
    const { name, loanType, minAmount, maxAmount, interestRate, minTenureMonths, maxTenureMonths, minCreditScore } = req.body;
    
    const BankProduct = require('../models/BankProduct');
    const product = await BankProduct.create({
      bank: req.params.id,
      name,
      loanType,
      minAmount: minAmount || 10000,
      maxAmount: maxAmount || 1000000,
      interestRate,
      minTenureMonths: minTenureMonths || 6,
      maxTenureMonths: maxTenureMonths || 60,
      minCreditScore: minCreditScore || 300
    });
    
    res.status(201).json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to create bank product' });
  }
});

router.get('/loans', auth('admin'), async (req, res) => {
  try {
    const status = req.query.status;
    const filter = {};
    if (status) filter.status = status;
    const loans = await Loan.find(filter)
      .populate('student')
      .populate('profile')
      .populate('bank')
      .populate('bankProduct')
      .sort({ createdAt: -1 });
    res.json(loans);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch loans' });
  }
});

// View documents for a loan
router.get('/loans/:id/documents', auth('admin'), async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id);
    if (!loan) return res.status(404).json({ message: 'Loan not found' });
    res.json(loan.documents || []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load documents' });
  }
});

// Verify / reject a specific document
router.post('/loans/:loanId/documents/:docId/verify', auth('admin'), async (req, res) => {
  try {
    const { status } = req.body;
    if (!['verified', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const loan = await Loan.findById(req.params.loanId);
    if (!loan) return res.status(404).json({ message: 'Loan not found' });

    const doc = loan.documents.id(req.params.docId);
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    doc.status = status;
    doc.verifiedBy = req.user.id;
    doc.verifiedAt = new Date();
    await loan.save();

    res.json(doc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update document status' });
  }
});

router.post('/loans/:id/approve', auth('admin'), async (req, res) => {
  try {
    const { tenureMonths } = req.body;
    const loan = await Loan.findById(req.params.id);
    if (!loan) return res.status(404).json({ message: 'Loan not found' });

    const profile = await StudentProfile.findById(loan.profile);
    if (!profile) return res.status(404).json({ message: 'Profile not found' });

    // The student already selected a bank product during application
    if (!loan.bankProduct) {
      return res.status(400).json({
        message: 'No bank product was selected by the student.'
      });
    }

    // Ensure the bank details are properly attached to the loan from the selected product
    const BankProduct = require('../models/BankProduct');
    const product = await BankProduct.findById(loan.bankProduct);
    if (!product) return res.status(400).json({ message: 'Selected bank product is invalid' });

    loan.bank = product.bank;
    loan.interestRate = product.interestRate;

    // 1-Step Verification: Admin approves, which forwards it to the bank dashboard
    loan.status = 'approved';
    loan.adminApprovedAt = new Date();
    loan.tenureMonths = tenureMonths || loan.tenureMonths;
    await loan.save();

    const populated = await Loan.findById(loan._id)
      .populate('student', 'name email')
      .populate('profile')
      .populate({ path: 'bank', populate: { path: 'user', select: 'email' } })
      .populate('bankProduct');

    // Send email to bank asynchronously
    if (populated.bank && populated.bank.user && populated.student) {
      sendBankApprovalMail({
        bankUserEmail: populated.bank.user.email,
        bankName: populated.bank.bankName || 'Partner Bank',
        studentName: populated.student.name || 'Student',
        studentEmail: populated.student.email,
        loanAmount: populated.principalAmount,
        loanType: populated.loanType
      }).catch(err => console.error('[Email] Bank approval notice failed:', err.message));
    }

    res.json(populated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to approve & forward loan' });
  }
});

router.post('/loans/:id/reject', auth('admin'), async (req, res) => {
  try {
    const { reason } = req.body;
    const loan = await Loan.findById(req.params.id);
    if (!loan) return res.status(404).json({ message: 'Loan not found' });

    loan.status = 'rejected';
    loan.adminDecisionNote = reason || 'Rejected by admin';
    await loan.save();

    res.json(loan);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to reject loan' });
  }
});

router.post('/loans/:id/mark-defaulter', auth('admin'), async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id);
    if (!loan) return res.status(404).json({ message: 'Loan not found' });
    if (loan.status !== 'approved') return res.status(400).json({ message: 'Only approved loans can be marked as default' });

    // Mark student profile as a defaulter by minimizing their credit score and risk
    const profile = await StudentProfile.findById(loan.profile);
    if (profile) {
      profile.riskCategory = 'high';
      profile.creditScore = 0;
      profile.previousLoanHistory = 'defaulter';
      await profile.save();
    }

    loan.adminDecisionNote = 'Marked as defaulter by Admin';
    await loan.save();

    res.json(loan);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to mark defaulter' });
  }
});

router.get('/reports/summary', auth('admin'), async (req, res) => {
  try {
    const total = await Loan.countDocuments();
    const approved = await Loan.countDocuments({ status: 'approved' });
    const rejected = await Loan.countDocuments({ status: 'rejected' });
    const pending = await Loan.countDocuments({ status: 'pending' });

    const profiles = await StudentProfile.find({});
    const riskCounts = { low: 0, medium: 0, high: 0 };
    profiles.forEach((p) => {
      if (riskCounts[p.riskCategory] != null) riskCounts[p.riskCategory] += 1;
    });

    res.json({
      totalLoans: total,
      approvedLoans: approved,
      rejectedLoans: rejected,
      pendingLoans: pending,
      riskDistribution: riskCounts
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load summary' });
  }
});

// PATCH /admin/students/:userId/documents/:docId — verify or reject a profile document
router.patch('/students/:userId/documents/:docId', auth('admin'), async (req, res) => {
  try {
    const { status, adminNote } = req.body;
    if (!['verified', 'rejected'].includes(status)) {
      return res.status(400).json({ message: "Status must be 'verified' or 'rejected'" });
    }

    const profile = await StudentProfile.findOne({ user: req.params.userId });
    if (!profile) return res.status(404).json({ message: 'Student profile not found' });

    const doc = profile.documents.id(req.params.docId);
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    const updateQuery = { 'documents.$.status': status };
    if (adminNote !== undefined) updateQuery['documents.$.adminNote'] = adminNote;

    await StudentProfile.findOneAndUpdate(
      { user: req.params.userId, 'documents._id': req.params.docId },
      { $set: updateQuery }
    );

    // Update the local doc object so the response returns the correct new state
    doc.status = status;
    if (adminNote !== undefined) doc.adminNote = adminNote;

    res.json(doc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update document status' });
  }
});

module.exports = router;

