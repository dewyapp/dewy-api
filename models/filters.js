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

exports.createDesignDoc = function(uid, filterDoc, callback) {
    console.log(filterDoc);
    function processRule(rule) {
        if (rule.operator) {
            return operator(rule.operator, rule.rules);
        }

        rule.field = rule.field.toLowerCase();
        rule.choice = rule.choice.toLowerCase();

        if (rule.field == 'tag') {
            if (rule.choice == 'is') {
                return 'doc.tags.indexOf("' + rule.value + '") != -1';
            } else {
                return 'doc.tags.indexOf("' + rule.value + '") == -1';
            }
        }

        var booleans = {
            'aggregate css': 'doc.details.variables.preprocess_css',
            'aggregate js': 'doc.details.variables.preprocess_js',
            'caching for anonymous': 'doc.details.variables.cache',
            'maintenance mode': 'doc.details.variables.maintenance_mode'
        }
        if (rule.field in booleans) {
            switch(rule.choice) {
                case 'is on':
                    return booleans[rule.field];
                case 'is not on':
                    return '!' + booleans[rule.field];
            }
        }

        var strings = {
            'base url': 'doc.baseurl',
            'drupal core': 'doc.details.drupal_core',
            'php version': 'doc.details.php_version',
            'title' : 'doc.details.title'
        }
        if (rule.field in strings) {
            switch(rule.choice) {
                case 'contains':
                    return strings[rule.field] + '.contains("' + rule.value + '")';
                case 'does not contain':
                    return '!(' + strings[rule.field] + '.contains("' + rule.value + '"))';
                case 'is':
                    return strings[rule.field] + ' == "' + rule.value + '"';
                case 'is not':
                    return strings[rule.field] + ' != "' + rule.value + '"';
                case 'starts with':
                    return strings[rule.field] + '.startsWith("' + rule.value + '")';
                case 'ends with':
                    return strings[rule.field] + '.endsWith("' + rule.value + '")';
            }
        }

        var numbers = {
            'database file size' : 'doc.details.db_size',
            'number of files (private)' : 'doc.details.files.private',
            'number of files (public)' : 'doc.details.files.public',
            'number of files (total)' : 'doc.details.files.private + doc.details.files.public',
            'number of modules' : 'doc.details.modules.length',
            'number of nodes' : 'doc.details.nodes.length',
            'number of themes' : 'doc.details.themes.length',
            'number of users' : 'doc.details.users.length',
        }
        if (rule.field in numbers) {
            switch(rule.choice) {
                case 'is':
                    return numbers[rule.field] + '==' + rule.value;
                    break;
                case 'is not':
                    return numbers[rule.field] + '!=' + rule.value;
                    break;
                case 'is greater than':
                    return numbers[rule.field] + '>' + rule.value;
                    break;
                case 'is less than':
                    return numbers[rule.field] + '<' + rule.value;
                    break;
                case 'is greater than or equal to':
                    return numbers[rule.field] + '>=' + rule.value;
                    break;
                case 'is less than or equal to':
                    return numbers[rule.field] + '<=' + rule.value;
                    break;
                default:
                    field = 'blah';
            }
        }

        return rule.field;
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

    callback(null, 'Under construction');
}

exports.get = function(fid, callback) {
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

exports.delete = function(fid, callback) {
    db.remove('filter::' + fid, function(error, result) {
        if (error) {
            callback(error, null);
            return;
        }
        callback(null, result);
    });
}

exports.update = function(fid, filterDoc, callback) {
    // TODO: Check if data is any good
    db.replace('filter::' + fid, filterDoc, function(error, result) {
        if (error) {
            callback(error, null);
            return;
        }
        callback(null, result);
    });
}