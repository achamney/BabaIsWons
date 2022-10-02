import {applyAdjectives} from './adjective.js'
import {findAtPosition} from '../gameService.js'
import {wordMasks,getCharFromActor,filterByCondition,isHandler,addActorsToList,executeBase} from './ruleService.js'
export let isRule = {
    execute: function (actors, dir) {
        var initLonely = function() { lonely = {not: false, active:false};};
        var leftNouns = {},
            rightNouns = {},
            rightAdjs = {},
            rightNNouns = {},
            rightHas = {},
            rightNAdjs = {},
            isIndex = 0,
            notted = false,
            lonely = initLonely(),
            has = false,
            buildWord = "";
        for (isIndex = 0; isIndex < actors.length; isIndex++) {
            var curActor = actors[isIndex],
                actorChar = getCharFromActor(curActor);
            if (curActor.name == "is") {
                addBuiltWordIfRequired(buildWord, leftNouns, notted, lonely);
                buildWord = "";
                break;
            }
            else if (curActor.name == "on" || curActor.name == "facing" || curActor.name == "near" ) {
                var condition = curActor.name;
                addBuiltWordIfRequired(buildWord, leftNouns, notted, lonely);
                buildWord = "";
                isIndex++;
                curActor = actors[isIndex];
                var conditionalNouns = this.getConditionalNouns(leftNouns, actors, isIndex);
                for (var conditionalNoun of conditionalNouns) {
                    conditionalNoun.condition = conditionalNoun.condition || { on: [], facing: [], near: [] };
                    conditionalNoun.condition[condition].push({name: curActor.name, prenot: notted, postnot: false}); // TODO: ON NOT <noun>
                }
                notted = false;
                lonely = initLonely();
            }
            else if (curActor.name == "not") {
                notted = !notted;
            }
            else if (curActor.name == "lonely") {
                lonely = { active: true, not: notted};
                notted = false;
            } else if (curActor.name == "and") {
                addBuiltWordIfRequired(buildWord, leftNouns, notted, lonely);
                buildWord = "";
                continue;
            } else if (actorChar == "n") {
                addActorsToList(curActor, leftNouns, notted, lonely);
                notted = false;
                lonely = initLonely();
            } else if (actorChar == "l") {
                buildWord += curActor.name;
            }
        }
        for (var i = isIndex + 1; i < actors.length; i++) {
            var curActor = actors[i],
            actorChar = getCharFromActor(curActor);
            if (curActor.name == "is") { // Left here in case of off by one error?
                break;
            }
            else if (curActor.name == "not") {
                notted = !notted;
            } else if (curActor.name == "has") {
                this.addRightBuildWordIfRequired(buildWord, has, notted, rightHas, rightNNouns, rightNouns, rightAdjs, rightNAdjs);
                has = true;
            } else if (curActor.name == "and") {
                this.addRightBuildWordIfRequired(buildWord, has, notted, rightHas, rightNNouns, rightNouns, rightAdjs, rightNAdjs);
                continue;
            } else {
                if (actorChar == "n") {
                    has = this.addRightNoun(curActor.name, has, notted, rightHas, rightNNouns, rightNouns);
                } else if (actorChar == "a") {
                    this.addRightAdj(curActor.name, notted, rightAdjs, rightNAdjs);
                } else if (actorChar == "l") {
                    buildWord += curActor.name;
                }
                notted = false;
            }
        }
        this.addRightBuildWordIfRequired(buildWord, has, notted, rightHas, rightNNouns, rightNouns, rightAdjs, rightNAdjs);
        for (var leftN in leftNouns) {
            for (var rightA in rightAdjs) {
                isHandler.runningAdjectives.push([leftNouns[leftN], "is", rightA]);
            }
            for (var rightNA in rightNAdjs) {
                isHandler.runningNAdjectives.push([leftNouns[leftN], "is", "not", rightNA]);
            }
            for (var rightN in rightNouns) {
                if (leftN == rightN)
                    isHandler.runningChangeless.push(leftN);
                else
                    isHandler.runningEqualities.push([leftNouns[leftN], "is", rightN]);
            }
            for (var rightNN in rightNNouns) {
                if (leftNouns[leftN].name == rightNN) {
                    isHandler.runningEqualities.push([leftNouns[leftN], "is", ""]); // Wall is not wall should eliminate the wall
                } else {
                    isHandler.runningNEqualities.push([leftNouns[leftN], "is", "not", rightNN]);
                }
            }
            for (var rightH in rightHas) {
                runningHas.push([leftNouns[leftN], "has", rightH]);
            }
        }
        executeBase(actors);
    },
    reset: function () {
        isHandler.runningEqualities = [];
        isHandler.runningChangeless = [];
        isHandler.runningAdjectives = [[{name:"text"}, "is", "push"]];
        isHandler.runningNAdjectives = [];
        isHandler.runningNEqualities = [];
    },
    apply: function (gameHandler) {
        this.applyChanges(gameHandler);
        applyAdjectives();
    },
    applyChanges(gameHandler) {
        var allThings = gamestate.objects.concat(gamestate.words);
        var dereferencedChanges = {};
        var allNouns = gamestate.words.filter(w => getCharFromActor(w) == "n").map(w => w.name).filter((w, i, self) => self.indexOf(w) === i); // get only unique noun names
        var allInGroup = isHandler.runningEqualities.filter(a => a[2] == "group").map(a => a[0].name).filter((w, i, self) => self.indexOf(w) === i); // get only unique noun names;
        for (var actors of isHandler.runningEqualities) {
            if (actors[2] == "all") {
                for (var noun of allNouns) {
                    this.addEqualityToDerefChanges([actors[0], "", noun], dereferencedChanges);
                }
            } else if (actors[0].name == "all") {
                for (var noun of allNouns) {
                    if (noun == "all") continue;
                    this.addEqualityToDerefChanges([{ name: noun }, "", actors[2]], dereferencedChanges);
                }
            } else if (actors[0].name == "level") { // TODO: This is actually a secret unlock, but I'm making it more literal here
                for (var noun of things) {
                    this.addEqualityToDerefChanges([{ name: noun }, "", actors[2]], dereferencedChanges);
                }
            }
            else if (actors[0].name == "group") {
                for (var noun of allInGroup) {
                    this.addEqualityToDerefChanges([{ name: noun }, "", actors[2]], dereferencedChanges);
                }
            }
            else if (actors[2] == "group") {
                // Do nothing. {baba is group} is just group assignment
            }
            else {
                this.addEqualityToDerefChanges(actors, dereferencedChanges);
            }

        }
        var rerunAdjs = false;
        for(var derefId in dereferencedChanges) {
          rerunAdjs = true;
          if (derefId.startsWith("{")) {
            var locKey = JSON.parse(derefId);
            for (var derefName of dereferencedChanges[derefId]) {
              if (derefName != "empty")
                gameHandler.makeNewObjectFromOld(locKey, derefName, derefName == "text");
            }
          } else {
            var obj = allThings.filter(o=>o.id == derefId)[0];
            gameHandler.removeObj(obj);
            for (var derefName of dereferencedChanges[derefId]) {
              if (derefName != "empty")
                gameHandler.makeNewObjectFromOld(obj, derefName, derefName == "text");
            }
          }
        }
        if (rerunAdjs) {
          applyAdjectives();
        }
    },
    getConditionalNouns: function(nouns, actors, isIndex) {
        var actorChar = getCharFromActor(actors[isIndex-1]),
            reverseInd = 1,
            notted = false;
        while (actorChar != "n") {
            reverseInd++;
            actorChar = getCharFromActor(actors[isIndex - reverseInd]);
        }
        if (isIndex - reverseInd > 0) {
            reverseInd++;
            var thisActor = actors[isIndex - reverseInd];
            while (thisActor.name == "not") {
                notted = !notted;
                reverseInd++;
                if (isIndex - reverseInd <0)
                    break;
                thisActor = actors[isIndex - reverseInd];
            }
        }
        if (notted) {
            var ret = [];
            for (var key in nouns){
                ret.push(nouns[key]);
            }
            return ret; // TODO: baba and not baba on flag is push. This would erroneously select baba as a conditional noun
        } else {
            return [nouns[actors[isIndex - reverseInd].name]];
        }
    },
    addEqualityToDerefChanges: function(actors, dereferencedChanges) {
        if (~isHandler.runningChangeless.indexOf(actors[0].name) ||
            isHandler.runningNEqualities.filter(n=>n[0].name == actors[0].name && n[3] == actors[2]).length>0) {
            return;
        }
        if (actors[0].name == "empty") {
            for (var x = 0; x < gamestate.size.x; x++) {
                for (var y = 0; y < gamestate.size.y; y++) {
                    for (var z = 0; z < gamestate.size.z; z++) {
                        var locKey = JSON.stringify({ x: x, y: y, z: z });
                        var others = findAtPosition(x, y, z);
                        if (others.length == 0) {
                            dereferencedChanges[locKey] = dereferencedChanges[locKey] || [];
                            dereferencedChanges[locKey].push(actors[2]);
                        }
                    }
                }
            }
        } else {
            var filteredObjs = gamestate.objects.filter(o => o.name == actors[0].name);// allThings?
            if (actors[0].name == "all") {
                filteredObjs = gamestate.objects;
            }
            else if (actors[0].name == "level") {
                filteredObjs = allThings;
            }
            else if (actors[0].name == "text") {
                filteredObjs = gamestate.words;
            }
            filteredObjs = filterByCondition(actors, filteredObjs);
            for (var obj of filteredObjs) {
                dereferencedChanges[obj.id] = dereferencedChanges[obj.id] || [];
                dereferencedChanges[obj.id].push(actors[2]);
            }
        }
    },
    addRightNoun: function (actorName, has, notted, rightHas, rightNNouns, rightNouns) {
        if (has) {
            has = false;
            rightHas[actorName] = true;
        } else {
            if (notted)
                rightNNouns[actorName] = true;
            else
                rightNouns[actorName] = true;
        }
        return has;
    },
    addRightAdj: function(actorName, notted, rightAdjs, rightNAdjs) {
        if (notted)
            rightNAdjs[actorName] = true;
        else
            rightAdjs[actorName] = true;
    },
    addRightBuildWordIfRequired: function(buildWord, has, notted, rightHas, rightNNouns, rightNouns, rightAdjs, rightNAdjs) {
        if (buildWord.length > 0) {
            if (~wordMasks['a'].indexOf(buildWord)) {
                this.addRightAdj(buildWord, notted,rightAdjs, rightNAdjs);
            } else if (~wordMasks['n'].indexOf(buildWord)) {
                this.addRightNoun(buildWord, has, notted, rightHas, rightNNouns, rightNouns);
            }
        }
    }
}
function addBuiltWordIfRequired(word, nounList, notted, lonely) {
    if (word.length > 0) {
        addActorsToList({name: word}, nounList, notted, lonely);
    }
}
