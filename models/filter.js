var uuid = require('uuid');
var couchbase = require('couchbase');
var db = require('../api.js').bucket;
var async = require('async');

function Filter(fid, uid, title, notifications, rules) {
    this.fid = uuid.v4() || null;
    this.uid = uid || null;
    this.title = title || null;
    this.notifications = notifications || null;
    this.rules = rules || null;

    this.changes = [];
    this.unchangedValues = this.getFilterHistoryDoc();
}

Filter.get = function(fid, callback) {
    db.get('filter::' + fid, function(error, result) {
        if (error) {
            return callback(error, null);
        }
        var filter = new Filter(
            result.value.fid,
            result.value.uid,
            result.value.title,
            result.value.notifications,
            result.value.rules
        );

        callback(null, filter);
    });
}

Filter.prototype.getFilterDoc = function() {
    return {
        fid: this.fid,
        uid: this.uid,
        title: this.title,
        notifications: this.notifications,
        rules: this.rules
    }
}

Filter.prototype.setNotifications = function(notifications) {
    this.changes.push('notifications');
    this.notifications = notifications;
}

Filter.prototype.setRules = function(rules) {
    this.changes.push('rules');
    this.rules = rules;
}

Filter.prototype.validate = function(callback) {
    function fidValidate(fid, callback) {
        if (!fid) {
            return callback(null, 'An fid is required to create a filterHistory document');
        }
        if (typeof fid !== 'string') {
            return callback(null, 'fid must be a string');
        }
        callback();
    }

    function sitesInFilterValidate(sitesInFilter, callback) {
        if (sitesInFilter.constructor !== Array) {
            return callback(null, 'sitesInFilter must be an array');
        }
        for (siteInFilter in sitesInFilter) {
            if (typeof sitesInFilter[siteInFilter] !== 'string') {
                return callback(null, 'site in sitesInFilter must be a string');
            }
        }
        callback();
    }

    var checks = {};
    checks['fid'] = async.apply(fidValidate, this.fid);
    checks['sitesInFilter'] = async.apply(sitesInFilterValidate, this.sitesInFilter);

    // Run all checks
    async.parallel(checks, function(error, result) {
        if (error) {
            return callback(error);
        }
        if (result.fid || result.sitesInFilter) {
            return callback(null, result);
        }
        callback();
    });
}

Filter.prototype.update = function(callback) {
    this.validate(function(error, result) {
        if (error) {
            return callback({error: error});
        }
        else {
            if (result) {
                return callback(result);
            }
            db.upsert('filterHistory::' + this.filterHistory.fid, this.filterHistory.getFilterHistoryDoc(), function(error, result) {
                if (error) {
                    return callback(error);
                }
                // Return a list of sites that were once in the filter but no longer, and vice versa
                var sitesAdded = this.filterHistory.sitesInFilter.slice(0);
                for (var sitePreviouslyInFilter in this.filterHistory.sitesPreviouslyInFilter) {
                    var index = sitesAdded.indexOf(this.filterHistory.sitesPreviouslyInFilter[sitePreviouslyInFilter]);
                    if (index > -1) {
                        sitesAdded.splice(index, 1);
                    }
                }
                var sitesRemoved = this.filterHistory.sitesPreviouslyInFilter.slice(0);
                for (var siteInFilter in this.filterHistory.sitesInFilter) {
                    var index = sitesRemoved.indexOf(this.filterHistory.sitesInFilter[siteInFilter]);
                    if (index > -1) {
                        sitesRemoved.splice(index, 1);
                    }
                }

                callback(null, {sites: this.filterHistory.sitesInFilter, previousSites: this.filterHistory.sitesPreviouslyInFilter, sitesAdded: sitesAdded, sitesRemoved: sitesRemoved});
            }.bind( {filterHistory: this.filterHistory} ));
        }
    }.bind( {filterHistory: this} ));
}

module.exports = Filter;