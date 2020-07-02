const ensureAuthorization = require('../middleware/ensureAuthorization');
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');


router.get('/count', ensureAuthorization, async (req, res) => {
    var db = mongoose.connection;
    let models = await db.collections;

    let allCount = {}

    for (model in models) { 
        if (model == "users") {
            allCount[model] = await models[model].count({isAdmin:false});
        } else {
            allCount[model] = await models[model].countDocuments();
        }
    }
    res.send(allCount);

})



module.exports = router;

