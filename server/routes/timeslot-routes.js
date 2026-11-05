import express from 'express';
const router = express.Router();

import timeslotController from '../controllers/timeslot-controller.js';
import { requireRole } from '../middleware/auth.js';

// public: each company's earliest free slot
router.get('/next-free', timeslotController.getNextFreeTimeslots);
// public: the same, nearest company first; POST keeps the location out of the URL
router.post('/next-free/near', timeslotController.getNearbyFreeTimeslots);

// the controller also checks that the user manages the timeslot's company
router.post('/', requireRole('business', 'admin'), timeslotController.createTimeslot);
router.put('/:timeslotId', requireRole('business', 'admin'), timeslotController.updateTimeslot);
router.delete('/:timeslotId', requireRole('business', 'admin'), timeslotController.deleteTimeslot);
router.delete('/:timeslotId/booking', requireRole('business', 'admin'), timeslotController.cancelTimeslotBooking);

export default router;
