var User = require('./models/user');
var email = require('./helpers/email');
var config = new require('./config')();

exports.createUser = function(emailAddress, username, callback) {
    var user = new User(emailAddress, username);
    user.setPassword('RANDOMPASSWORDGOESHERE');
    user.finishVerification();
    user.create(function(error, result) {
        if (error) {
            callback(error);
        }
        else {
            callback(result);
        }
    });
}
