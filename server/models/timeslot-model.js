import mongoose from 'mongoose';

const timeslotModel = {};

const timeslotSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  start: {
    type: Date,
    required: true
  },
  end: {
    type: Date,
    required: true
  }
});

timeslotSchema.index({ companyId: 1, start: 1 }, { unique: true });

const Timeslot = mongoose.model('Timeslot', timeslotSchema, 'timeslots');

timeslotModel.Timeslot = Timeslot;

// timeslots of one company in [from, to), each with its booking (or null)
timeslotModel.findTimeslotsWithBookings = function(companyId, from, to) {
  return Timeslot.aggregate([
    { $match: { companyId, start: { $gte: from, $lt: to } } },
    { $sort: { start: 1 } },
    {
      $lookup: {
        from: 'bookings',
        localField: '_id',
        foreignField: 'timeslotId',
        as: 'booking'
      }
    },
    { $set: { booking: { $arrayElemAt: ['$booking', 0] } } }
  ]);
};

// the earliest free (unbooked) timeslot after `now`, one per company
timeslotModel.findNextFreeTimeslots = function(now) {
  return Timeslot.aggregate([
    { $match: { start: { $gt: now } } },
    { $sort: { start: 1 } },
    {
      $lookup: {
        from: 'bookings',
        localField: '_id',
        foreignField: 'timeslotId',
        as: 'booking'
      }
    },
    { $match: { booking: { $size: 0 } } },
    { $group: { _id: '$companyId', start: { $first: '$start' } } },
    { $project: { _id: 0, companyId: '$_id', start: 1 } }
  ]);
};

timeslotModel.findTimeslotById = function(timeslotId) {
  return Timeslot.findById(timeslotId);
};

// any slot of the company that overlaps [start, end), other than excludeId
timeslotModel.findOverlappingTimeslot = function(companyId, start, end, excludeId) {
  const filter = { companyId, start: { $lt: end }, end: { $gt: start } };
  if (excludeId) {
    filter._id = { $ne: excludeId };
  }
  return Timeslot.findOne(filter);
};

timeslotModel.createTimeslot = function(timeslot) {
  return Timeslot.create(timeslot);
};

timeslotModel.insertManyTimeslots = function(timeslots) {
  return Timeslot.insertMany(timeslots);
};

timeslotModel.updateTimeslot = function(timeslotId, start, end) {
  return Timeslot.findByIdAndUpdate(timeslotId, { start, end }, { returnDocument: 'after', runValidators: true });
};

timeslotModel.deleteTimeslotById = function(timeslotId) {
  return Timeslot.findByIdAndDelete(timeslotId);
};

timeslotModel.deleteAllTimeslots = function() {
  return Timeslot.deleteMany({});
};

export default timeslotModel;
