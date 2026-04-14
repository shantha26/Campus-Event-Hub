const mongoose = require('mongoose');

const RegistrationSchema = new mongoose.Schema({
  eventId:         { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  userId:          { type: mongoose.Schema.Types.ObjectId, ref: 'User',  required: true },
  approvalStatus:  { type: String, enum: ['pending','approved','rejected'], default: 'pending' },
  rejectionReason: { type: String, default: '' },
  selectedSlot:    { type: String, default: '' },
  paymentStatus:   { type: String, enum: ['free','pending','paid','failed'], default: 'free' },
  paymentMethod:   { type: String, default: '' },
  paymentTxnId:    { type: String, default: '' },
  paymentAmount:   { type: Number, default: 0 },
  hasFeedback:     { type: Boolean, default: false },
  registeredAt:    { type: Date, default: Date.now }
}, { timestamps: true });

RegistrationSchema.index({ eventId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('Registration', RegistrationSchema);
