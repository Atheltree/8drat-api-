const ensureAuthorization = require('../middleware/ensureAuthorization');
const role = require('../middleware/role');
const { getAll, getCount, add, delt, update , checkInteractions } = require('../models/interaction');
const express = require('express');
const router = express.Router();


router.get('/', async (req, res) => {
    let all = await getAll(req);

    if(all.details && Array.isArray(all.details) &&
    all.details[0].message) res.status(400).send(all.details[0].message)

    res.send(all);
});

router.post('/check' , async (req , res)=>{
     let result = await checkInteractions(req);

     if(result.details && Array.isArray(result.details) &&
     result.details[0].message) res.status(400).send(result.details[0].message)

     res.send(result);
})  

router.post('/add', async (req, res) => {
    let ad = await add(req);

    if(ad.details && Array.isArray(ad.details) &&
    ad.details[0].message) res.status(400).send(ad.details[0].message)

    res.send(ad);
})

router.post('/update', async (req, res) => {
    let upd = await update(req);

    if(upd.details && Array.isArray(upd.details) &&
    upd.details[0].message) res.status(400).send(upd.details[0].message)

    res.send(upd);
})

router.post('/delete', async (req, res) => {
    let del = await delt(req);

    if(del.details && Array.isArray(del.details) &&
    del.details[0].message) res.status(400).send(del.details[0].message)

    res.send(del);
});

router.get('/Count', async (req, res) => {
    let cnt = await getCount(req);
    res.send(cnt);
})


module.exports = router; 
