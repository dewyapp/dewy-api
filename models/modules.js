var couchbase = require('couchbase');
var db = require('../app.js').bucket;

exports.getReleases = function(callback) {
    query = couchbase.ViewQuery.from('modules', 'by_project')
        .group(true)
        .stale(1);
    db.query(query, function(error, result) {
        if (error) {
            callback(error, null);
            return;
        }
        callback(null, result);
    });
}