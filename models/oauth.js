var couchbase = require('couchbase');
var db = require('../app.js').bucket;

exports.getAccessToken = function (bearerToken, callback) {
    query = couchbase.ViewQuery.from('dev_oauth', 'by_accesstoken')
        .key([bearerToken])
        .stale(1);
    db.query(query, function(error, result) {
        if (error || !result.length) {
            callback(error, null);
            return;
        }
        var token = result[0].value;
        callback(null, {
            accessToken: token.access_token,
            clientId: token.client_id,
            expires: token.expires,
            userId: token.userId
        });
    });
}

exports.getClient = function (clientId, clientSecret, callback) {
    query = couchbase.ViewQuery.from('dev_oauth', 'by_clientid')
        .key([clientId])
        .stale(1);
    db.query(query, function(error, result) {
        if (error || !result.length) {
            callback(error, null);
            return;
        }
        var client = result[0].value;
        callback(null, {
            clientId: client.client_id,
            clientSecret: client.client_secret
        });
    });
}

exports.getRefreshToken = function (bearerToken, callback) {
    query = couchbase.ViewQuery.from('dev_oauth', 'by_refreshtoken')
        .key([bearerToken])
        .stale(1);
    db.query(query, function(error, result) {
        if (error) {
            callback(error, null);
            return;
        }
        callback(null, result.length ? result[0].value : false);
    });
}

exports.grantTypeAllowed = function (clientId, grantType, callback) {
    // TBD
    return callback(null, true);
}

exports.saveAccessToken = function (accessToken, clientId, expires, userId, callback) {
    var accessTokenDoc = {
        access_token: accessToken,
        client_id: clientId,
        expires: expires,
        uid: userId
    };
    db.insert('accesstoken::' + accessToken, accessTokenDoc, {expiry: 1800}, function(error, result) {
        if (error) {
            callback(error, null);
            return;
        }
        callback(null, {message: 'success', data: result});
    });
}

exports.saveRefreshToken = function (refreshToken, clientId, expires, userId, callback) {
    var refreshTokenDoc = {
        refresh_token: refreshToken,
        client_id: clientId,
        expires: expires,
        uid: userId
    };
    db.insert('refreshtoken::' + refreshToken, refreshTokenDoc, {expiry: 1209600}, function(error, result) {
        if (error) {
            callback(error, null);
            return;
        }
        callback(null, {message: 'success', data: result});
    });
}

exports.getUser = function (username, password, callback) {
    query = couchbase.ViewQuery.from('dev_users', 'by_username_and_password')
        .key([username, password])
        .stale(1);
    db.query(query, function(error, result) {
        if (error) {
            callback(error, null);
            return;
        }
        callback(null, result.length ? result[0].value : false);
    });
}