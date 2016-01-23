var express = require('express');
var router = express.Router();
var validator = require('validator');
var users = require('../models/users');

router.post('/', function (req, res, next) {
    console.log(req.body);
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
    // Check if user exists
    users.getByEmail(req.body.email, function(error, result) {
        if (error) {
            return res.status(400).send(error);
        }
        if (result.data.length) {
            return res.send({"status": "error", "message": "This email address is in use"});
        }
        // User does not exist, create a new user
        users.create(req.body, function(error, result) {
            if (error) {
                return res.status(400).send(error);
            }
            res.send(result);
        });
    });
});

module.exports = router;