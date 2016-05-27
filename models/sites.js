var _ = require('underscore');
var uuid = require('uuid');
var couchbase = require('couchbase');
var db = require('../app.js').bucket;
var async = require('async');
var request = require('request');
var modules = require('../models/modules');

exports.audit = function(sid, errors, callback) {
    db.get('site::' + sid, function(error, result) {
        if (error) {
            callback(error, null);
            return;
        }
        var siteDoc = result.value;
        console.log('Auditing ' + result.value.sid + ' at ' + siteDoc.baseurl + '/admin/reports/dewy');
        request({
            uri: siteDoc.baseurl + '/admin/reports/dewy',
            method: 'POST',
            body: 'token=' + siteDoc.token,
            rejectUnauthorized: false,
            charset: 'utf-8',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        }, function(error, response, body) {
            var date = new Date().getTime() / 1000;
            date = Math.round(date);
            siteDoc.lastUpdated = date;
            siteDoc.audited = {
                date: date
            }
            async.series([
                function(callback) {
                    if (response.statusCode != 200) {
                        errors.push({ sid: siteDoc.sid, statusCode: response.statusCode, error: error });
                        siteDoc.audited.error = response.statusCode;
                    } 
                    else {
                        try {
                            // Store details
                            siteDoc.details = JSON.parse(body);
                            siteDoc.attributes = {};

                            siteDoc.attributes.databaseUpdates = 0;
                            siteDoc.attributes.enabledModules = 0;
                            siteDoc.attributes.modules = 0;
                            for (var i in siteDoc.details.projects) {
                                for (var j in siteDoc.details.projects[i].modules) {
                                    siteDoc.attributes.modules = siteDoc.attributes.modules + 1;
                                    if (siteDoc.details.projects[i].modules[j].schema != -1) {
                                        siteDoc.attributes.enabledModules = siteDoc.attributes.enabledModules + 1;
                                        if (siteDoc.details.projects[i].modules[j].schema != siteDoc.details.projects[i].modules[j].latest_schema) {
                                            siteDoc.attributes.databaseUpdates = siteDoc.attributes.databaseUpdates + 1;
                                        }
                                    }
                                }
                            }
                            siteDoc.attributes.contentTypes = {};
                            siteDoc.attributes.lastModified = 0;
                            siteDoc.attributes.avgLastModified = 0;
                            siteDoc.attributes.words = 0;
                            for (var i in siteDoc.details.nodes) {
                                siteDoc.attributes.contentTypes[siteDoc.details.nodes[i].type] = 1;
                                siteDoc.attributes.avgLastModified = siteDoc.attributes.avgLastModified + Number(siteDoc.details.nodes[i].changed);
                                if (siteDoc.details.nodes[i].changed > siteDoc.attributes.lastModified) {
                                    siteDoc.attributes.lastModified = siteDoc.details.nodes[i].changed;
                                }
                                for (var j in siteDoc.details.nodes[i].content) {
                                    siteDoc.attributes.words = siteDoc.attributes.words + siteDoc.details.nodes[i].content[j].split(' ').length;
                                }
                            }
                            siteDoc.attributes.nodes = _.keys(siteDoc.details.nodes).length;
                            siteDoc.attributes.contentTypes = _.keys(siteDoc.attributes.contentTypes).length;
                            siteDoc.attributes.avgLastModified = Math.round(siteDoc.attributes.avgLastModified / siteDoc.attributes.nodes);
                            siteDoc.attributes.roles = {};
                            siteDoc.attributes.lastAccess = 0;
                            siteDoc.attributes.avgLastAccess = 0;
                            for (var i in siteDoc.details.users) {
                                siteDoc.attributes.avgLastAccess = siteDoc.attributes.avgLastAccess + Number(siteDoc.details.users[i].last_access);
                                if (siteDoc.details.users[i].last_access > siteDoc.attributes.lastAccess) {
                                    siteDoc.attributes.lastAccess = siteDoc.details.users[i].last_access;
                                }
                                for (var j in siteDoc.details.users[i].roles) {
                                    siteDoc.attributes.roles[siteDoc.details.users[i].roles[j]] = 1;
                                }
                            }
                            siteDoc.attributes.users = _.keys(siteDoc.details.users).length;
                            siteDoc.attributes.avgLastAccess = Math.round(siteDoc.attributes.avgLastAccess / siteDoc.attributes.users);
                            siteDoc.attributes.roles = _.keys(siteDoc.attributes.roles).length;
                            siteDoc.attributes.diskSize = Number(siteDoc.details.files.public.size) + Number(siteDoc.details.files.private.size) + Number(siteDoc.details.db_size);

                            // Roll up siteDoc.attributes into comparison factors
                            siteDoc.attributes.complexity = Math.log(siteDoc.attributes.modules + siteDoc.attributes.contentTypes + siteDoc.attributes.roles);
                            siteDoc.attributes.size = Math.log(siteDoc.attributes.nodes + siteDoc.attributes.words + siteDoc.attributes.users + siteDoc.attributes.diskSize);
                            siteDoc.attributes.activity = Math.log(siteDoc.attributes.avgLastAccess + siteDoc.attributes.avgLastModified);
                            siteDoc.attributes.health = Math.log((siteDoc.attributes.enabledModules - siteDoc.attributes.databaseUpdates)*100/siteDoc.attributes.enabledModules);
                        }
                        catch(error) {
                            errors.push({ sid: siteDoc.sid, statusCode: 500, error: error });
                            siteDoc.audited.error = error.toString();
                        }
                    }
                    callback();
                },
                function(callback) {
                    // Grab up projects and modules determine pending updates
                    try {
                        var projectKeys = [];
                        var siteModules = [];
                        var core = siteDoc.details.drupal_core.split(".");
                        core = core[0] + '.x';
                        for (var project in siteDoc.details.projects) {
                            projectKeys.push('project::' + project + '-' + core);
                            for (var module in siteDoc.details.projects[project].modules) {
                                var installed = 0;
                                if (siteDoc.details.projects[project].modules[module].schema != -1) {
                                    installed = 1;
                                }
                                var version = {};
                                version[siteDoc.details.projects[project].version] = {
                                    total: 1,
                                    totalInstalls: installed
                                };
                                siteModules.push({
                                    module: module,
                                    core: core,
                                    project: project,
                                    total: 1,
                                    totalInstalls: installed,
                                    versions: version
                                })
                            }
                        }
                        siteDoc.attributes.moduleUpdateLevel = 0;
                        modules.pairModulesToProjectUpdates(projectKeys, siteModules, function(error, result) {
                            if (!error) {
                                for (var i in result) {
                                    if (result[i].securityUpdates) {
                                        siteDoc.attributes.moduleUpdateLevel = 2;
                                        break;
                                    }
                                    else if (result[i].updates) {
                                        siteDoc.attributes.moduleUpdateLevel = 1;
                                    }
                                }
                            }
                            callback();
                        });
                    }
                    catch(error) {
                        callback();
                    }
                }
            ], function(error) {
                // Update siteDoc with either site details, or the error
                exports.update(siteDoc, function(error, result) {
                    if (error) {
                        callback(error, null);
                        return;
                    }
                    callback(null, result);
                });
            });
        });
    });
}

exports.auditAll = function(callback) {
    // Loop through all sites regardless of uid
    query = couchbase.ViewQuery.from('sites', 'by_uid')
        .range([null], [{}]);
    db.query(query, function(error, result) {
        if (error) {
            callback(error, null);
            return;
        }
        var errors = [];
        async.each(result,
            function(row, callback) {
                exports.audit(row.value, errors, callback);
            },
            function(error) {
                callback(null, errors);
            }
        );
    });
}

exports.create = function(uid, token, baseurl, enabled, users, content, dateAdded, callback) {
    // Construct site document
    var siteDoc = {
        sid: uuid.v4(),
        uid: uid,
        token: token,
        baseurl: baseurl,
        enabled: enabled,
        users: users,
        content: content,
        dateAdded: dateAdded
    };

    // Insert site
    db.insert('site::' + siteDoc.sid, siteDoc, function(error, result) {
        if (error) {
            callback(error, null);
            return;
        }
        callback(null, result);
    });
}

exports.delete = function(sid, callback) {
    db.remove('site::' + sid, function(error, result) {
        if (error) {
            callback(error, null);
            return;
        }
        callback(null, result);
    });
}

exports.get = function(sid, callback) {
    db.get('site::' + sid, function (error, result) {
        if (error) {
            callback(error, null);
            return;
        }
        callback(null, result.value);
    });
}

exports.getAll = function(uid, fid, callback) {
    // If no filter is given, return all sites
    if (fid == null) {
        query = couchbase.ViewQuery.from('sites', 'audited_by_uid')
            .key([uid])
            .stale(1);
    } else {
        query = couchbase.ViewQuery.from('users-filter-' + fid, 'sites')
            .stale(1);
    }
    db.query(query, function(error, result) {
        if (error) {
            callback(error, null);
            return;
        }
        var sites = [];
        for (item in result) {
            sites.push(result[item].value);
        }
        callback(null, sites);
    });
}

exports.getAllOffline = function(params, callback) {
    query = couchbase.ViewQuery.from('sites', 'offline_by_uid')
        .key([params.uid])
        .stale(1);
    db.query(query, function(error, result) {
        if (error) {
            callback(error, null);
            return;
        }
        var sites = [];
        for (item in result) {
            sites.push(result[item].value);
        }
        callback(null, sites);
    });
}

exports.getAllTags = function(params, callback) {
    query = couchbase.ViewQuery.from('sites', 'tags_by_uid')
        .range([params.uid, null], [params.uid, {}])
        .group(true);
    db.query(query, function(error, result) {
        if (error) {
            callback(error, null);
            return;
        }
        callback(null, result);
    });
}

exports.getByBaseurl = function(params, callback) {
    query = couchbase.ViewQuery.from('sites', 'by_uid_and_baseurl')
        .key([params.uid, params.baseurl])
        .stale(1);
    db.query(query, function(error, result) {
        if (error) {
            callback(error, null);
            return;
        }
        callback(null, result);
    });
}

exports.getByProject = function(project, core, maxModuleUpdateLevel, callback) {
    query = couchbase.ViewQuery.from('sites', 'by_project')
        .range([project, core, 0], [project, core, maxModuleUpdateLevel])
        .stale(1);
    db.query(query, function(error, result) {
        if (error) {
            callback(error, null);
            return;
        }
        var sites = [];
        for (item in result) {
            sites.push(result[item].value);
        }
        callback(null, sites);
    })
}

exports.getDetail = function(sid, detail, callback) {
    db.get('site::' + sid, function (error, result) {
        if (error) {
            callback(error, null);
            return;
        }
        var siteDoc = result.value;
        var details = {
            uid: siteDoc.uid
        };
        if (detail == '_meta')
        {

        }
        else if (detail == '_complexity')
        {

        }
        else if (detail == '_size')
        {

        }
        else if (detail == '_activity')
        {

        }        
        else if (detail == '_health')
        {

        }
        callback(null, details);
    });
}

exports.update = function(siteDoc, callback) {
    db.replace('site::' + siteDoc.sid, siteDoc, function(error, result) {
        if (error) {
            callback(error, null);
            return;
        }
        callback(null, result);
    });
}