var couchbase = require('couchbase');
var db = require('../app.js').bucket;
var request = require('request');
var xml2json = require('xml2json');

exports.getReleases = function(callback) {
    query = couchbase.ViewQuery.from('modules', 'by_project')
        .group(true)
        .stale(1);
    db.query(query, function(error, result) {
        if (error) {
            callback(error, null);
            return;
        }
        for (index in result) {
            var projectTitle = result[index].key[0];
            var core = result[index].key[1];
            console.log('Getting releases for ' + projectTitle + '-' + core);
            (function(projectTitle, core) {
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
                            var securityUpdate = false;
                            for (var i=0, releaseTotal=project.project.releases.release.length; i < releaseTotal; i++) {
                                if ('terms' in project.project.releases.release[i]) {
                                    for (var j=0, termTotal=project.project.releases.release[i].terms.term.length; j < termTotal; j++) {
                                        if (project.project.releases.release[i].terms.term[j].name == 'Release type' && project.project.releases.release[i].terms.term[j].value == 'Security update') {
                                            securityUpdate = true;
                                        }
                                    }
                                }

                                projectDoc.releases.push({ 
                                    version: project.project.releases.release[i].version,
                                    securityUpdate: securityUpdate
                                });
                            }
                            console.log(projectDoc);
                        }
                    }
                });
            })(projectTitle, core);
        }
        // callback(null, null);
    });
}