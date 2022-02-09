function runAdjectiveStep(obj) {
    if (obj.shut) {
        var objsAtPos = findAtPosition(obj.x, obj.y, obj.z);
        if (objsAtPos.filter(o => o.open && o.float == obj.float).length > 0) {
            removeObj(obj);
            removeObj(objsAtPos[0]);
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
            removeObj(obj);
            removeObj(sinking);
        }
    }
    if (obj.weak) {
        var objsAtPos = findAtPosition(obj.x, obj.y, obj.z).filter(o => o.id != obj.id);
        if (objsAtPos.length > 0) {
            removeObj(obj);
            for (var other of objsAtPos) {
                if (other.weak) {
                    removeObj(other);
                }
            }
            return;
        }
    }
    if (obj.more) {
        makeInDirection({ x: - 1, y: 0, z: 0 }, obj, ~gamestate.words.indexOf(obj));
        makeInDirection({ x: 0, y: 1, z: 0 }, obj, ~gamestate.words.indexOf(obj));
        makeInDirection({ x: 0, y: - 1, z: 0 }, obj, ~gamestate.words.indexOf(obj));
        makeInDirection({ x: 1, y: 0, z: 0 }, obj, ~gamestate.words.indexOf(obj));
    }
    if (obj.defeat) {
        var objsAtPos = findAtPosition(obj.x, obj.y, obj.z);
        for (var defeated of objsAtPos) {
            if (defeated.you && obj.float == defeated.float)
                removeObj(defeated);
        }
    }
    if (obj.hot) {
        var objsAtPos = findAtPosition(obj.x, obj.y, obj.z);
        for (var melted of objsAtPos) {
            if (melted.melt && obj.float == melted.float)
                removeObj(melted);
        }
    }
    if (obj.drop) {
        var dir = { x: 0, y: 0, z: -1 };
        while (!findIsStop(dir, obj.x, obj.y, obj.z)) {
            move(obj, dir);
        }
    }
    if (obj.fall) {
        var newPositionObjs = findAtPosition(obj.x, obj.y + 1, obj.z).filter(o => o.push || o.stop);
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
            if (!teled.teled && teled.float == obj.float) {
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
            triggerWin(obj);
        }
    }
}
function makeInDirection(dir, obj, isWord) {
    if (findAtPosition(obj.x+dir.x, obj.y+dir.y, obj.z+dir.z).filter(o => o.name == obj.name || o.stop || o.push || o.pull).length == 0
        && !isOutside(obj.x+dir.x, obj.y+dir.y, obj.z+dir.z)) {
        var newObj = clone(obj);
        gamestate.objects.push(newObj);
        makeThing($("#gamebody"), newObj, null, null, null, "id"+globalId++, !isWord);
        newObj.x += dir.x;
        newObj.y += dir.y;
        newObj.z += dir.z;
        updateObjPosition(newObj, dir);
    }
}

function applyAdjectives() {
    for (var actors of runningAdjectives) {
        if (runningNAdjectives.filter(n => n[0].name == actors[0].name && n[3] == actors[2]).length > 0) {
            continue;
        }
        executeAdjectiveImpl(actors);
    }
}
function executeAdjectiveImpl(actors) {
    var nouns = gamestate.objects.filter(o => o.name == actors[0].name);
    if (actors[0].name == "text") {
        nouns = gamestate.words;
    }
    else if (actors[0].name == "all") {
        nouns = gamestate.objects;
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

function removeAllAdjectives(gs, dontRemoveTextClasses) {
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
function removeAdjectives(obj) {
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
function removeWordAdjectives(allSentences) {
    var wordSentences = allSentences.filter(s => s[2].name == "word").map(s => s[0].name);
    for (var obj of gamestate.objects) {
        if (!(~wordSentences.indexOf(obj.name))) {
            var objdom = $("#" + obj.id);
            delete obj["word"];
            objdom.removeClass("word");
        }
    }
}