const ensureAuthorization = require('../middleware/ensureAuthorization');
const role = require('../middleware/role');
const { Contact, validateContact } = require('../models/contact');
const { ContactInfo, validateContactInfo } = require('../models/contactsInfo');
const express = require('express');
const router = express.Router();


function seedCategories() {
    ContactInfo.count({}, (err, count) => {
        if (count === 0) {
            const BASIC_TEACHING = [{
                mail: 'info@saboraapp.com',
                facebook: 'https://fb.com/saboraapp',
                twitter: 'https://twitter.com/saboraapp',
                whatsApp: '+96654545455',
                phone: '+96654545455',
                bankName:"البنك الأهلي"
            }]
            ContactInfo.insertMany(BASIC_TEACHING);
        }
    });
}

seedCategories();

router.get('/', ensureAuthorization, async (req, res) => {

    let docs = await Contact.find({}).
        populate('user');

    res.send(docs);
})


router.post('/scrool', ensureAuthorization, async (req, res) => {
    console.log('uuuuuuuuuuuuuuuuuuu', req.body)

    let pageNum = parseInt(req.body.page) || 1;
    let querySearch = req.body.text || '';
    let sort = req.body.sort || { 'user._id': 1 };
    const pageSize = 10;



    const docs = await Contact.aggregate([
        {
            "$lookup": {
                "from": 'users',
                "localField": "user",
                "foreignField": "_id",
                "as": "user"
            }
        },
        {
            "$addFields": {
                "user": { "$arrayElemAt": ["$user", 0] },

            }
        }, {
            $match: {
                $or: [{ 'user.name': { '$regex': querySearch, '$options': 'i' } },
                { 'user.school': { '$regex': querySearch, '$options': 'i' } },
                { 'user.address': { '$regex': querySearch, '$options': 'i' } },
                { 'user.phone': { '$regex': querySearch, '$options': 'i' } }


                ]
            }
        },
        { "$sort": sort },
        { "$skip": (pageNum - 1) * pageSize },
        { "$limit": 10 },
    ])


    res.send(docs);
})


router.get('/count', async (req, res) => {

    const count = await Contact.estimatedDocumentCount()


    res.send(count.toString());

})

router.get('/info', async (req, res) => {
    let docs = await ContactInfo.find({});
    res.send(docs);
})


router.post('/info/save', async (req, res) => {
    if (req.body._id) {
        const { error } = validateContactInfo(req.body, 'update');
        if (error) return res.status(400).send(error.details[0].message);
    } else {
        const { error } = validateContactInfo(req.body);
        if (error) return res.status(400).send(error.details[0].message);
    }

    let object = req.body;

    if (req.body._id) {
        await ContactInfo.updateOne({ _id: req.body._id }, object);
    } else {
        object["user"] = req.user._id;

        await ContactInfo.insertMany([object]);
    }

    let docs = await ContactInfo.find({});
    res.send(docs);

})


router.post('/add', async (req, res) => {

    const { error } = validateContact(req.body);

    if (error) return res.status(400).send(error.details[0].message);

    req.body["user"] = req.user ? req.user._id : null;

    let docs = await Contact.insertMany([req.body]);

    res.send(docs);

})

router.post('/delete', ensureAuthorization, async (req, res) => {
    await Contact.findByIdAndRemove({ _id: req.body._id });
    res.status(200).send();
})



router.post('/search', ensureAuthorization, async (req, res) => {

    const docs = await Contact.aggregate([
        {
            "$lookup": {
                "from": 'users',
                "localField": "user",
                "foreignField": "_id",
                "as": "user"
            }
        },
        {
            "$addFields": {
                "user": { "$arrayElemAt": ["$user", 0] },

            }
        }, {
            $match: {
                $or: [{ 'user.name': { '$regex': req.body.text, '$options': 'i' } },
                { 'user.school': { '$regex': req.body.text, '$options': 'i' } },
                { 'user.address': { '$regex': req.body.text, '$options': 'i' } },
                { 'user.phone': { '$regex': req.body.text, '$options': 'i' } }


                ]
            }
        }
    ])


    res.send(docs);
})



router.post('/sort', ensureAuthorization, async (req, res) => {


    const docs = await Contact.aggregate([
        {
            "$lookup": {
                "from": 'users',
                "localField": "user",
                "foreignField": "_id",
                "as": "user"
            }
        },
        {
            "$addFields": {
                "user": { "$arrayElemAt": ["$user", 0] },

            }
        },
        { $sort: req.body.sort }

    ])




    res.send(docs);
})

module.exports = router; 
