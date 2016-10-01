var express = require('express');
var router = express.Router();
var oauthHelper = require('../helpers/oauth');
var oauth = require('../api.js').oauth;

router.post('/token', function (req, res, next) {
    // If the user wants their session remembered, the token will persist for a longer amount of time
    if (req.body.remember) {
        oauth.accessTokenLifetime = config.oauth.rememberedSessionLifetime;
    }
    next();
}, oauth.grant());

router.delete('/token', oauth.authorise(), function (req, res, next) {
    req.user.id;
    oauthHelper.deleteUserTokens(req.user.id, function (error, result) {
        res.send();
    });
});

module.exports = router;