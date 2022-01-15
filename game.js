
var gamestate = {
    words:[],
    objects:[],
    levelId:1,
    size: {x: 24, y: 18, z: 1}
},globalId = 1;
window.selectedObj = {};
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
  $("#nextlevellink").attr("href",window.location.pathname +"?levelid="+findLevelByIndex(communityLevelId, 1));
  $("#prevlevellink").attr("href",window.location.pathname +"?levelid="+findLevelByIndex(communityLevelId, -1));
  
  $("body").keydown(function (event) {
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
      executeRules();
      updateRuleUI();
    } else if (event.keyCode == 90) {
      undo();
    }
  });
  window.setInterval(function () {
    for (var obj of gamestate.objects) {
      if (obj.win) {
        particle(obj, "yellow", 2, 0.07);
      }
    }
  }, 700);
}
function findLevelByIndex(levelid, adder) {
  var worlds = window.worlds;
  var joinedLevels = [];
  for (var worldname in worlds) {
    joinedLevels = joinedLevels.concat(worlds[worldname]);
  }
  return joinedLevels[joinedLevels.indexOf(levelid) + adder];
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
async function loadCommunityLevel(communityLevelId) {
  var comgamestate = await netService.getGameState(communityLevelId);
  window.gamestate = comgamestate;
  comgamestate.levelId = communityLevelId;
  setWindowSize();
  drawGameState();
}
function setWindowSize() {
  var width = $('#gamebody').width(),
      height = $("#gamebody").height();
  if (gamestate.size.z > 1) {
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
  if(dir.x==1) return "r";
  if(dir.x==-1) return "l";
  if(dir.y==1) return "d";
  if(dir.y==-1) return "u";
  if(dir.z==-1) return "i";
  if(dir.z==-1) return "o";
}
function changeObj(obj, newName) {
  var objdiv = $("#"+obj.id);
  objdiv.removeClass(obj.name);
  objdiv.addClass(newName);
  obj.name = newName;
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
      var newObj = deepClone(obj);
      removeAdjectives(newObj);
      newObj.name = h;
      gamestate.objects.push(newObj);
      obj.dir = obj.dir || "r";
      makeThing($("#gamebody"), newObj, null, null, null, "id"+globalId++, true);
    }
    applyAdjectives();
  } 
  particle(obj, "#733", 10, 0.1);
}
function makeGameState(level) {
    if (window.leveldata) {
      gamestate = window.leveldata;
    } 
    gamestate.levelId=level;
    gamestate.size.z = gamestate.size.z || 1;
}
function findAtPosition(i, j, k, excludeObjects) {
  var ret = [];
  if (!excludeObjects) {
    for(var obj of gamestate.objects) {
      if (obj.x == i && obj.y == j && obj.z == k)
        ret.push(obj);
    }
  }
  for(var obj of gamestate.words) {
    if (obj.x == i && obj.y == j && obj.z == k)
      ret.push(obj);
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
}
function makeThing(parent, thing, gridx, gridy, gridz, globalId, isObject) {
  if (!gridx) {
    var width = parent.width(),
    height = parent.height();
    gridx = width / gamestate.size.x / gamestate.size.z;
    gridy = height / gamestate.size.y;
    gridz = width / gamestate.size.z;
  }
  var displayClass = isObject ? thing.name : "word " + thing.name+"word";
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
function moveYou(dir) {
  var yous = gamestate.objects.filter(o => o.you);
  if (yous.length > 0) {
    undoStack.push(JSON.stringify(gamestate));
    $(".gridline").css("outline","1px solid #111");
    for(var obj of yous) {
      particle(obj, "white", 1, 0.01);
      move(obj, dir);
      if(gamestate.size.z > 1){
        $(".gridline.gridx"+obj.x).css("outline","1px solid #522");
        $(".gridline.gridy"+obj.y).css("outline","1px solid #522");
      }
    }
    executeRules();
    updateRuleUI();
  }
}
function move(gameobj,dir) {

  var newPositionObjs = findAtPosition(gameobj.x + dir.x, gameobj.y + dir.y, gameobj.z + dir.z),
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
  else if(findIsStop(dir, gameobj.x, gameobj.y, gameobj.z, findStopChain)) {
    if (gameobj.move) {
      reverseDir(gameobj);
    }
    for (var i = findStopChain.length - 1; i >= 0; i--) {
      var find = findStopChain[i];
      if (find.weak) {
        removeObj(find);
      }
    }
    return false;
  }

  newPositionObjs = findAtPosition(gameobj.x + dir.x, gameobj.y + dir.y, gameobj.z + dir.z);
  var cantMove = false;
  for(var pushObj of newPositionObjs) {
    if (isStop(pushObj) && !pushObj.you && !pushObj.push){
      return false;
    }
    if (canPush(pushObj) ) {
      cantMove = cantMove || move(pushObj, dir);
    }
  }
  if(cantMove)
    return false;
  var behindPositionObjs = findAtPosition(gameobj.x - dir.x, gameobj.y - dir.y, gameobj.z - dir.z);
  gameobj.x += dir.x;
  gameobj.y += dir.y;
  gameobj.z += dir.z;
  updateObjPosition(gameobj, dir);
  for(var beh of behindPositionObjs) {
    if (beh.pull) {
      move(beh, dir);
    }
  }
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
function findIsStop(dir, x, y, z, findChain) {
  if (isOutside(x+dir.x, y+dir.y, z + dir.z)) {
    return true;
  }
  var nextObjs = findAtPosition(x + dir.x, y + dir.y, z + dir.z);
  if(nextObjs.length == 0) return false;
  for (var obj of nextObjs) {
    findChain && findChain.push(obj);
    if (obj.push || (obj.you && obj.stop)) return findIsStop(dir, x + dir.x, y + dir.y, z + dir.z);
    if (obj.stop && !obj.you && !obj.shut) return true; // TODO: shut weirdness?
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
  return obj.stop;
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
  if(dir.x == -1) { obj.addClass("l"); }
  else if (dir.x == 1) { obj.addClass("r"); }
  else if (dir.y == -1) { obj.addClass("u"); }
  else if (dir.y == 1) { obj.addClass("d"); }
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
function updateRuleUI() {
  var body = get("ruleUI");
  body.innerHTML = "";
  var simple = convertRulesToSimple(allSentences);
  for (var rule of simple) {
    make("span", body).innerHTML = rule + "<br/>";
  }
}