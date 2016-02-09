var uuid = require('uuid');
var couchbase = require('couchbase');
var db = require('../app.js').bucket;

exports.create = function(uid, filterDoc, callback) {
    filterDoc.fid = uuid.v4();
    filterDoc.uid = uid;
    filterDoc.url = encodeURIComponent(filterDoc.title);
    db.insert('filter::' + filterDoc.fid, filterDoc, function(error, result) {
        if (error) {
            callback(error, null);
            return;
        }
        callback(null, filterDoc);
    });
}

exports.get = function(uid, fid, callback) {
    db.get('filter::' + fid, function(error, result) {
        // Return a blank filter if no filter is found
        var filterDoc = {
            notifications: {
                appears: {
                    enabled: false
                },
                disappears: {
                    enabled: false
                },
                total: {
                    enabled: false
                }
            },
            operator: 'any',
            rules: [{
                field: 'Base URL',
                choice: 'contains',
            }]
        }
        if (!error) {
            filterDoc = result.value;
        }
        callback(null, filterDoc);
    });
}

exports.getAll = function(uid, callback) {
    query = couchbase.ViewQuery.from('filters', 'by_uid')
        .key([uid])
        .stale(1);
    db.query(query, function(error, result) {
        if (error) {
            callback(error, null);
            return;
        }
        var filters = [];
        for (item in result) {
            filters.push(result[item].value);
        }
        callback(null, filters);
    });
}

exports.delete = function(uid, fid, callback) {
    // TODO: Check if user owns it
    db.remove('filter::' + fid, function(error, result) {
        if (error) {
            callback(error, null);
            return;
        }
        callback(null, result);
    });
}

exports.update = function(uid, fid, filterDoc, callback) {
    // TODO: Check if user owns it
    // TODO: Check if data is any good
    db.replace('filter::' + fid, filterDoc, function(error, result) {
        if (error) {
            callback(error, null);
            return;
        }
        callback(null, result);
    });
}