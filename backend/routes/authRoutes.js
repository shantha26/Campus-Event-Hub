const express        = require('express');
const jwt            = require('jsonwebtoken');
const router         = express.Router();
const authController = require('../controllers/authController');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey123';

const auth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'No token provided' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id; req.userRole = decoded.role; next();
  } catch (err) { res.status(401).json({ message: 'Invalid token' }); }
};

const superAdminOnly = (req, res, next) => {
  if (req.userRole !== 'superadmin') return res.status(403).json({ message: 'Forbidden' });
  next();
};

// ── Auth ───────────────────────────────────────────────
router.post('/register', authController.registerUser);
router.post('/login',    authController.loginUser);

// ── Current User ───────────────────────────────────────
router.get('/me', auth, async (req, res) => {
  try {
    const User = require('../models/User');
    const user = await User.findById(req.userId).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Wallet ─────────────────────────────────────────────
router.get('/wallet', auth, async (req, res) => {
  try {
    const User = require('../models/User');
    const user = await User.findById(req.userId).select('walletBalance');
    res.json({ walletBalance: user?.walletBalance || 0 });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/wallet/topup', auth, async (req, res) => {
  try {
    const User = require('../models/User');
    const { amount } = req.body;
    if (!amount || Number(amount) <= 0) return res.status(400).json({ message: 'Invalid amount' });
    const user = await User.findByIdAndUpdate(
      req.userId,
      { $inc: { walletBalance: Number(amount) } },
      { new: true }
    );
    res.json({ walletBalance: user.walletBalance, message: `Added Rs.${amount} to wallet` });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Super Admin: Get All Users ─────────────────────────
router.get('/users', auth, superAdminOnly, async (req, res) => {
  try {
    const User = require('../models/User');
    const { role, search } = req.query;
    let query = {};
    if (role && role !== 'all') query.role = role;
    if (search) {
      const re = { $regex: search, $options: 'i' };
      query.$or = [{ fullName: re }, { email: re }, { college: re }];
    }
    const users = await User.find(query).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Super Admin: Update User Status ────────────────────
router.patch('/users/:id/status', auth, superAdminOnly, async (req, res) => {
  try {
    const User = require('../models/User');
    const { status } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Super Admin: Update User Role ──────────────────────
router.patch('/users/:id/role', auth, superAdminOnly, async (req, res) => {
  try {
    const User = require('../models/User');
    const { role } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Super Admin: Platform Analytics ───────────────────
router.get('/analytics', auth, superAdminOnly, async (req, res) => {
  try {
    const User     = require('../models/User');
    const Event    = require('../models/Event');
    const Reg      = require('../models/Registration');

    const [
      totalStudents, totalAdmins, totalSuperAdmins,
      totalEvents, upcomingEvents, ongoingEvents, completedEvents,
      totalRegistrations, pendingRegistrations, approvedRegistrations,
      colleges
    ] = await Promise.all([
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'college-admin' }),
      User.countDocuments({ role: 'superadmin' }),
      Event.countDocuments(),
      Event.countDocuments({ status: 'upcoming' }),
      Event.countDocuments({ status: 'ongoing' }),
      Event.countDocuments({ status: 'completed' }),
      Reg.countDocuments(),
      Reg.countDocuments({ approvalStatus: 'pending' }),
      Reg.countDocuments({ approvalStatus: 'approved' }),
      User.distinct('college', { college: { $ne: '' } })
    ]);

    // Monthly registrations for the past 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const monthlyRegs = await Reg.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year:  { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    res.json({
      users: {
        total: totalStudents + totalAdmins + totalSuperAdmins,
        students: totalStudents,
        admins: totalAdmins,
        superAdmins: totalSuperAdmins
      },
      events: {
        total: totalEvents,
        upcoming: upcomingEvents,
        ongoing: ongoingEvents,
        completed: completedEvents
      },
      registrations: {
        total: totalRegistrations,
        pending: pendingRegistrations,
        approved: approvedRegistrations
      },
      colleges: colleges.length,
      monthlyRegistrations: monthlyRegs
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
