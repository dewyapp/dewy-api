var couchbase = require('couchbase');
var db = require('./app.js').bucket;
var config = require('./config');

exports.setup = function (callback) {
    // Design documents
    var design_docs = {
        oauth: {
            views: {
                by_accesstoken: {
                    map: [ 
                        'function (doc, meta) {',
                            'if (meta.id.substring(0, 13) == "accesstoken::") {',
                                'emit([doc.access_token], {access_token: doc.access_token, client_id: doc.client_id, expires: doc.expires, userId: doc.uid});',
                            '}',
                        '}'
                        ].join('\n')
                },
                by_clientid: {
                    map: [
                        'function (doc, meta) {',
                            'if (meta.id.substring(0, 8) == "client::") {',
                                'emit([doc.client_id], {client_id: doc.client_id, client_secret: doc.client_secret});',
                            '}',
                        '}'
                        ].join('\n')
                },
                by_refreshtoken: {
                    map: [
                        'function (doc, meta) {',
                            'if (meta.id.substring(0, 14) == "refreshtoken::") {',
                                'emit([doc.refresh_token], {refresh_token: doc.refresh_token, client_id: doc.client_id, expires: doc.expires, userId: doc.uid});',
                            '}',
                        '}'
                        ].join('\n')
                }
            }
        },
        sites: {
            views: {
                by_baseurl: {
                    map: [
                        'function (doc, meta) {',
                            'if (meta.id.substring(0, 6) == "site::") {',
                                'emit([doc.uid, doc.baseurl], doc.sid);',
                            '}',
                        '}'
                        ].join('\n')
                },
                by_uid: {
                    map: [
                        'function (doc, meta) {',
                            'if (meta.id.substring(0, 6) == "site::") {',
                                'emit([doc.uid], doc.sid);',
                            '}',
                        '}'
                        ].join('\n')
                }
            }
        },
        users: {
            views: {
                by_apikey: {
                    map: [
                        'function (doc, meta) {',
                            'if (meta.id.substring(0, 6) == "user::") {',
                                'emit([doc.apikey], doc.uid);',
                            '}',
                        '}'
                        ].join('\n')
                },
                by_email: {
                    map: [
                        'function (doc, meta) {',
                            'if (meta.id.substring(0, 6) == "user::") {',
                                'emit([doc.email], doc.uid);',
                            '}',
                        '}'
                        ].join('\n')
                },
                by_username: {
                    map: [
                        'function (doc, meta) {',
                            'if (meta.id.substring(0, 6) == "user::") {',
                                'emit([doc.username], doc.uid);',
                            '}',
                        '}'
                        ].join('\n')
                },
                by_username_and_password: {
                    map: [
                        'function (doc, meta) {',
                            'if (meta.id.substring(0, 6) == "user::") {',
                                'emit([doc.username, doc.password], doc.uid);',
                            '}',
                        '}'
                        ].join('\n')
                }
            }
        }
    }

    // Add client
    var clientDoc = {
        client_id: config.client.client_id, 
        client_secret: config.client.client_secret
    };
    db.upsert('client::' + clientDoc.client_id, clientDoc, function(error, result) {
        if (error) {
            callback(error, null);
            return;
        }
    
        // Insert or update design documents
        var manager = db.manager();
        manager.upsertDesignDocument('oauth', design_docs['oauth'], function(error, result) {
            if (error) {
                callback(error, null);
                return;
            }
            manager.upsertDesignDocument('sites', design_docs['sites'], function(error, result) {
                if (error) {
                    callback(error, null);
                    return;
                }
                manager.upsertDesignDocument('users', design_docs['users'], function(error, result) {
                    if (error) {
                        callback(error, null);
                        return;
                    }
                    callback(null, {message: 'success'});
                });
            });
        });
    });
}