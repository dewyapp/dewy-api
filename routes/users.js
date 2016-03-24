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

router.put('/:uid', oauth.authorise(), function (req, res, next) {
    users.get(req.user.id, function(error, result) {
        if (error) {
            return res.status(500).send(error.toString());
        }
        if (req.params.uid != req.user.id) {
            return res.status(403).send('You do not have permission to access this resource.');
        }
        var userDoc = result;

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
                userDoc.apikey = uuid.v4();
                users.update(userDoc, function (error, result) {
                    if (error) {
                        return res.status(500).send(error);
                    }
                    else {
                        res.send(userDoc.apikey);
                    }
                });
            }
            else if (req.body.username) {
                usernameValidate(req.body.username, function(error, result) {
                    if (error) {
                        return res.status(500).send(error.toString());
                    }
                    else if (!result) {
                        userDoc.username = req.body.username;
                        users.update(userDoc, function (error, result) {
                            if (error) {
                                return res.status(500).send(error);
                            }
                            else {
                                res.send(result);
                            }
                        });
                    }
                });
            }
            else {
                async.parallel({
                    username: async.apply(usernameValidate, req.body.username),
                    email: async.apply(emailValidate, req.body.email),
                    password: async.apply(passwordValidate, req.body.password),
                    existingPassword: async.apply(existingPasswordValidate, req.body.existingPassword, userDoc.password),
                }, function(error, results) {
                    if (error) {
                        return res.status(500).send(error);
                    }

                    // User validation passed, update various fields
                    if (!results.existingPassword && ((req.body.email && !results.email) || (req.body.password && !results.password))) {
                        if (req.body.email && !results.email) {
                            userDoc.email = req.body.email;
                        }
                        if (req.body.password && !results.password) {
                            req.body.password = forge.md.sha1.create().update(req.body.password).digest().toHex();
                            userDoc.password = req.body.password;
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

                    users.update(userDoc, function (error, result) {
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

module.exports = router;