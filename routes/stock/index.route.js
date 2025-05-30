import express from 'express';
import { authenticate } from '../../middlewares/middleware.js';
import { getListProduct } from '../../models/product.model.js';

let router = express.Router();

router.get('/', authenticate, (req, res) => {
    return res.render('stock');
});

router.get('/api/products', authenticate, async (req, res) => {
    const products = await getListProduct();
    return res.json({products});
});

export default router;