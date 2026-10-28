import mongoose from 'mongoose';
import Booking from '../models/booking-model.js';
import Timeslot from '../models/timeslot-model.js';

const bookingController = {};

const TAKEN_MESSAGE = 'Someone else just booked this slot. Pick another one.';

bookingController.createBooking = async (req, res) => {
  try {
    const { timeslotId, service = '' } = req.body;
    if (!mongoose.isValidObjectId(timeslotId)) {
      return res.status(400).send({ message: 'Invalid timeslot id' });
    }

    const timeslot = await Timeslot.findTimeslotById(timeslotId);
    if (!timeslot) {
      return res.status(404).send({ message: 'Timeslot not found' });
    }
    if (timeslot.start <= new Date()) {
      return res.status(400).send({ message: 'This timeslot is in the past' });
    }

    const newBooking = {
      timeslotId: timeslot._id,
      companyId: timeslot.companyId,
      userId: req.session.user._id,
      service
    };

    if (await Booking.findBookingByTimeslotId(timeslot._id)) {
      return res.status(409).send({ message: TAKEN_MESSAGE });
    }
    let booking = await Booking.createBooking(newBooking);

    res.status(201).send(booking);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).send({ message: TAKEN_MESSAGE });
    }
    console.error(error);
    res.status(500).send({ message: 'Failed to create booking' });
  }
};

bookingController.getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.findBookingsByUserId(req.session.user._id);
    res.send(bookings);
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: 'Failed to load bookings' });
  }
};

bookingController.cancelBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    if (!mongoose.isValidObjectId(bookingId)) {
      return res.status(400).send({ message: 'Invalid booking id' });
    }

    const booking = await Booking.findBookingById(bookingId);
    if (!booking) {
      return res.status(404).send({ message: 'Booking not found' });
    }

    const user = req.session.user;
    if (user.role !== 'admin' && String(booking.userId) !== user._id) {
      return res.status(403).send({ message: 'You cannot cancel this booking' });
    }

    await Booking.deleteBookingById(booking._id);
    res.send({ message: 'Booking cancelled' });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: 'Failed to cancel booking' });
  }
};

export default bookingController;
