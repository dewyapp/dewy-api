var users = require('./models/users');
var email = require('./helpers/email');
var config = new require('./config')();

exports.createUser = function(callback) {
    email.send({
        to: 'admin@dewy.io',
        subject: 'Welcome to Dewy',
        text: 'Hi Username! An account has been created for you on ' + config.website.url + '.'
    }, function(error, result) {
        callback(null, result);
        return;
    });
}
