var express = require('express');
var router = express.Router();
var oauth = require('../api.js').oauth;
var projects = require('../models/projects');

router.get('/', oauth.authorise(), function (req, res, next) {
    projects.getAll( function (error, result) {
        if (error) {
            return res.status(400).send(error);
        }
        res.send(result);
    });
});

module.exports = router;