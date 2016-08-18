var uuid = require('uuid');
var couchbase = require('couchbase');
var db = require('../api.js').bucket;
var async = require('async');
var forge = require('node-forge');
var md5 = require('md5');
var email = require('../helpers/email');
var validator = require('validator');
var config = new require('../config')();

function User(email, username, password) {
    this.email = email || null;
    this.username = username || null;
    this.password = password || null;
    if (this.email) {
        this.gravatar = md5(this.email);
    }
    else {
        this.gravatar = null;
    }
    this.apikey = uuid.v4();
    this.uid = uuid.v4();
    this.verify = uuid.v4();
    this.created = Math.round(new Date().getTime() / 1000);
    this.subscription = {
        startDate: this.created,
        endDate: this.created + (60*60*24*30),
        type: 'trial'
    }
    this.changes = [];
}

User.prototype.get = function(uid, callback) {
    db.get('user::' + uid, function(error, result) {
        if (error) {
            return callback(error, null);
        }
        this.email = result.value.email;
        this.username = result.value.username;
        this.password = result.value.password;
        this.gravatar = result.value.gravatar;
        this.apikey = result.value.apikey;
        this.uid = result.value.uid;
        this.created = result.value.created;
        this.subscription = result.value.subscription;

        callback(null, this.uid);
    });
}

User.prototype.getByApiKey = function(apikey, callback) {
    query = couchbase.ViewQuery.from('users', 'by_apikey')
        .key([apikey])
        .stale(1);
    db.query(query, function(error, result) {
        if (error) {
            return callback(error, null);
        }
        callback(null, result);
    });
}

User.prototype.getByEmail = function(email, callback) {
    query = couchbase.ViewQuery.from('users', 'by_email')
        .key([email])
        .stale(1);
    db.query(query, function(error, result) {
        if (error) {
            return callback(error, null);
        }
        callback(null, result);
    });
}

User.prototype.getByUsername = function(username, callback) {
    query = couchbase.ViewQuery.from('users', 'by_username')
        .key([username])
        .stale(1);
    db.query(query, function(error, result) {
        if (error) {
            return callback(error, null);
        }
        callback(null, result);
    });
}

User.prototype.getUserDoc = function() {
    return {
        email: this.email,
        username: this.username,
        password: this.password,
        gravatar: this.gravatar,
        apikey: this.apikey,
        uid: this.uid,
        created: this.created,
        subscription: this.subscription
    }
}

User.prototype.setEmail = function(email) {
    this.changes.push('email', 'verify', 'gravatar');
    this.email = email;
    this.verify = uuid.v4();
    this.gravatar = md5(this.email);
}

User.prototype.setUsername = function(username) {
    this.changes.push('username');
    this.username = username;
}

User.prototype.setPassword = function(password) {
    this.changes.push('password');
    this.password = password;
}

User.prototype.removeVerification = function() {
    this.changes.push('verify');
    this.verify = false;
}

User.prototype.resetAPIKey = function() {
    this.changes.push('apikey');
    this.apikey = uuid.v4();
}

User.prototype.check = function(type, existingPassword, callback) {
    function usernameValidate(username, callback) {
        if (!username) {
            return callback(null, 'A username is required.');
        } 
        else {
            var user = new User();
            user.getByUsername(username, function(error, result) {
                if (error) {
                    return callback(error);
                }
                if (result.length) {
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
            var user = new User();
            user.getByEmail(email, function(error, result) {
                if (error) {
                    return callback(error);
                }
                if (result.length) {
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
        if (this.changes.indexOf('username') !== -1 || !this.changes.length) {
            checks['username'] = async.apply(usernameValidate, this.username);
        }
        if (this.changes.indexOf('email') !== -1 || !this.changes.length) {
            checks['email'] = async.apply(emailValidate, this.email);
            checks['existingPassword'] = async.apply(existingPasswordValidate, existingPassword, this.password);
        }
        if (this.changes.indexOf('password') !== -1 || !this.changes.length) {
            checks['password'] = async.apply(passwordValidate, this.password);
            checks['existingPassword'] = async.apply(existingPasswordValidate, existingPassword, this.password);
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
                if (this.user.verify) {
                    message = 'Welcome to Dewy. Please verify your email address by visiting this link: ' + config.website.url + '/verify/' + this.user.uid + '/' + this.user.verify;
                }
                else {
                    message = 'An account has been created for you on ' + config.website.url + '. Use the username "' + this.user.username + '" and password "' + actualPassword + '" to sign on. Change your password after signing on.';
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
            if (this.changes.indexOf('password')) {
                this.user.password = forge.md.sha1.create().update(this.user.password).digest().toHex();
            }
            db.replace('user::' + this.uid, this.getUserDoc(), function(error, result) {
                if (error) {
                    return callback(error, null);
                }

                if (this.changes.indexOf('verify') !== -1 && !this.verify) {
                    email.send({
                        to: this.email,
                        subject: 'Your Dewy email address has been verified',
                        text: 'Hi ' + this.username + '. Your email address has been verified successfully and has now changed.',
                        html: 'Hi ' + this.username + '.<br/>Your email address has been verified successfully and has now changed.'
                    }, function(error, result) {

                    });
                }
                else if (this.changes.indexOf('email') !== -1) {
                    email.send({
                        to: this.email,
                        subject: 'Your Dewy email address has changed',
                        text: 'Hi ' + this.username + '. Your email address has been changed, please verify your new email address by visiting this link: ' + config.website.url + '/verify/' + this.uid + '/' + this.verify,
                        html: 'Hi ' + this.username + '.<br/>A request has been made to change your email address, please verify your new email address by visiting this link: ' + config.website.url + '/verify/' + this.uid + '/' + this.verify
                    }, function(error, result) {

                    });
                }
            }.bind( {user: this.user} ));
        }
    }.bind( {user: this} ));
}


module.exports = User;