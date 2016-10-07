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

exports.send = function(params, callback) {
    var content = params.text;
    if ('html' in params) {
        content = params.html;
    }
    app.render('email', {
        header: params.subject,
        content: content,
        website: config.website
    }, function(err, html) {
        var mail = {
            from: 'noreply@dewy.io',
            to: params.to,
            subject: params.subject,
            text: params.text,
            html: html
        }
        if (params.cc) {
            mail = {
                from: 'noreply@dewy.io',
                to: params.to,
                cc: params.cc,
                subject: params.subject,
                text: params.text,
                html: html
            }
        }
        var nodemailerMailgun = nodemailer.createTransport(mg({auth: config.mailgun}));
        nodemailerMailgun.sendMail(mail, function (error, result) {
            if (error) {
                callback(error, null);
            }
            else {
                callback(null, result);
            }
        });
    });
}