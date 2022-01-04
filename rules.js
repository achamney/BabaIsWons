var wordMasks = {
  "a": ["you", "stop", "push", "win", "open", "shut", "move", "sink",
    "defeat", "hot", "melt", "swap", "pull", "active"],
  "v": ["is"],
  "h": ["has"],
  "c": ["and"],
  "n": ["baba", "rock", "wall", "flag", "keke", "water", "skull",
    "lava", "grass", "jelly", "crab", "star", "love", "door", "key"]
};
var validSequences = {
  "nva": executeAdjective, "nvn": executeEquality, "nhn": executeHas,
  "nvaca": executeConjAdj, "nvacaca": executeConjAdj, "nvacacaca": executeConjAdj,
  "ncnva": executeMultiAdj, "ncncnva": executeMultiAdj, "ncncncnva": executeMultiAdj
};
var runningEqualities = [],
  runningChangeless = [];
function executeRules() {
  removeAllAdjectives(gamestate);
  runningEqualities = [];
  runningChangeless = [];
  for (var word of gamestate.words) {
    word.push = true;
  }
  for (var ruleName in validSequences) {
    var searchChar = ruleName.charAt(0);
    var matchingWords = getWordsMatchingMask(searchChar);
    for (var matchingWord of matchingWords) {
      executeRuleDir(searchChar, matchingWord, ruleName, { x: 1, y: 0 });
      executeRuleDir(searchChar, matchingWord, ruleName, { x: 0, y: 1 });
    }
  }
  for (var i=gamestate.objects.length-1; i>=0;i--) {
    var obj = gamestate.objects[i];
    if (obj.win) {
      var objsAtPos = findAtPosition(obj.x, obj.y);
      if (objsAtPos.filter(o => o.you).length > 0) {
        particle(obj, "yellow", 100, 0.3);
        window.setTimeout(function () {
          alert("You Win!");
          window.location = updateURLParameter(window.location.href, "level", gamestate.levelId + 1);
        }, 200);
      }
    }
    if (obj.shut) {
      var objsAtPos = findAtPosition(obj.x, obj.y);
      if (objsAtPos.filter(o => o.open).length > 0) {
        removeObj(obj);
        removeObj(objsAtPos[0]);
      }
    }
    if (obj.move) {
      move(obj, getDirCoordsFromDir(obj));
    }
    if (obj.sink) {
      var objsAtPos = findAtPosition(obj.x, obj.y);
      for (var sinking of objsAtPos) {
        if (obj == sinking) continue;
        removeObj(obj);
        removeObj(sinking);
      }
    }
    if (obj.defeat) {
      var objsAtPos = findAtPosition(obj.x, obj.y);
      for (var defeated of objsAtPos) {
        if (defeated.you)
          removeObj(defeated);
      }
    }
    if (obj.hot) {
      var objsAtPos = findAtPosition(obj.x, obj.y);
      for (var melted of objsAtPos) {
        if (melted.melt)
          removeObj(melted);
      }
    }
  }
  for (var actors of runningEqualities) {
    if (~runningChangeless.indexOf(actors[0].name)) {
      continue;
    }
    for (var obj of gamestate.objects) {
      if (actors[0].name == obj.name) {
        changeObj(obj, actors[2].name);
      }
    }
  }
}
function checkIsLockAndKey(obj1, objs2) {
  for (var obj2 of objs2) {
    if ((obj1.open && obj2.shut) ||
      (obj1.shut && obj2.open)) {
      removeObj(obj1);
      removeObj(obj2);
      return true;
    }
  }
}
function executeRuleDir(searchChar, matchingWord, ruleName, dir) {
  var actors = [matchingWord];
  var matchedRule = false;
  var searchChar = ruleName.charAt(1),
    nextCharInd = 2,
    lastActor = matchingWord;
  while (nextCharInd <= ruleName.length) {
    var nextWord = findAtPosition(lastActor.x + dir.x, lastActor.y + dir.y, true);
    if (nextWord.length > 0) {
      if (~wordMasks[searchChar].indexOf(nextWord[0].name)) { // TODO: multiple words on the same spot
        actors.push(nextWord[0]);
        lastActor = nextWord[0];
      }
    }
    searchChar = ruleName.charAt(nextCharInd);
    nextCharInd++;
    if (actors.length == ruleName.length) {
      matchedRule = true;
    }
  }
  if (matchedRule)
    validSequences[ruleName](actors);
}
function getWordsMatchingMask(char) {
  var ret = [];
  for (var word of gamestate.words) {
    if (~wordMasks[char].indexOf(word.name)) {
      ret.push(word);
    }
  }
  return ret;
}
function executeAdjective(actors) {
  var nouns = gamestate.objects.filter(o => o.name == actors[0].name);
  for (var noun of nouns) {
    noun[actors[2].name] = true;
  }
  executeBase(actors);
}
function executeHas(actors) {
  var nouns = gamestate.objects.filter(o => o.name == actors[0].name);
  for (var noun of nouns) {
    noun.has = actors[2].name;
  }
  executeBase(actors);
}
function executeEquality(actors) {
  if (actors[0].name == actors[2].name) {
    runningChangeless.push(actors[0].name);
  } else {
    runningEqualities.push(actors);
  }
  executeBase(actors);
}
function removeAllAdjectives(gs, dontRemoveTextClasses) {
  for (var obj of gs.objects) {
    removeAdjectives(obj);
  }

  for (var word of gs.words) {
    removeAdjectives(word);
    if (!dontRemoveTextClasses)
      $("#"+word.id).removeClass("active");
  }
}
function removeAdjectives(obj) {
  for (var adjective of wordMasks.a) {
    delete obj[adjective];
  }
  delete obj.has;
}
function executeConjAdj(actors) {
  var adjs = actors.filter(a => ~wordMasks.a.indexOf(a.name));
  for (var adj of adjs) {
    var param = [actors[0], actors[1], adj];
    executeAdjective(param);
  }
  executeBase(actors);
}
function executeMultiAdj(actors) {
  var nouns = actors.filter(a => ~wordMasks.n.indexOf(a.name));
  for (var noun of nouns) {
    var param = [noun, { name: "is" }, actors[actors.length - 1]];
    executeAdjective(param);
  }
  executeBase(actors);
}
function executeBase(actors) {
  for (var actor of actors) {
    $("#"+actor.id).addClass("active");
  }
}
