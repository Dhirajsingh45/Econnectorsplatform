const express = require('express');
const router = express.Router();
const animalController = require('../controllers/animalController');
const auth = require('../middleware/authMiddleware');

// Public Digital Animal Passport route (no auth required for QR scans and citizen checks)
router.get('/passport/:id', animalController.getAnimalPassport);

router.get('/', auth, animalController.getAllAnimals);
router.get('/:id', auth, animalController.getAnimalById);
router.post('/', auth, animalController.createAnimal);
router.put('/:id', auth, animalController.updateAnimal);
router.post('/:id/vaccinations', auth, animalController.addVaccination);
router.post('/match-photo', auth, animalController.matchPhotoSimilarity);

module.exports = router;
