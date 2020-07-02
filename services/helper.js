
const axios = require('axios');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');


const Nexmo = require('nexmo');

const nexmo = new Nexmo({
  apiKey: 'db8d13ba',
  apiSecret: 'TUBXgyBq53b80a8H',
});


async function sendMessage(phone, activationCode) {
  try {
    const from = 'jozor alqodrat';
    // const to = '966533952633';
    const text = `Your Verfication Code for jozor alqodrat is : ${activationCode}`;
    nexmo.message.sendSms(from, phone, text, { type: 'unicode' });
  } catch (ex) {
    console.log(ex);
  }
}



function randomString(length, chars) {
  var mask = '';
  if (chars.indexOf('#') > -1) mask += '0123456789';
  var result = '';
  for (var i = length; i > 0; --i) result += mask[Math.floor(Math.random() * mask.length)];
  return result;
}


async function getHashPassword(pass) {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(pass, salt);
}


var storage = multer.diskStorage({
  // destination
  destination: function (req, file, cb) {

    cb(null, './uploads')
  },
  filename: function (req, file, cb) {
    var mask = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    var result = '';
    for (var i = 15; i > 0; --i) result += mask[Math.floor(Math.random() * mask.length)];

    var id = result + Date.now() + path.extname(file.originalname);
    cb(null, id);
  }
});

var upload = multer({ storage: storage });



// module.exports = {
//   sendMessage: sendMessage,
//   randomString: randomString,
//   getHashPassword:getHashPassword,
//   upload:upload
// }

exports.sendMessage = sendMessage;
exports.randomString = randomString;
exports.getHashPassword = getHashPassword;
exports.upload = upload;