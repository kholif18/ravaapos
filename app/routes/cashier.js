const express = require('express');
const router = express.Router();
const cashierSessionController = require('../controllers/cashierSessionController');
const { isAuthenticated } = require('../middleware/auth');

router.get('/sessions', isAuthenticated, cashierSessionController.index);
router.get('/open', isAuthenticated, cashierSessionController.openSession);
router.post('/open', isAuthenticated, cashierSessionController.startSession);
router.get('/close', isAuthenticated, cashierSessionController.closeSession);
router.post('/close', isAuthenticated, cashierSessionController.endSession);
router.get('/sessions/:id', isAuthenticated, cashierSessionController.getSessionDetail);

module.exports = router;
