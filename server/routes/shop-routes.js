import express from 'express';
import shopController from '../controllers/shop-controller.js';
import { requireLogin, requireRole} from '../middleware/auth.js';

const router = express.Router();

// GET /shop/products calls our getProducts function.
router.get('/products', shopController.getProducts);

// POST createorder
router.post('/orders', requireLogin, shopController.createOrder);
//check role first
router.post('/products', requireRole('business'), shopController.createProduct);
//：id identifies the existing product, using the product id path as guide
router.put('/products/:id', requireRole('business'), shopController.updateProduct);
router.delete('/products/:id', requireRole('business'), shopController.removeProduct);

// personal order.
router.get('/orders', requireLogin, shopController.getMyOrders);

// Account carts use the same login session as orders.
router.get('/cart', requireLogin, shopController.getCart);
router.put('/cart', requireLogin, shopController.saveCart);

export default router;
