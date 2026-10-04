const express = require('express');
const router = express.Router();
const publicController = require('../controllers/publicController');

router.get('/stats', publicController.getPublicStats);
router.get('/hotspots', publicController.getWelfareHotspots);
router.get('/municipal', publicController.getMunicipalOverview);

module.exports = router;
