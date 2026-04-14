const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const UserSchema = new mongoose.Schema({
  email: String,
  role: String,
  fullName: String
});
const User = mongoose.model('User', UserSchema);

async function checkUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { family: 4 });
    const users = await User.find({}, 'email role fullName');
    console.log('--- USERS IN DATABASE ---');
    users.forEach(u => {
      console.log(`${u.email} | ${u.fullName} | ROLE: ${u.role}`);
    });
    console.log('-------------------------');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
checkUsers();
