const mongoose = require('mongoose');
const Event = require('./models/Event');
const User = require('./models/User');
require('dotenv').config();
const dns = require('dns');

dns.setServers(['8.8.8.8', '1.1.1.1']);

mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  family: 4
}).then(async () => {
    console.log('Connected.');
    
    // Find any user to be the creator
    let user = await User.findOne();
    let userId = user ? user._id : new mongoose.Types.ObjectId();
    
    const ev = new Event({
        title: "Welcome Event (Click Me!)",
        description: "Click on this event card to open the modal, then click the Discussion tab to see the comment section!",
        type: "cultural",
        category: "college",
        venue: "Virtual Dashboard",
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
        registrationDeadline: new Date(),
        maxParticipants: 500,
        organizer: "System Admin",
        contactEmail: "admin@campuseventhub.com",
        createdBy: userId,
        status: "upcoming"
    });
    
    await ev.save();
    console.log("✅ Custom test event created successfully!");
    process.exit(0);
}).catch(err => {
    console.error("❌ Failed:", err);
    process.exit(1);
});
