var runningHas = [];
window.hasRule = {
    execute: function (actors, dir) {
        var leftNouns = {},
            rightNouns = {},
            hasIndex = 0,
            notted = false;
        for (hasIndex = 0; hasIndex < actors.length; hasIndex++) {
            var curActor = actors[hasIndex];
            if (curActor.name == "has") {
                break;
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
        for (var i = hasIndex + 1; i < actors.length; i++) {
            var curActor = actors[i];
            if (curActor.name == "has") { // Left here in case of off by one error?
                break;
            }
            else if (curActor.name == "not") {
                notted = !notted;
            } else if (curActor.name == "and") {
                continue;
            } else {
                if (getCharFromActor(curActor) == "n") {
                    addActorsToList(curActor, rightNouns, notted);
                    notted = false;
                }
            }
        }
        for (var leftN in leftNouns) {
            for (var rightN in rightNouns) {
                runningHas.push([leftN, "has", rightN]);
            }
        }
        executeBase(actors);
    },
    reset: function () {
        runningHas = [];
    },
    apply: function () {
        for (var actors of runningHas) {
            var hases = gamestate.objects.filter(o => o.name == actors[0]);
            if (actors[0] == "text") {
                hases = gamestate.words;
            }
            else if (actors[0] == "all") {
                hases = gamestate.objects;
            }
            hases.forEach(o => {
                o.has = o.has || [];
                o.has.push(actors[2]);
            });
            if (actors[0] == "empty") {
                gamestate.empty.has = gamestate.empty.has || [];
                gamestate.empty.has.push(actors[2]);
            }
        }
    }
}