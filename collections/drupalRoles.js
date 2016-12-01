var couchbase = require('couchbase');
var db = require('../api.js').bucket;

exports.get = function(uid, fid, role, callback) {
    if (fid == null) {
        query = couchbase.ViewQuery.from('drupalRoles', 'from_audited_sites_by_uid')
            .range([uid, role], [uid, role])
            .reduce(false)
            .stale(1);
    } else {
        query = couchbase.ViewQuery.from('users-filter-' + fid, 'drupalRoles')
            .range([uid, role], [uid, role])
            .reduce(false)
            .stale(1);
    }
    db.query(query, function(error, result) {
        if (error) {
            callback(error, null);
            return;
        }

        var roleData = {
            a: [], //sitesAvailable
            i: [], //sitesInUse
            p: { 'total': 0 }, //permissions
            u: [] //users
        };

        for (item in result) {
            var roleResult = result[item].value;

            if (roleData.a.indexOf(roleResult.baseurl) == -1) {
                roleData.a.push(roleResult.baseurl);
            }

            if (roleResult.inUse && roleData.i.indexOf(roleResult.baseurl) == -1) {
                roleData.i.push(roleResult.baseurl);
            }
            
            for (user in roleResult.users) {
                if (roleData.u.indexOf(roleResult.users[user]) == -1) {
                    roleData.u.push(roleResult.users[user]);
                }
            }

            roleData.p['total'] += roleResult.permissionCount;
        }
        callback(null, roleData);
    });
}

exports.getAll = function(uid, fid, callback) {
    // If no filter is given, return all drupalRoles
    if (fid == null) {
        query = couchbase.ViewQuery.from('drupalRoles', 'from_audited_sites_by_uid')
            .range([uid, null], [uid, {}])
            .group(true)
            .stale(1);
    } else {
        query = couchbase.ViewQuery.from('users-filter-' + fid, 'drupalRoles')
            .range([uid, null], [uid, {}])
            .group(true)
            .stale(1);
    }
    db.query(query, function(error, result) {
        if (error) {
            callback(error, null);
            return;
        }

        var baseUrls = [];
        var roles = [];
        var roleIndex = [];

        for (item in result) {
            var roleResult = result[item].value;
            baseUrls = baseUrls.concat(roleResult.baseurls);
            var role = result[item].key[1];

            if (roleIndex.indexOf(role) == -1) {
                roles[roleIndex.length] = {
                    r: role,
                    a: 0, //sitesAvailable
                    i: 0, //sitesInUse
                    p: 0, //permissions
                    u: 0 //users
                };
                roleIndex.push(role);
            }

            roles[roleIndex.indexOf(role)].a += roleResult.available;
            roles[roleIndex.indexOf(role)].i += roleResult.inUse;
            roles[roleIndex.indexOf(role)].p += roleResult.permissions;
            roles[roleIndex.indexOf(role)].u += roleResult.users.length;
        }

        // Change total permissions to average permissions
        for (role in roles) {
            roles[role].p = roles[role].p / roles[role].a;
            roles[role].p = +roles[role].p.toFixed(1);
        }

        var baseUrls = baseUrls.filter((v, i, a) => a.indexOf(v) === i); 
        callback(null, {roles: roles, siteTotal: baseUrls.length});
    });
}
