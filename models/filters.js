var uuid = require('uuid');
var couchbase = require('couchbase');
var db = require('../app.js').bucket;

exports.create = function(uid, filterDoc, callback) {
    filterDoc.fid = uuid.v4();
    filterDoc.uid = uid;
    filterDoc.url = encodeURIComponent(filterDoc.title);
    db.insert('filter::' + filterDoc.fid, filterDoc, function(error, result) {
        if (error) {
            callback(error, null);
            return;
        }
        callback(null, filterDoc);
    });
}

exports.get = function(uid, fid, callback) {
    db.get('filter::' + fid, function(error, result) {
        // Return a blank filter if no filter is found
        var filterDoc = {
            notifications: {
                appears: {
                    enabled: false
                },
                disappears: {
                    enabled: false
                },
                total: {
                    enabled: false
                }
            },
            operator: 'any',
            rules: [{
                field: 'Base URL',
                choice: 'contains',
            }]
        }
        if (!error) {
            filterDoc = result.value;
        }
        callback(null, filterDoc);
    });
}

exports.getAll = function(uid, callback) {
    query = couchbase.ViewQuery.from('filters', 'by_uid')
        .key([uid])
        .stale(1);
    db.query(query, function(error, result) {
        if (error) {
            callback(error, null);
            return;
        }
        var filters = [];
        for (item in result) {
            filters.push(result[item].value);
        }
        callback(null, filters);
    });
}

exports.delete = function(uid, fid, callback) {
    // TODO: Check if user owns it
    db.remove('filter::' + fid, function(error, result) {
        if (error) {
            callback(error, null);
            return;
        }
        callback(null, result);
    });
}

exports.update = function(uid, fid, filterDoc, callback) {
    // TODO: Check if user owns it
    // TODO: Check if data is any good
    console.log(filterDoc);

    function processRule(rule) {
        if (rule.operator) {
            return operator(rule.operator, rule.rules);
        }
        switch(rule.field.toLowerCase()) {
            case 'tag':
                field = 'tag';
                break;
            default:
                field = 'blah';
        }
        switch(rule.choice.toLowerCase()) {
            case 'is':
                choice = '==';
                break;
            case 'is not':
                choice = '!=';
                break;
            case 'is greater than':
                choice = '>';
                break;
            case 'is less than':
                choice = '<';
                break;
            case 'is greater than or equal to':
                choice = '>=';
                break;
            case 'is less than or equal to':
                choice = '<=';
                break;
            default:
                field = 'blah';
        }
        return field + choice + '"' + rule.value + '"';
    }

    function operator(operator, rules) {
        var prefix, separator;
        if (operator == 'any') {
            separator = '||';
        }
        else if (operator == 'all') {
            separator = '&&';
        }
        else {
            prefix = '!';
            separator = '&&';
        }
        var statement = '';
        for (var i in rules) {
            if (prefix) {
                statement = statement + prefix;
            }
            statement = statement + '(' + processRule(rules[i]) + ')';
            if (i < rules.length-1) statement = statement + separator;
        }
        return statement;
    }
    var designDoc = 'function (doc, meta) { if (meta.id.substring(0, 6) == "site::" && doc.uid == "' + uid + '" && (' + operator(filterDoc.operator, filterDoc.rules) + ')) { emit([doc.uid], doc.sid) }}';
    console.log(designDoc);


    db.replace('filter::' + fid, filterDoc, function(error, result) {
        if (error) {
            callback(error, null);
            return;
        }
        callback(null, result);
    });
}