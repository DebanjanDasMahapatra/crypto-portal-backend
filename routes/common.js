var express = require('express');
var router = express.Router();
const Auth = require('../middlewares/auth');
const helpers = require('../helperFunction/helpers');
const sha1 = require('sha1');
const jwt = require('jsonwebtoken');

const User = require('../model/userDetails')
const Contest = require('../model/contestDetails');
const Question = require('../model/questionDetails');
const Answer = require('../model/answerDetails');
const GCS = require('../helperFunction/gcs');

//Get file
router.get("/getFile/:cid/:file", (req, res) => {
	res.attachment(req.params.file);
	GCS.file(req.params.cid + "/" + req.params.file)
		.createReadStream()
		.pipe(res);
});

//Fetch All Emails and Contacts
router.get("/fetchECRs", (req, res) => {
	User.find({}, { contact: 1, email: 1, rcid: 1 }, (err, users) => {
		if (err)
			return res.status(500).json({
				status: false,
				message: "Fetching Emails Failed! Server Error..",
				error: err
			});
		return res.status(200).json({
			status: true,
			message: "Fetched successfully",
			users
		});
	});
});

//Register
router.post('/register', function (req, res) {
	var userdata = req.body;
	userdata.password = sha1(req.body.password);
	new User(userdata).save().then(data => {
		if (data) {
			return res.status(200).json({
				status: true,
				message: "Registration successful",
				email: userdata.email
			})
		}
		else {
			return res.status(500).json({
				status: false,
				message: "Registration Failed! Try again..",
				error: "Unknown"
			})
		}
	}).catch(err => {
		return res.status(500).json({
			status: false,
			message: "Registration Failed! Server Error..",
			error: err
		})
	})
})

//Login
router.post('/login', function (req, res) {
	const pos = process.env.ADMIN_EMAILS.split(",").indexOf(req.body.email);
	if (pos == -1) {
		User.findOne({ email: req.body.email }, (err, item) => {
			if (err) {
				console.log(err);
				return res.status(500).json({
					status: false,
					message: "Login Failed! Server Error..",
					error: err
				});
			}
			if (item == null) {
				res.status(200).json({
					status: false,
					message: "User does not exist"
				});
			} else {
				if (item.password == sha1(req.body.password)) {
					var user = item.toJSON();
					delete user['password'];
					user.admin = false;
					jwt.sign(user, process.env.secretKey, { expiresIn: "1d" }, (err, token) => {
						if (err) {
							res.status(500).json({
								status: false,
								message: "Problem signing in"
							});
						}
						res.status(200).json({
							status: true,
							token,
							message: "Logged in successfully",
						});
					});
				} else {
					res.status(401).json({
						status: false,
						message: "Incorrect password"
					});
				}
			}
		})
	} else {
		if (process.env.ADMIN_PASSES.split(",")[pos] != req.body.password) {
			res.status(401).json({
				status: false,
				message: "Incorrect password"
			});
		} else {
			jwt.sign({
				email: req.body.email,
				admin: true
			}, process.env.secretKey, { expiresIn: "1d" }, (err, token) => {
				if (err) {
					res.status(500).json({
						status: false,
						message: "Problem signing in"
					});
				}
				res.status(200).json({
					status: true,
					token,
					message: "Logged in successfully"
				});
			});
		}
	}
})

//Solve Question
router.post('/solveQuestion/:cName/:qTitle', Auth.authenticateAll, function (req, res) {
	Contest.findOne({name:req.params.cName}, (err, contest) => {
		if (err) {
			return res.status(500).json({
				status: false,
				message: "Solve Question Failed!! Server error..",
				error: err
			})
		}
		if (contest) {
			if (contest.questions.indexOf(req.params.qTitle) == -1 || contest.allowedUsers.indexOf(req.user.email) == -1) {
				return res.status(403).json({
					status: false,
					message: "Access Denied",
					error: "Unauthorized access"
				})
			}
			if(!helpers.flagRank(contest).isFlag)
				return res.status(200).json({
					status: false,
					message: "Submission Closed"
				})
			Question.findOne({title: req.params.qTitle}, (err, ques) => {   //ctbm
				if (err) {
					return res.status(500).json({
						status: false,
						message: "Solve Question Failed!! Server error..",
						error: err
					})
				}
				if (ques) {
					if (ques.flag == req.body.flag) {
						var answerData = {
							userEmail: req.user.email,
							contestName: contest.name,
							questionTitle: ques.title,
							points: ques.points
						}
						new Answer(answerData).save().then(data => {
							if (data) {
								return res.status(200).json({
									status: true,
									message: "Question solved successfully"
								})
							}
							else {
								return res.status(200).json({
									status: false,
									message: "Question solve Failed! Try again..",
									error: "Unknown"
								})
							}
						}).catch(err => {
							return res.status(500).json({
								status: false,
								message: "Question solve Failed! Server error..",
								error: err
							})
						})
					}
					else {
						return res.status(200).json({
							status: false,
							message: "The Flag is Incorrect",
							error: "Incorrect Flag"
						})
					}
				}
				else {
					return res.status(500).json({
						status: false,
						message: "Solve Question Failed!! Try again..",
						error: "Unauthorized access!!"
					})
				}
			})
		}
		else {
			return res.status(500).json({
				status: false,
				message: "Solve Question Failed!! Try again..",
				error: "Unauthorized access!!"
			})
		}
	})

})

//Get All Contests
router.get('/getAllContest',Auth.authenticateAll,function(req,res){
    Contest.find({allowedUsers: req.user.email},{allowedUsers: 0},(err,contests)=> {
        if(err)
        {
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
router.get('/getContest/:cName',Auth.authenticateAll,function(req,res){
    Contest.findOne({name: req.params.cName, allowedUsers: req.user.email},{allowedUsers: 0},(err,contest)=> {
        if(err)
        {
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

//Get Contest Question
router.get('/getContestQuestion/:cName',Auth.authenticateAll,function(req,res){
    Contest.findOne({name:req.params.cName, allowedUsers: req.user.email}, (err,contest)=> {
        if(err)
        {
            return res.status(500).json({
                status: false,
                message: "Error in finding contest! Server error...",
                error: err
            })
        }
        if(contest)
        {
            Question.find({title: contest.questions},{flag: 0},(err,quesS)=> {
                if(err)
                {
                    return res.status(500).json({
                        status: false,
                        message: "Error in finding question! Server error...",
                        error: err
                    })
                }
                return res.status(200).json({
                    status: true,
                    message: "Question fetched successfully",
                    data: {questions: quesS, contestInfo: contest}
                })
            })
        }
        else
        {
            return res.status(403).json({
                status: false,
                message: "Access Denied",
                data: null
            })
        }
    })
})

//Get allowed contest name for profile and local Storage
router.get('/getAllowedContestName',Auth.authenticateAll,function(req,res){
    Contest.find({allowedUsers: req.user.email},{name:1},(err,item)=> {
        if(err)
        {
            return res.status(500).json({
                status: false,
                message: "Error in finding contest! Server error...",
                error: err
            })
        }
        return res.status(200).json({
            status: true,
            message: "Contest name fetched successfully",
            data: item
        })
    })
})

//Get Solutions for ranklist
router.get('/getSolutions/:cName',Auth.authenticateAll,function(req,res){
    Contest.findOne({name:req.params.cName,allowedUsers: req.user.email},{name:1,startTime:1,endTime:1,rankList:1},(err,contest)=> {
        if(err)
		{
			return res.status(500).json({
				status: false,
				message: "Contest Fetch Failed!! Server error..",
				error: err
			})
        }
        if(contest)
        {
            if(helpers.flagRank(contest).isRanklist)
                Answer.find({contestName: contest.name},{userEmail: 1, points: 1},(err,data)=> {
                    if(err)
                    {
                        return res.status(500).json({
                            status: false,
                            message: "Solutions Failed!! Server error..",
                            error: err
                        })
                    }
                    return res.status(200).json({
                        status: true,
                        message: "Solutions fetched successfully",
                        data: data,
                        contest
                    })
                })
            else
            {
                return res.status(200).json({
                    status: false,
                    message: "Ranklist hidden",
                    data: []
                })
            }
        }
        else
        {
            return res.status(500).json({
				status: false,
				message: "Contest does not exist"
			})
        }
    })
})

//Get Solution for user
router.get('/getSolution/:cName',Auth.authenticateAll,function(req,res){
    Answer.find({contestName: req.params.cName, userEmail: req.user.email},{points: 0},(err,data)=> {
        if(err)
        {
            return res.status(500).json({
                status: false,
                message: "Solutions Failed!! Server error..",
                error: err
            })
        }
        return res.status(200).json({
            status: true,
            message: "Solutions fetched successfully",
            data: data
        })
    })
})

//Fetch Server time
router.get('/time', (req, res) => {
    return res.status(200).json({
        status: true,
        date: new Date()
    })
});

//Add discussion in cName
router.post('/addDiscussion/:cName',Auth.authenticateAll,(req,res)=> {
    Contest.updateOne({name:req.params.cName},{$push: {"discussion": {...req.body,sender:req.user.email}}},(err,item)=> {
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
router.get('/getAllDiscussion/:cName',Auth.authenticateAll,(req,res)=> {
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
router.get('/getAllAnnouncement/:cName',Auth.authenticateAll,(req,res)=> {
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

//Get Points for Profile
router.get('/getPoints',Auth.authenticateAll,(req,res)=> {
    Answer.aggregate([
        {
            $match: {
                $and: [{ "userEmail": req.user.email }]
            }
        },
        {
            $group: {
                _id: "$contestName",
                totalPoints: { $sum : "$points"}
            }
        }
    ],(err,data)=> {
        if (err) {
            console.log(err);
            return res.status(500).json({
                status: false,
                message: "Points fetch Failed!! Server error..",
                error: err
            })
        }
        return res.status(200).json({
            status: true,
            message: "Points fetched successfully!!",
            data: data
        })
    })
})


module.exports = router;