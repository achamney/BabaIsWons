var wordMasks = {
  "a": ["you", "stop", "push", "win", "open", "shut", "move", "sink",
    "defeat", "hot", "melt", "swap", "pull", "drop", "shift", "float", 
    "weak", "tele", "red", "blue", "up", "down", "left", "right", "fall"],
  "v": ["is"],
  "m": ["make"],
  "h": ["has"],
  "c": ["and"],
  "x": ["not"],
  "o": ["on"],
  "n": ["baba", "rock", "wall", "flag", "keke", "water", "skull",
    "lava", "grass", "jelly", "crab", "star", "love", "door", "key", 
    "text", "bolt", "box", "tree", "ice", "belt", "rose", "flower",
    "empty"]
};
var ruleVerbs = ["is", "has", "make"];
var validSequences = {
    "^(x*n(on)?)(cx*n(on)?)*v((x*n)|(x*a))((cx*n)|(cx*a)|(chn))*$": window.isRule,
    "^n(on)?(cn(on)?)*mn(cn)*$": window.makeRule,
    "^(x*n(on)?)(cx*n(on)?)*h(x*n)(cx*n)*$": window.hasRule
  },
  validStartingChars = ['x', 'n'];

var allSentences = [];
function executeRules() {
  applyAdjectives();
  preExecuteStep();
  removeAllAdjectives(gamestate);
  var combObjAndWords = gamestate.objects.concat(gamestate.words);
  for (var obj of combObjAndWords) {
    delete obj.teled;
  }
  allSentences = [];
  var oldRules = copyArray(allSentences),
    breakCounter = 0;
  findAllSentences();
  while (sentencesHaveChanged(allSentences, oldRules)) {
    removeAllAdjectives(gamestate);
    for (var word of gamestate.words) {
      word.push = true;
    }
    for (var ruleName in validSequences) {
      validSequences[ruleName].apply();
    }
    for (var i = gamestate.objects.length - 1; i >= 0; i--) {
      var obj = gamestate.objects[i];
      if(obj) // TODO: After two deletions, could run into a deleted object
        runAdjectiveStep(obj);
    }
    for (var i = gamestate.words.length - 1; i >= 0; i--) {
      var obj = gamestate.words[i];
      runAdjectiveStep(obj);
    }
    oldRules = copyArray(allSentences);
    findAllSentences();
    breakCounter ++;
    if (breakCounter>50) {
      break;
    }
  }
}
function findAllSentences() {
  for(var ruleName in validSequences) {
    validSequences[ruleName].reset();
  }
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

function preExecuteStep() {
  for (var obj of gamestate.objects) {
    if (obj.move) {
      var moveCoords = getDirCoordsFromDir(obj);
      move(obj, moveCoords);    
    }
  }
  runDeferredMoves();

  var shifts = [];
  for (var obj of gamestate.objects) {
    if (obj.shift) {
      var objsAtPos = findAtPosition(obj.x, obj.y, obj.z);
      for (var shifted of objsAtPos) {
        if (shifted != obj && shifted.float == obj.float)
         shifts.push([shifted, getDirCoordsFromDir(obj)]);
      }
    }
  }
  for (var shift of shifts) {
    var obj = shift[0],
      moveCoords = shift[1];
    if(move(obj, moveCoords)){
      var newPositionObjs = findAtPosition(obj.x+moveCoords.x, obj.y+moveCoords.y, obj.z + moveCoords.z);
      for (var newObj of newPositionObjs) {
        if (newObj.shift) {
          movesToExecute[movesToExecute.length-1].facing = getDirCoordsFromDir(newObj);
        }
      }
    }
  }
  runDeferredMoves();
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
  var actors = [findAtPosition(matchingWord.x, matchingWord.y, matchingWord.z, true)],
      abvSentence = getCharFromActor(matchingWord),
      lastValidActors = [],
      lastActor = matchingWord,
      regexp = new RegExp(ruleName),
      nextWord = findAtPosition(lastActor.x + dir.x, lastActor.y + dir.y, lastActor.z + dir.z, true);
  while (nextWord.length > 0) {
    actors.push(nextWord);
    lastActor = nextWord[0];
    abvSentence += getCharFromActor(lastActor);
    if (regexp.test(abvSentence)) {
      lastValidActors = copyArray(actors);
    }
    nextWord = findAtPosition(lastActor.x + dir.x, lastActor.y + dir.y, lastActor.z + dir.z, true);
  }
  if (lastValidActors.length > 0) {
    var curInds = lastValidActors.map(() => 0);
    var total = lastValidActors.map(a => a.length).reduce((a, b) => a * b); // TODO: this doesn't work for more than one multiple
    for (var i = 0; i < total; i++) {
      var multiplex = [];
      for (var actorInd in lastValidActors) {
        var actor = lastValidActors[actorInd],
            actorMultiplexed = actor[curInds[actorInd]];

        actorMultiplexed.used = actorMultiplexed.used || { r: false, d: false, i: false };

        if (actorMultiplexed.used[coordDirToText(dir)] && i == 0) {
          return;
        }
        if (~ruleVerbs.indexOf(actorMultiplexed.name)) { // Nouns can be used by multiple rules, but not verbs
          actorMultiplexed.used[coordDirToText(dir)] = true;
        }
        multiplex.push(actor[curInds[actorInd]]);
        if (curInds[actorInd] + 1 < actor.length) {  // TODO: this doesn't work for more than one multiple, need to use FOIL or something
          curInds[actorInd] += 1;
        }
      }
      validSequences[ruleName].execute(multiplex, dir);
    }
  }
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

function addActorsToList(actor, list, notted) {
  if (notted) {
    var allOtherNouns = wordMasks.n.filter(n => gamestate.objects.filter(o => o.name == n && n != actor.name).length > 0);
    for (var noun of allOtherNouns) {
      list[noun] = {name : noun};
    }
  } else {
    list[actor.name] = {name : actor.name};
  }
}
function filterByCondition(actors, nouns) {
  if (actors[0].condition) {
    if (actors[0].condition.on) {
      nouns = nouns.filter(n=>{
        var others = [];
        if (~actors[0].condition.on.indexOf("text")) {
          others = findAtPosition(n.x, n.y, n.z, true)
        } else {
          others = findAtPosition(n.x, n.y, n.z, false, true).filter(o=>o!=n && ~actors[0].condition.on.indexOf(o.name));
        }
        return others.length > 0;
      });
    }
  }
  return nouns;
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