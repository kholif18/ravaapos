const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

router.get('/', isAuthenticated, isAdmin, reportController.index);
router.get('/sales', isAuthenticated, isAdmin, reportController.salesReport);

module.exports = router;
