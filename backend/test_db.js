const mongoose = require('mongoose');
const Event = require('./models/Event');
require('dotenv').config();

const testDb = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const count = await Event.countDocuments();
        console.log('📊 Event count:', count);

        if (count > 0) {
            const samples = await Event.find().limit(2);
            console.log('🔍 Sample titles:', samples.map(e => e.title));
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ DB Test Error:', error);
        process.exit(1);
    }
};

testDb();
