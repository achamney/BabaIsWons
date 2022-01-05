
var defaultObj = "wall";
window.makemode = "object";
$(document).ready(function(){
  $("#objbutton").click(function (){window.makemode = "object";});
  $("#wordbutton").click(function (){window.makemode = "word";});
  $("#save").click(function (){save();});
  $("#load").click(function (){load();});

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
    levelcode.value = JSON.stringify(scrubbedGameState);
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
  removeAllAdjectives(scrubbed, true);
  return scrubbed;
}
function makeOrModObject(event) {
  var gridpos = pointToGrid(event);
  if (event.button == 0) {
    if (!event.target.gamedata) {
      window.selectedObj = {name: window.selectedObj.name || defaultObj,x: gridpos.x, y: gridpos.y, z: gridpos.z};
      $('#objname').val(window.selectedObj.name);
      $('#objdir').val(window.selectedObj.dir);
      if (makemode == "object") {
        gamestate.objects.push(window.selectedObj);
      } else if (makemode == "word") {
        gamestate.words.push(window.selectedObj);
      }
    } else {
      var selectedObj = event.target.gamedata;
      $('#objname').val(selectedObj.name);
      $('#objdir').val(selectedObj.dir);
      window.selectedObj = selectedObj;
    }
  } else if (event.button == 2) {
    event.target.gamedata && removeObj(event.target.gamedata);
    event.preventDefault();
    return false;
  }
  drawGameState();
}

function pointToGrid(event) {
  var main = $("#gamebody"),
      width = $(main).width(),
      height = $(main).height(),
      x = Math.floor((event.offsetX % (width / gamestate.size.z))/ (width / gamestate.size.z / gamestate.size.x)),
      z = Math.floor(event.offsetX / (width / gamestate.size.z)),
      y = Math.floor((event.offsetY - 5) * gamestate.size.y / height);
      ret = {x: x, y: y, z: z};
  return ret;
}
function save() {
  var file = new Blob(["window.leveldata="+JSON.stringify(scrubGameState(gamestate))], {type: "text"});
    
  var a = document.createElement("a"),
          url = URL.createObjectURL(file);
  a.href = url;
  a.download = "level"+gamestate.levelId+".js";
  document.body.appendChild(a);
  a.click();
  setTimeout(function() {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);  
  }, 0); 
    
}
function load() {
  var levelcode = JSON.parse(get("levelcode").value);
  window.gamestate = levelcode;
  drawGameState();
}
