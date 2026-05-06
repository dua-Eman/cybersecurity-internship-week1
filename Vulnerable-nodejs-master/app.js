let createError = require('http-errors');
let express = require('express');
var helmet = require('helmet');
let session = require('express-session');
let path = require('path');
let cookieParser = require('cookie-parser');
let logger = require('morgan');
const winston = require('winston');

// Database
let mongo = require('mongodb');
let monk = require('monk');
let db = monk('localhost:27017/nodetest2');

let adminRouter = require('./routes/admin');
let usersRouter = require('./routes/users');
let loginRouter = require('./routes/index');
let pikachuRouter = require('./routes/pikachu');
let orderRouter = require('./routes/order');
// support php file exec
let phpRouter = require('./routes/php');

let app = express();

// Winston security logger
const securityLogger = winston.createLogger({
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: 'security.log'
    })
  ]
});

securityLogger.info('Application started');

// Helmet security headers
app.use(
  helmet({
    contentSecurityPolicy: false
  })
);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(session({
  secret: "Shh, its a secret!",
  resave: true,
  saveUninitialized: true,
  expires: new Date(Date.now() + (30 * 86400 * 1000)),
}));

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Make db accessible to router
app.use(function(req, res, next) {
  req.db = db;
  next();
});

app.use('/', adminRouter);
app.use('/users', usersRouter);
app.use('/', loginRouter);
app.use('/', pikachuRouter);
app.use('/', orderRouter);
app.use('/', phpRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {

  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;