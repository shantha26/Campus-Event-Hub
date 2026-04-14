const express = require('express');
const router  = express.Router();
const registrationController = require('../controllers/registrationController');
const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'No token' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey123');
    req.userId   = decoded.id;
    req.userRole = decoded.role;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

const admin = (req, res, next) => {
  if (req.userRole !== 'college-admin' && req.userRole !== 'superadmin')
    return res.status(403).json({ message: 'Forbidden' });
  next();
};

router.use((req, res, next) => {
  console.log(`Registration API: ${req.method} ${req.url}`);
  next();
});

// Specific routes BEFORE parameterised ones
router.get('/my/registrations',  auth,        registrationController.getMyRegistrations);
router.patch('/bulk-status',     auth, admin, registrationController.bulkUpdateStatus);

router.post('/:id/register',     auth,        registrationController.registerForEvent);
router.post('/:id/pay',          auth,        registrationController.payForRegistration);
router.patch('/:id/status',      auth, admin, registrationController.updateStatus);
router.get('/:id/registrations', auth, admin, registrationController.getEventRegistrations);
router.get('/:id/ticket',        auth,        registrationController.getTicket);
router.post('/:id/check-in',     auth, admin, registrationController.checkIn); // Assuming 'protect' is 'auth' and 'authorize' is 'admin' based on existing middleware
router.delete('/:id',            auth,        registrationController.unregisterFromEvent);

module.exports = router;