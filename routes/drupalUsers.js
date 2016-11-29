var express = require('express');
var router = express.Router();
var oauth = require('../api.js').oauth;
var subscription = require('../middleware/subscription.js');
var filters = require('../models/filters');
var drupalUsers = require('../collections/drupalUsers');

router.get('/_filter/:fid?', oauth.authorise(), subscription.require('standard'), function (req, res, next) {
    filters.get(req.params.fid, function(error, result) {
        if (error) {
            return res.status(500).send(error);
        }
        if (result.uid != req.user.id && (typeof req.params.fid == 'undefined')) {
            return res.status(403).send("You do not have permission to access this resource.");
        }
        drupalUsers.getAll(req.user.id, result.fid, function (error, result) {
            if (error) {
                return res.status(400).send(error);
            }
            res.send(result);
        });
    });
});

router.get('/:drupalUser/:fid?', oauth.authorise(), subscription.require('standard'), function (req, res, next) {
    filters.get(req.params.fid, function(error, result) {
        if (error) {
            return res.status(500).send(error);
        }
        if (result.uid != req.user.id && (typeof req.params.fid == 'undefined')) {
            return res.status(403).send("You do not have permission to access this resource.");
        }
        drupalUsers.get(req.user.id, result.fid, req.params.drupalUser, function (error, result) {
            if (error) {
                return res.status(400).send(error);
            }
            res.send(result);
        });
    });
});
module.exports = router;