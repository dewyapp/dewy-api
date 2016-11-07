var express = require('express');
var router = express.Router();
var oauth = require('../api.js').oauth;
var forge = require('node-forge');
var validator = require('validator');
var uuid = require('uuid');
var User = require('../models/user');
var email = require('../helpers/email');
var oauthModel = require('../helpers/oauth');
var config = require('../config');

router.post('/', function (req, res, next) {
    // Check if self registration is allowed
    if (!config.userSelfRegistration) {
        return res.status(501).send('User self-registration not allowed on this version of the API.');
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
        res.send(user.getUserDoc(true));
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
        else if (req.body.reset_code != user.passwordRequested) {
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
            text: 'Hi ' + user.username + '. Your email address requires verification, please verify your email address by visiting this link: ' + config.website + '/verify/' + user.uid + '/' + user.verified,
            html: 'Hi ' + user.username + '.<br/>Your email address requires verification, please verify your email address by visiting this link: ' + config.website + '/verify/' + user.uid + '/' + user.verified
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
        if (req.body.notifications) {
            user.setNotifications(req.body.notifications);
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
                return res.send(user.getUserDoc(true));
            });
        }
    });
});

router.get('/:uid/_subscription', oauth.authorise(), function (req, res, next) {
    User.get(req.user.id, function(error, result) {
        if (error) {
            return res.status(500).send(error);
        }
        if (req.params.uid != req.user.id) {
            return res.status(403).send('You do not have permission to access this resource.');
        }

        var user = result;
        if (user.subscription.stripeID === false) {
            return res.status(400).send('There is no Stripe customer associated with this user.');
        }

        var stripe = require("stripe")(config.stripe.private_key);
        stripe.customers.retrieve(user.subscription.stripeID, {expand: ['default_source']}, function(error, result) {
            // User has customer ID, but customer missing or deleted from stripe
            // Wipe customer ID from user
            if ((error && error.statusCode == 404) || result.deleted) {
                user.setSubscription(null, null, null, false);
                user.update(null, function(error, result) {
                    return res.status(400).send('There is no longer a Stripe customer associated with this user.');
                });
            }
            else if (error) {
                return res.status(500).send(error.message);
            }
            else {
                return res.send(result);
            }
        });
    });
});

router.post('/:uid/_subscription', oauth.authorise(), function (req, res, next) {
    if (!config.subscriptionRequired) {
        return res.status(400).send('User subscriptions not allowed on this version of the API.');
    }
    User.get(req.user.id, function(error, result) {
        if (error) {
            return res.status(500).send(error);
        }
        if (req.params.uid != req.user.id) {
            return res.status(403).send('You do not have permission to access this resource.');
        }
        var user = result;

        var planType = req.body.planType;
        var availablePlans = ['standard'];
        if (availablePlans.indexOf(planType) == -1) {
            return res.status(400).send('The ' + planType + ' plan is not available.');
        }

        // User isn't a Dewy Stripe customer yet, create the customer and the subscription
        var stripe = require("stripe")(config.stripe.private_key);
        if (user.subscription.stripeID === false) {
            var stripeToken = req.body.stripeToken;
            stripe.customers.create({
                source: stripeToken,
                plan: planType,
                email: user.email
            }, function(error, result) {
                if (error) {
                    return res.status(500).send(error.message);
                }
                user.setSubscription(result.subscriptions.data[0].current_period_start, result.subscriptions.data[0].current_period_end, planType, result.id, result.subscriptions.data[0].id);
                user.update(null, function (error, result) {
                    if (error) {
                        if (error.error) {
                            return res.status(500).send(error.error);
                        }
                        else {
                            return res.status(400).send(error);
                        }
                    }
                    return res.send(user.getUserDoc(true));
                });
            });
        }
        // If the user is a Stripe customer but doesn't have a current subscription, create one
        else if (user.subscription.subscriptionID === false) {
            stripe.subscriptions.create({
                source: stripeToken,
                customer: user.subscription.stripeID,
                plan: planType
            }, function(error, result) {
                if (error) {
                    return res.status(500).send(error.message);
                }
                user.setSubscription(result.current_period_start, result.current_period_end, planType, null, result.id);
                user.update(null, function (error, result) {
                    if (error) {
                        if (error.error) {
                            return res.status(500).send(error.error);
                        }
                        else {
                            return res.status(400).send(error);
                        }
                    }
                    return res.send(user.getUserDoc(true));
                });
            });
        }
        // Otherwise, they are changing their plan
        // else
        // {
        // }
    });
});

router.put('/:uid/_subscription', oauth.authorise(), function (req, res, next) {
    if (!config.subscriptionRequired) {
        return res.status(400).send('User subscriptions not allowed on this version of the API.');
    }
    User.get(req.user.id, function(error, result) {
        if (error) {
            return res.status(500).send(error);
        }
        if (req.params.uid != req.user.id) {
            return res.status(403).send('You do not have permission to access this resource.');
        }
        var user = result;

        if (!user.subscription.stripeID) {
            return res.status(400).send('There is no Stripe customer associated with this user.');
        }
        if (!user.subscription.subscriptionID) {
            return res.status(400).send('There is no Stripe subscription associated with this user.');
        }

        var stripe = require("stripe")(config.stripe.private_key);
        // User wishes to update credit card (source)
        if (req.body.source) {
            stripe.customers.update(user.subscription.stripeID, { 
                source: req.body.source
            }, function(error, result) {
                if (error) {
                    return res.status(500).send(error.message);
                }
                return res.send();
            });
        }
        // User wishes to cancel subscription at period end
        else if (req.body.cancel) {
            stripe.subscriptions.del(user.subscription.subscriptionID, { 
                at_period_end: true 
            }, function(error, result) {
                if (error) {
                    return res.status(500).send(error.message);
                }
                user.setSubscription(null, null, null, null, null, true);
                user.update(null, function (error, result) {
                    if (error) {
                        if (error.error) {
                            return res.status(500).send(error.error);
                        }
                        else {
                            return res.status(400).send(error);
                        }
                    }
                    return res.send(user.getUserDoc(true));
                });
            });
        }
        // User wishes to update plan, this removes any cancellation
        else {
            var planType = user.subscription.type;
            if (req.body.planType) {
                planType = req.body.planType;
                var availablePlans = ['standard'];
                if (availablePlans.indexOf(planType) == -1) {
                    return res.status(400).send('The ' + planType + ' plan is not available.');
                }
            }
            stripe.subscriptions.update(user.subscription.subscriptionID, { 
                plan: planType
            }, function(error, result) {
                if (error) {
                    return res.status(500).send(error.message);
                }
                user.setSubscription(null, null, planType, null, null, false);
                user.update(null, function (error, result) {
                    if (error) {
                        if (error.error) {
                            return res.status(500).send(error.error);
                        }
                        else {
                            return res.status(400).send(error);
                        }
                    }
                    return res.send(user.getUserDoc(true));
                });
            });
        }
    });
});

module.exports = router;