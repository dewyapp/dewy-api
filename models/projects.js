var couchbase = require('couchbase');
var db = require('../api.js').bucket;

exports.getAll = function(callback) {
    query = couchbase.ViewQuery.from('projects', 'latest_drupalorg_release_by_project')
        .stale(1);
    db.query(query, function(error, result) {
        if (error) {
            console.log(error);
            return callback(error, null);
        }
        var results = {};
        for (project in result) {
            results[result[project].key] = result[project].value;
        }
        console.log(results);
        return callback(error, results);
    });
}
