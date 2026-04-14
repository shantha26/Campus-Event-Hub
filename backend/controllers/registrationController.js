const Registration = require('../models/Registration');
const Event        = require('../models/Event');
const User         = require('../models/User');
const Notification = require('../models/Notification');
const qrService    = require('../services/qrService');

// ── Helper: create notification ──────────────────────────
async function notify(userId, type, title, message, eventId = null) {
  try { await Notification.create({ userId, type, title, message, eventId }); }
  catch (e) { console.error('Notification error:', e.message); }
}

// ── Helper: refund payment when admin rejects ─────────────
async function processRefund(registration) {
  if (!registration || registration.paymentAmount <= 0 || registration.paymentStatus !== 'paid') {
    return { refundProcessed: false, refundMessage: '' };
  }
  let refundProcessed = false;
  let refundMessage   = '';

  if (registration.paymentMethod === 'wallet') {
    await User.findByIdAndUpdate(registration.userId, {
      $inc: { walletBalance: registration.paymentAmount }
    });
    refundProcessed = true;
    refundMessage   = `Rs.${registration.paymentAmount} refunded to your wallet`;
    console.log(`Wallet refund: Rs.${registration.paymentAmount} to user ${registration.userId}`);
  } else {
    refundProcessed = true;
    const m = (registration.paymentMethod || 'payment method').toUpperCase();
    refundMessage = `Rs.${registration.paymentAmount} will be refunded to your ${m} (TXN: ${registration.paymentTxnId || '-'})`;
    console.log(`External refund flagged: ${refundMessage}`);
  }

  // Use findByIdAndUpdate to avoid Mongoose enum validation on stale document
  await Registration.findByIdAndUpdate(registration._id, {
    $set: { paymentStatus: 'refunded' }
  });

  return { refundProcessed, refundMessage };
}

// ── Helper: re-charge payment when admin re-approves ──────
// Called when approving a student whose paymentStatus is 'refunded'
async function processReCharge(registration, event) {
  // Only applies to paid events where payment was previously refunded
  if (!registration || registration.paymentAmount <= 0 || registration.paymentStatus !== 'refunded') {
    return { chargeProcessed: false, chargeMessage: '', requiresStudentAction: false };
  }

  const amount = registration.paymentAmount;

  // Wallet payment: try to re-deduct from wallet
  if (registration.paymentMethod === 'wallet') {
    const student = await User.findById(registration.userId).select('walletBalance fullName');
    if (!student) return { chargeProcessed: false, chargeMessage: 'Student not found', requiresStudentAction: false };

    if (student.walletBalance >= amount) {
      // Sufficient balance — deduct silently
      await User.findByIdAndUpdate(registration.userId, {
        $inc: { walletBalance: -amount }
      });
      await Registration.findByIdAndUpdate(registration._id, {
        $set: { paymentStatus: 'paid' }
      });
      console.log(`Re-charge: Rs.${amount} deducted from wallet of user ${registration.userId}`);
      return {
        chargeProcessed:      true,
        chargeMessage:        `Rs.${amount} re-deducted from student's wallet`,
        requiresStudentAction: false
      };
    } else {
      // Insufficient balance — mark as payment_pending and notify student
      await Registration.findByIdAndUpdate(registration._id, {
        $set: { paymentStatus: 'payment_pending' }
      });
      console.log(`Re-charge: Insufficient wallet balance for user ${registration.userId}. Needs Rs.${amount}, has Rs.${student.walletBalance}`);
      return {
        chargeProcessed:      false,
        chargeMessage:        `Student has insufficient wallet balance (has Rs.${student.walletBalance}, needs Rs.${amount}). Student notified to pay.`,
        requiresStudentAction: true,
        shortfall:            amount - student.walletBalance
      };
    }
  }

  // UPI/Card/NetBanking: cannot auto-charge, mark as payment_pending and notify student
  await Registration.findByIdAndUpdate(registration._id, {
    $set: { paymentStatus: 'payment_pending' }
  });
  const method = (registration.paymentMethod || 'original payment method').toUpperCase();
  console.log(`Re-charge: Cannot auto-charge ${method} for user ${registration.userId}. Marked payment_pending.`);
  return {
    chargeProcessed:      false,
    chargeMessage:        `Student needs to re-pay Rs.${amount} via ${method}. Student has been notified.`,
    requiresStudentAction: true
  };
}

// ── POST /:eventId/register ───────────────────────────────
exports.registerForEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { selectedSlot, paymentMethod, paymentTxnId, paymentAmount, useWallet } = req.body;
    const userId = req.userId;

    const event = await Event.findById(id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (event.status === 'cancelled') return res.status(400).json({ message: 'Event is cancelled' });
    if (event.currentParticipants >= event.maxParticipants) return res.status(400).json({ message: 'Event is full' });

    // Check existing registration
    const existing = await Registration.findOne({ eventId: id, userId });
    if (existing) {
      // Allow re-registration only if payment_pending (student needs to pay again)
      if (existing.paymentStatus === 'payment_pending') {
        return res.status(400).json({
          message: 'You have a pending payment for this event. Please complete the payment.',
          paymentPending: true,
          registrationId: existing._id,
          amountDue: existing.paymentAmount
        });
      }
      if (existing.approvalStatus === 'rejected') {
        return res.status(400).json({
          message: 'Your registration was previously rejected by the organizer. This decision is final.',
          finalRejection: true
        });
      }
      return res.status(400).json({ message: 'You are already registered for this event' });
    }

    let payStatus = 'free', txnId = paymentTxnId || '', finalAmount = 0, paymentProcessed = false;

    if (event.registrationFee > 0) {
      finalAmount = event.registrationFee;
      if (useWallet === true || paymentMethod === 'wallet') {
        const student = await User.findById(userId);
        if (!student || student.walletBalance < event.registrationFee)
          return res.status(400).json({ message: 'Insufficient wallet balance' });
        student.walletBalance -= event.registrationFee;
        await student.save();
        payStatus = 'paid';
        txnId = 'WALLET-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
        paymentProcessed = true;
      } else if (['upi','card','netbanking'].includes(paymentMethod)) {
        if (!txnId) txnId = paymentMethod.toUpperCase() + '-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
        payStatus = 'paid'; paymentProcessed = true;
      } else if (paymentMethod && paymentAmount) {
        if (!txnId) txnId = 'PAY-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
        payStatus = 'paid'; paymentProcessed = true;
      } else {
        return res.status(400).json({ message: 'Payment required for this event' });
      }
    }

    const registration = await Registration.create({
      eventId:        id,
      userId,
      selectedSlot:   selectedSlot || '',
      approvalStatus: 'pending',
      paymentStatus:  payStatus,
      paymentMethod:  useWallet ? 'wallet' : (paymentMethod || ''),
      paymentTxnId:   txnId,
      paymentAmount:  finalAmount
    });

    event.currentParticipants += 1;
    await event.save();

    if (event.createdBy) {
      const student = await User.findById(userId);
      await notify(event.createdBy, 'new-registration', 'New Registration Request',
        `${student?.fullName || 'A student'} from ${student?.college || 'unknown'} wants to join "${event.title}"`,
        event._id);
    }

    const updatedUser = await User.findById(userId).select('walletBalance');
    res.status(201).json({
      message:          `Successfully registered for ${event.title}`,
      registrationId:   registration._id,
      walletBalance:    updatedUser?.walletBalance || 0,
      paymentStatus:    payStatus,
      paymentMethod:    useWallet ? 'wallet' : (paymentMethod || ''),
      paymentTxnId:     txnId,
      paymentAmount:    finalAmount,
      paymentProcessed,
      registration
    });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'Already registered for this event' });
    console.error('registerForEvent error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

// ── POST /:eventId/pay — student re-pays after re-approval ─
exports.payForRegistration = async (req, res) => {
  try {
    const { id } = req.params; // registrationId
    const { paymentMethod, paymentTxnId, useWallet } = req.body;
    const userId = req.userId;

    const reg = await Registration.findOne({ _id: id, userId });
    if (!reg) return res.status(404).json({ message: 'Registration not found' });
    if (reg.paymentStatus !== 'payment_pending') return res.status(400).json({ message: 'No payment pending for this registration' });

    const event = await Event.findById(reg.eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    const amount = reg.paymentAmount;
    let txnId = paymentTxnId || '';

    if (useWallet === true || paymentMethod === 'wallet') {
      const student = await User.findById(userId);
      if (!student || student.walletBalance < amount)
        return res.status(400).json({ message: `Insufficient wallet balance. You need Rs.${amount}, you have Rs.${student?.walletBalance || 0}` });
      await User.findByIdAndUpdate(userId, { $inc: { walletBalance: -amount } });
      txnId = 'WALLET-REPAY-' + Date.now();
    } else if (['upi','card','netbanking'].includes(paymentMethod)) {
      if (!txnId) txnId = paymentMethod.toUpperCase() + '-REPAY-' + Date.now();
    } else {
      return res.status(400).json({ message: 'Valid payment method required' });
    }

    await Registration.findByIdAndUpdate(id, {
      $set: {
        paymentStatus: 'paid',
        paymentMethod: useWallet ? 'wallet' : paymentMethod,
        paymentTxnId:  txnId
      }
    });

    const updatedUser = await User.findById(userId).select('walletBalance');
    await notify(userId, 'general', 'Payment Successful',
      `Your payment of Rs.${amount} for "${event.title}" was successful. You are confirmed!`, event._id);

    res.json({
      message:       'Payment successful! Your registration is now confirmed.',
      walletBalance: updatedUser?.walletBalance || 0,
      paymentTxnId:  txnId
    });
  } catch (err) {
    console.error('payForRegistration error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

// ── GET /:id/registrations (admin) ────────────────────────
exports.getEventRegistrations = async (req, res) => {
  try {
    const registrations = await Registration.find({ eventId: req.params.id })
      .populate('userId', 'fullName email college walletBalance role')
      .sort({ registeredAt: -1 });

    const formatted = registrations.map(r => ({
      _id:             r._id.toString(),
      registrationId:  r._id.toString(),
      fullName:        r.userId?.fullName  || 'Unknown',
      email:           r.userId?.email     || '',
      college:         r.userId?.college   || '',
      role:            r.userId?.role      || 'student',

      walletBalance:   r.userId?.walletBalance || 0,
      selectedSlot:    r.selectedSlot      || '',
      approvalStatus:  r.approvalStatus,
      rejectionReason: r.rejectionReason   || '',
      paymentStatus:   r.paymentStatus,
      paymentMethod:   r.paymentMethod     || '-',
      paymentAmount:   r.paymentAmount     || 0,
      registeredAt:    r.registeredAt
    }));

    res.json({ registrations: formatted });
  } catch (err) { res.status(500).json({ message: err.message }); }
};



// ── GET /my/registrations ─────────────────────────────────
exports.getMyRegistrations = async (req, res) => {
  try {
    const regs = await Registration.find({ userId: req.userId })
      .populate('eventId')
      .sort({ registeredAt: -1 });

    const now = new Date();
    const formatted = regs.map(r => {
      if (!r.eventId) return null;
      const ev = r.eventId.toObject();
      let status = ev.status;
      if (status !== 'cancelled') {
        const s = new Date(ev.startDate), e = new Date(ev.endDate);
        if (now < s)               status = 'upcoming';
        else if (now >= s && now <= e) status = 'ongoing';
        else                       status = 'completed';
      }
      return {
        ...ev,
        _id:             ev._id.toString(),
        status,
        registrationId:  r._id.toString(),
        approvalStatus:  r.approvalStatus,
        rejectionReason: r.rejectionReason || '',
        selectedSlot:    r.selectedSlot    || '',
        paymentStatus:   r.paymentStatus,
        paymentMethod:   r.paymentMethod,
        paymentTxnId:    r.paymentTxnId,
        paymentAmount:   r.paymentAmount,
        hasFeedback:     r.hasFeedback || false,
        attendanceStatus: r.attendanceStatus || 'absent',
        checkedInAt:      r.checkedInAt || null
      };
    }).filter(Boolean);

    res.json(formatted);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── PATCH /:id/status (single approve/reject) ────────────
exports.updateStatus = async (req, res) => {
  try {
    const { status, rejectionReason } = req.body;
    if (!['approved','rejected','pending'].includes(status))
      return res.status(400).json({ message: 'Invalid status' });

    const reg = await Registration.findById(req.params.id);
    if (!reg) return res.status(404).json({ message: 'Registration not found' });

    const event = await Event.findById(reg.eventId);
    const title = event?.title || 'the event';

    let refundInfo  = { refundProcessed: false, refundMessage: '' };
    let chargeInfo  = { chargeProcessed: false, chargeMessage: '', requiresStudentAction: false };

    if (status === 'rejected' && reg.approvalStatus !== 'rejected') {
      // Rejecting — refund if paid
      refundInfo = await processRefund(reg);

    } else if (status === 'approved' && reg.paymentStatus === 'refunded') {
      // Re-approving after previous rejection — re-charge payment
      chargeInfo = await processReCharge(reg, event);
    }

    // Update approval status
    await Registration.findByIdAndUpdate(req.params.id, {
      $set: {
        approvalStatus:  status,
        rejectionReason: status === 'rejected' ? (rejectionReason || '') : ''
      }
    });

    // Send notifications
    if (status === 'approved') {
      if (chargeInfo.requiresStudentAction) {
        // Student needs to pay again
        await notify(reg.userId, 'general', 'Re-Approval: Payment Required',
          `Good news! Your registration for "${title}" has been re-approved. However, you need to complete payment of Rs.${reg.paymentAmount} to confirm your spot. Please visit the event and complete payment.`,
          reg.eventId);
      } else {
        await notify(reg.userId, 'registration-approved', 'Registration Approved!',
          `Your registration for "${title}" has been approved. Get ready!`, reg.eventId);
      }
    } else if (status === 'rejected') {
      const refundNote = refundInfo.refundProcessed ? ` ${refundInfo.refundMessage}.` : '';
      await notify(reg.userId, 'registration-rejected', 'Registration Rejected',
        `Your registration for "${title}" was rejected.${rejectionReason ? ' Reason: ' + rejectionReason : ''}${refundNote}`,
        reg.eventId);
    }

    res.json({
      message: `Registration ${status}`,
      ...refundInfo,
      ...chargeInfo
    });
  } catch (err) {
    console.error('updateStatus error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

// ── PATCH /bulk-status ────────────────────────────────────
exports.bulkUpdateStatus = async (req, res) => {
  try {
    const { ids, status, rejectionReason } = req.body;
    if (!ids?.length) return res.status(400).json({ message: 'No IDs provided' });
    if (!['approved','rejected','pending'].includes(status))
      return res.status(400).json({ message: 'Invalid status' });

    const regs = await Registration.find({ _id: { $in: ids } }).populate('eventId', 'title');
    let totalRefunded   = 0;
    let totalRecharged  = 0;
    let pendingPayments = 0;

    for (const reg of regs) {
      const title = reg.eventId?.title || 'the event';

      if (status === 'rejected') {
        const refundInfo = await processRefund(reg);
        if (refundInfo.refundProcessed) totalRefunded++;

        await Registration.findByIdAndUpdate(reg._id, {
          $set: { approvalStatus: 'rejected', rejectionReason: rejectionReason || '' }
        });

        const refundNote = refundInfo.refundProcessed ? ` ${refundInfo.refundMessage}.` : '';
        await notify(reg.userId, 'registration-rejected', 'Registration Rejected',
          `Your registration for "${title}" was rejected.${rejectionReason ? ' Reason: ' + rejectionReason : ''}${refundNote}`,
          reg.eventId?._id);

      } else if (status === 'approved') {
        let chargeInfo = { chargeProcessed: false, requiresStudentAction: false };

        if (reg.paymentStatus === 'refunded') {
          chargeInfo = await processReCharge(reg, reg.eventId);
          if (chargeInfo.chargeProcessed) totalRecharged++;
          if (chargeInfo.requiresStudentAction) pendingPayments++;
        }

        await Registration.findByIdAndUpdate(reg._id, {
          $set: { approvalStatus: 'approved', rejectionReason: '' }
        });

        if (chargeInfo.requiresStudentAction) {
          await notify(reg.userId, 'general', 'Re-Approval: Payment Required',
            `Your registration for "${title}" has been re-approved! Please complete payment of Rs.${reg.paymentAmount} to confirm your spot.`,
            reg.eventId?._id);
        } else {
          await notify(reg.userId, 'registration-approved', 'Registration Approved!',
            `Your registration for "${title}" has been approved!`, reg.eventId?._id);
        }

      } else {
        await Registration.findByIdAndUpdate(reg._id, {
          $set: { approvalStatus: status }
        });
      }
    }

    res.json({
      success:          true,
      message:          `Updated ${ids.length} registrations to ${status}`,
      refundsProcessed: totalRefunded,
      rechargesProcessed: totalRecharged,
      pendingPayments
    });
  } catch (err) {
    console.error('bulkUpdateStatus error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

// ── DELETE /:id (student self-cancel) ────────────────────
exports.unregisterFromEvent = async (req, res) => {
  try {
    const { id }  = req.params;
    const userId  = req.userId;

    let registration = await Registration.findOne({ eventId: id, userId });
    if (!registration) registration = await Registration.findOne({ _id: id, userId });
    if (!registration) return res.status(404).json({ message: 'Registration not found' });

    if (registration.approvalStatus === 'rejected') {
      return res.status(400).json({ message: 'Cannot cancel a rejected registration.' });
    }

    let refundProcessed = false, refundMessage = '', updatedWalletBalance = null;

    if (registration.paymentAmount > 0 && registration.paymentStatus === 'paid') {
      if (registration.paymentMethod === 'wallet') {
        await User.findByIdAndUpdate(userId, { $inc: { walletBalance: registration.paymentAmount } });
        refundProcessed = true;
        refundMessage   = `Rs.${registration.paymentAmount} refunded to wallet`;
        const u = await User.findById(userId).select('walletBalance');
        updatedWalletBalance = u?.walletBalance;
      } else {
        refundProcessed = true;
        refundMessage   = `Rs.${registration.paymentAmount} will be refunded to your ${registration.paymentMethod.toUpperCase()}`;
      }
    }

    const eventId = registration.eventId;
    await registration.deleteOne();
    await Event.findByIdAndUpdate(eventId, { $inc: { currentParticipants: -1 } });

    res.json({
      message: 'Registration cancelled successfully',
      refundProcessed,
      refundMessage,
      walletBalance: updatedWalletBalance
    });
  } catch (err) {
    console.error('unregisterFromEvent error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

/**
 * GET /:id/ticket
 * returns ticket details + QR code for an approved registration
 */
exports.getTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const reg = await Registration.findOne({ _id: id, userId })
      .populate("eventId")
      .populate("userId", "fullName email college");

    if (!reg) return res.status(404).json({ message: "Registration not found" });
    if (reg.approvalStatus !== "approved") {
      return res.status(403).json({ message: "Tickets are only available for approved registrations" });
    }

    const event = reg.eventId;
    if (!event) return res.status(404).json({ message: "Event details not found" });

    // Data to be encoded in QR code
    const qrData = {
      registrationId: reg._id,
      eventId:        event._id,
      eventTitle:    event.title,
      userName:       reg.userId?.fullName,
      userEmail:      reg.userId?.email,
      timestamp:      new Date()
    };

    const qrCodeDataUrl = await qrService.generateQR(qrData);

    res.json({
      registration: {
        id:           reg._id,
        slot:         reg.selectedSlot,
        date:         reg.registeredAt
      },
      event: {
        title:        event.title,
        venue:        event.venue,
        startDate:    event.startDate,
        organizer:    event.organizer
      },
      user: {
        fullName:     reg.userId?.fullName,
        college:      reg.userId?.college
      },
      qrCode:         qrCodeDataUrl
    });
  } catch (err) {
    console.error("getTicket error:", err.message);
    res.status(500).json({ message: err.message });
  }
};

/**
 * POST /:id/check-in
 * Marks a student as present for an event.
 */
exports.checkIn = async (req, res) => {
  try {
    const { id } = req.params;
    const reg = await Registration.findById(id).populate("eventId");
    if (!reg) return res.status(404).json({ message: "Registration not found" });

    if (reg.approvalStatus !== "approved") {
      return res.status(400).json({ message: "Cannot check-in. Registration is not approved." });
    }

    if (reg.attendanceStatus === "present") {
      return res.status(400).json({ message: "Student is already checked-in." });
    }

    reg.attendanceStatus = "present";
    reg.checkedInAt = new Date();
    await reg.save();

    // Helper function notify is defined at the top of this file
    await notify(reg.userId, "general", "Checked In!", 
      `You have been successfully checked into "${reg.eventId?.title || 'the event'}". Enjoy!`, 
      reg.eventId?._id);

    res.json({
      message: "Check-in successful!",
      registration: {
        id: reg._id,
        attendanceStatus: reg.attendanceStatus,
        checkedInAt: reg.checkedInAt
      }
    });
  } catch (err) {
    console.error("checkIn error:", err.message);
    res.status(500).json({ message: err.message });
  }
};
