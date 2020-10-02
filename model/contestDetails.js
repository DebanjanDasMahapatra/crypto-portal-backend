const mongoose = require('mongoose');
var Schema = mongoose.Schema;
var contestSchema=new Schema({
    "name": {
        type: String,
        required: true,
        unique: true
    },
    "description": {
        type: String,
        required: true
    },
    "startTime": {
        type: Date,
        required: true
    },
    "endTime": {
        type: Date,
        required: true
    },
    "rankList": {
        "show": {
            type: Boolean,
            default: false
        },
        "automaticHide": {
            type: Boolean,
            default: false
        },
        "timeOfHide": {
            type: Date,
            default: ''
        }
    },
    "questions": {
        type: Array,
        default: []
    },
    "allowedUsers": {
        type: Array,
        default: []
    },
    "imageUrl": {
        type: String,
        default: ""
    },
    "rules": {
        type: String,
        default: ""
    },
    "discussion": [{
        sender: {
            type: String,
            required: true
        },
        "message": {
            type: String,
            required: true
        },
        "createdAt": {
            type: Number,
            required: true
        }
    }],
    "announcement": [{
        "message": {
            type: String,
            required: true
        },
        "createdAt": {
            type: Number,
            required: true
        }
    }]
},{timestamps: true});

module.exports=mongoose.model('Contest',contestSchema);