const ensureAuthorization = require('../middleware/ensureAuthorization');
const role = require('../middleware/role');
const { Subject, validateSubject } = require('../models/subject');
const express = require('express');
const router = express.Router();




router.get('/', ensureAuthorization, async (req, res) => {


    let docs = await Subject.find({})


    res.send(docs);
})

router.get('/count', async (req, res) => {

    const count = await Subject.estimatedDocumentCount()


    res.send(count.toString());

})
 



router.post('/search', ensureAuthorization, async (req, res) => {


    console.log(req.body.text);

    const docs = await Subject.find({ 'name': { '$regex': req.body.text, '$options': 'i' } })


    res.send(docs);
})




router.post('/add', ensureAuthorization, async (req, res) => {
    const { error } = validateSubject(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    let docs = await Subject.insertMany([req.body]);

    res.send(docs[0]);

})

router.post('/delete', ensureAuthorization, async (req, res) => {
    await Subject.findByIdAndRemove({ _id: req.body._id });
    res.status(200).send();
})


router.post('/update', ensureAuthorization, async (req, res) => {
    const { error } = validateSubject(req.body, 'update');
    if (error) return res.status(400).send(error.details[0].message);

    const result = await Subject.findByIdAndUpdate(req.body._id, {
        $set: {
            name: req.body.name
         }
    }, { new: true })

    res.send(result);
})

router.get('/count', async (req, res) => {

    let docs = await Subject.find({}).count();

    res.send(docs);

})


router.post('/scrool', ensureAuthorization, async (req, res) => {


    let pageNum = parseInt(req.body.page) || 1;
    let querySearch = req.body.text || '';
    const pageSize = 10;

    let docs = await Subject.find({ 'name': { '$regex': querySearch, '$options': 'i' } })
        .sort(req.body.sort)
        .skip((pageNum - 1) * pageSize)
        .limit(10)


    res.send(docs);
})


module.exports = router; 
