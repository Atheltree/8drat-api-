const Joi = require('joi');
const mongoose = require('mongoose');


const subjectSchema = new mongoose.Schema({

    name: {
        type: String,
        required: true,
        minlength: 2,
        maxlength: 50
    }
});

const Subject = mongoose.model('Subject', subjectSchema);


function validateSubject(req, state) {
    let schema = {

        name: Joi.string().required()

    };

    if (state) schema["_id"] = Joi.string().length(24).required();


    return Joi.validate(req, schema);
}






exports.Subject = Subject;
exports.validateSubject = validateSubject;

