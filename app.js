// Dependencies
var express = require('express');
var bodyParser = require('body-parser');
var oauthserver = require('oauth2-server');
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

// OAuth 2 configuration
app.oauth = oauthserver({
    model: require('./models/oauth'),
    grants: ['authorization_code', 'password', 'refresh-token'],
    debug: true
});
module.exports.oauth = app.oauth;
app.all('/oauth/token', app.oauth.grant());

// API endpoints
var fieldRoutes = require('./routes/fields');
var filterRoutes = require('./routes/filters');
var siteRoutes = require('./routes/sites');
var tagRoutes = require('./routes/tags');
var userRoutes = require('./routes/users');
app.use('/fields', fieldRoutes);
app.use('/filters', filterRoutes);
app.use('/sites', siteRoutes);
app.use('/tags', tagRoutes);
app.use('/users', userRoutes);

// Error handling
app.use(app.oauth.errorHandler());
app.use(function(req, res) {
  res.status(403).send("Not a valid API endpoint");
});

module.exports = app;