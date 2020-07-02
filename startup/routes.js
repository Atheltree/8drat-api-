const express = require('express');
const error = require('../middleware/error');
const users = require('../routes/users');
const subjects = require('../routes/subjects')
const models = require('../routes/models')
const packages = require('../routes/packages')
const userPackages = require('../routes/userPackages')
const subscribtions = require('../routes/subscribtions')
const exams = require('../routes/exams')
const sliders = require('../routes/sliders')
const contacts = require('../routes/contacts');
const general = require('../routes/general');
const dashboard = require('../routes/dashboard');

const interaction = require('../routes/interactions');


const cors = require('cors');
const path = require('path');

const bodyParser = require('body-parser');


module.exports = function (app, io) {
  app.use(cors());
  app.set("io", io);
  app.use(function(req,res,next){
    res.header("Access-Control-Allow-Origin","*");
    res.header("Access-Control-Allow-Headers","Origin, X-Requested-With, Content-Type, Accept");
    next();
  });

  app.set("DefaultAvatar", (req, collectionName) => {

    let host = `${req.protocol}://${req.get('host')}/api`,
      defaultPic = '';

    switch (collectionName) {
      case 'host':
        return host;
        break;
      case 'user':
        defaultPic = '/uploads/6r4kR2po1MWWbje1550582821209.png';
        break;
      default:
        defaultPic = '/uploads/6r4kR2po1MWWbje1550582821209.png';
        break;
    }
    return `${host}${defaultPic}`;
  });

  
  app.use(bodyParser.json({ limit: '100mb' }));

  app.use(bodyParser.urlencoded({
    limit: '100mb',
    extended: true
  }));

  app.use('/api/users', users);
  app.use('/api/subjects', subjects);
  app.use('/api/models', models);
  app.use('/api/packages', packages);
  app.use('/api/userPackages', userPackages);
  app.use('/api/subscribtions', subscribtions);
  app.use('/api/exams', exams);
  app.use('/api/sliders', sliders);
  app.use('/api/contacts', contacts);
  app.use('/api/general', general); 
  app.use('/api/dashboard', dashboard);
  app.use('/api/interactions', interaction);

  app.use(error);
} 
