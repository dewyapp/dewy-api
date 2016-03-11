var modules = require('./models/modules');
var sites = require('./models/sites');

exports.audit = function(callback) {
    sites.auditAll(function(error,result) {
        if (error) {
            callback(error, null);
            return;
        }
        callback(null, result);
        return;
    });
}

exports.releases = function(callback) {
    modules.getReleases(function(error,result) {
        if (error) {
            callback(error, null);
            return;
        }
        callback(null, result);
        return;
    });
}
