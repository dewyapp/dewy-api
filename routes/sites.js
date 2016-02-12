var express = require('express');
var router = express.Router();
var oauth = require('../app.js').oauth;
var validator = require('validator');
var filters = require('../models/filters');
var sites = require('../models/sites');
var users = require('../models/users');

router.post('/', function (req, res, next) {
    console.log(req.body);
    if (!req.body.apikey) {
        return res.status(401).send("An API key is required.");
    }
    if (!req.body.token && req.body.enabled == '1') {
        return res.status(401).send("A token is required to enable a site.");
    }
    if (!req.body.baseurl) {
        return res.status(401).send("A baseurl is required.");
    }
    // Check uid from apikey
    users.getByApiKey(req.body.apikey, function(error, result) {
        if (error) {
            return res.status(500).send(error);
        }
        if (!result.data.length) {
            return res.status(401).send("The API key is not valid.");
        }
        req.body.uid = result.data[0].value;

        // Check if site exists
        sites.getByBaseurl({uid: req.body.uid, baseurl: req.body.baseurl}, function(error, result) {
            if (error) {
                return res.status(500).send(error);
            }
            // If site exists, update document
            if (result.data.length) {
                // Get full document so it can be updated
                sites.get(result.data[0].value, function (error, result) {
                    if (error) {
                        console.log(error);
                        return res.status(500).send(error);
                    }
                    else {
                        siteDoc = result.data.value;
                        siteDoc.token = req.body.token;
                        siteDoc.baseurl = req.body.baseurl;
                        siteDoc.enabled = req.body.enabled;
                        siteDoc.users = req.body.read_users;
                        siteDoc.content = req.body.read_content;
                        sites.update(siteDoc, function(error, result) {
                            if (error) {
                                return res.status(500).send(error);
                            }
                            res.send(result);
                        });
                    }
                });
            }
            // Otherwise create a new site
            else {
                sites.create(req.body.uid, req.body.token, req.body.baseurl, req.body.enabled, req.body.read_users, req.body.read_content, function(error, result) {
                    if (error) {
                        return res.status(500).send(error);
                    }
                    res.send(result);
                });
            }
        });
    });
});

router.put('/', function (req, res, next) {
    sites.audit(function(error,result) {
        if (error) {
            return res.status(400).send(error);
        }
        res.send(result);
    });
});

router.get('/_filter/:filter?', oauth.authorise(), function (req, res, next) {
    filters.get(req.user.id, req.params.filter, function(error, result) {
        if (error) {
            return res.status(400).send(error);
        }
        sites.getAll({uid: req.user.id, filter: result}, function (error, result) {
            if (error) {
                return res.status(400).send(error);
            }
            res.send(result);
        });
    });
});

router.get('/_tags', oauth.authorise(), function (req, res, next) {
    sites.getAllTags({uid: req.user.id}, function (error, result) {
        if (error) {
            return res.status(400).send(error);
        }
        res.send(result);
    });
});

router.put('/:site?', oauth.authorise(), function (req, res, next) {
    console.log(req.body);
    sites.get(req.params.site, function (error, result) {
        if (error) {
            return res.status(400).send(error);
        } else if (result.data.value.uid != req.user.id) {
            return res.status(403).send({"status": "error", "message": "You do not have permission to access this resource."});
        }
        if (!req.body.tags && !req.body.notes) {
            return res.send({"status": "error", "message": "Tags or note required."});
        }

        // Add values to site document and update that document
        var siteDoc = result.data.value;
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
                return res.status(400).send(error);
            }
            res.send(result);
        });
    });

    // res.send(sites.update(null, req.params.site));
});

router.get('/:site?', oauth.authorise(), function (req, res, next) {
    sites.get(req.params.site, function (error, result) {
        if (error) {
            return res.status(400).send(error);
        }
        res.send(result);
    });
});

module.exports = router;