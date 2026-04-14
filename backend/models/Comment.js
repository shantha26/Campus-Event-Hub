const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  userName: {
    type: String,
    required: true,
    trim: true
  },
  text: {
    type: String,
    required: true,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for fast lookup by eventId
commentSchema.index({ eventId: 1, createdAt: -1 });

module.exports = mongoose.model('Comment', commentSchema);
