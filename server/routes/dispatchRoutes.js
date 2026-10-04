const express = require('express');
const router = express.Router();
const dispatchController = require('../controllers/dispatchController');
const auth = require('../middleware/authMiddleware');

router.get('/eligible/:taskId', auth, dispatchController.findEligibleResponders);
router.post('/initiate/:taskId', auth, dispatchController.initiateDispatch);
router.post('/accept/:taskId', auth, dispatchController.acceptDispatch);

module.exports = router;
