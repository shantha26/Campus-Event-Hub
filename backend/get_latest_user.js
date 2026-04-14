const mongoose = require('mongoose');
const path     = require('path');
const fs       = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function run() {
  const URI = (process.env.MONGODB_URI || '').trim();
  await mongoose.connect(URI, { family: 4 });
  
  const User = mongoose.model('User', new mongoose.Schema({ email: String, role: String, createdAt: Date }));
  const user = await User.findOne({}).sort({ createdAt: -1 }).lean();
  
  if (user) {
    fs.writeFileSync('latest_user.txt', JSON.stringify(user, null, 2));
    console.log('Latest user written to latest_user.txt');
  } else {
    console.log('No users found');
  }

  await mongoose.disconnect();
}

run().catch(e => { console.error(e); process.exit(1); });
