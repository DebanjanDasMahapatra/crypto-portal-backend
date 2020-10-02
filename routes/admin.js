var express = require('express');
var router = express.Router();
const Auth = require('../middlewares/auth');
const Contest = require('../model/contestDetails');
const Question = require('../model/questionDetails');
const User = require('../model/userDetails');
const Answer = require('../model/answerDetails');
const multer = require("multer");
const GCS = require('../helperFunction/gcs');
const uploadFile = multer({ storage: multer.memoryStorage() });


//Upload File function
const uploadFiles = (qTitle, req, res) => {
    let promises = [];
    req.files.forEach(file => {
        promises.push(new Promise((resolve, reject) => {
            const bs = GCS.file(qTitle + "/" + file.originalname).createWriteStream({ resumable: false });
            bs.on("finish", () => {
                resolve(true);
            })
            .on("error", err => {
                reject(false);
            })
            .end(file.buffer);
        }));
    });
    return Promise.all(promises);
}

//Add Contest
router.post('/addContest', Auth.authenticateAdmin, function (req, res) {
    var contestData = req.body;
    new Contest(contestData).save().then(data => {
        if (data) {
            return res.status(200).json({
                status: true,
                message: "Contest addition successful",
                cid: data._id
            })
        }
        else {
            return res.status(500).json({
                status: false,
                message: "Contest addition Failed! Try again..",
                error: "Unknown"
            })
        }
    }).catch(err => {
        return res.status(500).json({
            status: false,
            message: "Contest addition Failed! Server error..",
            error: err
        })
    })
})

//Add Question in contest or only in database
router.post('/addQuestion/:cName',Auth.authenticateAdmin,uploadFile.array('files[]', 5), function (req, res) {
    var questionData = JSON.parse(req.body.question);
    let fileNames = [];
    req.files.forEach(file => fileNames = [...fileNames,file.originalname]);
    questionData.questionFile = fileNames;
    new Question(questionData).save().then(data => {
        if (data) {
            uploadFiles(data.title, req, res).then(uploaded => {
                if (req.params.cName == 'new') {
                    return res.status(200).json({
                        status: true,
                        message: "Question added!"
                    })
                }
                Contest.findOne({name:req.params.cName}, (err, contest) => {
                    if (err) {
                        return res.status(500).json({
                            status: false,
                            message: "Error in finding contest",
                            error: err
                        })
                    }
                    if (contest) {
                        contest.questions = [...contest.questions, data.title];
                        contest.save().then(item => {
                            return res.status(200).json({
                                status: true,
                                message: "Question added in contest: " + contest.name
                            })
                        }).catch(err => {
                            return res.status(500).json({
                                status: false,
                                message: "Error in saving Contest",
                                error: err
                            })
                        })
                    }
                    else {
                        return res.status(200).json({
                            status: false,
                            message: "Contest does not exist but Question added!"
                        })
                    }
                })
            }).catch(err => {
                console.log(err);
                res.status(500).json({
                    status: 0,
                    error: "Internal Server Error during Upload"
                });
            });            
            
            
        }
        else {
            return res.status(500).json({
                status: false,
                message: "Question addition Failed! Try again..",
                error: "Unknown"
            })
        }
    }).catch(err => {
        return res.status(500).json({
            status: false,
            message: "Question addition Failed! Server error..",
            error: err
        })
    })
})

//Migrate Questions
router.post('/migrateQuestion/:cName', Auth.authenticateAdmin, function (req, res) {
    Contest.findOne({name: req.params.cName}, (err, contest) => {
        if (err) {
            return res.status(500).json({
                status: false,
                message: "Error in finding contest",
                error: err
            })
        }
        if (contest) {
            contest.questions = req.body.questions;
            contest.save().then(item => {
                return res.status(200).json({
                    status: true,
                    message: "Question added in contest: " + contest.name
                })
            }).catch(err => {
                return res.status(500).json({
                    status: false,
                    message: "Error in saving Contest",
                    error: err
                })
            })
        }
        else {
            return res.status(200).json({
                status: false,
                message: "Contest does not exist"
            })
        }
    })
})

//Add Allowed Users in Contest
router.post('/addAllowedUser/:cName', Auth.authenticateAdmin, function (req, res) {
    Contest.findOne({name: req.params.cName}, (err, contest) => {
        if (err) {
            return res.status(500).json({
                status: false,
                message: "Error in finding contest",
                error: err
            })
        }
        if (contest) {
            contest.allowedUsers = req.body.users;
            contest.save().then(item => {
                return res.status(200).json({
                    status: true,
                    message: "Users email added in contest: " + contest.name
                })
            }).catch(err => {
                return res.status(200).json({
                    status: false,
                    message: "Users addition Failed! Try again...",
                    error: err
                })
            })
        }
        else {
            return res.status(200).json({
                status: false,
                message: "Contest does not exist"
            })
        }
    })
})

//Get Allowed Users in Contest
router.get('/getAllowedUsers/:cName', Auth.authenticateAdmin, function (req, res) {
    Contest.findOne({name:req.params.cName}, { allowedUsers: 1 }, (err, item) => {
        if (err) {
            return res.status(500).json({
                status: false,
                message: "Error in finding contest",
                error: err
            })
        }
        if(item)
        {
            return res.status(200).json({
                status: true,
                message: "Allowed users fetched successfully",
                data: item.allowedUsers
            })
        }
        return res.status(500).json({
            status: false,
            message: "Contest find error!"
        })
    })
})

//Toggle ranklist
router.get('/toggleRankList/:cId', Auth.authenticateAdmin, function (req, res) {
    Contest.findById(req.params.cId, (err, contest) => {
        if (err) {
            return res.status(500).json({
                status: false,
                message: "Error in finding contest",
                error: err
            })
        }
        if (contest) {
            var msg = "Ranklist is visible!!"
            if (contest.rankList.show) {
                msg = "Ranklist is hidden!!"
                contest.rankList.show = false;
            }
            else {
                contest.rankList.show = true;
            }
            contest.save().then(item => {
                return res.status(200).json({
                    status: true,
                    message: msg
                })
            }).catch(err => {
                return res.status(500).json({
                    status: false,
                    message: "Error in toggling",
                    error: err
                })
            })
        }
        else {
            return res.status(200).json({
                status: false,
                message: "Contest does not exist"
            })
        }
    })
})

//Get All Contests
router.get('/getAllContest', Auth.authenticateAdmin, function (req, res) {
    Contest.find({}, (err, contests) => {
        if (err) {
            return res.status(500).json({
                status: false,
                message: "Error in finding contest! Server error...",
                error: err
            })
        }
        return res.status(200).json({
            status: true,
            message: "Contests fetched successfully",
            data: contests
        })
    })
})

//Get One Contest
router.get('/getContest/:cName', Auth.authenticateAdmin, function (req, res) {
    Contest.findOne({ name: req.params.cName }, (err, contest) => {
        if (err) {
            return res.status(500).json({
                status: false,
                message: "Error in finding contest! Server error...",
                error: err
            })
        }
        return res.status(200).json({
            status: true,
            message: "Contest fetched successfully",
            data: contest
        })
    })
})

//Get All Questions
router.get('/getAllQuestion', Auth.authenticateAdmin, function (req, res) {
    Question.find({}, (err, questions) => {
        if (err) {
            return res.status(500).json({
                status: false,
                message: "Error in finding questions! Server error...",
                error: err
            })
        }
        return res.status(200).json({
            status: true,
            message: "Questions fetched successfully",
            data: questions
        })
    })
})

//Get Contest Question
router.get('/getContestQuestion/:cName', Auth.authenticateAdmin, function (req, res) {
    Contest.findOne({ name: req.params.cName }, (err, contest) => {
        if (err) {
            return res.status(500).json({
                status: false,
                message: "Error in finding contest! Server error...",
                error: err
            })
        }
        if(contest)
        {
            //Ctbm
            Question.find({ title: contest.questions }, (err, quesS) => {
                if (err) {
                    return res.status(500).json({
                        status: false,
                        message: "Error in finding question! Server error...",
                        error: err
                    })
                }
                return res.status(200).json({
                    status: true,
                    message: "Question fetched successfully",
                    data: quesS
                })
            })
        }
        else
        {
            return res.status(500).json({
                status: false,
                message: "Contest does not exist!"
            })
        }
        
    })
})

//Get allowed contest id
router.get('/getAllowedContestName', Auth.authenticateAdmin, function (req, res) {
    Contest.find({}, { name: 1 }, (err, item) => {
        if (err) {
            return res.status(500).json({
                status: false,
                message: "Error in finding contest! Server error...",
                error: err
            })
        }
        return res.status(200).json({
            status: true,
            message: "Contest id fetched successfully",
            data: item
        })
    })
})

//Get One Question
router.get('/getQuestion/:qTitle', Auth.authenticateAdmin, function (req, res) {
    Question.findOne({ title: req.params.qTitle }, (err, question) => {
        if (err) {
            return res.status(500).json({
                status: false,
                message: "Error in finding question! Server error...",
                error: err
            })
        }
        return res.status(200).json({
            status: true,
            message: "Question fetched successfully",
            data: question
        })
    })
})

//Get All Users
router.get('/getAllUsers', Auth.authenticateAdmin, function (req, res) {
    User.find({}, (err, item) => {
        if (err) {
            return res.status(500).json({
                status: false,
                message: "Error in finding users! Server error...",
                error: err
            })
        }
        return res.status(200).json({
            status: true,
            message: "Users fetched successfully",
            data: item
        })
    })
})

//Get One User
router.get('/getUser/:uId', Auth.authenticateAdmin, function (req, res) {
    User.findById(req.params.uId, (err, item) => {
        if (err) {
            return res.status(500).json({
                status: false,
                message: "Error in finding user! Server error...",
                error: err
            })
        }
        if (item) {
            return res.status(200).json({
                status: true,
                message: "User fetched successfully",
                data: item
            })
        }
        else {
            return res.status(500).json({
                status: false,
                message: "User does not exist"
            })
        }
    })
})

//Get Solves
router.get('/getSolves/:cName', Auth.authenticateAdmin, function (req, res) {
    Answer.find({ contestName: req.params.cName }, (err, item) => {
        if (err) {
            return res.status(500).json({
                status: false,
                message: "Error in finding users! Server error...",
                error: err
            })
        }
        return res.status(200).json({
            status: true,
            message: "Solutions fetched successfully",
            data: item
        })
    })
})

//Get Solutions for ranklist
router.get('/getSolutions/:cName', Auth.authenticateAdmin, function (req, res) {
    Answer.aggregate([
        {
            $lookup:
            {
                from: 'users',
                localField: 'userEmail',
                foreignField: 'email',
                as: 'userDetails'
            }
        },
        { $unwind: "$userDetails" },
        {
            $match: {
                $and: [{ "contestName": req.params.cName }]
            }
        },
        {
            $project: {
                _id: 1,
                userEmail: 1,
                contestName: 1,
                questionTitle: 1,
                points: 1,
                name: "$userDetails.name",
                contact: "$userDetails.contact",
                instituteName: "$userDetails.instituteName"
            }
        }
    ], (err, data) => {
        if (err) {
            console.log(err);
            return res.status(500).json({
                status: false,
                message: "Join Failed!! Server error..",
                error: err
            })
        }
        return res.status(200).json({
            status: true,
            message: "User Ranklist fetched successfully!!",
            data: data
        })
    })
})

//Edit Contest
router.put('/editContest/:cName', Auth.authenticateAdmin, function (req, res) {
    Contest.findOne({ name: req.params.cName }, (err, item) => {
        if (err) {
            return res.status(500).json({
                status: false,
                message: "Error in finding contest! Server error...",
                error: err
            })
        }
        if (item) {
            item.description = req.body.description;
            item.startTime = req.body.startTime;
            item.endTime = req.body.endTime;
            item.rankList = req.body.rankList;
            item.imageUrl = req.body.imageUrl;
            item.rules = req.body.rules;
            item.save().then(data => {
                if (data) {
                    return res.status(200).json({
                        status: true,
                        message: "Contest saved successfully"
                    })
                }
                else {
                    return res.status(500).json({
                        status: false,
                        message: "Edit Contest Failed! Try again..",
                        error: "Unknown"
                    })
                }
            }).catch(err => {
                return res.status(500).json({
                    status: false,
                    message: "Edit Contest Failed! Server error..",
                    error: err
                })
            })
        }
        else {
            return res.status(500).json({
                status: false,
                message: "Contest does not exist"
            })
        }
    })
})

//Edit Question
router.put('/editQuestion/:qTitle',Auth.authenticateAdmin, uploadFile.array('files[]', 5), function (req, res) {
    uploadFiles(req.params.qTitle, req, res).then(success => {
        let fileNames = [];
        req.files.forEach(file => fileNames = [...fileNames,file.originalname]);
        Question.findOne({title: req.params.qTitle}, (err, item) => {
            if (err) {
                return res.status(500).json({
                    status: false,
                    message: "Error in finding question! Server error...",
                    error: err
                })
            }
            if (item) {
                var questionData = JSON.parse(req.body.question);
                item.description = questionData.description;
                item.flag = questionData.flag;
                item.points = questionData.points;
                item.author = questionData.author;
                item.questionFile = [...item.questionFile,...fileNames];
                item.save().then(data => {
                    if (data) {
                        return res.status(200).json({
                            status: true,
                            message: "Question saved successfully"
                        })
                    }
                    else {
                        return res.status(500).json({
                            status: false,
                            message: "Edit Question Failed! Try again..",
                            error: "Unknown"
                        })
                    }
                }).catch(err => {
                    return res.status(500).json({
                        status: false,
                        message: "Edit Question Failed! Server error..",
                        error: err
                    })
                })
            }
            else {
                return res.status(500).json({
                    status: false,
                    message: "Question does not exist"
                })
            }
        })
    }).catch(err=> {
        return res.status(500).json({
            status: false,
            message: "Editing File Failed! Server Error..",
            error: err
        });
    })
})

//Delete User
router.delete('/deleteUser/:uId', Auth.authenticateAdmin, function (req, res) {
    Contest.updateMany({}, { $pull: { allowedUsers: req.params.uId } }, (err, data) => {
        if (err) {
            return res.status(500).json({
                status: false,
                message: "Error in deleting user from contest! Server error...",
                error: err
            })
        }
        User.findOneAndRemove({ email: req.params.uId }, (err, item) => {
            if (err) {
                return res.status(500).json({
                    status: false,
                    message: "Error in deleting user! Server error...",
                    error: err
                })
            }
            if (item) {
                Answer.deleteMany({questionTitle: item.email},(err,data)=> {
                    if (err) {
                        return res.status(500).json({
                            status: false,
                            message: "Error in deleting answer! Server error...",
                            error: err
                        })
                    }
                    return res.status(200).json({
                        status: true,
                        message: "User deletion successful",
                        data: item.email
                    })
                })
            }
            else {
                return res.status(200).json({
                    status: false,
                    message: "User does not exist! Try again",
                    error: "User find error"
                })
            }
        })
    })
})

//Delete Contest
router.delete('/deleteContest/:cName', Auth.authenticateAdmin, function (req, res) {
    Contest.findOneAndRemove({name: req.params.cName}, (err, item) => {
        if (err) {
            return res.status(500).json({
                status: false,
                message: "Error in deleting contest! Server error...",
                error: err
            })
        }
        if (item) {
            Answer.deleteMany({contestName: item.name},(err,data)=> {
                if (err) {
                    return res.status(500).json({
                        status: false,
                        message: "Error in deleting answer! Server error...",
                        error: err
                    })
                }
                return res.status(200).json({
                    status: true,
                    message: "Contest deletion successful",
                    data: item.name
                })
            })
        }
        else {
            return res.status(200).json({
                status: false,
                message: "Contest does not exist! Try again",
                error: "Contest find error"
            })
        }
    })
})

//Delete File
router.delete("/deleteFile/:qTitle/:fName",Auth.authenticateAdmin, (req, res) => {
    Question.updateOne({title:req.params.qTitle},{$pull: {"questionFile": req.params.fName}} , (err, data) => {
        if (err)
        return res.status(500).json({
            status: false,
            message: "Deleting File Failed! Server Error..",
            error: err
        });
        if(data) {
            let deleteFile = async() => {
                await GCS.file(req.params.qTitle+'/'+req.params.fName).delete();
                    return res.status(200).json({
                    status: true,
                    message: "File "+req.params.fName+" Deleted"
                });
            }
            deleteFile().catch(err => {
                console.log(err);
                return res.status(500).json({
                    status: false,
                    message: 'Cannot Delete Question File',
                    error: err
                });
            });
        }
        else
            return res.status(500).json({
                status: false,
                message: "Deletion Failed"
            });
    });
});

//Delete Question
router.delete('/deleteQuestion/:qTitle', Auth.authenticateAdmin, function (req, res) {
    Contest.updateMany({}, { $pull: { questions: req.params.qTitle } }, (err, data) => {
        if (err) {
            return res.status(500).json({
                status: false,
                message: "Error in deleting question from contest! Server error...",
                error: err
            })
        }
        Question.findOneAndRemove({title: req.params.qTitle}, (err, item) => {
            if (err) {
                return res.status(500).json({
                    status: false,
                    message: "Error in deleting question! Server error...",
                    error: err
                })
            }
            if (item) {
                Answer.deleteMany({questionTitle: item.title},(err,data)=> {
                    if (err) {
                        return res.status(500).json({
                            status: false,
                            message: "Error in deleting answer! Server error...",
                            error: err
                        })
                    }
                    return res.status(200).json({
                        status: true,
                        message: "Question deletion successful",
                        data: item.title
                    })
                })
            }
            else {
                return res.status(200).json({
                    status: false,
                    message: "Question does not exist! Try again",
                    error: "Question find error"
                })
            }
        })
    })
})

//Add announcement in cId
router.post('/addAnnouncement/:cName',Auth.authenticateAdmin,(req,res)=> {
    var announcementData = req.body;
    announcementData.createdAt=Date.now();
    Contest.updateOne({name:req.params.cName},{$push: {"announcement": announcementData}},(err,item)=> {
        if(err)
        {
            console.log(err);
            return res.status(500).json({
                status: false,
                message: "Announcement addition Failed! Server error..",
                error: err
            })
        }
        return res.status(200).json({
            status: true,
            message: "Add Announcement successful"
        });
    })
})

//Add discussion in cId
router.post('/addDiscussion/:cName',Auth.authenticateAdmin,(req,res)=> {
    Contest.updateOne({name:req.params.cName},{$push: {"discussion": req.body}},(err,item)=> {
        if(err)
        {
            return res.status(500).json({
                status: false,
                message: "Discussion addition Failed! Server error..",
                error: err
            })
        }
        return res.status(200).json({
            status: true,
            message: "Add Discussion successful"
        });
    })
})

//Get all discussions for a Contest Id
router.get('/getAllDiscussion/:cName',Auth.authenticateAdmin,(req,res)=> {
    Contest.findOne({name:req.params.cName},{discussion: 1},(err,data)=> {
        if(err)
        {
            return res.status(500).json({
                status: false,
                message: "Discussion Fetch Failed!! Server error..",
				error: err
            })
        }
        if(data)
            return res.status(200).json({
                status: true,
                message: "Discussion fetched successfully!",
                data: data.discussion
            })
        else
            return res.status(500).json({
                status: false,
                message: "Contest find error! Try again!!"
            })
    })
})

//Get all announcements for a Contest Id
router.get('/getAllAnnouncement/:cName',Auth.authenticateAdmin,(req,res)=> {
    Contest.findOne({name:req.params.cName},{announcement: 1},(err,data)=> {
        if(err)
        {
            return res.status(500).json({
                status: false,
                message: "Announcement Fetch Failed!! Server error..",
				error: err
            })
        }
        if(data)
            return res.status(200).json({
                status: true,
                message: "Announcement fetched successfully!",
                data: data.announcement
            })
        else
            return res.status(500).json({
                status: false,
                message: "Contest find error! Try again!!"
            })
    })
})

module.exports = router;