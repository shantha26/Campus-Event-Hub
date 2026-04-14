const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  fullName:      { type: String, required: true },
  email:         { type: String, required: true, unique: true },
  password:      { type: String, required: true },
  college:       { type: String, default: '' },
  role:          { type: String, enum: ['student', 'college-admin', 'superadmin'], default: 'student' },
  walletBalance: { type: Number, default: 500 },   // students start with ₹500 demo wallet
  createdAt:     { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
