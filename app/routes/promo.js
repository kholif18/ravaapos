// routes/promo.js
const router = require('express').Router();
const multer = require('multer');
const upload = multer();
const promoController = require('../controllers/promoController');

router.get('/', promoController.index);
router.post('/create', promoController.create);
router.post('/update/:id', promoController.update);
router.post('/delete/:id', promoController.destroy);
router.put('/:id/status', promoController.toggleStatus);
router.get('/export', promoController.export);
router.get('/template', promoController.downloadTemplate);
router.post('/import', promoController.import);

module.exports = router;