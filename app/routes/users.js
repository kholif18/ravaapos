const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

router.get('/', isAuthenticated, isAdmin, userController.getAll);
router.get('/partial', isAuthenticated, isAdmin, userController.getPartial);
router.post('/', isAuthenticated, isAdmin, userController.create);
router.post('/:id/update', isAuthenticated, isAdmin, userController.update);
router.post('/:id/delete', isAuthenticated, isAdmin, userController.delete);

module.exports = router;
