var users = require('./models/users');
var email = require('./helpers/email');
var config = new require('./config')();

exports.createUser = function(emailAddress, username, callback) {
    email.send({
        to: emailAddress,
        subject: 'Welcome to Dewy',
        text: 'Hi ' + username + '! An account has been created for you on ' + config.website.url + '.',
        html: 'Hi ' + username + '!<br/>An account has been created for you on ' + config.website.url + '.'
    }, function(error, result) {
        callback(null, result);
        return;
    });
}
