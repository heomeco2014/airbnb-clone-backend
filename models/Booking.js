const mongoose = require('mongoose');
const {Schema} = mongoose;

const bookingSchema = new Schema({
	place: {type: mongoose.Types.ObjectId, require: true, ref: 'Place'},
	user: {type: mongoose.Types.ObjectId, require: true},
	checkIn: {type: Date, require: true},
	checkOut: {type: Date, require: true},
	name: {type: String, require: true},
	phoneNumber: {type: String, require: true},
	price: Number,
});

const BookingModel = mongoose.model('Booking', bookingSchema);

module.exports = BookingModel;
