var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const cors = require('cors');
const fs = require('fs');
const mongoose=require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.DBurl, {
  useNewUrlParser: true,
  useCreateIndex: true, 
  useUnifiedTopology: true, 
  useFindAndModify: false
}).then(data => {
  console.log("Connected to the DB");
}).catch(err => {
  console.log("Error connecting to the DB",err);
});
mongoose.Promise = global.Promise;

var adminRouter = require('./routes/admin');
var commonRouter = require('./routes/common');
var maintenanceRouter = require('./routes/maintenance');

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(cors())
app.use(express.static(path.join(__dirname, 'public')));

app.use('/user', commonRouter);
app.use('/admin',adminRouter);
app.use('/common',commonRouter);
app.use('/access',maintenanceRouter);

app.get('*',function(req,res){
  const indexFile=path.join(__dirname,'public','index.html');
  console.log(indexFile);
  if(fs.existsSync(indexFile))
  {
    res.sendFile(indexFile);
  }
  else
  {
    console.log('Index File does not exist');
    res.sendFile(path.join(__dirname,'error_pages','error.html'));
  }
})

module.exports = app;
