const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jsonWebToken = require('jsonwebtoken');
const User = require('./models/User.js');
const Place = require('./models/Place');
const cookieParser = require('cookie-parser');
require('dotenv').config();
const app = express();
const imageDownloader = require('image-downloader');
const bcryptSalt = bcrypt.genSaltSync(10);
const jsonWebTokenSecret = 'nhatminhdevratlachamchihocreactjs1412';
const multer = require('multer');
const Booking = require('./models/Booking');
const fs = require('fs');
app.use(express.json());
app.use(cookieParser());
app.use(
	cors({
		credentials: true,
		origin: 'http://localhost:5173',
	})
);
app.use('/uploads', express.static(__dirname + '/uploads'));
// 4I6jStKVOC7RCvDz
mongoose.connect(process.env.MONGO_URI);

app.get('/test', (req, res) => {
	res.json('test ok');
});

app.post('/register', async (req, res) => {
	const {name, email, password, retypePassword} = req.body;

	try {
		const userDoc = await User.create({
			name,
			email,
			password: bcrypt.hashSync(password, bcryptSalt),
			retypePassword: bcrypt.hashSync(retypePassword, bcryptSalt),
		});
		res.json(userDoc);
	} catch (error) {
		res.status(422).json(error);
	}
});

app.post('/login', async (req, res) => {
	const {email, password} = req.body;
	const userDoc = await User.findOne({email: email});
	if (userDoc) {
		const isPasswordTrue = bcrypt.compareSync(password, userDoc.password);
		if (isPasswordTrue) {
			jsonWebToken.sign({email: userDoc.email, id: userDoc._id}, jsonWebTokenSecret, {}, (err, token) => {
				if (err) throw err;
				res.cookie('token', token).json(userDoc);
			});
		} else {
			res.status(402).json('password is not true');
		}
	} else {
		res.json('not found');
	}
});

app.get('/profile', (req, res) => {
	const {token} = req.cookies;
	if (token) {
		jsonWebToken.verify(token, jsonWebTokenSecret, {}, async (err, userData) => {
			if (err) throw err;
			const {name, email, _id} = await User.findById(userData.id);
			res.json({name, email, _id});
		});
	} else {
		res.json(null);
	}
});

app.post('/logout', (req, res) => {
	res.cookie('token', '').json(true);
});
app.post('/upload-by-link', async (req, res) => {
	const {link} = req.body;
	const newName = 'photo' + Date.now() + '.jpg';

	await imageDownloader.image({
		url: link,
		dest: __dirname + '/uploads/' + newName,
	});
	res.json(newName);
});

let uploadMiddleware = multer({dest: 'uploads/'});
app.post('/upload-local', uploadMiddleware.array('file', 100), (req, res) => {
	const uploadedFiles = [];
	for (let i = 0; i < req.files.length; i++) {
		const {path, originalname} = req.files[i];
		let ext = originalname.split('.');
		ext = ext[ext.length - 1];
		const newPath = path + '.' + ext;
		fs.renameSync(path, newPath, err => {});
		uploadedFiles.push(newPath.replace('uploads/', ''));
	}

	res.json(uploadedFiles);
});

app.post('/places', (req, res) => {
	const {title, address, addedPhotos, description, perks, extraInfor, checkIn, checkOut, maxGuests, price} = req.body;
	console.log(req.body);
	const {token} = req.cookies;
	jsonWebToken.verify(token, jsonWebTokenSecret, {}, async (err, userData) => {
		if (err) throw err;
		const placeDoc = await Place.create({
			owner: userData.id,
			title: title,
			address: address,
			photos: addedPhotos,
			description: description,
			perks: perks,
			extraInfor: extraInfor,
			checkIn: checkIn,
			checkOut: checkOut,
			maxGuests: maxGuests,
			price: price,
		});
		res.json(placeDoc);
	});
});

app.get('/user-places', (req, res) => {
	const {token} = req.cookies;
	jsonWebToken.verify(token, jsonWebTokenSecret, {}, async (err, userData) => {
		if (err) throw err;
		const placeDoc = await Place.find({owner: userData.id});
		res.json(placeDoc);
	});
});

app.put('/places/:id', (req, res) => {
	const {id} = req.params;
	const {title, address, addedPhotos, description, perks, extraInfor, checkIn, checkOut, maxGuests, price} = req.body;
	const {token} = req.cookies;
	jsonWebToken.verify(token, jsonWebTokenSecret, {}, async (err, userData) => {
		if (err) throw err;
		const placeDoc = await Place.findOneAndUpdate(
			{_id: id, owner: userData.id},
			{
				title: title,
				address: address,
				photos: addedPhotos,
				description: description,
				perks: perks,
				extraInfor: extraInfor,
				checkIn: checkIn,
				checkOut: checkOut,
				maxGuests: maxGuests,
				price: price,
			}
		);
		res.json(placeDoc);
	});
});

app.get('/places', async (req, res) => {
	res.json(await Place.find({}));
});

app.get('/place/:id', async (req, res) => {
	const {id} = req.params;
	const placeDoc = res.json(await Place.findById(id));
});

app.delete('/places/:id', async (req, res) => {
	const {id} = req.params;
	const {token} = req.cookies;
	jsonWebToken.verify(token, jsonWebTokenSecret, {}, async (err, userData) => {
		if (err) throw err;
		const placeDoc = await Place.findByIdAndDelete({_id: id, owner: userData.id});
		res.json(placeDoc);
	});
});

app.post('/bookings', async (req, res) => {
	const userData = await getUserDataFromToken(req.cookies.token);
	const {place, checkIn, checkOut, numberOfGuests, name, phoneNumber, price} = req.body;
	Booking.create({place, checkIn, checkOut, numberOfGuests, name, phoneNumber, user: userData.id, price})
		.then(doc => {
			res.json(doc);
		})
		.catch(err => {
			res.status(422).json(err);
		});
});

function getUserDataFromToken(token) {
	return new Promise((resolve, reject) => {
		jsonWebToken.verify(token, jsonWebTokenSecret, {}, async (err, userData) => {
			if (err) reject(err);
			resolve(userData);
		});
	});
}
app.get('/bookings', async (req, res) => {
	const {token} = req.cookies;
	const userData = await getUserDataFromToken(token);
	const bookings = await Booking.find({user: userData.id}).populate('place');
	res.json(bookings);
});
app.listen(4000);
