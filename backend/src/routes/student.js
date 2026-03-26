const express = require('express');
const StudentProfile = require('../models/StudentProfile');
const Loan = require('../models/Loan');
const BankProduct = require('../models/BankProduct');
const { auth } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { computeCreditScore } = require('../services/creditScoreService');

const router = express.Router();

router.post('/profile', auth('student'), async (req, res) => {
  try {
    const {
      courseName,
      academicScore,
      attendance,
      internshipStatus,
      familyIncome,
      previousLoanHistory,
      spendingBehaviorScore,
      studyScores,
      jeeScore
    } = req.body;

    const base = {
      courseName,
      academicScore,
      attendance,
      internshipStatus,
      familyIncome,
      previousLoanHistory,
      spendingBehaviorScore
    };

    const scoring = computeCreditScore(base);

    // Parse studyScores if sent as a JSON string
    let parsedScores;
    if (studyScores) {
      try {
        parsedScores = typeof studyScores === 'string' ? JSON.parse(studyScores) : studyScores;
      } catch (e) {
        parsedScores = [];
      }
    }

    const updateData = { user: req.user.id, ...base, ...scoring };
    if (parsedScores !== undefined) updateData.studyScores = parsedScores;
    if (jeeScore !== undefined) updateData.jeeScore = jeeScore;

    const profile = await StudentProfile.findOneAndUpdate(
      { user: req.user.id },
      updateData,
      { new: true, upsert: true }
    );

    res.json(profile);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to save profile' });
  }
});

router.get('/profile', auth('student'), async (req, res) => {
  try {
    const profile = await StudentProfile.findOne({ user: req.user.id });
    if (!profile) return res.status(404).json({ message: 'Profile not found' });
    res.json(profile);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load profile' });
  }
});

// GET /student/profile/documents — list all KYC documents on the student profile
router.get('/profile/documents', auth('student'), async (req, res) => {
  try {
    const profile = await StudentProfile.findOne({ user: req.user.id });
    if (!profile) return res.status(404).json({ message: 'Profile not found' });
    res.json(profile.documents || []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load documents' });
  }
});

// POST /student/profile/documents — upload a KYC document to the student profile
router.post(
  '/profile/documents',
  auth('student'),
  upload.single('file'),
  async (req, res) => {
    try {
      const { docType } = req.body;
      const allowed = [
        'aadhar', 'pan', 'signature', 'photo', 'income_certificate',
        'father_aadhar', 'secondary_marks_memo', 'intermediate_certificate',
        'jee_mains_scorecard', 'jee_advanced_scorecard'
      ];
      if (!allowed.includes(docType)) {
        return res.status(400).json({ message: 'Invalid document type. Allowed: ' + allowed.join(', ') });
      }
      if (!req.file) {
        return res.status(400).json({ message: 'File is required' });
      }

      const profile = await StudentProfile.findOne({ user: req.user.id });
      if (!profile) {
        return res.status(404).json({ message: 'Complete your credit profile first before uploading documents' });
      }

      // Replace existing document of the same type to avoid duplicates
      profile.documents = (profile.documents || []).filter(d => d.docType !== docType);
      profile.documents.push({
        docType,
        filename: req.file.filename || req.file.originalname,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        url: req.file.path,
        status: 'pending'
      });

      await profile.save();
      const uploaded = profile.documents[profile.documents.length - 1];
      res.status(201).json(uploaded);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Failed to upload document' });
    }
  }
);

// Minimum credit score threshold for loan eligibility
const CREDIT_SCORE_THRESHOLD = 600;

router.post('/loans/apply', auth('student'), async (req, res) => {
  try {
    const { loanType, requestedAmount, tenureMonths, bankProductId } = req.body;
    const profile = await StudentProfile.findOne({ user: req.user.id });
    if (!profile) {
      return res.status(400).json({ message: 'Complete your credit profile before applying' });
    }

    // ── GATE 1: study scores required ─────────────────────────────────────────
    if (!profile.studyScores || profile.studyScores.length === 0) {
      return res.status(400).json({
        message: 'Please add at least one study score entry in your Credit Profile before applying.',
        missingRequirements: ['studyScores']
      });
    }

    // ── GATE 2: required documents must be uploaded ───────────────────────────
    const REQUIRED_DOCS = [
      'aadhar', 'pan', 'photo', 'signature',
      'income_certificate', 'secondary_marks_memo', 'intermediate_certificate'
    ];
    const uploadedDocTypes = (profile.documents || []).map(d => d.docType);
    const missingDocs = REQUIRED_DOCS.filter(d => !uploadedDocTypes.includes(d));

    if (missingDocs.length > 0) {
      return res.status(400).json({
        message: 'Please upload all required documents before applying for a loan.',
        missingRequirements: ['documents'],
        missingDocs
      });
    }
    // ─────────────────────────────────────────────────────────────────────────

    // ── AUTO-REJECTION: credit score below minimum threshold ──────────────────
    if (profile.creditScore < CREDIT_SCORE_THRESHOLD) {
      const rejectionNote = `Automatically rejected: Your credit score (${profile.creditScore}) is below the minimum required threshold of ${CREDIT_SCORE_THRESHOLD}. Please improve your academic performance, attendance, and spending behaviour, then update your credit profile and reapply.`;

      const rejectedLoan = await Loan.create({
        student: req.user.id,
        profile: profile._id,
        loanType,
        principalAmount: requestedAmount,
        interestRate: profile.recommendedInterestRate,
        tenureMonths,
        status: 'rejected',
        adminDecisionNote: rejectionNote,
        bank: null,
        bankProduct: null
      });

      const populated = await Loan.findById(rejectedLoan._id).populate('bank').populate('bankProduct');
      return res.status(201).json({ ...populated.toObject(), autoRejected: true, rejectionReason: rejectionNote });
    }
    // ─────────────────────────────────────────────────────────────────────────

    if (requestedAmount > profile.maxEligibleAmount) {
      return res.status(400).json({
        message: 'Requested amount exceeds maximum eligible amount',
        maxEligibleAmount: profile.maxEligibleAmount
      });
    }

    let interestRate = profile.recommendedInterestRate;
    let bank = null;
    let bankProduct = null;

    if (bankProductId) {
      const product = await BankProduct.findOne({ _id: bankProductId, isActive: true })
        .populate('bank');
      if (!product) {
        return res.status(400).json({ message: 'Invalid or inactive bank product' });
      }
      if (product.loanType !== loanType) {
        return res.status(400).json({ message: 'Bank product loan type does not match' });
      }
      if (requestedAmount < product.minAmount || requestedAmount > product.maxAmount) {
        return res.status(400).json({
          message: `Amount must be between ₹${product.minAmount} and ₹${product.maxAmount} for this product`
        });
      }
      if (tenureMonths < product.minTenureMonths || tenureMonths > product.maxTenureMonths) {
        return res.status(400).json({
          message: `Tenure must be between ${product.minTenureMonths} and ${product.maxTenureMonths} months`
        });
      }
      interestRate = product.interestRate;
      bank = product.bank._id;
      bankProduct = product._id;
    }

    const loan = await Loan.create({
      student: req.user.id,
      profile: profile._id,
      loanType,
      principalAmount: requestedAmount,
      interestRate,
      tenureMonths,
      status: 'pending',
      bank,
      bankProduct
    });

    const populated = await Loan.findById(loan._id).populate('bank').populate('bankProduct');
    res.status(201).json(populated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to apply for loan' });
  }
});

router.get('/loans', auth('student'), async (req, res) => {
  try {
    const loans = await Loan.find({ student: req.user.id })
      .populate('bank')
      .populate('bankProduct')
      .sort({ createdAt: -1 });
    res.json(loans);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load loans' });
  }
});

// Documents for a specific loan (student)
router.get('/loans/:id/documents', auth('student'), async (req, res) => {
  try {
    const loan = await Loan.findOne({ _id: req.params.id, student: req.user.id });
    if (!loan) return res.status(404).json({ message: 'Loan not found' });
    res.json(loan.documents || []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load documents' });
  }
});

// Upload a document for a loan
router.post(
  '/loans/:id/documents',
  auth('student'),
  upload.single('file'),
  async (req, res) => {
    try {
      const { docType } = req.body;
      const allowed = ['aadhaar', 'admission_letter', 'income_certificate', 'marksheet'];
      if (!allowed.includes(docType)) {
        return res.status(400).json({ message: 'Invalid document type' });
      }

      const loan = await Loan.findOne({ _id: req.params.id, student: req.user.id });
      if (!loan) return res.status(404).json({ message: 'Loan not found' });

      if (!req.file) {
        return res.status(400).json({ message: 'File is required' });
      }

      loan.documents.push({
        docType,
        filename: req.file.filename || req.file.originalname,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        url: req.file.path,
        status: 'pending'
      });

      await loan.save();
      const doc = loan.documents[loan.documents.length - 1];
      res.status(201).json(doc);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Failed to upload document' });
    }
  }
);


module.exports = router;


