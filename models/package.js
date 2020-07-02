const Joi = require('joi');
const mongoose = require('mongoose');


const packageSchema = new mongoose.Schema({

    title: {
        type: String,
        required: true,
        minlength: 2,
        maxlength: 50
    },
    fees: {
        type: Number,
        required: true
    },
    attemptsNo: {
        type: Number,
        required: true,
    },
    period: {
        type: Number,
        required: true,
    },
    periodType: {
        type: Number,
        default: 0,
        enum: [0, 1, 2, 3, 4]
        //hour Day week moth year 
    },
    // period: {
    //     type: [Number],
    //     default: [0,0,0,0,0]
    //     //hour day week moth year 
    // },
    // models: [{
    //     modelId: {
    //         type: mongoose.Schema.Types.ObjectId,
    //         ref: 'Model'
    //     },
    //     attempts: Number,
    // }],

    //Waht About But  attempts In the Model it self !!! Or Dont Put it at all

    models: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Model'
        }
    ],
    avatar: String,
    isPaid: {
        type: Boolean,
    },
    //  , // activationNo: {
    //     type: Number,
    //     required: true
    // }
    //  ,

});

packageSchema.pre('save', function (next) {

    if (this.fees == 0) this.attemptsNo = Infinity;
    this.isPaid = (this.fees == 0) ? false : true;

    next();
});

const Package = mongoose.model('Package', packageSchema);


function validatePackage(req, state) {
    let schema = {
        title: Joi.string().required(),
        fees: Joi.number().required(),
        attemptsNo: Joi.number().required(),
        period: Joi.number().required(),
        periodType: Joi.number().optional(),
        models: Joi.array().optional(),
        avatar: Joi.string().optional(),
        isPaid: Joi.optional(),
    };

    if (state) schema["_id"] = Joi.string().length(24).required();


    return Joi.validate(req, schema);
}

async function getPackagesByState(input) {
    let userId = input.user._id;

    let arrAgg =
        [
            {
                $addFields: {
                    models: {
                        $size: '$models'
                    }
                }
            }, {
                $lookup: {
                    from: 'subscribtions',
                    localField: '_id',
                    foreignField: 'packageId',
                    as: 'sub'
                }
            }, {
                $unwind: {
                    path: '$sub'
                }
            }, {
                $match: {
                    'sub.userId': mongoose.Types.ObjectId(userId)
                }
            }, {
                $addFields: {
                    state: '$sub.state'
                }
            }, {
                $project: {
                    sub: 0,
                    __v: 0
                }
            }
        ];

    let inPcks = await Package.aggregate(arrAgg);

    let inIds = inPcks.map(elm => elm._id);

    arrAgg = [
        {
            $addFields: {
                models: {
                    $size: "$models"
                }
            }
        },
        {
            $match: {
                _id: {
                    $nin: inIds
                }
            }
        }, {
            $addFields: {
                state: -1
            }
        }
    ];

    let outPcks = await Package.aggregate(arrAgg);

    let allPacks = [...inPcks, ...outPcks];
    return allPacks;
}


async function historyPackages(input) {

    let userId = input.user._id;

    let arrAgg = [
        {
            $lookup: {
                from: 'subscribtions',
                localField: '_id',
                foreignField: 'packageId',
                as: 'end'
            }
        }, {
            $addFields: {
                end: {
                    $arrayElemAt: [
                        "$end", 0
                    ]
                },
                models: {
                    $size: "$models"
                },
                questsCount: {
                    $multiply: [
                        {
                            $size: "$models"
                        }, 100
                    ]
                }
            }
        }, {
            $match: {
                "end.userId": mongoose.Types.ObjectId(userId)
            }
        }, {
            $addFields: {
                endDate: "$end.end",
                end: {
                    $gt: [
                        "$end.end", new Date()
                    ]
                }
            }
        }, {
            $facet: {
                "true": [
                    {
                        $match: {
                            "end": true
                        }
                    }
                ],
                "false": [
                    {
                        $match: {
                            "end": false
                        }
                    }
                ]
            }
        }
    ];

    let hist = await Package.aggregate(arrAgg);
    return hist[0];
}


exports.Package = Package;
exports.validatePackage = validatePackage;
exports.getPackagesByState = getPackagesByState;
exports.historyPackages = historyPackages;


