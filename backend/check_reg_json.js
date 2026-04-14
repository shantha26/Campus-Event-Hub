const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const Registration = mongoose.model('Registration', new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvalStatus: String
}));

const Event = mongoose.model('Event', new mongoose.Schema({
  title: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}));

const User = mongoose.model('User', new mongoose.Schema({
  email: String,
  role: String,
  fullName: String
}));

async function checkReg() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { family: 4 });
    const regId = '69c356427c2d3377a3ff7909';
    const reg = await Registration.findById(regId).populate('eventId').populate('userId');
    
    if (!reg) {
      fs.writeFileSync('reg_info.json', JSON.stringify({ error: 'Not found' }));
    } else {
      const organizer = await User.findById(reg.eventId?.createdBy);
      const info = {
        registrationId: reg._id,
        student: { name: reg.userId?.fullName, email: reg.userId?.email, role: reg.userId?.role },
        status: reg.approvalStatus,
        event: { title: reg.eventId?.title, organizer: { name: organizer?.fullName, email: organizer?.email, role: organizer?.role } }
      };
      fs.writeFileSync('reg_info.json', JSON.stringify(info, null, 2));
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
checkReg();
