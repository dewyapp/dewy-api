var couchbase = require('couchbase');
var db = require('../api.js').bucket;
var User = require('../models/user');

exports.getUsers = function(uid, callback) {
    if (uid) {
        User.get(uid, function(error, result) {
            if (error) {
                return callback(error);
            }
            callback(null, [{key: result.username, value: uid}]);
        });
    }
    else {
        query = couchbase.ViewQuery.from('users', 'by_email')
            .stale(1);
        db.query(query, function(error, result) {
            if (error) {
                return callback(error);
            }
            callback(null, result);
        });
    }
}
