const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getNodes,
  createNode,
  getRescueLogs,
  getCredits,
  getLeaderboard,
  getSettings,
  updateSettings
} = require('../controllers/ecosystemController');

router.get('/nodes', protect, getNodes);
router.post('/nodes', protect, createNode);
router.get('/logs', protect, getRescueLogs);
router.get('/credits', protect, getCredits);
router.get('/leaderboard', protect, getLeaderboard);
router.get('/settings', protect, getSettings);
router.put('/settings', protect, updateSettings);

module.exports = router;
