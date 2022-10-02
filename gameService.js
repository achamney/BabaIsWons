
export function getDirCoordsFromDir(obj) {
  if(obj.dir=="r") return {x:1,y:0,z:0};
  else if(obj.dir=="l") return {x:-1,y:0,z:0};
  else if(obj.dir=="u") return {x:0,y:-1,z:0};
  else if(obj.dir=="d") return {x:0,y:1,z:0};
  else return {x:0,y:1,z:0};
}

export function findAtPosition(i, j, k, excludeObjects, excludeText, lookForward) {
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

export function coordDirToText(dir) {
  if(dir.x>0) return "r";
  if(dir.x<0) return "l";
  if(dir.y>0) return "d";
  if(dir.y<0) return "u";
  if(dir.z<0) return "i";
  if(dir.z>0) return "o";
}

export function updateObjPosition(obj, dir) {
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

export function isOutside(x,y,z) {
  if(x<0 || y<0 ||x >= gamestate.size.x || y >= gamestate.size.y
    || z<0  || z >= gamestate.size.z){
    return true;
  }
  return false;
}
