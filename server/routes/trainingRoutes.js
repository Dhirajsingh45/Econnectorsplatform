const express = require('express');
const router = express.Router();
const trainingController = require('../controllers/trainingController');
const auth = require('../middleware/authMiddleware');

// Public curriculum overview & public verification
router.get('/modules', (req, res, next) => {
  // Optional auth to attach progress if token present
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    return auth(req, res, next);
  }
  next();
}, trainingController.getModules);

router.get('/modules/:id', (req, res, next) => {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    return auth(req, res, next);
  }
  next();
}, trainingController.getModuleDetail);

router.get('/certificates/verify/:certId', trainingController.verifyCertificate);

// Authenticated user learning progression
router.post('/modules/:id/progress', auth, trainingController.completeLesson);
router.post('/modules/:id/submit-quiz', auth, trainingController.submitQuiz);
router.get('/certificates', auth, trainingController.getMyCertificates);

module.exports = router;
