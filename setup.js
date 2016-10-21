var couchbase = require('couchbase');
var db = require('./api.js').bucket;
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
                                'var notifications = false;',
                                'if (doc.notifications.appears.enabled || doc.notifications.appears.enabled || doc.notifications.total.enabled) {',
                                    'notifications = true;',
                                '}',
                                'emit([doc.uid], {fid: doc.fid, title: doc.title, notifications: notifications});',
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
                            'if (meta.id.substring(0, 6) == "site::" && doc.enabled == "1" && doc.audit.lastSuccessfulAudit && doc.audit.errors.length < 3) {',
                                'var core = doc.details.drupal_core.split(".");',
                                'core = core[0] + ".x";',
                                'for (project in doc.details.projects) {',
                                    'for (module in doc.details.projects[project].modules) {',
                                        'var enabled = false',
                                        'if (doc.details.projects[project].modules[module].schema != -1) {',
                                            'enabled = true',
                                        '}',
                                        'var databaseUpdate = false;',
                                        'if (enabled && doc.details.projects[project].modules[module].schema != doc.details.projects[project].modules[module].latest_schema) {',
                                            'databaseUpdate = true',
                                        '}',
                                        'var update = false;',
                                        'if (doc.attributeDetails.projectsWithUpdates.indexOf(project) != -1) {',
                                            'update = true; ',
                                        '}',
                                        'var securityUpdate = false;',
                                        'if (doc.attributeDetails.projectsWithSecurityUpdates.indexOf(project) != -1) {',
                                            'securityUpdate = true; ',
                                        '}',
                                        'emit([doc.uid], {sid: doc.sid, baseurl: doc.baseurl, module: module, core: core, version: doc.details.projects[project].version, project: project, enabled: enabled, databaseUpdate: databaseUpdate, update: update, securityUpdate: securityUpdate});',
                                    '}',
                                '}',
                            '}',
                        '}'
                        ].join('\n')
                },
                by_project: {
                    map: [
                        'function (doc, meta) {',
                            'if (meta.id.substring(0, 6) == "site::") {',
                                'var core = doc.details.drupal_core.split(\'.\');',
                                'core = core[0] + \'.x\';',
                                'for (var project in doc.details.projects) {',
                                    'if (project != null) {',
                                        'emit([project, core]);',
                                    '}',
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
                                'emit([doc.client_id, doc.client_secret], {client_id: doc.client_id, client_secret: doc.client_secret});',
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
                },
                by_uid: {
                    map: [
                        'function (doc, meta) {',
                            'if (meta.id.substring(0, 13) == "accesstoken::" || meta.id.substring(0, 14) == "refreshtoken::") {',
                                'emit([doc.uid], meta.id);',
                            '}',
                        '}'
                        ].join('\n')
                }
            }
        },
        projects: {
            views: {
                latest_release_by_project: {
                    map: [
                        'function (doc, meta) {',
                            'if (meta.id.substring(0, 9) == "project::") {',
                                'if (doc.releases && doc.releases.length) { ',
                                    'emit(doc.project + "-" + doc.core, doc.releases);',
                                '}',
                                'else {',
                                    'emit(doc.project + "-" + doc.core)',
                                '}',
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
                            'if (meta.id.substring(0, 6) == "site::" && doc.enabled == "1" && doc.audit.lastSuccessfulAudit && doc.audit.errors.length < 3) {',
                                'emit([doc.uid], {sid: doc.sid, title: doc.details.title, baseurl: doc.baseurl, attributes: doc.attributes, tags: doc.tags, dateAdded: doc.dateAdded});',
                            '}',
                        '}'
                        ].join('\n')
                },
                by_project: {
                    map: [
                        'function (doc, meta) {',
                            'if (meta.id.substring(0, 6) == "site::" && doc.enabled == "1" && doc.audit.lastSuccessfulAudit && doc.audit.errors.length < 3) {',
                                'var core = doc.details.drupal_core.split(\'.\');',
                                'core = core[0] + \'.x\';',
                                'for (var project in doc.details.projects) {',
                                    'if (project != "") {',
                                        'var moduleUpdateLevel = 0;',
                                        'if (doc.details.projects[project].modules[0]) {',
                                            'var module = doc.details.projects[project].modules[0]',
                                            'if (doc.attributeDetails.projectsWithSecurityUpdates.indexOf(module) != -1) {',
                                                'moduleUpdateLevel = 2; ',
                                            '}',
                                            'else if (doc.attributeDetails.projectsWithUpdates.indexOf(module) != -1) {',
                                                'moduleUpdateLevel = 1; ',
                                            '}',
                                        '}',
                                        'emit([project, core, moduleUpdateLevel], doc.sid);',
                                    '}',
                                '}',
                            '}',
                        '}'
                        ].join('\n')
                },
                by_uid: {
                    map: [
                        'function (doc, meta) {',
                            'if (meta.id.substring(0, 6) == "site::") {',
                                'emit([doc.uid, doc.fake], doc.sid);',
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
                            'if (meta.id.substring(0, 6) == "site::" && (doc.enabled == "0" || !doc.audit.lastSuccessfulAudit || doc.audit.errors.length >= 3)) {',
                                'emit([doc.uid], {sid: doc.sid, baseurl: doc.baseurl, enabled: doc.enabled, dateAdded:doc.dateAdded, audit: doc.audit, token: doc.token});',
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
                by_stripeID: {
                    map: [
                        'function (doc, meta) {',
                            'if (meta.id.substring(0, 6) == "user::" && doc.subscription.stripeID) {',
                                'emit([doc.subscription.stripeID], doc.uid);',
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

    // Create index
    var query = couchbase.N1qlQuery.fromString('CREATE PRIMARY INDEX ON ' + config.couchbase.bucket);
    db.query(query, function(error, result) {
        if (error) {
            callback(error, null);
            return;
        }
    });
}