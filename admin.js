var async = require('async');
var randomstring = require('randomstring');
var uuid = require('uuid');
var User = require('./models/user');
var sites = require('./models/sites');
var moment = require('moment');
var email = require('./helpers/email');
var couchbase = require('couchbase');
var db = require('./api.js').bucket;
var config = require('./config');

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
                    var numberOfUsers = Math.floor(Math.random()*(userChoices.length/2)+1);
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
                        users[userChoices[userIndex]].created = users[userChoices[userIndex]].last_access;
                        userChoices.splice(userIndex, 1);
                    }

                    // Determine nodes
                    var nodes = {};
                    var nodesRaw = {};
                    var contentTypes = [];
                    var contentTypeChoices = ['page', 'article', 'blog', 'news', 'event', 'webform', 'private page'];
                    var numberOfContentTypes = Math.floor(Math.random()*(contentTypeChoices.length - 1)+1);
                    for (var i=0; i<numberOfContentTypes; i++) {
                        var contentTypeIndex = Math.floor(Math.random()*contentTypeChoices.length);
                        contentTypes.push(contentTypeChoices[contentTypeIndex]);
                        contentTypeChoices.splice(contentTypeIndex, 1);
                    }

                    var numberOfNodes = Math.floor(Math.random()*(500-1)+1);
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
                            words: numberOfWords
                        };
                        nodesRaw[i] = {
                            body_value: content.join(' ')
                        }
                    }

                    // Determine projects
                    var projectChoices = { "views_bulk_operations": { "modules": { "actions_permissions": { "latest_schema": 0, "dependencies": [ ] }, "views_bulk_operations": { "latest_schema": 0, "dependencies": [ "entity", "views" ] } }, "version": "7.x-3.3" }, "admin_menu": { "modules": { "admin_devel": { "latest_schema": 0, "dependencies": [ ] }, "admin_menu": { "latest_schema": 7304, "dependencies": [ "system (>7.10)" ] }, "admin_menu_toolbar": { "latest_schema": 6300, "dependencies": [ "admin_menu" ] } }, "version": "7.x-3.0-rc5" }, "auto_image_style": { "modules": { "auto_image_style": { "latest_schema": 0, "dependencies": [ "image", "file" ] } }, "version": "7.x-1.2" }, "better_exposed_filters": { "modules": { "better_exposed_filters": { "latest_schema": 0, "dependencies": [ "views" ] } }, "version": "7.x-3.2" }, "ctools": { "modules": { "bulk_export": { "latest_schema": 0, "dependencies": [ "ctools" ] }, "ctools": { "latest_schema": 7001, "dependencies": [ ] }, "ctools_access_ruleset": { "latest_schema": 0, "dependencies": [ "ctools" ] }, "ctools_ajax_sample": { "latest_schema": 0, "dependencies": [ "ctools" ] }, "ctools_custom_content": { "latest_schema": 0, "dependencies": [ "ctools" ] }, "ctools_plugin_example": { "latest_schema": 0, "dependencies": [ "ctools", "panels", "page_manager", "advanced_help" ] }, "page_manager": { "latest_schema": 0, "dependencies": [ "ctools" ] }, "stylizer": { "latest_schema": 0, "dependencies": [ "ctools", "color" ] }, "term_depth": { "latest_schema": 0, "dependencies": [ "ctools" ] }, "views_content": { "latest_schema": 0, "dependencies": [ "ctools", "views" ] } }, "version": "7.x-1.9" }, "calendar": { "modules": { "calendar": { "latest_schema": 0, "dependencies": [ "views", "date_api", "date_views" ] } }, "version": "7.x-3.4" }, "captcha": { "modules": { "captcha": { "latest_schema": 0, "dependencies": [ ] }, "image_captcha": { "latest_schema": 0, "dependencies": [ "captcha" ] } }, "version": "7.x-1.0" }, "cas_attributes": { "modules": { "cas_attributes": { "latest_schema": 7100, "dependencies": [ "cas", "token" ] }, "cas_ldap": { "latest_schema": 0, "dependencies": [ "cas_attributes", "ldap_servers" ] } }, "version": "7.x-1.0-rc2" }, "cck": { "modules": { "cck": { "latest_schema": 0, "dependencies": [ "field_ui" ] }, "content_migrate": { "latest_schema": 0, "dependencies": [ ] } }, "version": "7.x-2.x-dev" }, "checklistapi": { "modules": { "checklistapi": { "latest_schema": 0, "dependencies": [ ] }, "checklistapi_example": { "latest_schema": 0, "dependencies": [ "checklistapi" ] } }, "version": "7.x-1.0-beta3" }, "node_clone": { "modules": { "clone": { "latest_schema": 0, "dependencies": [ ] } }, "version": "7.x-1.0-rc2" }, "colorbox": { "modules": { "colorbox": { "latest_schema": 0, "dependencies": [ ] } }, "version": "7.x-1.6" }, "config_perms": { "modules": { "config_perms": { "latest_schema": 6200, "dependencies": [ ] } }, "version": "7.x-2.0" }, "content_access": { "modules": { "content_access": { "latest_schema": 7101, "dependencies": [ ] }, "content_access_rules": { "latest_schema": 0, "dependencies": [ "content_access", "rules" ] } }, "version": "7.x-1.2-beta2" }, "context": { "modules": { "context": { "latest_schema": 7000, "dependencies": [ "ctools" ] }, "context_layouts": { "latest_schema": 0, "dependencies": [ "context" ] }, "context_ui": { "latest_schema": 0, "dependencies": [ "context" ] } }, "version": "7.x-3.6" }, "context_domain": { "modules": { "context_domain": { "latest_schema": 0, "dependencies": [ "context" ] } }, "version": "7.x-1.0" }, "css_injector": { "modules": { "css_injector": { "latest_schema": 7002, "dependencies": [ ] } }, "version": "7.x-1.10" }, "date": { "modules": { "date": { "latest_schema": 7004, "dependencies": [ "date_api" ] }, "date_all_day": { "latest_schema": 0, "dependencies": [ "date_api", "date" ] }, "date_api": { "latest_schema": 7001, "dependencies": [ ] }, "date_context": { "latest_schema": 0, "dependencies": [ "date", "context" ] }, "date_migrate": { "latest_schema": 0, "dependencies": [ "migrate", "date" ] }, "date_migrate_example": { "latest_schema": 0, "dependencies": [ "date", "date_repeat", "date_repeat_field", "date_migrate", "features", "migrate" ] }, "date_popup": { "latest_schema": 0, "dependencies": [ "date_api" ] }, "date_repeat": { "latest_schema": 0, "dependencies": [ "date_api" ] }, "date_repeat_field": { "latest_schema": 0, "dependencies": [ "date_api", "date", "date_repeat" ] }, "date_tools": { "latest_schema": 0, "dependencies": [ "date" ] }, "date_views": { "latest_schema": 0, "dependencies": [ "date_api", "views" ] } }, "version": "7.x-2.6" }, "devel": { "modules": { "devel": { "latest_schema": 0, "dependencies": [ ] }, "devel_generate": { "latest_schema": 0, "dependencies": [ "devel" ] }, "devel_node_access": { "latest_schema": 0, "dependencies": [ "menu" ] } }, "version": "7.x-1.3" }, "diff": { "modules": { "diff": { "latest_schema": 7305, "dependencies": [ ] } }, "version": "7.x-3.2" }, "disable_breadcrumbs": { "modules": { "disable_breadcrumbs": { "latest_schema": 0, "dependencies": [ ] } }, "version": "7.x-1.3" }, "disable_node_menu_item": { "modules": { "disable_node_menu_item": { "latest_schema": 0, "dependencies": [ "menu" ] } }, "version": "7.x-1.1" }, "ds": { "modules": { "ds": { "latest_schema": 7201, "dependencies": [ "ctools" ] }, "ds_devel": { "latest_schema": 0, "dependencies": [ "ds", "devel" ] }, "ds_extras": { "latest_schema": 7200, "dependencies": [ "ds" ] }, "ds_format": { "latest_schema": 0, "dependencies": [ "ds" ] }, "ds_forms": { "latest_schema": 0, "dependencies": [ "ds" ] }, "ds_search": { "latest_schema": 0, "dependencies": [ "ds" ] }, "ds_ui": { "latest_schema": 0, "dependencies": [ "ds" ] } }, "version": "7.x-2.3" }, "email": { "modules": { "email": { "latest_schema": 0, "dependencies": [ ] } }, "version": "7.x-1.3" }, "entity": { "modules": { "entity": { "latest_schema": 7003, "dependencies": [ ] }, "entity_token": { "latest_schema": 0, "dependencies": [ "entity" ] } }, "version": "7.x-1.6" }, "entity_modified": { "modules": { "entity_modified": { "latest_schema": 0, "dependencies": [ ] }, "entity_modified_nodequeue": { "latest_schema": 0, "dependencies": [ ] } }, "version": "7.x-1.2" }, "entitycache": { "modules": { "entitycache": { "latest_schema": 7002, "dependencies": [ ] } }, "version": "7.x-1.2" }, "entityreference": { "modules": { "entityreference": { "latest_schema": 0, "dependencies": [ "entity", "ctools" ] }, "entityreference_behavior_example": { "latest_schema": 0, "dependencies": [ "entityreference" ] } }, "version": "7.x-1.1" }, "extlink": { "modules": { "extlink": { "latest_schema": 7101, "dependencies": [ ] } }, "version": "7.x-1.18" }, "features_extra": { "modules": { "fe_block": { "latest_schema": 0, "dependencies": [ "block", "ctools", "features" ] }, "fe_date": { "latest_schema": 0, "dependencies": [ "ctools", "features" ] }, "fe_nodequeue": { "latest_schema": 0, "dependencies": [ "ctools", "features", "nodequeue" ] }, "fe_profile": { "latest_schema": 0, "dependencies": [ "ctools", "features", "profile" ] }, "features_extra_test": { "latest_schema": 0, "dependencies": [ "block_class", "blockcache_alter", "fe_block", "fe_nodequeue" ] } }, "version": "7.x-1.0" }, "features": { "modules": { "features": { "latest_schema": 7200, "dependencies": [ ] } }, "version": "7.x-2.6" }, "features_diff": { "modules": { "features_diff": { "latest_schema": 0, "dependencies": [ "features", "diff" ] } }, "version": "7.x-1.0-beta2" }, "field_collection": { "modules": { "field_collection": { "latest_schema": 0, "dependencies": [ "entity" ] } }, "version": "7.x-1.0-beta8" }, "field_collection_fieldset": { "modules": { "field_collection_fieldset": { "latest_schema": 0, "dependencies": [ "field_collection" ] } }, "version": "7.x-2.3" }, "field_collection_table": { "modules": { "field_collection_table": { "latest_schema": 0, "dependencies": [ "field_collection" ] } }, "version": "7.x-1.0-beta2" }, "field_group": { "modules": { "field_group": { "latest_schema": 7003, "dependencies": [ "field", "ctools" ] } }, "version": "7.x-1.1" }, "media": { "modules": { "file_entity": { "latest_schema": 7100, "dependencies": [ "field", "ctools" ] }, "media": { "latest_schema": 7020, "dependencies": [ "file_entity", "image" ] }, "media_internet": { "latest_schema": 0, "dependencies": [ "media" ] } }, "version": "7.x-1.3" }, "filefield_paths": { "modules": { "filefield_paths": { "latest_schema": 7107, "dependencies": [ ] } }, "version": "7.x-1.0-rc1" }, "filefield_sources": { "modules": { "filefield_sources": { "latest_schema": 6001, "dependencies": [ "file" ] } }, "version": "7.x-1.6" }, "filefield_sources_plupload": { "modules": { "filefield_sources_plupload": { "latest_schema": 0, "dependencies": [ "filefield_sources", "plupload" ] } }, "version": "7.x-1.1" }, "flexslider": { "modules": { "flexslider": { "latest_schema": 7002, "dependencies": [ "libraries", "ctools", "image" ] }, "flexslider_fields": { "latest_schema": 0, "dependencies": [ "flexslider" ] }, "flexslider_views": { "latest_schema": 0, "dependencies": [ "views", "flexslider" ] }, "flexslider_views_slideshow": { "latest_schema": 0, "dependencies": [ "flexslider", "views_slideshow" ] } }, "version": "7.x-1.0-rc3" }, "flowplayer": { "modules": { "flowplayer": { "latest_schema": 0, "dependencies": [ "color" ] } }, "version": "7.x-1.0-alpha1" }, "galleria": { "modules": { "galleria": { "latest_schema": 0, "dependencies": [ "image", "libraries" ] } }, "version": "7.x-1.0-beta3" }, "globalredirect": { "modules": { "globalredirect": { "latest_schema": 6101, "dependencies": [ ] } }, "version": "7.x-1.5" }, "google_analytics": { "modules": { "googleanalytics": { "latest_schema": 7205, "dependencies": [ ] } }, "version": "7.x-2.1" }, "hierarchical_select": { "modules": { "hierarchical_select": { "latest_schema": 0, "dependencies": [ ] }, "hs_flatlist": { "latest_schema": 0, "dependencies": [ "hierarchical_select" ] }, "hs_menu": { "latest_schema": 0, "dependencies": [ "hierarchical_select", "menu" ] }, "hs_smallhierarchy": { "latest_schema": 0, "dependencies": [ "hierarchical_select" ] }, "hs_taxonomy": { "latest_schema": 0, "dependencies": [ "hierarchical_select", "taxonomy" ] }, "hs_taxonomy_views": { "latest_schema": 0, "dependencies": [ "hierarchical_select", "hs_taxonomy", "views" ] } }, "version": "7.x-3.0-alpha9" }, "honeypot": { "modules": { "honeypot": { "latest_schema": 0, "dependencies": [ ] } }, "version": "7.x-1.21" }, "httpbl": { "modules": { "httpbl": { "latest_schema": 0, "dependencies": [ ] } }, "version": "7.x-1.0" }, "httprl": { "modules": { "httprl": { "latest_schema": 0, "dependencies": [ ] } }, "version": "7.x-1.14" }, "httprl_spider": { "modules": { "httprl_spider": { "latest_schema": 0, "dependencies": [ ] } }, "version": null }, "panels": { "modules": { "i18n_panels": { "latest_schema": 0, "dependencies": [ "i18n", "panels", "i18n_string", "i18n_translation" ] }, "panels": { "latest_schema": 7303, "dependencies": [ "ctools (>1.5)" ] }, "panels_ipe": { "latest_schema": 0, "dependencies": [ "panels" ] }, "panels_mini": { "latest_schema": 0, "dependencies": [ "panels" ] }, "panels_node": { "latest_schema": 6001, "dependencies": [ "panels" ] } }, "version": "7.x-3.5" }, "imagemagick": { "modules": { "imagemagick": { "latest_schema": 0, "dependencies": [ ] }, "imagemagick_advanced": { "latest_schema": 0, "dependencies": [ "imagemagick" ] } }, "version": "7.x-1.0" }, "jquery_update": { "modules": { "jquery_update": { "latest_schema": 7000, "dependencies": [ ] } }, "version": "7.x-2.5" }, "libraries": { "modules": { "libraries": { "latest_schema": 7200, "dependencies": [ "system (>=7.11)" ] } }, "version": "7.x-2.2" }, "link": { "modules": { "link": { "latest_schema": 7001, "dependencies": [ ] } }, "version": "7.x-1.3" }, "linkchecker": { "modules": { "linkchecker": { "latest_schema": 7011, "dependencies": [ ] } }, "version": "7.x-1.2" }, "linkit": { "modules": { "linkit": { "latest_schema": 7203, "dependencies": [ "ctools", "entity" ] } }, "version": "7.x-2.6" }, "mailsystem": { "modules": { "mailsystem": { "latest_schema": 0, "dependencies": [ "filter" ] } }, "version": "7.x-2.34" }, "manage_comments_position": { "modules": { "manage_comments_position": { "latest_schema": 0, "dependencies": [ "comment" ] } }, "version": "7.x-1.0" }, "manualcrop": { "modules": { "manualcrop": { "latest_schema": 7108, "dependencies": [ "image (>=7.8)", "libraries (>=2.1)" ] } }, "version": "7.x-1.5" }, "media_crop": { "modules": { "media_crop": { "latest_schema": 0, "dependencies": [ "media", "wysiwyg", "libraries" ] } }, "version": "7.x-1.4" }, "media_gallery": { "modules": { "media_gallery": { "latest_schema": 0, "dependencies": [ "colorbox", "list", "number", "media (<1.99)", "taxonomy", "multiform" ] } }, "version": "7.x-1.0-beta8" }, "mediaelement": { "modules": { "mediaelement": { "latest_schema": 0, "dependencies": [ "libraries" ] } }, "version": "7.x-1.2+2-dev" }, "memcache": { "modules": { "memcache": { "latest_schema": 0, "dependencies": [ ] }, "memcache_admin": { "latest_schema": 0, "dependencies": [ ] } }, "version": "7.x-1.2" }, "memcache_storage": { "modules": { "memcache_storage": { "latest_schema": 0, "dependencies": [ ] } }, "version": "7.x-1.4" }, "menu_block": { "modules": { "menu_block": { "latest_schema": 7202, "dependencies": [ "menu (>7.11)" ] }, "menu_block_export": { "latest_schema": 0, "dependencies": [ "menu_block" ] } }, "version": "7.x-2.4" }, "menu_view_unpublished": { "modules": { "menu_view_unpublished": { "latest_schema": 0, "dependencies": [ ] } }, "version": "7.x-1.0-beta3" }, "metatag": { "modules": { "metatag": { "latest_schema": 7004, "dependencies": [ "token", "ctools" ] }, "metatag_context": { "latest_schema": 0, "dependencies": [ "context", "metatag" ] }, "metatag_dc": { "latest_schema": 0, "dependencies": [ "metatag" ] }, "metatag_opengraph": { "latest_schema": 0, "dependencies": [ "metatag" ] }, "metatag_twitter_cards": { "latest_schema": 0, "dependencies": [ "metatag" ] } }, "version": "7.x-1.0-beta4" }, "mimemail": { "modules": { "mimemail": { "latest_schema": 0, "dependencies": [ "mailsystem", "system (>=7.24)" ] }, "mimemail_action": { "latest_schema": 0, "dependencies": [ "mimemail", "trigger" ] }, "mimemail_compress": { "latest_schema": 0, "dependencies": [ "mimemail" ] } }, "version": "7.x-1.0-beta3" }, "multiform": { "modules": { "multiform": { "latest_schema": 0, "dependencies": [ ] } }, "version": "7.x-1.1" }, "navigation404": { "modules": { "navigation404": { "latest_schema": 0, "dependencies": [ ] } }, "version": "7.x-1.0" }, "nice_menus": { "modules": { "nice_menus": { "latest_schema": 0, "dependencies": [ "menu" ] } }, "version": "7.x-2.5" }, "node_convert": { "modules": { "node_convert": { "latest_schema": 7001, "dependencies": [ "ctools" ] } }, "version": "7.x-1.2" }, "options_element": { "modules": { "options_element": { "latest_schema": 0, "dependencies": [ ] } }, "version": "7.x-1.8" }, "panels_extra_layouts": { "modules": { "panels_extra_layouts": { "latest_schema": 0, "dependencies": [ "panels" ] } }, "version": "7.x-1.5" }, "pathauto": { "modules": { "pathauto": { "latest_schema": 7005, "dependencies": [ "path", "token" ] } }, "version": "7.x-1.2" }, "pathauto_persist": { "modules": { "pathauto_persist": { "latest_schema": 6000, "dependencies": [ "pathauto" ] } }, "version": "7.x-1.3" }, "pathologic": { "modules": { "pathologic": { "latest_schema": 7200, "dependencies": [ "filter" ] } }, "version": "7.x-2.12" }, "permissions_lock": { "modules": { "permissions_lock": { "latest_schema": 0, "dependencies": [ ] } }, "version": "7.x-1.0" }, "persistent_menu_items": { "modules": { "persistent_menu_items": { "latest_schema": 0, "dependencies": [ "menu" ] } }, "version": "7.x-1.0" }, "phone": { "modules": { "phone": { "latest_schema": 0, "dependencies": [ "field" ] } }, "version": "7.x-1.x-dev" }, "plupload": { "modules": { "plupload": { "latest_schema": 0, "dependencies": [ ] } }, "version": "7.x-1.6" }, "quicktabs": { "modules": { "quicktabs": { "latest_schema": 0, "dependencies": [ "ctools" ] }, "quicktabs_tabstyles": { "latest_schema": 0, "dependencies": [ "quicktabs" ] } }, "version": "7.x-3.6" }, "quicktabs_field_collection": { "modules": { "quicktabs_field_collection": { "latest_schema": 0, "dependencies": [ "quicktabs", "field_collection", "ctools" ] } }, "version": "7.x-1.0" }, "recaptcha": { "modules": { "recaptcha": { "latest_schema": 0, "dependencies": [ "captcha" ] }, "recaptcha_mailhide": { "latest_schema": 0, "dependencies": [ ] } }, "version": "7.x-1.11" }, "redirect": { "modules": { "redirect": { "latest_schema": 7102, "dependencies": [ ] } }, "version": "7.x-1.0-rc3" }, "registration": { "modules": { "registration": { "latest_schema": 0, "dependencies": [ "entity" ] }, "registration_entity_access": { "latest_schema": 0, "dependencies": [ "registration" ] }, "registration_views": { "latest_schema": 0, "dependencies": [ "registration", "views" ] }, "registration_waitlist": { "latest_schema": 0, "dependencies": [ "registration" ] } }, "version": "7.x-1.2" }, "render_cache": { "modules": { "render_cache": { "latest_schema": 7102, "dependencies": [ "entity_modified" ] }, "render_cache_comment": { "latest_schema": 0, "dependencies": [ "render_cache", "entity" ] }, "render_cache_context": { "latest_schema": 0, "dependencies": [ "render_cache", "context" ] }, "render_cache_ds": { "latest_schema": 0, "dependencies": [ "render_cache", "views", "ds", "entity" ] }, "render_cache_node": { "latest_schema": 0, "dependencies": [ "render_cache", "entity" ] }, "render_cache_views": { "latest_schema": 0, "dependencies": [ "render_cache", "views", "entity" ] } }, "version": "7.x-1.0" }, "role_delegation": { "modules": { "role_delegation": { "latest_schema": 0, "dependencies": [ ] } }, "version": "7.x-1.1" }, "rules": { "modules": { "rules": { "latest_schema": 0, "dependencies": [ "entity_token", "entity" ] }, "rules_admin": { "latest_schema": 0, "dependencies": [ "rules" ] }, "rules_i18n": { "latest_schema": 0, "dependencies": [ "rules", "i18n_string" ] }, "rules_scheduler": { "latest_schema": 0, "dependencies": [ "rules" ] } }, "version": "7.x-2.9" }, "saferpermissions": { "modules": { "saferpermissions": { "latest_schema": 0, "dependencies": [ ] } }, "version": "7.x-1.3" }, "select_or_other": { "modules": { "select_or_other": { "latest_schema": 0, "dependencies": [ ] } }, "version": "7.x-2.22" }, "seo_checklist": { "modules": { "seo_checklist": { "latest_schema": 0, "dependencies": [ "checklistapi" ] } }, "version": "7.x-4.0" }, "site_map": { "modules": { "site_map": { "latest_schema": 0, "dependencies": [ ] } }, "version": "7.x-1.0" }, "sort_comments": { "modules": { "sort_comments": { "latest_schema": 0, "dependencies": [ ] } }, "version": "7.x-1.x-dev" }, "spamspan": { "modules": { "spamspan": { "latest_schema": 0, "dependencies": [ "filter" ] } }, "version": "7.x-1.1-beta1" }, "strongarm": { "modules": { "strongarm": { "latest_schema": 7201, "dependencies": [ "ctools" ] } }, "version": "7.x-2.0" }, "syslog_advanced": { "modules": { "syslog_advanced": { "latest_schema": 0, "dependencies": [ ] } }, "version": "7.x-1.3" }, "table_element": { "modules": { "table_element": { "latest_schema": 0, "dependencies": [ ] } }, "version": "7.x-1.0-beta1" }, "token": { "modules": { "token": { "latest_schema": 7001, "dependencies": [ ] } }, "version": "7.x-1.6" }, "transliteration": { "modules": { "transliteration": { "latest_schema": 0, "dependencies": [ ] } }, "version": "7.x-3.1" }, "userone": { "modules": { "userone": { "latest_schema": 0, "dependencies": [ ] } }, "version": "7.x-1.0-beta1" }, "uuid": { "modules": { "uuid": { "latest_schema": 7102, "dependencies": [ ] }, "uuid_default_entities_example": { "latest_schema": 0, "dependencies": [ "entity", "features", "uuid" ] }, "uuid_path": { "latest_schema": 0, "dependencies": [ "uuid" ] }, "uuid_services": { "latest_schema": 0, "dependencies": [ "services", "uuid", "entity" ] }, "uuid_services_example": { "latest_schema": 0, "dependencies": [ "rest_server", "services", "uuid", "uuid_services" ] } }, "version": "7.x-1.0-alpha5" }, "uuid_features": { "modules": { "uuid_features": { "latest_schema": 0, "dependencies": [ "features", "uuid", "entity" ] } }, "version": "7.x-1.0-alpha4" }, "variablecheck": { "modules": { "variablecheck": { "latest_schema": 0, "dependencies": [ ] } }, "version": "7.x-1.4" }, "varnish": { "modules": { "varnish": { "latest_schema": 0, "dependencies": [ ] } }, "version": "7.x-1.0-beta3" }, "views": { "modules": { "views": { "latest_schema": 7301, "dependencies": [ "ctools" ] }, "views_ui": { "latest_schema": 0, "dependencies": [ "views" ] } }, "version": "7.x-3.11" }, "views_accordion": { "modules": { "views_accordion": { "latest_schema": 0, "dependencies": [ "views" ] } }, "version": "7.x-1.0-rc2" }, "views_data_export": { "modules": { "views_data_export": { "latest_schema": 0, "dependencies": [ "views" ] } }, "version": "7.x-3.0-beta7" }, "views_field_view": { "modules": { "views_field_view": { "latest_schema": 0, "dependencies": [ "views" ] } }, "version": "7.x-1.1" }, "views_slideshow": { "modules": { "views_slideshow": { "latest_schema": 0, "dependencies": [ "views (>=3.0)" ] }, "views_slideshow_cycle": { "latest_schema": 0, "dependencies": [ "views_slideshow", "libraries" ] } }, "version": "7.x-3.1" }, "webform": { "modules": { "webform": { "latest_schema": 0, "dependencies": [ "ctools", "views" ] } }, "version": "7.x-4.9" }, "webform_validation": { "modules": { "webform_validation": { "latest_schema": 0, "dependencies": [ "webform" ] } }, "version": "7.x-1.10" }, "wysiwyg": { "modules": { "wysiwyg": { "latest_schema": 7200, "dependencies": [ ] } }, "version": "7.x-2.2" }, "wysiwyg_button_order": { "modules": { "wysiwyg_button_order": { "latest_schema": 0, "dependencies": [ "wysiwyg" ] } }, "version": "7.x-1.0-rc1" }, "wysiwyg_codemagic": { "modules": { "wysiwyg_codemagic": { "latest_schema": 0, "dependencies": [ "wysiwyg" ] } }, "version": "7.x-1.0-beta2" }, "xmlsitemap": { "modules": { "xmlsitemap": { "latest_schema": 0, "dependencies": [ ] }, "xmlsitemap_custom": { "latest_schema": 0, "dependencies": [ "xmlsitemap" ] }, "xmlsitemap_engines": { "latest_schema": 0, "dependencies": [ "xmlsitemap" ] }, "xmlsitemap_i18n": { "latest_schema": 0, "dependencies": [ "xmlsitemap", "i18n" ] }, "xmlsitemap_menu": { "latest_schema": 0, "dependencies": [ "xmlsitemap", "menu" ] }, "xmlsitemap_node": { "latest_schema": 0, "dependencies": [ "xmlsitemap" ] }, "xmlsitemap_taxonomy": { "latest_schema": 0, "dependencies": [ "xmlsitemap", "taxonomy" ] }, "xmlsitemap_user": { "latest_schema": 0, "dependencies": [ "xmlsitemap" ] } }, "version": "7.x-2.0-rc1" } };
                    var projects = { "drupal": { "modules": { "aggregator": { "latest_schema": 0, "dependencies": [ ] }, "block": { "latest_schema": 7009, "dependencies": [ ] }, "blog": { "latest_schema": 0, "dependencies": [ ] }, "book": { "latest_schema": 0, "dependencies": [ ] }, "color": { "latest_schema": 7001, "dependencies": [ ] }, "comment": { "latest_schema": 7009, "dependencies": [ "text" ] }, "contact": { "latest_schema": 0, "dependencies": [ ] }, "contextual": { "latest_schema": 0, "dependencies": [ ] }, "dashboard": { "latest_schema": 0, "dependencies": [ "block" ] }, "dblog": { "latest_schema": 7002, "dependencies": [ ] }, "field": { "latest_schema": 7003, "dependencies": [ "field_sql_storage" ] }, "field_sql_storage": { "latest_schema": 7002, "dependencies": [ "field" ] }, "field_ui": { "latest_schema": 0, "dependencies": [ "field" ] }, "file": { "latest_schema": 0, "dependencies": [ "field" ] }, "filter": { "latest_schema": 7010, "dependencies": [ ] }, "forum": { "latest_schema": 0, "dependencies": [ "taxonomy", "comment" ] }, "help": { "latest_schema": 0, "dependencies": [ ] }, "image": { "latest_schema": 7005, "dependencies": [ "file" ] }, "list": { "latest_schema": 7002, "dependencies": [ "field", "options" ] }, "locale": { "latest_schema": 0, "dependencies": [ ] }, "menu": { "latest_schema": 7003, "dependencies": [ ] }, "node": { "latest_schema": 7015, "dependencies": [ ] }, "number": { "latest_schema": 0, "dependencies": [ "field" ] }, "openid": { "latest_schema": 0, "dependencies": [ ] }, "options": { "latest_schema": 0, "dependencies": [ "field" ] }, "overlay": { "latest_schema": 0, "dependencies": [ ] }, "path": { "latest_schema": 0, "dependencies": [ ] }, "php": { "latest_schema": 0, "dependencies": [ ] }, "poll": { "latest_schema": 0, "dependencies": [ ] }, "profile": { "latest_schema": 7002, "dependencies": [ ] }, "rdf": { "latest_schema": 0, "dependencies": [ ] }, "search": { "latest_schema": 0, "dependencies": [ ] }, "shortcut": { "latest_schema": 0, "dependencies": [ ] }, "simpletest": { "latest_schema": 0, "dependencies": [ ] }, "statistics": { "latest_schema": 0, "dependencies": [ ] }, "syslog": { "latest_schema": 0, "dependencies": [ ] }, "system": { "latest_schema": 7080, "dependencies": [ ] }, "taxonomy": { "latest_schema": 7011, "dependencies": [ "options" ] }, "text": { "latest_schema": 7000, "dependencies": [ "field" ] }, "toolbar": { "latest_schema": 0, "dependencies": [ ] }, "tracker": { "latest_schema": 0, "dependencies": [ "comment" ] }, "translation": { "latest_schema": 0, "dependencies": [ "locale" ] }, "trigger": { "latest_schema": 0, "dependencies": [ ] }, "update": { "latest_schema": 0, "dependencies": [ ] }, "user": { "latest_schema": 7018, "dependencies": [ ] } }, "version": core } };
                    var projectChoiceKeys = Object.keys(projectChoices);
                    var numberOfProjects = Math.floor(Math.random()*(projectChoiceKeys.length - 10)+10);
                    for (var i=0; i<numberOfProjects; i++) {
                        var projectIndex = Math.floor(Math.random()*projectChoiceKeys.length);
                        var project = projectChoiceKeys[projectIndex];
                        projects[project] = projectChoices[project];
                        projectChoiceKeys.splice(projectIndex, 1);
                        var moduleKeys = Object.keys(projectChoices[project].modules);
                        for (module in moduleKeys) {
                            var isEnabled = Math.floor(Math.random()*4);
                            if (!isEnabled) {
                                projectChoices[project].modules[moduleKeys[module]].schema = -1;
                            }
                            else {
                                var isLatestSchema = Math.floor(Math.random()*5);
                                if (!isLatestSchema && projectChoices[project].modules[moduleKeys[module]].latest_schema > 0) {
                                    projectChoices[project].modules[moduleKeys[module]].schema = projectChoices[project].modules[moduleKeys[module]].latest_schema-1;
                                }
                                else {
                                    projectChoices[project].modules[moduleKeys[module]].schema = projectChoices[project].modules[moduleKeys[module]].latest_schema;
                                }
                            }
                        }
                    }

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
                    var lastUpdated = Math.floor(Date.now() / 1000) - Math.floor(Math.random()*timeAgoAdded);

                    var siteDoc = {
                        fake: true,
                        sid: uuid.v4(),
                        uid: uid,
                        baseurl: protocol + domain.prefix + domain.noun + '.' + domain.domain + '/' + site,
                        enabled: "1",
                        users: "1",
                        content: "1",
                        traffic: "1",
                        dateAdded: Math.floor(Date.now() / 1000) - timeAgoAdded,
                        audit: {
                            lastAudit: lastUpdated,
                            lastSuccessfulAudit: lastUpdated,
                            lastSuccessfulContentAudit: lastUpdated,
                            errors: []
                        },
                        details: {
                            date: lastUpdated,
                            title: domain.prefix.charAt(0).toUpperCase() + domain.prefix.slice(1) + ' ' + domain.noun.charAt(0).toUpperCase() + domain.noun.slice(1) + ' ' + site.charAt(0).toUpperCase() + site.slice(1),
                            base_url: protocol + domain.prefix + domain.noun + '.' + domain.domain + '/' + site,
                            drupal_core: core,
                            php_version: '5.3.' + Math.floor(Math.random()*30),
                            traffic: {
                                recorded_since: Math.floor(Date.now() / 1000) - timeAgoAdded,
                                paths: {
                                    onlypathfornow: {
                                        hits: Math.floor(Math.random()*500),
                                        last_access: Math.floor(Date.now() / 1000)
                                    }
                                }
                            },
                            files: {
                                public: {
                                    count: Math.floor(Math.random()*2500),
                                    size: Math.round((Math.random()*600)*10)/10,
                                },
                                private: {
                                    count: Math.floor(Math.random()*2500),
                                    size: Math.round((Math.random()*600)*10)/10,
                                }
                            },
                            db_size: Math.round((Math.random()*50)*10)/10,
                            users: users,
                            nodes: nodes,
                            blocks: {},
                            projects: projects,
                            themes: themes,
                            variables: variables,
                            benchmark: 0
                        },
                        raw: {
                            nodes: nodesRaw,
                        },
                        tags: tags
                    };

                    q.push(siteDoc, function(error) {});
                }
            }
        }
    });
}

exports.audit = function(sid, callback) {
    var results = [];
    sites.audit(sid, results, function(error, result) {
        if (error) {
            return callback(error, null);
        }
        return callback(null, results);
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

exports.deleteSite = function(sid, callback) {
    var results = [];
    sites.delete(sid, function(error, result) {
        if (error) {
            return callback(error, null);
        }
        return callback(null, results);
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

exports.getSiteDoc = function(sid, callback) {
    sites.get(sid, function (error, result) {
        if (error) {
            return callback(error);
        }
        return callback(null, result);
    });
}

exports.flushReleases = function(callback) {
    var couchbase = require('couchbase');
    query = couchbase.ViewQuery.from('modules', 'drupalorg_by_project')
        .stale(1);
    db.query(query, function(error, result) {
        if (error) {
            return callback(error, null);
        }
        var results = [];
        async.each(result,
            function(row, callback) {
                db.remove(row.id, function(error, result) {
                    if (error) {
                        results.push('Failed to remove ' + row.id);
                        return callback();
                    } else {
                        console.log('Deleted ' + row.id);
                        callback();
                    }
                });
            },
            function(error) {
                if (results.length) {
                    console.log('Drupal.org release deletion finished, ' + results.length + ' non-successful results occurred:');
                    console.log(results);
                }
                else {
                    console.log('Drupal.org release deletion finished');
                }
                callback();
            }
        );
    });
}

exports.flushTokens = function(callback) {
    var tokens = ['refresh', 'access'];
    async.each(tokens,
        function(token, callback) {
            query = couchbase.ViewQuery.from('oauth', 'by_' + token + 'token')
                .range([null],[{}]);
            db.query(query, function(error, result) {
                if (error) {
                    return callback(error, null);
                }
                var results = [];
                async.each(result,
                    function(row, callback) {
                        db.remove(row.id, function(error, result) {
                            if (error) {
                                results.push('Failed to remove ' + row.id);
                                return callback();
                            }
                            console.log('Deleted ' + row.id);
                            callback();
                        });
                    },
                    function(error) {
                        if (results.length) {
                            console.log(token.charAt(0).toUpperCase() + token.slice(1) + ' token deletion finished, ' + results.length + ' non-successful results occurred:');
                            console.log(results);
                        }
                        else {
                            console.log(token.charAt(0).toUpperCase() + token.slice(1) + ' token deletion finished');
                        }
                        callback();
                    }
                );
            });
        }, 
        function(error) {
            if (error) {
                return callback(error);
            }
            callback();
        }
    );
}

exports.reportSites = function(uid, callback) {
    require('console.table');

    function getUsers(uid, callback) {
        if (uid) {
            User.get(uid, function(error, result) {
                if (error) {
                    return callback(error);
                }
                callback(null, [{key: result.username, value: uid}]);
            });
        }
        else {
            query = couchbase.ViewQuery.from('users', 'by_username')
                .stale(1);
            db.query(query, function(error, result) {
                if (error) {
                    return callback(error);
                }
                callback(null, result);
            });
        }
    }

    getUsers(uid, function(error, result) {
        if (error) {
            callback(error);
        } else {
            async.eachLimit(result, 1,
                function(row, callback) {
                    var username = row.key;
                    var uid = row.value;
                    var rows = [];
                    query = couchbase.ViewQuery.from('sites', 'by_uid')
                        .key([uid, null]);
                    db.query(query, function(error, result) {
                        async.eachLimit(result, 1,
                            function(row, callback) {
                                sites.get(row.value, function(error, result) {
                                    if (result && !result.fake) {
                                        rows.push({
                                            sid: result.sid,
                                            baseURL: result.baseurl,
                                            u: result.users,
                                            c: result.content,
                                            t: result.traffic,
                                            drupal: result.details.drupal_core,
                                            php: result.details.php.version,
                                            time: result.details.php.max_execution_time,
                                            mem: result.details.php.memory_limit,
                                            nodes: result.attributes.nodes,
                                            lastAudit: moment.unix(result.audit.lastAudit).fromNow(),
                                            lastSuccess: moment.unix(result.audit.lastSuccessfulAudit).fromNow(),
                                            lastContent: moment.unix(result.audit.lastSuccessfulContentAudit).fromNow(),
                                            benchmark: result.details.benchmark.toFixed(2),
                                            token: result.token,
                                            tags: result.tags
                                        });
                                    }
                                    callback();
                                });
                            },
                            function(error) {
                                if (rows.length) {
                                    console.table('User ' + username + ' (' + uid + ')', rows);
                                    console.log(rows.length + ' sites');
                                }
                                callback();
                            }
                        );
                    });
                },
                function(error){
                    callback(null, 'Finished');
                }
            );
        }
    });
}