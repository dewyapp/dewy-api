var couchbase = require('couchbase');
var db = require('../app.js').bucket;
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

exports.getAll = function(uid, fid, callback) {
    // If no filter is given, return all modules
    if (fid == null) {
        query = couchbase.ViewQuery.from('modules', 'audited_by_uid')
            .range([uid, null],[uid, {}])
            .group(true)
            .stale(1);
    } else {
        query = couchbase.ViewQuery.from('users-filter-' + fid, 'modules')
            .group(true)
            .stale(1);
    }
    db.query(query, function(error, result) {
        if (error) {
            callback(error, null);
            return;
        }
        var projectKeys = [];
        var modules = [];
        var currentModule = {};

        // Loop through users' (possibly-filtered) modules list
        for (item in result) {
            // If the module we are now looking at doesn't match the one we were looking at, push
            if (result[item].key[1] != currentModule.module || result[item].key[2] != currentModule.core) {
                if ('module' in currentModule) {
                    modules.push(currentModule);
                    projectKeys.push('project::' + currentModule.module + '-' + currentModule.core);
                }
                // Start a new module definition
                currentModule = {
                    module: result[item].key[1],
                    core: result[item].key[2],
                    package: result[item].key[5],
                    total: 0,
                    totalInstalls: 0,
                    versions: {},
                }
            } 

            // We are looking at the currentModule whether new or existing, so update totals and add to versions
            currentModule.total = currentModule.total + result[item].value;
            var installs = 0;
            if (result[item].key[3]) {
                var installs = result[item].value;
                currentModule.totalInstalls = currentModule.totalInstalls + installs;
            }

            if (!(result[item].key[4] in currentModule.versions)) {
                currentModule.versions[result[item].key[4]] = {
                    total: result[item].value,
                    totalInstalls: installs
                }
            }
            else {
                currentModule.versions[result[item].key[4]] = {
                    total: currentModule.versions[result[item].key[4]].total + result[item].value, 
                    totalInstalls: currentModule.versions[result[item].key[4]].totalInstalls + installs
                }
            }
        }

        // Get Drupal.org update information and determine updates
        db.getMulti(projectKeys, function(error, result) {
            for (module in modules) {
                var updates = result['project::' + modules[module].package + '-' + modules[module].core];
                modules[module].updates = 0;
                modules[module].securityUpdates = 0;
                for (version in modules[module].versions) {
                    if (updates && 'value' in updates) {
                        var securityUpdate = false;
                        var update = false;
                        for (release in updates.value.releases) {
                            if (updates.value.releases[release].version == version) {
                                if (securityUpdate) {
                                    modules[module].securityUpdates = modules[module].securityUpdates + modules[module].versions[version].totalInstalls;
                                    modules[module].updates = modules[module].updates + modules[module].versions[version].totalInstalls;
                                } 
                                else if (update) {
                                    modules[module].updates = modules[module].updates + modules[module].versions[version].totalInstalls;
                                }
                                break;
                            }
                            else if (updates.value.releases[release].securityUpdate) {
                                securityUpdate = true;
                            }
                            else {
                                update = true;
                            }
                        }
                    }
                }
            }
            callback(null, modules);
        });
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

exports.getReleases = function(callback) {

    getRelease = function(release) {
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

    query = couchbase.ViewQuery.from('modules', 'by_project')
        .group(true)
        .stale(1);
    db.query(query, function(error, result) {
        if (error) {
            callback(error, null);
            return;
        }
        var updatedProjects = [];
        async.forEach(result, function(resultProject, callback) {
            var projectTitle = resultProject.key[0];
            var core = resultProject.key[1];
            console.log('Getting releases for ' + projectTitle + '-' + core);
            request('https://updates.drupal.org/release-history/' + projectTitle + '/' + core, 
            function(error, response, body) {
                if (!error && response.statusCode == 200) {
                    var project = xml2json.toJson(body, {object: true});
                    if ('project' in project) {
                        var projectDoc = {
                            project: projectTitle,
                            core: core,
                            recommendedMajor: project.project.recommended_major,
                            supportedMajors: project.project.supported_majors.split(','),
                            defaultMajor: project.project.default_major,
                            releases: []
                        }

                        // If array, loop through
                        if (Object.prototype.toString.call(project.project.releases.release) === '[object Array]' ) {
                            for (var i=0, releaseTotal=project.project.releases.release.length; i < releaseTotal; i++) {
                                projectDoc.releases.push(getRelease(project.project.releases.release[i]));
                            }
                        }
                        else {
                            projectDoc.releases.push(getRelease(project.project.releases.release));
                        }

                        // With projectDoc compiled, lets compare to the existing one
                        exports.getProject(projectDoc.project, projectDoc.core, function(error, result) {
                            if (error) {
                                // No project matches, so create project
                                console.log('Project ' + projectDoc.project + '-' + projectDoc.core + ' does not exist, creating it')
                                exports.createProject(projectDoc, function(error, result) {
                                    if (error) {
                                        console.log('Project ' + projectDoc.project + '-' + projectDoc.core + ' failed to be created: ' + error);
                                        callback();
                                    }
                                    else {
                                        callback();
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
                                        securityUpdate: securityUpdate
                                    });
                                    // exports.createProject(projectDoc, function(error, result) {});
                                    callback();
                                }
                                else {
                                    callback();
                                }
                            }
                        });
                    }
                    else {
                        console.log('Project ' + projectTitle + '-' + core + ' is invalid');
                        callback();
                    }
                }
                else {
                    console.log('Failed to retrieve version history for ' + projectTitle + '-' + core + ': ' + error);
                    callback();
                }
            });
        }, function(error) {
            async.forEach(updatedProjects, function(updatedProject, callback) {
                console.log('Project ' + updatedProject.project + '-' + updatedProject.core + ' has new updates');

                // Get affected sites and update them
                var maxModuleUpdateLevel = 0;
                if (updatedProject.securityUpdate) {
                    maxModuleUpdateLevel = 1;
                }
                // TODO: This will not scale well when we are dealing with 1000s of sites, would need to do this in batches using startKey & limit
                sites.getByProject(updatedProject.project, updatedProject.core, maxModuleUpdateLevel, function(error, result) {
                    if (error) {
                        console.log('Failed to retrieve affected sites: ' + error);
                        callback();
                    }
                    else {
                        for (item in result) {
                            var sid = result[item]
                            sites.get(sid, function(error, result) {
                                if (error) {
                                    console.log('Failed to retrive site ' + siteDoc.sid + ': ' + error);
                                    callback();
                                }
                                else {
                                    var siteDoc = result;
                                    siteDoc.attributes.moduleUpdateLevel = maxModuleUpdateLevel + 1;
                                    sites.update(siteDoc, function(error, result) {
                                        if (error) {
                                            console.log('Failed to update site ' + siteDoc.sid + ': ' + error);
                                            callback();
                                        }
                                        else {
                                            console.log('Updated site ' + siteDoc.sid);
                                            callback();
                                        }
                                    });
                                }
                            });
                        }
                        console.log('No sites were affected by the update to ' + updatedProject.project);
                        callback();
                    }
                });
            }, function(error) {
                callback(null, 'Release gathering complete');
            });
        });
    });
}