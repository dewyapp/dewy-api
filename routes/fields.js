var express = require('express');
var router = express.Router();
var oauth = require('../api.js').oauth;
var validator = require('validator');
var fields = require('../models/fields');

router.get('/values', oauth.authorise(), function (req, res, next) {
    res.send(fields.getFields());
});

router.get('/operators', oauth.authorise(), function (req, res, next) {
    res.send(fields.getOperators());
});

module.exports = router;