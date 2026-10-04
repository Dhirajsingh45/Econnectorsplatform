const express = require('express');
const router = express.Router();
const shelterController = require('../controllers/shelterController');
const auth = require('../middleware/authMiddleware');

router.get('/shelters', auth, shelterController.getShelters);
router.post('/shelters', auth, shelterController.createShelter);
router.get('/assets', auth, shelterController.getAssets);
router.post('/assets', auth, shelterController.createAsset);
router.put('/assets/:id', auth, shelterController.updateAsset);

module.exports = router;
