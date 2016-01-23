var express = require('express');
var router = express.Router();
var util = require('util');
var validator = require('validator');
var tags = require('../models/tags');

router.get('/', function (req, res, next) {
    res.send(tags.getAll(null));
});

module.exports = router;