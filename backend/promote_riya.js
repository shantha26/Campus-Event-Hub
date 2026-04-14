const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const UserSchema = new mongoose.Schema({
  email: String,
  role: String
});
const User = mongoose.model('User', UserSchema);

async function promoteUser() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { family: 4 });
    const email = 'riya@gmail.com';
    const result = await User.findOneAndUpdate(
      { email },
      { role: 'college-admin' },
      { new: true }
    );
    if (result) {
      console.log(`✅ User ${email} promoted to ${result.role}`);
    } else {
      console.log(`❌ User ${email} not found`);
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
promoteUser();
