var couchbase = require('couchbase');
var db = require('../api.js').bucket;
var config = require('../config');

exports.getAll = function(callback) {
    query = couchbase.ViewQuery.from('projects', 'latest_drupalorg_release_by_project')
        .stale(1);
    db.query(query, function(error, result) {
        if (error) {
            if (config.debug) {
                console.error(error);
            }
            return callback(error, null);
        }
        var results = {};
        for (project in result) {
            results[result[project].key] = result[project].value;
        }
        return callback(error, results);
    });
}
