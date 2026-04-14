const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function verify() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const user = await User.findOne({ email: 'monish@gmail.com' });
    console.log('User Hash In DB:', user.password);
    const match = await bcrypt.compare('password123', user.password);
    console.log('Match with "password123":', match);
  } catch (err) {
    console.error(err);
  } finally {
    mongoose.connection.close();
  }
}
verify();
