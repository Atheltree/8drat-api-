const ensureAuthorization = require("../middleware/ensureAuthorization");
const role = require("../middleware/role");
const bcrypt = require("bcrypt");
const _ = require("lodash");
const {
  User,
  validateRegister,
  validateActivate,
  validateLogIn,
  validateForget,
  validatePass
} = require("../models/user");
const { Package } = require("../models/package");
const { Subscribtion } = require("../models/subscribtion");
const express = require("express");
const router = express.Router();
const {
  upload,
  sendMessage,
  randomString,
  getHashPassword
} = require("../services/helper");
const os = require("os");
const mongoose = require("mongoose");

router.get("/", ensureAuthorization, async (req, res) => {
  const users = await User.find({ isAdmin: false }).select(" -__v -password ");

  res.send(users);
});

router.post(
  "/UpdateUser",
  [ensureAuthorization, upload.single("file")],
  async (req, res) => {
    if (req.file) {
      filePath = "/uploads/" + req.file.filename;
      req.body.avatar = filePath;
    }
    let userId = req.user._id,
      newUserData = req.body;

    let upd = await User.findByIdAndUpdate(
      userId,
      { $set: newUserData },
      { new: true }
    );
    res.send(upd);
  }
);

router.get("/getUser", ensureAuthorization, async (req, res) => {
  const host = `https://${req.get("host")}/api`,
    defaultPic = "/uploads/6r4kR2po1MWWbje1550582821209.png";

  const user = await User.aggregate([
    {
      $match: { _id: mongoose.Types.ObjectId(req.user._id) }
    },
    {
      $project: {
        _id: 1,
        email: 1,
        phone: 1,
        likes: 1,
        school: 1,
        name: 1,
        avatar: {
          $ifNull: [{ $concat: [host, "$avatar"] }, `${host}${defaultPic}`]
        }
      }
    }
  ]);
  // { $project: { newfield: { $concat: [ "$field1", " - ", "$field2" ] } } }

  res.send(user ? user[0] : {});
});

router.post("/getSingleUser", ensureAuthorization, async (req, res) => {
  const user = await User.findById(req.body._id).select(
    " -__v -password -latestActivationCode"
  );

  res.send(user);
});

router.post("/activate", async (req, res) => {
  const { error } = validateActivate(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  let user = await User.findOne({ phone: req.body.phone });
  if (!user) return res.status(400).send("رقم جوال غير صحيح.");

  if (user.latestActivationCode === req.body.code) {
    user.isActivated = true;

    await user.save();

    const token = user.generateAuthToken();

    res.send({
      ..._.omit(user.toObject(), [
        "password",
        "latestActivationCode",
        "connectionId",
        "deviceId",
        "isAdmin",
        "__v"
      ]),
      ...{ token: token }
    });
  } else {
    res.status(400).send("Activation Code is wrong");
  }
});

router.post("/logout", ensureAuthorization, async (req, res) => {
  const id = req.user._id;

  let user = await User.findOne({ _id: id });

  user.isLoggedIn = false;

  let us = await user.save();
  res.send(us);
});

router.post("/register", async (req, res) => {
  const { error } = validateRegister(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  let user = await User.findOne({ phone: req.body.phone });
  if (user) return res.status(400).send("هذا المستخدم موجود بالفعل ");

  let activationCode = randomString(4, "#");

  user = new User(
    _.pick(req.body, ["phone", "email", "name", "password", "school"])
  );

  user.password = await getHashPassword(req.body.password);

  let code = await sendMessage(user.phone, activationCode);

  user.latestActivationCode = activationCode;

  user.isLoggedIn = true;

  await user.save();

  //-----------------------
  let testPackages = await Package.find({ fees: 0 }, { _id: 1 }),
    subscribtions = [];

  testPackages = testPackages.map(pId => pId._id);

  testPackages.forEach(pId => {
    subscribtions.push({
      state: 1,
      packageId: pId.toString(),
      userId: user._id
    });
  });

  if (subscribtions.length != 0) await Subscribtion.insertMany(subscribtions);
  //------------------------

  res.send(
    _.omit(user.toObject(), [
      "password",
      "connectionId",
      "deviceId",
      "isAdmin",
      "__v"
    ])
  );
});

router.post("/addUserByAdmin", ensureAuthorization, async (req, res) => {
  const { error } = validateRegister(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  if (!req.user.isAdmin) return res.send("لا تمتلك صلاحية الدخول !");

  let user = await User.findOne({ phone: req.body.phone });
  if (user) return res.status(400).send("هذا المستخدم موجود بالفعل.");

  let activationCode = randomString(4, "#");

  req.body.isActivated = true;

  user = new User(
    _.pick(req.body, [
      "phone",
      "email",
      "name",
      "password",
      "school",
      "isActivated"
    ])
  );

  user.password = await getHashPassword(req.body.password);

  // let code = await sendMessage(user.phone, activationCode);

  // if (code == 100) {

  user.latestActivationCode = activationCode;

  await user.save();
  let subscribtions = [];
  let testPackages = await Package.find({ fees: 0 }, { _id: 1 });

  testPackages.forEach(elm => {
    subscribtions.push({
      state: 1,
      packageId: elm._id.toString(),
      userId: user._id
    });
  });

  if (req.body.packageIds)
    req.body.packageIds.forEach(packageId => {
      if (testPackages.indexOf(packageId) == -1) {
        subscribtions.push({
          state: 1,
          packageId: packageId,
          userId: user._id
        });
      }
    });

  await Subscribtion.insertMany(subscribtions);

  console.log(user);

  res.send(
    _.omit(user.toObject(), [
      "password",
      "latestActivationCode",
      "connectionId",
      "deviceId",
      "isAdmin",
      "__v"
    ])
  );

  // } else {
  //   res.status(400).send('Invalid Phone Number');
  // }
});

router.post("/login", async (req, res) => {
  const { error } = validateLogIn(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  let user = await User.findOne({ phone: req.body.phone });
  if (!user) return res.status(400).send("تأكد من رقم الجوال أو كلمة المرور.");

  if (user.isLoggedIn && !user.isAdmin)
    return res
      .status(400)
      .send("أنت مسجل بالفعل علي جهاز آخر الرجاء تسجيل الخروج أولا  ..");

  const validPassword = await bcrypt.compare(req.body.password, user.password);
  if (!validPassword) return res.status(400).send("كلمة سر غير صحيحة.");

  const token = user.generateAuthToken();

  if ((user.isNeglected || !user.isActivated) && !user.isAdmin) return res.status(401)
    .send("عذرا أنت عضو غير مفعل");

  if (!user.isAdmin && !user.isNeglected && user.isActivated) user.isLoggedIn = true;
  await user.save();

  res.send({
    ..._.omit(user.toObject(), [
      "password",
      "latestActivationCode",
      "connectionId",
      "deviceId",
      // "isAdmin",
      "__v"
    ]),
    ...{ token: token }
  });
});

router.post("/forget", async (req, res) => {
  const { error } = validateForget(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  let user = await User.findOne({ phone: req.body.phone });
  if (!user) return res.status(400).send("رقم جوال غير صحيح.");

  let activationCode = randomString(4, "#");
  user.latestActivationCode = activationCode;

  sendMessage(req.body.phone, activationCode);
  await user.save();
  res.send(
    _.omit(user.toObject(), [
      "password",
      "latestActivationCode",
      "connectionId",
      "deviceId",
      "isAdmin",
      "__v"
    ])
  );
});

router.post("/upload", upload.single("file"), async function (req, res) {
  res.header(
    "filePath",
    req.protocol + "://" + req.get("host") + "/" + req.file.filename
  );

  const imageData =
    req.protocol + "://" + req.get("host") + "/uploads/" + req.file.filename;

  res.send(imageData);
});

router.post("/changepasswordPhone", ensureAuthorization, async (req, res) => {
  lang(req.header("Accept-Language"));
  const { error } = validatePass(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  let user = await User.findOne({ phone: req.body.phone });
  if (!user) return res.status(400).send(t("Invalid Phone or password."));

  const validPassword = await bcrypt.compare(req.body.password, user.password);
  if (!validPassword) return res.status(400).send(t("Invalid password."));

  user.password = await getHashPassword(req.body.newPassword);
  await user.save();

  res.send(
    _.pick(user, [
      "_id",
      "phone",
      "isActivated",
      "selectedType",
      "teacher",
      "student",
      "address",
      "name",
      "school",
      "gender",
      "location",
      "avatar",
      "deviceId"
    ])
  );
});

router.post("/changePassword", ensureAuthorization, async (req, res) => {
  const { error } = validatePass(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  let user = await User.findOne({ phone: req.body.phone });
  if (!user) return res.status(400).send("تأكد من رقم الجوال أو كلمة المرور.");

  const validPassword = await bcrypt.compare(req.body.password, user.password);
  if (!validPassword) return res.status(400).send("كلمة سر غير صحيحة.");

  user.password = await getHashPassword(req.body.newPassword);
  await user.save();

  res.status(200).send("تم.");
});

router.post("/resetPassword", async (req, res) => {
  const { error } = validateLogIn(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  let user = await User.findOne({ phone: req.body.phone });
  if (!user) return res.status(400).send("تأكد من رقم الجوال أو كلمة المرور.");

  user.password = await getHashPassword(req.body.password);
  await user.save();

  const token = user.generateAuthToken();

  res.send({
    ..._.omit(user.toObject(), [
      "password",
      "latestActivationCode",
      "connectionId",
      "deviceId",
      "isAdmin",
      "__v"
    ]),

    ...{ token: token }
  });
});

router.post("/delete", ensureAuthorization, async (req, res) => {
  var us = await User.findOne({ _id: req.body._id });
  await User.findByIdAndUpdate(
    { _id: req.body._id },
    { $set: { isNeglected: !us.isNeglected, isLoggedIn: false, } }
  );
  res.status(200).send();
});

async function seedAdminUser() {
  let count = await User.find({ isAdmin: true }).count();

  if (!count) {
    console.log("creating Useeeeeeeeeeeeeeeeeeer Now");
    let userAdmin = {
      phone: "+966admin",
      password: await getHashPassword("123456"),
      isAdmin: true
    };
    User.insertMany([userAdmin]);
  }
}
seedAdminUser();

async function updateConnectionId(_id, connectionId) {
  try {
    console.log("ID to update Connnetion", _id, connectionId);

    let user = await User.findOne({ _id: _id });

    user.connectionId = connectionId;

    await user.save();
  } catch (e) {
    console.log(e);
  }
}

async function updateDeviceId(_id, deviceId) {
  try {
    console.log("ID of deviceId  ", _id, deviceId);

    let user = await User.findOne({ _id: _id });

    user.deviceId = deviceId;

    await user.save();
  } catch (e) {
    console.log(e);
  }
}

module.exports = router;
module.exports.updateConnectionId = updateConnectionId;
