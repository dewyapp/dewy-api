var couchbase = require('couchbase');
var db = require('../api.js').bucket;
var async = require('async');

function FilterHistory(fid, sitesInFilter, sitesPreviouslyInFilter, lastUpdated) {
    this.fid = fid || null;
    this.sitesInFilter = sitesInFilter || [];
    this.sitesPreviouslyInFilter = sitesPreviouslyInFilter || [];
    this.lastUpdated = lastUpdated || null;

    this.changes = [];
    this.unchangedValues = this.getFilterHistoryDoc();
}

FilterHistory.get = function(fid, callback) {
    db.get('filterHistory::' + fid, function(error, result) {
        if (error) {
            return callback(error, null);
        }
        var filterHistory = new FilterHistory(
            result.value.fid,
            result.value.sitesInFilter,
            result.value.sitesPreviouslyInFilter,
            result.value.lastUpdated
        );

        callback(null, filterHistory);
    });
}

FilterHistory.prototype.getFilterHistoryDoc = function() {
    return {
        fid: this.fid,
        sitesInFilter: this.sitesInFilter,
        sitesPreviouslyInFilter: this.sitesPreviouslyInFilter,
        lastUpdated: this.lastUpdated
    }
}

FilterHistory.prototype.setSitesInFilter = function(sitesInFilter) {
    this.changes.push('sitesInFilter');
    this.sitesInFilter = sitesInFilter;
    this.sitesPreviouslyInFilter = this.unchangedValues.sitesInFilter;
    this.lastUpdated = Math.round(new Date().getTime() / 1000);
}


FilterHistory.prototype.validate = function(callback) {
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

FilterHistory.prototype.update = function(callback) {
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

                callback(null, {totalSites: this.filterHistory.sitesInFilter.length, previousTotalSites: this.filterHistory.sitesPreviouslyInFilter.length, sitesAdded: sitesAdded, sitesRemoved: sitesRemoved});
            }.bind( {filterHistory: this.filterHistory} ));
        }
    }.bind( {filterHistory: this} ));
}

module.exports = FilterHistory;