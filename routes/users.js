var express = require('express');
var router = express.Router();
var oauth = require('../app.js').oauth;
var async = require('async');
var validator = require('validator');
var uuid = require('uuid');
var users = require('../models/users');
var tokens = require('../models/oauth');
var config = require('../config');

router.post('/', function (req, res, next) {
    async.parallel({
        username: function(callback) {
            if (!req.body.username) {
                callback(null, "A username is required.");
                return;
            } else {
                // Check if username is in use
                users.getByUsername(req.body.username, function(error, result) {
                    if (error) {
                        callback(error);
                        return;
                    }
                    if (result.data.length) {
                        callback(null, "This username is in use.");
                        return;
                    }
                    callback();
                });
            }
        },
        email: function(callback) {
            if (!req.body.email) {
                callback(null, "An email address is required.");
                return;
            }
            else if (!validator.isEmail(req.body.email)) {
                callback(null, "A valid email address is required.");
                return;
            }
            else {
                // Check if email exists
                users.getByEmail(req.body.email, function(error, result) {
                    if (error) {
                        callback(error);
                        return;
                    }
                    if (result.data.length) {
                        callback(null, "This email address is in use.");
                        return;
                    }
                    callback();
                });
            }
        },
        password: function(callback) {
            if (!req.body.password) {
                callback(null, "A password is required.");
                return
            }
            else if (!validator.isLength(req.body.password, {min: 8})) {
                callback(null, "Your password must be at least 8 characters.");
                return
            }
            callback();
        }
    }, function(error, results) {
        if (error) {
            return res.status(400).send(error);
        }

        // User validation passed, create the user
        if (!results.username && !results.email && !results.password) {
            users.create(req.body, function(error, result) {
                if (error) {
                    return res.status(400).send(error);
                }

                // Send user and token back
                var user = {
                    uid: result.data.uid,
                    apikey: result.data.apikey,
                    username: result.data.username,
                    email: result.data.email,
                    access_token: uuid.v4()
                }
                tokens.saveAccessToken(user.access_token, config.client.client_id, config.oauth.accessTokenLifetime, user.uid, function(error, result) {
                    if (error) {
                        return res.status(400).send(error);
                    }
                    res.send({message: 'success', data: user});
                });
            });
        } else {
            res.send({message: 'error', data: results});
        }
    });
});

module.exports = router;