const Joi = require('joi');
const mongoose = require('mongoose');
const _ = require('lodash');
const { Package } = require('./package');
const { getModelsOfPackage } = require('./model');


const subscribtionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    packageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Package',
        required: true
    },
    state: {
        type: Number,
        default: 0,
    },
    // isActivate: {
    //     type: Boolean,
    //     default: false,
    // },
    start: {
        type: Date,
    },
    end: {
        type: Date,
    },
    log: [{
        state: {
            type: Number,
            default: 0
        },
        actionDate: {
            type: Date,
            default: Date.now

        }
    }]

    // models: [{
    //     modelId: {
    //         type: mongoose.Schema.Types.ObjectId,
    //         ref: 'Model'
    //     },
    //     attemps: {
    //         type: Number,
    //         required: true
    //     },
    // }]

});

const Subscribtion = mongoose.model('Subscribtion', subscribtionSchema);


function validateSubscribe(body) {
    let schema = {
        packageId: Joi.string().required(),
        userId: Joi.string().required(),
    };
    return Joi.validate(body, schema);
}


function periodParse(period, periodType) {
    switch (periodType) {
        case 0: return new Date((new Date).setHours((new Date).getHours() + period)); break;
        case 1: return new Date((new Date).setHours((new Date).getHours() + (period * 24))); break;
        case 2: return new Date((new Date).setHours((new Date).getHours() + (period * 24 * 7))); break;
        case 3: return new Date((new Date).setMonth((new Date).getMonth() + period)); break;
        case 4: return new Date((new Date).setMonth((new Date).getMonth() + (period * 12))); break;
        default: 0;
    }
}


async function subscribe(input) {
    let subscribeBody = input.body;
    subscribeBody.userId = input.user._id;

    const { error } = validateSubscribe(subscribeBody);
    if (error) return (error.details[0].message);

    let newSub = new Subscribtion(subscribeBody);
    let subs = await newSub.save();

    return subs;
}


async function isEnded(input) {
    let subscribeId = input.body._id;

    let { end } = await Subscribtion.findById(
        subscribeId, { end: 1 }
    );

    return end;
}


async function getStates(input) {
    let isAdmin = input.user.isAdmin;

    if (!isAdmin) return "لا تمتلك صلاحية الدخول !";

    let arrAgg = [
        {
            $project: {
                _id: 1,
                user: "$userId",
                package: "$packageId",
                state: 1,
                start: 1,
                end: 1,
            }
        }, {
            $lookup: {
                from: 'users',
                localField: 'user',
                foreignField: '_id',
                as: 'user'
            }
        }, {
            $addFields: {
                user: {
                    $arrayElemAt: [
                        "$user", 0
                    ]
                }
            }
        }, {
            $project: {
                _id: 1,
                "userName": "$user.name",
                "userPhone": "$user.phone",
                "package": 1,
                "state": 1,
                "start": 1,
                "end": 1,
            }
        }, {
            $lookup: {
                from: 'packages',
                localField: 'package',
                foreignField: '_id',
                as: 'package'
            }
        }, {
            $addFields: {
                package: {
                    $arrayElemAt: [
                        "$package", 0
                    ]
                }
            }
        }, {
            $project: {
                "_id": 1,
                "userName": 1,
                "userPhone": 1,
                "packageTitle": "$package.title",
                "state": 1,
                "start": 1,
                "end": 1,
            }
        }, {
            $facet: {
                'pending': [
                    {
                        $match: {
                            state: 0
                        }
                    }
                ],
                'accepted': [
                    {
                        $match: {
                            state: 1
                        }
                    }
                ],
                'canceled': [
                    {
                        $match: {
                            state: 2
                        }
                    }
                ],
                'stopped': [
                    {
                        $match: {
                            state: 3
                        }
                    }
                ],
                'ended': [
                    {
                        $match: {
                            end: { $gt: new Date() }
                        }
                    }
                ]
            }
        }
    ];

    let states = await Subscribtion.aggregate(arrAgg);

    return states[0];
}


async function subscribeActivation(input) {

    const { user: { isAdmin }, body: { subscribeId, state } } = input;

    io = input.app.get('io')

    if (!isAdmin) return 'لا تمتلك صلاحية الدخول !';

    let updObj = { state };

    if (state == 1) {   //accepted

        arrAgg = [
            {
                $match: {
                    _id: mongoose.Types.ObjectId(subscribeId)
                }
            }
            , {
                $lookup: {
                    from: 'packages',
                    localField: 'packageId',
                    foreignField: '_id',
                    as: 'packageId'
                }
            }
            , {
                $lookup: {
                    from: 'users',
                    localField: 'userId',
                    foreignField: '_id',
                    as: 'userConnectionId'
                }
            }
            , {
                $addFields: {
                    packageId: {
                        $arrayElemAt: [
                            "$packageId", 0
                        ]
                    }
                }
            }, {
                $project: {
                    _id: 0,
                    period: "$packageId.period",
                    periodType: "$packageId.periodType",
                    userConnectionId: "$userConnectionId.connectionId",
                    start: 1,
                    end: 1
                }
            }
        ];

        let pp = await Subscribtion.aggregate(arrAgg);

        let period = pp[0].period,
            periodType = pp[0].periodType,
            end = periodParse(period, periodType);

        end = pp.end ? pp.end : end;
        start = pp.start ? pp.start : Date.now();

        // updObj = { 'log': { $push: { state } }, end }
        updObj = { state, start, end }

        await Subscribtion.findByIdAndUpdate(
            subscribeId, updObj
        );

        if (io.sockets.connected[pp[0].userConnectionId])
            io.sockets.connected[pp[0].userConnectionId]
                .emit("adminActivatePack", true);

    }
    else
        await Subscribtion.findByIdAndUpdate(
            subscribeId, { state }
        );
    // await Subscribtion.findByIdAndUpdate(
    //     subscribeId, { $push: {log: {state}} },
    //     { new: true }
    // );

    return getStates(input);
}


async function getSubscribedPackagesModels(input) {
    let userId = input.user._id;

    let arrAgg = [
        {
            $match: {
                $and: [
                    {
                        userId: mongoose.Types.ObjectId(userId)
                    }, {
                        isActivate: true
                    }
                ]
            }
        }
        ,
        {
            $unwind: {
                path: "$models"
            }
        }, {
            $lookup: {
                from: 'models',
                localField: 'models.modelId',
                foreignField: '_id',
                as: 'models.modelId'
            }
        }
        , {
            $lookup: {
                from: 'packages',
                localField: 'packageId',
                foreignField: '_id',
                as: 'packageId'
            }
        }, {
            $addFields: {
                "models.modelId": {
                    $arrayElemAt: [
                        "$models.modelId", 0
                    ]
                },
                "packageId": {
                    $arrayElemAt: [
                        "$packageId", 0
                    ]
                }
            }
        }, {
            $project: {
                _id: 1,
                start: 1,
                end: 1,
                state: 1,
                isActivate: 1,
                "models._id": "$models.modelId._id",
                "models.title": "$models.modelId.title",
                "models.interval": "$models.modelId.interval",
                "models.questSize": "100",
                "packageId": "$packageId._id",
                "title": "$packageId.title",
                "models.attempts": "$models.attempts"
            }
        }, {
            $group: {
                _id: "$_id",
                start: {
                    $first: "$start"
                },
                end: {
                    $first: "$end"
                },
                state: {
                    $first: "$state"
                },
                isActivate: {
                    $first: "$isActivate"
                },
                "packageId": {
                    $first: "$packageId"
                },
                "title": {
                    $first: "$title"
                },
                models: {
                    $push: "$models"
                }
            }
        }
    ];

    let getsubs = await Subscribtion.aggregate(arrAgg);
    return (getsubs);
}


async function getSubscribedPackages(input) {
    let userId = input.user._id;
    let arrAgg = [
        {
            $match: {
                $and: [
                    {
                        userId: mongoose.Types.ObjectId(userId)
                    }, {
                        isActivate: true
                    }
                ]
            }
        }, {
            $lookup: {
                from: 'packages',
                localField: 'packageId',
                foreignField: '_id',
                as: 'packageId'
            }
        }, {
            $addFields: {
                "packageId": {
                    $arrayElemAt: [
                        "$packageId", 0
                    ]
                }
            }
        }, {
            $project: {
                _id: 1,
                start: 1,
                end: 1,
                isActivate: 1,
                "package._id": "$packageId._id",
                "package.title": "$packageId.title",
                "models.attempts": "$models.attempts"
            }
        }, {
            $group: {
                _id: "$_id",
                start: {
                    $first: "$start"
                },
                end: {
                    $first: "$end"
                },
                isActivate: {
                    $first: "$isActivate"
                },
                "package": {
                    $push: "$package"
                },
            }
        }
    ];

    let getsubs = await Subscribtion.aggregate(arrAgg);
    return getsubs;
}

async function getModelsOfUserPackages(input) {

    let userId = input.user._id;

    let { packageId = false } = input.body,
        matquery = {}

    if (packageId) {
        matquery = {
            $and: [
                {
                    userId: mongoose.Types.ObjectId(userId)
                }, {
                    packageId: mongoose.Types.ObjectId(packageId)

                }, {
                    state: 1
                }
            ]
        }
    } else {
        matquery = {
            $or: [
                { fees: 0 },
                {
                    $and: [
                        {
                            userId: mongoose.Types.ObjectId(userId)
                        }, {
                            state: 1
                        }
                    ]
                }]
        }
    }

    let arrAgg = [
        {
            $match: matquery
        }, {
            $lookup: {
                from: 'packages',
                localField: 'packageId',
                foreignField: '_id',
                as: 'packages'
            }
        }, {
            $addFields: {
                'package': {
                    $arrayElemAt: [
                        '$packages', 0
                    ]
                }
            }
        }, {
            $project: {
                packages: 0
            }
        }, {
            $project: {
                _id: 1,
                start: 1,
                end: 1,
                state: 1,
                isActivate: 1,
                model: '$package.models',
                title: '$package.title',
                packageId: '$package._id',
                packageAttempts: '$package.attemptsNo'
            }
        }, {
            $unwind: {
                path: '$model',
                preserveNullAndEmptyArrays: false
            }
        }, {
            $lookup: {
                from: 'models',
                let: {
                    model_id: "$model"
                },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    {
                                        $eq: [
                                            "$_id", "$$model_id"
                                        ]
                                    }
                                ]
                            }
                        }
                    }, {
                        $project: {
                            sections: 0
                        }
                    }
                ],
                as: 'model'
            }
        }, {
            $unwind: {
                path: '$model',
                preserveNullAndEmptyArrays: false
            }
        }, {
            $lookup: {
                from: 'exams',
                let: {
                    model_id: "$model._id",
                    subscription: "$_id"
                },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    {
                                        $eq: [
                                            "$modelId", "$$model_id"
                                        ]
                                    }, {
                                        $eq: [
                                            "$subId", "$$subscription"
                                        ]
                                    }
                                ]
                            }
                        }
                    }, {
                        $project: {
                            start: 1,
                            _id: 1,
                            isEnded: 1
                        }
                    }
                ],
                as: 'exams'
            }
        }, {
            $addFields: {
                doneAttempts: {
                    $size: "$exams"
                }
            }
        }, {
            $project: {
                exams: 0
            }
        }, {
            $lookup: {
                from: 'exams',
                let: {
                    model_id: "$model._id",
                    subscription: "$_id"
                },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    {
                                        $eq: [
                                            "$modelId", "$$model_id"
                                        ]
                                    }, {
                                        $eq: [
                                            "$subId", "$$subscription"
                                        ]
                                    }, {
                                        $eq: [
                                            "$isEnded", false
                                        ]
                                    }
                                ]
                            }
                        }
                    }, {
                        $project: {
                            start: 1,
                            _id: 1,
                            isEnded: 1,
                            userProgress: 1
                        }
                    }
                ],
                as: 'exams'
            }
        }, {
            $addFields: {
                'currentExam': {
                    $arrayElemAt: [
                        '$exams', 0
                    ]
                }
            }
        }, {
            $project: {
                modelName: '$model.title',
                modelId: '$model._id',
                curentStart : '$currentExam.start',
                userProgress: '$currentExam.userProgress',
                examId:'$currentExam._id',
                attempts: '$packageAttempts',
                'doneAttempts': 1,
                'package': '$title'
            }
        }, {
            $group: {
                _id: {
                    id: '$_id',
                    name: '$package',
                    attempts: '$attempts'
                },
                models: {
                    $push: {
                        _id: '$modelId',
                        name: '$modelName',
                        attempts: '$doneAttempts',
                        start: '$curentStart',
                        userProgress:'$userProgress',
                        examId:'$examId'
                    }
                }
            }
        }, {
            $project: {
                _id: '$_id.id',
                packageName: '$_id.name',
                attempts: '$_id.attempts',
                models: 1
            }
        }

    ];


    input.body.pageSize = 1000;

    // if (packageId)
    //     userPackages = (await getModelsOfPackage(input))[0];

    // if (!packageId || (packageId && userPackages.fees != 0))
    let userPackages = await Subscribtion.aggregate(arrAgg);


    return userPackages;
}

async function getPendings(input) {
    if (!input.user.isAdmin) return 'لا تمتلك صلاحية الدخول !';

    let { page = 1, search = '' } = input.body,
        pageSize = 10,
        pageNum = parseInt(page) || 1,
        skipped = (pageNum - 1) * pageSize;

    let arrAgg = [
        {
            '$match': {
                'state': 0
            }
        }, {
            '$project': {
                '_id': 1,
                'user': '$userId',
                'package': '$packageId'
            }
        }, {
            '$lookup': {
                'from': 'users',
                'localField': 'user',
                'foreignField': '_id',
                'as': 'user'
            }
        }, {
            '$addFields': {
                'user': {
                    '$arrayElemAt': [
                        '$user', 0
                    ]
                }
            }
        }, {
            '$project': {
                '_id': 1,
                'userName': '$user.name',
                'userPhone': '$user.phone',
                'package': 1
            }
        }, {
            '$lookup': {
                'from': 'packages',
                'localField': 'package',
                'foreignField': '_id',
                'as': 'package'
            }
        }, {
            '$addFields': {
                'package': {
                    '$arrayElemAt': [
                        '$package', 0
                    ]
                }
            }
        }, {
            '$project': {
                '_id': 1,
                'userName': 1,
                'userPhone': 1,
                'packageTitle': '$package.title'
            }
        },
        //{ $sort: { _id: -1 } },
        { $skip: skipped },
        { $limit: pageSize }
    ];

    if (search)
        arrAgg.splice(8, 0,
            {
                $match: {
                    $or: [
                        { "userName": { $regex: search } },
                        { "packageTitle": { $regex: search } },
                    ]
                }
            }
        );

    let pndgs = await Subscribtion.aggregate(arrAgg);

    return pndgs;
}

exports.Subscribtion = Subscribtion;
exports.subscribe = subscribe;
exports.isEnded = isEnded;
exports.subscribeActivation = subscribeActivation;
exports.getSubscribedPackagesModels = getSubscribedPackagesModels;
exports.getSubscribedPackages = getSubscribedPackages;
exports.getModelsOfUserPackages = getModelsOfUserPackages;
exports.getPendings = getPendings;
exports.getStates = getStates;


