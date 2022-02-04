var won = false;
var successCallback = function(){
    won = true;
}
var numberOfTests;
$(document).ready(async function(){
    window.triggerWin = function () {
        successCallback();
    }
    var testBody = $("#testbody");
    var worlds = window.worlds;
    var joinedLevels = [];
    for (var worldname in worlds) {
      joinedLevels = joinedLevels.concat(worlds[worldname]);
    }
    numberOfTests = joinedLevels.length;
    var gamestates = [];
    for (var lvl of joinedLevels) {
        getLevel(gamestates, lvl, testBody);
    }
});
function getLevel(gamestates, lvl, testBody) {
    netService.getGameState(lvl).then((gs)=>{
        gs.levelId = lvl;
        testBody.append($(`<h3 id="${lvl}">${gs.name} : ${lvl}</h3>`));
        gamestates.push(gs);
        if (gamestates.length == numberOfTests) {
            runTests(gamestates);
        }
    });
}
function runTests(gamestates) {
        runOneTest(gamestates, 0);
}
function runOneTest(gamestates, index) {
    var gs = gamestates[index];
    var solution = gs.solution;
    if (!solution || !solution[0]) {
        //continue;
    } else {
        initGameState(gs);
        window.gamestate = gs;
        executeRules();
        runDeferredMoves();
        won = false;
        for (var s in solution) {
            window.pressKey({ keyCode: solution[s] });
        }
        if (won) {
            $("#" + gs.levelId).css("color", "green");
        } else {
            $("#" + gs.levelId).css("color", "red");
        }
    }
    if (index + 1 < gamestates.length) {
        window.setTimeout(() => { runOneTest(gamestates, index + 1) }, 500);
    }
}