var express = require('express');
var router = express.Router();
var oauth = require('../api.js').oauth;
var subscription = require('../middleware/subscription.js');
var validator = require('validator');
var filters = require('../models/filters');
var sites = require('../models/sites');
var User = require('../models/user');
var request = require('request');
var config = require('../config');

router.post('/', function (req, res, next) {
    if (config.debug) {
        console.log(req.body);
    }
    if (!req.body.apikey) {
        return res.status(400).send("An API key is required.");
    }
    if (!req.body.token && req.body.enabled == '1') {
        return res.status(400).send("A token is required to enable a site.");
    }
    if (!req.body.baseurl) {
        return res.status(400).send("A baseurl is required.");
    }
    // Check uid from apikey
    User.getUidByApiKey(req.body.apikey, function(error, result) {
        if (error) {
            if (config.debug) {
                console.error('Failed to get UID by API key:' + error);
            }
            return res.status(500).send('Dewy failed to lookup API key.');
        }
        if (!result) {
            return res.status(401).send("The API key is not valid. It may have been reset, please confirm on Dewy.io.");
        }
        req.body.uid = result;

        request({
            uri: req.body.baseurl,
            method: 'POST',
            body: 'token=' + req.body.token,
            rejectUnauthorized: false,
            charset: 'utf-8',
            timeout: 600000,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        }, function(error, response, body) {
            // Test if site is set to be enabled, check if it can be reached on the internet
            if (req.body.enabled == 1) {
                if (error) {
                    return res.status(500).send('Dewy cannot reach ' + req.body.baseurl + ': ' + error);
                }
                else if (response.statusCode == 403) {
                    return res.status(403).send('Dewy is not permitted to communicate to ' + req.body.baseurl + '. Is this site behind a proxy? Please edit your site\'s settings.php file and follow the steps to configure reverse proxy servers.');
                }
                else if (response.statusCode != 200) {
                    return res.status(response.statusCode).send('Dewy cannot reach ' + req.body.baseurl);
                }
            }

            // Check if site exists in Dewy
            sites.getByBaseurl({uid: req.body.uid, baseurl: req.body.baseurl}, function(error, result) {
                if (error) {
                    if (config.debug) {
                        console.error('Failed to get site by base URL:' + error);
                    }
                    return res.status(500).send(error);
                }
                // If site exists, update document
                if (result.length) {
                    // Get full document so it can be updated
                    sites.get(result[0].value, function (error, result) {
                        if (error) {
                            if (config.debug) {
                                console.error('Failed to retrieve sitedoc:' + error);
                            }
                            return res.status(500).send(error);
                        }
                        else {
                            siteDoc = result;
                            siteDoc.token = req.body.token;
                            siteDoc.baseurl = req.body.baseurl;
                            siteDoc.enabled = req.body.enabled;
                            siteDoc.users = req.body.read_users;
                            siteDoc.content = req.body.read_content;
                            siteDoc.traffic = req.body.read_traffic;
                            sites.update(siteDoc, function(error, result) {
                                if (error) {
                                    if (config.debug) {
                                        console.error('Failed to update sitedoc:' + error);
                                    }
                                    return res.status(500).send(error);
                                }
                                res.send(result);
                            });
                        }
                    });
                }
                // Otherwise create a new site
                else {
                    var dateAdded = new Date().getTime() / 1000;
                    dateAdded = Math.round(dateAdded);
                    sites.create(req.body.uid, req.body.token, req.body.baseurl, req.body.enabled, req.body.read_users, req.body.read_content, req.body.read_traffic, dateAdded, function(error, result) {
                        if (error) {
                            if (error.statusCode) {
                                if (config.debug) {
                                    console.error(error.error + ' (' + error.statusCode + ')');
                                }
                                return res.status(error.statusCode).send(error.error + ' (' + error.statusCode + ')');
                            }
                            if (config.debug) {
                                console.error(error);
                            }
                            return res.status(500).send(error);
                        }
                        res.send(result);
                        // Try to audit the site after sending a successful response
                        sites.audit(result, [], function(error, result) {});
                    });
                }
            });
        });
    });
});

router.get('/_filter/:fid', oauth.authorise(), subscription.require('standard'), function (req, res, next) {
    filters.get(req.params.fid, function(error, result) {
        if (error) {
            return res.status(500).send(error);
        }
        if (result.uid != req.user.id) {
            return res.status(403).send("You do not have permission to access this resource.");
        }
        sites.getAll(req.user.id, result.fid, function (error, result) {
            if (error) {
                return res.status(400).send(error);
            }
            res.send(result);
        });
    });
});

router.get('/_filter', oauth.authorise(), function (req, res, next) {
    sites.getAll(req.user.id, null, function (error, result) {
        if (error) {
            return res.status(400).send(error);
        }
        res.send(result);
    });
});

router.get('/_offline', oauth.authorise(), function (req, res, next) {
    sites.getAllOffline({uid: req.user.id}, function (error, result) {
        if (error) {
            return res.status(500).send(error);
        }
        res.send(result);
    });
});

router.get('/_tags', oauth.authorise(), function (req, res, next) {
    sites.getAllTags({uid: req.user.id}, function (error, result) {
        if (error) {
            return res.status(500).send(error);
        }
        res.send(result);
    });
});

router.put('/:sid', oauth.authorise(), function (req, res, next) {
    sites.get(req.params.sid, function (error, result) {
        if (error) {
            return res.status(500).send(error);
        } 
        else if (result.uid != req.user.id) {
            return res.status(403).send("You do not have permission to access this resource.");
        }
        else if (!req.body.tags && !req.body.notes && !req.body.audit) {
            return res.status(400).send("Update required.");
        }

        if (req.body.audit) {
            var results = [];
            sites.audit(result.sid, results, function(error, result) {
                if (error) {
                    return res.status(500).send(error);
                }
                else {
                    // Don't pass on warnings to front end, just errors
                    if (results.length && results[0].error) {
                        res.status(500).send(results[0].error + "");
                    }
                    else {
                        res.send();
                    }
                }
            });
        }
        else {
            // Add values to site document and update that document
            var siteDoc = result;
            // This needs validation as it comes straight from Angular (i.e. ensure its an array of strings)
            if (req.body.tags) {
                siteDoc.tags = req.body.tags;
            }
            // This needs validation as it comes straight from Angular (i.e. ensure it's a string)
            if (req.body.note) {
                siteDoc.note = req.body.note;
            }
            sites.update(siteDoc, function (error, result) {
                if (error) {
                    return res.status(500).send(error);
                }
                res.send(result);
            });
        }
    });

    // res.send(sites.update(null, req.params.sid));
});

router.delete('/:sid', oauth.authorise(), function (req, res, next) {
    sites.get(req.params.sid, function (error, result) {
        if (error) {
            return res.status(500).send(error);
        }
        if (result.uid != req.user.id) {
            return res.status(403).send("You do not have permission to access this resource.");
        }
        sites.delete(result.sid, function (error, result) {
            if (error) {
                return res.status(500).send(error);
            }
            res.send(result);
        });
    });
});

router.get('/:sid/_detail', oauth.authorise(), subscription.require('standard'), function (req, res, next) {
    sites.get(req.params.sid, function (error, result) {
        if (error) {
            return res.status(500).send(error);
        }
        if (result.uid != req.user.id) {
            return res.status(403).send("You do not have permission to access this resource.");
        }
        res.send(sites.getDetail(result));
    });
});

router.get('/:sid', oauth.authorise(), function (req, res, next) {
    sites.get(req.params.sid, function (error, result) {
        if (error) {
            return res.status(500).send(error);
        }
        if (result.uid != req.user.id) {
            return res.status(403).send("You do not have permission to access this resource.");
        }
        res.send(result);
    });
});

module.exports = router;