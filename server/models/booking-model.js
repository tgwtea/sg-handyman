import mongoose from 'mongoose';

const bookingModel = {};

const bookingSchema = new mongoose.Schema({
  timeslotId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Timeslot',
    required: true
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  service: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// one booking per timeslot: MongoDB rejects a second insert with error code 11000
bookingSchema.index({ timeslotId: 1 }, { unique: true });
bookingSchema.index({ userId: 1 });

const Booking = mongoose.model('Booking', bookingSchema, 'bookings');

bookingModel.Booking = Booking;

bookingModel.createBooking = function(booking) {
  return Booking.create(booking);
};

bookingModel.insertManyBookings = function(bookings) {
  return Booking.insertMany(bookings);
};

bookingModel.findBookingById = function(bookingId) {
  return Booking.findById(bookingId);
};

bookingModel.findBookingByTimeslotId = function(timeslotId) {
  return Booking.findOne({ timeslotId });
};

bookingModel.findBookingsByUserId = function(userId) {
  return Booking.find({ userId })
    .populate('timeslotId', 'start end')
    .populate('companyId', 'name address')
    .sort({ createdAt: -1 });
};

bookingModel.deleteBookingById = function(bookingId) {
  return Booking.findByIdAndDelete(bookingId);
};

bookingModel.deleteAllBookings = function() {
  return Booking.deleteMany({});
};

// every booking at the company, with the start of its timeslot
bookingModel.findBookingsByCompanyId = function(companyId) {
  return Booking.find({ companyId }, 'userId service timeslotId')
    .populate('timeslotId', 'start');
};

export default bookingModel;
