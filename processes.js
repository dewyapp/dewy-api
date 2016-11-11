var async = require('async');
var modules = require('./models/modules');
var sites = require('./models/sites');
var filters = require('./models/filters');
var User = require('./models/user');
var FilterHistory = require('./models/filterHistory');
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
                        sites.getByProject(uid, updatedProject.project, updatedProject.core, 2, function(error, result) {
                            if (error) {
                                console.log('Failed to retrieve affected sites for uid ' + uid + ': ' + error);
                                callback();
                            }
                            else {
                                var sitesUpdated = 0;
                                var sitesWithProject = [];
                                async.eachSeries(result, function(siteResult, callback) {
                                    sites.get(siteResult, function(error, result) {
                                        if (error) {
                                            console.log('Failed to retrive site ' + sid + ': ' + error);
                                            callback();
                                        }
                                        else {
                                            var siteProjectValuesChange = false;
                                            var siteDoc = result;
                                            var date = new Date().getTime() / 1000;
                                            date = Math.round(date);
                                            siteDoc.lastUpdated = date;
                                            sitesWithProject.push({baseurl: siteDoc.baseurl, version: siteDoc.details.projects[updatedProject.project].version });

                                            // Update siteDoc's update/securityUpdate attributes with new project
                                            if (updatedProject.securityUpdate) {
                                                if (!('projectsWithSecurityUpdates' in siteDoc.attributeDetails)) {
                                                    siteDoc.attributeDetails.projectsWithSecurityUpdates = [];
                                                }
                                                if (siteDoc.attributeDetails.projectsWithSecurityUpdates.indexOf(updatedProject.project) == -1) {
                                                    siteDoc.attributeDetails.projectsWithSecurityUpdates.push(updatedProject.project);
                                                    siteDoc.attributes.projectsWithSecurityUpdates = siteDoc.attributes.projectsWithSecurityUpdates + 1;
                                                    siteProjectValuesChange = true;
                                                }
                                            }
                                            if (!('projectsWithUpdates' in siteDoc.attributeDetails)) {
                                                siteDoc.attributeDetails.projectsWithUpdates = [];
                                            }
                                            if (siteDoc.attributeDetails.projectsWithUpdates.indexOf(updatedProject.project) == -1) {
                                                siteDoc.attributeDetails.projectsWithUpdates.push(updatedProject.project);
                                                siteDoc.attributes.projectsWithUpdates = siteDoc.attributes.projectsWithUpdates + 1;
                                                siteProjectValuesChange = true;
                                            }

                                            if (siteProjectValuesChange) {
                                                sitesUpdated = sitesUpdated + 1;
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
                                            else {
                                                callback();
                                            }
                                        }
                                    });
                                }, function(error) {
                                    console.log(sitesUpdated + ' siteDocs for user ' + uid + ' with project ' + updatedProject.project + ' required updates and were updated');
                                    // If the user has sites with the updated project in question, do further checks to dermine if notification necessary
                                    if (sitesWithProject.length) {
                                        // Get user details
                                        User.get(uid, function(error, result) {
                                            var user = result;
                                            if (error) {
                                                return callback();
                                            }

                                            // If user has notification level that satisfies this project update, send email
                                            if (user.notifications != 'none' && (updatedProject.securityUpdate || user.notifications == 'all')) {
                                                var detailsText = '';
                                                var detailsHTML = '</font></p><table border="1" frame="hsides" rules="rows" bordercolor="#EEE" cellpadding="14" width="100%">';
                                                for (siteWithProject in sitesWithProject) {
                                                    detailsText = detailsText + "\n" + sitesWithProject[siteWithProject].baseurl + ' (' + sitesWithProject[siteWithProject].version + ')';
                                                    detailsHTML = detailsHTML + '<tr><td><span style="font-family: Helvetica,Arial,sans-serif;font-size:14px;color:#666"><font color="#666"><strong>' + sitesWithProject[siteWithProject].baseurl + '</strong></font></span></td><td><span style="font-family: Helvetica,Arial,sans-serif;font-size:14px;color:#666"><font color="#666">' + sitesWithProject[siteWithProject].version + '</font></strong></span></td></tr>'; 
                                                }
                                                detailsHTML = detailsHTML + '</table><p style="padding: 28px 0 28px 0;font-family: Helvetica,Arial,sans-serif;font-size:14px;color:#666"><font color="#666">';

                                                var subject = 'Update released for ' + updatedProject.project;
                                                var updateType = 'An update';
                                                var additionalInfo = 'This is not a security update and no further action is required.';
                                                if (updatedProject.securityUpdate) {
                                                    subject = 'Security update released for ' + updatedProject.project;
                                                    updateType = 'A security update';
                                                    additionalInfo = 'This update is a security update and it is strongly recommended you take action to update your sites.';
                                                }

                                                email.send({
                                                    to: user.email,
                                                    subject: subject,
                                                    text: 'Hi ' + user.username + '. ' + updateType + ' (' + updatedProject.latestVersion + ') has been released for ' + updatedProject.project + '. ' + sitesWithProject.length + ' of your sites use the project:' + detailsText + "\n" + additionalInfo,
                                                    html: 'Hi ' + user.username + '.<br/>' + updateType + ' (<strong>' + updatedProject.latestVersion + '</strong>) has been released for <a href="https://www.drupal.org/project/' + updatedProject.project + '">' + updatedProject.project + '</a>. ' + sitesWithProject.length + ' of your sites use the project:' + detailsHTML + additionalInfo,
                                                }, function(error, result) {
                                                    if (error) {
                                                        console.log('Failed to send a notification for ' + user.email);
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

exports.notifyFilters = function(callback) {
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
                            results.push('Failed to retrieve user ' + uid);
                            return callback();
                        }
                        query = couchbase.ViewQuery.from('filters', 'by_uid')
                            .key([uid, true]);
                        db.query(query, function(error, result) {
                            if (error) {
                                results.push('Retrieved user ' + uid + ' but failed to retrieve filters');
                                return callback();
                            }
                            for (item in result) {
                                var filter = result[item].value;
                                console.log('Filter ' + filter.fid + ' for ' + uid + ' found with notification rules');
                                sites.getAll(uid, filter.fid, function(error, result) {
                                    if (error) {
                                        results.push('Retrieved user ' + uid + ' but failed to retrieve sites from filter ' + filter.fid);
                                        return callback();
                                    }
                                    var sitesInFilter = [];
                                    for (site in result) {
                                        sitesInFilter.push(result[site].sid);
                                    }
                                    FilterHistory.get(filter.fid, function(error, result) {
                                        if (error) {
                                            var result = new FilterHistory(filter.fid, sitesInFilter);
                                        }
                                        else {
                                            result.setSitesInFilter(sitesInFilter);
                                        }
                                        result.update(function(error, result) {
                                            if (error) {
                                                results.push('Failed to update filter history for ' + uid + ' on filter ' + filter.fid + ': ' + error);
                                                return callback();
                                            }
                                            console.log('Updated filter history for ' + uid + ' on filter ' + filter.fid + ' | site total: ' + result.totalSites + ' | previous site total: ' + result.previousTotalSites + ' | sites added: ' +  result.sitesAdded.length + ' | sites removed: ' + result.sitesRemoved.length);
                                            callback();
                                        });
                                    });
                                });
                            }
                        });
                    });
                },
                function(error){
                    if (results.length) {
                        console.log('Notifications for filters finished, ' + results.length + ' non-successful results occurred:');
                        console.log(results);
                    }
                    else {
                        console.log('Notifications for filters finished');
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

exports.notifySubscriptions = function(callback) {
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
                        console.log('Notifications for subscriptions finished, ' + results.length + ' non-successful results occurred:');
                        console.log(results);
                    }
                    else {
                        console.log('Notifications for subscriptions finished');
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
