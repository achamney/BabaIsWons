
var undoStack = [];
function undo() {
    if(undoStack.length == 0) return;
    var main = $("#gamebody");
    var lastGameStateText = undoStack.pop(),
      lastGameState = JSON.parse(lastGameStateText);
    for(var obj of gamestate.objects) {
      var savedObj = lastGameState.objects.filter(o=>o.id==obj.id)[0];
      obj.x = savedObj.x;
      obj.y = savedObj.y;
      obj.z = savedObj.z;
      updateObjPosition(obj, getDirCoordsFromDir(savedObj));
      $("#"+obj.id).removeClass(obj.name);
      obj.name = savedObj.name;
      $("#"+obj.id).addClass(obj.name);
    }
    var deletedObjs = lastGameState.objects.filter(o=>{
      var ret = true;
      for(var test of gamestate.objects){
        if(o.id==test.id)
          ret = false;
      }
      return ret;
    });
    var width = $(main).width(),
      height = $(main).height(),
      gridx = width / gamestate.size.x / gamestate.size.z,
      gridy = height / gamestate.size.y,
      gridz = width / gamestate.size.z;
    for(var deleted of deletedObjs) {
      gamestate.objects.push(deleted);
      makeThing(main[0], deleted, gridx, gridy, gridz, deleted.id, true);
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
  }