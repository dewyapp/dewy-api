var couchbase = require('couchbase');
var db = require('./app.js').bucket;
var config = require('./config');
var async = require('async');

exports.setup = function (callback) {
    // Design documents
    var design_docs = {
        filters: {
            views: {
                by_uid: {
                    map: [
                        'function (doc, meta) {',
                            'if (meta.id.substring(0, 8) == "filter::") {',
                                'emit([doc.uid], doc);',
                            '}',
                        '}'
                        ].join('\n')
                }
            }
        },
        modules: {
            views: {
                audited_by_uid: {
                    map: [
                        'function (doc, meta) {',
                            'if (meta.id.substring(0, 9) == "project::") {',
                                'emit(["project", doc.project, doc.core, "drupal.org", doc.releases]);',
                            '}',
                            'else if (meta.id.substring(0, 6) == "site::" && doc.enabled == "1" && ("details" in doc) && !("error" in doc.audited)) {',
                                'var core = doc.details.drupal_core.split(".");',
                                'core = core[0] + ".x";',
                                'for (module in doc.details.modules) {',
                                    'if (doc.details.modules[module].project == null) {',
                                        'emit([null, module, core, "local", null]);',
                                    '}',
                                    'else {',
                                        'emit([doc.uid, doc.details.modules[module].project, core, "local", doc.details.modules[module].version]);',
                                    '}',
                                '}',
                            '}',
                        '}'
                        ].join('\n'),
                    reduce: [
                        '_count'
                        ].join('\n')
                },
                by_project: {
                    map: [
                        'function (doc, meta) {',
                            'var core = doc.details.drupal_core.split(\'.\');',
                            'core = core[0] + \'.x\';',
                            'for (var module in doc.details.modules) {',
                                'if (doc.details.modules[module].project == null) {',
                                    'emit([module, core]);',
                                '}',
                                'else {',
                                    'emit([doc.details.modules[module].project, core]);',
                                '}',
                            '}',
                        '}'
                        ].join('\n'),
                    reduce: [
                        '_count'
                        ].join('\n')
                }
            }
        },
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
                audited_by_uid: {
                    map: [
                        'function (doc, meta) {',
                            'if (meta.id.substring(0, 6) == "site::" && doc.enabled == "1" && ("details" in doc) && !("error" in doc.audited)) {',
                                'emit([doc.uid], {sid: doc.sid, title: doc.details.title, baseurl: doc.baseurl, attributes: doc.attributes, tags: doc.tags});',
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
                },
                by_uid_and_baseurl: {
                    map: [
                        'function (doc, meta) {',
                            'if (meta.id.substring(0, 6) == "site::") {',
                                'emit([doc.uid, doc.baseurl], doc.sid);',
                            '}',
                        '}'
                        ].join('\n')
                },
                offline_by_uid: {
                    map: [
                        'function (doc, meta) {',
                            'if (meta.id.substring(0, 6) == "site::" && (doc.enabled == "0" || !("details" in doc) || ("error" in doc.audited))) {',
                                'emit([doc.uid], {sid: doc.sid, baseurl: doc.baseurl, enabled: doc.enabled, dateAdded:doc.dateAdded, audited: doc.audited, token: doc.token});',
                            '}',
                        '}'
                        ].join('\n')
                },
                tags_by_uid: {
                    map: [
                        'function (doc, meta) {',
                            'if (meta.id.substring(0, 6) == "site::" && doc.tags) {',
                                'for (tag in doc.tags) {',
                                    'emit([doc.uid, doc.tags[tag]], null);',
                                '}',
                            '}',
                        '}'
                        ].join('\n'),
                    reduce: [
                        '_count'
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
        async.forEachOf(design_docs,
            function(design_doc, design_doc_name, callback) {
                manager.upsertDesignDocument(design_doc_name, design_doc, function(error, result) {
                    if (error) {
                        callback(error);
                        return;
                    }
                    callback();
                });
            },
            function (error) {
                if (error) {
                    callback(error, null);
                    return;
                }
                callback(null, {message: 'success'});
            }
        );
    });
}