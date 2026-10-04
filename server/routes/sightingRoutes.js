const express = require('express');
const router = express.Router();
const sightingController = require('../controllers/sightingController');
const auth = require('../middleware/authMiddleware');

router.post('/', auth, sightingController.createSighting);
router.get('/animal/:animalId', auth, sightingController.getSightingsByAnimal);

module.exports = router;
