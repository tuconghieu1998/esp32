var express = require('express');
var router = express.Router();

// trang chu
router.get('/', (req, res, next) => {
    var now = new Date();

    res.locals.isHomepage = true;

    res.locals.pageTitle = 'Trang chủ';

    res.render('dashboard');
})

module.exports = router;