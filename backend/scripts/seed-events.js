const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Event = require('../models/Event');
const User = require('../models/User');

const seedDB = async () => {
    try {
        const MONGODB_URI = process.env.MONGODB_URI;
        if (!MONGODB_URI) throw new Error('MONGODB_URI is not defined');

        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB for seeding');

        // Find a user to assign as creator
        let user = await User.findOne({ role: 'superadmin' });
        if (!user) {
            user = await User.findOne({ role: 'college-admin' });
        }
        if (!user) {
            user = await User.findOne();
        }

        if (!user) {
            throw new Error('No user found in database to assign as creator. Please register a user first.');
        }

        console.log(`👤 Using user ${user.email} (${user._id}) as creator`);

        // Prepare events with creator ID
        const eventsWithCreator = [
            {
                title: 'Global Tech Summit 2024',
                description: 'A gathering of the worlds leading technology innovators, researchers, and enthusiasts to discuss the future of AI, Quantum Computing, and Sustainable Tech.',
                type: 'technical',
                category: 'inter-college',
                venue: 'Main Auditorium, Tech Block',
                startDate: new Date('2024-06-15T09:00:00Z'),
                endDate: new Date('2024-06-17T18:00:00Z'),
                registrationDeadline: new Date('2024-06-01T23:59:59Z'),
                maxParticipants: 500,
                currentParticipants: 120,
                registrationFee: 500,
                isPaid: true,
                organizer: 'Dept. of Computer Science',
                contactEmail: 'techsummit@college.edu',
                status: 'upcoming',
                imageUrl: 'https://images.unsplash.com/photo-1540575861501-7c0011e74de0?auto=format&fit=crop&q=80&w=800',
                createdBy: user._id
            },
            {
                title: 'Spring Symphony: Cultural Fest',
                description: 'The annual inter-college cultural extravaganza featuring music, dance, drama, and fine arts competitions with participants from over 20 colleges.',
                type: 'cultural',
                category: 'inter-college',
                venue: 'Open Air Theatre',
                startDate: new Date('2024-04-20T10:00:00Z'),
                endDate: new Date('2024-04-22T22:00:00Z'),
                registrationDeadline: new Date('2024-04-10T23:59:59Z'),
                maxParticipants: 2000,
                currentParticipants: 850,
                registrationFee: 200,
                isPaid: true,
                organizer: 'Cultural Committee',
                contactEmail: 'culture@college.edu',
                status: 'upcoming',
                imageUrl: 'https://images.unsplash.com/photo-1514525253361-bee8a187499b?auto=format&fit=crop&q=80&w=800',
                createdBy: user._id
            },
            {
                title: 'Inter-College Basketball Championship',
                description: 'Witness high-octane basketball action as the top college teams compete for the prestigious trophy.',
                type: 'sports',
                category: 'inter-college',
                venue: 'Indoor Sports Complex',
                startDate: new Date('2024-05-10T08:00:00Z'),
                endDate: new Date('2024-05-12T17:00:00Z'),
                registrationDeadline: new Date('2024-05-01T23:59:59Z'),
                maxParticipants: 16,
                currentParticipants: 10,
                registrationFee: 1000,
                isPaid: true,
                organizer: 'Sports Department',
                contactEmail: 'sports@college.edu',
                status: 'upcoming',
                imageUrl: 'https://images.unsplash.com/photo-1504450758481-7338eba7524a?auto=format&fit=crop&q=80&w=800',
                createdBy: user._id
            },
            {
                title: 'AI & Machine Learning Workshop',
                description: 'A hands-on workshop covering the fundamentals of neural networks, data preprocessing, and model deployment using Python and TensorFlow.',
                type: 'workshop',
                category: 'college',
                venue: 'AI Lab, CS Department',
                startDate: new Date('2024-03-25T10:00:00Z'),
                endDate: new Date('2024-03-25T16:00:00Z'),
                registrationDeadline: new Date('2024-03-20T23:59:59Z'),
                maxParticipants: 60,
                currentParticipants: 45,
                registrationFee: 0,
                isPaid: false,
                organizer: 'AI Student Guild',
                contactEmail: 'ai@college.edu',
                status: 'upcoming',
                imageUrl: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&q=80&w=800',
                createdBy: user._id
            },
            {
                title: 'Future of Sustainability Seminar',
                description: 'Guest lecture by Dr. Alan Green on renewable energy, carbon footprints, and individual actions for a sustainable future.',
                type: 'seminar',
                category: 'college',
                venue: 'Seminar Hall 2',
                startDate: new Date('2024-03-15T14:00:00Z'),
                endDate: new Date('2024-03-15T16:00:00Z'),
                registrationDeadline: new Date('2024-03-14T23:59:59Z'),
                maxParticipants: 200,
                currentParticipants: 180,
                registrationFee: 0,
                isPaid: false,
                organizer: 'Environmental Club',
                contactEmail: 'eco@college.edu',
                status: 'upcoming',
                imageUrl: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&q=80&w=800',
                createdBy: user._id
            }
        ];

        // Clear existing events
        await Event.deleteMany({});
        console.log('🗑️  Existing events cleared');

        // Insert new events
        await Event.insertMany(eventsWithCreator);
        console.log('✨ Sample events seeded successfully');

        process.exit(0);
    } catch (err) {
        console.error('❌ Seeding failed:', err.message);
        process.exit(1);
    }
};

seedDB();
