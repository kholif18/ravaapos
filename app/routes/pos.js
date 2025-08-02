const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    res.render('pos/pos', {
        title: 'Point of Sale',
        activePage: 'pos',
        layout: false
    });
});

module.exports = router;
