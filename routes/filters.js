var express = require('express');
var router = express.Router();
var oauth = require('../app.js').oauth;
var util = require('util');
var validator = require('validator');
var filters = require('../models/filters');

router.get('/', oauth.authorise(), function (req, res, next) {
    filters.getAll(req.user.id, function(error, result) {
        if (error) {
            return res.status(500).send(error.toString());
        }
        res.send(result);
    });
});

router.post('/', oauth.authorise(), function (req, res, next) {
    filters.create(req.user.id, req.body, function(error, result) {
        if (error) {
            return res.status(500).send(error.toString());
        }
        res.send(result);
    });
});

router.get('/:fid', oauth.authorise(), function (req, res, next) {
    filters.get(req.params.fid, function(error, result) {
        if (error) {
            return res.status(500).send(error.toString());
        }
        if (result.uid != req.user.id && (typeof req.params.fid == 'undefined')) {
            return res.status(403).send("You do not have permission to access this resource.");
        }
        res.send(result);
    });
});

router.delete('/:fid', oauth.authorise(), function (req, res, next) {
    filters.get(req.params.fid, function(error, result) {
        if (error) {
            return res.status(500).send(error.toString());
        }
        if (result.uid != req.user.id) {
            return res.status(403).send("You do not have permission to access this resource.");
        }
        filters.delete(req.params.fid, function(error, result) {
            if (error) {
                return res.status(500).send(error.toString());
            }
            res.send(result);
        });
    });
});

router.put('/:fid', oauth.authorise(), function (req, res, next) {
    filters.get(req.params.fid, function(error, result) {
        if (error) {
            return res.status(500).send(error.toString());
        }
        if (result.uid != req.user.id) {
            return res.status(403).send("You do not have permission to access this resource.");
        }
        filters.update(req.params.fid, req.body, function(error, result) {
            if (error) {
                return res.status(500).send(error.toString());
            }
            filters.createDesignDoc(req.user.id, req.body, function (error, result) {
                if (error) {
                    return res.status(500).send(error.toString());
                }
                res.send(result);
            });
        });
    });
});

module.exports = router;