const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/campuseventhub';

async function fixData() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected.');

    const User = mongoose.model('User', new mongoose.Schema({ email: String, college: String, role: String }));
    const Event = mongoose.model('Event', new mongoose.Schema({ title: String, college: String }));

    const collegeName = "sona college of technology";

    // 1. Update Admin 'mani'
    const adminEmail = 'mani@gmail.com';
    const updatedAdmin = await User.findOneAndUpdate(
      { email: adminEmail },
      { $set: { college: collegeName } },
      { new: true }
    );
    if (updatedAdmin) {
      console.log(`✅ Updated admin ${adminEmail} with college: ${collegeName}`);
    } else {
      console.log(`❌ Admin ${adminEmail} not found!`);
    }

    // 2. Update Student 'riya' (just in case)
    const studentEmail = 'riya@gmail.com';
    await User.findOneAndUpdate(
      { email: studentEmail },
      { $set: { college: collegeName } }
    );
    console.log(`✅ Ensured student ${studentEmail} has college: ${collegeName}`);

    // 3. Update ALL events to have this college
    const result = await Event.updateMany(
      {},
      { $set: { college: collegeName } }
    );
    console.log(`✅ Updated ${result.modifiedCount} events with college: ${collegeName}`);

    await mongoose.connection.close();
    console.log('Done.');
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

fixData();
