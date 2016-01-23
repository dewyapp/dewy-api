var express = require('express');
var router = express.Router();
var util = require('util');
var validator = require('validator');
var filters = require('../models/filters');

router.get('/', function (req, res, next) {
    res.send(filters.getAll(null));
});

router.post('/', function (req, res, next) {
    console.log(util.inspect(req.body, {showHidden: false, depth: null}));
    res.send();
});

router.get('/:filter', function (req, res, next) {
    res.send(filters.get(null, req.params.filter));
});

router.delete('/:filter', function (req, res, next) {
    console.log(util.inspect(req.body, {showHidden: false, depth: null}));
    // res.send(filters.delete(req.params.filter));
});

router.put('/:filter', function (req, res, next) {
    console.log(util.inspect(req.body, {showHidden: false, depth: null}));
    res.send();
});

module.exports = router;