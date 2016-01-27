var uuid = require('uuid');
var couchbase = require('couchbase');
var db = require('../app.js').bucket;

exports.audit = function(callback) {
    callback({"status": "error", "message": "Under construction"}, null);
}

exports.create = function(params, callback) {
    // If the site is new, give it a new sid
    if (params.sid == null) {
        params.sid = uuid.v4();
    }

    // Construct site document
    var siteDoc = {
        sid: params.sid,
        uid: params.uid,
        baseurl: params.baseurl,
        enabled: false,
        users: false,
        content: false
    };

    if (params.enabled == 1) {
        siteDoc.enabled = true;
    }
    if (params.read_users == 1) {
        siteDoc.users = true;
    }
    if (params.read_content == 1) {
        siteDoc.content = true;
    }

    // Insert or update site
    db.upsert('site::' + siteDoc.sid, siteDoc, function(error, result) {
        if (error) {
            callback(error, null);
            return;
        }
        callback(null, {message: 'success', data: result});
    });
}

exports.get = function(sid, callback) {
    db.get('site::' + sid, function (error, result) {
        if (error) {
            callback(error, null);
            return;
        }
        callback(null, {message: 'success', data: result});
    });
}

exports.getAll = function(params, callback) {
    // If no filter is given, return all sites
    if (params.filter == null) {
        query = couchbase.ViewQuery.from('sites', 'by_uid')
            .key([params.uid]);
        db.query(query, function(error, result) {
            if (error) {
                callback(error, null);
                return;
            }
            callback(null, {message: 'success', data: result});
        });
    }
    // else construct some amazing N1QL query from the filter rules
    // ...
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
        callback(null, {message: 'success', data: result});
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
        callback(null, {message: 'success', data: result});
    });
}

exports.update = function(siteDoc, callback) {
    db.replace('site::' + siteDoc.sid, siteDoc, function(error, result) {
        if (error) {
            callback(error, null);
            return;
        }
        callback(null, {message: 'success', data: result});
    });
}

sites = [
    {
        id: 1,
        tags: ['awesome', 'development'],
    },
    {
        id: 2,
        tags: ['awesome'],
    },
    {
        id: 3,
        tags: [],
    }
];

sitesList = [
    {
        id: 1,
        title: 'Photography Blog',
        base_url: 'photographybyderek.ca/blog',
        complexity: 3.53,
        size: 10,
        activity: 4.42,
        health: 1
    },
    {
        id: 2,
        title: 'Derek McBurney',
        base_url: 'derekmcburney.com',
        complexity: 1,
        size: 4.17,
        activity: 7.35,
        health: 6.4
    },
    {
        id: 3,
        title: 'my world, my choice!',
        base_url: 'myworldmychoice.org',
        complexity: 1,
        size: 6.12,
        activity: 4.92,
        health: 4.55
    }
];