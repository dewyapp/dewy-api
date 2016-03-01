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
        exports.createDesignDoc(filterDoc, function(error, result) {
            if (error) {
                callback(error, null);
                return;
            }
            callback(null, filterDoc);
        })
    });
}

exports.createDesignDoc = function(filterDoc, callback) {

    booleanComparison = function(choice, field) {
        switch(choice) {
            case 0:
                return '!' + field;
            case 1:
                return field;
        }
    }

    dateComparison = function(choice, field, value) {
        switch(choice) {
            case 'is':
                var valueDate = new Date(value.date1).toISOString().split('T')[0];
                return 'new Date(' + field + '*1000).toISOString().split("T")[0] == "' + valueDate + '"';
            case 'is not':
                var valueDate = new Date(value.date1).toISOString().split('T')[0];
                return 'new Date(' + field + '*1000).toISOString().split("T")[0] != "' + valueDate + '"';
            case 'is after':
                var valueDate = Math.round(new Date(value.date1).getTime()/(1000*86400));
                return 'Math.round(new Date(' + field + '*1000).getTime()/(1000*86400)) > ' + valueDate;
            case 'is before':
                var valueDate = Math.round(new Date(value.date1).getTime()/(1000*86400));
                return 'Math.round(new Date(' + field + '*1000).getTime()/(1000*86400)) < ' + valueDate;
            case 'is between':
                var valueDate1 = Math.round(new Date(value.date1).getTime()/(1000*86400));
                var valueDate2 = Math.round(new Date(value.date2).getTime()/(1000*86400));
                return 'Math.round(new Date(' + field + '*1000).getTime()/(1000*86400)) > ' + valueDate1 + ' && Math.round(new Date(' + field + '*1000).getTime()/(1000*86400)) < ' + valueDate2;
            case 'is in the last':
                var valueTime = new Date();
                if (value.timeUnit == 'days') {
                    valueTime.setDate(valueTime.getDate() - value.time);
                }
                else if (value.timeUnit == 'weeks') {
                    valueTime.setDate(valueTime.getDate() - (value.time * 7));
                }
                else if (value.timeUnit == 'months') {
                    valueTime.setMonth(valueTime.getMonth() - value.time);
                }
                else if (value.timeUnit == 'years') {
                    valueTime.setFullYear(valueTime.getFullYear() - value.time);
                }
                return 'new Date(' + field + '*1000).getTime() >= ' + valueTime.getTime();
            case 'is not in the last':
                var valueTime = new Date();
                if (value.timeUnit == 'days') {
                    valueTime.setDate(valueTime.getDate() - value.time);
                }
                else if (value.timeUnit == 'weeks') {
                    valueTime.setDate(valueTime.getDate() - (value.time * 7));
                }
                else if (value.timeUnit == 'months') {
                    valueTime.setMonth(valueTime.getMonth() - value.time);
                }
                else if (value.timeUnit == 'years') {
                    valueTime.setFullYear(valueTime.getFullYear() - value.time);
                }
                return 'new Date(' + field + '*1000).getTime() < ' + valueTime.getTime();
        }
    }

    numberComparison = function(choice, field, value) {
        switch(choice) {
            case 'is':
                return field + '==' + value;
            case 'is not':
                return field + '!=' + value;
            case 'is greater than':
                return field + '>' + value;
            case 'is less than':
                return field + '<' + value;
            case 'is greater than or equal to':
                return field + '>=' + value;
            case 'is less than or equal to':
                return field + '<=' + value;
        }
    }

    stringComparison = function(choice, field, value) {
        value = value.toLowerCase();
        switch(choice) {
            case 'contains':
                return field + '.toLowerCase().indexOf("' + value + '") !== -1';
            case 'does not contain':
                return field + '.toLowerCase().indexOf("' + value + '") == -1';
            case 'is':
                return field + '.toLowerCase() == "' + value + '"';
            case 'is not':
                return field + '.toLowerCase() != "' + value + '"';
            case 'starts with':
                return field + '.toLowerCase().indexOf("' + value + '") == 0';
            case 'ends with':
                return field + '.toLowerCase().indexOf("' + value + '", ' + field + '.length - "' + value + '".length) !== -1';
        }
    }

    function processRule(rule) {
        if (rule.operator) {
            return operator(rule.operator, rule.rules);
        }

        ruleIndex++;
        rule.field = rule.field.toLowerCase();
        if (typeof rule.choice == 'string') {
            rule.choice = rule.choice.toLowerCase();
        }

        var booleans = {
            'aggregate css': 'doc.details.variables.preprocess_css',
            'aggregate js': 'doc.details.variables.preprocess_js',
            'caching for anonymous': 'doc.details.variables.cache',
            'database': '',
            'maintenance mode': 'doc.details.variables.maintenance_mode',
            'module versions': ''
        }
        var dates = {
            'date added to dewy': 'dateAdded',
            'date last accessed': 'doc.attributes.lastAccess',
            'date last edited': 'doc.attributes.lastModified',
        }
        var numbers = {
            'database file size': 'doc.details.db_size',
            'file size (private)': 'doc.details.files.private.size',
            'file size (public)': 'doc.details.files.public.size',
            'file size (db+private+public)': 'doc.details.db_size + doc.details.files.private.size + doc.details.files.public.size',
            'number of broken links': '',
            'number of content types': 'doc.attributes.contentTypes',
            'number of files (private)': 'doc.details.files.private.count',
            'number of files (public)': 'doc.details.files.public.count',
            'number of files (total)': 'doc.details.files.private.count + doc.details.files.public.count',
            'number of hits in past day': '',
            'number of hits in past week': '',
            'number of hits in past month': '',
            'number of modules': 'doc.attributes.modules',
            'number of nodes': 'doc.attributes.nodes',
            'number of roles': 'doc.attributes.roles',
            'number of themes': 'doc.details.themes.length',
            'number of users': 'doc.attributes.users',
            'number of words': 'doc.attributes.words',
        }
        var strings = {
            'base url': 'doc.baseurl',
            'drupal core': 'doc.details.drupal_core',
            'php version': 'doc.details.php_version',
            'tag': 'doc.tags',
            'title': 'doc.details.title',
        }

        var loops = {
            // 'available module': '',
            'available theme': '',
            'content type': '',
            'default theme': '',
            // 'enabled module': '',
            'enabled theme': '',
            // 'role': '',
            'text': '',
            // 'user email address': '',
            // 'user name': '',
            'variable': ''
        }

        if (rule.field in booleans) {
            return { rule: booleanComparison(rule.choice, booleans[rule.field]) };
        }
        if (rule.field in dates) {
            return { rule: dateComparison(rule.choice, dates[rule.field], rule.value) };
        }
        if (rule.field in strings) {
            return { rule: stringComparison(rule.choice, strings[rule.field], rule.value) };
        }
        if (rule.field in numbers) {
            return { rule: numberComparison(rule.choice, numbers[rule.field], rule.value) };
        }

        if (rule.field == 'available module') {
            var testValue = 'test' + ruleIndex;
            var compare = stringComparison(rule.choice, '(i + "-" + doc.details.modules[i].version)', rule.value);
            var test = 'var ' + testValue + ' = false; for (var i in doc.details.modules) { if (' + compare + ') { ' + testValue + ' = true } };';
            return { rule: testValue, test: test };
        }

        if (rule.field == 'enabled module') {
            var testValue = 'test' + ruleIndex;
            var compare = stringComparison(rule.choice, '(i + "-" + doc.details.modules[i].version)', rule.value);
            var compare2 = numberComparison('is greater than', 'doc.details.modules[i].schema', -1);
            var test = 'var ' + testValue + ' = false; for (var i in doc.details.modules) { if (' + compare + ' && ' + compare2 + ' ) { ' + testValue + ' = true } };';
            return { rule: testValue, test: test };
        }

        if (rule.field == 'role') {
            var testValue = 'test' + ruleIndex;
            var compare = stringComparison(rule.choice, 'doc.details.users[i].roles[j]', rule.value);
            var test = 'var ' + testValue + ' = false; for (var i in doc.details.users) { for (var j in doc.details.users[i].roles) { if (' + compare + ') { ' + testValue + ' = true } } };';
            return { rule: testValue, test: test };
        }

        if (rule.field == 'user email address') {
            var testValue = 'test' + ruleIndex;
            var compare = stringComparison(rule.choice, 'doc.details.users[i].mail', rule.value);
            var test = 'var ' + testValue + ' = false; for (var i in doc.details.users) { if (' + compare + ') { ' + testValue + ' = true } };';
            return { rule: testValue, test: test };
        }

        if (rule.field == 'user name') {
            var testValue = 'test' + ruleIndex;
            var compare = stringComparison(rule.choice, 'i', rule.value);
            var test = 'var ' + testValue + ' = false; for (var i in doc.details.users) { if (' + compare + ') { ' + testValue + ' = true } };';
            return { rule: testValue, test: test };
        }

        return { rule: rule.field };
    }

    function operator(operator, rules, tests) {
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
        var tests = '';
        for (var i in rules) {
            var processedRule = processRule(rules[i]);
            if (prefix) {
                statement = statement + prefix;
            }
            statement = statement + '(' + processedRule.rule + ')';
            if (i < rules.length-1) statement = statement + separator;
            if (processedRule.test) {
                tests = tests + processedRule.test;
            }
        }
        return { rule: statement, test: tests };
    }

    var ruleIndex = 0;
    var processedRules = operator(filterDoc.operator, filterDoc.rules);
    var sitesMap = 'function (doc, meta) { ' + processedRules.test + 'if (meta.id.substring(0, 6) == "site::" && doc.uid == "' + filterDoc.uid + '" && (' + processedRules.rule + ')) { emit([doc.uid], {sid: doc.sid, title: doc.details.title, baseurl: doc.baseurl, attributes: doc.attributes, tags: doc.tags}) }}';
    console.log(sitesMap);

    var designDoc = {
        views : {
            sites : {
                map: sitesMap
            }
        }
    }

    var manager = db.manager();
    manager.upsertDesignDocument('users-filter-' + filterDoc.fid, designDoc, function(error, result) {
        if (error) {
            callback(error);
            return;
        }
        callback();
    });
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
    var manager = db.manager();
    manager.removeDesignDocument('users-filter-' + fid, function(error, result) {
        if (error && error != 'Error: missing') {
            console.log(error);
            callback(error, null);
            return;
        }
        db.remove('filter::' + fid, function(error, result) {
            if (error) {
                callback(error, null);
                return;
            }
            callback(null, result);
        });
    });
}

exports.update = function(fid, filterDoc, callback) {
    // TODO: Check if data is any good
    db.replace('filter::' + fid, filterDoc, function(error, result) {
        if (error) {
            callback(error, null);
            return;
        }
        exports.createDesignDoc(filterDoc, function(error, result) {
            if (error) {
                callback(error, null);
                return;
            }
            callback(null, filterDoc);
        })
    });
}