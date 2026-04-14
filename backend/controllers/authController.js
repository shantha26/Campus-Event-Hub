const User   = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey123';

// ── REGISTER ──────────────────────────────────────────────
exports.registerUser = async (req, res) => {
  try {
    const { fullName, email, college, role, password } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ message: 'Please fill all required fields' });
    }

    const userExists = await User.findOne({ email: email.toLowerCase() });
    if (userExists) {
      return res.status(400).json({ message: 'User already registered. Please login.' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user   = await User.create({
      fullName,
      email:    email.toLowerCase(),
      password: hashed,
      college:  college || '',
      role:     role    || 'student'
    });

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '1d' });

    res.status(201).json({
      message:       'User registered successfully',
      token,
      role:          user.role,
      fullName:      user.fullName,
      email:         user.email,
      _id:           user._id,
      college:       user.college,
      walletBalance: user.walletBalance
    });
  } catch (error) {
    console.error('Registration error:', error.message);
    res.status(500).json({ message: 'Server error. Registration failed.' });
  }
};

// ── LOGIN ─────────────────────────────────────────────────
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }

    console.log(`🔐 Login attempt for: ${email}`);

    // const user = await User.findOne({ email});
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ message: 'You are not registered. Please sign up first.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    console.log(`🔍 Password match: ${isMatch}`);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '1d' });

    res.json({
      message:       'Login successful',
      token,
      userId:        user._id,
      _id:           user._id,
      role:          user.role,
      fullName:      user.fullName,
      email:         user.email,
      college:       user.college,
      walletBalance: user.walletBalance
    });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};