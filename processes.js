var modules = require('./models/modules');
var sites = require('./models/sites');

exports.auditAll = function(callback) {
    sites.auditAll(function(error, result) {
        if (error) {
            return callback(error, null);
        }
        return callback(null, result);
    });
}

exports.releases = function(callback) {
    modules.getReleases(function(error, result) {
        if (error) {
            return callback(error, null);
        }
        return callback(null, result);
    });
}

// // For internal use to clear out junky data
// exports.clearReleases = function(callback) {
//     var couchbase = require('couchbase');
//     var db = require('./app.js').bucket;
//     query = couchbase.ViewQuery.from('modules', 'drupalorg_by_project')
//         .stale(1);
//     db.query(query, function(error, result) {
//         if (error) {
//             callback(error, null);
//             return;
//         }
//         for (index in result) {
//             console.log('removing ' + result[index].id);
//             db.remove(result[index].id, function(error, result) {
//                 if (error) {
//                     console.log("ERROR: " + error);
//                 } else {
//                     console.log(result);
//                 }
//             });
//         }
//     });
// }