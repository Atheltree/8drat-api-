const ensureAuthorization = require('../middleware/ensureAuthorization');
const role = require('../middleware/role');
const { UserPackage, validateUserPackage, subscribe, getPackagesOfUser, unSubscribe } = require('../models/userPackage');
const express = require('express');
const router = express.Router();



router.post('/subscribe', ensureAuthorization, async (req, res) => {
    let sbs = await subscribe(req);
    res.send(sbs);
});

router.post('/unSubscribe', ensureAuthorization, async (req, res) => {
    let unSbs = await unSubscribe(req);
    res.send(sbs);
});


router.post('/getPackagesOfUser', ensureAuthorization, async (req, res) => {
    let getPackages = await getPackagesOfUser(req);
    res.send(getPackages);
});


module.exports = router; 
