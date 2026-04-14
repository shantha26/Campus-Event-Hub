const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  fullName:      { type: String, required: true },
  email:         { type: String, required: true, unique: true },
  password:      { type: String, required: true },
  college:       { type: String, default: '' },
  role:          { type: String, enum: ['student', 'college-admin', 'superadmin'], default: 'student' },
  walletBalance: { type: Number, default: 500 },
  status:        { type: String, enum: ['active', 'suspended'], default: 'active' },
  createdAt:     { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
