var express = require('express');
var router = express.Router();
var validator = require('validator');
var fields = require('../models/fields');

router.get('/values', function (req, res, next) {
    res.send(fields.getFields());
});

router.get('/operators', function (req, res, next) {
    res.send(fields.getOperators());
});

module.exports = router;