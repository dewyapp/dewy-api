var uuid = require('uuid');
var couchbase = require('couchbase');
var db = require('../app.js').bucket;
var md5 = require('md5');
var nodemailer = require('nodemailer');
var mg = require('nodemailer-mailgun-transport');
var config = require('../config');

exports.create = function(userDoc, callback) {
    // Construct user document
    var userDoc = {
        uid: uuid.v4(),
        apikey: uuid.v4(),
        username: userDoc.username,
        email: userDoc.email,
        password: userDoc.password,
        verified: false
    };
    db.insert('user::' + userDoc.uid, userDoc, function(error, result) {
        if (error) {
            callback(error, null);
            return;
        }

        var nodemailerMailgun = nodemailer.createTransport(mg({auth: config.mailgun}));
        nodemailerMailgun.sendMail({
            from: 'noreply@dewy.io',
            to: userDoc.email,
            subject: 'Welcome to Dewy',
            text: 'Hi!',
        }, function (error, result) {
            if (error) {
                console.log('Error: ' + error);
            }
            else {
                console.log('Response: ' + result);
            }
        });

        callback(null, userDoc);
    });
}

exports.get = function(uid, callback) {
    db.get('user::' + uid, function(error, result) {
        if (error) {
            callback(error, null);
            return;
        }
        // Hash email for Gravatar
        var userDoc = result.value;
        userDoc.gravatar = md5(userDoc.email); 
        callback(null, userDoc);
    });
}

exports.getByApiKey = function(apikey, callback) {
    query = couchbase.ViewQuery.from('users', 'by_apikey')
        .key([apikey])
        .stale(1);
    db.query(query, function(error, result) {
        if (error) {
            callback(error, null);
            return;
        }
        callback(null, result);
    });
}

exports.getByEmail = function(email, callback) {
    query = couchbase.ViewQuery.from('users', 'by_email')
        .key([email])
        .stale(1);
    db.query(query, function(error, result) {
        if (error) {
            callback(error, null);
            return;
        }
        callback(null, result);
    });
}

exports.getByUsername = function(username, callback) {
    query = couchbase.ViewQuery.from('users', 'by_username')
        .key([username])
        .stale(1);
    db.query(query, function(error, result) {
        if (error) {
            callback(error, null);
            return;
        }
        callback(null, result);
    });
}

exports.update = function(existingUserDoc, newUserDoc, callback) {
    if (existingUserDoc.email != newUserDoc.email) {
        newUserDoc.verified = false;
    }
    db.replace('user::' + existingUserDoc.uid, newUserDoc, function(error, result) {
        if (error) {
            callback(error, null);
            return;
        }

        if (existingUserDoc.email != newUserDoc.email) {
            var nodemailerMailgun = nodemailer.createTransport(mg({auth: config.mailgun}));
            nodemailerMailgun.sendMail({
                from: 'noreply@dewy.io',
                to: newUserDoc.email,
                cc: existingUserDoc.email,
                subject: 'Your Dewy email address has changed',
                text: 'Hi!',
            }, function (error, result) {
                if (error) {
                    console.log('Error: ' + error);
                }
                else {
                    console.log('Response: ' + result);
                }
            });
        }
        callback(null, result);
    });
}