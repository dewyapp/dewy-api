var _ = require('underscore');
var uuid = require('uuid');
var couchbase = require('couchbase');
var db = require('../api.js').bucket;
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
        if (siteDoc.fake) {
            console.log(siteDoc.sid + ' is a fake site for demo purposes, it will not be audited');
            return callback();
        }
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

            if (error) {
                errors.push({ sid: siteDoc.sid, error: error });
                siteDoc.audited.error = error;
                exports.update(siteDoc, function(error, result) {
                    if (error) {
                        callback(error, null);
                        return;
                    }
                    callback(null, result);
                });
            } 
            else if (response.statusCode != 200) {
                errors.push({ sid: siteDoc.sid, statusCode: response.statusCode, error: error });
                siteDoc.audited.error = response.statusCode;
                exports.update(siteDoc, function(error, result) {
                    if (error) {
                        callback(error, null);
                        return;
                    }
                    callback(null, result);
                });
            } 
            else {
                // Store details
                siteDoc.details = JSON.parse(body);
                // Process details
                processDoc(siteDoc, function(error, result) {
                    if (error) {
                        callback(error, null);
                        return;
                    }
                    // Save site
                    exports.update(result, function(error, result) {
                        if (error) {
                            callback(error, null);
                            return;
                        }
                        callback(null, result);
                    });
                });
            }
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

exports.getDetail = function(siteDoc) {
    return siteDoc.attributeDetails;
}

exports.processDoc = function(siteDoc, callback) {
    siteDoc.attributes = {};
    var databaseUpdates = [];
    var projectKeys = [];
    var availableModules = [];
    var enabledModules = [];
    for (var i in siteDoc.details.projects) {
        if (siteDoc.details.projects[i].version) {
            var version = siteDoc.details.projects[i].version.split('-');
            var core = version[0];
            projectKeys.push('project::' + i + '-' + core);
        }
        for (var j in siteDoc.details.projects[i].modules) {
            if (siteDoc.details.projects[i].modules[j].schema != -1) {
                if (siteDoc.details.projects[i].modules[j].schema != siteDoc.details.projects[i].modules[j].latest_schema) {
                    databaseUpdates.push(j);
                }
            }
            availableModules.push(j);
            if (siteDoc.details.projects[i].modules[j].schema != -1) {
                enabledModules.push(j);
            }
        }
    }

    // Process nodes
    var lastModified = 0;
    var avgLastModified = 0;
    var words = 0;
    var contentTypes = [];
    for (var i in siteDoc.details.nodes) {
        avgLastModified = avgLastModified + Number(siteDoc.details.nodes[i].changed);
        if (siteDoc.details.nodes[i].changed > lastModified) {
            lastModified = siteDoc.details.nodes[i].changed;
        }
        if (contentTypes.indexOf(siteDoc.details.nodes[i].type) == '-1') {
            contentTypes.push(siteDoc.details.nodes[i].type)
        }
        for (var j in siteDoc.details.nodes[i].content) {
            words = words + siteDoc.details.nodes[i].content[j].split(' ').length;
        }
    }
    var nodes = _.keys(siteDoc.details.nodes).length;
    avgLastModified = Math.round(avgLastModified / nodes);

    // Process users
    var lastAccess = 0;
    var avgLastAccess = 0;
    var users = [];
    var roles = [];
    for (var i in siteDoc.details.users) {
        avgLastAccess = avgLastAccess + Number(siteDoc.details.users[i].last_access);
        if (siteDoc.details.users[i].last_access > lastAccess) {
            lastAccess = siteDoc.details.users[i].last_access;
        }
        users.push(i);
        for (var j in siteDoc.details.users[i].roles) {
            if (roles.indexOf(siteDoc.details.users[i].roles[j]) == '-1') {
                roles.push(siteDoc.details.users[i].roles[j]);
            }
        }
    }
    avgLastAccess = Math.round(avgLastAccess / users.length);

    var diskSpace = Number(siteDoc.details.files.public.size) + Number(siteDoc.details.files.private.size) + Number(siteDoc.details.db_size)
    diskSpace = +diskSpace.toFixed(2);

    // Process releases
    var modulesWithUpdates = [];
    var modulesWithSecurityUpdates = [];
    modules.getReleasesFromProjects(projectKeys, function(error, result) {
        if (error) {
            callback(error, null);
            return;
        }
        for (var i in siteDoc.details.projects) {
            if (siteDoc.details.projects[i].version) {
                var version = siteDoc.details.projects[i].version.split('-');
                var core = version[0];
                if (result['project::' + i + '-' + core] && result['project::' + i + '-' + core].value) {
                    var releases = result['project::' + i + '-' + core].value;
                    updateResult = modules.checkVersionForUpdate(releases, siteDoc.details.projects[i].version);
                    // If we were recording individual modules, we would use this code
                    // for (var j in siteDoc.details.projects[i].modules) {
                    //     if (updateResult.update) {
                    //         modulesWithUpdates.push(j);
                    //     }
                    //     if (updateResult.securityUpdate) {
                    //         modulesWithSecurityUpdates.push(j);
                    //     }
                    // }
                    // But we're reporting projects instead
                    if (updateResult.update) {
                        modulesWithUpdates.push(i);
                    }
                    if (updateResult.securityUpdate) {
                        modulesWithSecurityUpdates.push(i);
                    }
                }
            }
        }

        siteDoc.attributes = {
            availableModules: availableModules.length,
            enabledModules: enabledModules.length,
            contentTypes: contentTypes.length,
            roles: roles.length,
            users: users.length,
            nodes: nodes,
            files: siteDoc.details.files.public.count + siteDoc.details.files.private.count,
            words: words,
            diskSpace: diskSpace,
            lastModified: lastModified,
            avgLastModified: avgLastModified,
            lastAccess: lastAccess,
            avgLastAccess: avgLastAccess,
            databaseUpdates: databaseUpdates.length,
            modulesWithUpdates: modulesWithUpdates.length,
            modulesWithSecurityUpdates: modulesWithSecurityUpdates.length
        }

        siteDoc.attributeDetails = {
            availableModules: availableModules,
            enabledModules: enabledModules,
            contentTypes: contentTypes,
            roles: roles,
            users: users,
            databaseUpdates: databaseUpdates,
            modulesWithUpdates: modulesWithUpdates,
            modulesWithSecurityUpdates: modulesWithSecurityUpdates
        }

        callback(null, siteDoc);
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