const mongoose = require('mongoose');

const AdminLogSchema = new mongoose.Schema(
  {
    action:  { type: String, required: true },
    userId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    details: { type: String, default: '' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('AdminLog', AdminLogSchema);
