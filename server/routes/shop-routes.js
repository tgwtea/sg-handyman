import express from 'express';
import shopController from '../controllers/shop-controller.js';
import productReviewController from '../controllers/product-review-controller.js';
import { requireLogin, requireRole} from '../middleware/auth.js';

const router = express.Router();

// GET /shop/products calls our getProducts function.
router.get('/products', shopController.getProducts);

// POST createorder
router.post('/orders', requireLogin, shopController.createOrder);
//check role first
router.post('/products', requireRole('business','admin'), shopController.createProduct);
//：id identifies the existing product, using the product id path as guide
router.put('/products/:id', requireRole('business','admin'), shopController.updateProduct);
router.delete('/products/:id', requireRole('business','admin'), shopController.removeProduct);

// personal order.
router.get('/orders', requireLogin, shopController.getMyOrders);

// Account carts use the same login session as orders.
router.get('/cart', requireLogin, shopController.getCart);
router.put('/cart', requireLogin, shopController.saveCart);

//for product review
router.get('/reviews/summary', productReviewController.getSummaries);
router.get('/products/:id/reviews', productReviewController.getReviews);
router.post('/products/:id/reviews', requireLogin, productReviewController.createReview);
router.put('/products/:id/reviews', requireLogin, productReviewController.updateReview);
router.delete('/products/:id/reviews', requireLogin, productReviewController.deleteReview);

export default router;
