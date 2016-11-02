var async = require('async');
var modules = require('./models/modules');
var sites = require('./models/sites');
var User = require('./models/user');
var Users = require('./collections/users');
var email = require('./helpers/email');
var couchbase = require('couchbase');
var db = require('./api.js').bucket;
var config = require('./config');

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
        var updatedProjects = result;

        // Loop through each updated project release
        async.eachSeries(updatedProjects, function(updatedProject, callback) {
            console.log('Project ' + updatedProject.project + '-' + updatedProject.core + ' has new updates');

            // Get affected sites and update them
            var maxModuleUpdateLevel = 0;
            if (updatedProject.securityUpdate) {
                maxModuleUpdateLevel = 1;
            }
            Users.getUsers(null, function(error, result) {
                if (error) {
                    console.log('Failed to retrieve users: ' + error);
                    callback();
                } else {
                    async.eachLimit(result, 1, function(row, callback) {
                        var uid = row.value;
                        var userEmail = row.key;
                        sites.getByProject(uid, updatedProject.project, updatedProject.core, maxModuleUpdateLevel, function(error, result) {
                            if (error) {
                                console.log('Failed to retrieve affected sites for uid ' + uid + ': ' + error);
                                callback();
                            }
                            else {
                                var sitesUpdated = [];
                                async.eachSeries(result, function(siteResult, callback) {
                                    sites.get(siteResult, function(error, result) {
                                        if (error) {
                                            console.log('Failed to retrive site ' + sid + ': ' + error);
                                            callback();
                                        }
                                        else {
                                            var siteDoc = result;
                                            var date = new Date().getTime() / 1000;
                                            date = Math.round(date);
                                            siteDoc.lastUpdated = date;
                                            sitesUpdated.push(siteDoc.baseurl);

                                            // Loop through all modules associated with project
                                            for (module in siteDoc.details.projects[updatedProject.project].modules) {
                                                if (updatedProject.securityUpdate) {
                                                    if (!('projectsWithSecurityUpdates' in siteDoc.attributeDetails)) {
                                                        siteDoc.attributeDetails.projectsWithSecurityUpdates = [];
                                                    }
                                                    if (siteDoc.attributeDetails.projectsWithSecurityUpdates.indexOf(module) == -1) {
                                                        siteDoc.attributeDetails.projectsWithSecurityUpdates.push(module);
                                                        siteDoc.attributes.projectsWithSecurityUpdates = siteDoc.attributes.projectsWithSecurityUpdates + 1;
                                                    }
                                                }
                                                if (!('projectsWithUpdates' in siteDoc.attributeDetails)) {
                                                    siteDoc.attributeDetails.projectsWithUpdates = [];
                                                }
                                                if (siteDoc.attributeDetails.projectsWithUpdates.indexOf(module) == -1) {
                                                    siteDoc.attributeDetails.projectsWithUpdates.push(module);
                                                    siteDoc.attributes.projectsWithUpdates = siteDoc.attributes.projectsWithUpdates + 1;
                                                }
                                            }

                                            console.log('Updating project ' + updatedProject.project + ' for ' + uid + ' on ' + siteDoc.sid);
                                            sites.update(siteDoc, function(error, result) {
                                                if (error) {
                                                    console.log('Failed to update site ' + siteDoc.sid + ': ' + error);
                                                    callback();
                                                }
                                                else {
                                                    callback();
                                                }
                                            });
                                        }
                                    });
                                }, function(error) {
                                    console.log(sitesUpdated.length + ' sites for user ' + uid + ' with project ' + updatedProject.project + ' required updates and were updated');
                                    // Send an email notification for any updates
                                    if (sitesUpdated.length) {
                                        var detailsText = '';
                                        var detailsHTML = '<table border="1" frame="hsides" rules="rows" bordercolor="#EEE" cellpadding="14" width="100%">';
                                        for (siteUpdated in sitesUpdated) {
                                            detailsText = detailsText + "\n" + sitesUpdated[siteUpdated];
                                            detailsHTML = detailsHTML + '<tr><td><span style="font-family: Helvetica,Arial,sans-serif;font-size:14px;color:#666"><strong>' + sitesUpdated[siteUpdated] + '</strong></span></tr>'; 
                                        }
                                        detailsHTML = detailsHTML + '</table>';

                                        var subject = 'Update released for ' + updatedProject.project;
                                        var updateType = 'An update';
                                        if (updatedProject.securityUpdate) {
                                            var subject = 'Security update released for ' + updatedProject.project;
                                            updateType = 'A security update';
                                        }

                                        email.send({
                                            to: userEmail,
                                            subject: subject,
                                            text: 'Hi ' + '. ' + updateType + ' has been released for ' + updatedProject.project + ' affecting ' + sitesUpdated.length + ' of your sites.' + detailsText,
                                            html: 'Hi ' + '.<br/>' + updateType + ' has been released for <a href="https://www.drupal.org/project/' + updatedProject.project + '">' + updatedProject.project + '</a> affecting ' + sitesUpdated.length + ' of your sites:' + detailsHTML,
                                        }, function(error, result) {
                                            if (error) {
                                                console.log('Failed to send a notification for ' + userEmail);
                                                return callback();
                                            }
                                            console.log('Notification sent for ' + uid + ': ' + subject);
                                            callback();
                                        });
                                    }
                                    else {
                                        callback();
                                    }
                                });
                            }
                        });
                    }, function(error){
                        callback();
                    });
                }
            });
        }, function(error) {
            callback(null, 'Release gathering complete');
        });
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
                        if (config.subscriptionRequired) {
                            // User has been expired for a week
                            if (user.lastNotified < user.subscription.endDate + 604800 && user.subscription.endDate + 604800 < now) {
                                subject = "What are your Drupal sites up to now?";
                                text = "It has been a week since your " + user.subscription.type + " subscription to Dewy ended. A lot could have changed for your Drupal sites since then! Renew your subscription at " + config.website + " to get back into the action."
                            }
                            // User is on a trial
                            else if (user.subscription.type == 'standard' && !user.subscription.stripeID) {
                                // User will expire in less than 2 days
                                if (!user.lastNotified && user.subscription.endDate - now < 172800 && user.subscription.endDate - now >= 86400) {
                                    subject = "There are 2 days remaining in your Dewy trial";
                                    text = "Please sign up for a Dewy subscription at " + config.website + " before features are disabled for your account.";
                                }
                                // User will expire in less than a day
                                else if (user.lastNotified < user.subscription.endDate - 86400 && user.subscription.endDate - now < 86400) {
                                    subject = "There is 1 day remaining in your Dewy trial";
                                    text = "Please sign up for a Dewy subscription at " + config.website + " before features are disabled for your account.";
                                }
                                // User has been expired for an hour
                                else if (user.lastNotified < user.subscription.endDate + 3600 && user.subscription.endDate + 3600 < now) {
                                    subject = "Your Dewy trial subscription has expired";
                                    text = "Thank you for trying Dewy. Please start your subscription to Dewy at " + config.website + " so you don't miss a beat on what your sites are doing.";
                                }
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
