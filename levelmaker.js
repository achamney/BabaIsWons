
var defaultObj = "wall";
window.makemode = "object";
$(document).ready(function(){
  $("#objbutton").click(function (){window.makemode = "object";});
  $("#wordbutton").click(function (){window.makemode = "word";});

  $("#gamebody").mousedown(function (event) {
    makeOrModObject(event);
  });
  $('#objname').keydown(function (event) {
    if(event.keyCode == 13) {
      selectedObj.name = this.value;
      drawGameState();
    }
  });
  $('#objdir').keydown(function (event) {
    if(event.keyCode == 13) {
      selectedObj.dir = this.value;
      drawGameState();
    }
  });
  window.setInterval(function(){
    var levelcode = get("levelcode");
    var scrubbedGameState = scrubGameState(gamestate)
    levelcode.innerHTML = JSON.stringify(scrubbedGameState);
  }, 10000)
});

function moveAllDir(dir) {
  for(var obj of gamestate.objects) {
    obj.y += dir.y;
    obj.x += dir.x;
  }
  for(var obj of gamestate.words) {
    obj.y += dir.y;
    obj.x += dir.x;
  }
  drawGameState();
}
function scrubGameState(gamestate) {
  var scrubbed = JSON.parse(JSON.stringify(gamestate));
  removeAllAdjectives(scrubbed);
  return scrubbed;
}
function makeOrModObject(event) {
  var gridpos = pointToGrid(event);
  var objs = findAtPosition(gridpos.x, gridpos.y);
  if (event.button == 0) {
    if (objs.length == 0) {
      window.selectedObj = {name: window.selectedObj.name || defaultObj,x: gridpos.x, y: gridpos.y};
      $('#objname').val(window.selectedObj.name);
      $('#objdir').val(window.selectedObj.dir);
      if (makemode == "object") {
        gamestate.objects.push(window.selectedObj);
      } else if (makemode == "word") {
        gamestate.words.push(window.selectedObj);
      }
    } else if(objs.length == 1) {
      var selectedObj = objs[0];
      $('#objname').val(selectedObj.name);
      $('#objdir').val(selectedObj.dir);
      window.selectedObj = selectedObj;
    }
  } else if (event.button == 2) {
    for (var obj of objs) {
      removeObj(obj);
    }
    event.preventDefault();
    return false;
  }
  drawGameState();
}

function pointToGrid(event) {
  var main = $("#gamebody"),
      width = $(main).width(),
      height = $(main).height(),
      ret = {x: Math.floor(event.clientX * gamestate.size.x / width),
            y: Math.floor((event.clientY - 5) * gamestate.size.y / height)};
  return ret;
}
