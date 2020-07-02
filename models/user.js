const config = require('config');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({


  address: {
    type: String,
  },
  school:{
    type: String,
   },

  name: {
    type: String,
   }, 
  phone: {
    type: String,
    required: true,
    unique: true
  },

  gender: {
    type: Boolean,

  },
  email: {
    type: String,
    required: true,
    minlength: 5,
    maxlength: 255,
    unique: true
  },

  latestActivationCode: String,

  isActivated: {
    type: Boolean,
    default: false
  },

  isNeglected: {
    type: Boolean,
    default: false
  },

  isLoggedIn: {
    type: Boolean,
    default: false
  },

  avatar: String,

  password: {
    type: String,
    minlength: 5,
    maxlength: 1024
  },

  connectionId: {
    type: String,
    default: null
  },

  deviceId: [{
    type: String
  }],

  isAdmin: {
    type: Boolean,
    default: false
  },
  fbAccount: String,

  instgram: String,

  twitterAccount: String,

  email: String,

  birthDate: String,  
  
});


userSchema.methods.generateAuthToken = function () {
  const token = jwt.sign({ _id: this._id, isAdmin: this.isAdmin }, config.get('jwtPrivateKey'));
  return token;
}
const User = mongoose.model('User', userSchema);


function validateActivate(user) {

  const schema = {
  phone:Joi.string().length(13).required(),
  code:Joi.string().length(4).required()
  };

  return Joi.validate(user, schema);
}


function validateRegister(user) {
  const schema = {
    name: Joi.string().required(),  
    password:Joi.string().required(),
    phone:Joi.string().length(13).required(),
    email:Joi.string().required(),
    school:Joi.string().max(50).required(),
    packageIds:Joi.array().optional()
  };



  return Joi.validate(user, schema);
}

function validateLogIn(user){
  const schema = {     
    password:Joi.string().required(),
    phone:Joi.string().length(13).required(),
  };



  return Joi.validate(user, schema);

}

function validateForget(user){
  const schema = {     
    phone:Joi.string().length(13).required(),
  };

  return Joi.validate(user, schema);
}


function validatePass(user){
  const schema = {     
    phone:Joi.string().length(13).required(),
    password:Joi.string().required(),
    newPassword:Joi.string().required()    
  };

  return Joi.validate(user, schema);
}

 
function validateFollow(user){
  const schema = {     
    senderId:Joi.string().length(24).required(),
    receiverId:Joi.string().length(24).required()   
  };

  return Joi.validate(user, schema);
}
exports.User = User;
exports.validateRegister = validateRegister;
exports.validateActivate = validateActivate;
exports.validateLogIn = validateLogIn;
exports.validateForget = validateForget;
exports.validatePass = validatePass;
exports.validateFollow = validateFollow;

