var express = require('express');
var router = express.Router();
var oauth = require('../app.js').oauth;
var validator = require('validator');
var users = require('../models/users');

router.post('/', function (req, res, next) {
    console.log(req.body);
    if (!req.body.username) {
        return res.send({"status": "error", "message": "A username is required."});
    }
    if (!req.body.email) {
        return res.send({"status": "error", "message": "An email address is required."});
    }
    if (!validator.isEmail(req.body.email)) {
        return res.send({"status": "error", "message": "A valid email address is required."});
    }
    if (!req.body.password) {
        return res.send({"status": "error", "message": "A password is required."});
    }
    // Check if username exists
    users.getByUsername(req.body.username, function(error, result) {
        if (error) {
            return res.status(400).send(error);
        }
        if (result.data.length) {
            return res.send({"status": "error", "message": "This username is in use."});
        }

        // Check if email exists
        users.getByEmail(req.body.email, function(error, result) {
            if (error) {
                return res.status(400).send(error);
            }
            if (result.data.length) {
                return res.send({"status": "error", "message": "This email address is in use."});
            }

            // User is unique, create them
            users.create(req.body, function(error, result) {
                if (error) {
                    return res.status(400).send(error);
                }
                res.send(result);
            });
        });
    });
});

module.exports = router;