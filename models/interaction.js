const Joi = require('joi');
const mongoose = require('mongoose');



const interactionSchema = new mongoose.Schema({

    gtin1: {
        type: String,
        required: true,
        minlength: 12,
        maxlength: 15
    },
    gtin2: {
        type: String,
        required: true,
        minlength: 12,
        maxlength: 15
    },
    degree: {
        type: String,
        required: true,
        enum: [1, 2, 3],
    },
    desc: {
        type: String,
        maxlength: 250
    },
});

const Interaction = mongoose.model('Interaction', interactionSchema);

function validateAddUpdInteraction(req, state) {
    let schema = {
        gtin1: Joi.string().min(12).max(15).required(),
        gtin2: Joi.string().min(12).max(15).required(),
        degree: Joi.number().required(),
        desc: Joi.string().max(250).optional(),
    };

    if (state) schema["_id"] = Joi.string().length(24).required();


    return Joi.validate(req, schema);
}

function validateDelInteraction(req) {
    let schema = {
        _id: Joi.string().required(),
    };

    return Joi.validate(req, schema);
}

function validateGetAllInteraction(req) {
    let schema = {
        page: Joi.number().optional(),
        search: Joi.string().optional(),
    };

    return Joi.validate(req, schema);
}


async function getAll(input) {

    const { error } = validateAddUpdInteraction(input.body);
    if (error) return error;
    
    return (results);
}


async function checkInteractions(input) {

    // const { error } = validateAddUpdInteraction(input.body);
    // if (error) return error;

    let gtins = [];
    drugsMap = {};
    for (let i = 0; i < input.body.length; i++) {
        const element = input.body[i];
        drugsMap[element.gtin] = element;
        gtins.push(element.gtin);
    }

    let agrarr = [
        {
            $match: {
                $and: [
                    {
                        gtin1: {
                            $in: gtins
                        }
                    }, {
                        gtin2: {
                            $in: gtins
                        }
                    }
                ]
            }
        }, {
            $group: {
                _id: "$degree",
                drugs: {
                    $push: {
                        gtin1: "$gtin1",
                        gtin2: "$gtin2",
                        desc: "$desc"
                    }
                }
            }
        },
         {
            $sort: {
              _id: -1
            }
          }
    ];

    let result = await Interaction.aggregate(agrarr).exec();
    
    for (let i = 0; i < result.length; i++) {
        let {drugs} = result[i];
        for (let k = 0; k < drugs.length; k++) {
            let durg = drugs[k];
            durg.gtin1= drugsMap[durg.gtin1];
            durg.gtin2= drugsMap[durg.gtin2];
        }
    }
    
    return (result);
}

async function add(input) {
    const { error } = validateAddUpdInteraction(input.body);
    if (error) return error;

    let docs = await Interaction.insertMany([input.body]);

    return docs[0];
}

async function update(input) {
    const { error } = validateAddUpdInteraction(input.body, 'update');
    if (error) return error

    const result = await Interaction.findByIdAndUpdate(input.body._id, {
        $set: {
            title: input.body.title,
            fees: input.body.fees,
            attemptsNo: input.body.attemptsNo,
            period: input.body.period,
            periodType: input.body.periodType,
            models: input.body.models,
            avatar: input.body.avatar

        }
    }, { new: true })

    return result;
}

async function delt(input) {
    const { error } = validateDelInteraction(input.body);
    if (error) return error

    return await Interaction.findByIdAndRemove({ _id: input.body._id });;
}

async function getCount() {
    return await Interaction.find({}).count().toString();
}



exports.getAll = getAll;
exports.add = add;
exports.update = update;
exports.delt = delt;
exports.getCount = getCount;
exports.checkInteractions = checkInteractions;