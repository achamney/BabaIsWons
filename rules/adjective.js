import {wordMasks,physicalNouns,filterByCondition, isHandler} from './ruleService.js'
import {updateObjPosition, findAtPosition, isOutside, getDirCoordsFromDir} from '../gameService.js'
export function runAdjectiveStep(obj, gameHandler) {
    if (obj.shut) {
        var objsAtPos = findAtPosition(obj.x, obj.y, obj.z);
        if (objsAtPos.filter(o => o.open && o.float == obj.float).length > 0) {
            gameHandler.removeObj(obj);
            gameHandler.removeObj(objsAtPos[0]);
        }
    }
    if (obj.up) { obj.dir = "u"; updateObjPosition(obj, getDirCoordsFromDir(obj)); }
    if (obj.down) { obj.dir = "d"; updateObjPosition(obj, getDirCoordsFromDir(obj)); }
    if (obj.left) { obj.dir = "l"; updateObjPosition(obj, getDirCoordsFromDir(obj)); }
    if (obj.right) { obj.dir = "r"; updateObjPosition(obj, getDirCoordsFromDir(obj)); }
    if (obj.sink) {
        var objsAtPos = findAtPosition(obj.x, obj.y, obj.z);
        for (var sinking of objsAtPos) {
            if (obj == sinking || obj.float != sinking.float) continue;
            gameHandler.removeObj(obj);
            gameHandler.removeObj(sinking);
        }
    }
    if (obj.weak) {
        var objsAtPos = findAtPosition(obj.x, obj.y, obj.z).filter(o => o.id != obj.id);
        if (objsAtPos.length > 0) {
            gameHandler.removeObj(obj);
            for (var other of objsAtPos) {
                if (other.weak) {
                    gameHandler.removeObj(other);
                }
            }
            return;
        }
    }
    if (obj.more) {
        makeInDirection({ x: - 1, y: 0, z: 0 }, obj, ~gamestate.words.indexOf(obj), gameHandler);
        makeInDirection({ x: 0, y: 1, z: 0 }, obj, ~gamestate.words.indexOf(obj), gameHandler);
        makeInDirection({ x: 0, y: - 1, z: 0 }, obj, ~gamestate.words.indexOf(obj), gameHandler);
        makeInDirection({ x: 1, y: 0, z: 0 }, obj, ~gamestate.words.indexOf(obj), gameHandler);
    }
    if (obj.defeat) {
        var objsAtPos = findAtPosition(obj.x, obj.y, obj.z);
        for (var defeated of objsAtPos) {
            if (defeated.you && obj.float == defeated.float)
                gameHandler.removeObj(defeated);
        }
    }
    if (obj.hot) {
        var objsAtPos = findAtPosition(obj.x, obj.y, obj.z);
        for (var melted of objsAtPos) {
            if (melted.melt && obj.float == melted.float)
                gameHandler.removeObj(melted);
        }
    }
    if (obj.drop) {
        var newPositionObjs = findAtPosition(obj.x, obj.y, obj.z - 1).filter(o => o.push || o.stop || o.pull);
        while (newPositionObjs.length == 0 && !isOutside(obj.x, obj.y, obj.z - 1)) {
            obj.z -= 1;
            updateObjPosition(obj, getDirCoordsFromDir(obj));
            newPositionObjs = findAtPosition(obj.x, obj.y, obj.z - 1).filter(o => o.push || o.stop);
        }
    }
    if (obj.fall) {
        var newPositionObjs = findAtPosition(obj.x, obj.y + 1, obj.z).filter(o => o.push || o.stop || o.pull);
        while (newPositionObjs.length == 0 && !isOutside(obj.x, obj.y + 1, obj.z)) {
            obj.y += 1;
            updateObjPosition(obj, getDirCoordsFromDir(obj));
            newPositionObjs = findAtPosition(obj.x, obj.y + 1, obj.z).filter(o => o.push || o.stop);
        }
    }
    if (obj.tele) {
        var objsAtPos = findAtPosition(obj.x, obj.y, obj.z).filter(o => o.id != obj.id);
        var otherTeles = gamestate.objects.filter(o => o.name == obj.name && o.id != obj.id);
        for (var teled of objsAtPos) {
            if (!teled.teled && teled.float == obj.float && otherTeles.length >= 1) {
                var otherTele = otherTeles[Math.floor(Math.random() * otherTeles.length)];
                teled.x = otherTele.x;
                teled.y = otherTele.y;
                teled.z = otherTele.z;
                updateObjPosition(teled, getDirCoordsFromDir(teled));
                teled.teled = true;
            }
        }
    }
    if (obj.win) {
        var objsAtPos = findAtPosition(obj.x, obj.y, obj.z);
        if (objsAtPos.filter(o => o.you && o.float == obj.float).length > 0) {
            gameHandler.triggerWin(obj);
        }
    }
}
function makeInDirection(dir, obj, isWord, gameHandler) {
    if (findAtPosition(obj.x+dir.x, obj.y+dir.y, obj.z+dir.z).filter(o => o.name == obj.name || o.stop || o.push || o.pull).length == 0
        && !isOutside(obj.x+dir.x, obj.y+dir.y, obj.z+dir.z)) {
        var newObj = clone(obj);
        gamestate.objects.push(newObj);
        gameHandler.makeThing($("#gamebody"), newObj, null, null, null, "id"+globalId++, !isWord);
        newObj.x += dir.x;
        newObj.y += dir.y;
        newObj.z += dir.z;
        updateObjPosition(newObj, dir);
    }
}

export function applyAdjectives() {
    var allThingNames = wordMasks.n;
    var allInGroup = isHandler.runningEqualities.filter(a => a[2] == "group").map(a => a[0].name).filter((w, i, self) => self.indexOf(w) === i); // get only unique noun names;
    for (var actors of isHandler.runningAdjectives) {
        if (actors[0].name == "group") {
            for (var noun of allInGroup) {
                executeAdjectiveImpl([{ name: noun }, "", actors[2]]);
            }
        } else if (actors[0].name == "level") {
            for (var noun of allThingNames) {
                executeAdjectiveImpl([{ name: noun }, "", actors[2]]);
            }
        }
        else if (actors[0].name == "all") {
            for (var noun of physicalNouns) {
                executeAdjectiveImpl([{ name: noun }, "", actors[2]]);
            }
        }
        else {
            executeAdjectiveImpl(actors);
        }
    }
}
function executeAdjectiveImpl(actors) {

    if (isHandler.runningNAdjectives.filter(n => n[0].name == actors[0].name && n[3] == actors[2]).length > 0) {
        return;
    }
    var nouns = gamestate.objects.filter(o => o.name == actors[0].name);

    if (actors[0].name == "text") {
        nouns = gamestate.words;
    }
    nouns = filterByCondition(actors, nouns);
    for (var noun of nouns) {
        noun[actors[2]] = true;
        $("#" + noun.id).addClass(actors[2]);
    }
    if (actors[0].name == "empty") {
        gamestate.empty[actors[2]] = true;
    }
}

export function removeAllAdjectives(gs, dontRemoveTextClasses) {
    for (var obj of gs.objects) {
        removeAdjectives(obj);
    }

    for (var word of gs.words) {
        removeAdjectives(word);
        if (!dontRemoveTextClasses)
            $("#" + word.id).removeClass("active");
    }
    gamestate.empty = {};
}
export function removeAdjectives(obj) {
    var objdom = $("#" + obj.id);
    for (var adjective of wordMasks.a) {
        if (adjective != "word") { // Word needs to be maintained till after rule processing
            delete obj[adjective];
            objdom.removeClass(adjective);
        }
    }
    delete obj.used;
    delete obj.has;
}
export function removeWordAdjectives(allSentences) {
    var wordSentences = allSentences.filter(s => s[2].name == "word").map(s => s[0].name);
    for (var obj of gamestate.objects) {
        if (!(~wordSentences.indexOf(obj.name))) {
            var objdom = $("#" + obj.id);
            delete obj["word"];
            objdom.removeClass("word");
        }
    }
}
