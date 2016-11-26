var couchbase = require('couchbase');
var db = require('../api.js').bucket;

exports.get = function(uid, fid, user, callback) {
    if (fid == null) {
        query = couchbase.ViewQuery.from('drupalUsers', 'from_audited_sites_by_uid')
            .range([uid, user, null], [uid, user, {}])
            .reduce(false)
            .stale(1);
    } else {
        query = couchbase.ViewQuery.from('users-filter-' + fid, 'drupalUsers')
            .range([uid, user, null], [uid, user, {}])
            .reduce(false)
            .stale(1);
    }
    db.query(query, function(error, result) {
        if (error) {
            callback(error, null);
            return;
        }

        var userData = {
            v: {}, //versions
            a: [], //sitesWithAvailable
            e: [], //sitesWithEnabled
            d: [], //sitesWithDatabaseUpdates
            u: [], //sitesWithUpdates
            s: [] //sitesWithSecurityUpdates
        };

        for (item in result) {

            var userResult = result[item].value;
            var version = result[item].key[2];

            if (version in userData.v) {
                userData.v[version] = userData.v[version].concat(userResult.baseurls);
            }
            else {
                userData.v[version] = userResult.baseurls;
            }
            userData.p = userResult.project;
            userData.a = userData.a.concat(userResult.baseurls);
            if (userResult.enabled) {
                userData.e = userData.e.concat(userResult.baseurls);
            }
            if (userResult.databaseUpdate) {
                userData.d = userData.d.concat(userResult.baseurls);
            }
            if (userResult.update) {
                userData.u = userData.u.concat(userResult.baseurls);
            }
            if (userResult.securityUpdate) {
                userData.s = userData.s.concat(userResult.baseurls);
            }
        }
        callback(null, userData);
    });
}

exports.getAll = function(uid, fid, callback) {
    // If no filter is given, return all drupalUsers
    if (fid == null) {
        query = couchbase.ViewQuery.from('drupalUsers', 'from_audited_sites_by_uid')
            .range([uid, null, null], [uid, {}, {}])
            .group(true)
            .stale(1);
    } else {
        query = couchbase.ViewQuery.from('users-filter-' + fid, 'drupalUsers')
            .range([uid, null, null], [uid, {}, {}])
            .group(true)
            .stale(1);
    }
    db.query(query, function(error, result) {
        if (error) {
            callback(error, null);
            return;
        }

        var baseUrls = [];
        var users = [];
        var usersRoles = [];
        var userIndex = [];

        for (item in result) {
            var userResult = result[item].value;
            baseUrls = baseUrls.concat(userResult.baseurls);
            var user = result[item].key[1];

            if (userIndex.indexOf(user) == -1) {
                users[userIndex.length] = {
                    u: user,
                    e: 0, //emails
                    a: 0, //sitesAvailable
                    b: 0, //sitesBlocked
                    c: 0, //totalCreatedDate
                    l: 0, //totalLastAccess
                    r: 0 //roles
                };
                usersRoles[userIndex.length] = [];
                userIndex.push(user);
            }

            // Each row is a different email address, add it to list and increment overall totals
            users[userIndex.indexOf(user)].e += 1;
            users[userIndex.indexOf(user)].a += userResult.available;
            users[userIndex.indexOf(user)].b += userResult.blocked;
            users[userIndex.indexOf(user)].c += userResult.created;
            users[userIndex.indexOf(user)].l += userResult.last_access;

            for (var i=0; i<userResult.roles.length; i++) {
                var role = userResult.roles[i];
                // Check if role hasn't been added to this user's role total before adding
                if (usersRoles[userIndex.indexOf(user)].indexOf(role) == -1) {
                    users[userIndex.indexOf(user)].r += 1;
                    usersRoles[userIndex.indexOf(user)].push(role);
                }
            }
        }
        var baseUrls = baseUrls.filter((v, i, a) => a.indexOf(v) === i); 
        console.log({users: users, siteTotal: baseUrls.length});
        callback(null, {users: users, siteTotal: baseUrls.length});
    });
}
