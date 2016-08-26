var randomstring = require('randomstring');
var uuid = require('uuid');
var User = require('./models/user');
var email = require('./helpers/email');
var config = new require('./config')();

exports.addFakeSites = function(uid, numberOfSites, callback) {
    for (var i=0; i<numberOfSites; i++) {
        var siteDoc = {
            sid: uuid.v4(),
            uid: uid,
            baseurl: "",
            enabled: "1",
            users: "1",
            content: "1",
            dateAdded: 0,
            lastUpdated: 0,
            audited: {
                date: 0
            },
            details: {
                title: "",
                base_url: "",
                drupal_core: "",
                php_version: "",
                traffic: {},
                files: {
                    public: {
                        count: 0,
                        size: 0
                    },
                    private: {
                        count: 0,
                        size: 0
                    }
                },
                db_size: 0,
                users: {},
                nodes: {},
                projects: {},
                themes: {},
                variables: {

                }
            },
            attributes: {

            },
            tags: {

            },
            attributeDetails: {

            }
        };
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
