import express from 'express';
var router = express.Router();
import { authenticate } from '../../middlewares/middleware.js';

router.get('/', authenticate, (req, res, next) => {
    res.render('machine');
});

router.get('/ws2', authenticate, (req, res, next) => {
    res.render('machine/workshop2.hbs');
});

export default router;