var express = require('express');
var app = express();
var uuid = require('uuid');
var couchbase = require('couchbase');
var db = require('../app.js').bucket;
var md5 = require('md5');
var email = require('../helpers/email');
var config = new require('../config')();

exports.create = function(userDoc, callback) {
    // Construct user document
    var startDate = new Date().getTime() / 1000;
    startDate = Math.round(startDate);
    var endDate = startDate + (60*60*24*30);

    var userDoc = {
        uid: uuid.v4(),
        apikey: uuid.v4(),
        username: userDoc.username,
        email: userDoc.email,
        password: userDoc.password,
        verify: uuid.v4(),
        created: startDate,
        subscription: {
            startDate: startDate,
            endDate: endDate,
            type: 'trial'
        },
        stripe: {}
    };
    db.insert('user::' + userDoc.uid, userDoc, function(error, result) {
        if (error) {
            callback(error, null);
            return;
        }

        email.send({
            to: userDoc.email,
            subject: 'Welcome to Dewy',
            text: 'Hi ' + userDoc.username + '! Welcome to Dewy. Please verify your email address by visiting this link: ' + config.website.url + '/verify/' + userDoc.uid + '/' + userDoc.verify
        }, function(error, result) {

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
        newUserDoc.verify = uuid.v4();
    }
    db.replace('user::' + existingUserDoc.uid, newUserDoc, function(error, result) {
        if (error) {
            callback(error, null);
            return;
        }

        if (existingUserDoc.email != newUserDoc.email) {
            email.send({
                to: newUserDoc.email,
                cc: existingUserDoc.email,
                subject: 'Your Dewy email address has changed',
                text: 'Hi ' + newUserDoc.username + '! Your email address has changed, please verify your email address by visiting this link: ' + config.website.url + '/verify/' + newUserDoc.uid + '/' + newUserDoc.verify
            }, function(error, result) {

            });
        }
        else if (existingUserDoc.verify && !newUserDoc.verify) {
            email.send({
                to: newUserDoc.email,
                cc: existingUserDoc.email,
                subject: 'Your Dewy email address has been verified',
                text: 'Hi ' + newUserDoc.username + '! Your email address has been verified successfully.'
            }, function(error, result) {

            });
        }
        // Hash email for Gravatar
        var userDoc = newUserDoc;
        userDoc.gravatar = md5(userDoc.email); 
        callback(null, userDoc);
    });
}