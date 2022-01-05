var wordMasks = {
  "a": ["you", "stop", "push", "win", "open", "shut", "move", "sink",
    "defeat", "hot", "melt", "swap", "pull", "drop"],
  "v": ["is"],
  "h": ["has"],
  "c": ["and"],
  "x": ["not"],
  "n": ["baba", "rock", "wall", "flag", "keke", "water", "skull",
    "lava", "grass", "jelly", "crab", "star", "love", "door", "key", "text"]
};
var validSequences = {
  "nva": executeAdjective, "nvn": executeEquality, "nhn": executeHas,
  "nvxa": executeNAdjective, "nvxn": executeNEquality, "nhn": executeHas,
  "nvaca": executeConjAdj, "nvacaca": executeConjAdj, "nvacacaca": executeConjAdj,
  "ncnva": executeMultiAdj, "ncncnva": executeMultiAdj, "ncncncnva": executeMultiAdj
};
var runningEqualities = [],
  runningChangeless = [],
  runningAdjectives = [],
  runningNAdjectives = [],
  runningNEqualities = [];
function executeRules() {
  removeAllAdjectives(gamestate);
  runningEqualities = [];
  runningChangeless = [];
  runningAdjectives = [];
  runningNAdjectives = [];
  runningNEqualities = [];
  for (var word of gamestate.words) {
    word.push = true;
  }
  for (var ruleName in validSequences) {
    var searchChar = ruleName.charAt(0);
    var matchingWords = getWordsMatchingMask(searchChar);
    for (var matchingWord of matchingWords) {
      executeRuleDir(searchChar, matchingWord, ruleName, { x: 1, y: 0, z: 0 });
      executeRuleDir(searchChar, matchingWord, ruleName, { x: 0, y: 1, z: 0 });
      executeRuleDir(searchChar, matchingWord, ruleName, { x: 0, y: 0, z: -1 });
    }
  }
  for (var actors of runningEqualities) {
    if (~runningChangeless.indexOf(actors[0].name) ||
      runningNEqualities.filter(n=>n[0].name == actors[0].name && n[3].name == actors[2].name).length>0) {
      continue;
    }
    for (var obj of gamestate.objects) {
      if (actors[0].name == obj.name) {
        changeObj(obj, actors[2].name);
      }
    }
  }
  for (var actors of runningAdjectives) {
    if (runningNAdjectives.filter(n=>n[0].name == actors[0].name && n[3].name == actors[2].name).length>0) {
      continue;
    }
    executeAdjectiveImpl(actors);
  }
  for (var i = gamestate.objects.length - 1; i >= 0; i--) {
    var obj = gamestate.objects[i];
    runAdjectiveStep(obj);
  }
  for (var i = gamestate.words.length - 1; i >= 0; i--) {
    var obj = gamestate.words[i];
    runAdjectiveStep(obj);
  }
}
function runAdjectiveStep(obj) {
  if (obj.shut) {
    var objsAtPos = findAtPosition(obj.x, obj.y, obj.z);
    if (objsAtPos.filter(o => o.open).length > 0) {
      removeObj(obj);
      removeObj(objsAtPos[0]);
    }
  }
  if (obj.move) {
    move(obj, getDirCoordsFromDir(obj));
  }
  if (obj.sink) {
    var objsAtPos = findAtPosition(obj.x, obj.y, obj.z);
    for (var sinking of objsAtPos) {
      if (obj == sinking) continue;
      removeObj(obj);
      removeObj(sinking);
    }
  }
  if (obj.defeat) {
    var objsAtPos = findAtPosition(obj.x, obj.y, obj.z);
    for (var defeated of objsAtPos) {
      if (defeated.you)
        removeObj(defeated);
    }
  }
  if (obj.hot) {
    var objsAtPos = findAtPosition(obj.x, obj.y, obj.z);
    for (var melted of objsAtPos) {
      if (melted.melt)
        removeObj(melted);
    }
  }
  if (obj.drop) {
    var dir = {x:0,y:0,z:-1};
    while(!findIsStop(dir, obj.x, obj.y, obj.z)) {
      move(obj, dir);
    }
  }
  if (obj.win) {
    var objsAtPos = findAtPosition(obj.x, obj.y, obj.z);
    if (objsAtPos.filter(o => o.you).length > 0) {
      particle(obj, "yellow", 100, 0.3);
      window.setTimeout(function () {
        window.location = updateURLParameter(window.location.href, "level", gamestate.levelId + 1);
      }, 1000);
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
    var nextWord = findAtPosition(lastActor.x + dir.x, lastActor.y + dir.y, lastActor.z + dir.z, true);
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
  runningAdjectives.push(actors);
  executeBase(actors);
}
function executeAdjectiveImpl(actors) {
  var nouns = gamestate.objects.filter(o => o.name == actors[0].name);
  if (actors[0].name == "text") {
    nouns = gamestate.words;
  }
  for (var noun of nouns) {
    noun[actors[2].name] = true;
  }
}
function executeNAdjective(actors) {
  runningNAdjectives.push(actors);
  executeBase(actors);
}
function executeHas(actors) {
  var nouns = gamestate.objects.filter(o => o.name == actors[0].name);
  if (actors[0].name == "text") {
    nouns = gamestate.words;
  }
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
function executeNEquality(actors) {
  if (actors[0].name == actors[3].name) {
    for (var i=gamestate.objects.length -1;i>=0;i--) {
      var obj = gamestate.objects[i];
      removeObj(obj);
    }
  } 
  runningNEqualities.push(actors);
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
