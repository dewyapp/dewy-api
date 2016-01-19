var express = require('express');
var router = express.Router();
var util = require('util');
var filters = require('../models/filters');
var sites = require('../models/sites');
var tags = require('../models/tags');

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
  res.send(sites.create(req.body));
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
  console.log(util.inspect(req.body, {showHidden: false, depth: null}));
  // res.send(users.create(req.body));
});

module.exports = router;