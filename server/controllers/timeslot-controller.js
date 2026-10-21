import mongoose from 'mongoose';
import Timeslot from '../models/timeslot-model.js';
import Booking from '../models/booking-model.js';
import { canManageCompany } from '../middleware/auth.js';

const timeslotController = {};

const DEFAULT_RANGE_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

function parseDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

// returns an error message, or null when start and end are valid
function validateRange(start, end) {
  if (!start || !end) {
    return 'start and end must be valid dates';
  }
  if (start >= end) {
    return 'start must be before end';
  }
  if (start <= new Date()) {
    return 'start must be in the future';
  }
  return null;
}

timeslotController.getCompanyTimeslots = async (req, res) => {
  try {
    const { companyId } = req.params;
    if (!mongoose.isValidObjectId(companyId)) {
      return res.status(400).send({ message: 'Invalid company id' });
    }

    const from = parseDate(req.query.from ?? Date.now()) ?? new Date();
    const to = parseDate(req.query.to ?? from.getTime() + DEFAULT_RANGE_DAYS * DAY_MS);
    const userId = req.session.user?._id;

    const timeslots = await Timeslot.findTimeslotsWithBookings(
      new mongoose.Types.ObjectId(companyId), from, to
    );

    // send only what the page needs: never other customers' ids
    res.send(timeslots.map((slot) => {
      const mine = !!slot.booking && String(slot.booking.userId) === userId;
      return {
        _id: slot._id,
        companyId: slot.companyId,
        start: slot.start,
        end: slot.end,
        taken: !!slot.booking,
        mine,
        bookingId: mine ? slot.booking._id : null,
        service: mine ? slot.booking.service : null
      };
    }));
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: 'Failed to load timeslots' });
  }
};

timeslotController.createTimeslot = async (req, res) => {
  try {
    const { companyId } = req.body;
    if (!mongoose.isValidObjectId(companyId)) {
      return res.status(400).send({ message: 'Invalid company id' });
    }
    if (!canManageCompany(req.session.user, companyId)) {
      return res.status(403).send({ message: 'You cannot manage timeslots for this company' });
    }

    const start = parseDate(req.body.start);
    const end = parseDate(req.body.end);
    const rangeError = validateRange(start, end);
    if (rangeError) {
      return res.status(400).send({ message: rangeError });
    }

    const overlap = await Timeslot.findOverlappingTimeslot(companyId, start, end);
    if (overlap) {
      return res.status(409).send({ message: 'This timeslot overlaps an existing timeslot' });
    }

    const timeslot = await Timeslot.createTimeslot({ companyId, start, end });
    res.status(201).send(timeslot);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).send({ message: 'A timeslot already starts at this time' });
    }
    console.error(error);
    res.status(500).send({ message: 'Failed to create timeslot' });
  }
};

timeslotController.updateTimeslot = async (req, res) => {
  try {
    const { timeslotId } = req.params;
    if (!mongoose.isValidObjectId(timeslotId)) {
      return res.status(400).send({ message: 'Invalid timeslot id' });
    }

    const timeslot = await Timeslot.findTimeslotById(timeslotId);
    if (!timeslot) {
      return res.status(404).send({ message: 'Timeslot not found' });
    }
    if (!canManageCompany(req.session.user, timeslot.companyId)) {
      return res.status(403).send({ message: 'You cannot manage timeslots for this company' });
    }
    if (await Booking.findBookingByTimeslotId(timeslot._id)) {
      return res.status(409).send({ message: 'This timeslot is booked. Cancel the booking first.' });
    }

    const start = parseDate(req.body.start);
    const end = parseDate(req.body.end);
    const rangeError = validateRange(start, end);
    if (rangeError) {
      return res.status(400).send({ message: rangeError });
    }

    const overlap = await Timeslot.findOverlappingTimeslot(timeslot.companyId, start, end, timeslot._id);
    if (overlap) {
      return res.status(409).send({ message: 'This timeslot overlaps an existing timeslot' });
    }

    const updated = await Timeslot.updateTimeslot(timeslot._id, start, end);
    res.send(updated);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).send({ message: 'A timeslot already starts at this time' });
    }
    console.error(error);
    res.status(500).send({ message: 'Failed to update timeslot' });
  }
};

timeslotController.deleteTimeslot = async (req, res) => {
  try {
    const { timeslotId } = req.params;
    if (!mongoose.isValidObjectId(timeslotId)) {
      return res.status(400).send({ message: 'Invalid timeslot id' });
    }

    const timeslot = await Timeslot.findTimeslotById(timeslotId);
    if (!timeslot) {
      return res.status(404).send({ message: 'Timeslot not found' });
    }
    if (!canManageCompany(req.session.user, timeslot.companyId)) {
      return res.status(403).send({ message: 'You cannot manage timeslots for this company' });
    }
    if (await Booking.findBookingByTimeslotId(timeslot._id)) {
      return res.status(409).send({ message: 'This timeslot is booked. Cancel the booking first.' });
    }

    await Timeslot.deleteTimeslotById(timeslot._id);
    res.send({ message: 'Timeslot deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: 'Failed to delete timeslot' });
  }
};

export default timeslotController;
