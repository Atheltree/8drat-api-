const Joi = require("joi");
const mongoose = require("mongoose");
const { Package } = require("./package");
const xslx = require("xlsx");
const fs = require("fs");

const modelSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    minlength: 2,
    maxlength: 50
  },
  interval: {
    type: Number,
    required: true
  },
  sections: [
    {
      questions: [
        {
          parent: {
            type: mongoose.Schema.Types.ObjectId
          },
          question: {
            type: String,
            maxlength: 2000
          },
          avatar: String,
          index: Number,
          answerOptions: [
            {
              answerBody: {
                type: String,
                maxlength: 1000
              },
              optionNumber: {
                type: Number
              },
              isCorrectAnswer: {
                type: Boolean,
                default: false
              }
            }
          ]
        }
      ]
    }
  ]
});

const Model = mongoose.model("Model", modelSchema);

function validateModel(req, state) {
  let schema = {
    title: Joi.string()
      .min(2)
      .max(255)
      .required(),
    interval: Joi.number().required(),
    sections: Joi.array().optional()
  };

  if (state)
    schema["_id"] = Joi.string()
      .length(24)
      .required();

  return Joi.validate(req, schema);
}

async function fixlastquestion() {
  let docs = await Model.find({});
  for (let i = 0; i < docs.length; i++) {
    let element = docs[i];
    if (element.sections[3].questions.length < 25) {
      element.sections[3].questions.push({
        question: "",
        index: 25,
        answerOptions: [
          {
            answerBody: "",
            optionNumber: 1,
            isCorrectAnswer: false
          },
          {
            answerBody: "",
            optionNumber: 2,
            isCorrectAnswer: false
          },
          {
            answerBody: "",
            optionNumber: 3,
            isCorrectAnswer: false
          },
          {
            answerBody: "",
            optionNumber: 4,
            isCorrectAnswer: false
          }
        ]
      });
      await Model.findByIdAndUpdate(
        element._id,
        { $set: element },
        { new: true }
      );
    }
  }
}

//prm| input.body (the new model) , input.user.isAdmin (boolean admin authorization)
//ret| success new model object / fail message
//use| addModel add new model
async function addModel(input) {
  let bodyModel = input.body;

  bodyModel.sections.forEach(function (sec) {
    sec.questions.forEach(function (quest, ind) {
      quest.index = ind;
    });
  });

  if (!input.user.isAdmin) return "لا تمتلك صلاحية الدخول !";

  const { error } = validateModel(bodyModel);
  if (error) return error.details[0].message;

  let docs = await Model.insertMany([bodyModel]);

  return docs[0];
}

//prm| input.body (the new model), input.body._id (the model id), input.user.isAdmin (boolean admin authorization)
//ret| success edited model object / fail message
//use| editModel edit exist model
async function editModel(input) {
  // let isAdmin = input.user.isAdmin,
  let modelId = input.body._id,
    newModel = input.body;

  // if(!isAdmin) return "access denied !";

  let updated = Model.findByIdAndUpdate(
    modelId,
    { $set: newModel },
    { new: true }
  );

  return updated;
}

//prm| input.body (the new model), input.body._id (the model id), input.user.isAdmin (boolean admin authorization)
//ret| success deleted model object / fail message
//use| deleteModel delete a model
async function deleteModel(input) {
  // let isAdmin = input.user.isAdmin,
  let modelId = input.body._id;

  // if(!isAdmin) return "access denied !";

  let deleteM = Model.findByIdAndDelete(modelId);

  return deleteM;
}

//prm| input.body._id (the model id), input.user.isAdmin (boolean admin authorization)
//ret| success get model object / fail message
//use| getModel get a model
async function getModel(input) {
  let isAdmin = input.user.isAdmin,
    modelId = input.body._id;
  search = input.body.search ? input.body.search : "";

  let mdl = Model.findById(modelId);
  return mdl;
}

//prm| input.body._id (the model id), input.user.isAdmin (boolean admin authorization), input.body.packageId
//ret| success get model object / fail message
//use| getModel get all model
async function getModelsOfPackage(input) {
  let packageId = input.body.packageId,
    { pageSize = 10, page = 1 } = input.body,
    pageNum = parseInt(page) || 1,
    skipped = (pageNum - 1) * pageSize;

  let arrAgg = [
    {
      $match: {
        _id: mongoose.Types.ObjectId(packageId)
      }
    },
    {
      $project: {
        models: {
          $slice: ["$models", skipped, pageSize]
        },
        fees: 1
      }
    },
    {
      $lookup: {
        from: "models",
        localField: "models",
        foreignField: "_id",
        as: "models"
      }
    },
    {
      $project: {
        "models._id": 1,
        "models.title": 1,
        "models.avatar": 1,
        fees: 1
      }
    }
  ];
  let mdls = await Package.aggregate(arrAgg);
  return mdls;
}

async function getAllModels() {
  return await Model.find({});
}

async function getSections(input) {
  let modelId = input.body._id;

  let getSecs = await Model.findById(modelId, { title: 1, sections: 1 });

  return getSecs;
}

function parseSection(wp, section) {
  const answerMap = {
    A: 1,
    B: 2,
    C: 3,
    D: 4
  };
  let qustions = [],
    missedQuestion = [];
  for (let i = 0; i < 25; i++) {
    const row = section.start + i;
    if (row > section.end) {
      break;
    }
    const question = {
      question: "",
      index: i + 1,
      answerOptions: [
        {
          answerBody: "",
          optionNumber: 1,
          isCorrectAnswer: false
        },
        {
          answerBody: "",
          optionNumber: 2,
          isCorrectAnswer: false
        },
        {
          answerBody: "",
          optionNumber: 3,
          isCorrectAnswer: false
        },
        {
          answerBody: "",
          optionNumber: 4,
          isCorrectAnswer: false
        }
      ]
    };
    const q = wp[`F${row}`];
    if (!q) {
      missedQuestion.push(i + 1);
      // continue;
    } else {
      if (q.h) {
        question.question = wp[`F${row}`].h;
      } else {
        question.question = wp[`F${row}`].v;
      }
      const answers = ["A", "B", "C", "D"];
      for (let k = 0; k < answers.length; k++) {
        const col = answers[k];
        const answerIndex = answerMap[`${wp[`E${row}`].v}`];
        const isCorrectAnswer = answerIndex && answerIndex == k + 1;
        const ans = wp[`${col}${row}`];
        if (ans) {
          question.answerOptions[k].answerBody = ans.h ? ans.h : ans.v;
          question.answerOptions[k].isCorrectAnswer = isCorrectAnswer;
        }
      }
    }
    // console.log(row);

    qustions.push(question);
  }
  return { questions: qustions, missedQuestion: missedQuestion };
}

const section1 = { start: 2, end: 26 };
const section2 = { start: 27, end: 51 };
const section3 = { start: 52, end: 76 };
const section4 = { start: 77, end: 101 };

async function excel(input) {
  const csvfile = root + "/uploads/" + input.file.filename;
  const wp = xslx.readFile(csvfile).Sheets["questions"];
  const meta = xslx.readFile(csvfile).Sheets["meta"];

  let model = new Model({
    title: meta.A1.v || input.file.filename.split(".")[0],
    interval: 100,
    sections: [],
    fromExcel: true
  });

  const sec1 = parseSection(wp, section1);
  const sec2 = parseSection(wp, section2);
  const sec3 = parseSection(wp, section3);
  const sec4 = parseSection(wp, section4);
  // model.sections.push({ questions: sec1.questions });
  // model.sections.push({ questions: sec2.questions });
  // model.sections.push({ questions: sec3.questions });
  // model.sections.push({ questions: sec4.questions });

  model.sections.push({ questions: sec1.questions.map(q => ({ ...q, index: q.index - 1 })) });
  model.sections.push({ questions: sec2.questions.map(q => ({ ...q, index: q.index - 1 })) });
  model.sections.push({ questions: sec3.questions.map(q => ({ ...q, index: q.index - 1 })) });
  model.sections.push({ questions: sec4.questions.map(q => ({ ...q, index: q.index - 1 })) });

  let faultResult = {
    section1: sec1.missedQuestion,
    section2: sec2.missedQuestion,
    section3: sec3.missedQuestion,
    section4: sec4.missedQuestion
  };
  const result = await model.save();
  fs.unlink(csvfile, function (err) {
    console.log(err);
  });
  return { faultResult: faultResult, model: result };
}

function fillSection(wp, section, questions) {
  for (let i = 0; i < 25; i++) {
    const row = section.start + i;
    if (row > section.end) {
      break;
    }
    let question = questions[i];

    wp[`F${row}`] = question.question;
    // if (question.avatar) {
    //   wp[`J${row}`] = "https://www.jozoralqodrat.com/" + question.avatar;
    // }
    const answers = ["A", "B", "C", "D"];
    for (let k = 0; k < question.answerOptions.length; k++) {
      const col = answers[k];
      wp[`${col}${row}`] = question.answerOptions[k].answerBody;
      if (question.answerOptions[k].isCorrectAnswer) {
        wp[`E${row}`] = k + 1;
      }
    }
  }
}

async function exportToExcel(modelId) {
  var model = await Model.findById(modelId);
  console.log(modelId, model);

  var wb = {},
    ws_data = {},
    meta_data = {},
    ws_name = "questions",
    meta_ws_name = "meta";

  meta_data["A1"] = model.title;
  fillSection(ws_data, section1, model.sections[0].questions);
  fillSection(ws_data, section2, model.sections[1].questions);
  fillSection(ws_data, section3, model.sections[2].questions);
  fillSection(ws_data, section4, model.sections[3].questions);

  var ws = xslx.utils.aoa_to_sheet(ws_data);
  var meta_ws = xslx.utils.aoa_to_sheet(meta_data);
  /* Add the worksheet to the workbook */
  xslx.utils.book_append_sheet(wb, ws, ws_name);
  xslx.utils.book_append_sheet(wb, meta_ws, meta_ws_name);

  var wopts = { bookType: "xlsx", bookSST: false, type: "array" };

  var wbout = xslx.write(wb, wopts);
  console.log(wbout);

  // return the data and the met-data to return it to the client ;
  return {
    data: new Blob([wbout], { type: "application/octet-stream" }),
    name: `${model.title}.xlsx`
  };
}

async function synatizeData() {
  var models = await Model.find({});
  for (let i = 0; i < models.length; i++) {
    let model = models[i];

    let modelNeedUpdates = false;
    for (let s = 0; s < model.sections.length; s++) {
      let section = model.sections[s];
      for (let q = 0; q < section.questions.length; q++) {
        let question = section.questions[q];
        let remainngAnswers = 4 - question.answerOptions.length;
        if (remainngAnswers) {
          modelNeedUpdates = true;
          let length = question.answerOptions;
          for (let a = 0; a < remainngAnswers; a++) {
            model.sections[s].questions[q].answerOptions.push({
              answerBody: "",
              optionNumber: length + a,
              isCorrectAnswer: false
            });
          }
          console.log(model.sections[s].questions[q].answerOptions);
        }
      }
    }
    if (modelNeedUpdates) {
      console.log(model);
      let updated = await Model.findByIdAndUpdate(
        model._id,
        { $set: model },
        { new: true }
      );
      console.log(updated);
    }
  }
}

exports.synatizeData = synatizeData;
exports.exportToExcel = exportToExcel;
exports.Model = Model;
exports.validateModel = validateModel;
exports.addModel = addModel;
exports.editModel = editModel;
exports.deleteModel = deleteModel;
exports.getModel = getModel;
exports.getModelsOfPackage = getModelsOfPackage;
exports.getAllModels = getAllModels;
exports.getSections = getSections;
exports.excel = excel;

exports.fixlastquestion = fixlastquestion;
