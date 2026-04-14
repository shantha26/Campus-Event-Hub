// simple-test.js
const mongoose = require('mongoose');
require('dotenv').config();

const testEvent = {
  title: 'Simple Test Event',
  description: 'Testing directly',
  type: 'technical',
  category: 'college',
  venue: 'Test Venue',
  startDate: new Date(),
  endDate: new Date(Date.now() + 86400000),
  registrationDeadline: new Date(),
  maxParticipants: 50,
  registrationFee: 0,
  organizer: 'Tester',
  contactEmail: 'test@test.com'
};

async function runTest() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Try to save directly
    const Event = require('./models/Event');
    const event = new Event({
      ...testEvent,
      createdBy: new mongoose.Types.ObjectId() // dummy ID
    });
    
    const saved = await event.save();
    console.log('✅ Event saved directly:', saved._id);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

runTest();