const ensureAuthorization = require('../middleware/ensureAuthorization');
const role = require('../middleware/role');
const _ = require('lodash');
const { Slider, add } = require('../models/slider');
const express = require('express');
const router = express.Router();


router.get('/', async (req, res) => {

    let docs = await Slider.find({});
    res.send(docs);
})


router.post('/search', ensureAuthorization, async (req, res) => {


    console.log(req.body.text);

    const docs = await Package.find({ 'title': { '$regex': req.body.text, '$options': 'i' } })


    res.send(docs);
})


router.post('/add', async (req, res) => {

    let newS = new Slider(req.body);
    let result = await newS.save();
    return res.send(result);
});

router.post('/delete', ensureAuthorization, async (req, res) => {
    await Slider.findByIdAndRemove({ _id: req.body._id });
    res.status(200).send();
});


router.post('/update', ensureAuthorization, async (req, res) => {

    const result = await Slider.findByIdAndUpdate(req.body._id,
        { $set: _.omit(req.body, '_id') },
        { new: true })

    res.send(result);
})

router.get('/count', ensureAuthorization, async (req, res) => {

    let docs = await Slider.find({}).count();

    res.send(docs);

})

router.post('/scrool', ensureAuthorization, async (req, res) => {


    let pageNum = parseInt(req.body.page) || 1;
    let querySearch = req.body.text || '';
    const pageSize = 10;

    let docs = await Slider.find({ 'title': { '$regex': querySearch, '$options': 'i' } })
        .sort(req.body.sort)
        .skip((pageNum - 1) * pageSize)
        .limit(10)


    res.send(docs);
})


module.exports = router; 


