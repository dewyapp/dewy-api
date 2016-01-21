var uuid = require('uuid');
var couchbase = require('couchbase');
var db = require('../app.js').bucket;

exports.create = function(site, callback) {
    // If the site is new, give it a new sid
    if (site.sid == null) {
        site.sid = uuid.v4();
    }

    // Construct site document
    var siteDoc = {
        sid: site.sid,
        uid: site.uid,
        baseurl: site.baseurl,
        enabled: false,
        users: false,
        content: false
    };

    if (site.enabled == 1) {
        siteDoc.enabled = true;
    }
    if (site.read_users == 1) {
        siteDoc.users = true;
    }
    if (site.read_content == 1) {
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

exports.get = function(user, siteId) {
    for (var i=0; i<sites.length; i++) {
        if (sites[i].id == siteId) {
            return sites[i];
        }
    }
}

exports.getByBaseurl = function(uid, baseurl, callback) {
    query = couchbase.ViewQuery.from('dev_sites', 'by_baseurl')
        .key([uid, baseurl]);
    db.query(query, function(error, result) {
        if (error) {
            callback(error, null);
            return;
        }
        callback(null, {message: 'success', data: result});
    });
}

exports.getAll = function(user, filterId) {
    // Dummy function for now, will eventually pull from persistence layer
    return sitesList;
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