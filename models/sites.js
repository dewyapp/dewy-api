var _ = require('underscore');
var uuid = require('uuid');
var couchbase = require('couchbase');
var db = require('../app.js').bucket;
var async = require('async');
var request = require('request');

exports.audit = function(sid, errors, callback) {
    db.get('site::' + sid, function(error, result) {
        if (error) {
            callback(error, null);
            return;
        }
        var siteDoc = result.value;
        console.log('Auditing ' + result.value.sid);
        request({
            uri: siteDoc.baseurl + '/admin/reports/dewy',
            method: 'POST',
            body: 'token=' + siteDoc.token,
            rejectUnauthorized: false,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        }, function(error, response, body) {

            siteDoc.audited = {
                date: new Date().toISOString()
            }
            if (error) {
                errors[siteDoc.sid] = error.toString();
                siteDoc.audited.error = error.toString();
            } else if (response.statusCode != 200) {
                errors[siteDoc.sid] = response.statusCode;
                siteDoc.audited.error = response.statusCode;
            } else {
                try {
                    // Calculate attributes
                    siteDoc.details = JSON.parse(body);
                    var attributes = {};

                    attributes.modules = _.keys(siteDoc.details.modules).length;
                    attributes.contentTypes = {};
                    attributes.lastModified = 0;
                    attributes.avgLastModified = 0;
                    attributes.words = 0;
                    for (var i in siteDoc.details.nodes) {
                        attributes.contentTypes[siteDoc.details.nodes[i].type] = 1;
                        attributes.avgLastModified = attributes.avgLastModified + Number(siteDoc.details.nodes[i].changed);
                        if (siteDoc.details.nodes[i].changed > attributes.lastModified) {
                            attributes.lastModified = siteDoc.details.nodes[i].changed;
                        }
                        for (var j in siteDoc.details.nodes[i].content) {
                            attributes.words = attributes.words + siteDoc.details.nodes[i].content[j].split(' ').length;
                        }
                    }
                    attributes.nodes = _.keys(siteDoc.details.nodes).length;
                    attributes.contentTypes = _.keys(attributes.contentTypes).length;
                    attributes.avgLastModified = attributes.avgLastModified / attributes.nodes;
                    attributes.roles = {};
                    attributes.lastAccess = 0;
                    attributes.avgLastAccess = 0;
                    for (var i in siteDoc.details.users) {
                        attributes.avgLastAccess = attributes.avgLastAccess + Number(siteDoc.details.users[i].last_access);
                        if (siteDoc.details.users[i].last_access > attributes.lastAccess) {
                            attributes.lastAccess = siteDoc.details.users[i].last_access;
                        }
                        for (var j in siteDoc.details.users[i].roles) {
                            attributes.roles[siteDoc.details.users[i].roles[j]] = 1;
                        }
                    }
                    attributes.users = _.keys(siteDoc.details.users).length;
                    attributes.avgLastAccess = attributes.avgLastAccess / attributes.users;
                    attributes.roles = _.keys(attributes.roles).length;
                    attributes.diskSize = Number(siteDoc.details.files.public.size) + Number(siteDoc.details.files.private.size) + Number(siteDoc.details.db_size);

                    // Roll up attributes into comparison factors
                    attributes.complexity = Math.log(attributes.modules + attributes.contentTypes + attributes.roles);
                    attributes.size = Math.log(attributes.nodes + attributes.words + attributes.users + attributes.diskSize);
                    attributes.activity = Math.log(attributes.avgLastAccess + attributes.avgLastModified);
                    attributes.health = Math.log(3);

                    siteDoc.attributes = attributes;
                }
                catch(error) {
                    errors[siteDoc.sid] = error.toString();
                    siteDoc.audited.error = error.toString();
                }
            }

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
                console.log(errors);
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

exports.update = function(siteDoc, callback) {
    db.replace('site::' + siteDoc.sid, siteDoc, function(error, result) {
        if (error) {
            callback(error, null);
            return;
        }
        callback(null, result);
    });
}