const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const User = mongoose.model('User', new mongoose.Schema({ email: String, role: String, fullName: String, college: String }));
const Event = mongoose.model('Event', new mongoose.Schema({
  title: String,
  description: String,
  type: String,
  category: String,
  venue: String,
  startDate: Date,
  endDate: Date,
  registrationDeadline: Date,
  maxParticipants: Number,
  currentParticipants: { type: Number, default: 0 },
  registrationFee: Number,
  organizer: String,
  contactEmail: String,
  imageUrl: String,
  status: String,
  createdBy: mongoose.Schema.Types.ObjectId
}));

const events = [
  {
    title: 'Global Tech Innovation Summit 2026',
    description: 'Join industry leaders and innovators for a three-day summit exploring the future of AI, Quantum Computing, and Sustainable Technology. Features keynote speeches, hands-on workshops, and networking sessions.',
    type: 'technical',
    category: 'inter-college',
    venue: 'Main Auditorium, Block A',
    startDate: new Date('2026-05-15T09:00:00'),
    endDate: new Date('2026-05-17T18:00:00'),
    registrationDeadline: new Date('2026-05-10T23:59:59'),
    maxParticipants: 500,
    registrationFee: 299,
    organizer: 'Dept of Computer Science',
    contactEmail: 'tech.summit@college.edu',
    imageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80',
    status: 'upcoming'
  },
  {
    title: 'Harmony Cultural Festival',
    description: 'A celebration of diversity through music, dance, and art. Experience performances from various cultures, food stalls, and art exhibitions.',
    type: 'cultural',
    category: 'college',
    venue: 'Open Air Theatre (OAT)',
    startDate: new Date('2026-04-10T10:00:00'),
    endDate: new Date('2026-04-12T22:00:00'),
    registrationDeadline: new Date('2026-04-05T23:59:59'),
    maxParticipants: 1000,
    registrationFee: 0,
    organizer: 'Cultural Committee',
    contactEmail: 'harmony@college.edu',
    imageUrl: 'https://images.unsplash.com/photo-1514525253361-bee438d59174?w=800&q=80',
    status: 'upcoming'
  },
  {
    title: 'Inter-College Hackathon: Code for Change',
    description: 'A 24-hour hackathon to build solutions for real-world social problems. Great prizes and mentorship opportunities for participants.',
    type: 'technical',
    category: 'inter-college',
    venue: 'Innovation Hub, Floor 2',
    startDate: new Date('2026-06-20T10:00:00'),
    endDate: new Date('2026-06-21T10:00:00'),
    registrationDeadline: new Date('2026-06-15T23:59:59'),
    maxParticipants: 200,
    registrationFee: 150,
    organizer: 'Coding Club',
    contactEmail: 'hackathon@college.edu',
    imageUrl: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&q=80',
    status: 'upcoming'
  },
  {
    title: 'Annual Sports Meet 2026',
    description: 'Get ready for the ultimate showcase of athleticism. Events include Track and Field, Swimming, Football, and Basketball.',
    type: 'sports',
    category: 'college',
    venue: 'Sports Stadium & Ground',
    startDate: new Date('2026-03-28T08:00:00'),
    endDate: new Date('2026-03-30T17:00:00'),
    registrationDeadline: new Date('2026-03-20T23:59:59'),
    maxParticipants: 2000,
    registrationFee: 0,
    organizer: 'Physical Education Dept',
    contactEmail: 'sports@college.edu',
    imageUrl: 'https://images.unsplash.com/photo-1461896756993-7f733b79b5c3?w=800&q=80',
    status: 'upcoming'
  },
  {
    title: 'UI/UX Design Workshop',
    description: 'Learn the principles of modern design and user experience. Tools covered: Figma, Adobe XD.',
    type: 'workshop',
    category: 'college',
    venue: 'Design Lab, Room 302',
    startDate: new Date('2026-04-20T14:00:00'),
    endDate: new Date('2026-04-20T17:00:00'),
    registrationDeadline: new Date('2026-04-18T23:59:59'),
    maxParticipants: 50,
    registrationFee: 50,
    organizer: 'Creative Pixels Club',
    contactEmail: 'design@college.edu',
    imageUrl: 'https://images.unsplash.com/photo-1586717791821-3f44a563eb4c?w=800&q=80',
    status: 'upcoming'
  }
];

async function seed() {
  try {
    const URI = (process.env.MONGODB_URI || '').trim();
    if (!URI) throw new Error('MONGODB_URI is not defined in .env');
    await mongoose.connect(URI, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      family: 4
    });
    console.log('Connected to MongoDB');

    let admin = await User.findOne({ email: 'rio@gmail.com' });
    if (!admin) admin = await User.findOne({ email: 'SampleAdmin@gmail.com' });
    if (!admin) admin = await User.findOne({ role: 'college-admin' });
    if (!admin) admin = await User.findOne({ role: 'superadmin' });

    if (!admin) {
      console.error('No admin found. Please create an admin user first.');
      process.exit(1);
    }

    console.log(`Seeding events for admin: ${admin.email} (${admin._id})`);

    const eventsWithAdmin = events.map(e => ({
      ...e,
      createdBy: admin._id
    }));

    await Event.deleteMany({});
    await Event.insertMany(eventsWithAdmin);

    console.log('Successfully seeded 5 realistic events!');
    await mongoose.disconnect();
  } catch (err) {
    console.error('Seeding error:', err.message);
    process.exit(1);
  }
}

seed();
