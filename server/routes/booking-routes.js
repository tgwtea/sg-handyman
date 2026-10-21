import express from 'express';
const router = express.Router();

import bookingController from '../controllers/booking-controller.js';
import { requireLogin, requireRole } from '../middleware/auth.js';

router.post('/', requireRole('customer'), bookingController.createBooking);
router.get('/me', requireLogin, bookingController.getMyBookings);
router.delete('/:bookingId', requireLogin, bookingController.cancelBooking);

export default router;
