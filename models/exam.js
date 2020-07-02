const Joi = require("joi");
const mongoose = require("mongoose");
const request = require("request");
const jsreport = require("jsreport");
const fs = require("fs");
const { User } = require("./user");

const examSchema = new mongoose.Schema({
  subId: {
    type: mongoose.Types.ObjectId,
    ref: "Subscribtion"
  },
  score: {
    type: Number,
    default: 0
  },
  userId: {
    type: mongoose.Types.ObjectId,
    ref: "User"
  },
  modelId: {
    type: mongoose.Types.ObjectId,
    ref: "Model"
  },
  start: {
    //time stamp of starting
    type: Date,
    default: Date.now
  },
  isEnded: {
    type: Boolean,
    default: false
  },
  finalScore: {
    type: Number,
    default: 0
  },
  answers: Object,
  userProgress: [Number],
  sectionStartDate: {
    type: Date,
    default: Date.now
  }
});

const Exam = mongoose.model("Exam", examSchema);

function validateExam(body) {
  let schema = {
    subId: Joi.string().required(),
    modelId: Joi.string().required(),
    userId: Joi.string().required(),
    answers: Joi.array(),
    userProgress: Joi.array()
  };

  return Joi.validate(body, schema);
}

async function startExam(input) {
  let newExam = input.body;
  newExam.userId = input.user._id;
  newExam.answers = [];
  newExam.userProgress = [];

  const { error } = validateExam(newExam);
  if (error) return error.details[0].message;

  let start = await Exam.insertMany([newExam]);

  return start[0];
}

async function stopExam(input) {
  let examId = input.body._id,
    finalScore = input.body.score;

  let stop = await Exam.findByIdAndUpdate(
    examId,
    { $set: { isEnded: true, finalScore } },
    { new: true }
  );

  return stop["isEnded"];
}

async function areEnded() {
  arrAgg = [
    {
      $addFields: {
        getEnded: {
          $and: [
            {
              $gt: [
                {
                  $divide: [
                    {
                      $subtract: [new Date(), "$start"]
                    },
                    60000
                  ]
                },
                100
              ]
            },
            {
              $eq: ["$isEnded", false]
            }
          ]
        }
      }
    },
    {
      $match: {
        getEnded: true
      }
    },
    {
      $group: {
        _id: "$getEnded",
        ids: {
          $push: "$_id"
        }
      }
    },
    {
      $project: {
        _id: 0,
        ids: 1
      }
    }
  ];
  let ids = await Exam.aggregate(arrAgg);

  if (Object.keys(ids).length == 0) return;

  ids = ids[0]["ids"].map(id => id.toString());

  await Exam.updateMany({ _id: { $in: ids } }, { $set: { isEnded: true } });
}

async function areSectionEnded() {
  arrAgg = [
    {
      $addFields: {
        getSectionEnded: {
          $and: [
            {
              $gt: [
                {
                  $divide: [
                    {
                      $subtract: [new Date(), "$sectionStartDate"]
                    },
                    60000
                  ]
                },
                25
              ]
            },
            {
              $eq: ["$isEnded", false]
            }
          ]
        }
      }
    },
    {
      $match: {
        getSectionEnded: true
      }
    },
    {
      $group: {
        _id: "$getSectionEnded",
        ids: {
          $push: "$_id"
        }
      }
    },
    {
      $project: {
        _id: 0,
        ids: 1
      }
    }
  ];
  let ids = await Exam.aggregate(arrAgg);

  if (Object.keys(ids).length == 0) return;

  ids = ids[0]["ids"].map(id => id.toString());

  const updateQuery = {
    $push: { userProgress: 1 },
    sectionStartDate: Date.now()
  };

  await Exam.updateMany({ _id: { $in: ids } }, updateQuery);
}

async function isEnded(input) {
  let examId = input.body._id;

  let end = await Exam.findByIdAndUpdate(
    examId,
    { $set: { isEnded: true } },
    { new: true }
  );

  return end ? end.isEnded : null;
}

async function editExam(input) {
  let ExamBody = input.body;

  let upd = await Exam.findByIdAndUpdate(
    ExamBody._id,
    { $set: ExamBody },
    { new: true }
  );

  return upd;
}

async function updateProgsAns(input) {
  let { userProgress, answers, examId } = input.body;

  let upd = await Exam.findByIdAndUpdate(
    examId,
    {
      //$push: { answers },
      $addToSet: { userProgress },
      //upate start date
      sectionStartDate: Date.now()
    },
    { new: true }
  );
  upd.answers = { ...upd.answers, ...answers };
  await upd.save();
  return upd;
}

async function getExamAnswers(examId) {
  // let { examId } = input.body;
  // console.log(exm);

  arrAgg = [
    {
      $match: {
        _id: mongoose.Types.ObjectId(examId)
      }
    },
    {
      $project: {
        answers: 1,
        modelId: 1,
        _id: 0
      }
    },
    {
      $unwind: {
        path: "$answers"
      }
    },
    {
      $lookup: {
        from: "models",
        localField: "modelId",
        foreignField: "_id",
        as: "modelId"
      }
    },
    {
      $addFields: {
        modelId: {
          $arrayElemAt: ["$modelId.sections.questions", 0]
        }
      }
    }
  ];

  let exm = (await Exam.aggregate(arrAgg))[0];

  let sections = exm.modelId;
  let answers = exm.answers;
  console.log("Answers Map is :::> ", answers);

  let score = 0;
  for (let i = 0; i < sections.length; i++) {
    sections[i].map(quest => {
      let id = quest._id;
      let answerInd = answers[id];
      if (answerInd || answerInd == 0) {
        let selectedAnswer = quest.answerOptions[answerInd];
        quest.answerInd = answerInd;
        quest.isCorrectAnswer = selectedAnswer
          ? selectedAnswer.isCorrectAnswer
          : false;
        if (selectedAnswer && selectedAnswer.isCorrectAnswer) {
          score += 1;
        }
      } else {
        quest.answerInd = -1;
        quest.isCorrectAnswer = false;
      }
      return quest;
    });
  }

  console.log("The Score is ::::::> ", score);

  return { sections, score };
}

async function getExamReport(id) {
  let { sections, score } = await getExamAnswers(id);

  let aggr = [
    {
      $match: {
        _id: mongoose.Types.ObjectId(id)
      }
    },
    {
      $lookup: {
        from: "models",
        localField: "modelId",
        foreignField: "_id",
        as: "modelId"
      }
    },
    {
      $addFields: {
        modelId: {
          $arrayElemAt: ["$modelId", 0]
        }
      }
    },
    {
      $project: {
        start: 1,
        userId: 1,
        title: "$modelId.title"
      }
    }
  ];

  let meta = await Exam.aggregate(aggr);
  console.log("The META IS ::::>", meta);

  let sec = [];
  for (let k = 0; k < sections.length; k++) {
    const element = sections[k];
    sec.push({ questions: element });
  }

  let m = meta[0];
  console.log("The META OBJECT IS ::::>", m);

  let user = await User.findById(mongoose.Types.ObjectId(m.userId));
  return {
    sections: sec,
    meta: m,
    userName: user ? user.name : "Some one ",
    score
  };
}

function getRandomAnswer() {
  return Math.floor(Math.random() * Math.floor(4));
}

function getPDF() {
  const tmpl = fs.readFileSync(__dirname + "/report.html", {
    encoding: "utf8"
  });
  return tmpl;
}

async function getSingleExam(input) {
  let exam = await Exam.findById(input.body.examId);
  return exam;
}

exports.Exam = Exam;
exports.startExam = startExam;
exports.stopExam = stopExam;
exports.isEnded = isEnded;
exports.areEnded = areEnded;
exports.editExam = editExam;
exports.updateProgsAns = updateProgsAns;
exports.getSingleExam = getSingleExam;
exports.areSectionEnded = areSectionEnded;
exports.getExamAnswers = getExamAnswers;
exports.getPDF = getPDF;
exports.getExamReport = getExamReport;
