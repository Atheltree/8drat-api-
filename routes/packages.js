const ensureAuthorization = require('../middleware/ensureAuthorization');
const role = require('../middleware/role');
const { Package, validatePackage, getPackagesByState, historyPackages } = require('../models/package');
const express = require('express');
const router = express.Router();
const { User } = require('../models/user');
const { Subscribtion } = require('../models/subscribtion');
const _ = require('lodash');


router.get('/', ensureAuthorization, async (req, res) => {


    let docs = await Package.find({})
        .select('-__v')


    res.send(docs);
})

router.get('/count', async (req, res) => {

    const count = await Package.estimatedDocumentCount()


    res.send(count.toString());

})


router.post('/search', ensureAuthorization, async (req, res) => {


    console.log(req.body.text);

    const docs = await Package.find({ 'title': { '$regex': req.body.text, '$options': 'i' } })


    res.send(docs);
})


router.post('/add', ensureAuthorization, async (req, res) => {

    const { error } = validatePackage(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    let docs = await Package.insertMany([req.body]);

    if (req.body.fees == 0) {
        let userIds = await User.find({ isAdmin: { $ne: true } }, { _id: 1 });
        userIds = userIds.map(userId => userId._id);

        let subscribtions = [];
        docs.map(pack => {
            userIds.map(userId => {
                subscribtions.push({
                    state: 1,
                    packageId: pack._id.toString(),
                    userId: userId
                });
            });
        })

        if (subscribtions.length != 0)
            await Subscribtion.insertMany(subscribtions);
    }

    res.send(docs[0]);
})



router.post('/delete', ensureAuthorization, async (req, res) => {
    await Package.findByIdAndRemove({ _id: req.body._id });
    res.status(200).send();
});


router.post('/historyPackages', ensureAuthorization, async (req, res) => {
    let hist = await historyPackages(req);
    res.send(hist);
});


router.post('/getPackagesByState', ensureAuthorization, async (req, res) => {
    let pck = await getPackagesByState(req);
    res.send(pck);
})


router.post('/update', ensureAuthorization, async (req, res) => {
    const { error } = validatePackage(_.omit(req.body, ["__v"]), 'update');
    if (error) return res.status(400).send(error.details[0].message);

    const result = await Package.findByIdAndUpdate(req.body._id, {
        $set: {
            title: req.body.title,
            fees: req.body.fees,
            attemptsNo: req.body.attemptsNo,
            period: req.body.period,
            periodType: req.body.periodType,
            models: req.body.models,
            avatar: req.body.avatar

        }
    }, { new: true })

    res.send(result);
})



router.get('/count', async (req, res) => {

    let docs = await Package.find({}).count();

    res.send(docs);

})


router.post('/scrool', ensureAuthorization, async (req, res) => {


    let pageNum = parseInt(req.body.page) || 1;
    let querySearch = req.body.text || '';
    const pageSize = 10;

    let docs = await Package.find({ 'title': { '$regex': querySearch, '$options': 'i' } })
        .sort(req.body.sort)
        .skip((pageNum - 1) * pageSize)
        .limit(10)


    res.send(docs);
})


module.exports = router; 
