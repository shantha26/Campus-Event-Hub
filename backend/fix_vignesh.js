const mongoose = require('mongoose');
const path     = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function run() {
  const URI = (process.env.MONGODB_URI || '').trim();
  console.log('Connecting...');
  await mongoose.connect(URI, { family: 4 });
  
  const User = mongoose.model('User', new mongoose.Schema({ email: String, role: String }));
  
  // Set Vignesh to student
  const res = await User.updateOne({ email: 'vignesh@gmail.com' }, { $set: { role: 'student' } });
  console.log('Update result for Vignesh:', res);

  await mongoose.disconnect();
}

run().catch(e => { console.error(e); process.exit(1); });
