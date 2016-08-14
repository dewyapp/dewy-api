var express = require('express');
var router = express.Router();
var oauth = require('../app.js').oauth;
var async = require('async');
var forge = require('node-forge');
var validator = require('validator');
var uuid = require('uuid');
var users = require('../models/users');
var email = require('../models/email');
var oauthModel = require('../models/oauth');
var config = new require('../config')();

usernameValidate = function(username, callback) {
    if (!username) {
        callback(null, 'A username is required.');
        return;
    } else {
        // Check if username is in use
        users.getByUsername(username, function(error, result) {
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
}

emailValidate = function(email, callback) {
    if (!email) {
        callback(null, 'An email address is required.');
        return;
    }
    else if (!validator.isEmail(email)) {
        callback(null, 'A valid email address is required.');
        return;
    }
    else {
        // Check if email exists
        users.getByEmail(email, function(error, result) {
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
}

passwordValidate = function(password, callback) {
    if (!password) {
        callback(null, 'A password is required.');
        return;
    }
    else if (!validator.isLength(password, {min: 8})) {
        callback(null, 'Your password must be at least 8 characters.');
        return;
    }
    callback();
}

existingPasswordValidate = function(existingPassword, userPassword, callback) {
    if(!existingPassword) {
        callback(null, 'Your existing password is required.');
        return;
    }
    else {
        existingPassword = forge.md.sha1.create().update(existingPassword).digest().toHex();
        if (existingPassword != userPassword) {
            callback(null, 'Your existing password is incorrect.');
            return
        }
        callback();
    }
}


router.post('/', function (req, res, next) {
    // Don't allow self sign-up in production (we're not ready yet!)
    if (config.environment == 'production') {
        return res.status(501).send('User self-registration only allowed on production API.');
    }
    // Allow for checking of validity of individual fields without completing an update to the user
    if (req.body.check) {
        if ('username' in req.body) {
            usernameValidate(req.body.username, function(error, result) {
                if (result == null) {
                    result = false;
                }
                res.send({error: result});
            });
        }
        else if ('email' in req.body) {
            emailValidate(req.body.email, function(error, result) {
                if (result == null) {
                    result = false;
                }
                res.send({error: result});
            });
        }
        else if ('password' in req.body) {
            passwordValidate(req.body.password, function(error, result) {
                if (result == null) {
                    result = false;
                }
                res.send({error: result});
            });
        }
        else {
            res.status(400).send('No values to check.');
        }
    }
    else {
        async.parallel({
            username: async.apply(usernameValidate, req.body.username),
            email: async.apply(emailValidate, req.body.email),
            password: async.apply(passwordValidate, req.body.password)
        }, function(error, results) {
            if (error) {
                return res.status(500).send(error);
            }

            // User validation passed
            if (!results.username && !results.email && !results.password) {
                // Not a test, create the user
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
    }
});

router.get('/', oauth.authorise(), function (req, res, next) {
    users.get(req.user.id, function(error, result) {
        if (error) {
            return res.status(500).send(error.toString());
        }
        res.send(result);
    });
});

router.get('/_verify/:uid', oauth.authorise(), function (req, res, next) {
    users.get(req.user.id, function(error, result) {
        if (error) {
            return res.status(500).send(error.toString());
        }
        if (!result.verify) {
            return res.status(400).send('The user has already been verified.');
        }
        var userDoc = result;
        email.send({
                to: result.email,
                cc: null,
                subject: 'Your Dewy email address requires verification',
                text: 'Hi ' + userDoc.username + '! Your email address requires verification, please verify your email address by visiting this link: http://dewy.io/verify/' + userDoc.uid + '/' + userDoc.verify,
            }, function(error, result) {
                if (error) {
                    return res.status(500).send(error.toString());
                }
                res.send('Verification email sent.');
            });
    });
});

router.post('/_verify/:uid', function (req, res, next) {
    if (!req.body.verification_code) {
        return res.status(400).send("A verification code is required.");
    }
    users.get(req.params.uid, function(error, result) {
        if (error) {
            return res.status(500).send(error.toString());
        }
        var existingUserDoc = result;
        if (!existingUserDoc.verify) {
            return res.status(400).send('The email address has already been verified.');
        }
        if (req.body.verification_code != existingUserDoc.verify) {
            return res.status(400).send('The verification code is incorrect.');
        }
        var newUserDoc = {
            uid: existingUserDoc.uid,
            apikey: existingUserDoc.apikey,
            username: existingUserDoc.username,
            email: existingUserDoc.email,
            password: existingUserDoc.password,
            verify: false
        } 
        users.update(existingUserDoc, newUserDoc, function (error, result) {
            if (error) {
                return res.status(500).send(error);
            }
            else {
                // The user has been verified, create and return an access token (authenticate them)
                var expires = new Date(this.now);
                expires.setSeconds(expires.getSeconds() + config.oauth.accessTokenLifetime);
                var token = {
                    access_token: uuid.v4(),
                    client_id: config.client.client_id,
                    expires: expires,
                    uid: newUserDoc.uid
                }
                oauthModel.saveAccessToken(token.access_token, token.client_id, token.expires, token.uid, function(error, result) {
                    if (error) {
                        return res.status(500).send(error);
                    }
                    res.send(token);
                });
            }
        });
    });
});

router.put('/:uid', oauth.authorise(), function (req, res, next) {
    users.get(req.user.id, function(error, result) {
        if (error) {
            return res.status(500).send(error.toString());
        }
        if (req.params.uid != req.user.id) {
            return res.status(403).send('You do not have permission to access this resource.');
        }

        var existingUserDoc = result;
        var newUserDoc = {
            uid: existingUserDoc.uid,
            apikey: existingUserDoc.apikey,
            username: existingUserDoc.username,
            email: existingUserDoc.email,
            password: existingUserDoc.password,
            verify: existingUserDoc.verify,
            created: existingUserDoc.created,
            subscription: existingUserDoc.subscription,
            stripe: existingUserDoc.stripe
        }

        // Allow for checking of validity of individual fields without completing an update to the user
        if (req.body.check) {
            if ('username' in req.body) {
                usernameValidate(req.body.username, function(error, result) {
                    if (result == null || req.body.username.length == 0) {
                        result = false;
                    }
                    res.send({error: result});
                });
            }
            else if ('email' in req.body) {
                emailValidate(req.body.email, function(error, result) {
                    if (result == null || req.body.email.length == 0) {
                        result = false;
                    }
                    res.send({error: result});
                });
            }
            else if ('password' in req.body) {
                passwordValidate(req.body.password, function(error, result) {
                    if (result == null || req.body.password.length == 0) {
                        result = false;
                    }
                    res.send({error: result});
                });
            }
            else {
                res.status(400).send('No values to check.');
            }
        }
        else {
            // If the key is specified to be updated, reset the api key
            if (req.body.key) {
                newUserDoc.apikey = uuid.v4();
                users.update(existingUserDoc, newUserDoc, function (error, result) {
                    if (error) {
                        return res.status(500).send(error);
                    }
                    else {
                        res.send(newUserDoc.apikey);
                    }
                });
            }
            else if (req.body.username) {
                usernameValidate(req.body.username, function(error, result) {
                    if (error) {
                        return res.status(500).send(error.toString());
                    }
                    else if (!result) {
                        newUserDoc.username = req.body.username;
                        users.update(existingUserDoc, newUserDoc, function (error, result) {
                            if (error) {
                                return res.status(500).send(error);
                            }
                            else {
                                res.send(result);
                            }
                        });
                    }
                    else {
                        res.status(400).send(result);
                    }
                });
            }
            else {
                async.parallel({
                    username: async.apply(usernameValidate, req.body.username),
                    email: async.apply(emailValidate, req.body.email),
                    password: async.apply(passwordValidate, req.body.password),
                    existingPassword: async.apply(existingPasswordValidate, req.body.existingPassword, existingUserDoc.password),
                }, function(error, results) {
                    if (error) {
                        return res.status(500).send(error);
                    }

                    // User validation passed, update various fields
                    if (!results.existingPassword && ((req.body.email && !results.email) || (req.body.password && !results.password))) {
                        if (req.body.email && !results.email) {
                            newUserDoc.email = req.body.email;
                        }
                        if (req.body.password && !results.password) {
                            req.body.password = forge.md.sha1.create().update(req.body.password).digest().toHex();
                            newUserDoc.password = req.body.password;
                        }
                    }
                    else {
                        if (!req.body.email) {
                            results.email = null;
                        }
                        if (!req.body.password) {
                            results.password = null;
                        }
                        if (!req.body.email && !req.body.password) {
                            results.error = 'A new email address or new password is required.';
                        }
                        return res.status(400).send(results);
                    }

                    users.update(existingUserDoc, newUserDoc, function (error, result) {
                        if (error) {
                            return res.status(500).send(error);
                        }
                        else {
                            res.send(result);
                        }
                    });
                });
            }
        }
    });
});

router.post('/:uid/_subscription/:plan', oauth.authorise(), function (req, res, next) {

    var availablePlans = ['basic'];

    if (availablePlans.indexOf(req.params.plan) != -1) {
        users.get(req.user.id, function(error, result) {
            if (error) {
                return res.status(500).send(error.toString());
            }
            if (req.params.uid != req.user.id) {
                return res.status(403).send('You do not have permission to access this resource.');
            }

            var existingUserDoc = result;

            var stripe = require("stripe")(config.stripe.private_key);
            var stripeToken = req.body.stripeToken;
            stripe.customers.create({
                source: stripeToken,
                plan: req.params.plan,
                email: existingUserDoc.email
            }, function(error, result) {
                if (error) {
                    return res.status(500).send(error.toString());
                }

                var newUserDoc = {
                    uid: existingUserDoc.uid,
                    apikey: existingUserDoc.apikey,
                    username: existingUserDoc.username,
                    email: existingUserDoc.email,
                    password: existingUserDoc.password,
                    verify: existingUserDoc.verify,
                    created: existingUserDoc.created,
                    subscription: existingUserDoc.subscription,
                    stripe: result
                }

                users.update(existingUserDoc, newUserDoc, function (error, result) {
                    if (error) {
                        return res.status(500).send(error);
                    }
                    else {
                        res.send(result);
                    }
                });
            });
        });
    }
    else {
        res.status(400).send('The ' + req.params.plan + ' plan is not available.');
    }
});

module.exports = router;