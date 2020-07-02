const ensureAuthorization = require("../middleware/ensureAuthorization");
const role = require("../middleware/role");
const {
  Exam,
  startExam,
  stopExam,
  isEnded,
  areEnded,
  editExam,
  updateProgsAns,
  getSingleExam,
  getExamReport,
  getExamAnswers,
  getPDF
} = require("../models/exam");
const express = require("express");
const router = express.Router();

router.get("/", ensureAuthorization, async (req, res) => {
  let exms = await Exam.find();
  res.send(exms);
});

router.get("/pdf/:id", async (req, res) => {
  console.log("Exam id in PDF is ... ", req.params.id);

  let data = await getExamReport(req.params.id);

  jsreport
    .render({
      template: {
        content: getPDF(),
        engine: "handlebars",
        recipe: "chrome-pdf",
        helpers:
          "function ifEq(arg1, arg2, options) { return (arg1 == arg2) ? options.fn(this) : options.inverse(this);} " +
          "function ifEqFirstArgPlus1(arg1, arg2, options) { return ((arg1 + 1) == arg2) ? options.fn(this) : options.inverse(this);} " +
          "function ifEqN(elm, num, options) {return (elm == num) ? options.fn(this) : options.inverse(this);}" +
          "function now() {return new Date().toLocaleDateString()}" +
          "function nowPlus20Days() {var date = new Date();date.setDate(date.getDate() + 20);return date.toLocaleDateString();}" +
          "function inc(index) {add = index + 1;return add;}" +
          "function total(items) {var sum = 0;items.forEach(function (i) {console.log('Calculating item ' + i.name + '; you should see this message in debug run');sum += i.price;});return sum;}" +
          `function getSymbol(isHeAnsweredRight, isAnswerRight, optionNuber, answerIndPlus1) {
                    if (isAnswerRight) {
                        return  '\&check;';
                    }
                    if(!isHeAnsweredRight && (answerIndPlus1 + 1 == optionNuber)){
                        return  '\&#x2179;';
                    }
                    return '-';
                }` +
          "function truncate(string){ return string.trim();}" +
          "function getLocalDate(dat ){return new Intl.DateTimeFormat('en-GB').format(dat);}" +
          "function parseHtml(content){var el = document.createElement( 'html' );el.innerHTML = content; return el; }"
      },
      data: data
    })
    .then(resp => {
      console.log(resp.meta);
      // res.setHeader('Content-Length', stat.size);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=model-report.pdf`
      );
      resp.stream.pipe(res);
    })
    .catch(e => {
      res.status(500).send(e.message);
    });
});

router.post("/startExam", ensureAuthorization, async (req, res) => {
  let start = await startExam(req);
  res.send(start);
});

router.post("/getExamAnswers", ensureAuthorization, async (req, res) => {
  console.log("Exam id is ... ", req.body.examId);

  let ex = await getExamReport(req.body.examId);
  res.send(ex);
});

router.post("/updateProgsAns", ensureAuthorization, async (req, res) => {
  let upd = await updateProgsAns(req);
  res.send(upd);
});

router.post("/stopExam", ensureAuthorization, async (req, res) => {
  let stop = await stopExam(req);
  res.send(stop);
});

router.post("/editExam", ensureAuthorization, async (req, res) => {
  let upd = await editExam(req);
  res.send(upd);
});

router.post("/updateUserProgress", ensureAuthorization, async (req, res) => {
  let upd = await updateUserProgress(req);
  res.send(upd);
});

router.post("/isEnded", ensureAuthorization, async (req, res) => {
  let isended = await isEnded(req);
  res.send(isended);
});

router.post("/areEnded", ensureAuthorization, async (req, res) => {
  let areended = await areEnded();
  res.send(areended);
});

router.post("/getSingleExam", ensureAuthorization, async (req, res) => {
  let exam = await getSingleExam(req);
  res.send(exam);
});

router.get("/del", async (req, res) => {
  let exam = await Exam.deleteMany();
  res.send(exam);
});

module.exports = router;
