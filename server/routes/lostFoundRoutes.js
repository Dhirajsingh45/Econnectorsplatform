const express = require('express');
const router = express.Router();
const lostFoundController = require('../controllers/lostFoundController');
const auth = require('../middleware/authMiddleware');

router.get('/', lostFoundController.getReports);
router.get('/:id', lostFoundController.getReportById);
router.post('/', auth, lostFoundController.createReport);
router.post('/:id/convert-to-rescue', auth, lostFoundController.convertToRescueCase);
router.post('/:id/reunion', auth, lostFoundController.recordReunion);
router.get('/:id/matches', auth, lostFoundController.findMatches);
router.get('/match/:id', auth, lostFoundController.findMatches); // Backward compatibility

module.exports = router;

