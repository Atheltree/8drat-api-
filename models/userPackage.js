

const Joi = require('joi');
const mongoose = require('mongoose');


const userPackageSchema = new mongoose.Schema({
  package: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Package'
  },
  users: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
  // , question: {
  //   type: Schema.Types.ObjectId,
  //   ref: 'Question'
  // }, 

});

const UserPackage = mongoose.model('UserPackage', userPackageSchema);


function validateUserPackage(req, state) {
  let schema = {
    name: Joi.string().min(2).max(255).required(),

  };

  if (state) schema["_id"] = Joi.string().length(24).required();


  return Joi.validate(req, schema);
}


//prm| req.body._id (the package id) , req.user._id (the user id)
//ret| success message
//use| subscribe makes user suscribe a package
async function subscribe(req){
  let userId = req.user._id,
      packageId = req.body._id;

  let subscribe = await UserPackage.findByIdAndUpdate(
    packageId,
    { $set: { users: userId } },
    { upsert: true, new: true }
  );

  return "تم الاشتراك بنجاح.";
}

//prm| req.body._id (the package id) , req.user._id (the user id)
//ret| success message
//use| subscribe makes user suscribe a package
async function unSubscribe(req){
  let userId = req.user._id,
      packageId = req.body._id;

  let subscribe = await UserPackage.findByIdAndUpdate(
    packageId,
    { $pull: { users: userId } },
    { new: true }
  );

  return "تم إلغاء الاشتراك بنجاح.";
}


//prm| req.user._id (the user id)
//ret| object of packages
//use| getPackagesOfUser used to get all packages of a user
async function getPackagesOfUser(req){
  let userId = req.user._id;

  let arrAgg = [
    {
      $match: {
        "users": mongoose.Types.ObjectId(userId)
      }
    }, {
      $project: {
        package: 1
      }
    }, {
      $lookup: {
        from: 'packages', 
        localField: 'package', 
        foreignField: '_id', 
        as: 'package'
      }
    }
  ];

  let result = UserPackage.aggregate(arrAgg);
  return result;
}



exports.UserPackage = UserPackage;
exports.validateUserPackage = validateUserPackage;
exports.subscribe = subscribe;
exports.getPackagesOfUser = getPackagesOfUser;

