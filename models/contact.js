const mongoose = require('mongoose');
const Joi = require('joi');


const contactSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    title: {
        type: String,
        required: true,
        minlength: 5,
        maxlength: 255
    },
    message: {
        type: String,
        required: true,
        minlength: 5,
        maxlength: 1024
    },
    name: {
        type: String,
    },
    email: {
        type: String
    }
});

const Contact = mongoose.model('Contact', contactSchema);

function validateContact(req, state) {
    let schema = {
        title: Joi.string().min(5).max(255).required(),
        message: Joi.string().min(5).max(1024).required(),
        name: Joi.optional(),
        email: Joi.optional()

    };

    if (state) schema["_id"] = Joi.string().length(24).required();


    return Joi.validate(req, schema);
}

exports.Contact = Contact;
exports.validateContact = validateContact;


