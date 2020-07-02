
const express = require('express');
const app = express();
const path = require('path');
const http = require("http").Server(app)
const io = require("socket.io")(http)
var CronJob = require('cron').CronJob;
const { areEnded, areSectionEnded } = require('./models/exam');
const { updateConnectionId } = require('./routes/users');

const jsreport = require('jsreport');

global.root = __dirname;

require('./startup/logging')();
require('./startup/routes')(app, io);
require('./startup/db')();
require('./startup/config')();
require('./startup/prod')(app);

app.use('/api', express.static(__dirname + '/apidoc'));

app.use('/uploads', express.static('uploads'));

app.use('/', express.static('site'));

app.use('/admin', express.static('admin'));
 
const port = process.env.PORT || 8000;

const client = jsreport();

client.init().then(() => {
  console.log("Js Report initializing server success .... ");
  global.jsreport = client;
});

http.listen(port, () => console.log(`Listening on port ${port}...`));


io.on("connection", async (socket) => {
  console.log('A client just joined on NoW', socket.id);
  console.log(socket.handshake.query['_id']);

  await updateConnectionId(socket.handshake.query['_id'], socket.id)

  socket.on('disconnect', async () => {
    console.log('Disconnnnnnnnnnectiong')
    await updateConnectionId(socket.handshake.query['_id'], null)
  })
})


//cron update every 
const schedul = new CronJob('*/30 * * * * *', function () {
  areEnded();
  areSectionEnded();
  //console.log('allah')
});
schedul.start();