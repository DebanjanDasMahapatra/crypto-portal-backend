const mongoose = require('mongoose');
var Schema = mongoose.Schema;
var questionSchema=new Schema({
    "title": {
        type: String,
        required: true,
        unique: true
    },
    "description":{
        type: String,
        required:true
    },
    "flag": {
        type: String,
        required: true
    },
    "points": {
        type: Number,
        required: true
    },
    "author": {
        type: String,
        required: true
    },
    "questionFile": {
        type: Array,
        default: []
    }
},{timestamps: true});

module.exports=mongoose.model('Question',questionSchema);