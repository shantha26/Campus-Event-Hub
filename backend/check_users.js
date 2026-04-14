// check_users.js
// Run: node check_users.js
// Shows ALL users in DB with their exact email and role

const mongoose = require('mongoose');
const path     = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const UserSchema = new mongoose.Schema({
  fullName:      String,
  email:         String,
  password:      String,
  college:       String,
  role:          String,
  walletBalance: Number,
  createdAt:     Date
});
const User = mongoose.model('User', UserSchema);

async function run() {
  const URI = (process.env.MONGODB_URI || '').trim();
  console.log('Connecting to MongoDB...');
  await mongoose.connect(URI, { family: 4 });
  console.log('Connected!\n');

  const users = await User.find({}).lean();
  console.log(`Found ${users.length} users:\n`);

  for (const u of users) {
    const isBcrypt = u.password?.startsWith('$2');
    console.log(`Email:    "${u.email}"`);
    console.log(`Role:     ${u.role}`);
    console.log(`Name:     ${u.fullName}`);
    console.log(`Password: ${isBcrypt ? '✅ bcrypt hashed' : '❌ PLAIN TEXT: "' + u.password + '"'}`);
    console.log(`Wallet:   ${u.walletBalance}`);
    console.log('---');
  }

  await mongoose.disconnect();
}

run().catch(e => { console.error(e.message); process.exit(1); });