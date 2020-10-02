const mongoose = require('mongoose');
var Schema = mongoose.Schema;
var answerSchema = new Schema({
    "userEmail":{
        type: String,
        required: true
    },
    "contestName":{
        type: String,
        required: true
    },
    "questionTitle":{
        type: String,
        required: true
    },
    "points":{
        type: Number,
        required: true
    }
},{timestamps: true});

module.exports=mongoose.model("Answer",answerSchema.index({userEmail: 1, contestName: 1, questionTitle: 1}, {unique: true}));