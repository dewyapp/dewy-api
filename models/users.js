var uuid = require('uuid');
var forge = require("node-forge");
var couchbase = require('couchbase');
var db = require('../app.js').bucket;

exports.create = function(params, callback) {
    // Construct user document
    var userDoc = {
        uid: uuid.v4(),
        apikey: uuid.v4(),
        username: params.username,
        email: params.email,
        password: forge.md.sha1.create().update(params.password).digest().toHex()
    };
    db.insert('user::' + userDoc.uid, userDoc, function(error, result) {
        if (error) {
            callback(error, null);
            return;
        }
        callback(null, {message: 'success', data: result});
    });
}

exports.getByApiKey = function(apikey, callback) {
    query = couchbase.ViewQuery.from('dev_users', 'by_apikey')
        .key([apikey])
        .stale(1);
    db.query(query, function(error, result) {
        if (error) {
            callback(error, null);
            return;
        }
        callback(null, {message: 'success', data: result});
    });
}

exports.getByEmail = function(email, callback) {
    query = couchbase.ViewQuery.from('dev_users', 'by_email')
        .key([email])
        .stale(1);
    db.query(query, function(error, result) {
        if (error) {
            callback(error, null);
            return;
        }
        callback(null, {message: 'success', data: result});
    });
}