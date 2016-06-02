var express = require('express');
var router = express.Router();
var oauth = require('../app.js').oauth;
var filters = require('../models/filters');
var modules = require('../models/modules');

router.get('/_filter/:fid?', oauth.authorise(), function (req, res, next) {
    filters.get(req.params.fid, function(error, result) {
        if (error) {
            return res.status(500).send(error);
        }
        if (result.uid != req.user.id && (typeof req.params.fid == 'undefined')) {
            return res.status(403).send("You do not have permission to access this resource.");
        }
        modules.getAll(req.user.id, result.fid, function (error, result) {
            if (error) {
                return res.status(400).send(error);
            }
            res.send(result);
        });
    });
});

router.get('/:module/_detail', oauth.authorise(), function (req, res, next) {
    modules.getDetails(req.user.id, req.params.module, function (error, result) {
        if (error) {
            return res.status(500).send(error);
        }
        res.send(result);
    });
});

module.exports = router;