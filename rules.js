var wordMasks = {
  "a": ["you", "stop", "push", "win", "open", "shut", "move", "sink",
    "defeat", "hot", "melt", "swap", "pull", "drop", "shift", "float"],
  "v": ["is"],
  "h": ["has"],
  "c": ["and"],
  "x": ["not"],
  "n": ["baba", "rock", "wall", "flag", "keke", "water", "skull",
    "lava", "grass", "jelly", "crab", "star", "love", "door", "key", 
    "text", "bolt"]
};
var validSequences = {
    "^(x*n)(cx*n)*v((x*n)|(x*a))((cx*n)|(cx*a))*$": executeIs,
    "^n(cn)*hn(cn)*$": executeHas
  },
  validStartingChars = ['x', 'n'];
var runningEqualities = [],
  runningChangeless = [],
  runningAdjectives = [],
  runningNAdjectives = [],
  runningNEqualities = [],
  allSentences = [];
function executeRules() {
  preExecuteStep();
  removeAllAdjectives(gamestate);
  allSentences = [];
  var oldRules = copyArray(allSentences);
  findAllSentences();
  while (sentencesHaveChanged(allSentences, oldRules)) {
    removeAllAdjectives(gamestate);
    for (var word of gamestate.words) {
      word.push = true;
    }
    for (var actors of runningEqualities) {
      if (~runningChangeless.indexOf(actors[0]) ||
        runningNEqualities.filter(n=>n[0] == actors[0] && n[3] == actors[2]).length>0) {
        continue;
      }
      for (var obj of gamestate.objects) {
        if (actors[0] == obj.name) {
          changeObj(obj, actors[2]);
        }
      }
    }
    for (var actors of runningAdjectives) {
      if (runningNAdjectives.filter(n=>n[0] == actors[0] && n[3] == actors[2]).length>0) {
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
    oldRules = copyArray(allSentences);
    findAllSentences();
  }
}
function findAllSentences() {
  runningEqualities = [];
  runningChangeless = [];
  runningAdjectives = [];
  runningNAdjectives = [];
  runningNEqualities = [];
  allSentences = [];
  gamestate.words.sort((a,b)=>a.x - b.x);
  for (var ruleName in validSequences) {
    for (var sChar of validStartingChars) {
      var matchingWords = getWordsMatchingMask(sChar);
      for (var matchingWord of matchingWords) {
        executeRuleDir(matchingWord, ruleName, { x: 1, y: 0, z: 0 });
      }
    }
  }
  gamestate.words.sort((a,b)=>a.y - b.y);
  for (var ruleName in validSequences) {
    for (var sChar of validStartingChars) {
      var matchingWords = getWordsMatchingMask(sChar);
      for (var matchingWord of matchingWords) {
        executeRuleDir(matchingWord, ruleName, { x: 0, y: 1, z: 0 });
      }
    }
  }
  gamestate.words.sort((a,b)=>b.z - a.z);
  for (var ruleName in validSequences) {
    for (var sChar of validStartingChars) {
      var matchingWords = getWordsMatchingMask(sChar);
      for (var matchingWord of matchingWords) {
        executeRuleDir(matchingWord, ruleName, { x: 0, y: 0, z: -1 });
      }
    }
  }
}
function runAdjectiveStep(obj) {
  if (obj.shut) {
    var objsAtPos = findAtPosition(obj.x, obj.y, obj.z);
    if (objsAtPos.filter(o => o.open && o.float == obj.float).length > 0) {
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
      if (obj == sinking || obj.float != sinking.float) continue;
      removeObj(obj);
      removeObj(sinking);
    }
  }
  if (obj.defeat) {
    var objsAtPos = findAtPosition(obj.x, obj.y, obj.z);
    for (var defeated of objsAtPos) {
      if (defeated.you && obj.float == defeated.float)
        removeObj(defeated);
    }
  }
  if (obj.hot) {
    var objsAtPos = findAtPosition(obj.x, obj.y, obj.z);
    for (var melted of objsAtPos) {
      if (melted.melt && obj.float == melted.float)
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
    if (objsAtPos.filter(o => o.you && o.float == obj.float).length > 0) {
      particle(obj, "yellow", 100, 0.3);
      window.setTimeout(function () {
        window.location = updateURLParameter(window.location.href, "level", gamestate.levelId + 1);
      }, 1000);
    }
  }
}
function preExecuteStep() {
  for (var obj of gamestate.objects) {
    if (obj.shift) {
      var objsAtPos = findAtPosition(obj.x, obj.y, obj.z);
      for (var shifted of objsAtPos) {
        if (shifted != obj)
          move(shifted, getDirCoordsFromDir(obj));
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
function executeRuleDir(matchingWord, ruleName, dir) {
  var actors = [matchingWord],
      abvSentence = getCharFromActor(matchingWord),
      lastValidActors = [],
      lastActor = matchingWord,
      regexp = new RegExp(ruleName),
      nextWord = findAtPosition(lastActor.x + dir.x, lastActor.y + dir.y, lastActor.z + dir.z, true);
  while (nextWord.length > 0) {
    actors.push(nextWord[0]); // TODO: multiple words on the same spot
    lastActor = nextWord[0];
    abvSentence += getCharFromActor(lastActor);
    if (regexp.test(abvSentence)) {
      lastValidActors = copyArray(actors);
    }
    nextWord = findAtPosition(lastActor.x + dir.x, lastActor.y + dir.y, lastActor.z + dir.z, true);
  }
  if (lastValidActors.length > 0)
    validSequences[ruleName](lastValidActors, dir);
}
function getCharFromActor(actor) {
  for (var c in wordMasks) {
    if (~wordMasks[c].indexOf(actor.name)) {
      return c;
    }
  }
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
function executeIs(actors, dir) {
  var leftNouns = {},
    rightNouns = {},
    rightAdjs = {},
    rightNNouns = {},
    rightNAdjs = {},
    isIndex = 0,
    notted = false;
  for (isIndex = 0; isIndex < actors.length; isIndex++) {
    var curActor = actors[isIndex];
    if (curActor.name == "is") {
      curActor.used = curActor.used || {r:false, d: false, i:false }
      if (curActor.used[coordDirToText(dir)]) {
        return;
      }
      curActor.used[coordDirToText(dir)] = true;
      break;
    }
    else if (curActor.name == "not") {
      notted = !notted;
    } else if(curActor.name == "and") {
      continue;
    } else {
      addActorsToList(curActor, leftNouns, notted);
      notted = false;
    }
  }
  for (var i = isIndex+1; i < actors.length; i++) {
    var curActor = actors[i];
    if (curActor.name == "is") { // Left here in case of off by one error?
      break;
    }
    else if (curActor.name == "not") {
      notted = !notted;
    } else if (curActor.name == "and") {
      continue;
    } else {
      if (getCharFromActor(curActor) == "n") {
        if (notted)
          rightNNouns[curActor.name] = true;
        else
          rightNouns[curActor.name] = true;
      } else if (getCharFromActor(curActor) == "a") {
        if (notted)
          rightNAdjs[curActor.name] = true;
        else
          rightAdjs[curActor.name] = true;
      }
      notted = false;
    }
  }
  for (var leftN in leftNouns) {
    for (var rightA in rightAdjs) {
      runningAdjectives.push([leftN,"is",rightA]);
    }
    for (var rightNA in rightNAdjs) {
      runningNAdjectives.push([leftN,"is","not",rightNA]);
    }
    for (var rightN in rightNouns) {
      if (leftN == rightN)
        runningChangeless.push(leftN);
      else
        runningEqualities.push([leftN,"is",rightN]);
    }
    for (var rightNN in rightNNouns) {
      runningNEqualities.push([leftN,"is","not",rightNN]);
    }
  }
  executeBase(actors);
}
function addActorsToList(actor, list, notted) {
  if (notted) {
    var allOtherNouns = wordMasks.n.filter(n => gamestate.objects.filter(o => o.name == n && n != actor.name).length > 0);
    for (var noun of allOtherNouns) {
      list[noun] = true;
    }
  } else {
    list[actor.name] = true;
  }
}
function executeAdjectiveImpl(actors) {
  var nouns = gamestate.objects.filter(o => o.name == actors[0]);
  if (actors[0] == "text") {
    nouns = gamestate.words;
  }
  for (var noun of nouns) {
    noun[actors[2]] = true;
    $("#"+noun.id).addClass(actors[2]);
  }
}
function executeHas(actors) {
  /*var nouns = gamestate.objects.filter(o => o.name == actors[0].name);
  if (actors[0].name == "text") {
    nouns = gamestate.words;
  }
  for (var noun of nouns) {
    noun.has = actors[2].name;
  }
  executeBase(actors);*/
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
  var objdom = $("#"+obj.id);
  for (var adjective of wordMasks.a) {
    delete obj[adjective];
    objdom.removeClass(adjective);
  }
  delete obj.used;
  delete obj.has;
}
function executeBase(actors) {
  for (var actor of actors) {
    $("#"+actor.id).addClass("active");
  }
  allSentences.push(actors);
}
function sentencesHaveChanged(s1, s2) {
  if (s1.length != s2.length) {
    return true;
  }
  var simps1 = convertRulesToSimple(s1), simps2 = convertRulesToSimple(s2);
  for (var s1a of simps1) {
    if (!~simps2.indexOf(s1a)) {
      return true;
    }
  }
}
function convertRulesToSimple(rules) {
  var ret = [];
  for (var r of rules) {
    var retStr = "";
    for (var actor of r) {
      retStr += actor.name + " ";
    }
    ret.push (retStr);
  }
  return ret;
}