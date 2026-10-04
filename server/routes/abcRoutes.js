const express = require('express');
const router = express.Router();
const abcController = require('../controllers/abcController');
const auth = require('../middleware/authMiddleware');

router.get('/', abcController.getCampaigns);
router.post('/', auth, abcController.createCampaign);
router.post('/:id/process', auth, abcController.processAnimal);

module.exports = router;
