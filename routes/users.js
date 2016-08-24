var express = require('express');
var router = express.Router();
var oauth = require('../api.js').oauth;
var async = require('async');
var forge = require('node-forge');
var validator = require('validator');
var uuid = require('uuid');
var User = require('../models/user');
var email = require('../helpers/email');
var oauthModel = require('../helpers/oauth');
var config = new require('../config')();

router.post('/', function (req, res, next) {
    // Don't allow self sign-up in production (we're not ready yet!)
    if (config.environment == 'production') {
        return res.status(501).send('User self-registration only allowed on production API.');
    }
    var user = new User(req.body.email, req.body.username, req.body.password);
    // Check user values without creating the user
    if (req.body.check) {
        user.check('create', null, function(error, result) {
            if (error) {
                return res.status(500).send(error);
            }
            else {
                if ('username' in req.body) {
                    return res.send({error: result.username});
                }
                if ('email' in req.body) {
                    return res.send({error: result.email});
                }
                if ('password' in req.body) {
                    return res.send({error: result.password});
                }
            }
        });
    }
    else {
        user.create(function(error, result) {
            if (error) {
                if (error.error) {
                    return res.status(500).send(error.error);
                }
                else {
                    return res.status(400).send(error);
                }
            }
            else {
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
            }
        });
    }
});

router.get('/', oauth.authorise(), function (req, res, next) {
    User.get(req.user.id, function(error, result) {
        if (error) {
            return res.status(500).send(error);
        }
        var user = result;
        res.send(user);
    });
});

router.post('/_reset', function (req, res, next) {
    if (!req.body.email) {
        return res.status(400).send("An email address required.");
    }
    User.getUidByEmail(req.body.email, function(error, result) {
        if (error) {
            return res.status(500).send(error);
        }
        if (result === false) {
            return res.status(400).send('This email address cannot be found.');
        }
        User.get(result, function(error, result) {
            if (error) {
                return res.status(500).send(error);
            }

            var user = result;
            user.addPasswordRequest();
            user.update(null, function(error, result) {
                if (error) {
                    return res.status(500).send(error);
                }
                else {
                    res.send();
                }
            });
        });
    });
});

router.post('/_reset/:uid', function (req, res, next) {
    if (!req.body.reset_code) {
        return res.status(400).send("A password reset code is required.");
    }
    User.get(req.params.uid, function(error, result) {
        if (error) {
            return res.status(500).send(error);
        }
        var user = result;
        if (user.passwordRequested === false) {
            return res.status(400).send('The password has already been reset.');
        }
        if (req.body.reset_code != user.passwordRequested) {
            return res.status(400).send('The password reset code is incorrect.');
        }
        user.resetPassword();
        user.update(null, function(error, result) {
            if (error) {
                return res.status(500).send(error);
            }
            else {
                res.send();
            }
        });
    });
});

router.get('/_verify/:uid', oauth.authorise(), function (req, res, next) {
    User.get(req.user.id, function(error, result) {
        if (error) {
            return res.status(500).send(error);
        }
        var user = result;
        if (user.verified === true) {
            return res.status(400).send('The user has already been verified.');
        }
        email.send({
            to: user.email,
            cc: null,
            subject: 'Your Dewy email address requires verification',
            text: 'Hi ' + user.username + '. Your email address requires verification, please verify your email address by visiting this link: ' + config.website.url + '/verify/' + user.uid + '/' + user.verified,
            html: 'Hi ' + user.username + '.<br/>Your email address requires verification, please verify your email address by visiting this link: ' + config.website.url + '/verify/' + user.uid + '/' + user.verified
        }, function(error, result) {
            if (error) {
                return res.status(500).send(error);
            }
            res.send('Verification email sent.');
        });
    });
});

router.post('/_verify/:uid', function (req, res, next) {
    if (!req.body.verification_code) {
        return res.status(400).send("A verification code is required.");
    }
    User.get(req.params.uid, function(error, result) {
        if (error) {
            return res.status(500).send(error);
        }
        var user = result;
        if (user.verified === true) {
            return res.status(400).send('The email address has already been verified.');
        }
        if (req.body.verification_code != user.verified) {
            return res.status(400).send('The verification code is incorrect.');
        }
        user.removeVerification();
        user.update(null, function(error, result) {
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
                    uid: user.uid
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
    User.get(req.user.id, function(error, result) {
        if (error) {
            return res.status(500).send(error);
        }
        if (req.params.uid != req.user.id) {
            return res.status(403).send('You do not have permission to access this resource.');
        }

        var user = result;
        if (req.body.key) {
            user.resetAPIKey();
        }
        if (req.body.requestPassword) {
            user.addPasswordRequest();
        }
        if (req.body.username) {
            user.setUsername(req.body.username);
        }
        if (req.body.email) {
            user.setEmail(req.body.email);
        }
        if (req.body.password) {
            user.setPassword(req.body.password);
        }

        // Check user values without creating the user
        if (req.body.check) {
            user.check('update', null, function(error, result) {
                if (error) {
                    return res.status(500).send(error);
                }
                else if (result) {
                    if ('username' in req.body && 'username' in result) {
                        return res.send({error: result.username});
                    }
                    if ('email' in req.body && 'email' in result) {
                        return res.send({error: result.email});
                    }
                    if ('password' in req.body && 'password' in result) {
                        return res.send({error: result.password});
                    }
                }
                return res.send();
            });
        }
        else {
            user.update(req.body.existingPassword, function (error, result) {
                if (error) {
                    if (error.error) {
                        return res.status(500).send(error.error);
                    }
                    else {
                        return res.status(400).send(error);
                    }
                }
                return res.send(user);
            });
        }
    });
});

router.post('/:uid/_subscription/:plan', oauth.authorise(), function (req, res, next) {

    var availablePlans = ['basic'];

    if (availablePlans.indexOf(req.params.plan) == -1) {
        res.status(400).send('The ' + req.params.plan + ' plan is not available.');
    }
    else {
        User.get(req.user.id, function(error, result) {
            if (error) {
                return res.status(500).send(error);
            }
            if (req.params.uid != req.user.id) {
                return res.status(403).send('You do not have permission to access this resource.');
            }
            var user = result;

            // User isn't a Dewy Stripe customer yet, create them
            if (user.subscription.stripeID === false) {
                var stripe = require("stripe")(config.stripe.private_key);
                var stripeToken = req.body.stripeToken;
                stripe.customers.create({
                    source: stripeToken,
                    plan: req.params.plan,
                    email: user.email
                }, function(error, result) {
                    if (error) {
                        return res.status(500).send(error);
                    }

                    user.setSubscription(result.subscriptions.data[0].current_period_start, result.subscriptions.data[0].current_period_end, req.params.plan, result.id);
                    user.update(null, function (error, result) {
                        if (error) {
                            if (error.error) {
                                return res.status(500).send(error.error);
                            }
                            else {
                                return res.status(400).send(error);
                            }
                        }
                        return res.send(user);
                    });
                });
            }
        });
    }
});

module.exports = router;