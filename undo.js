
import {getDirCoordsFromDir,updateObjPosition} from "./gameService.js"
import {executeRules} from "./rules/rules.js"
import {playSfx} from "./music/sfx.js"
var undoStack = [];
export function push(toAdd) {
  undoStack.push(toAdd);
}
export function undo(gameHandler) {
    if(undoStack.length == 0) return;
    playSfx("walk");
    var lastGameStateText = undoStack.pop(),
      lastGameState = JSON.parse(lastGameStateText);
    for(var i= gamestate.objects.length -1; i>=0;i--) {
      var obj = gamestate.objects[i];
      var savedObj = lastGameState.objects.filter(o=>o.id==obj.id)[0];
      if (savedObj) {
        obj.x = savedObj.x;
        obj.y = savedObj.y;
        obj.z = savedObj.z;
        updateObjPosition(obj, getDirCoordsFromDir(savedObj));
        $("#"+obj.id).removeClass(obj.name);
        obj.name = savedObj.name;
        $("#"+obj.id).addClass(obj.name);
      } else {
        gameHandler.removeObj(obj);
      }
    }
    undoDeletedElements(gamestate.objects, lastGameState.objects, gameHandler);
    for(var i= gamestate.words.length -1; i>=0;i--) {
      var obj = gamestate.words[i];
      var savedObj = lastGameState.words.filter(o=>o.id==obj.id)[0];
        if(savedObj) {
        obj.x = savedObj.x;
        obj.y = savedObj.y;
        obj.z = savedObj.z;
        updateObjPosition(obj, {x:1,y:0});
        obj.name = savedObj.name;
      } else {
        removeObj(obj);
      }
    }
    undoDeletedElements(gamestate.words, lastGameState.words, gameHandler);
    executeRules(gameHandler);
  }
  function undoDeletedElements (newElements, oldElements, gameHandler) {
    var main = $("#gamebody");
    var deletedObjs = oldElements.filter(o=>{
      var ret = true;
      for(var test of newElements){
        if(o.id==test.id)
          ret = false;
      }
      return ret;
    });
    for(var deleted of deletedObjs) {
      newElements.push(deleted);
      gameHandler.makeThing(main, deleted, null, null, null, deleted.id, newElements == gamestate.objects);
    }
  }
