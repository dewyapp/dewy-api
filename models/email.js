var express = require('express');
var app = express();
var nodemailer = require('nodemailer');
var mg = require('nodemailer-mailgun-transport');
var config = require('../config');

// Define email template render engine
var mustacheExpress = require('mustache-express');
app.engine('mustache', mustacheExpress());
app.set('view engine', 'mustache');
app.set('views', __dirname + '/../views');

exports.send = function(to, cc, subject, text) {
    app.render('email', {
        header: subject,
        text: text
    }, function(err, html) {
        var nodemailerMailgun = nodemailer.createTransport(mg({auth: config.mailgun}));
        nodemailerMailgun.sendMail({
            from: 'noreply@dewy.io',
            to: to,
            cc: cc,
            subject: subject,
            text: text,
            html: html
        }, function (error, result) {
            if (error) {
                console.log('Error: ' + error);
            }
            else {
                console.log('Response: ' + result);
            }
        });

    });
}