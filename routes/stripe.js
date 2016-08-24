var express = require('express');
var router = express.Router();
var config = new require('../config')();

router.post('/', function (req, res, next) {
    console.log(req.body);
    return res.send();
});

module.exports = router;