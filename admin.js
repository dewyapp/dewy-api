var async = require('async');
var randomstring = require('randomstring');
var uuid = require('uuid');
var User = require('./models/user');
var email = require('./helpers/email');
var config = new require('./config')();

exports.addFakeSites = function(uid, numberOfSites, callback) {
    var createSiteName = function(domains) {
        var prefixChoices = ['local', 'super', 'awesome', 'great', 'red', 'blue', 'green', 'yellow', 'big', 'small', 'eco', 'square', 'circle', 'cosmic', 'classic', 'logical', 'happy', 'pleasant', 'paisley', 'proud'];
        var nounChoices = ['puppies', 'kittens', 'eats', 'delicious', 'design', 'instruction', 'training', 'university', 'college', 'agency', 'garden', 'business', 'sports', 'recreation', 'creative', 'tourism', 'hotel', 'games', 'cable', 'bikes', 'cars', 'energy', 'bread', 'beer', 'wine', 'brewing', 'engineering', 'construction', 'labs', 'coffee', 'ramen', 'sushi', 'farm', 'couples', 'weddings', 'services', 'hiking'];
        var domainChoices = ['com', 'org', 'net'];
        var suffixChoices = ['promotion', 'gateway', 'newsletter', 'blog', 'shop', 'brand', 'community', 'media', 'events', 'status', 'jobs', 'social'];

        var noSuffix = Math.floor(Math.random()*4);
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

    for (domainIndex in domains) {
        var domain = domains[domainIndex];
        var noHTTPS = Math.floor(Math.random()*3);
        var protocol = 'http://';
        if (!noHTTPS) {
            protocol = 'https://';
        }

        for (siteIndex in domain.sites) {
            var site = domain.sites[siteIndex];
            var siteDoc = {
                // fake: true,
                // sid: uuid.v4(),
                // uid: uid,
                baseurl: protocol + domain.prefix + domain.noun + '.' + domain.domain + '/' + site //,
                // enabled: "1",
                // users: "1",
                // content: "1",
                // dateAdded: 0,
                // lastUpdated: 0,
                // audited: {
                //     date: 0
                // },
                // details: {
                //     title: "",
                //     base_url: "",
                //     drupal_core: "",
                //     php_version: "",
                //     traffic: {},
                //     files: {
                //         public: {
                //             count: 0,
                //             size: 0
                //         },
                //         private: {
                //             count: 0,
                //             size: 0
                //         }
                //     },
                //     db_size: 0,
                //     users: {},
                //     nodes: {},
                //     projects: {},
                //     themes: {},
                //     variables: {

                //     }
                // },
                // attributes: {

                // },
                // tags: {

                // },
                // attributeDetails: {

                // }
            };
            console.log(siteDoc);
            // db.insert('site::' + siteDoc.sid, siteDoc, function(error, result) {

            // });
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
