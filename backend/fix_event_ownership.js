/**
 * fix_event_ownership.js
 * 
 * Re-assigns all events to a valid admin user (e.g. SampleAdmin@gmail.com)
 * if they are currently assigned to a non-existent user.
 */
const mongoose = require('mongoose');
const path     = require('path');
const Event    = require('./models/Event');
const User     = require('./models/User');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function run() {
  const URI = (process.env.MONGODB_URI || '').trim();
  console.log('Connecting to MongoDB...');
  await mongoose.connect(URI, { family: 4 });
  console.log('Connected!');

  // 1. Find a valid admin user
  const adminEmail = 'SampleAdmin@gmail.com'; // Try this first
  let admin = await User.findOne({ email: { $regex: new RegExp('^' + adminEmail + '$', 'i') } });
  
  if (!admin) {
    console.log(`User ${adminEmail} not found. Looking for any college-admin...`);
    admin = await User.findOne({ role: 'college-admin' });
  }

  if (!admin) {
    console.log('No college-admin found. Looking for any user...');
    admin = await User.findOne();
  }

  if (!admin) {
    console.error('No users found in database. Cannot re-assign events.');
    process.exit(1);
  }

  console.log(`Target Admin: ${admin.email} (ID: ${admin._id})`);

  // 2. Update all events
  const result = await Event.updateMany({}, { $set: { createdBy: admin._id } });
  
  console.log(`Successfully updated ${result.modifiedCount} events.`);
  console.log('All events are now owned by:', admin.email);

  await mongoose.disconnect();
  console.log('Disconnected.');
}

run().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
