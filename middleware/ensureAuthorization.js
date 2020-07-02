const jwt = require('jsonwebtoken');
const config = require('config');
const { User } = require("../models/user")

module.exports = async function (req, res, next) {
  const token = req.header('Authorization');
  if (!token) return res.status(401).send('لا يمكنك الوصول. الرقم السرى غير موجود.');
  try {
    const decoded = jwt.verify(token, config.get('jwtPrivateKey'));
    req.user = decoded;
    console.log(decoded._id);
    let thisUser = await User.findById(decoded._id, function (err, doc) {
      if (err)
        console.log(err);
    });
    console.log(thisUser);

    if (thisUser.isNeglected) return res.status(401).send('الحساب غير مفعل');

    // if (thisUser.isNeglected || !thisUser.isActivated) {
    //   thisUser.isLoggedIn = false;
    //   await thisUser.save()

    //   return res.status(401).send('الحساب غير مفعل');
    // }
    next();
  }
  catch (ex) {
    res.status(400).send('رقم سري غير صحيح.');
  }
}