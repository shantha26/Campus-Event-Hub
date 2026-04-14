const mongoose = require('mongoose');
const path = require('path');
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
      console.log('Registration not found');
    } else {
      console.log('--- REGISTRATION INFO ---');
      console.log(`ID: ${reg._id}`);
      console.log(`Student: ${reg.userId?.fullName} (${reg.userId?.email})`);
      console.log(`Status: ${reg.approvalStatus}`);
      console.log(`Event: ${reg.eventId?.title}`);
      
      const organizer = await User.findById(reg.eventId?.createdBy);
      console.log(`Organizer: ${organizer?.fullName} (${organizer?.email}) | Role: ${organizer?.role}`);
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
checkReg();
