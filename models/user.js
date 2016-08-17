var uuid = require('uuid');
var couchbase = require('couchbase');
var db = require('../api.js').bucket;
var md5 = require('md5');
var email = require('../helpers/email');
var validator = require('validator');
var config = new require('../config')();

function User(email, username, password) {
    this.email = email || null;
    this.username = username || null;
    this.password = password || null;
    this.newEmail = this.email;
    this.gravatar = md5(this.email);
    this.apikey = uuid.v4();
    this.uid = uuid.v4();
    this.verify = uuid.v4();
    this.created = Math.round(new Date().getTime() / 1000);
    this.subscription = {
        startDate: this.created,
        endDate: this.created + (60*60*24*30),
        type: 'trial'
    }

    this._changeEmail = false;
    this._verified = false;
    this._oldEmail = "";
}

User.prototype.get = function(uid, callback) {
    db.get('user::' + uid, function(error, result) {
        if (error) {
            return callback(error, null);
        }
        this.email = result.value.email;
        this.newEmail = result.value.newEmail;
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
        this.email = result.value.email;
        this.newEmail = result.value.newEmail;
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

User.prototype.getByEmail = function(email, callback) {
    query = couchbase.ViewQuery.from('users', 'by_email')
        .key([email])
        .stale(1);
    db.query(query, function(error, result) {
        if (error) {
            return callback(error, null);
        }
        this.email = result.value.email;
        this.newEmail = result.value.newEmail;
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

User.prototype.getByUsername = function(username, callback) {
    query = couchbase.ViewQuery.from('users', 'by_username')
        .key([username])
        .stale(1);
    db.query(query, function(error, result) {
        if (error) {
            return callback(error, null);
        }
        this.email = result.value.email;
        this.newEmail = result.value.newEmail;
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

User.prototype.getUserDoc = function() {
    return {
        email: this.email,
        newEmail: this.newEmail,
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
    this._changeEmail = true;

    this.newEmail = email;
    this.verify = uuid.v4();
}

User.prototype.setUsername = function(username) {
    this.username = username;
}

User.prototype.setPassword = function(password) {
    this.password = password;
}

User.prototype.resetAPIKey = function() {
    this.apikey = uuid.v4();
}

User.prototype.finishVerification = function() {
    this._verified = true;
    this._oldEmail = this.email;

    this.verify = false;
    this.email = this.newEmail;
    this.gravatar = md5(this.email);
}

User.prototype.check = function(callback) {
    var usernameValidate = function(callback) {
        if (!this.username) {
            return callback(null, 'A username is required.');
        } 
        else {
            // Check if username is in use
            User.getByUsername(this.username, function(error, result) {
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
}

User.prototype.create = function(callback) {
    // this.check(function(error, result) {
    //     if (error) {

    //     }
    //     else {
            // db.insert('user::' + this.uid, this.getUserDoc(), function(error, result) {
            //     if (error) {
            //         return callback(error, null);
            //     }

                var message;
                if (this.verify) {
                    message = 'Welcome to Dewy. Please verify your email address by visiting this link: ' + config.website.url + '/verify/' + this.uid + '/' + this.verify;
                }
                else {
                    message = 'An account has been created for you on ' + config.website.url + '.';
                }

                var userDoc = this.getUserDoc();

                email.send({
                    to: this.email,
                    subject: 'Welcome to Dewy',
                    text: 'Hi ' + this.username + '. ' + message,
                    html: 'Hi ' + this.username + '.<br/>' + message
                }, function(error, result) {
                    callback(null, userDoc);
                });
            // });
        // }
    // });
}

User.prototype.update = function(callback) {
    this.check(function(error, result) {
        if (error) {

        }
        else {
            db.replace('user::' + this.uid, this.getUserDoc(), function(error, result) {
                if (error) {
                    return callback(error, null);
                }

                if (this._verified) {
                    email.send({
                        to: this.email,
                        cc: this._oldEmail,
                        subject: 'Your Dewy email address has been verified',
                        text: 'Hi ' + this.username + '. Your email address has been verified successfully and has now changed.',
                        html: 'Hi ' + this.username + '.<br/>Your email address has been verified successfully and has now changed.'
                    }, function(error, result) {

                    });
                }
                else if (this._changeEmail) {
                    email.send({
                        to: this.newEmail,
                        subject: 'Dewy email address change',
                        text: 'Hi ' + newUserDoc.username + '. A request has been made to change your email address, please verify your new email address by visiting this link: ' + config.website.url + '/verify/' + this.uid + '/' + this.verify,
                        html: 'Hi ' + newUserDoc.username + '.<br/>A request has been made to change your email address, please verify your new email address by visiting this link: ' + config.website.url + '/verify/' + this.uid + '/' + this.verify
                    }, function(error, result) {

                    });
                }
            });
        }
    });
}


module.exports = User;