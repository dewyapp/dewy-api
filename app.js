// Dependencies
var express = require('express');
var bodyParser = require('body-parser');
var couchbase = require('couchbase');
var config = require('./config');
var app = express();

// Express configuration
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Global declaration of Couchbase
module.exports.bucket = (new couchbase.Cluster(config.couchbase.server)).openBucket(config.couchbase.bucket, config.couchbase.password);

// Allow API access from dewy.io
app.use(function(req, res, next) {
    res.header('Access-Control-Allow-Origin', 'http://dewy.io');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');

    next();
});

// API endpoints
var routes = require('./routes/api');
app.use('/', routes);

app.use(function(req, res) {
  res.status(403).send("Not a valid API endpoint");
});

module.exports = app;