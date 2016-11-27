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
            e: {}, //emails
            a: [], //sitesAvailable
            b: [], //sitesBlocked
            c: 0, //totalCreatedDate
            l: 0, //totalLastAccess
            n: [], //sitesNotUsed
            r: {} //roles
        };

        for (item in result) {

            var userResult = result[item].value;
            var email = result[item].key[2];

            if (email in userData.e) {
                userData.e[email].push(userResult.baseurl);
            }
            else {
                userData.e[email] = [userResult.baseurl];
            }
            userData.a.push(userResult.baseurl);
            if (userResult.blocked) {
                userData.b.push(userResult.baseurl);
            }
            if (userResult.not_used) {
                userData.n.push(userResult.baseurl);
            }

            userData.c += userResult.created;
            userData.l += userResult.last_access;

            for (var i=0; i<userResult.roles.length; i++) {
                var role = userResult.roles[i];
                if (role in userData.r) {
                    userData.r[role].push(userResult.baseurl);
                }
                else {
                    userData.r[role] = [userResult.baseurl];
                }
            }
        }

        // Change total last access and creation times to average last access and creation times
        userData.c = userData.c / userData.a.length;
        userData.l = userData.l / userData.a.length;
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
                    n: 0, //sitesNotUsed
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
            users[userIndex.indexOf(user)].n += userResult.not_used;

            for (var i=0; i<userResult.roles.length; i++) {
                var role = userResult.roles[i];
                // Check if role hasn't been added to this user's role total before adding
                if (usersRoles[userIndex.indexOf(user)].indexOf(role) == -1) {
                    users[userIndex.indexOf(user)].r += 1;
                    usersRoles[userIndex.indexOf(user)].push(role);
                }
            }
        }

        // Change total last access and creation times to average last access and creation times
        for (user in users) {
            users[user].c = users[user].c / users[user].a;
            users[user].l = users[user].l / users[user].a;
        }

        var baseUrls = baseUrls.filter((v, i, a) => a.indexOf(v) === i); 
        callback(null, {users: users, siteTotal: baseUrls.length});
    });
}