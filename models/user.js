var uuid = require('uuid');
var couchbase = require('couchbase');
var db = require('../api.js').bucket;
var async = require('async');
var forge = require('node-forge');
var md5 = require('md5');
var email = require('../helpers/email');
var validator = require('validator');
var swearjar = require('swearjar');
var randomstring = require('randomstring');
var config = require('../config');

function User(email, username, password, gravatar, apikey, uid, verified, passwordRequested, lastNotified, created, startDate, endDate, type, stripeID, subscriptionID, cancelled) {
    this.email = email || null;
    this.username = username || null;
    this.password = password || null;
    if (this.email) {
        this.gravatar = md5(this.email);
    }
    else {
        this.gravatar = null;
    }
    this.apikey = apikey || uuid.v4();
    this.uid = uid || uuid.v4();
    this.verified = verified || uuid.v4();
    if (typeof passwordRequested == 'undefined') {
        this.passwordRequested = false;
    }
    else {
        this.passwordRequested = passwordRequested;
    }
    this.lastNotified = lastNotified || null;
    this.created = created || Math.round(new Date().getTime() / 1000);
    this.subscription = {
        startDate: startDate || this.created,
        endDate: endDate|| this.created + (60*60*24*14),
        type: type || 'standard',
        stripeID: stripeID || false,
        subscriptionID: subscriptionID || false,
        cancelled: cancelled || false
    }
    this.changes = [];
    this.unchangedValues = this.getUserDoc();
}

User.get = function(uid, callback) {
    db.get('user::' + uid, function(error, result) {
        if (error) {
            return callback(error, null);
        }
        var user = new User(
            result.value.email,
            result.value.username,
            result.value.password,
            result.value.gravatar,
            result.value.apikey,
            result.value.uid,
            result.value.verified,
            result.value.passwordRequested,
            result.value.lastNotified,
            result.value.created,
            result.value.subscription.startDate,
            result.value.subscription.endDate,
            result.value.subscription.type,
            result.value.subscription.stripeID,
            result.value.subscription.subscriptionID,
            result.value.subscription.cancelled
        );

        callback(null, user);
    });
}

User.getUidByApiKey = function(apikey, callback) {
    query = couchbase.ViewQuery.from('users', 'by_apikey')
        .key([apikey])
        .stale(1);
    db.query(query, function(error, result) {
        if (error) {
            return callback(error, null);
        }
        if (result.length) {
            return callback(null, result[0].value);
        }
        callback(null, false);
    });
}

User.getUidByEmail = function(email, callback) {
    query = couchbase.ViewQuery.from('users', 'by_email')
        .key([email])
        .stale(1);
    db.query(query, function(error, result) {
        if (error) {
            return callback(error, null);
        }
        if (result.length) {
            return callback(null, result[0].value);
        }
        callback(null, false);
    });
}

User.getUidByStripeID = function(stripeID, callback) {
    query = couchbase.ViewQuery.from('users', 'by_stripeID')
        .key([stripeID])
        .stale(1);
    db.query(query, function(error, result) {
        if (error) {
            return callback(error, null);
        }
        if (result.length) {
            return callback(null, result[0].value);
        }
        callback(null, false);
    });
}

User.getUidByUsername = function(username, callback) {
    query = couchbase.ViewQuery.from('users', 'by_username')
        .key([username.toLowerCase()])
        .stale(1);
    db.query(query, function(error, result) {
        if (error) {
            return callback(error, null);
        }
        if (result.length) {
            return callback(null, result[0].value);
        }
        callback(null, false);
    });
}

User.prototype.getSubscriptionExpired = function () {
    if (this.subscription.endDate < Date.now()/1000) {
        return true;
    }
    return false;
}

User.prototype.getUserDoc = function(safe) {
    if (safe) {
        // Return stripped down version of userDoc safe for front-end
        var verified = true;
        if (this.verified !== true) {
            verified = false;
        }
        var endDate = this.subscription.endDate;
        if (!config.subscriptionRequired) {
            endDate = -1;
        }

        return {
            email: this.email,
            username: this.username,
            gravatar: this.gravatar,
            apikey: this.apikey,
            uid: this.uid,
            verified: verified,
            created: this.created,
            subscription: {
                startDate: this.subscription.startDate,
                endDate: endDate,
                type: this.subscription.type,
                subscriptionID: this.subscription.subscriptionID,
                cancelled: this.subscription.cancelled,
                expired: this.getSubscriptionExpired()
            }
        }
    }
    else {
        // Return userDoc for internal consumption
        return {
            email: this.email,
            username: this.username,
            password: this.password,
            gravatar: this.gravatar,
            apikey: this.apikey,
            uid: this.uid,
            verified: this.verified,
            passwordRequested: this.passwordRequested,
            lastNotified: this.lastNotified,
            created: this.created,
            subscription: {
                startDate: this.subscription.startDate,
                endDate: this.subscription.endDate,
                type: this.subscription.type,
                stripeID: this.subscription.stripeID,
                subscriptionID: this.subscription.subscriptionID,
                cancelled: this.subscription.cancelled
            }
        }
    }
}

User.prototype.addPasswordRequest = function() {
    this.changes.push('passwordRequested');
    this.passwordRequested = uuid.v4();
}

User.prototype.setEmail = function(email) {
    this.changes.push('email', 'verified', 'gravatar');
    this.email = email;
    this.verified = uuid.v4();
    this.gravatar = md5(this.email);
}

User.prototype.setLastNotified = function() {
    this.changes.push('lastNotified');
    this.lastNotified = Math.round(new Date().getTime() / 1000);
}

User.prototype.setPassword = function(password) {
    this.changes.push('password');
    this.password = password;
}

User.prototype.setSubscription = function(startDate, endDate, type, stripeID, subscriptionID, cancelled) {
    this.changes.push('subscription');
    this.subscription = {
        startDate: startDate || this.subscription.startDate,
        endDate: endDate || this.subscription.endDate,
        type: type || this.subscription.type,
        stripeID: stripeID || this.subscription.stripeID,
        subscriptionID: subscriptionID || this.subscription.subscriptionID,
        cancelled: cancelled || this.subscription.cancelled
    }
    if (stripeID === false) {
        this.subscription.stripeID = false;
    }
    if (subscriptionID === false) {
        this.subscription.subscriptionID = false;
    }
    if (cancelled === false) {
        this.subscription.cancelled = false;
    }
}

User.prototype.setUsername = function(username) {
    this.changes.push('username');
    this.username = username;
}

User.prototype.removeVerification = function() {
    this.changes.push('verified');
    this.verified = true;
}

User.prototype.resetAPIKey = function() {
    this.changes.push('apikey');
    this.apikey = uuid.v4();
}

User.prototype.resetPassword = function() {
    this.changes.push('password', 'passwordRequested');
    this.password = randomstring.generate(8);
    this.passwordRequested = false;
}

User.prototype.check = function(type, existingPassword, callback) {
    function usernameValidate(username, callback) {
        if (!username) {
            return callback(null, 'A username is required.');
        } 
        else if (!/^[a-z0-9]+$/i.test(username)) {
            return callback(null, 'Usernames can only be made of letters and numbers.');
        }
        else if (!validator.isLength(username, {min: 4})) {
            return callback(null, 'Your username must be at least 4 characters.');
        }
        else if (swearjar.profane(username)) {
            return callback(null, 'This username is invalid.');
        }
        else {
            User.getUidByUsername(username, function(error, result) {
                if (error) {
                    return callback(error);
                }
                if (result !== false) {
                    return callback(null, 'This username is in use.');
                }
                callback();
            });
        }
    }

    function emailValidate(email, callback) {
        if (!email) {
            return callback(null, 'An email address is required.');
        }
        else if (!validator.isEmail(email)) {
            return callback(null, 'A valid email address is required.');
        }
        else {
            User.getUidByEmail(email, function(error, result) {
                if (error) {
                    return callback(error);
                }
                if (result !== false) {
                    return callback(null, 'This email address is in use.');
                }
                callback();
            });
        }
    }

    function passwordValidate(password, callback) {
        if (!password) {
            return callback(null, 'A password is required.');
        }
        else if (!validator.isLength(password, {min: 8})) {
            return callback(null, 'Your password must be at least 8 characters.');
        }
        callback();
    }

    function existingPasswordValidate(existingPassword, password, callback) {
        if (!existingPassword) {
            return callback(null, 'Your existing password is required.');
        }
        else {
            existingPassword = forge.md.sha1.create().update(existingPassword).digest().toHex();
            if (existingPassword != password) {
                return callback(null, 'Your existing password is incorrect.');
            }
            callback();
        }
    }

    var checks = {};
    // Run all checks if it's a new user creation
    if (type == 'create') {
        checks['username'] = async.apply(usernameValidate, this.username);
        checks['email'] = async.apply(emailValidate, this.email);
        checks['password'] = async.apply(passwordValidate, this.password);
    }
    else {
        if (this.changes.indexOf('username') !== -1) {
            checks['username'] = async.apply(usernameValidate, this.username);
        }
        if (this.changes.indexOf('email') !== -1) {
            checks['email'] = async.apply(emailValidate, this.email);
            checks['existingPassword'] = async.apply(existingPasswordValidate, existingPassword, this.unchangedValues.password);
        }
        if (this.changes.indexOf('password') !== -1) {
            checks['password'] = async.apply(passwordValidate, this.password);
            if (this.changes.indexOf('passwordRequested') === -1) {
                // Check for valid existing password sent along with request for changing passwords
                // unless the user has a password reset requested
                checks['existingPassword'] = async.apply(existingPasswordValidate, existingPassword, this.unchangedValues.password);
            }
        }
    }

    async.parallel(checks, function(error, result) {
        if (error) {
            return callback(error);
        }
        if (result.username || result.email || result.password || result.existingPassword) {
            return callback(null, result);
        }
        callback();
    });
}

User.prototype.create = function(callback) {
    // Check if username in use, if email in use, if password is valid,
    this.check('create', null, function(error, result) {
        if (error) {
            return callback({ error: error });
        }
        else {
            if (result) {
                return callback(result);
            }
            // Password validated, now encrypt
            var actualPassword = this.user.password;
            this.user.password = forge.md.sha1.create().update(this.user.password).digest().toHex();
            db.insert('user::' + this.user.uid, this.user.getUserDoc(), function(error, result) {
                if (error) {
                    return callback(error, null);
                }

                var message;
                if (this.user.verified !== true) {
                    message = 'Welcome to Dewy. Please verify your email address by visiting this link: ' + config.website + '/verify/' + this.user.uid + '/' + this.user.verified;
                }
                else {
                    message = 'An account has been created for you on ' + config.website + '. Use the username "' + this.user.username + '" and password "' + actualPassword + '" to sign on. Change your password after signing on at ' + config.website + '/signon.';
                }

                var userDoc = this.user.getUserDoc();

                email.send({
                    to: this.user.email,
                    subject: 'Welcome to Dewy',
                    text: 'Hi ' + this.user.username + '. ' + message,
                    html: 'Hi ' + this.user.username + '.<br/>' + message
                }, function(error, result) {
                    callback(null, userDoc);
                });
            }.bind( {user: this.user} ));
        }
    }.bind( {user: this} ));
}

User.prototype.update = function(existingPassword, callback) {
    this.check('update', existingPassword, function(error, result) {
        if (error) {
            return callback({ error: error });
        }
        else {
            if (result) {
                return callback(result);
            }
            // Password validated, now encrypt
            if (this.user.changes.indexOf('password') !== -1) {
                var actualPassword = this.user.password;
                this.user.password = forge.md.sha1.create().update(this.user.password).digest().toHex();
            }
            db.replace('user::' + this.user.uid, this.user.getUserDoc(), function(error, result) {
                if (error) {
                    return callback(error, null);
                }

                var userDoc = this.user.getUserDoc();

                if (this.user.changes.indexOf('verified') !== -1 && this.user.verified === true) {
                    email.send({
                        to: this.user.email,
                        subject: 'Your Dewy email address has been verified',
                        text: 'Hi ' + this.user.username + '. Your email address has been verified successfully and has now changed.',
                        html: 'Hi ' + this.user.username + '.<br/>Your email address has been verified successfully and has now changed.'
                    }, function(error, result) {
                        callback(null, userDoc);
                    });
                }
                else if (this.user.changes.indexOf('passwordRequested') !== -1 && this.user.changes.indexOf('password') !== -1) {
                    email.send({
                        to: this.user.email,
                        subject: 'Your Dewy account password has been reset',
                        text: 'Hi ' + this.user.username + '. Your password has been reset. Use the username "' + this.user.username + '" and password "' + actualPassword + '" to sign on. Change your password after signing on at ' + config.website + '/signon.',
                        html: 'Hi ' + this.user.username + '.<br/>Your password has been reset. Use the username "' + this.user.username + '" and password "' + actualPassword + '" to sign on. Change your password after signing on.' + config.website + '/signon.'
                    }, function(error, result) {
                        callback(null, userDoc);
                    });
                }
                else if (this.user.changes.indexOf('passwordRequested') !== -1 && this.user.passwordRequested !== false) {
                    email.send({
                        to: this.user.email,
                        subject: 'A password reset request for your Dewy account',
                        text: 'Hi ' + this.user.username + '. A request to reset your password has been initiated. To reset your password and recieve a new one, visit this link: ' + config.website + '/reset/' + this.user.uid + '/' + this.user.passwordRequested,
                        html: 'Hi ' + this.user.username + '.<br/>A request to reset your password has been initiated. To reset your password and recieve a new one, visit this link: ' + config.website + '/reset/' + this.user.uid + '/' + this.user.passwordRequested
                    }, function(error, result) {
                        callback(null, userDoc);
                    });
                }
                else if (this.user.changes.indexOf('email') !== -1) {
                    email.send({
                        to: this.user.email,
                        subject: 'Your Dewy email address has changed',
                        text: 'Hi ' + this.user.username + '. Your email address has been changed, please verify your new email address by visiting this link: ' + config.website + '/verify/' + this.user.uid + '/' + this.user.verified,
                        html: 'Hi ' + this.user.username + '.<br/>A request has been made to change your email address, please verify your new email address by visiting this link: ' + config.website + '/verify/' + this.user.uid + '/' + this.user.verified
                    }, function(error, result) {
                        callback(null, userDoc);
                    });
                }
                else if (this.user.changes.indexOf('username') !== -1) {
                    email.send({
                        to: this.user.email,
                        subject: 'Your Dewy username has changed',
                        text: 'Hi ' + this.user.unchangedValues.username + '. Your username has been changed to ' + this.user.username + '. You will require this username to sign on in the future.',
                        html: 'Hi ' + this.user.unchangedValues.username + '.<br/>Your username has been changed to ' + this.user.username + '. You will require this username to sign on in the future.'
                    }, function(error, result) {
                        callback(null, userDoc);
                    });
                }
                else {
                    callback(null, userDoc);
                }
            }.bind( {user: this.user} ));
        }
    }.bind( {user: this} ));
}

module.exports = User;