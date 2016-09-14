var async = require('async');
var modules = require('./models/modules');
var sites = require('./models/sites');
var User = require('./models/user');
var email = require('./helpers/email');
var couchbase = require('couchbase');
var db = require('./api.js').bucket;
var config = new require('./config')();

exports.auditAll = function(callback) {
    sites.auditAll(function(error, result) {
        if (error) {
            return callback(error, null);
        }
        return callback(null, result);
    });
}

exports.getReleases = function(callback) {
    modules.getReleases(function(error, result) {
        if (error) {
            return callback(error, null);
        }
        return callback(null, result);
    });
}

exports.notifyUsers = function(callback) {
    query = couchbase.ViewQuery.from('users', 'by_username')
        .stale(1);
    db.query(query, function(error, result) {
        if (error) {
            return callback(error);
        }
        if (result.length) {
            var results = [];
            async.eachLimit(result, 1,
                function(row, callback) {
                    var uid = row.value;
                    User.get(uid, function(error, result) {
                        if (error) {
                            results.push('Failed to retrieve user ' + row.id);
                            return callback();
                        }

                        var user = result;
                        var now = Math.round(new Date().getTime() / 1000);
                        var subject, text, html;
                        if (user.lastNotified + 3600 < now && user.subscription.endDate + 3600 < now) {
                            // User has been expired for an hour
                            subject = "Your " + user.subscription.type + " Dewy subscription has expired";
                            text = "Please renew your subscription to Dewy at " + config.website.url + " so you don't miss a beat on what your sites are doing.";
                        }
                        if (user.lastNotified + 604800 < now && user.subscription.endDate + 604800 < now) {
                            // User has been expired for a week
                            subject = "What are your sites up to now?";
                            text = "It has been a week since your " + user.subscription.type + " subscription to Dewy has expired. A lot could have changed for your Drupal sites since then! Renew your subscription at " + config.website.url + " to get back into the action."
                        }
                        else if (user.subscription.type == 'trial') {
                            if (!user.lastNotified && user.subscription.endDate - now < 172800) {
                                // User will expire in less than 2 days
                                subject = "There are 2 days remaining in your Dewy trial";
                                text = "Please sign up for a Dewy subscription at " + config.website.url + " before features are disabled for your account.";
                            }
                            else if (user.lastNotified - now > 86400 && user.subscription.endDate - now < 86400) {
                                subject = "There is 1 day remaining in your Dewy trial";
                                text = "Please sign up for a Dewy subscription at " + config.website.url + " before features are disabled for your account.";
                            }
                        }

                        if (subject) {
                            user.setLastNotified();
                            user.update(null, function(error, result) {
                                if (error) {
                                    results.push('Failed to send a notification for ' + row.id);
                                    callback();
                                }
                                else {
                                    email.send({
                                        to: user.email,
                                        subject: subject,
                                        text: 'Hi ' + user.username + '. ' + text,
                                        html: 'Hi ' + user.username + '.<br/>' + text,
                                    }, function(error, result) {
                                        if (error) {
                                            results.push('Failed to send a notification for ' + row.id);
                                            return callback();
                                        }
                                        console.log('Notification sent for ' + row.id + ': ' + subject);
                                        callback();
                                    });
                                }
                            });
                        }
                        else {
                            callback();
                        }
                    });
                },
                function(error){
                    if (results.length) {
                        console.log('Notifications finished, ' + results.length + ' non-successful results occurred:');
                        console.log(results);
                    }
                    else {
                        console.log('Notifications finished');
                    }
                    callback();
                }
            );  
        }
        else {
            console.log('There are no users to notify');
            callback();
        }
    });
}
