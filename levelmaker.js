
var defaultObj = "wall";
window.makemode = "object";
$(document).ready(function(){
  $("#objbutton").click(function (){window.makemode = "object"; $(this).addClass("selected"); $("#wordbutton").removeClass("selected")});
  $("#wordbutton").click(function (){window.makemode = "word"; $(this).addClass("selected"); $("#objbutton").removeClass("selected")});
  $("#save").click(function (){save();});
  $("#savecloud").click(function (){savecloud();});
  $("#cloneCloud").click(function (){cloneLevel();});
  $("#testbutton").click(function (){testlevel();});
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
  window.setTimeout(function(){
    var levelcode = get("levelcode");
    var scrubbedGameState = scrubGameState(gamestate)
    levelcode.value = JSON.stringify(scrubbedGameState);
    $("#xsize").val(gamestate.size.x);
    $("#ysize").val(gamestate.size.y);
    $("#zsize").val(gamestate.size.z);
    changeBaseGameFunctions();
  }, 3000)
});
function testlevel() {
  window.open(window.location.protocol + "//" + window.location.hostname + (window.location.port ? ':' + window.location.port: '')+"?levelid="+gamestate.levelId);
}
function changeBaseGameFunctions(){
  window.moveYou = function(dir) {
    undoStack.push(JSON.stringify(gamestate));
    move(window.selectedObj, dir);
    executeRules();
    updateRuleUI();
  }
}
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
  undoStack.push(JSON.stringify(gamestate));
  var gridpos = pointToGrid(event);
  if (event.button == 0) {
    if (!event.target.gamedata) {
      window.selectedObj = {name: window.selectedObj.name || defaultObj,x: gridpos.x, y: gridpos.y, z: gridpos.z, id: "id"+globalId};
      $('#objname').val(window.selectedObj.name);
      $('#objdir').val(window.selectedObj.dir);
      if (makemode == "object") {
        if (!~wordMasks.n.indexOf(window.selectedObj.name)) {
          window.selectedObj.name = defaultObj;
        } 
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
  $("#"+window.selectedObj.id).addClass("selected");
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
  window.gamestate.name = $("#levelname").val();
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
async function savecloud() {
  window.gamestate.name = $("#levelname").val();
  window.gamestate.size.x = $("#xsize").val();
  window.gamestate.size.y = $("#ysize").val();
  window.gamestate.size.z = $("#zsize").val();
  $("#ysize").val(gamestate.size.y);
  $("#zsize").val(gamestate.size.z);
  var urlParams = new URLSearchParams(window.location.search);
  var communityLevelId = urlParams.get("levelid");
  if (!communityLevelId) {
    var ret = await netService.makeNewLevel(window.gamestate);
    window.location = window.location.pathname + "?levelid="+ret["_id"];
  } else {
    await netService.setGameState(window.gamestate, communityLevelId);
    window.location = window.location.pathname + "?levelid="+communityLevelId;
  }
}
function load() {
  var levelcode = JSON.parse(get("levelcode").value);
  window.gamestate = levelcode;
  drawGameState();
}
async function cloneLevel() {
  delete window.gamestate["_id"];
  var ret = await netService.makeNewLevel(window.gamestate);
  window.location = window.location.pathname + "?levelid="+ret["_id"];
}
