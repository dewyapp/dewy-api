var couchbase = require('couchbase');
var db = require('../api.js').bucket;
var request = require('request');
var xml2json = require('xml2json');
var async = require('async');
var config = require('../config');
var sites = require('../models/sites');

exports.createProject = function(projectDoc, callback) {
    db.upsert('project::' + projectDoc.project + '-' + projectDoc.core, projectDoc, function(error, result) {
        if (error) {
            callback(error, null);
            return;
        }
        callback(null, result);
    });
}

exports.checkVersionForUpdate = function(projectDoc, version) {
    var securityUpdate = false;
    var update = false;
    if (projectDoc && projectDoc.releases) {
        for (release in projectDoc.releases) {
            if (projectDoc.releases[release].version == version) {
                break;
            }
            else if (projectDoc.releases[release].securityUpdate) {
                securityUpdate = true;
                update = true;
            }
            else {
                update = true;
            }
        }
    }
    return {securityUpdate: securityUpdate, update: update};
}

exports.get = function(uid, fid, module, callback) {
    if (fid == null) {
        query = couchbase.ViewQuery.from('modules', 'from_audited_sites_by_uid')
            .range([uid, module, null], [uid, module, {}])
            .reduce(false)
            .stale(1);
    } else {
        query = couchbase.ViewQuery.from('users-filter-' + fid, 'modules')
            .range([uid, module, null], [uid, module, {}])
            .reduce(false)
            .stale(1);
    }
    db.query(query, function(error, result) {
        if (error) {
            callback(error, null);
            return;
        }

        var moduleData = {
            v: {}, //versions
            a: [], //sitesWithAvailable
            e: [], //sitesWithEnabled
            d: [], //sitesWithDatabaseUpdates
            u: [], //sitesWithUpdates
            s: [] //sitesWithSecurityUpdates
        };

        for (item in result) {

            var moduleResult = result[item].value;
            var version = result[item].key[2];

            if (version in moduleData.v) {
                moduleData.v[version] = moduleData.v[version].concat(moduleResult.baseurls);
            }
            else {
                moduleData.v[version] = moduleResult.baseurls;
            }
            moduleData.p = moduleResult.project;
            moduleData.a = moduleData.a.concat(moduleResult.baseurls);
            if (moduleResult.enabled) {
                moduleData.e = moduleData.e.concat(moduleResult.baseurls);
            }
            if (moduleResult.databaseUpdate) {
                moduleData.d = moduleData.d.concat(moduleResult.baseurls);
            }
            if (moduleResult.update) {
                moduleData.u = moduleData.u.concat(moduleResult.baseurls);
            }
            if (moduleResult.securityUpdate) {
                moduleData.s = moduleData.s.concat(moduleResult.baseurls);
            }
        }
        callback(null, moduleData);
    });
}

exports.getAll = function(uid, fid, callback) {
    // If no filter is given, return all modules
    if (fid == null) {
        query = couchbase.ViewQuery.from('modules', 'from_audited_sites_by_uid')
            .range([uid, null, null], [uid, {}, {}])
            .group(true)
            .stale(1);
    } else {
        query = couchbase.ViewQuery.from('users-filter-' + fid, 'modules')
            .range([uid, null, null], [uid, {}, {}])
            .group(true)
            .stale(1);
    }
    db.query(query, function(error, result) {
        if (error) {
            callback(error, null);
            return;
        }

        var baseUrls = [];
        var modules = [];
        var moduleIndex = [];

        for (item in result) {
            var moduleResult = result[item].value;
            baseUrls = baseUrls.concat(moduleResult.baseurls);
            var module = result[item].key[1];

            if (moduleIndex.indexOf(module) == -1) {
                modules[moduleIndex.length] = {
                    m: module,
                    v: 0, //versions
                    a: 0, //sitesWithAvailable
                    e: 0, //sitesWithEnabled
                    d: 0, //sitesWithDatabaseUpdates
                    u: 0, //sitesWithUpdates
                    s: 0 //sitesWithSecurityUpdates
                };
                moduleIndex.push(module);
            }

            // Each row is a different version, add it to list and increment overall totals
            modules[moduleIndex.indexOf(module)].v += 1;
            modules[moduleIndex.indexOf(module)].a += moduleResult.available;
            modules[moduleIndex.indexOf(module)].e += moduleResult.enabled;
            modules[moduleIndex.indexOf(module)].d += moduleResult.databaseUpdate;
            modules[moduleIndex.indexOf(module)].u += moduleResult.update;
            modules[moduleIndex.indexOf(module)].s += moduleResult.securityUpdate;
        }
        var baseUrls = baseUrls.filter((v, i, a) => a.indexOf(v) === i); 
        callback(null, {modules: modules, siteTotal: baseUrls.length});
    });
}

exports.getProject = function(project, core, callback) {
    db.get('project::' + project + '-' + core, function (error, result) {
        if (error) {
            callback(error, null);
            return;
        }
        callback(null, result.value);
    });
}

exports.getRelease = function(projectName, core, updatedProjects, callback) {

    parseDrupalRelease = function(release) {
        var securityUpdate = false;
        
        if ('terms' in release) {
            if (Object.prototype.toString.call(release.terms.term) === '[object Array]' ) {
                for (var j=0, termTotal=release.terms.term.length; j < termTotal; j++) {
                    if (release.terms.term[j].name == 'Release type' && release.terms.term[j].value == 'Security update') {
                        securityUpdate = true;
                    }
                }
            }
            else if (release.terms.term.name == 'Release type' && release.terms.term.value == 'Security update') {
                securityUpdate = true;
            }
        }

        return { 
            version: release.version,
            securityUpdate: securityUpdate
        }
    }

    if (!projectName.length) {
        return callback();
    }

    console.log('Getting releases for ' + projectName + '-' + core);
    request('https://updates.drupal.org/release-history/' + projectName + '/' + core, 
        function(error, response, body) {
            if (!error && response.statusCode == 200) {
                var project = xml2json.toJson(body, {object: true});
                if ('project' in project) {
                    var projectDoc = {
                        project: projectName,
                        core: core,
                        recommendedMajor: project.project.recommended_major,
                        supportedMajors: project.project.supported_majors.split(','),
                        defaultMajor: project.project.default_major,
                        releases: []
                    }

                    // If array, loop through
                    if (Object.prototype.toString.call(project.project.releases.release) === '[object Array]' ) {
                        for (var i=0, releaseTotal=project.project.releases.release.length; i < releaseTotal; i++) {
                            projectDoc.releases.push(parseDrupalRelease(project.project.releases.release[i]));
                        }
                    }
                    else {
                        projectDoc.releases.push(parseDrupalRelease(project.project.releases.release));
                    }

                    // With projectDoc compiled, lets compare to the existing one
                    exports.getProject(projectDoc.project, projectDoc.core, function(error, result) {
                        if (error) {
                            // No project matches, so create project
                            console.log('Project ' + projectDoc.project + '-' + projectDoc.core + ' does not exist, creating it');
                            exports.createProject(projectDoc, function(error, result) {
                                if (error) {
                                    console.log('Project ' + projectDoc.project + '-' + projectDoc.core + ' failed to be created: ' + error);
                                    callback();
                                }
                                else {
                                    callback(null, projectDoc);
                                }
                            });
                        } else {
                            // Otherwise compare projects
                            var index = 0;
                            var update = false;
                            var securityUpdate = false;
                            while (projectDoc.releases[index].version != result.releases[0].version) {
                                update = true;
                                if (projectDoc.releases[index].securityUpdate) {
                                    securityUpdate = true;
                                }
                                index = index+1;
                            }
                            // Updates have been found for this project, add to list
                            if (update) {
                                updatedProjects.push({
                                    project: projectDoc.project,
                                    core: projectDoc.core,
                                    securityUpdate: securityUpdate,
                                    latestVersion: projectDoc.releases[0].version
                                });
                                console.log('Project ' + projectDoc.project + '-' + projectDoc.core + ' has new releases, updating');
                                exports.createProject(projectDoc, function(error, result) {
                                    if (error) {
                                        console.log('Project ' + projectDoc.project + '-' + projectDoc.core + ' failed to be updated in the database: ' + error);
                                        callback();
                                    }
                                    else {
                                        callback(null, projectDoc);
                                    }
                                });
                            }
                            else {
                                callback();
                            }
                        }
                    });
                }
                else {
                    console.log('Project ' + projectName + '-' + core + ' is invalid, saving a record anyway');
                    var projectDoc = {
                        project: projectName,
                        core: core
                    }
                    exports.createProject(projectDoc, function(error, result) {
                        if (error) {
                            console.log('Project ' + projectDoc.project + '-' + projectDoc.core + ' failed to be created: ' + error);
                            callback();
                        }
                        else {
                            callback(null, projectDoc);
                        }
                    });
                }
            }
            else {
                console.log('Failed to retrieve version history for ' + projectName + '-' + core + ': ' + error);
                callback();
            }
        }
    );
}

exports.getReleases = function(callback) {
    query = couchbase.ViewQuery.from('projects', 'projects_from_sites')
        .group(true)
        .stale(1);
    db.query(query, function(error, result) {
        if (error) {
            callback(error, null);
            return;
        }
        var updatedProjects = [];
        async.each(result, function(row, callback) {
            exports.getRelease(row.key[0], row.key[1], updatedProjects, function(error, result) {
                callback();
            });
        }, function(error) {
            callback(null, updatedProjects);
        });
    });
}

exports.getReleasesFromProjects = function(projectKeys, callback) {
    if (!projectKeys.length) {
        // No releases found
        callback(null, null);
        return;
    }
    db.getMulti(projectKeys, function(error, result) {
        callback(null, result);
    });
}
