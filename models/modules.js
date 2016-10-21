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

exports.getAll = function(uid, fid, callback) {
    // If no filter is given, return all modules
    if (fid == null) {
        query = couchbase.ViewQuery.from('modules', 'audited_by_uid')
            .key([uid])
            .stale(1);
    } else {
        query = couchbase.ViewQuery.from('users-filter-' + fid, 'modules')
            .stale(1);
    }
    db.query(query, function(error, result) {
        if (error) {
            callback(error, null);
            return;
        }

        var moduleData = {modules: []};
        var moduleIndex = {};
        var siteIndex = [];

        for (item in result) {
            var moduleResult = result[item].value;
            var module = moduleResult.module + '-' + moduleResult.core;

            if (siteIndex.indexOf(moduleResult.baseurl) == -1) {
                siteIndex.push(moduleResult.baseurl)
            }

            if (!(module in moduleIndex)) {
                moduleData.modules.push({
                    m: module,
                    p: moduleResult.project,
                    a: [], //sitesWithAvailable
                    e: [], //sitesWithEnabled
                    d: [], //sitesWithDatabaseUpdates
                    u: [], //sitesWithUpdates
                    s: [], //sitesWithSecurityUpdates
                    v: {} //versions
                });
                moduleIndex[module] = moduleData.modules.length-1;
            }

            moduleData.modules[moduleIndex[module]].a.push(siteIndex.indexOf(moduleResult.baseurl));
            if (moduleResult.enabled) {
                moduleData.modules[moduleIndex[module]].e.push(siteIndex.indexOf(moduleResult.baseurl));
            }
            if (moduleResult.databaseUpdate) {
                moduleData.modules[moduleIndex[module]].d.push(siteIndex.indexOf(moduleResult.baseurl));
            }
            if (moduleResult.update) {
                moduleData.modules[moduleIndex[module]].u.push(siteIndex.indexOf(moduleResult.baseurl));
            }
            if (moduleResult.securityUpdate) {
                moduleData.modules[moduleIndex[module]].s.push(siteIndex.indexOf(moduleResult.baseurl));
            }
            if (!(moduleResult.version in moduleData.modules[moduleIndex[module]].v)) {
                moduleData.modules[moduleIndex[module]].v[moduleResult.version] = [];
                moduleData.modules[moduleIndex[module]].v[moduleResult.version].push(siteIndex.indexOf(moduleResult.baseurl));
            }
            else {
                moduleData.modules[moduleIndex[module]].v[moduleResult.version].push(siteIndex.indexOf(moduleResult.baseurl));
            }
        }
        moduleData.siteIndex = siteIndex;

        callback(null, moduleData);
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
                                    securityUpdate: securityUpdate
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
        async.each(result, 
            function(row, callback) {
                exports.getRelease(row.key[0], row.key[1], updatedProjects, function(error, result) {
                    callback();
                });
            }, 
            function(error) {
            async.eachSeries(updatedProjects, function(updatedProject, callback) {
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
                        // TODO: We may be getting the same site multiple times if it has multiple modules per project
                        // Should cache previous site result
                        var sitesUpdated = 0;
                        async.eachSeries(result, function(siteResult, callback) {
                            sites.get(siteResult, function(error, result) {
                                if (error) {
                                    console.log('Failed to retrive site ' + sid + ': ' + error);
                                    callback();
                                }
                                else {
                                    var siteDoc = result;
                                    var date = new Date().getTime() / 1000;
                                    date = Math.round(date);
                                    siteDoc.lastUpdated = date;
                                    sitesUpdated = sitesUpdated + 1;

                                    // Loop through all modules associated with project
                                    for (module in siteDoc.details.projects[updatedProject.project].modules) {
                                        if (updatedProject.securityUpdate) {
                                            if (!('projectsWithSecurityUpdates' in siteDoc.attributeDetails)) {
                                                siteDoc.attributeDetails.projectsWithSecurityUpdates = [];
                                            }
                                            if (siteDoc.attributeDetails.projectsWithSecurityUpdates.indexOf(module) == -1) {
                                                siteDoc.attributeDetails.projectsWithSecurityUpdates.push(module);
                                                siteDoc.attributes.projectsWithSecurityUpdates = siteDoc.attributes.projectsWithSecurityUpdates + 1;
                                            }
                                        }
                                        if (!('projectsWithUpdates' in siteDoc.attributeDetails)) {
                                            siteDoc.attributeDetails.projectsWithUpdates = [];
                                        }
                                        if (siteDoc.attributeDetails.projectsWithUpdates.indexOf(module) == -1) {
                                            siteDoc.attributeDetails.projectsWithUpdates.push(module);
                                            siteDoc.attributes.projectsWithUpdates = siteDoc.attributes.projectsWithUpdates + 1;
                                        }
                                    }

                                    console.log('Updating project ' + updatedProject.project + ' on ' + siteDoc.sid);
                                    sites.update(siteDoc, function(error, result) {
                                        if (error) {
                                            console.log('Failed to update site ' + siteDoc.sid + ': ' + error);
                                            callback();
                                        }
                                        else {
                                            callback();
                                        }
                                    });
                                }
                            });
                        }, function(error) {
                            console.log(sitesUpdated + ' sites with project ' + updatedProject.project + ' required updates and were updated');
                            callback();
                        });
                    }
                });
            }, function(error) {
                callback(null, 'Release gathering complete');
            });
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
