var runningEqualities = [],
    runningChangeless = [],
    runningAdjectives = [],
    runningNAdjectives = [],
    runningNEqualities = [];
window.isRule = {
    execute: function (actors, dir) {
        var leftNouns = {},
            rightNouns = {},
            rightAdjs = {},
            rightNNouns = {},
            rightHas = {},
            rightNAdjs = {},
            isIndex = 0,
            notted = false,
            has = false;
        for (isIndex = 0; isIndex < actors.length; isIndex++) {
            var curActor = actors[isIndex];
            if (curActor.name == "is") {
                break;
            }
            else if (curActor.name == "on") {
                isIndex++;
                curActor = actors[isIndex];
                var conditionalNoun = leftNouns[actors[isIndex - 2].name];
                conditionalNoun.condition = conditionalNoun.condition || { on: [], facing: [] };
                conditionalNoun.condition.on.push(curActor.name);
            }
            else if (curActor.name == "not") {
                notted = !notted;
            } else if (curActor.name == "and") {
                continue;
            } else {
                addActorsToList(curActor, leftNouns, notted);
                notted = false;
            }
        }
        for (var i = isIndex + 1; i < actors.length; i++) {
            var curActor = actors[i];
            if (curActor.name == "is") { // Left here in case of off by one error?
                break;
            }
            else if (curActor.name == "not") {
                notted = !notted;
            } else if (curActor.name == "has") {
                has = true;
            } else if (curActor.name == "and") {
                continue;
            } else {
                if (getCharFromActor(curActor) == "n") {
                    if (has) {
                        has = false;
                        rightHas[curActor.name] = true;
                    } else {
                        if (notted)
                            rightNNouns[curActor.name] = true;
                        else
                            rightNouns[curActor.name] = true;
                    }
                } else if (getCharFromActor(curActor) == "a") {
                    if (notted)
                        rightNAdjs[curActor.name] = true;
                    else
                        rightAdjs[curActor.name] = true;

                }
                notted = false;
            }
        }
        for (var leftN in leftNouns) {
            for (var rightA in rightAdjs) {
                runningAdjectives.push([leftNouns[leftN], "is", rightA]);
            }
            for (var rightNA in rightNAdjs) {
                runningNAdjectives.push([leftNouns[leftN], "is", "not", rightNA]);
            }
            for (var rightN in rightNouns) {
                if (leftN == rightN)
                    runningChangeless.push(leftN);
                else
                    runningEqualities.push([leftNouns[leftN], "is", rightN]);
            }
            for (var rightNN in rightNNouns) {
                runningNEqualities.push([leftNouns[leftN], "is", "not", rightNN]);
            }
            for (var rightH in rightHas) {
                runningHas.push([leftNouns[leftN], "has", rightH]);
            }
        }
        executeBase(actors);
    },
    reset: function () {
        runningEqualities = [];
        runningChangeless = [];
        runningAdjectives = [];
        runningNAdjectives = [];
        runningNEqualities = [];
    },
    apply: function () {
        this.applyChanges();
        applyAdjectives();
    },
    applyChanges() {
        var allThings = gamestate.objects.concat(gamestate.words);
        var dereferencedChanges = {};
        for (var actors of runningEqualities) {
          if (~runningChangeless.indexOf(actors[0].name) ||
            runningNEqualities.filter(n=>n[0].name == actors[0].name && n[3] == actors[2]).length>0) {
            continue;
          }
          if (actors[0].name == "empty") {
            for (var x = 0; x < gamestate.size.x; x ++) {
              for (var y = 0; y < gamestate.size.y; y ++) {
                for (var z = 0; z < gamestate.size.z; z ++) {
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
            var filteredObjs = gamestate.objects.filter(o=>o.name == actors[0].name);// allThings?
            if (actors[0].name == "text") {
              filteredObjs = gamestate.words;
            }
            filteredObjs = filterByCondition(actors, filteredObjs);
            for (var obj of filteredObjs) {
              dereferencedChanges[obj.id] = dereferencedChanges[obj.id] || []; 
              dereferencedChanges[obj.id].push(actors[2]);
            }
          }
        }
        var rerunAdjs = false;
        for(var derefId in dereferencedChanges) {
          rerunAdjs = true;
          if (derefId.startsWith("{")) {
            var locKey = JSON.parse(derefId);
            for (var derefName of dereferencedChanges[derefId]) {
              if (derefName != "empty")
                makeNewObjectFromOld(locKey, derefName, derefName == "text");
            }
          } else {
            var obj = allThings.filter(o=>o.id == derefId)[0];
            removeObj(obj);
            for (var derefName of dereferencedChanges[derefId]) {
              if (derefName != "empty")
                makeNewObjectFromOld(obj, derefName, derefName == "text");
            }
          }
        }
        if (rerunAdjs) {
          applyAdjectives();
        }
    }
}