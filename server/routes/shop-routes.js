import express from 'express';
import shopController from '../controllers/shop-controller.js';
import management from '../controllers/shop-management-controller.js';
import productReviewController from '../controllers/product-review-controller.js';
import { requireLogin, requireRole} from '../middleware/auth.js';

const router = express.Router();

// GET /shop/products calls our getProducts function.
router.get('/products', shopController.getProducts);


// Managing orders / deliveries and managing review for admin
router.get('/manage/orders', requireRole('business','admin'), management.getOrders);
router.put('/manage/orders/:id/delay', requireRole('business'), management.delayPackage);
router.put('/manage/orders/:id/items/:productId/reject', requireRole('business'), management.rejectItem);
router.put('/manage/orders/:id/reject', requireRole('admin'), management.rejectOrder);
router.get('/manage/reviews', requireRole('admin'), productReviewController.getAdminReviews);
router.put('/manage/reviews/:reviewId', requireRole('admin'), productReviewController.editAdminReview);


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
