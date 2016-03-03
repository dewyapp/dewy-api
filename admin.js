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
