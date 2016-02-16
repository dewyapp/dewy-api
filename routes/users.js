var express = require('express');
var router = express.Router();
var oauth = require('../app.js').oauth;
var async = require('async');
var forge = require('node-forge');
var validator = require('validator');
var uuid = require('uuid');
var users = require('../models/users');
var oauthModel = require('../models/oauth');
var config = require('../config');

router.post('/', function (req, res, next) {
    async.parallel({
        username: function(callback) {
            if (!req.body.username) {
                callback(null, 'A username is required.');
                return;
            } else {
                // Check if username is in use
                users.getByUsername(req.body.username, function(error, result) {
                    if (error) {
                        callback(error);
                        return;
                    }
                    if (result.length) {
                        callback(null, 'This username is in use.');
                        return;
                    }
                    callback();
                });
            }
        },
        email: function(callback) {
            if (!req.body.email) {
                callback(null, 'An email address is required.');
                return;
            }
            else if (!validator.isEmail(req.body.email)) {
                callback(null, 'A valid email address is required.');
                return;
            }
            else {
                // Check if email exists
                users.getByEmail(req.body.email, function(error, result) {
                    if (error) {
                        callback(error);
                        return;
                    }
                    if (result.length) {
                        callback(null, 'This email address is in use.');
                        return;
                    }
                    callback();
                });
            }
        },
        password: function(callback) {
            if (!req.body.password) {
                callback(null, 'A password is required.');
                return
            }
            else if (!validator.isLength(req.body.password, {min: 8})) {
                callback(null, 'Your password must be at least 8 characters.');
                return
            }
            callback();
        }
    }, function(error, results) {
        if (error) {
            return res.status(500).send(error);
        }

        // User validation passed, create the user
        if (!results.username && !results.email && !results.password) {
            req.body.password = forge.md.sha1.create().update(req.body.password).digest().toHex();
            users.create(req.body, function(error, result) {
                if (error) {
                    return res.status(500).send(error);
                }

                // The user has been created, create and return an access token (authenticate them)
                var expires = new Date(this.now);
                expires.setSeconds(expires.getSeconds() + config.oauth.accessTokenLifetime);
                var token = {
                    access_token: uuid.v4(),
                    client_id: config.client.client_id,
                    expires: expires,
                    uid: result.uid
                }
                oauthModel.saveAccessToken(token.access_token, token.client_id, token.expires, token.uid, function(error, result) {
                    if (error) {
                        return res.status(500).send(error);
                    }
                    res.send(token);
                });

            });
        } else {
            res.status(400).send(results);
        }
    });
});

router.get('/', oauth.authorise(), function (req, res, next) {
    users.get(req.user.id, function(error, result) {
        if (error) {
            return res.status(500).send(error.toString());
        }
        res.send(result);
    });
});

module.exports = router;