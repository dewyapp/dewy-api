var express = require('express');
var router = express.Router();
var oauth = require('../app.js').oauth;
var util = require('util');
var validator = require('validator');
var tags = require('../models/tags');

router.get('/', oauth.authorise(), function (req, res, next) {
    res.send(tags.getAll(null));
});

module.exports = router;