const express = require('express');
const router = express.Router();
const adoptionController = require('../controllers/adoptionController');
const auth = require('../middleware/authMiddleware');

router.get('/stats', auth, adoptionController.getAdoptionStats);
router.get('/', auth, adoptionController.getApplications);
router.get('/:id', auth, adoptionController.getApplicationById);
router.post('/', auth, adoptionController.submitApplication);
router.put('/:id/review', auth, adoptionController.reviewApplication);
router.delete('/:id/cancel', auth, adoptionController.cancelApplication);

module.exports = router;
