const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const User    = require('../models/User');
const { verifyToken } = require('../middleware/auth.middleware');
const router  = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'campuseventhub_secret';

// ── Register ───────────────────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { fullName, email, password, college, role } = req.body;
    if (!fullName || !email || !password)
      return res.status(400).json({ message: 'fullName, email and password are required' });

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(400).json({ message: 'Email already registered' });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      fullName, email: email.toLowerCase(),
      password: hashed, college: college || '', role: role || 'student'
    });
    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
    res.status(201).json({
      token, role: user.role, fullName: user.fullName,
      email: user.email, _id: user._id, walletBalance: user.walletBalance,
      message: 'Registration successful'
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Login ──────────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
    res.json({
      token, role: user.role, fullName: user.fullName,
      email: user.email, college: user.college,
      _id: user._id, walletBalance: user.walletBalance
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Get current user profile ────────────────────────────────────────────────────
router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Get wallet balance ────────────────────────────────────────────────────────
router.get('/wallet', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('walletBalance');
    res.json({ walletBalance: user?.walletBalance || 0 });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Add money to wallet (demo top-up) ────────────────────────────────────────
router.post('/wallet/topup', verifyToken, async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ message: 'Invalid amount' });
    const user = await User.findByIdAndUpdate(
      req.user.id, { $inc: { walletBalance: amount } }, { new: true }
    );
    res.json({ walletBalance: user.walletBalance, message: `₹${amount} added to wallet` });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
