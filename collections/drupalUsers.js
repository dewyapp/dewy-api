var couchbase = require('couchbase');
var db = require('../api.js').bucket;

exports.get = function(uid, fid, module, callback) {
    if (fid == null) {
        query = couchbase.ViewQuery.from('drupalUsers', 'from_audited_sites_by_uid')
            .range([uid, module, null], [uid, module, {}])
            .reduce(false)
            .stale(1);
    } else {
        query = couchbase.ViewQuery.from('users-filter-' + fid, 'drupalUsers')
            .range([uid, module, null], [uid, module, {}])
            .reduce(false)
            .stale(1);
    }
    db.query(query, function(error, result) {
        if (error) {
            callback(error, null);
            return;
        }

        var moduleData = {
            v: {}, //versions
            a: [], //sitesWithAvailable
            e: [], //sitesWithEnabled
            d: [], //sitesWithDatabaseUpdates
            u: [], //sitesWithUpdates
            s: [] //sitesWithSecurityUpdates
        };

        for (item in result) {

            var moduleResult = result[item].value;
            var version = result[item].key[2];

            if (version in moduleData.v) {
                moduleData.v[version] = moduleData.v[version].concat(moduleResult.baseurls);
            }
            else {
                moduleData.v[version] = moduleResult.baseurls;
            }
            moduleData.p = moduleResult.project;
            moduleData.a = moduleData.a.concat(moduleResult.baseurls);
            if (moduleResult.enabled) {
                moduleData.e = moduleData.e.concat(moduleResult.baseurls);
            }
            if (moduleResult.databaseUpdate) {
                moduleData.d = moduleData.d.concat(moduleResult.baseurls);
            }
            if (moduleResult.update) {
                moduleData.u = moduleData.u.concat(moduleResult.baseurls);
            }
            if (moduleResult.securityUpdate) {
                moduleData.s = moduleData.s.concat(moduleResult.baseurls);
            }
        }
        callback(null, moduleData);
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
        var modules = [];
        var moduleIndex = [];

        for (item in result) {
            var moduleResult = result[item].value;
            baseUrls = baseUrls.concat(moduleResult.baseurls);
            var module = result[item].key[1];

            if (moduleIndex.indexOf(module) == -1) {
                modules[moduleIndex.length] = {
                    m: module,
                    v: 0, //versions
                    a: 0, //sitesWithAvailable
                    e: 0, //sitesWithEnabled
                    d: 0, //sitesWithDatabaseUpdates
                    u: 0, //sitesWithUpdates
                    s: 0 //sitesWithSecurityUpdates
                };
                moduleIndex.push(module);
            }

            // Each row is a different version, add it to list and increment overall totals
            modules[moduleIndex.indexOf(module)].v += 1;
            modules[moduleIndex.indexOf(module)].a += moduleResult.available;
            modules[moduleIndex.indexOf(module)].e += moduleResult.enabled;
            modules[moduleIndex.indexOf(module)].d += moduleResult.databaseUpdate;
            modules[moduleIndex.indexOf(module)].u += moduleResult.update;
            modules[moduleIndex.indexOf(module)].s += moduleResult.securityUpdate;
        }
        var baseUrls = baseUrls.filter((v, i, a) => a.indexOf(v) === i); 
        callback(null, {modules: modules, siteTotal: baseUrls.length});
    });
}
