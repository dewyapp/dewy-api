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
        // Add design document for new filter
        exports.createDesignDoc(filterDoc, function(error, result) {
            if (error) {
                callback(error, null);
                return;
            }

            // Add filter to filter index
            exports.getIndex(uid, function(error, result) {
                if (error) {
                    callback(error, null);
                    return;
                }

                var filterIndex = result;
                var filterExists = false;
                function walk(target) {
                    var filters = target.filters, i;
                    if (filters) {
                        i = filters.length;
                        while (i--) {
                            if (filters[i].fid == filterDoc.fid) {
                                filterExists = true;
                                return;
                            }
                            else {
                                walk(filters[i]);
                            }
                        }
                    }
                }
                walk(filterIndex);
                if (!filterExists) {
                    filterIndex.filters.push({fid: filterDoc.fid});
                }

                // Save filter index
                exports.updateIndex(uid, filterIndex, function(error, result) {
                    if (error) {
                        callback(error, null);
                        return
                    }

                    callback(null, filterDoc);
                });

                // TODO: This should be probably be refactored as 
                // two async tasks, creating design doc + updating filter
                // and if any one fails, delete everything
            });
        });
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
                return field + '.toString().toLowerCase().indexOf("' + value + '") !== -1';
            case 'does not contain':
                return field + '.toString().toLowerCase().indexOf("' + value + '") == -1';
            case 'is':
                return field + '.toString().toLowerCase() == "' + value + '"';
            case 'is not':
                return field + '.toString().toLowerCase() != "' + value + '"';
            case 'starts with':
                return field + '.toString().toLowerCase().indexOf("' + value + '") == 0';
            case 'ends with':
                return field + '.toString().toLowerCase().indexOf("' + value + '", ' + field + '.length - "' + value + '".length) !== -1';
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
            'maintenance mode': 'doc.details.variables.maintenance_mode',
            'module versions': 'doc.attributes.moduleUpdateLevel'
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
            'number of hits in past week': '',
            'number of hits in past month': '',
            'number of hits in past year': '',
            'number of nodes': 'doc.attributes.nodes',
            'number of roles': 'doc.attributes.roles',
            'number of themes': 'doc.details.themes.length',
            'number of users': 'doc.attributes.users',
            'number of words': 'doc.attributes.words',
        }
        var strings = {
            'base url': 'doc.baseurl',
            'default theme': 'doc.details.variables.theme_default',
            'drupal core': 'doc.details.drupal_core',
            'php version': 'doc.details.php_version',
            'title': 'doc.details.title',
        }

        if (rule.field in booleans) {
            return { rule: booleanComparison(rule.choice, booleans[rule.field]) };
        }
        else if (rule.field in dates) {
            return { rule: dateComparison(rule.choice, dates[rule.field], rule.value) };
        }
        else if (rule.field in strings) {
            return { rule: stringComparison(rule.choice, strings[rule.field], rule.value) };
        }
        else if (rule.field in numbers) {
            return { rule: numberComparison(rule.choice, numbers[rule.field], rule.value) };
        }
        else if (rule.field == 'available module') {
            var testValue = 'test' + ruleIndex;
            var compare = stringComparison(rule.choice, '(j + "-" + doc.details.projects[i].version)', rule.value);
            var test = 'var ' + testValue + ' = false; for (var i in doc.details.projects) { for (var j in doc.details.projects[i].modules) { if (' + compare + ') { ' + testValue + ' = true } } };';
            return { rule: testValue, test: test };
        }
        else if (rule.field == 'available theme') {
            var testValue = 'test' + ruleIndex;
            var compare = stringComparison(rule.choice, 'i', rule.value);
            var test = 'var ' + testValue + ' = false; for (var i in doc.details.themes) { if (' + compare + ') { ' + testValue + ' = true } };';
            return { rule: testValue, test: test };
        }
        else if (rule.field == 'content type with nodes') {
            var testValue = 'test' + ruleIndex;
            var compare = stringComparison(rule.choice, 'doc.details.nodes[i].type', rule.value);
            var test = 'var ' + testValue + ' = false; for (var i in doc.details.nodes) { if (' + compare + ') { ' + testValue + ' = true } };';
            return { rule: testValue, test: test };
        }
        else if (rule.field == 'database') {
            return { rule: numberComparison('is greater than', 'doc.attributes.databaseUpdates', 0) };
        }
        else if (rule.field == 'enabled module') {
            var testValue = 'test' + ruleIndex;
            var compare = stringComparison(rule.choice, '(j + "-" + doc.details.projects[i].version)', rule.value);
            var compare2 = numberComparison('is greater than', 'doc.details.projects[i].modules[j].schema', -1);
            var test = 'var ' + testValue + ' = false; for (var i in doc.details.projects) { for (var j in doc.details.projects[i].modules) { if (' + compare + ' && ' + compare2 + ' ) { ' + testValue + ' = true } } };';
            return { rule: testValue, test: test };
        }
        else if (rule.field == 'enabled theme') {
            var testValue = 'test' + ruleIndex;
            var compare = stringComparison(rule.choice, 'i', rule.value);
            var compare2 = stringComparison('is', 'doc.details.themes[i].status', '1');
            var test = 'var ' + testValue + ' = false; for (var i in doc.details.themes) { if (' + compare + ' && ' + compare2 + ' ) { ' + testValue + ' = true } };';
            return { rule: testValue, test: test };
        }
        else if (rule.field == 'number of modules') {
            var testValue = 'test' + ruleIndex;
            var test = 'var ' + testValue + ' = 0; for (var i in doc.details.projects) { for (var j in doc.details.projects[i].modules) { ' + testValue + ' = ' + testValue + ' + 1 } };';
            return { rule: numberComparison(rule.choice, testValue, rule.value), test: test };
        }
        else if (rule.field == 'tag') {
            var testValue = 'test' + ruleIndex
            var compare = stringComparison('is', 'doc.tags[i]', rule.value);
            if (rule.choice == 'is') {
                var test = 'var ' + testValue + ' = false; for (var i in doc.tags) { if (' + compare + ') { ' + testValue + ' = true } };';
            }
            else {
                var test = 'var ' + testValue + ' = true; for (var i in doc.tags) { if (' + compare + ') { ' + testValue + ' = false } };';
            }
            return { rule: testValue, test: test };
        }
        else if (rule.field == 'text') {
            var testValue = 'test' + ruleIndex;
            var compare = stringComparison(rule.choice, 'doc.details.nodes[i].content[j]', rule.value);
            var compare2 = stringComparison(rule.choice, 'doc.details.blocks[i]', rule.value);
            var test = 'var ' + testValue + ' = false; for (var i in doc.details.nodes) { for (var j in doc.details.nodes[i].content) { if (' + compare + ') { ' + testValue + ' = true } } }; for (var i in doc.details.blocks) { if (' + compare2 + ') { ' + testValue + ' = true } };';
            return { rule: testValue, test: test };
        }
        else if (rule.field == 'role') {
            var testValue = 'test' + ruleIndex;
            var compare = stringComparison(rule.choice, 'doc.details.users[i].roles[j]', rule.value);
            var test = 'var ' + testValue + ' = false; for (var i in doc.details.users) { for (var j in doc.details.users[i].roles) { if (' + compare + ') { ' + testValue + ' = true } } };';
            return { rule: testValue, test: test };
        }
        else if (rule.field == 'user email address') {
            var testValue = 'test' + ruleIndex;
            var compare = stringComparison(rule.choice, 'doc.details.users[i].mail', rule.value);
            var test = 'var ' + testValue + ' = false; for (var i in doc.details.users) { if (' + compare + ') { ' + testValue + ' = true } };';
            return { rule: testValue, test: test };
        }
        else if (rule.field == 'user name') {
            var testValue = 'test' + ruleIndex;
            var compare = stringComparison(rule.choice, 'i', rule.value);
            var test = 'var ' + testValue + ' = false; for (var i in doc.details.users) { if (' + compare + ') { ' + testValue + ' = true } };';
            return { rule: testValue, test: test };
        }
        else if (rule.field == 'variable') {
            return { rule: stringComparison(rule.choice, 'doc.details.variables.' + rule.variable, rule.value) };
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

    var designDoc = {
        views: {
            modules: {
                map: [
                    'function (doc, meta) {',
                        'if (meta.id.substring(0, 6) == "site::" && doc.uid == "' + filterDoc.uid + '" && doc.enabled == "1" && ("details" in doc) && !("error" in doc.audited)) {',
                            processedRules.test,
                            'if (' + processedRules.rule + ') {',
                                'var core = doc.details.drupal_core.split(".");',
                                'core = core[0] + ".x";',
                                'for (project in doc.details.projects) {',
                                    'for (module in doc.details.projects[project].modules) {',
                                        'enabled = false',
                                        'if (doc.details.projects[project].modules[module].schema != -1) {',
                                            'enabled = true',
                                        '}',
                                        'emit([doc.uid, module, core, enabled, doc.details.projects[project].modules[module].version, project]);',
                                    '}',
                                '}',
                            '}',
                        '}',
                    '}'
                    ].join('\n'),
                reduce: [
                    '_count'
                    ].join('\n')
            },
            sites: {
                map: [
                    'function (doc, meta) { ',
                        'if (meta.id.substring(0, 6) == "site::" && doc.uid == "' + filterDoc.uid + '" && doc.enabled == "1" && ("details" in doc) && !("error" in doc.audited)) {',
                            processedRules.test,
                            'if (' + processedRules.rule + ') {',
                                'emit([doc.uid], {sid: doc.sid, title: doc.details.title, baseurl: doc.baseurl, attributes: doc.attributes, tags: doc.tags});',
                            '}',
                        '}',
                    '}'
                    ].join('\n')
            }
        }
    }
    console.log(designDoc);

    var manager = db.manager();
    manager.upsertDesignDocument('users-filter-' + filterDoc.fid, designDoc, function(error, result) {
        if (error) {
            callback(error);
            return;
        }
        callback();
    });
}

exports.delete = function(uid, fid, callback) {
    var manager = db.manager();
    manager.removeDesignDocument('users-filter-' + fid, function(error, result) {
        if (error && error != 'Error: missing') {
            console.log(error);
            callback(error, null);
            return;
        }

        // Remove filter from filter index
        exports.getIndex(uid, function(error, result) {
            if (error) {
                callback(error, null);
                return;
            }

            var filterIndex = result;
            function walk(target) {
                var filters = target.filters, i;
                if (filters) {
                    i = filters.length;
                    while (i--) {
                        if (filters[i].fid == fid) {
                            filters.splice(i, 1);
                            return;
                        }
                        else {
                            walk(filters[i]);
                        }
                    }
                }
            }
            walk(filterIndex);

            // Save filter index
            exports.updateIndex(uid, filterIndex, function(error, result) {
                if (error) {
                    callback(error, null);
                    return
                }

                // TODO: This should be probably be refactored as 
                // two async tasks, removing design doc + removing filter index
                // and if any one fails, don't do anything
                db.remove('filter::' + fid, function(error, result) {
                    if (error) {
                        callback(error, null);
                        return;
                    }
                    callback(null, result);
                });
            });
        });
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
        var filters = {};
        for (item in result) {
            filters[result[item].value.fid] = {title: result[item].value.title, notifications: result[item].value.notifications};
        }
        callback(null, filters);
    });
}

exports.getIndex = function(uid, callback) {
    db.get('filterIndex::' + uid, function(error, result) {
        // Return a default filterIndex if no filterIndex is found
        if (error) {
            query = couchbase.ViewQuery.from('filters', 'by_uid')
                .key([uid])
                .stale(1);
            db.query(query, function(error, result) {
                if (error) {
                    callback(error, null);
                    return;
                }
                var filterIndex = {
                    uid: uid,
                    filters: []
                };
                for (item in result) {
                    filterIndex.filters.push({
                        fid: result[item].value.fid
                    });
                }
                callback(null, filterIndex);
            });
        }
        else {
            filterIndex = result.value;
            callback(null, filterIndex);
        }
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

exports.updateIndex = function(uid, filterIndex, callback) {
    // TODO: Check if data is any good
    db.upsert('filterIndex::' + uid, filterIndex, function(error, result) {
        if (error) {
            callback(error, null);
            return;
        }
        callback(null, filterIndex);
    });
}