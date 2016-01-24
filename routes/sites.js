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
        return res.send({"status": "error", "message": "An api key is required."});
    }
    if (!req.body.baseurl) {
        return res.send({"status": "error", "message": "A baseurl is required."});
    }
    // Check uid from apikey
    users.getByApiKey(req.body.apikey, function(error, result) {
        if (error) {
            return res.status(400).send(error);
        }
        if (!result.data.length) {
            return res.send({"status": "error", "message": "This api key is not valid."});
        }
        req.body.uid = result.data[0].value;
        // Check if site exists
        sites.getByBaseurl({uid: req.body.uid, baseurl: req.body.baseurl}, function(error, result) {
            if (error) {
                return res.status(400).send(error);
            }
            // If site exists, grab sid
            req.body.sid = null
            if (result.data.length) {
                req.body.sid = result.data[0].value;
            }
            sites.create(req.body, function(error, result) {
                if (error) {
                    return res.status(400).send(error);
                }
                res.send(result);
            });
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


router.put('/:site?', function (req, res, next) {
    // res.send(sites.update(null, req.params.site));
});

router.get('/_filter/:filter?', oauth.authorise(), function (req, res, next) {
    // Will get this from database later
    var filter = null;
    if (req.params.filter) {
        var filter = filters.get(null, req.params.filter);
    }

    sites.getAll({uid: req.user.id, filter: filter}, function (error, result) {
        if (error) {
            return res.status(400).send(error);
        }
        res.send(result);
    });
});

router.get('/:site?', function (req, res, next) {
    sites.get(req.params.site, function (error, result) {
        if (error) {
            return res.status(400).send(error);
        }
        res.send(result);
    });
});

module.exports = router;