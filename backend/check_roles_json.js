const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
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
    fs.writeFileSync('users.json', JSON.stringify(users, null, 2));
    console.log('Done');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
checkUsers();
