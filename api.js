#!/usr/bin/env node

// Dependencies
var express = require('express');
var bodyParser = require('body-parser');
var oauthserver = require('oauth2-server');
var couchbase = require('couchbase');
var program = require('commander');
var config = new require('./config')();

var app = express();

// Express configuration
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Global declaration of Couchbase
module.exports.bucket = (new couchbase.Cluster(config.couchbase.server)).openBucket(config.couchbase.bucket, config.couchbase.password);

// Allow command line input
if (process.argv[2]) {
    console.log('API initialized in ' + config.environment + ' mode');
    var admin = require('./admin.js');
    var setup = require('./setup.js');
    var processes = require('./processes.js');
    var program = require('commander');

    program
        .command('add-fake-sites <uid> <number-of-sites>')
        .description('Add fake sites to a user account')
        .action(function (uid, numberOfSites) {
            var numberOfSites = parseInt(numberOfSites);
            if (!numberOfSites > 0) {
                console.log('A positive number of sites was not specified.');
                process.exit(1);
            }
            admin.addFakeSites(uid, numberOfSites, function(error, result) {
                if (error) {
                    console.log(error);
                    process.exit(1);
                } else {
                    console.log(result);
                    process.exit(0);
                }
            });
        });

    program
        .command('audit <sid>')
        .description('Audit an individual site in Dewy')
        .action(function (sid) {
            admin.audit(sid, function(error, result) {
                if (error) {
                    console.log(error);
                    process.exit(1);
                } else {
                    console.log(result);
                    process.exit(0);
                }
            });
        });

    program
        .command('audit-all')
        .description('Audits all sites in Dewy')
        .action(function () {
            processes.auditAll(function(error, result) {
                if (error) {
                    console.log(error);
                    process.exit(1);
                } else {
                    console.log(result);
                    process.exit(0);
                }
            });
        });

    program
        .command('create-user <email> <username>')
        .description('Create a Dewy user, user will receive an email with instructions')
        .action(function (email, username) {
            admin.createUser(email, username, function(error, result) {
                if (error) {
                    console.log(error);
                    process.exit(1);
                } else {
                    console.log(result);
                    process.exit(0);
                }
            });
        });

    program
        .command('delete-fake-sites <uid>')
        .description('Delete fake sites on a user account')
        .action(function (uid) {
            admin.deleteFakeSites(uid, function(error, result) {
                if (error) {
                    console.log(error);
                    process.exit(1);
                } else {
                    console.log(result);
                    process.exit(0);
                }
            });
        });

    program
        .command('delete-site <sid>')
        .description('Delete a site')
        .action(function (sid) {
            admin.deleteSite(sid, function(error, result) {
                if (error) {
                    console.log(error);
                    process.exit(1);
                } else {
                    console.log(result);
                    process.exit(0);
                }
            });
        });

    program
        .command('flush-releases')
        .description('Removes all Drupal.org release data')
        .action(function () {
            admin.flushReleases(function(error, result) {
                if (error) {
                    process.exit(1);
                } else {
                    process.exit(0);
                }
            });
        });

    program
        .command('flush-tokens')
        .description('Removes all access and refresh tokens, logs out all users')
        .action(function () {
            admin.flushTokens(function(error, result) {
                if (error) {
                    process.exit(1);
                } else {
                    process.exit(0);
                }
            });
        });

    program
        .command('notify-users')
        .description('Notifies applicable users about key dates in their subscriptions')
        .action(function () {
            processes.notifyUsers(function(error, result) {
                if (error) {
                    process.exit(1);
                } else {
                    process.exit(0);
                }
            });
        });

    program
        .command('releases')
        .description('Retrieves all release updates from Drupal.org')
        .action(function () {
            processes.getReleases(function(error, result) {
                if (error) {
                    console.log(error);
                    process.exit(1);
                } else {
                    console.log(result);
                    process.exit(0);
                }
            });
        });

    program
        .command('setup')
        .description('Initialize the database with current configuration')
        .action(function () {
            setup.setup(function(error, result) {
                if (error) {
                    console.log(error);
                    process.exit(1);
                } else {
                    console.log(result);
                    process.exit(0);
                }
            });
        });

    program.parse(process.argv);
}
// If no command line input, run the API
else {
    // Log requests
    if (config.debug) {
        app.use(function(req, res, next) {
            if (req.method != 'OPTIONS') {
                console.log(req.ip + ': ' + req.method + ' ' + req.originalUrl);
            }
            next();
        });
    }
    // Allow API access from dewy.io
    app.use(function(req, res, next) {
        res.header('Access-Control-Allow-Origin', config.website.url);
        res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        next();
    });

    // Respond to CORS preflight requests
    app.options('*', function (req, res, next) {
        res.send();
    });

    // OAuth 2 configuration
    app.oauth = oauthserver({
        model: require('./helpers/oauth'),
        grants: ['authorization_code', 'password'],
        accessTokenLifetime: config.oauth.sessionLifetime,
        debug: config.debug
    });
    module.exports.oauth = app.oauth;

    // API endpoints
    var fieldRoutes = require('./routes/fields');
    var filterRoutes = require('./routes/filters');
    var moduleRoutes = require('./routes/modules');
    var oauthRoutes = require('./routes/oauth');
    var siteRoutes = require('./routes/sites');
    var stripeRoutes = require('./routes/stripe');
    var userRoutes = require('./routes/users');
    app.use('/fields', fieldRoutes);
    app.use('/filters', filterRoutes);
    app.use('/modules', moduleRoutes);
    app.use('/oauth', oauthRoutes);
    app.use('/sites', siteRoutes);
    app.use('/stripe', stripeRoutes);
    app.use('/users', userRoutes);

    // Error handling
    app.use(app.oauth.errorHandler());
    app.use(function(req, res) {
        res.status(404).send("Not a valid API endpoint");
    });

    // Grab port from config or supply a default
    var port = config.port || 3001;
    app.listen(port, function () {
        console.log('API in ' + config.environment + ' mode listening on port ' + port + ' and allowed to serve requests to ' + config.website.url + '...');
    });
}

module.exports = app;