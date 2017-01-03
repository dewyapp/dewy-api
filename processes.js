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

                                            // If there's a security update, update siteDoc with new project
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
                                            // If there's an update, update siteDoc with new project
                                            if (updatedProject.update) {
                                                if (!('projectsWithUpdates' in siteDoc.attributeDetails)) {
                                                    siteDoc.attributeDetails.projectsWithUpdates = [];
                                                }
                                                if (siteDoc.attributeDetails.projectsWithUpdates.indexOf(updatedProject.project) == -1) {
                                                    siteDoc.attributeDetails.projectsWithUpdates.push(updatedProject.project);
                                                    siteDoc.attributes.projectsWithUpdates = siteDoc.attributes.projectsWithUpdates + 1;
                                                    siteProjectValuesChange = true;
                                                }
                                            }

                                            // If there's a maintenance status update, update siteDoc with new project
                                            if (updatedProject.maintenanceStatusChange) {
                                                if (!('projectsThatAreUnsupported' in siteDoc.attributeDetails)) {
                                                    siteDoc.attributeDetails.projectsThatAreUnsupported = [];
                                                }
                                                if (updatedProject.maintenanceStatus == 'Unsupported') {
                                                    if (siteDoc.attributeDetails.projectsThatAreUnsupported.indexOf(updatedProject.project) == -1) {
                                                        siteDoc.attributeDetails.projectsThatAreUnsupported.push(updatedProject.project);
                                                        siteDoc.attributes.projectsThatAreUnsupported = siteDoc.attributes.projectsThatAreUnsupported + 1;
                                                        siteProjectValuesChange = true;
                                                    }
                                                }
                                                else {
                                                    if (siteDoc.attributeDetails.projectsThatAreUnsupported.indexOf(updatedProject.project) != -1) {
                                                        siteDoc.attributeDetails.projectsThatAreUnsupported.splice(siteDoc.attributeDetails.projectsThatAreUnsupported.indexOf(updatedProject.project), 1);
                                                        siteDoc.attributes.projectsThatAreUnsupported = siteDoc.attributes.projectsThatAreUnsupported - 1;
                                                        siteProjectValuesChange = true;
                                                    }
                                                }
                                            }

                                            // If there's a develompent status update, update siteDoc with new project
                                            if (updatedProject.developmentStatusChange) {
                                                if (!('projectsThatAreObsolete' in siteDoc.attributeDetails)) {
                                                    siteDoc.attributeDetails.projectsThatAreObsolete = [];
                                                }
                                                if (updatedProject.developmentStatus == 'Obsolete') {
                                                    if (siteDoc.attributeDetails.projectsThatAreObsolete.indexOf(updatedProject.project) == -1) {
                                                        siteDoc.attributeDetails.projectsThatAreObsolete.push(updatedProject.project);
                                                        siteDoc.attributes.projectsThatAreObsolete = siteDoc.attributes.projectsThatAreObsolete + 1;
                                                        siteProjectValuesChange = true;
                                                    }
                                                }
                                                else {
                                                    if (siteDoc.attributeDetails.projectsThatAreObsolete.indexOf(updatedProject.project) != -1) {
                                                        siteDoc.attributeDetails.projectsThatAreObsolete.splice(siteDoc.attributeDetails.projectsThatAreObsolete.indexOf(updatedProject.project), 1);
                                                        siteDoc.attributes.projectsThatAreObsolete = siteDoc.attributes.projectsThatAreObsolete - 1;
                                                        siteProjectValuesChange = true;
                                                    }
                                                }
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
                                    // If the user has sites with the updated project in question, do further checks to determine if notification necessary
                                    if (sitesWithProject.length) {
                                        // Get user details
                                        User.get(uid, function(error, result) {
                                            var user = result;
                                            if (error) {
                                                return callback();
                                            }

                                            // Compile updates
                                            var updates = [];
                                            if (updatedProject.maintenanceStatusChange) {
                                                updates.push({
                                                    type: 'statusChange',
                                                    subject: 'Maintenance status change for ' + updatedProject.project,
                                                    update: 'The maintenance status for ' + updatedProject.project + ' has changed to "' + updatedProject.maintenanceStatus + '"',
                                                    updateHTML: 'The maintenance status for ' + updatedProject.project + ' has changed to <strong>"' + updatedProject.maintenanceStatus + '"</strong>',
                                                    additionalInfo: 'The project status may affect how you wish to use this project going forward, but no action is required.'
                                                });
                                            }
                                            if (updatedProject.developmentStatusChange) {
                                                updates.push({
                                                    type: 'statusChange',
                                                    subject: 'Development status change for ' + updatedProject.project,
                                                    update: 'The development status for ' + updatedProject.project + ' has changed to "' + updatedProject.developmentStatus + '"',
                                                    updateHTML: 'The development status for ' + updatedProject.project + ' has changed to <strong>"' + updatedProject.developmentStatus + '"</strong>',
                                                    additionalInfo: 'The project status may affect how you wish to use this project going forward, but no action is required.'
                                                });
                                            }
                                            if (updatedProject.update) {
                                                updates.push({
                                                    type: 'update',
                                                    subject: 'Update released for ' + updatedProject.project,
                                                    update: 'An update (' + updatedProject.latestVersion + ') has been released for ' + updatedProject.project + ': https://www.drupal.org/project/' + updatedProject.project + ' . View the release notes: https://www.drupal.org/project/' + updatedProject.project + '/releases/' + updatedProject.latestVersion,
                                                    updateHTML: 'An update (<strong>' + updatedProject.latestVersion + '</strong>) has been released for <a href="https://www.drupal.org/project/' + updatedProject.project + '">' + updatedProject.project + '</a>. View the <a href="https://www.drupal.org/project/' + updatedProject.project + '/releases/' + updatedProject.latestVersion + '">release notes</a>',
                                                    additionalInfo: 'This is not a security update and no further action is required.'
                                                });
                                            }
                                            if (updatedProject.securityUpdate) {
                                                updates.push({
                                                    type: 'securityUpdate',
                                                    subject: 'Security update released for ' + updatedProject.project,
                                                    update: 'A security update (' + updatedProject.latestVersion + ') has been released for ' + updatedProject.project + ': https://www.drupal.org/project/' + updatedProject.project + ' . View the release notes: https://www.drupal.org/project/' + updatedProject.project + '/releases/' + updatedProject.latestVersion,
                                                    updateHTML: 'A security update (<strong>' + updatedProject.latestVersion + '</strong>) has been released for <a href="https://www.drupal.org/project/' + updatedProject.project + '">' + updatedProject.project + '</a>. View the <a href="https://www.drupal.org/project/' + updatedProject.project + '/releases/' + updatedProject.latestVersion + '">release notes</a>',
                                                    additionalInfo: 'This update is a security update and it is strongly recommended you take action to update your sites.'
                                                });
                                            }

                                            // Send updates
                                            async.eachSeries(updates, function(update, callback) {
                                                // If user has notification level that satisfies this project update, send email
                                                if (user.notifications != 'none' && (update.type == 'securityUpdate' || user.notifications == 'all')) {
                                                    var detailsText = '';
                                                    var detailsHTML = '</font></p><table border="1" frame="hsides" rules="rows" bordercolor="#EEE" cellpadding="14" width="100%">';
                                                    for (siteWithProject in sitesWithProject) {
                                                        detailsText = detailsText + "\n" + sitesWithProject[siteWithProject].baseurl + ' (' + sitesWithProject[siteWithProject].version + ')';
                                                        detailsHTML = detailsHTML + '<tr><td><span style="font-family: Helvetica,Arial,sans-serif;font-size:14px;color:#666"><font color="#666"><strong>' + sitesWithProject[siteWithProject].baseurl + '</strong></font></span></td><td><span style="font-family: Helvetica,Arial,sans-serif;font-size:14px;color:#666"><font color="#666">' + sitesWithProject[siteWithProject].version + '</font></strong></span></td></tr>'; 
                                                    }
                                                    detailsHTML = detailsHTML + '</table><p style="padding: 28px 0 28px 0;font-family: Helvetica,Arial,sans-serif;font-size:14px;color:#666"><font color="#666">';

                                                    email.send({
                                                        to: user.email,
                                                        subject: update.subject,
                                                        text: 'Hi ' + user.username + '. ' + update.update + '. ' + sitesWithProject.length + ' of your sites use the project:' + detailsText + "\n" + update.additionalInfo,
                                                        html: 'Hi ' + user.username + '.<br/>' + update.updateHTML + '. ' + sitesWithProject.length + ' of your sites use the project:' + detailsHTML + update.additionalInfo,
                                                    }, function(error, result) {
                                                        if (error) {
                                                            console.log('Failed to send a notification for ' + user.email);
                                                            return callback();
                                                        }
                                                        console.log('Notification sent for ' + uid + ': ' + update.subject);
                                                        callback();
                                                    });
                                                }
                                                else {
                                                    callback();
                                                }
                                            }, function(error) {
                                                callback();
                                            });
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
    // Get all users
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
                    // Get the individual user
                    User.get(uid, function(error, result) {
                        if (error) {
                            results.push('Failed to retrieve user ' + uid);
                            return callback();
                        }

                        var user = result;
                        // Get a filters with notifications enabled for that user
                        query = couchbase.ViewQuery.from('filters', 'by_uid')
                            .key([uid, true]);
                        db.query(query, function(error, result) {
                            if (error) {
                                results.push('Retrieved user ' + uid + ' but failed to retrieve filters');
                                return callback();
                            }

                            var filters = result;
                            async.each(filters, function(filter, callback) {
                                // Get filter details
                                db.get('filter::' + filter.value.fid, function(error, result) {
                                    if (error) {
                                        results.push('Retrieved user ' + uid + ' but failed to retrieve filter ' + filter.fid);
                                        return callback();
                                    }

                                    var filter = result.value;
                                    console.log('Filter ' + filter.fid + ' for user ' + uid + ' found with notification rules');
                                    // Process the filter and retrive list of sites
                                    sites.getAll(uid, filter.fid, function(error, result) {
                                        if (error) {
                                            results.push('Retrieved user ' + uid + ' but failed to retrieve sites from filter ' + filter.fid);
                                            return callback();
                                        }

                                        var siteBaseURLsInFilter = {}
                                        var sitesInFilter = [];
                                        for (site in result) {
                                            sitesInFilter.push(result[site].sid);
                                            siteBaseURLsInFilter[result[site].sid] = result[site].baseurl;
                                        }
                                        // Add site results to filter history
                                        FilterHistory.get(filter.fid, function(error, result) {
                                            if (error) {
                                                var result = new FilterHistory(filter.fid, sitesInFilter);
                                            }
                                            else {
                                                result.setSitesInFilter(sitesInFilter);
                                            }
                                            result.update(function(error, result) {
                                                if (error) {
                                                    results.push('Failed to update filter history for user ' + uid + ' on filter ' + filter.fid + ': ' + JSON.stringify(error));
                                                    return callback();
                                                }
                                                console.log('Updated filter history for user ' + uid + ' on filter ' + filter.fid + ' | site total: ' + result.sites.length + ' | previous site total: ' + result.previousSites.length + ' | sites added: ' +  result.sitesAdded.length + ' | sites removed: ' + result.sitesRemoved.length);
                                                
                                                // With filter history in hand, see if filter notification rules are satisfied
                                                var emailsToSend = {};
                                                if (filter.notifications.appears.enabled && result.sitesAdded.length) {
                                                    var detailsText = '';
                                                    var detailsHTML = '</font></p><table border="1" frame="hsides" rules="rows" bordercolor="#EEE" cellpadding="14" width="100%">';
                                                    for (site in result.sitesAdded) {
                                                        detailsText = detailsText + "\n" + siteBaseURLsInFilter[result.sitesAdded[site]];
                                                        detailsHTML = detailsHTML + '<tr><td><span style="font-family: Helvetica,Arial,sans-serif;font-size:14px;color:#666"><font color="#666"><strong>' + siteBaseURLsInFilter[result.sitesAdded[site]] + '</strong></font></span></td></tr>'; 
                                                    }
                                                    detailsHTML = detailsHTML + '</table>';
                                                    var subject = result.sitesAdded.length + ' new sites are now on the filter "' + filter.title + '"';
                                                    if (result.sitesAdded.length == 1) {
                                                        subject = result.sitesAdded.length + ' new site is now on the filter "' + filter.title + '"';
                                                    }

                                                    emailsToSend['sitesAdded'] = async.apply(email.send, {
                                                        to: user.email,
                                                        subject: subject,
                                                        text: 'Hi ' + user.username + '.\nThe following sites now appear on the filter "' + filter.title + '":' + detailsText,
                                                        html: 'Hi ' + user.username + '.<br/>The following sites now appear on the filter "' + filter.title + '":' + detailsHTML,
                                                    });
                                                }
                                                if (filter.notifications.disappears.enabled && result.sitesRemoved.length) {
                                                    var detailsText = '';
                                                    var detailsHTML = '</font></p><table border="1" frame="hsides" rules="rows" bordercolor="#EEE" cellpadding="14" width="100%">';
                                                    for (site in result.sitesRemoved) {
                                                        detailsText = detailsText + "\n" + siteBaseURLsInFilter[result.sitesRemoved[site]];
                                                        detailsHTML = detailsHTML + '<tr><td><span style="font-family: Helvetica,Arial,sans-serif;font-size:14px;color:#666"><font color="#666"><strong>' + siteBaseURLsInFilter[result.sitesRemoved[site]] + '</strong></font></span></td></tr>'; 
                                                    }
                                                    detailsHTML = detailsHTML + '</table>';
                                                    var subject = result.sitesRemoved.length + ' sites are no longer on the filter "' + filter.title + '"';
                                                    if (result.sitesRemoved.length == 1) {
                                                        subject = result.sitesRemoved.length + ' site is no longer on the filter "' + filter.title + '"';
                                                    }

                                                    emailsToSend['sitesRemoved'] = async.apply(email.send, {
                                                        to: user.email,
                                                        subject: subject,
                                                        text: 'Hi ' + user.username + '.\nThe following sites no longer appear on the filter "' + filter.title + '":' + detailsText,
                                                        html: 'Hi ' + user.username + '.<br/>The following sites no longer appear on the filter "' + filter.title + '":' + detailsHTML,
                                                    });
                                                }
                                                if (filter.notifications.total.enabled && result.sites.length != result.previousSites.length && ((filter.notifications.total.choice == 'is' && result.sites.length == filter.notifications.total.value) ||
                                                (filter.notifications.total.choice == 'is not' && result.sites.length != filter.notifications.total.value) ||
                                                (filter.notifications.total.choice == 'is greater than' && result.sites.length > filter.notifications.total.value) ||
                                                (filter.notifications.total.choice == 'is less than' && result.sites.length < filter.notifications.total.value) ||
                                                (filter.notifications.total.choice == 'is greater than or equal to' && result.sites.length >= filter.notifications.total.value) ||
                                                (filter.notifications.total.choice == 'is less than or equal to' && result.sites.length <= filter.notifications.total.value))) {
                                                    var detailsText = '';
                                                    var detailsHTML = '</font></p><table border="1" frame="hsides" rules="rows" bordercolor="#EEE" cellpadding="14" width="100%">';
                                                    for (site in result.sites) {
                                                        detailsText = detailsText + "\n" + siteBaseURLsInFilter[result.sites[site]];
                                                        detailsHTML = detailsHTML + '<tr><td><span style="font-family: Helvetica,Arial,sans-serif;font-size:14px;color:#666"><font color="#666"><strong>' + siteBaseURLsInFilter[result.sites[site]] + '</strong></font></span></td></tr>'; 
                                                    }
                                                    detailsHTML = detailsHTML + '</table>';
                                                    var subject = 'There are now ' + result.sites.length + ' sites on the filter "' + filter.title + '"';
                                                    if (result.sites.length == 1) {
                                                        subject = 'There is now ' + result.sites.length + ' site on the filter "' + filter.title + '"';
                                                    }

                                                    emailsToSend['sitesTotal'] = async.apply(email.send, {
                                                        to: user.email,
                                                        subject: subject,
                                                        text: 'Hi ' + user.username + '.\nThe following sites are on the filter "' + filter.title + '":' + detailsText,
                                                        html: 'Hi ' + user.username + '.<br/>The following sites are on the filter "' + filter.title + '":' + detailsHTML,
                                                    });
                                                }

                                                // Send emails
                                                async.series(emailsToSend, function(error, result) {
                                                    if (error) {
                                                        results.push('Failed to send notification to user ' + uid + ' on filter ' + filter.fid + ': ' + error);
                                                        return callback();
                                                    }
                                                    callback();
                                                });
                                            });
                                        });
                                    });
                                });
                            }, function (error) {
                                callback();
                            });
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
                                    results.push('Failed to send a notification for ' + user.uid);
                                    callback();
                                }
                                else {
                                    email.send({
                                        to: user.email,
                                        subject: subject,
                                        text: 'Hi ' + user.username + '.\n' + text,
                                        html: 'Hi ' + user.username + '.<br/>' + text,
                                    }, function(error, result) {
                                        if (error) {
                                            results.push('Failed to send a notification for ' + user.uid);
                                            return callback();
                                        }
                                        console.log('Notification sent for ' + user.uid + ': ' + subject);
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
