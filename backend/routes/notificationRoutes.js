const express      = require('express');
const jwt          = require('jsonwebtoken');
const Notification = require('../models/Notification');
const router       = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey123';

const auth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'No token provided' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id; req.userRole = decoded.role; next();
  } catch (err) { res.status(401).json({ message: 'Invalid token' }); }
};

// Static routes before /:id
router.get('/',                 auth, async (req, res) => { try { res.json(await Notification.find({ userId: req.userId }).sort({ createdAt: -1 }).limit(50)); } catch (err) { res.status(500).json({ message: err.message }); } });
router.get('/unread-count',     auth, async (req, res) => { try { res.json({ count: await Notification.countDocuments({ userId: req.userId, read: false }) }); } catch (err) { res.status(500).json({ message: err.message }); } });
router.patch('/mark-all-read',  auth, async (req, res) => { try { await Notification.updateMany({ userId: req.userId, read: false }, { read: true }); res.json({ message: 'All marked as read' }); } catch (err) { res.status(500).json({ message: err.message }); } });
router.patch('/:id/read',       auth, async (req, res) => { try { await Notification.findOneAndUpdate({ _id: req.params.id, userId: req.userId }, { read: true }); res.json({ message: 'Marked as read' }); } catch (err) { res.status(500).json({ message: err.message }); } });
router.delete('/:id',           auth, async (req, res) => { try { await Notification.findOneAndDelete({ _id: req.params.id, userId: req.userId }); res.json({ message: 'Deleted' }); } catch (err) { res.status(500).json({ message: err.message }); } });

module.exports = router;