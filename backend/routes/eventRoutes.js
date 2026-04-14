const express    = require('express');
const router     = express.Router();
const Event      = require('../models/Event');
const User       = require('../models/User');
const Registration = require('../models/Registration');
const jwt        = require('jsonwebtoken');
const upload     = require('../middleware/upload');

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800&q=80';

const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'No token provided' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey123');
    req.userId   = decoded.id;
    req.userRole = decoded.role;
    next();
  } catch (err) { res.status(401).json({ message: 'Invalid token' }); }
};

const adminMiddleware = (req, res, next) => {
  if (req.userRole !== 'college-admin' && req.userRole !== 'superadmin')
    return res.status(403).json({ message: 'Not authorized' });
  next();
};

// ─── TEST ────────────────────────────────────────────────
router.get('/test', (_req, res) => res.json({ message: 'Events API working!' }));

// ─── STATS ───────────────────────────────────────────────
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const [totalEvents, upcomingEvents, totalAdmins, totalStudents, totalColleges, pendingApprovals] = await Promise.all([
      Event.countDocuments(),
      Event.countDocuments({ status: 'upcoming' }),
      User.countDocuments({ role: 'college-admin' }),
      User.countDocuments({ role: 'student' }),
      User.distinct('college', { role: { $in: ['college-admin', 'student'] }, college: { $ne: '' } }).then(c => c.length),
      Registration.countDocuments({ approvalStatus: 'pending' })
    ]);
    res.json({ totalEvents, upcomingEvents, totalAdmins, totalStudents, totalColleges, pendingApprovals });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── GET ALL EVENTS ──────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { startDate, endDate, status, type, category, organizer, college, createdBy } = req.query;
    let match = {};
    if (status   && status   !== 'all') match.status   = status;
    if (type     && type     !== 'all') match.type     = { $regex: '^' + type     + '$', $options: 'i' };
    if (category && category !== 'all') match.category = { $regex: '^' + category + '$', $options: 'i' };
    if (organizer) match.organizer = { $regex: organizer, $options: 'i' };
    
    // College-based filtering for admins
    if (college) {
      // If we have a college, we want all events from that college
      // But we need to check the creator's college.
      // For now, let's assume we filter by a new 'college' field on Event if it exists,
      // or we'll need a more complex lookup.
      // Let's implement it via lookup for now.
      match.college = college; 
    }
    
    if (createdBy) match.createdBy = new mongoose.Types.ObjectId(createdBy);

    if (startDate || endDate) {
      match.startDate = {};
      if (startDate) match.startDate.$gte = new Date(startDate);
      if (endDate) { 
        const e = new Date(endDate); 
        e.setHours(23,59,59,999); 
        match.startDate.$lte = e; 
      }
    }

    const events = await Event.aggregate([
      { $match: match },
      {
        $lookup: {
          from: 'registrations',
          localField: '_id',
          foreignField: 'eventId',
          as: 'regs'
        }
      },
      {
        $addFields: {
          pendingCount: {
            $size: {
              $filter: {
                input: '$regs',
                as: 'r',
                cond: { $eq: ['$$r.approvalStatus', 'pending'] }
              }
            }
          }
        }
      },
      { $project: { regs: 0 } },
      { $sort: { startDate: 1 } }
    ]);

    console.log(`📡 Events Aggregation: Found ${events.length} events for match:`, JSON.stringify(match));
    res.json(events);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── GET ALL PLATFORM FEEDBACK ─────────────────────────────
router.get('/all-feedback', async (req, res) => {
  try {
    const feedback = await Event.aggregate([
      { $unwind: '$feedback' },
      { $sort: { 'feedback.createdAt': -1 } },
      { $limit: 10 },
      {
        $project: {
          _id: 0,
          eventId: '$_id',
          eventTitle: '$title',
          fullName: '$feedback.fullName',
          college: '$feedback.college',
          rating: '$feedback.rating',
          comment: '$feedback.comment',
          createdAt: '$feedback.createdAt'
        }
      }
    ]);
    res.json(feedback);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── GET SINGLE EVENT ────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    res.json(event);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── CREATE EVENT ────────────────────────────────────────
router.post('/', authMiddleware, adminMiddleware, upload.single('image'), async (req, res) => {
  try {
    const required = ['title','description','type','category','venue','startDate','endDate',
                      'registrationDeadline','maxParticipants','organizer','contactEmail'];
    for (const f of required) {
      if (!req.body[f]) return res.status(400).json({ message: `Missing field: ${f}` });
    }
    let imageUrl = DEFAULT_IMAGE;
    if (req.file) imageUrl = `/uploads/${req.file.filename}`;
    else if (req.body.imageUrl?.trim()) imageUrl = req.body.imageUrl.trim();

    const user = await User.findById(req.userId).select('college');
    const college = user?.college || '';

    const event = new Event({
      ...req.body, 
      imageUrl, 
      college,
      createdBy: req.userId,
      isPaid: Number(req.body.registrationFee) > 0,
      currentParticipants: 0, status: 'upcoming'
    });
    const saved = await event.save();
    res.status(201).json({ message: 'Event created successfully', event: saved });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── UPDATE EVENT ────────────────────────────────────────
router.put('/:id', authMiddleware, adminMiddleware, upload.single('image'), async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (String(event.createdBy) !== String(req.userId))
      return res.status(403).json({ message: 'You can only edit your own events' });
    const allowed = ['title','description','type','category','venue','startDate','endDate',
                     'registrationDeadline','maxParticipants','registrationFee','organizer','contactEmail','status'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    if (updates.registrationFee !== undefined) updates.isPaid = Number(updates.registrationFee) > 0;
    if (req.file) updates.imageUrl = `/uploads/${req.file.filename}`;
    else if (req.body.imageUrl?.trim()) updates.imageUrl = req.body.imageUrl.trim();
    const updated = await Event.findByIdAndUpdate(req.params.id, updates, { new: true });
    res.json({ message: 'Event updated successfully', event: updated });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── DELETE EVENT ────────────────────────────────────────
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (String(event.createdBy) !== String(req.userId))
      return res.status(403).json({ message: 'You can only delete your own events' });
    await Event.findByIdAndDelete(req.params.id);
    res.json({ message: 'Event deleted successfully' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── GET REGISTRATIONS FOR EVENT ─────────────────────────
router.get('/:id/registrations', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).populate('registeredUsers', 'fullName email college');
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (req.userRole !== 'superadmin' && String(event.createdBy) !== String(req.userId))
      return res.status(403).json({ message: 'Not authorized' });
    res.json({ event: { title: event.title, status: event.status }, registrations: event.registeredUsers, total: event.currentParticipants });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── SUBMIT FEEDBACK ─────────────────────────────────────
router.post('/:id/feedback', authMiddleware, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    if (!rating || rating < 1 || rating > 5)
      return res.status(400).json({ message: 'Rating must be 1-5' });

    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    const now = new Date();
    const isCompleted = event.status === 'completed' || now > new Date(event.endDate);
    if (!isCompleted) return res.status(400).json({ message: 'Feedback only for completed events' });
    if (isCompleted && event.status !== 'completed') event.status = 'completed';

    const registration = await Registration.findOne({
      eventId: event._id, userId: req.userId, approvalStatus: 'approved'
    });
    if (!registration) return res.status(403).json({ message: 'Only approved participants can submit feedback' });

    const alreadySubmitted = event.feedback?.some(f => String(f.userId) === String(req.userId));
    if (alreadySubmitted) return res.status(400).json({ message: 'Feedback already submitted' });

    const user = await User.findById(req.userId);
    if (!event.feedback) event.feedback = [];
    event.feedback.push({
      userId: req.userId, fullName: user?.fullName || '',
      college: user?.college || '', rating, comment: comment || '', createdAt: new Date()
    });
    await event.save();

    registration.hasFeedback = true;
    await registration.save();

    res.json({ message: 'Feedback submitted successfully' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── GET DISCUSSION COMMENTS ─────────────────────────────
// Forum is open for ALL event statuses except cancelled
// Access: admin/creator always, approved students always
router.get('/:id/comments', authMiddleware, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).select('comments createdBy status');
    if (!event) return res.status(404).json({ message: 'Event not found' });

    const isAdmin   = req.userRole === 'college-admin' || req.userRole === 'superadmin';
    const isCreator = String(event.createdBy) === String(req.userId);
    const reg       = await Registration.findOne({
      eventId: req.params.id, userId: req.userId, approvalStatus: 'approved'
    });

    // Access: any authenticated user can view the forum
    // (Filtering/checks for posting are handled in the POST route)
    // Removed strict check: if (!isAdmin && !isCreator && !reg) { ... }

    const comments = (event.comments || []).map(c => ({
      _id:       c._id.toString(),
      userId:    c.userId?.toString(),
      fullName:  c.fullName,
      college:   c.college,
      role:      c.role,
      text:      c.text,
      upvotes:   c.upvotes?.length || 0,
      upvotedBy: (c.upvotes || []).map(u => u.toString()),
      isPinned:  c.isPinned || false,
      createdAt: c.createdAt,
      isAdmin:   c.role === 'college-admin' || c.role === 'superadmin'
    }));

    res.json({ comments, total: comments.length });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── POST COMMENT ─────────────────────────────────────────
// Forum open from event creation — any non-cancelled status
router.post('/:id/comments', authMiddleware, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ message: 'Comment text is required' });

    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    // Forum is closed only for cancelled events
    if (event.status === 'cancelled') {
      return res.status(400).json({ message: 'Forum is closed for cancelled events' });
    }

    const isAdmin   = req.userRole === 'college-admin' || req.userRole === 'superadmin';
    const isCreator = String(event.createdBy) === String(req.userId);
    const reg       = await Registration.findOne({
      eventId: req.params.id, userId: req.userId, approvalStatus: 'approved'
    });

    if (!isAdmin && !isCreator && !reg) {
      return res.status(403).json({ message: 'Only approved participants and organizers can post comments' });
    }

    const user = await User.findById(req.userId).select('fullName college');
    const newComment = {
      userId:    req.userId,
      fullName:  user?.fullName || 'Unknown',
      college:   user?.college  || '',
      role:      req.userRole,
      text:      text.trim(),
      upvotes:   [],
      isPinned:  isAdmin || isCreator,  // Admin/organizer posts auto-pinned
      createdAt: new Date()
    };

    if (!event.comments) event.comments = [];
    event.comments.push(newComment);
    await event.save();

    const saved = event.comments[event.comments.length - 1];
    res.status(201).json({
      message: 'Comment posted successfully',
      comment: {
        _id:      saved._id.toString(),
        userId:   req.userId,
        fullName: saved.fullName,
        college:  saved.college,
        role:     saved.role,
        text:     saved.text,
        upvotes:  0,
        upvotedBy: [],
        isPinned: saved.isPinned,
        createdAt: saved.createdAt,
        isAdmin:  isAdmin || isCreator
      }
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── UPVOTE COMMENT ───────────────────────────────────────
router.post('/:id/comments/:commentId/upvote', authMiddleware, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    const comment = event.comments?.id(req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    const userId  = req.userId;
    const already = comment.upvotes?.some(u => String(u) === String(userId));
    if (already) {
      comment.upvotes = comment.upvotes.filter(u => String(u) !== String(userId));
    } else {
      comment.upvotes.push(userId);
    }

    await event.save();
    res.json({ upvotes: comment.upvotes.length, upvoted: !already });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── DELETE COMMENT ───────────────────────────────────────
router.delete('/:id/comments/:commentId', authMiddleware, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    const comment = event.comments?.id(req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    const isOwner   = String(comment.userId) === String(req.userId);
    const isAdmin   = req.userRole === 'college-admin' || req.userRole === 'superadmin';
    const isCreator = String(event.createdBy) === String(req.userId);

    if (!isOwner && !isAdmin && !isCreator)
      return res.status(403).json({ message: 'Not authorized to delete this comment' });

    comment.deleteOne();
    await event.save();
    res.json({ message: 'Comment deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;