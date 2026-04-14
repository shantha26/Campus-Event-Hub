const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
  title:                { type: String, required: true },
  description:          { type: String, required: true },
  type:                 { type: String, enum: ['technical','cultural','sports','workshop','seminar'], required: true },
  category:             { type: String, enum: ['college','inter-college'], required: true },
  venue:                { type: String, required: true },
  startDate:            { type: Date, required: true },
  endDate:              { type: Date, required: true },
  registrationDeadline: { type: Date, required: true },
  maxParticipants:      { type: Number, required: true, min: 1 },
  currentParticipants:  { type: Number, default: 0 },
  registrationFee:      { type: Number, default: 0, min: 0 },
  isPaid:               { type: Boolean, default: false },
  organizer:            { type: String, required: true },
  contactEmail:         { type: String, required: true },
  status:               { type: String, enum: ['upcoming','ongoing','completed','cancelled'], default: 'upcoming' },
  imageUrl:             { type: String, default: '' },
  createdBy:            { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  feedback: [{
    userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    fullName: { type: String, default: '' },
    college:  { type: String, default: '' },
    rating:   { type: Number, min: 1, max: 5 },
    comment:  { type: String, default: '' },
    createdAt:{ type: Date, default: Date.now }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Event', EventSchema);
