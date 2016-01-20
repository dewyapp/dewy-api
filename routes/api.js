var express = require('express');
var router = express.Router();
var util = require('util');
var validator = require('validator');
var filters = require('../models/filters');
var sites = require('../models/sites');
var tags = require('../models/tags');
var users = require('../models/users');

router.get('/fields', function (req, res, next) {
    res.send(filters.getFields());
});

router.delete('/filters/:filter', function (req, res, next) {
    console.log(util.inspect(req.body, {showHidden: false, depth: null}));
    // res.send(filters.delete(req.params.filter));
});

router.get('/filters', function (req, res, next) {
    res.send(filters.getAll(null));
});

router.get('/filters/:filter', function (req, res, next) {
    res.send(filters.get(null, req.params.filter));
});

router.post('/filters', function (req, res, next) {
    console.log(util.inspect(req.body, {showHidden: false, depth: null}));
    res.send();
});

router.put('/filters/:filter', function (req, res, next) {
    console.log(util.inspect(req.body, {showHidden: false, depth: null}));
    res.send();
});

router.get('/operators', function (req, res, next) {
    res.send(filters.getOperators());
});

router.post('/sites', function (req, res, next) {
    sites.create(req.body, function(error, result) {
        if (error) {
            return res.status(400).send(error);
        }
        res.send(result);
    });
});

router.put('/sites', function (req, res, next) {
    console.log(util.inspect(req.body, {showHidden: false, depth: null}));
    // res.send(sites.audit(req.body));
});

router.get('/sites/:site?', function (req, res, next) {
    res.send(sites.get(null, req.params.site));
});

router.put('/sites/:site?', function (req, res, next) {
    console.log(util.inspect(req.body, {showHidden: false, depth: null}));
    // res.send(sites.update(null, req.params.site));
});

router.get('/sites/_filter/:filter?', function (req, res, next) {
    res.send(sites.getAll(null, req.params.filter));
});

router.get('/tags', function (req, res, next) {
    res.send(tags.getAll(null));
});

router.post('/users', function (req, res, next) {
    if (!req.body.username) {
        return res.send({"status": "error", "message": "A username is required"});
    }
    if (!req.body.email) {
        return res.send({"status": "error", "message": "An email address is required"});
    }
    if (!validator.isEmail(req.body.email)) {
        return res.send({"status": "error", "message": "A valid email address is required"});
    }
    if (!req.body.password) {
        return res.send({"status": "error", "message": "A password is required"});
    }
    users.getByEmail(req.body.email, function(error, result) {
        if (error) {
            return res.status(400).send(error);
        }
        if (result.data.length) {
            return res.send({"status": "error", "message": "This email address is in use"});
        }
        users.create(req.body, function(error, result) {
            if (error) {
                return res.status(400).send(error);
            }
            res.send(result);
        });
    });
});

module.exports = router;