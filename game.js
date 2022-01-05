
var gamestate = {
    words:[],
    objects:[],
    levelId:1,
    size: {x: 24, y: 18, z: 1}
};
var undoStack = [];
window.selectedObj = {};
window.onload = function () {

  var urlParams = window.location.href.split("?")[1];
  var levelnum = urlParams && Math.floor(urlParams.split("=")[1]);
  var levelTag = document.createElement("script");
  levelTag.type="text/javascript";
  levelTag.onload = function() {

    makeGameState(levelnum || 1);
    var width = $('#gamebody').width(),
      height = $("#gamebody").height();
    if (gamestate.size.z > 1) {
      $('#gamebody').css("height", width * 18 / (30 * gamestate.size.z));
    } else {
      $('#gamebody').css("width", height * 30 / 18);
    }
    drawGameState();
  };
  levelTag.src=`levels/level${levelnum}.js`;
  $("head")[0].appendChild(levelTag);
  $("#nextlevellink").attr("href",window.location.pathname +"?level="+(levelnum+1));

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
function undo() {
  if(undoStack.length == 0) return;
  var lastGameStateText = undoStack.pop(),
    lastGameState = JSON.parse(lastGameStateText);
  for(var obj of gamestate.objects) {
    var savedObj = lastGameState.objects.filter(o=>o.id==obj.id)[0];
    obj.x = savedObj.x;
    obj.y = savedObj.y;
    obj.z = savedObj.z;
    updateObjPosition(obj, getDirCoordsFromDir(savedObj));
    obj.name = savedObj.name;
  }
  var deletedObjs = lastGameState.objects.filter(o=>{
    var ret = true;
    for(var test of gamestate.objects){
      if(o.id==test.id)
        ret = false;
    }
    return ret;
  });
  for(var deleted of deletedObjs) {
    gamestate.objects.push(deleted);
  }
  for(var obj of gamestate.words) {
    var savedObj = lastGameState.words.filter(o=>o.id==obj.id)[0];
    obj.x = savedObj.x;
    obj.y = savedObj.y;
    obj.z = savedObj.z;
    updateObjPosition(obj, {x:1,y:0});
    obj.name = savedObj.name;
  }
  executeRules();
  if (deletedObjs.length > 0) {
    drawGameState();
  }
}
function getDirCoordsFromDir(obj) {
  if(obj.dir=="r") return {x:1,y:0};
  else if(obj.dir=="l") return {x:-1,y:0};
  else if(obj.dir=="u") return {x:0,y:-1};
  else if(obj.dir=="d") return {x:0,y:1};
  else return {x:0,y:1};
}
function coordDirToText(dir) {
  if(dir.x==1) return "r";
  if(dir.x==-1) return "l";
  if(dir.y==1) return "d";
  if(dir.y==-1) return "u";
}
function changeObj(obj, newName) {
  var objdiv = $("#"+obj.id);
  objdiv.removeClass(obj.name);
  objdiv.addClass(newName);
  obj.name = newName;
}
function removeObj(obj) {
  if(obj.has) {
    changeObj(obj, obj.has);
    removeAdjectives(obj);
  } else {
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
  var main = get("gamebody");
  main.innerHTML = "";
  var width = $(main).width(),
    height = $(main).height(),
    gridx = width / gamestate.size.x / gamestate.size.z,
    gridy = height / gamestate.size.y,
    gridz = width / gamestate.size.z,
    globalId = 1;
  var runningLeft = gridz;
  for (var i = 0; i < gamestate.size.z - 1; i++) {
    makesq("div", main, "tier tier" + (i + 1), runningLeft, 0, gridz, height);
    if (i == 0) {
      makesq("h2", main, "info3d", 10, 0).innerHTML = "{ Press W and S to navigate between planes }";
    }
    runningLeft += gridz;
  }
  for (var obj of gamestate.objects) {
    obj.dir = obj.dir || "r";
    makeThing(main, obj, gridx, gridy, gridz, globalId++, true);
  }
  for (var obj of gamestate.words) {
    makeThing(main, obj, gridx, gridy, gridz, globalId++, false);
  }
  executeRules();
}
function makeThing(parent, thing, gridx, gridy, gridz, globalId, isObject) {
  var displayClass = isObject ? thing.name : "word " + thing.name+"word";
  if (~wordMasks.a.indexOf(thing.name)) {
    displayClass += " action";
  }
  thing.z = thing.z || 0;
  var objdiv = makesq("div", parent, displayClass + " block "+thing.dir,
    (gridx * thing.x) + (thing.z * gridz) +"px",
    gridy * thing.y +"px",
    gridx+"px",
    gridy+"px");
  objdiv.id = "id"+globalId;
  thing.id = "id"+globalId;
  if (!isObject) {
    objdiv.innerHTML = thing.name;
    objdiv.style["font-size"] = fontMapping(gridx);
  }
  objdiv.gamedata = thing;
}
function moveYou(dir) {
  undoStack.push(JSON.stringify(gamestate));
  for(var obj of gamestate.objects) {
    if (obj.you) {
      particle(obj, "white", 1, 0.01);
      move(obj, dir);
    }
  }
  executeRules();
}
function move(gameobj,dir) {

  var newPositionObjs = findAtPosition(gameobj.x + dir.x, gameobj.y + dir.y, gameobj.z + dir.z);
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
  else if(findIsStop(dir, gameobj.x, gameobj.y, gameobj.z)) {
    if (gameobj.move) {
      reverseDir(gameobj);
    }
    return false;
  }

  newPositionObjs = findAtPosition(gameobj.x + dir.x, gameobj.y + dir.y, gameobj.z + dir.z);
  var cantMove = false;
  for(var pushObj of newPositionObjs) {
    if (isStop(pushObj) && !pushObj.you){
      return false;
    }
    if (canPush(pushObj)) {
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
function findIsStop(dir, x, y, z) {
  if (isOutside(x+dir.x, y+dir.y, z + dir.z)) {
    return true;
  }
  var nextObjs = findAtPosition(x + dir.x, y + dir.y, z + dir.z);
  if(nextObjs.length == 0) return false;
  for (var obj of nextObjs) {
    if (obj.stop && !obj.you && !obj.shut) return true; // TODO: shut?
    if (obj.push) return findIsStop(dir, x + dir.x, y + dir.y, z + dir.z);
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
