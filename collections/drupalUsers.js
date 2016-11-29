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
            r: {}, //roles
            d: { 'total': 0, '0': [], '1': [], '10': [], '100': [], '1000': [], '10000': []} //nodesAuthored
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
            else {
                userData.l += userResult.last_access;
            }

            userData.c += userResult.created;

            for (var i=0; i<userResult.roles.length; i++) {
                var role = userResult.roles[i];
                if (role in userData.r) {
                    userData.r[role].push(userResult.baseurl);
                }
                else {
                    userData.r[role] = [userResult.baseurl];
                }
            }

            if (userResult.nodesAuthored == 0) {
                userData.d['0'].push(userResult.baseurl);
            }
            else if (userResult.nodesAuthored > 0 && userResult.nodesAuthored <= 10) {
                userData.d['1'].push(userResult.baseurl);
            }
            else if (userResult.nodesAuthored > 10 && userResult.nodesAuthored <= 100) {
                userData.d['10'].push(userResult.baseurl);
            }
            else if (userResult.nodesAuthored > 100 && userResult.nodesAuthored <= 1000) {
                userData.d['100'].push(userResult.baseurl);
            }
            else if (userResult.nodesAuthored > 1000 && userResult.nodesAuthored <= 10000) {
                userData.d['1000'].push(userResult.baseurl);
            }
            else if (userResult.nodesAuthored > 10000) {
                userData.d['10000'].push(userResult.baseurl);
            }
            userData.d['total'] += userResult.nodesAuthored;
        }

        // Change total last access and creation times to average last access and creation times
        userData.c = userData.c / userData.a.length;
        if (userData.a.length > userData.n.length) {
            userData.l = userData.l / (userData.a.length - userData.n.length);
        }
        else {
            userData.l = 0;
        }
        console.log(userData);
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
                    r: 0, //roles
                    d: 0, //nodesAuthored
                };
                usersRoles[userIndex.length] = [];
                userIndex.push(user);
            }

            // Each row is a different email address, add it to list and increment overall totals
            users[userIndex.indexOf(user)].e += 1;
            users[userIndex.indexOf(user)].a += userResult.available;
            users[userIndex.indexOf(user)].b += userResult.blocked;
            users[userIndex.indexOf(user)].c += userResult.created;
            if (!userResult.not_used) {
                users[userIndex.indexOf(user)].l += userResult.last_access;
            }
            users[userIndex.indexOf(user)].n += userResult.not_used;
            users[userIndex.indexOf(user)].d += userResult.nodesAuthored;

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
            if (users[user].a > users[user].n) {
                users[user].l = users[user].l / (users[user].a - users[user].n);
            }
            else {
                users[user].l = 0;
            }
        }

        var baseUrls = baseUrls.filter((v, i, a) => a.indexOf(v) === i); 
        callback(null, {users: users, siteTotal: baseUrls.length});
    });
}
