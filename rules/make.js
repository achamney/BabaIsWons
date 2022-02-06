var runningMake = [];
window.makeRule = {
    execute: function (actors, dir) {
        var leftNouns = {},
            rightNouns = {},
            makeIndex = 0,
            notted = false;
        for (makeIndex = 0; makeIndex < actors.length; makeIndex++) {
            var curActor = actors[makeIndex];
            if (curActor.name == "make") {
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
        for (var i = makeIndex + 1; i < actors.length; i++) {
            var curActor = actors[i];
            if (curActor.name == "make") { // Left here in case of off by one error?
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
                runningMake.push([leftN, "make", rightN]);
            }
        }
        executeBase(actors);
    },
    reset: function () {
        runningMake = [];
    },
    apply: function () {
        for (var actors of runningMake) {
            var makes = gamestate.objects.filter(o => o.name == actors[0]);
            if (actors[0] == "text") {
                makes = gamestate.words;
            }
            makes.forEach(o => {
                if (findAtPosition(o.x, o.y, o.z).filter(other => other.name == actors[2]).length == 0) {
                    makeNewObjectFromOld(o, actors[2], actors[0] == "text");
                }
            })
        }
    }
}