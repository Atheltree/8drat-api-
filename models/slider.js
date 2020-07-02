const Joi = require('joi');
const mongoose = require('mongoose');


const sliderSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    image: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
});


const Slider = mongoose.model('Slider', sliderSchema);



async function add(input) {
    let { title, image, description } = input.body;
    let newSlider = (new Slider({ title, image, description })).save();
    return newSlider;
}


exports.Slider = Slider;
exports.add = add;


