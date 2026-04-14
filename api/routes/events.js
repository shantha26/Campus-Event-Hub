const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const Event        = require('../models/Event');
const Registration = require('../models/Registration');
const Notification = require('../models/Notification');
const { verifyToken, requireRole } = require('../middleware/auth.middleware');
const router  = express.Router();

// ── Multer ────────────────────────────────────────────────────────────────────
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename:    (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`)
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg','image/png','image/gif','image/webp'];
    cb(null, allowed.includes(file.mimetype));
  }
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function computeStatus(event) {
  if (event.status === 'cancelled') return 'cancelled';
  const now = new Date(), s = new Date(event.startDate), e = new Date(event.endDate);
  if (now < s)             return 'upcoming';
  if (now >= s && now <= e) return 'ongoing';
  return 'completed';
}

function enrich(ev) {
  const obj = ev.toObject ? ev.toObject() : { ...ev };
  obj.status = computeStatus(obj);
  obj.isPaid = (obj.registrationFee || 0) > 0;
  return obj;
}

async function notifyAllParticipants(eventId, type, title, message) {
  const regs = await Registration.find({ eventId }).select('userId');
  const notifs = regs.map(r => ({ userId: r.userId, type, title, message, eventId }));
  if (notifs.length) await Notification.insertMany(notifs);
}

// ── GET all events ────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { status, type, category, organizer, startDate, endDate } = req.query;
    const filter = {};
    if (type)      filter.type     = type;
    if (category)  filter.category = category;
    if (organizer) filter.organizer = new RegExp(organizer, 'i');
    if (startDate || endDate) {
      filter.startDate = {};
      if (startDate) filter.startDate.$gte = new Date(startDate);
      if (endDate)   filter.startDate.$lte = new Date(endDate);
    }

    const events = await Event.find(filter).sort({ startDate: 1 });
    const enriched = [];
    for (const ev of events) {
      const computed = computeStatus(ev);
      if (computed !== ev.status) { ev.status = computed; await ev.save(); }
      const obj = ev.toObject();
      obj.isPaid = (obj.registrationFee || 0) > 0;
      enriched.push(obj);
    }
    const result = status ? enriched.filter(e => e.status === status) : enriched;
    res.json(result);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── GET stats ─────────────────────────────────────────────────────────────────
router.get('/stats', verifyToken, async (req, res) => {
  try {
    const events = await Event.find();
    const now = new Date();
    res.json({
      total:     events.length,
      upcoming:  events.filter(e => new Date(e.startDate) > now).length,
      ongoing:   events.filter(e => new Date(e.startDate) <= now && new Date(e.endDate) >= now).length,
      completed: events.filter(e => new Date(e.endDate) < now && e.status !== 'cancelled').length
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── GET event registrations (admin) — BEFORE /:id ─────────────────────────────
// This is handled at /:id/registrations below but ordering vs /:id matters for Express
// Express resolves /:id/registrations fine since it's a sub-path, ordering not an issue here

// ── GET single event ──────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const ev = await Event.findById(req.params.id);
    if (!ev) return res.status(404).json({ message: 'Event not found' });
    res.json(enrich(ev));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── GET registrations for event (admin) ───────────────────────────────────────
router.get('/:id/registrations', verifyToken, requireRole('college-admin','superadmin'), async (req, res) => {
  try {
    const regs = await Registration.find({ eventId: req.params.id })
      .populate('userId', 'fullName email college');
    const registrations = regs.map(r => {
      const rid = r._id.toString();
      return {
        _id:             rid,
        registrationId:  rid,
        userId:          r.userId?._id,
        fullName:        r.userId?.fullName || 'Unknown',
        email:           r.userId?.email    || '',
        college:         r.userId?.college  || '',
        approvalStatus:  r.approvalStatus,
        rejectionReason: r.rejectionReason  || '',
        selectedSlot:    r.selectedSlot     || '',
        paymentStatus:   r.paymentStatus,
        paymentMethod:   r.paymentMethod    || '—',
        paymentAmount:   r.paymentAmount    || 0,
        registeredAt:    r.registeredAt
      };
    });
    res.json({ registrations });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── POST create event ─────────────────────────────────────────────────────────
router.post('/', verifyToken, requireRole('college-admin','superadmin'), upload.single('image'), async (req, res) => {
  try {
    const body = req.body;
    const imageUrl = req.file
      ? `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`
      : '';
    const ev = await Event.create({
      ...body,
      registrationFee: Number(body.registrationFee) || 0,
      maxParticipants: Number(body.maxParticipants),
      isPaid: Number(body.registrationFee) > 0,
      imageUrl, createdBy: req.user.id
    });
    res.status(201).json(enrich(ev));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── PUT update event ──────────────────────────────────────────────────────────
router.put('/:id', verifyToken, requireRole('college-admin','superadmin'), upload.single('image'), async (req, res) => {
  try {
    const ev = await Event.findById(req.params.id);
    if (!ev) return res.status(404).json({ message: 'Event not found' });

    const prevVenue  = ev.venue;
    const prevStart  = ev.startDate?.toISOString();
    const wasCancelled = ev.status === 'cancelled';

    const body = req.body;
    Object.assign(ev, body);
    if (req.file) ev.imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    if (body.registrationFee !== undefined) {
      ev.registrationFee = Number(body.registrationFee) || 0;
      ev.isPaid = ev.registrationFee > 0;
    }
    if (!body.status) ev.status = computeStatus(ev);

    await ev.save();

    // Notify participants about important changes
    const changes = [];
    if (body.status === 'cancelled' && !wasCancelled) {
      await notifyAllParticipants(ev._id, 'event-update',
        '🚫 Event Cancelled',
        `"${ev.title}" has been cancelled by the organizer. We apologize for any inconvenience.`);
    } else {
      if (body.venue && body.venue !== prevVenue)
        changes.push(`Venue changed to "${body.venue}"`);
      if (body.startDate && new Date(body.startDate).toISOString() !== prevStart)
        changes.push(`Start date updated to ${new Date(body.startDate).toLocaleDateString()}`);
      if (changes.length) {
        await notifyAllParticipants(ev._id, 'event-update',
          '📢 Event Updated',
          `"${ev.title}" has been updated: ${changes.join(', ')}.`);
      }
    }

    res.json(enrich(ev));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── DELETE event ──────────────────────────────────────────────────────────────
router.delete('/:id', verifyToken, requireRole('college-admin','superadmin'), async (req, res) => {
  try {
    const ev = await Event.findById(req.params.id);
    if (ev) {
      await notifyAllParticipants(ev._id, 'event-update',
        '🗑️ Event Removed',
        `"${ev.title}" has been removed by the organizer.`);
    }
    await Event.findByIdAndDelete(req.params.id);
    res.json({ message: 'Event deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── POST feedback ─────────────────────────────────────────────────────────────
router.post('/:id/feedback', verifyToken, async (req, res) => {
  try {
    const { rating, comment, fullName } = req.body;
    if (!rating || rating < 1 || rating > 5) return res.status(400).json({ message: 'Rating must be 1–5' });

    const ev = await Event.findById(req.params.id);
    if (!ev) return res.status(404).json({ message: 'Event not found' });

    // Only students who are registered can give feedback
    const reg = await Registration.findOne({ eventId: req.params.id, userId: req.user.id });
    if (!reg) return res.status(403).json({ message: 'Only registered participants can give feedback' });

    const already = ev.feedback?.find(f => String(f.userId) === req.user.id);
    if (already) return res.status(400).json({ message: 'You have already submitted feedback' });

    const User = require('../models/User');
    const user = await User.findById(req.user.id).select('fullName college');
    ev.feedback.push({
      userId: req.user.id,
      rating: Number(rating),
      comment: comment || '',
      fullName: fullName || user?.fullName || '',
      college:  user?.college || ''
    });
    // Mark registration as having feedback
    reg.hasFeedback = true;
    await reg.save();
    await ev.save();
    res.json({ message: 'Feedback submitted successfully' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
