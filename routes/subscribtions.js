const ensureAuthorization = require('../middleware/ensureAuthorization');
const role = require('../middleware/role');
const { subscribe, isEnded, subscribeActivation, getSubscribedPackagesModels, getSubscribedPackages ,
        getModelsOfUserPackages, getPendings, getStates} = require('../models/subscribtion');
const express = require('express');
const router = express.Router();
 


router.post('/subscribe', ensureAuthorization, async (req, res) => {
    let sub = await subscribe(req);
    res.send(sub);
});

router.post('/isEnded', ensureAuthorization, async (req, res) => {
    let isended = await isEnded(req);
    res.send(isended);
});


router.post('/getStates', ensureAuthorization, async (req, res) => {
    let sts = await getStates(req);
    res.send(sts);
});

router.get('/getPendings', ensureAuthorization, async (req, res) => {
    let pndgs = await getPendings(req);
    res.send(pndgs);
});

router.post('/subscribeActivation', ensureAuthorization, async (req, res) => {
    let subAct = await subscribeActivation(req);
    res.send(subAct);
});


router.post('/getSubscribedPackagesModels', ensureAuthorization, async (req, res) => {
    // let getSubs = await getSubscribedPackagesModels(req);
    let getSubs = await getModelsOfUserPackages(req);
    res.send(getSubs);
});


router.post('/getSubscribedPackages', ensureAuthorization, async (req, res) => {
    let getSubs = await getSubscribedPackages(req);
    res.send(getSubs);
});

 






module.exports = router; 
