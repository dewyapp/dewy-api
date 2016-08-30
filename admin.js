var async = require('async');
var randomstring = require('randomstring');
var uuid = require('uuid');
var User = require('./models/user');
var sites = require('./models/sites');
var email = require('./helpers/email');
var config = new require('./config')();

exports.addFakeSites = function(uid, numberOfSites, callback) {
    var createSiteName = function(domains) {
        var prefixChoices = ['local', 'super', 'awesome', 'great', 'red', 'blue', 'green', 'yellow', 'big', 'small', 'eco', 'square', 'circle', 'cosmic', 'classic', 'logical', 'happy', 'pleasant', 'striped', 'paisley', 'proud', 'natural'];
        var nounChoices = ['puppies', 'kittens', 'eats', 'delicious', 'design', 'instruction', 'training', 'university', 'college', 'agency', 'garden', 'business', 'sports', 'recreation', 'creative', 'tourism', 'hotel', 'games', 'cable', 'bikes', 'cars', 'energy', 'bread', 'beer', 'wine', 'brewing', 'engineering', 'construction', 'labs', 'coffee', 'ramen', 'sushi', 'farm', 'couples', 'weddings', 'services', 'hiking'];
        var domainChoices = ['com', 'org', 'net'];
        var suffixChoices = ['promotion', 'gateway', 'newsletter', 'blog', 'shop', 'brand', 'community', 'media', 'events', 'status', 'jobs', 'social', 'cloud', 'help', 'privacy', 'data', 'policy', 'donate', 'partners', 'french', 'spanish', 'global', 'technology', 'loyalty', 'resources'];

        var noSuffix = Math.floor(Math.random()*3);
        if (domains.length && !noSuffix) {
            var domainIndex = Math.floor(Math.random()*domains.length);
            for (var j=0; j<domains[domainIndex].sites.length; j++) {
                var index = suffixChoices.indexOf(domains[domainIndex].sites[j]);
                if (index > -1) {
                    suffixChoices.splice(index, 1);
                }
            }
            if (!suffixChoices.length) {
                return false;
            }
            else {
                domains[domainIndex].sites.push(suffixChoices[Math.floor(Math.random()*suffixChoices.length)]);
            }
        }
        else {
            var prefix = prefixChoices[Math.floor(Math.random()*prefixChoices.length)];
            var noun = nounChoices[Math.floor(Math.random()*nounChoices.length)];
            var domain = domainChoices[Math.floor(Math.random()*domainChoices.length)];
            for (var j=0; j<domains.length; j++) {
                if (prefix == domains[j].prefix && noun == domains[j].noun && domain == domains[j].domain) {
                    return false;
                }
            }
            domains.push({
                prefix: prefix,
                noun: noun,
                domain: domain,
                sites: ['']
            });
        }
    }

    var domains = [];
    for (var i=0; i<numberOfSites; i++) {
        while (createSiteName(domains) === false) {};
    }

    // Define possible users and roles
    var users = ['horace', 'benedict', 'neva', 'chang', 'fran', 'normand', 'ena', 'jettie', 'marianna', 'neida', 'ryann', 'jacqui', 'delores', 'myrl', 'beatris', 'hazel', 'teisha', 'keenan', 'rudolf', 'rosamond', 'traci', 'florentina', 'janette', 'russel', 'erinn', 'avelina', 'donnette', 'bethel', 'dimple', 'minna', 'diann', 'hanh', 'alexa', 'bruce', 'mable', 'norbert', 'kenyatta', 'zella', 'ingeborg', 'magdalen', 'nilsa', 'faith', 'zachery', 'georgeann', 'marybeth', 'hoa', 'kamilah', 'jerrod', 'eun', 'collene'];
    var roles = ['Content Author', 'Content Admin', 'Moderator', 'Site Admin', 'Developer'];
    var content_types = ['page', 'article', 'blog', 'news', 'event', 'webform', 'private page'];

    for (domainIndex in domains) {
        var domain = domains[domainIndex];

        // Determine protocol
        var noHTTPS = Math.floor(Math.random()*3);
        var protocol = 'http://';
        if (!noHTTPS) {
            protocol = 'https://';
        }

        for (siteIndex in domain.sites) {

            // Determine themes
            var themes = {};
            var themeChoices = ['bartik', 'garland', 'seven', 'stark', 'custom', 'contributed', 'bootstrap'];
            var numberOfThemes = Math.floor(Math.random()*themeChoices.length);
            for (var i=0; i<numberOfThemes+1; i++) {
                var themeIndex = Math.floor(Math.random()*themeChoices.length);
                themes[themeChoices[themeIndex]] = { version: core, status: 0 };
                themeChoices.splice(tagIndex, 1);
            }
            var themesToEnable = Math.floor(Math.random()*numberOfThemes-1);
            var themeKeys = Object.keys(themes);
            for (var i=0; i<themesToEnable+1; i++) {
                themes[themeKeys[i]].status = 1;
            }

            // Determine tags
            var noTags = Math.floor(Math.random()*2);
            var tags = [];
            if (!noTags) {
                var tagChoices = ['In development', 'Important client', 'Update scheduled', 'Has maintenance contract'];
                var numberOfTags = Math.floor(Math.random()*tagChoices.length);
                for (var i=0; i<numberOfTags; i++) {
                    var tagIndex = Math.floor(Math.random()*tagChoices.length);
                    tags.push(tagChoices[tagIndex]);
                    tagChoices.splice(tagIndex, 1);
                }
                protocol = 'https://';
            }

            // Determine projects
            var projects = {};

            // Determine variables
            var variables = {
                preprocess_css: Math.floor(Math.random()*2),
                preprocess_js: Math.floor(Math.random()*2),
                cache: Math.floor(Math.random()*2),
                maintenance_mode: 0,
                theme_default: themeKeys[0]
            }
            var noMaintenanceMode = Math.floor(Math.random()*20);
            if (!noMaintenanceMode) {
                variables.maintenance_mode = 1;
            }
            if (projects.google_analytics) {
                var googleAnalyticsChoices = ['UA-123456789-1', 'UA-987654321-1', 'UA-999666333-1'];
                variables['googleanalytics_account'] = googleAnalyticsChoices[Math.floor(Math.random()*googleAnalyticsChoices.length)];
            }
            if (themeKeys[0] == 'custom') {
                variables['theme_settings'] = { level: 'abcdef'[Math.floor(Math.random()*6)] }
            }

            var site = domain.sites[siteIndex];
            var core = '7.' + Math.floor(Math.random()*45);

            var siteDoc = {
                fake: true,
                sid: uuid.v4(),
                uid: uid,
                baseurl: protocol + domain.prefix + domain.noun + '.' + domain.domain + '/' + site,
                enabled: "1",
                users: "1",
                content: "1",
                dateAdded: 0,
                lastUpdated: 0,
                audited: {
                    date: 0
                },
                details: {
                    title: domain.prefix.charAt(0).toUpperCase() + domain.prefix.slice(1) + ' ' + domain.noun.charAt(0).toUpperCase() + domain.noun.slice(1) + ' ' + site.charAt(0).toUpperCase() + site.slice(1),
                    base_url: protocol + domain.prefix + domain.noun + '.' + domain.domain + '/' + site,
                    drupal_core: core,
                    php_version: '5.3.' + Math.floor(Math.random()*30),
                    traffic: {},
                    files: {
                        public: {
                            count: Math.floor(Math.random()*2500),
                            size: 0
                        },
                        private: {
                            count: Math.floor(Math.random()*2500),
                            size: 0
                        }
                    },
                    db_size: 0,
                    users: {},
                    nodes: {},
                    projects: {},
                    themes: themes,
                    variables: variables
                },
                tags: tags
            };

            sites.processDoc(siteDoc, function(error, result) {
                if (error) {
                    callback(error, null);
                    return;
                }
                console.log(siteDoc);
                // // Save site
                // db.insert('site::' + siteDoc.sid, siteDoc, function(error, result) {
                //     if (error) {
                //         callback(error, null);
                //         return;
                //     }
                //     callback(null, result);
                // });
            });
        }
    }
}

exports.createUser = function(emailAddress, username, callback) {
    var user = new User(emailAddress, username);
    user.setPassword(randomstring.generate(8));
    user.removeVerification();
    user.create(function(error, result) {
        if (error) {
            callback(error);
        }
        else {
            callback(result);
        }
    });
}
