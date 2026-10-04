const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const auth = require('../middleware/authMiddleware');

// Middleware to enforce Admin role
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Administrator privileges required.' });
  }
};

// Demo reset only requires authentication, not admin role, since it strictly targets FN-DEMO-*
router.delete('/demo/reset', auth, adminController.resetDemoSession);

router.use(auth, adminOnly);

router.get('/stats', adminController.getAdminStats);
router.get('/users', adminController.getUsers);
router.put('/users/:userId/verify', adminController.updateUserVerification);
router.get('/audit-logs', adminController.getAuditLogs);
router.get('/duplicates', adminController.getDuplicateReports);

module.exports = router;

