const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const express  = require('express');
const cors     = require('cors');
const path     = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();

// ── Middleware ─────────────────────────────────────────
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Import Routes ────────────────────────────────
const authRoutes         = require('./routes/authRoutes');
const eventRoutes        = require('./routes/eventRoutes');
const registrationRoutes = require('./routes/registrationRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const chatRoutes         = require('./routes/chatRoutes');

// ── Mount Routes ───────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/registrations', registrationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/chat', chatRoutes);

// ── MongoDB Connection ─────────────────────────────────
const connectDB = async () => {
  const MONGODB_URI = (process.env.MONGODB_URI || '').trim();
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI missing in .env');
    process.exit(1);
  }

  try {
    console.log('🔌 Connecting to MongoDB...');

    // Extract host from SRV URI
    const host = new URL(MONGODB_URI.replace('mongodb+srv://', 'http://')).hostname;

    // DNS diagnostic
    const resolved = await dns.promises.resolveSrv(`_mongodb._tcp.${host}`).catch(async (e) => {
      console.warn(`📡 SRV DNS failed for ${host}: ${e.message}. Trying direct A record...`);
      return await dns.promises.resolve(host).catch(() => 'DNS_FATAL');
    });
    console.log(`📡 DNS resolution result:`, JSON.stringify(resolved));

    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      family: 4
    });

    console.log('✅ MongoDB connected');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

console.log("Routes loaded");
app.get('/api/test', (req, res) => {
  res.json({
    message: 'Backend working!',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    dbName: mongoose.connection.name
  });
});

app.get('/api/seed', async (req, res) => {
  try {
    const Event = mongoose.model('Event');
    const User = mongoose.model('User');
    
    let admin = await User.findOne({ email: 'rio@gmail.com' });
    if (!admin) admin = await User.findOne({ email: 'SampleAdmin@gmail.com' });
    if (!admin) admin = await User.findOne({ role: 'college-admin' });
    if (!admin) admin = await User.findOne({ role: 'superadmin' });

    if (!admin) return res.status(404).json({ message: 'No admin found to seed events' });

    const seedData = [
      {
        title: 'Global Tech Innovation Summit 2026',
        description: 'Join industry leaders and innovators for a three-day summit exploring the future of AI, Quantum Computing, and Sustainable Technology.',
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
        status: 'upcoming',
        createdBy: admin._id
      },
      {
        title: 'Harmony Cultural Festival',
        description: 'A celebration of diversity through music, dance, and art. Experience performances from various cultures.',
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
        status: 'upcoming',
        createdBy: admin._id
      },
      {
        title: 'Inter-College Hackathon: Code for Change',
        description: 'A 24-hour hackathon to build solutions for real-world social problems.',
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
        status: 'upcoming',
        createdBy: admin._id
      },
      {
        title: 'Annual Sports Meet 2026',
        description: 'Ultimate showcase of athleticism. Events include Track and Field, Swimming, Football, and Basketball.',
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
        status: 'upcoming',
        createdBy: admin._id
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
        status: 'upcoming',
        createdBy: admin._id
      }
    ];

    await Event.deleteMany({});
    await Event.insertMany(seedData);
    res.json({ message: 'Seeding successful!', count: seedData.length, admin: admin.email });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/', (req, res) => {
  res.send('<h1>CampusEventHub API Running ✅</h1><p>Test API: <a href="/api/test">/api/test</a></p>');
});

// ── 404 Handler ───────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found', url: req.originalUrl });
});

// ── Global Error Handler ──────────────────────────────
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err.stack);
  res.status(500).json({ message: 'Internal server error', error: err.message });
});

// ── Start Server ──────────────────────────────────────
const startServer = async () => {
  await connectDB();

  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
};

startServer();