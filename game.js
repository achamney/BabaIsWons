// TODO: pull stack?, x is y is z
var gamestate = {
    words:[],
    objects:[],
    levelId:1,
    size: {x: 24, y: 18, z: 1},
    solution: [],
    group:[]
},globalId = 1;
window.selectedObj = {};
window.movesToExecute = []; 
window.onload = function () {

  var urlParams = new URLSearchParams(window.location.search);
  var levelnum = Math.floor(urlParams.get("level"));
  var communityLevelId = urlParams.get("levelid");
  if (levelnum) {
    loadPremadeLevel(levelnum);
  } else if (communityLevelId) {
    loadCommunityLevel(communityLevelId);
    levelnum = 1;
  } else {
    $(".modal").show().css("opacity",1);
    setWindowSize();
  }
  $("#nextlevellink").click(e=>{loadLevel(findLevelByIndex(gamestate.levelId, 1)); e.preventDefault();return false;});
  $("#prevlevellink").click(e=>{loadLevel(findLevelByIndex(gamestate.levelId, -1)); e.preventDefault();return false;});
  $(".close").click(function() {$(".modal").hide().css("opacity",0);})
  $("#worldselect").click(function() {$(".modal").show().css("opacity",1);});
  $(".ctlleft")[0].addEventListener('touchstart',function (e) { e.preventDefault(); moveYou({ x: -1, y: 0, z: 0 }); },false);
  $(".ctlright")[0].addEventListener('touchstart',function (e) { e.preventDefault(); moveYou({ x: 1, y: 0, z: 0 }); },false);
  $(".ctlup")[0].addEventListener('touchstart',function (e) { e.preventDefault(); moveYou({ x: 0, y: -1, z: 0 }); },false);
  $(".ctldown")[0].addEventListener('touchstart',function (e) { e.preventDefault(); moveYou({ x: 0, y: 1, z: 0 }); },false);
  $(".ctlspace")[0].addEventListener('touchstart',function (e){ e.preventDefault(); gamewait(); },false);
  $(".ctlz")[0].addEventListener('touchstart',function (e) { e.preventDefault(); undo(); },false);
  
  $("body").keydown(function (event) {
    pressKey(event);
  });
  window.setInterval(function () {
    for (var obj of gamestate.objects) {
      if (obj.win) {
        particle(obj, "yellow", 2, 0.07);
      }
      if (obj.tele) {
        particle(obj, "teal", 2, 0.07);
      }
    }
  }, 700);
}
window.pressKey = function(event) {
  gamestate.solution.push(event.keyCode);
  if (event.keyCode == 37) {
    moveYou({ x: -1, y: 0, z: 0 });
  }
  else if (event.keyCode == 39) {
    moveYou({ x: 1, y: 0, z: 0 });
  }
  else if (event.keyCode == 38) {
    moveYou({ x: 0, y: -1, z: 0 });
  }
  else if (event.keyCode == 40) {
    moveYou({ x: 0, y: 1, z: 0 });
  } else if (event.keyCode == 87) {
    moveYou({ x: 0, y: 0, z: 1 });
  } else if (event.keyCode == 83) {
    moveYou({ x: 0, y: 0, z: -1 });
  } else if (event.keyCode == 32) {
    gamewait();
  } else if (event.keyCode == 90) {
    undo();
  }
}
function gamewait() {
  window.movesToExecute = []; 
  executeRules(); 
  updateRuleUI();
}
async function triggerWin(obj) {
  var solution = clone(gamestate.solution);
  particle(obj, "yellow", 100, 0.3);
  playSfx("win");
  var origGameState = await netService.getGameState(gamestate.levelId);
  origGameState.solution = solution;
  await netService.setGameState(origGameState, gamestate.levelId);
  window.setTimeout(function () {
    loadLevel(findLevelByIndex(gamestate.levelId, 1));
  }, 1500);
}
function findLevelByIndex(levelid, adder) {
  var worlds = window.worlds;
  var joinedLevels = [];
  for (var worldname in worlds) {
    joinedLevels = joinedLevels.concat(worlds[worldname]);
  }
  return joinedLevels[joinedLevels.indexOf(levelid) + adder];
}
async function tmp() {
  var worlds = window.worlds;
  var joinedLevels = [];
  for (var worldname in worlds) {
    joinedLevels = joinedLevels.concat(worlds[worldname]);
  }

  var backup = [];
  for (var lvl of joinedLevels) {
    var ret = await netService.getGameState(lvl);
    backup.push(ret);

  }
  var file = new Blob(["window.leveldata="+JSON.stringify(backup)], {type: "text"});
    
  var a = document.createElement("a"),
          url = URL.createObjectURL(file);
  a.href = url;
  a.download = "levelbackup.js";
  document.body.appendChild(a);
  a.click();
  setTimeout(function() {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);  
  }, 0); 
}
function loadPremadeLevel(levelnum) {
  var levelTag = document.createElement("script");
  levelTag.type="text/javascript";
  levelTag.onload = function() {
    makeGameState(levelnum || 1);
    setWindowSize();
    drawGameState();
  };
  levelTag.src=`levels/level${levelnum}.js`;
  $("head")[0].appendChild(levelTag);
}
function loadAudio(levelId) {
  var audio = $("audio")[0];
  var src = $("audio source").attr("src");
  for (var lvl in window.worlds) {
    if (~window.worlds[lvl].indexOf(levelId) && window.audioMapping[lvl] != src) { 
      $("audio source").attr("src", window.audioMapping[lvl]);
      audio.load();
      window.audioLoaded = false;
    }
  }
  if(!window.audioLoaded) {
    window.audioLoaded = true;
    audio.volume=0.66;
    audio.play();
  }
}
function loadLevel(levelId) {
  var refresh = window.location.protocol + "//" + window.location.host + window.location.pathname + '?levelid='+levelId;    
  window.history.pushState({ path: refresh }, '', refresh);
  loadAudio(levelId);
  loadCommunityLevel(levelId);
  $(".modal").hide().css("opacity",0);
}
async function loadCommunityLevel(communityLevelId) {
  var comgamestate = await netService.getGameState(communityLevelId);
  window.gamestate = comgamestate;
  comgamestate.levelId = communityLevelId;
  initGameState(comgamestate);
  setWindowSize();
  drawGameState();
  
  for (var lvl in window.worlds) {
    if (~window.worlds[lvl].indexOf(communityLevelId)) { 
      $("#gamebody").css("background-color",window.colorMapping[lvl])
    }
  }
}
function setWindowSize() {
  var width = $('#gamebody').width(),
      height = $("#gamebody").height();
  if (gamestate.size.z > 1 || width < height) {
    $('#gamebody').css("height", width * 18 / (30 * gamestate.size.z));
  } else {
    $('#gamebody').css("width", height * 30 / 18);
  }
}
function getDirCoordsFromDir(obj) {
  if(obj.dir=="r") return {x:1,y:0,z:0};
  else if(obj.dir=="l") return {x:-1,y:0,z:0};
  else if(obj.dir=="u") return {x:0,y:-1,z:0};
  else if(obj.dir=="d") return {x:0,y:1,z:0};
  else return {x:0,y:1,z:0};
}
function coordDirToText(dir) {
  if(dir.x>0) return "r";
  if(dir.x<0) return "l";
  if(dir.y>0) return "d";
  if(dir.y<0) return "u";
  if(dir.z<0) return "i";
  if(dir.z>0) return "o";
}
function changeObj(obj, newName) {
  var objdiv = $("#"+obj.id);
  objdiv.removeClass(obj.name);
  objdiv.addClass(newName);
  obj.name = newName;
}
function changeToText(obj) {
  removeObj(obj)
  var newObj = deepClone(obj);
  removeAdjectives(newObj);
  gamestate.words.push(newObj);
  makeThing($("#gamebody"), newObj, null, null, null, "id"+globalId++, false);
}
function removeObj(obj) {
  for (var i=gamestate.objects.length-1;i>=0;i--) {
    if (gamestate.objects[i] == obj) {
      gamestate.objects.splice(i, 1);
    }
  }
  for (var i=gamestate.words.length-1;i>=0;i--) {
    if (gamestate.words[i] == obj) {
      gamestate.words.splice(i, 1);
    }
  }
  $("#"+obj.id).remove();
  if(obj.has) {
    for(var h of obj.has) {
      makeNewObjectFromOld(obj, h, h == "text");
    }
    applyAdjectives();
  } 
  particle(obj, "#733", 10, 0.1);
}
function makeNewObjectFromOld(oldObj, newName, isWord) {
  var newObj = deepClone(oldObj);
  removeAdjectives(newObj);
  if (isWord) {
    gamestate.words.push(newObj);
  } else {
    gamestate.objects.push(newObj);
    newObj.name = newName;
  }
  makeThing($("#gamebody"), newObj, null, null, null, "id"+globalId++, !isWord);
  return newObj;
}
function makeGameState(level) {
    if (window.leveldata) {
      gamestate = window.leveldata;
    } 
    gamestate.levelId=level;
    initGameState(gamestate);
}
function findAtPosition(i, j, k, excludeObjects, excludeText, lookForward) {
  var ret = [];
  var movedIds = movesToExecute.map(m=>m.obj.id);
  if (!excludeObjects) {
    for(var obj of gamestate.objects) {
      if (lookForward && ~movedIds.indexOf(obj.id)) {
        var moveInfo = movesToExecute.filter(m=>m.obj.id==obj.id)[0].dir;
        obj = {x: obj.x + moveInfo.x, y: obj.y + moveInfo.y, z: obj.z + moveInfo.z, name: obj.name};
      }
      if (obj.x == i && obj.y == j && obj.z == k)
        ret.push(obj);
    }
  }
  if(!excludeText) {
    var wordsAndWordAdj = gamestate.words.concat(gamestate.objects.filter(o => o.word));
    for(var obj of wordsAndWordAdj) {
      if (obj.x == i && obj.y == j && obj.z == k)
        ret.push(obj);
    }
  }
  return ret;
}
function drawGameState() {
  $("#levelname").val(gamestate.name).html(gamestate.name);
  var main = $("#gamebody");
  main[0].innerHTML = "";
  var width = main.width(),
    height = main.height(),
    gridx = width / gamestate.size.x / gamestate.size.z,
    gridy = height / gamestate.size.y,
    gridz = width / gamestate.size.z;
  globalId = 1;
  var runningLeft = gridz;
  for (var i = 0; i < gamestate.size.z - 1; i++) {
    makesq("div", main[0], "tier tier" + (i + 1), runningLeft, 0, width - runningLeft, height);
    runningLeft += gridz;
  }
  for (var j=0;j<gamestate.size.z;j++) {
    for (var i=0;i<gamestate.size.x;i++) {
      makesq("div", main[0], "gridline gridx"+i, i*gridx + j*gridz,0,gridx,height);
    }
  }
  for (var i=0;i<gamestate.size.y;i++) {
    makesq("div", main[0], "gridline gridy"+i, 0,i*gridy,width,gridy);
  }
  drawControlHints(main);
  for (var obj of gamestate.objects) {
    obj.dir = obj.dir || "r";
    makeThing(main, obj, gridx, gridy, gridz, "id"+globalId++, true);
  }
  for (var obj of gamestate.words) {
    makeThing(main, obj, gridx, gridy, gridz, "id"+globalId++, false);
  }
  executeRules();
  runDeferredMoves();
}
function makeThing(parent, thing, gridx, gridy, gridz, globalId, isObject) {
  if (!gridx) {
    var width = parent.width(),
    height = parent.height();
    gridx = width / gamestate.size.x / gamestate.size.z;
    gridy = height / gamestate.size.y;
    gridz = width / gamestate.size.z;
  }
  var displayClass = isObject ? thing.name : "gameword " + thing.name+"word";
  if (~wordMasks.a.indexOf(thing.name)) {
    displayClass += " action";
  }
  thing.z = thing.z || 0;
  var objdiv = makesq("div", parent[0], displayClass + " block "+thing.dir,
    (gridx * thing.x) + (thing.z * gridz) +"px",
    gridy * thing.y +"px",
    gridx+"px",
    gridy+"px");
  objdiv.id = globalId;
  thing.id = globalId;
  if (!isObject) {
    objdiv.innerHTML = thing.name;
    objdiv.style["font-size"] = fontMapping(gridx);
  }
  objdiv.gamedata = thing;
}
function runDeferredMoves(){
  for (var moveEx of movesToExecute) {

    moveEx.obj.x = moveEx.pos.x + moveEx.dir.x;
    moveEx.obj.y = moveEx.pos.y + moveEx.dir.y;
    moveEx.obj.z = moveEx.pos.z + moveEx.dir.z;
    updateObjPosition(moveEx.obj, moveEx.facing);
  }
  window.movesToExecute = [];
}
function playSfx(str) {
  window.sndcnt = window.sndcnt || {};
  sndcnt[str] = sndcnt[str] || 0;
  var snd = $("#" + str + sndcnt[str])[0];
  snd.volume = 0.66;
  sndcnt[str]++;
  if (sndcnt[str] == $("."+str+"snd").length)
    sndcnt[str] = 0;
  snd.play();
}
function moveYou(dir) {
  playSfx("walk");
  loadAudio(gamestate.levelId);
  var concatStuff = gamestate.objects.concat(gamestate.words);
  var yous = concatStuff.filter(o => o.you);
  undoStack.push(JSON.stringify(gamestate));
  window.movesToExecute = [];
  if(gamestate.empty.you) {
    var pushes = concatStuff.filter(c => c.push);
    for (var p of pushes) {
      var findEmpty = findAtPosition(p.x - dir.x, p.y - dir.y, p.z - dir.z);
      if (findEmpty.length == 0) {
        move(p, dir);
      }
    }
    runDeferredMoves();
    executeRules();
    runDeferredMoves();
    updateRuleUI();
  }
  if (yous.length > 0) {
    $(".gridline").css("outline","1px solid #111");
    for(var obj of yous) {
      if(move(obj, dir)) {
        particle(obj, "white", 1, 0.01);
      }
      if(gamestate.size.z > 1){
        $(".gridline.gridx"+obj.x).css("outline","1px solid #522");
        $(".gridline.gridy"+obj.y).css("outline","1px solid #522");
      }
    }
    runDeferredMoves();
    executeRules();
    runDeferredMoves();
    updateRuleUI();
  }
}
function move(gameobj,dir, cantPull, lookForward) {

  var newPositionObjs = findAtPosition(gameobj.x + dir.x, gameobj.y + dir.y, gameobj.z + dir.z, false, false, lookForward),
      findStopChain = [gameobj];
  if (checkIsLockAndKey(gameobj, newPositionObjs)) {
    return true;
  }
  if(gameobj.swap) {
    if (isOutside(gameobj.x+dir.x, gameobj.y+dir.y, gameobj.z + dir.z)) {
      if (gameobj.move) {
        reverseDir(gameobj);
      }
      return false;
    }
    for (var newPosObj of newPositionObjs) {
      newPosObj.x = gameobj.x;
      newPosObj.y = gameobj.y;
      newPosObj.z = gameobj.z;
      updateObjPosition(newPosObj, getDirCoordsFromDir(newPosObj));
    }
  }
  else if(findIsStop(dir, gameobj.x, gameobj.y, gameobj.z, findStopChain, lookForward)) {
    if (gameobj.move) {
      reverseDir(gameobj);
    }
    for (var i = findStopChain.length - 1; i >= 0; i--) {
      var find = findStopChain[i];
      if (find.weak) {
        removeObj(find);
        var other = findStopChain[i+1];
        if (other && other.weak) {
          removeObj(other);
        }
      }
    }
    return false;
  }

  newPositionObjs = findAtPosition(gameobj.x + dir.x, gameobj.y + dir.y, gameobj.z + dir.z, false, false, true);
  if (gamestate.empty.push && newPositionObjs.length == 0) {
    newPositionObjs.push({ x: gameobj.x + dir.x, y: gameobj.y + dir.y, z: gameobj.z + dir.z, push: true, empty: true });
  }
  for(var pushObj of newPositionObjs) {
    if (canPush(pushObj) /*&& !pushObj.you*/ && !pushObj.swap) { // TODO: make a move stack rather than assuming its you that instigated the push action
      move(pushObj, dir, true);
    }
    if (pushObj.swap) {
      pushObj.x = gameobj.x;
      pushObj.y = gameobj.y;
      pushObj.z = gameobj.z;
      updateObjPosition(pushObj, getDirCoordsFromDir(pushObj));
    }
  }
  var behindPositionObjs = findAtPosition(gameobj.x - dir.x, gameobj.y - dir.y, gameobj.z - dir.z);
  if (gamestate.empty.pull && behindPositionObjs.length == 0) {
    behindPositionObjs.push({ x: gameobj.x - dir.x, y: gameobj.y - dir.y, z: gameobj.z - dir.z, pull: true, empty: true });
  }
  window.movesToExecute.push({obj: gameobj, dir: dir, pos: deepClone(gameobj), facing: dir});
  if (gamestate.empty.open && newPositionObjs.length == 0 && gameobj.shut) {
    removeObj(gameobj);
    gamestate.empty.has && gamestate.empty.has.forEach(h=>{
      makeNewObjectFromOld(gameobj, h, h == "text");
    }) 
  }
  !cantPull && pullChain(behindPositionObjs, dir);
  return true;
}
function pullChain(list, dir) {
  var behindPositionObjs = [];
  for(var beh of list) {
    if (beh.pull) {
      move(beh, dir, false, true);
    }
  }
  behindPositionObjs.length > 0 && pullChain(behindPositionObjs, dir);
}
function reverseDir(obj) {
  if (obj.dir == "r") obj.dir = "l";
  else if (obj.dir == "l") obj.dir = "r";
  else if (obj.dir == "u") obj.dir = "d";
  else if (obj.dir == "d") obj.dir = "u";
}
function updateObjPosition(obj, dir) {
  var main = $("#gamebody"),
      width = $(main).width(),
      height = $(main).height(),
      gridx = width / gamestate.size.x / gamestate.size.z,
      gridy = height / gamestate.size.y;
  var objdiv = $("#"+obj.id);
  if(dir.x != 0 || dir.y != 0) {
    redoDirections(objdiv, dir);
  }
  obj.dir = coordDirToText(dir);
  objdiv.css("left", (obj.x * gridx) + (obj.z * width / gamestate.size.z)+"px");
  objdiv.css("top", obj.y * gridy+"px");
}
function findIsStop(dir, x, y, z, findChain, lookForward) {
  if (isOutside(x+dir.x, y+dir.y, z + dir.z)) {
    return true;
  }
  var nextObjs = findAtPosition(x + dir.x, y + dir.y, z + dir.z, false, false, lookForward);
  if (gamestate.empty.push && nextObjs.length == 0) {
    nextObjs.push({ x: x + dir.x, y: y + dir.y, z: z + dir.z, push: true });
  }
  if (gamestate.empty.pull && nextObjs.length == 0 && !findChain[findChain.length-1].empty && !lookForward) {
    return true;
  }
  if(nextObjs.length == 0) return false;
  for (var obj of nextObjs) {
    findChain && findChain.push(obj);
    if (obj.push || (obj.you && obj.stop)) return findIsStop(dir, x + dir.x, y + dir.y, z + dir.z, findChain);
    if ((obj.stop || obj.pull) && !obj.you && !(obj.shut && findChain[findChain.length-2].open)) return true; // TODO: shut weirdness?
  }
  return false;
}
function isOutside(x,y,z) {
  if(x<0 || y<0 ||x >= gamestate.size.x || y >= gamestate.size.y 
    || z<0  || z >= gamestate.size.z){
    return true;
  }
  return false;
}
function isStop(obj) {
  return obj.stop || obj.pull;
}
function canPush(obj) {
  if(obj.push)
    return true;
  return false;
}
function redoDirections(obj, dir) {
  obj.removeClass("l");
  obj.removeClass("r");
  obj.removeClass("u");
  obj.removeClass("d");
  if(dir.x < 0) { obj.addClass("l"); }
  else if (dir.x > 0) { obj.addClass("r"); }
  else if (dir.y < 0) { obj.addClass("u"); }
  else if (dir.y > 0) { obj.addClass("d"); }
}
function fontMapping(gridx) {
  return gridx/2.7+"px";
}
function drawControlHints(main) {
  if (gamestate.levelId >= 18 && gamestate.levelId <= 21) {
    makesq("h2", main[0], "controlInfo", 10, 0).innerHTML = "{ Press W and S to navigate between planes }";
  }
  else if (gamestate.levelId >= 1 && gamestate.levelId <= 1) {
    makesq("h2", main[0], "controlInfo", 10, 0).innerHTML = "{ Press &#8592; &#8593; &#8594; &#8595; to move }";
  }
  else if (gamestate.levelId >= 4 && gamestate.levelId <= 4) {
    makesq("h2", main[0], "controlInfo", 10, 0).innerHTML = "{ Press Z to undo }";
  }
  else if (gamestate.levelId >= 11 && gamestate.levelId <= 11) {
    makesq("h2", main[0], "controlInfo", 10, 0).innerHTML = "{ Press Space Bar to wait }";
  }
}
function runSolution(ind) {
  ind = ind || 0;
  window.pressKey({keyCode:savedSolution[ind]});
  window.setTimeout(()=>{runSolution(ind+1);}, 300);
}
function updateRuleUI() {
  var body = $("#ruleUI");
  body.html("");
  var simple = convertRulesToSimple(allSentences);
  for (var rule of simple) {
    $(`<span>${rule}</span><br/>`).appendTo(body);
  }
}
function initGameState(gs) {
  gs.empty = {};
  gs.size.z = gs.size.z || 1;
  window.savedSolution = gs.solution;
  gs.solution = [];
  gs.group = [];
}