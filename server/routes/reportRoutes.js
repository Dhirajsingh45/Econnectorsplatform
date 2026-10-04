const express = require('express');
const router = express.Router();
const {
  createReport,
  getReports,
  getStats,
  getAllTasks,
  updateTask,
  verifyTask,
  escalateTask,
  addTaskMessage,
  triageReport,
  checkDuplicates,
  updateTaskChecklist
} = require('../controllers/reportController');
const { protect } = require('../middleware/authMiddleware');

// Report routes
router.post('/', protect, createReport);
router.post('/triage', protect, triageReport);
router.post('/check-duplicates', protect, checkDuplicates);
router.get('/', protect, getReports);
router.get('/stats', protect, getStats);

// Task routes
router.get('/tasks', protect, getAllTasks);
router.put('/tasks/:id', protect, updateTask);
router.put('/tasks/:id/checklist', protect, updateTaskChecklist);
router.post('/tasks/:id/escalate', protect, escalateTask);
router.post('/tasks/:id/messages', protect, addTaskMessage);
router.put('/tasks/:id/verify', protect, verifyTask);

module.exports = router;
