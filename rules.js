var wordMasks ={"a": ["you", "stop", "push", "win", "open", "shut", "move", "sink", "defeat", "hot", "melt", "swap", "pull"],
                "v": ["is"],
                "h": ["has"],
                "n": ["baba", "rock", "wall", "flag", "keke", "water", "skull", "lava", "grass"]
              };
var validSequences = {"nva" : executeAdjective, "nvn": executeEquality, "nhn": executeHas};
function executeRules () {
  removeAllAdjectives(gamestate);
  for (var word of gamestate.words) {
    word.push = true;
  }
  for (var ruleName in validSequences) {
    var searchChar = ruleName.charAt(0);
    var matchingWords = getWordsMatchingMask(searchChar);
    for (var matchingWord of matchingWords) {
      executeRuleDir(searchChar, matchingWord, ruleName, {x: 1, y: 0});
      executeRuleDir(searchChar, matchingWord, ruleName, {x: 0, y: 1});
    }
  }
  for (var obj of gamestate.objects) {
    if (obj.win) {
      var objsAtPos = findAtPosition(obj.x, obj.y);
      if (objsAtPos.filter(o=>o.you).length > 0) {
        window.setTimeout(function(){alert("You Win!")},200);
      }
    }
    if (obj.shut) {
      var objsAtPos = findAtPosition(obj.x, obj.y);
      if (objsAtPos.filter(o=>o.open).length > 0) {
        removeObj(obj);
        removeObj(objsAtPos[0]);
      }
    }
    if(obj.move) {
      move(obj,getDirCoordsFromDir(obj));
    }
    if(obj.sink) {
      var objsAtPos = findAtPosition(obj.x, obj.y);
      for(var sinking of objsAtPos) {
        if (obj == sinking) continue;
        removeObj(obj);
        removeObj(sinking);
      }
    }
    if(obj.defeat) {
      var objsAtPos = findAtPosition(obj.x, obj.y);
      for(var defeated of objsAtPos) {
        if(defeated.you)
          removeObj(defeated);
      }
    }
    if(obj.hot) {
      var objsAtPos = findAtPosition(obj.x, obj.y);
      for(var melted of objsAtPos) {
        if(melted.melt)
          removeObj(melted);
      }
    }
  }
}
function executeRuleDir(searchChar, matchingWord, ruleName, dir) {
  var actors = [matchingWord];
  var matchedRule = false;
  var searchChar = ruleName.charAt(1),
    nextCharInd = 2,
    lastActor = matchingWord;
  while (nextCharInd<=ruleName.length) {
    var nextWord = findAtPosition(lastActor.x + dir.x, lastActor.y + dir.y, true);
    if (nextWord.length > 0) {
      if (~wordMasks[searchChar].indexOf(nextWord[0].name)) { // TODO: multiple words on the same spot
        actors.push(nextWord[0]);
        lastActor = nextWord[0];
      }
    }
    searchChar = ruleName.charAt(nextCharInd);
    nextCharInd++;
    if(actors.length == ruleName.length) {
      matchedRule = true;
    }
  }
  if(matchedRule)
    validSequences[ruleName](actors);
}
function getWordsMatchingMask(char) {
  var ret = [];
  for(var word of gamestate.words) {
    if (~wordMasks[char].indexOf(word.name)){
      ret.push(word);
    }
  }
  return ret;
}
function executeAdjective(actors) {
  var nouns = gamestate.objects.filter(o=>o.name == actors[0].name);
  for(var noun of nouns) {
    noun[actors[2].name] = true;
  }
}
function executeHas(actors) {
  var nouns = gamestate.objects.filter(o=>o.name == actors[0].name);
  for(var noun of nouns) {
    noun.has = actors[2].name;
  }
}
function executeEquality(actors) {
  for (var obj of gamestate.objects) {
    if (obj.name == actors[0].name) {
      changeObj(obj, actors[2].name);
    }
  }
}
function removeAllAdjectives(gs) {
  for (var obj of gs.objects) {
    removeAdjectives(obj);
  }

  for (var word of gs.words) {
    removeAdjectives(word);
  }
}
function removeAdjectives(obj) {
  for (var adjective of wordMasks.a) {
    delete obj[adjective];
  }
  delete obj.has;
}
