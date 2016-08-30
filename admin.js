var async = require('async');
var randomstring = require('randomstring');
var uuid = require('uuid');
var User = require('./models/user');
var sites = require('./models/sites');
var email = require('./helpers/email');
var couchbase = require('couchbase');
var db = require('./api.js').bucket;
var config = new require('./config')();

exports.addFakeSites = function(uid, numberOfSites, callback) {
    var createSiteName = function(domains) {
        var prefixChoices = ['local', 'super', 'awesome', 'great', 'red', 'blue', 'green', 'yellow', 'big', 'small', 'eco', 'square', 'circle', 'cosmic', 'classic', 'logical', 'happy', 'pleasant', 'striped', 'paisley', 'proud', 'natural'];
        var nounChoices = ['puppies', 'kittens', 'eats', 'delicious', 'design', 'instruction', 'training', 'university', 'college', 'agency', 'garden', 'business', 'sports', 'recreation', 'creative', 'tourism', 'hotel', 'games', 'cable', 'bikes', 'cars', 'energy', 'bread', 'beer', 'wine', 'brewing', 'engineering', 'construction', 'labs', 'coffee', 'ramen', 'sushi', 'farm', 'couples', 'weddings', 'services', 'hiking'];
        var domainChoices = ['com', 'org', 'net'];
        var suffixChoices = ['promotion', 'gateway', 'newsletter', 'blog', 'shop', 'brand', 'community', 'media', 'events', 'status', 'jobs', 'social', 'cloud', 'help', 'privacy', 'data', 'policy', 'donate', 'partners', 'french', 'spanish', 'global', 'technology', 'loyalty', 'resources'];

        var noSuffix = Math.floor(Math.random()*3);
        if (domains.length && !noSuffix) {
            var domainIndex = Math.floor(Math.random()*domains.length);
            for (var j=0; j<domains[domainIndex].sites.length; j++) {
                var index = suffixChoices.indexOf(domains[domainIndex].sites[j]);
                if (index > -1) {
                    suffixChoices.splice(index, 1);
                }
            }
            if (!suffixChoices.length) {
                return false;
            }
            else {
                domains[domainIndex].sites.push(suffixChoices[Math.floor(Math.random()*suffixChoices.length)]);
            }
        }
        else {
            var prefix = prefixChoices[Math.floor(Math.random()*prefixChoices.length)];
            var noun = nounChoices[Math.floor(Math.random()*nounChoices.length)];
            var domain = domainChoices[Math.floor(Math.random()*domainChoices.length)];
            for (var j=0; j<domains.length; j++) {
                if (prefix == domains[j].prefix && noun == domains[j].noun && domain == domains[j].domain) {
                    return false;
                }
            }
            domains.push({
                prefix: prefix,
                noun: noun,
                domain: domain,
                sites: ['']
            });
        }
    }

    User.get(uid, function(error, result) {
        if (error) {
            callback(error);
        }
        else {
            var q = async.queue(function(siteDoc, callback) {
                sites.processDoc(siteDoc, function(error, result) {
                    if (error) {
                        console.log('Failed to process site ' + siteDoc.sid);
                        callback(error, null);
                        return;
                    }
                    // Save site
                    db.insert('site::' + siteDoc.sid, siteDoc, function(error, result) {
                        if (error) {
                            console.log('Failed to add site ' + siteDoc.sid);
                            callback(error, null);
                            return;
                        }
                        console.log('Added site ' + siteDoc.sid);
                        callback(null, result);
                    });
                });
            }, 2);

            q.drain = function() {
                callback(null, 'Adding sites complete');
            };

            var domains = [];
            for (var i=0; i<numberOfSites; i++) {
                while (createSiteName(domains) === false) {};
            }

            // Define possible users and roles
            for (domainIndex in domains) {
                var domain = domains[domainIndex];

                // Determine domain protocol
                var noHTTPS = Math.floor(Math.random()*3);
                var protocol = 'http://';
                if (!noHTTPS) {
                    protocol = 'https://';
                }

                // Dictionaries
                var wordChoices = ['balance','jail','fairies','structure','suspect','applaud','carriage','gun','whirl','groovy','weather','snobbish','roll','crabby','knot','careless','filthy','fortunate','fire','cool','point','stream','oven','sponge','stay','education','announce','spot','smash','gentle','jobless','spoil','ship','abhorrent','seat','regret','grouchy','handsomely','key','connection','mess up','vein','lopsided','zoo','swift','pricey','strap','current','oval','move','offer','friend','even','crib','rich','calculate','serious','smiling','intelligent','black','tip','fit','please','adjoining','aquatic','hat','wild','lazy','hate','elated','pail','extend','spectacular','giddy','adhesive','base','treat','guide','poised','ruddy','imperfect','belligerent','minister','zany','books','toe','pink','weigh','ubiquitous','acceptable','twist','tail','zealous','juicy','dispensable','badge','milk','tasty','moan','brick','month','chalk','knock','roasted','flower','aspiring','warn','chemical','tank','bury','scrape','breath','tendency','bomb','gaudy','utopian','receptive','tense','far-flung','snow','clean','fancy','relieved','camp','hope','bag','digestion','press','root','concern','pumped','tiresome','bruise','week','addition','trick','straight','mark','purring','ask','floor','protective','thread','train','stare','trap','camp','trust','dear','sail','fanatical','save','hungry','cobweb','bad','paddle','mean','cherry','descriptive','yummy','torpid','disgusting','busy','meat','toad','whisper','exotic','woman','poison','lacking','ossified','kitty','support','glistening','squeak','son','obedient','jelly','desert','lick','dull','form','system','shade','cure','turn','ignorant','tidy','hideous','simple','embarrass','elbow','verdant','invent','decorous','accessible','pan','use','reason','thumb','obese','smoke','cracker','cold','reach','scribble','light','matter','marvelous','forgetful','discussion','grandiose','pear','rot','front','brief','pushy','stomach','general','match','fluffy','burn','girl','momentous','woebegone','boiling','oranges','slim','macabre','spell','effect','materialistic','delay','shock','fruit','pickle','calendar','blue','turn','fireman','reject','spark','lavish','luxuriant','standing','frame','spotty','medical','beam','tangible','produce','skin','tacky','class','wipe','explain','question','wasteful','handsome','discovery','art','material','placid','scratch','concentrate','desk','lively','airport','travel','wax','pause','channel','step','orange','parcel','retire','abortive','winter','dependent','tangy','perfect','scrawny','consider','salt','thaw','snakes','jazzy','wren','ethereal','worried','male','pretend','imaginary','cars','meeting','exultant','voyage','afford','interest','ocean','strip','soft','untidy','cap','ring','workable','hammer','meal','copper','wind','ill-informed','girls','vigorous','hands','gather','proud','liquid','behave','thoughtless','control','sneeze','level','holistic','common','skip','subsequent','mitten','pipe','watch','dusty','abaft','shy','tax','knife','useful','scream','bone','offend','spooky','tub','nod','suck','peck','trucks','settle','event','curvy','describe','amusement','eight','tray','uptight','economic','cherries','hellish','educated','jittery','dreary','brake','puffy','moon','apparatus','sweet','bawdy','company','jump','pencil','bucket','move','windy','lamentable','instrument','harsh','rhyme','psychotic','spiffy','entertaining','shiny','premium','behavior','comb','striped','stick','stimulating','unsightly','time','visit','spoon','dysfunctional','theory','monkey','kill','drab','record','sign','tight','hallowed','type','whispering','confused','onerous','wide','dry','crowd','hospital','massive','zipper','bikes','frighten','strong','ants','show','useless','fearful','powerful','license','glow','transport','eye','ad hoc','listen','grandfather','found','steady','team','ragged','lumpy','signal','ashamed','erratic','view','attract','hand','film','parsimonious','design','outgoing','trace','knowledge','pig','noise','productive','lewd','puzzling','alike','preach','rule','different','visitor','cream','dogs','stuff','witty','rub','evasive','natural','roll','daily','bubble','rare','humorous','scale','notebook','entertain','stroke','watery','realise','fire','ice','ambiguous','profuse','agreeable','last','spare','metal','knowing','real','adventurous','sugar','shaggy','shivering','support','paper','leg','spark','deliver','sense','annoyed','futuristic','rapid','giraffe','nutritious','weight','unable','ghost','vegetable','bleach','observe','pigs','alive','kick','want','scarf','route','embarrassed','boorish','price','weary','cow','change','cut','discreet','disillusioned','hang','afternoon','puncture','sore','panoramic','incandescent','obtainable','square','bait','manage','miscreant','snake','suit','doll','spy','craven','tranquil','hug','vest','rigid','bike','slip','vagabond','infamous','sun','better','conscious','haunt','rebel','separate','jam','phone','bedroom','dramatic','wool','kittens','amazing','terrify','insurance','hose','unhealthy','selective','chess','tawdry','flashy','squalid','dynamic','flow','escape','women','marked','ready','illustrious','lovely','abusive','magenta','towering','anger','marble','daughter','fantastic','beg','delirious','frail','separate','wrench','interrupt','grass','wistful','try','familiar','skillful','boy','abundant','hollow','sigh','replace','close','halting','frantic','silk','hole','uneven','unused','smash','tested','giant','fool','detect','sprout','partner','pull','rotten','coach','wish','alcoholic','terrific','fixed','trouble','reflect','guide','ordinary','fill','plate','wrathful','absorbing','switch','habitual','innocent','dirt','squash','fabulous','combative','chief','tearful','flippant','trick','balance','top','bow','tin','colossal','jumbled','twist','secretary','periodic','letters','north','difficult','leather','loutish','sheet','regret','joke','nut','acrid','believe','consist','doctor','gleaming','steel','lively','end','nondescript','fearless','next','store','stem','round','coat','credit','houses','ripe','order','domineering','memory','jewel','rhythm','bashful','plant','extra-large','utter','invite','sisters','axiomatic','decision','offbeat','prick','babies','war','boat','fretful','bulb','milk','beds','deceive','breakable','makeshift','cagey','quixotic','middle','decide','wait','chin','avoid','sedate','satisfy','guiltless','slow','trade','hate','enjoy','deserve','rustic','error','grandmother','morning','stormy','garrulous','immense','tent','silent','clammy','holiday','stone','organic','card','grumpy','title','stamp','tomatoes','eager','quince','reading','tie','curve','note','government','complain','slow','drag','attraction','muddled','tick','butter','acid','well-made','planes','pollution','damaging','precede','volatile','continue','battle','reminiscent','auspicious','solid','street','shaky','soup','need','obtain','madly','texture','omniscient','stove','numberless','ajar','ear','astonishing','melodic','chubby','dry','extra-small','substance','poke','waste','match','wriggle','seashore','unsuitable','rings','knee','touch','cheerful','float','hot','nest','quirky','untidy','noiseless','needy','jump','test','callous','military','sack','laugh','story','mysterious','humdrum','abrasive','redundant','godly','ground','suit','yellow','sign','early','equable','sink','smart','thing','request','vengeful','high-pitched','owe','crow','youthful','school','neat','circle','nervous','chop','river','thrill','carpenter','celery','charming','upset','sulky','cats','promise','force','maddening','chance','depend','ill','mend','annoying','legal','safe','limit','church','crush','heady','loss','muscle','kiss','attach','lip','elderly','public','hurt','destruction','rub','ugliest','cat','example','jar','spiky','admit','disagree','hook','stretch','race','note','pizzas','advise','join','pine','rush','paltry','wire','reflective','unusual','porter','normal','plastic','receive','camera','brown','object','deadpan','actor','merciful','fly','feigned','building','queue','large','flowers','man','freezing','draconian','sore','terrible','order','hurried','helpful','tremble','protest','shoe','picayune','horses','zebra','debonair','direction','grape','rude','roomy','claim','play','fuel','marry','x-ray','queen','jog','drain','robin','average','guarantee','mother','icicle','dress','loose','step','silver','tug','pastoral','overrated','squirrel','peaceful','practise','didactic','power','blue-eyed','steam','smell','riddle','violent','scarecrow','hover','ignore','empty','awake','size','ruin','cowardly','moaning','corn','account','coast','dock','raspy','night','harmony','smoggy','high','swim','interesting','old-fashioned','robust','tame','double','attack','worry','simplistic','lucky','sturdy','aboriginal','health','mine','fetch','gabby','appreciate','exchange','smoke','shave','shape','steer','injure','pat','heavenly','jam','march','straw','ski','dizzy','damp','satisfying','blow','pets','wiry','narrow','party','sound','nebulous','dark','skate','lace','fascinated','staking','beginner','tire','absurd','grip'];

                // Construct sites per domain
                for (siteIndex in domain.sites) {

                    // Determine meta
                    var site = domain.sites[siteIndex];
                    var core = '7.' + Math.floor(Math.random()*45);
                    var timeAgoAdded = Math.floor(Math.random()*15552000);

                    // Determine users
                    var users = {};
                    var userChoices = ['horace', 'benedict', 'neva', 'chang', 'fran', 'normand', 'ena', 'jettie', 'marianna', 'neida', 'ryann', 'jacqui', 'delores', 'myrl', 'beatris', 'hazel', 'teisha', 'keenan', 'rudolf', 'rosamond', 'traci', 'florentina', 'janette', 'russel', 'erinn', 'avelina', 'donnette', 'bethel', 'dimple', 'minna', 'diann', 'hanh', 'alexa', 'bruce', 'mable', 'norbert', 'kenyatta', 'zella', 'ingeborg', 'magdalen', 'nilsa', 'faith', 'zachery', 'georgeann', 'marybeth', 'hoa', 'kamilah', 'jerrod', 'eun', 'collene'];
                    var numberOfUsers = Math.floor(Math.random()*(userChoices.length - 1)+1);
                    for (var i=0; i<numberOfUsers; i++) {
                        // Get roles
                        var roleChoices = ['Content Author', 'Content Admin', 'Moderator', 'Site Admin', 'Developer'];
                        var numberOfRoles = Math.floor(Math.random()*(roleChoices.length - 1)+1);
                        var roles = [];
                        for (var j=0; j<numberOfRoles; j++) {
                            var roleIndex = Math.floor(Math.random()*roleChoices.length);
                            roles.push(roleChoices[roleIndex]);
                            roleChoices.splice(roleIndex, 1);
                        }
                        // Assemble user
                        var userIndex = Math.floor(Math.random()*userChoices.length);
                        users[userChoices[userIndex]] = { 
                            mail: users[userChoices[userIndex]] + '@emailaddress.com', 
                            last_access: Math.floor(Date.now() / 1000) - Math.floor(Math.random()*62208000), 
                            status: 1,
                            roles: roles
                        };
                        userChoices.splice(userIndex, 1);
                    }

                    // Determine nodes
                    var nodes = {};
                    var contentTypes = [];
                    var contentTypeChoices = ['page', 'article', 'blog', 'news', 'event', 'webform', 'private page'];
                    var numberOfContentTypes = Math.floor(Math.random()*(contentTypeChoices.length - 1)+1);
                    for (var i=0; i<numberOfContentTypes; i++) {
                        var contentTypeIndex = Math.floor(Math.random()*contentTypeChoices.length);
                        contentTypes.push(contentTypeChoices[contentTypeIndex]);
                        contentTypeChoices.splice(contentTypeIndex, 1);
                    }

                    var numberOfNodes = Math.floor(Math.random()*500);
                    for (var i=0; i<numberOfNodes; i++) {
                        var timeAgoCreated = Math.floor(Math.random()*62208000);
                        var numberOfWords = Math.floor(Math.random()*500);
                        var content = [];
                        for (var j=0; j<numberOfWords; j++) {
                            content.push(wordChoices[Math.floor(Math.random()*wordChoices.length)]);
                        }
                        nodes[i] = {
                            created: Math.floor(Date.now() / 1000) - timeAgoCreated,
                            changed: Math.floor(Date.now() / 1000) - Math.floor(Math.random()*timeAgoCreated),
                            type: contentTypeChoices[Math.floor(Math.random()*contentTypeChoices.length)],
                            content: {
                                body_value: content.join(' ')
                            }
                        };
                    }

                    // Determine projects
                    var projects = {};

                    // Determine themes
                    var themes = {};
                    var themeChoices = ['bartik', 'garland', 'seven', 'stark', 'custom', 'contributed', 'bootstrap'];
                    var numberOfThemes = Math.floor(Math.random()*(themeChoices.length - 1)+1);
                    for (var i=0; i<numberOfThemes; i++) {
                        var themeIndex = Math.floor(Math.random()*themeChoices.length);
                        themes[themeChoices[themeIndex]] = { version: core, status: 0 };
                        themeChoices.splice(themeIndex, 1);
                    }
                    var themesToEnable = Math.floor(Math.random()*(numberOfThemes - 1)+1);
                    var themeKeys = Object.keys(themes);
                    for (var i=0; i<themesToEnable; i++) {
                        themes[themeKeys[i]].status = 1;
                    }

                    // Determine variables
                    var variables = {
                        preprocess_css: Math.floor(Math.random()*2),
                        preprocess_js: Math.floor(Math.random()*2),
                        cache: Math.floor(Math.random()*2),
                        maintenance_mode: 0,
                        theme_default: themeKeys[0]
                    }
                    var noMaintenanceMode = Math.floor(Math.random()*20);
                    if (!noMaintenanceMode) {
                        variables.maintenance_mode = 1;
                    }
                    if (projects.google_analytics) {
                        var googleAnalyticsChoices = ['UA-123456789-1', 'UA-987654321-1', 'UA-999666333-1'];
                        variables['googleanalytics_account'] = googleAnalyticsChoices[Math.floor(Math.random()*googleAnalyticsChoices.length)];
                    }
                    if (themeKeys[0] == 'custom') {
                        variables['theme_settings'] = { level: 'abcdef'[Math.floor(Math.random()*6)] }
                    }

                    // Determine tags
                    var noTags = Math.floor(Math.random()*2);
                    var tags = [];
                    if (!noTags) {
                        var tagChoices = ['In development', 'Important client', 'Update scheduled', 'Has maintenance contract'];
                        var numberOfTags = Math.floor(Math.random()*tagChoices.length);
                        for (var i=0; i<numberOfTags; i++) {
                            var tagIndex = Math.floor(Math.random()*tagChoices.length);
                            tags.push(tagChoices[tagIndex]);
                            tagChoices.splice(tagIndex, 1);
                        }
                        protocol = 'https://';
                    }

                    // Assemble siteDoc
                    var siteDoc = {
                        fake: true,
                        sid: uuid.v4(),
                        uid: uid,
                        baseurl: protocol + domain.prefix + domain.noun + '.' + domain.domain + '/' + site,
                        enabled: "1",
                        users: "1",
                        content: "1",
                        dateAdded: Math.floor(Date.now() / 1000) - timeAgoAdded,
                        lastUpdated: Math.floor(Date.now() / 1000) - Math.floor(Math.random()*timeAgoAdded),
                        audited: {
                            date: Math.floor(Date.now() / 1000) - Math.floor(Math.random()*timeAgoAdded)
                        },
                        details: {
                            title: domain.prefix.charAt(0).toUpperCase() + domain.prefix.slice(1) + ' ' + domain.noun.charAt(0).toUpperCase() + domain.noun.slice(1) + ' ' + site.charAt(0).toUpperCase() + site.slice(1),
                            base_url: protocol + domain.prefix + domain.noun + '.' + domain.domain + '/' + site,
                            drupal_core: core,
                            php_version: '5.3.' + Math.floor(Math.random()*30),
                            traffic: {},
                            files: {
                                public: {
                                    count: Math.floor(Math.random()*2500),
                                    size: Math.round((Math.random()*700)*10)/10,
                                },
                                private: {
                                    count: Math.floor(Math.random()*2500),
                                    size: Math.round((Math.random()*700)*10)/10,
                                }
                            },
                            db_size: Math.round((Math.random()*50)*10)/10,
                            users: users,
                            nodes: nodes,
                            projects: {},
                            themes: themes,
                            variables: variables
                        },
                        tags: tags
                    };

                    q.push(siteDoc, function(error) {});
                }
            }
        }
    });
}

exports.createUser = function(emailAddress, username, callback) {
    var user = new User(emailAddress, username);
    user.setPassword(randomstring.generate(8));
    user.removeVerification();
    user.create(function(error, result) {
        if (error) {
            callback(error);
        }
        else {
            callback(result);
        }
    });
}

exports.deleteFakeSites = function(uid, callback) {
    User.get(uid, function(error, result) {
        if (error) {
            callback(error);
        }
        else {
            query = couchbase.ViewQuery.from('sites', 'by_uid')
                .key([uid, true]);
            db.query(query, function(error, result) {
                if (error) {
                    return callback(error, null);
                }
                async.each(result,
                    function(row, callback) {
                        var sid = row.value;
                        sites.delete(sid, function(error, result) {
                            if (error) {
                                console.log('Failed to delete site ' + sid);
                                return callback(error, null);
                            }
                            console.log('Deleted site ' + sid);
                            callback();
                        });
                    },
                    function(error) {
                        if (error) {
                            return callback(error);
                        }
                        callback(null, 'Site deletion finished');
                    }
                );
            });
        }
    });
}
