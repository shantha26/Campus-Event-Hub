const express      = require('express');
const Registration = require('../models/Registration');
const Event        = require('../models/Event');
const Notification = require('../models/Notification');
const User         = require('../models/User');
const { verifyToken, requireRole } = require('../middleware/auth.middleware');
const router       = express.Router();

// ── Helper ────────────────────────────────────────────────────────────────────
async function notify(userId, type, title, message, eventId = null) {
  try { await Notification.create({ userId, type, title, message, eventId }); }
  catch (e) { console.error('Notification error:', e.message); }
}

// ── IMPORTANT: static routes MUST come before parameterized ones ──────────────

// GET /my/registrations  ← must be before GET /:id
router.get('/my/registrations', verifyToken, async (req, res) => {
  try {
    const regs = await Registration.find({ userId: req.user.id })
      .populate('eventId').sort({ registeredAt: -1 });

    const now = new Date();
    const result = regs.map(r => {
      const ev  = r.eventId ? (r.eventId.toObject ? r.eventId.toObject() : r.eventId) : {};
      let status = ev.status;
      if (status !== 'cancelled') {
        const s = new Date(ev.startDate), e = new Date(ev.endDate);
        if (now < s)              status = 'upcoming';
        else if (now >= s && now <= e) status = 'ongoing';
        else                      status = 'completed';
      }
      return {
        ...ev, status,
        registrationId:  r._id,
        approvalStatus:  r.approvalStatus,
        rejectionReason: r.rejectionReason || '',
        selectedSlot:    r.selectedSlot    || '',
        paymentStatus:   r.paymentStatus,
        paymentMethod:   r.paymentMethod,
        paymentTxnId:    r.paymentTxnId,
        paymentAmount:   r.paymentAmount,
        hasFeedback:     r.hasFeedback || false
      };
    });
    res.json(result);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PATCH /bulk-status  ← must be before PATCH /:id/status
router.patch('/bulk-status', verifyToken, requireRole('college-admin', 'superadmin'), async (req, res) => {
  try {
    const { ids, status, rejectionReason } = req.body;
    if (!ids?.length)                                    return res.status(400).json({ message: 'No IDs provided' });
    if (!['approved','rejected','pending'].includes(status)) return res.status(400).json({ message: 'Invalid status' });

    const update = { approvalStatus: status };
    if (status === 'rejected') update.rejectionReason = rejectionReason || '';
    else update.rejectionReason = '';

    await Registration.updateMany({ _id: { $in: ids } }, { $set: update });

    const regs = await Registration.find({ _id: { $in: ids } }).populate('eventId', 'title');
    for (const reg of regs) {
      const title = reg.eventId?.title || 'the event';
      if (status === 'approved')
        await notify(reg.userId, 'registration-approved', '✅ Registration Approved!',
          `Your registration for "${title}" has been approved. Get ready!`, reg.eventId?._id);
      else if (status === 'rejected')
        await notify(reg.userId, 'registration-rejected', '❌ Registration Rejected',
          `Your registration for "${title}" was rejected.${rejectionReason ? ' Reason: ' + rejectionReason : ''}`, reg.eventId?._id);
    }
    res.json({ message: `${ids.length} registration(s) ${status}` });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /:eventId/register
router.post('/:eventId/register', verifyToken, async (req, res) => {
  try {
    const { eventId }    = req.params;
    const { selectedSlot, paymentMethod, paymentTxnId, paymentAmount, useWallet } = req.body;

    const ev = await Event.findById(eventId);
    if (!ev)                                    return res.status(404).json({ message: 'Event not found' });
    if (ev.status === 'cancelled')              return res.status(400).json({ message: 'Event is cancelled' });
    if (ev.currentParticipants >= ev.maxParticipants) return res.status(400).json({ message: 'Event is full' });

    const already = await Registration.findOne({ eventId, userId: req.user.id });
    if (already) return res.status(400).json({ message: 'Already registered for this event' });

    let payStatus = 'free';
    let txnId = paymentTxnId || '';
    let finalAmount = paymentAmount || 0;

    if (ev.registrationFee > 0) {
      if (useWallet) {
        // Deduct from wallet
        const student = await User.findById(req.user.id);
        if (!student || student.walletBalance < ev.registrationFee)
          return res.status(400).json({ message: 'Insufficient wallet balance' });
        await User.findByIdAndUpdate(req.user.id, { $inc: { walletBalance: -ev.registrationFee } });
        payStatus   = 'paid';
        txnId       = 'WALLET-' + Date.now();
        finalAmount = ev.registrationFee;
      } else {
        payStatus   = paymentTxnId ? 'paid' : 'pending';
        finalAmount = paymentAmount || ev.registrationFee;
      }
    }

    const reg = await Registration.create({
      eventId, userId: req.user.id,
      selectedSlot:  selectedSlot  || '',
      approvalStatus:'pending',
      paymentStatus: payStatus,
      paymentMethod: useWallet ? 'wallet' : (paymentMethod || ''),
      paymentTxnId:  txnId,
      paymentAmount: finalAmount
    });

    ev.currentParticipants += 1;
    await ev.save();

    // Notify the admin who created the event
    if (ev.createdBy) {
      const student = await User.findById(req.user.id);
      await notify(ev.createdBy, 'new-registration', '📋 New Registration Request',
        `${student?.fullName || 'A student'} from ${student?.college || 'unknown'} wants to join "${ev.title}"`,
        ev._id);
    }

    // Get updated wallet balance
    const updatedUser = await User.findById(req.user.id).select('walletBalance');
    res.status(201).json({
      message: 'Registration submitted! Awaiting approval.',
      registrationId: reg._id,
      walletBalance: updatedUser?.walletBalance
    });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'Already registered for this event' });
    res.status(500).json({ message: err.message });
  }
});

// PATCH /:id/status  ← parameterized, must be AFTER /bulk-status
router.patch('/:id/status', verifyToken, requireRole('college-admin', 'superadmin'), async (req, res) => {
  try {
    const { status, rejectionReason } = req.body;
    if (!['approved','rejected','pending'].includes(status))
      return res.status(400).json({ message: 'Invalid status' });

    const reg = await Registration.findById(req.params.id);
    if (!reg) return res.status(404).json({ message: 'Registration not found' });

    reg.approvalStatus  = status;
    reg.rejectionReason = status === 'rejected' ? (rejectionReason || '') : '';
    await reg.save();

    const ev   = await Event.findById(reg.eventId);
    const title = ev?.title || 'the event';

    if (status === 'approved')
      await notify(reg.userId, 'registration-approved', '✅ Registration Approved!',
        `Your registration for "${title}" has been approved. Get ready!`, reg.eventId);
    else if (status === 'rejected')
      await notify(reg.userId, 'registration-rejected', '❌ Registration Rejected',
        `Your registration for "${title}" was rejected.${rejectionReason ? ' Reason: ' + rejectionReason : ''}`, reg.eventId);

    res.json({ message: `Registration ${status}`, registration: reg });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE /:id  (unregister — refund wallet if wallet payment)
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    let reg = await Registration.findOne({ eventId: req.params.id, userId: req.user.id });
    if (!reg) reg = await Registration.findOne({ _id: req.params.id, userId: req.user.id });
    if (!reg) return res.status(404).json({ message: 'Registration not found' });

    // Refund wallet payment
    if (reg.paymentMethod === 'wallet' && reg.paymentAmount > 0) {
      await User.findByIdAndUpdate(req.user.id, { $inc: { walletBalance: reg.paymentAmount } });
    }

    await Event.findByIdAndUpdate(reg.eventId, { $inc: { currentParticipants: -1 } });
    await reg.deleteOne();
    res.json({ message: 'Unregistered successfully' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
