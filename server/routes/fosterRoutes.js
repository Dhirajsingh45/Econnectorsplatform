const express = require('express');
const router = express.Router();
const fosterController = require('../controllers/fosterController');
const auth = require('../middleware/authMiddleware');

// Metrics and discovery
router.get('/stats', fosterController.getFosterStats);
router.get('/animals', fosterController.getFosterAnimals);
router.get('/animals/:animalId', fosterController.getFosterAnimalDetail);

// Applications & placements (authenticated)
router.get('/', auth, fosterController.getApplications);
router.post('/', auth, fosterController.submitApplication);
router.get('/my-placements', auth, fosterController.getMyPlacements);
router.put('/:id/review', auth, fosterController.reviewApplication);

// Active foster ongoing care & workflows
router.post('/:id/check-in', auth, fosterController.addCheckIn);
router.post('/:id/emergency', auth, fosterController.reportEmergency);
router.post('/:id/foster-to-adopt', auth, fosterController.fosterToAdopt);

module.exports = router;

