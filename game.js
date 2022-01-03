
var gamestate = {
    words:[],
    objects:[],
    levelId:1,
    size: {x: 24, y: 18}
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
    drawGameState();
  };
  levelTag.src=`levels/level${levelnum}.js`;
  $("head")[0].appendChild(levelTag);
  $("#nextlevellink").attr("href",window.location.pathname +"?level="+(levelnum+1));

  var height = $('#gamebody').height();
  $('#gamebody').css("width", height * 30 / 18);
  $("body").keydown(function (event) {
      if(event.keyCode == 37) {
        moveYou({x: -1, y: 0});
      }
      else if(event.keyCode == 39) {
        moveYou({x: 1, y: 0});
      }
      else if(event.keyCode == 38) {
        moveYou({x: 0, y: -1});
      }
      else if(event.keyCode == 40) {
        moveYou({x: 0, y: 1});
      }else if(event.keyCode == 90) {
        undo();
      }
  });
}
function undo() {
  if(undoStack.length == 0) return;
  var lastGameStateText = undoStack.pop(),
    lastGameState = JSON.parse(lastGameStateText);
  for(var obj of gamestate.objects) {
    var savedObj = lastGameState.objects.filter(o=>o.id==obj.id)[0];
    obj.x = savedObj.x;
    obj.y = savedObj.y;
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
}
function makeGameState(level) {
    if (window.leveldata) {
      gamestate = window.leveldata;
    } else {
      gamestate.levelId=level;
    }
}
function findAtPosition(i, j, excludeObjects) {
  var ret = [];
  if (!excludeObjects) {
    for(var obj of gamestate.objects) {
      if (obj.x == i && obj.y == j)
        ret.push(obj);
    }
  }
  for(var obj of gamestate.words) {
    if (obj.x == i && obj.y == j)
      ret.push(obj);
  }
  return ret;
}
function drawGameState() {
    var main = get("gamebody");
    main.innerHTML = "";
    var width = $(main).width(),
        height = $(main).height(),
        gridx = width / gamestate.size.x,
        gridy = height / gamestate.size.y,
        globalId = 1;
    for (var obj of gamestate.objects) {
        obj.dir = obj.dir || "r";
        makeThing(main, obj, gridx, gridy, globalId++, true);
    }
    for (var obj of gamestate.words) {
        makeThing(main, obj, gridx, gridy, globalId++, false);
    }
    executeRules();
}
function makeThing(parent, thing, gridx, gridy, globalId, isObject) {
  var displayClass = isObject ? thing.name : "word " + thing.name+"word";
  if (~wordMasks.a.indexOf(thing.name)) {
    displayClass += " action";
  }
  var objdiv = makesq("div", parent, displayClass + " block "+thing.dir,
    gridx * thing.x +"px",
    gridy * thing.y +"px",
    gridx+"px",
    gridy+"px");
  objdiv.id = "id"+globalId;
  thing.id = "id"+globalId;
  if (!isObject) {
    objdiv.innerHTML = thing.name;
  }
  objdiv.gamedata = thing;
}
function moveYou(dir) {
  undoStack.push(JSON.stringify(gamestate));
  for(var obj of gamestate.objects) {
    if (obj.you) {
      move(obj, dir);
    }
  }
  executeRules();
}
function move(gameobj,dir) {

  var newPositionObjs = findAtPosition(gameobj.x + dir.x, gameobj.y + dir.y);
  if (checkIsLockAndKey(gameobj, newPositionObjs)) {
    return true;
  }
  if(gameobj.swap) {
    if (isOutside(gameobj.x+dir.x, gameobj.y+dir.y)) {
      if (gameobj.move) {
        reverseDir(gameobj);
      }
      return false;
    }
    for (var newPosObj of newPositionObjs) {
      newPosObj.x = gameobj.x;
      newPosObj.y = gameobj.y;
      updateObjPosition(newPosObj, getDirCoordsFromDir(newPosObj));
    }
  }
  else if(findIsStop(gameobj.x, gameobj.y, dir)) {
    if (gameobj.move) {
      reverseDir(gameobj);
    }
    return false;
  }

  newPositionObjs = findAtPosition(gameobj.x + dir.x, gameobj.y + dir.y);
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
  var behindPositionObjs = findAtPosition(gameobj.x - dir.x, gameobj.y - dir.y);
  gameobj.x += dir.x;
  gameobj.y += dir.y;
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
      gridx = width / gamestate.size.x,
      gridy = height / gamestate.size.y;
  var objdiv = $("#"+obj.id);
  redoDirections(objdiv, dir);
  obj.dir = coordDirToText(dir);
  objdiv.css("left", obj.x * gridx+"px");
  objdiv.css("top", obj.y * gridy+"px");
}
function findIsStop(x, y, dir) {
  if (isOutside(x+dir.x, y+dir.y)) {
    return true;
  }
  var nextObjs = findAtPosition(x + dir.x, y + dir.y);
  if(nextObjs.length == 0) return false;
  for (var obj of nextObjs) {
    if (obj.stop && !obj.you && !obj.shut) return true; // TODO: shut?
    if (obj.push) return findIsStop(x + dir.x, y + dir.y, dir);
  }
  return false;
}
function isOutside(x,y) {
  if(x<=1 || y<=1 ||x > gamestate.size.x || y > gamestate.size.y){
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
