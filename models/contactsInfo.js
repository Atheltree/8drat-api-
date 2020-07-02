const mongoose = require('mongoose');
const Joi = require('joi');


const contactInfoSchema = new mongoose.Schema({
    mail: {
        type: String,
        required: true,
        minlength: 5,
        maxlength: 255
    },
    facebook: {
        type: String,
        required: true,
        minlength: 5,
        maxlength: 1024
    },
    twitter: {
        type: String,
        required: true,
        minlength: 5,
        maxlength: 1024
    },
    whatsApp: {
        type: String,
        required: true,
        minlength: 5,
        maxlength: 1024
    },
    phone: {
        type: String,
        required: true,
        minlength: 5,
        maxlength: 1024
    },
    commission: {
        type: Number,
        max: 100,
        default: 0
    },
    bankName: {
        type: String,
        required: true,
        minlength: 5,
        maxlength: 1024
    },
    bankAccountNumber: {
        type: String,
        required: true,
        minlength: 5,
        maxlength: 1024
    },
    bankEban: {
        type: String,
        required: true,
        minlength: 5,
        maxlength: 1024,
    },
});
//bankName bankAccountNumber bankEban
const ContactInfo = mongoose.model('ContactInfo', contactInfoSchema);

function validateContactInfo(req, state) {
    let schema = {
        mail: Joi.string().min(5).max(255).required(),
        facebook: Joi.string().min(5).max(255).required(),
        twitter: Joi.string().min(5).max(255).required(),
        whatsApp: Joi.string().min(5).max(255).required(),
        phone: Joi.string().min(5).max(255).required(),
        bankName: Joi.string().min(5).max(255).required(),
        bankAccountNumber: Joi.string().min(5).max(255).required(),
        bankEban: Joi.string().min(5).max(255).required()
    };

    if (state) schema["_id"] = Joi.string().length(24).required();

    return Joi.validate(req, schema);
}


async function getcommission() {

    let res = await ContactInfo.findOne({})
    return res ? res.commission : 0;
}


exports.ContactInfo = ContactInfo;
exports.validateContactInfo = validateContactInfo;
exports.getcommission = getcommission;

