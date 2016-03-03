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

// Install Couchbase design documents
argv = process.argv.splice(2);
if (argv[0] === '--setup') {
    var design = require('./setup.js');
    design.setup(function(error, result) {
        if (error) {
            console.log(error);
        } else {
            console.log(result);
        }
        process.exit(0);
    });
}
// Run the audit
else if (argv[0] === '--audit') {
    var design = require('./admin.js');
    design.audit(function(error, result) {
        if (error) {
            console.log(error);
        } else {
            console.log(result);
        }
        process.exit(0);
    });
}
// Run the API
else {
    // Allow API access from dewy.io
    app.use(function(req, res, next) {
        res.header('Access-Control-Allow-Origin', 'http://dewy.io');
        res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        next();
    });

    // OAuth 2 configuration
    app.oauth = oauthserver({
        model: require('./models/oauth'),
        grants: ['authorization_code', 'password', 'refresh_token'],
        accessTokenLifetime: config.oauth.accessTokenLifetime,
        refreshTokenLifetime: config.oauth.refreshTokenLifetime,
        debug: false
    });
    module.exports.oauth = app.oauth;
    app.all('/oauth/token', app.oauth.grant());

    // API endpoints
    var fieldRoutes = require('./routes/fields');
    var filterRoutes = require('./routes/filters');
    var siteRoutes = require('./routes/sites');
    var userRoutes = require('./routes/users');
    app.use('/fields', fieldRoutes);
    app.use('/filters', filterRoutes);
    app.use('/sites', siteRoutes);
    app.use('/users', userRoutes);

    // Error handling
    app.use(app.oauth.errorHandler());
    app.use(function(req, res) {
      res.status(404).send("Not a valid API endpoint");
    });
}
module.exports = app;