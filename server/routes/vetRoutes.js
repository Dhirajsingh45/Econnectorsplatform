const express = require('express');
const router = express.Router();
const vetController = require('../controllers/vetController');
const auth = require('../middleware/authMiddleware');

router.get('/stats', auth, vetController.getMedicalStats);
router.get('/', auth, vetController.getAllMedicalRecords);
router.get('/animal/:animalId', auth, vetController.getMedicalRecordsByAnimal);
router.get('/:id', auth, vetController.getMedicalRecordById);
router.post('/', auth, vetController.createMedicalRecord);
router.put('/:id', auth, vetController.updateMedicalRecord);

module.exports = router;
