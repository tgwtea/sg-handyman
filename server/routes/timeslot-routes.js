import express from 'express';
const router = express.Router();

import timeslotController from '../controllers/timeslot-controller.js';
import { requireRole } from '../middleware/auth.js';

// public: each company's earliest free slot
router.get('/next-free', timeslotController.getNextFreeTimeslots);

// the controller also checks that the user manages the timeslot's company
router.post('/', requireRole('business', 'admin'), timeslotController.createTimeslot);
router.put('/:timeslotId', requireRole('business', 'admin'), timeslotController.updateTimeslot);
router.delete('/:timeslotId', requireRole('business', 'admin'), timeslotController.deleteTimeslot);

export default router;
