var _ = require('underscore');
var uuid = require('uuid');
var couchbase = require('couchbase');
var db = require('../app.js').bucket;
var async = require('async');
var request = require('request');

exports.audit = function(callback) {
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
                db.get(row.id, function(error, result) {
                    if (error) {
                        callback();
                        return;
                    }
                    var siteDoc = result.value;
                    console.log('Auditing ' + result.value.sid + '.');
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
                            errors[siteDoc.sid] = error;
                            siteDoc.audited.error = error;
                        } else if (response.statusCode != 200) {
                            errors[siteDoc.sid] = response.statusCode;
                            siteDoc.audited.error = response.statusCode;
                        } else {
                            // Calculate attributes
                            try {
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
                                attributes.diskSize = siteDoc.details.files.public.size + siteDoc.details.files.private.size + siteDoc.details.db_size;

                                siteDoc.attributes = attributes;
                            }
                            catch(error) {
                                console.log(error);
                                siteDoc.audited.error = error.toString();
                            }
                        }

                        // Update siteDoc with either site details, or the error
                        exports.update(siteDoc, function(error, result) {
                            if (error) {
                                errors[siteDoc.sid] = error;
                                callback();
                                return;
                            }
                            callback();
                        });
                    });
                });
            },
            function(error) {
                console.log(errors);
                callback(null, errors);
            }
        );
    });
}

exports.create = function(uid, token, baseurl, enabled, users, content, callback) {
    // Construct site document
    var siteDoc = {
        sid: uuid.v4(),
        uid: uid,
        token: token,
        baseurl: baseurl,
        enabled: enabled,
        users: users,
        content: content
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

exports.get = function(sid, callback) {
    db.get('site::' + sid, function (error, result) {
        if (error) {
            callback(error, null);
            return;
        }
        callback(null, result);
    });
}

exports.getAll = function(params, callback) {
    // If no filter is given, return all sites
    // if (params.filter == null) {
        query = couchbase.ViewQuery.from('sites', 'audited_by_uid')
            .key([params.uid]);
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
    // }
    /// else {
    //    load results from a design document view that gets made when user creates a filter
    //    callback(null, {message: 'Under construction'});
    // }
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