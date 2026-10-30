import express from 'express';
const router = express.Router();

import reviewController from '../controllers/review-controller.js';
import { requireLogin, requireRole } from '../middleware/auth.js';

router.get('/company/:companyId', reviewController.getCompanyReviews);
router.post('/company/:companyId', requireRole('customer'), reviewController.createReview);
router.put('/:reviewId', requireRole('customer'), reviewController.updateReview);
router.delete('/:reviewId', requireLogin, reviewController.deleteReview);

export default router;
