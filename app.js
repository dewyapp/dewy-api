// Dependencies
var express = require('express');
var bodyParser = require('body-parser');
var couchbase = require('couchbase');
var config = require("./config");
var app = express();

// Express configuration
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Global declaration of Couchbase
module.exports.bucket = (new couchbase.Cluster(config.couchbase.server)).openBucket(config.couchbase.bucket);

// API endpoints
var routes = require('./routes/api');
app.use('/', routes);

app.use(function(req, res) {
  res.status(403).send("Not a valid API end point");
});

module.exports = app;