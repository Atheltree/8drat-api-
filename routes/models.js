const ensureAuthorization = require("../middleware/ensureAuthorization");
const role = require("../middleware/role");
const {
  synatizeData,
  exportToExcel,
  Model,
  fixlastquestion,
  deleteModel,
  addModel,
  editModel,
  getModel,
  getModelsOfPackage,
  getAllModels,
  getSections,
  excel
} = require("../models/model");
const express = require("express");
const { upload } = require("../services/helper");
const router = express.Router();

router.get("/getModelsOfPackage", ensureAuthorization, async (req, res) => {
  let all = await getModelsOfPackage(req);
  res.send(all);
});

router.get("/synatizeData", async (req, res) => {
  let fileExport = await synatizeData();
  res.send({ status: "ok" });
});

router.get("/export/:id", async (req, res) => {
  let fileExport = await exportToExcel(req.params.id);
  console.log(fileExport);

  res.set({
    "Cache-Control": "no-cache",
    "Content-Type": "application/vnd.openxmlformats",
    "Content-Disposition": "attachment; filename=" + fileExport.name
  });

  fileExport.data.pipe(res);
});

router.post("/getSections", ensureAuthorization, async (req, res) => {
  let getSecs = await getSections(req);
  res.send(getSecs);
});

router.get("/", ensureAuthorization, async (req, res) => {
  let all = await getAllModels();
  res.send(all);
});


router.get("/getModel", ensureAuthorization, async (req, res) => {
  let model = await getModel(req);
  res.send(model);
});

router.get("/count", async (req, res) => {
  const count = await Model.estimatedDocumentCount();

  res.send(count.toString());
});

router.post("/search", ensureAuthorization, async (req, res) => {
  console.log(req.body.text);

  const docs = await Model.find({
    title: { $regex: req.body.text, $options: "i" }
  });

  res.send(docs);
});

router.post("/add", ensureAuthorization, async (req, res) => {
  let add = await addModel(req);
  res.send(add);
});

router.post("/delete", ensureAuthorization, async (req, res) => {
  let del = await deleteModel(req);
  res.send(del);
});

router.post("/update", ensureAuthorization, async (req, res) => {
  let edt = await editModel(req);
  res.send(edt);
});

router.get("/count", async (req, res) => {
  let docs = await Model.find({}).count();

  res.send(docs);
});

router.post("/scrool", ensureAuthorization, async (req, res) => {
  let pageNum = parseInt(req.body.page) || 1;
  let querySearch = req.body.text || "";
  const pageSize = 10;

  let docs = await Model.find({ title: { $regex: querySearch, $options: "i" } })
    .sort(req.body.sort)
    .skip((pageNum - 1) * pageSize)
    .limit(10);

  res.send(docs);
});

router.get("/deleteModel", ensureAuthorization, async (req, res) => {
  let delMod = await deleteModel(req);
  res.send(delMod);
});

router.get("/aa", ensureAuthorization, async (req, res) => {
  //let delMod = await deleteModel(req);
  let model = await Model.findOne();
  for (let i = 0; i < model.sections.length; i++) {
    for (let j = 0; j < model.sections[i].questions.length; j++) {
      model.sections[i].questions[j]["index"] = j;
    }
  }
  model.save();
  res.send(model);
});

router.get("/deleteModel", ensureAuthorization, async (req, res) => {
  let delMod = await deleteModel(req);
  res.send(delMod);
});

router.post(
  "/excel",
  ensureAuthorization,
  upload.single("file"),
  async (req, res) => {
    let exc = await excel(req);
    res.send(exc);
  }
);

router.get("/fix", async (req, res) => {
  await fixlastquestion();
  res.send("ok done");
});

module.exports = router;
