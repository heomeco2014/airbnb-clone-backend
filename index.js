const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jsonWebToken = require('jsonwebtoken');
const User = require('./models/User.js');
const cookieParser = require('cookie-parser');
require('dotenv').config();
const app = express();
const imageDownloader = require('image-downloader');
const bcryptSalt = bcrypt.genSaltSync(10);
const jsonWebTokenSecret = 'nhatminhdevratlachamchihocreactjs1412';
const multer = require('multer');

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

// const storage = multer.diskStorage({
// 	destination: (req, file, callBack) => {
// 		callBack(null, 'upload-local');
// 	},
// 	filename: (req, file, callBack) => {
// 		callBack(null, file.originalname + '-' + Date.now());
// 	},
// });
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
app.listen(4000);
