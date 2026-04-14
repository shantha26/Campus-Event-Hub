const mongoose = require('mongoose');
const path     = require('path');
const fs       = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function run() {
  const URI = (process.env.MONGODB_URI || '').trim();
  let output = 'Connecting to MongoDB...\n';
  await mongoose.connect(URI, { family: 4 });
  output += 'Connected!\n\n';

  const User = mongoose.model('User', new mongoose.Schema({
    fullName: String,
    email: String,
    role: String
  }));

  const Event = mongoose.model('Event', new mongoose.Schema({
    title: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }));

  const users = await User.find({}).lean();
  output += `--- USERS (${users.length}) ---\n`;
  users.forEach(u => {
    output += `ID: ${u._id} | Email: ${u.email} | Role: ${u.role} | Name: ${u.fullName}\n`;
  });

  const events = await Event.find({}).lean();
  output += `\n--- EVENTS (${events.length}) ---\n`;
  events.forEach(e => {
    output += `ID: ${e._id} | Title: ${e.title} | CreatedBy: ${e.createdBy}\n`;
  });

  fs.writeFileSync('db_inspect.txt', output);
  console.log('Results written to db_inspect.txt');

  await mongoose.disconnect();
}

run().catch(e => { 
  fs.writeFileSync('db_inspect_error.txt', e.stack);
  console.error(e.message); 
  process.exit(1); 
});
