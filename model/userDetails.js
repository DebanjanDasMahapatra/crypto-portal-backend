const mongoose = require('mongoose');
var Schema = mongoose.Schema;
var userSchema=new Schema({
    "name": {
        type: String,
        required: true
    },
    "email": {
        type: String,
        required: true,
        unique: true
    },
    "stream": {
        type: String,
        default: ""
    },
    "year": {
        type: String,
        default: ""
    },
    "instituteName": {
        type: String,
        default: ""
    },
    "contact": {
        type: String,
        required: true,
        unique: true
    },
    "password": {
        type: String,
        required: true
    },
    "rcid": {
        type: Number,
        required: true,
        unique: true
    },
    "otp": {
        type: String,
        default: ""
    }
},{timestamps: true});

module.exports=mongoose.model('User',userSchema);