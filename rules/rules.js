var physicalNouns = ["baba", "rock", "wall", "flag", "keke", "water", "skull",
  "lava", "grass", "jelly", "crab", "star", "love", "door", "key", "bolt",
  "box", "tree", "ice", "belt", "rose", "flower", "fire", "ghost", "fungus", "moon"];
var wordMasks = {
  "a": ["you", "stop", "push", "win", "open", "shut", "move", "sink",
    "defeat", "hot", "melt", "swap", "pull", "drop", "shift", "float", 
    "weak", "tele", "red", "blue", "up", "down", "left", "right", 
    "fall", "more", "word"],
  "v": ["is"],
  "m": ["make"],
  "h": ["has"],
  "c": ["and"],
  "x": ["not", "lonely"], /* Lonely here is a bit of a hack. lonely lonely baba is you isn't supposed to be valid*/ 
  "o": ["on", "facing", "near"],
  "n": ["text", "empty", "all", "group", "level"].concat(physicalNouns)
};
var ruleVerbs = ["is", "has", "make"];
var validSequences = {
    "^(x*(n|l+)(x*on)?)(cx*(n|l+)(x*on)?)*v((x*(n|l+))|(x*(a|l+)))((cx*(n|l+))|(cx*(a|l+))|(ch(n|l+)))*$": window.isRule,
    "^n(x*on)?(cn(x*on)?)*mn(cn)*$": window.makeRule,
    "^(x*n(x*on)?)(cx*n(x*on)?)*h(x*n)(cx*n)*$": window.hasRule
  },
  validStartingChars = ['x', 'l', 'n'];

var allSentences = [];
var nearMask = [{x:1,y:0,z:0},{x:-1,y:0,z:0},{x:0,y:1,z:0},{x:0,y:-1,z:0},{x:1,y:1,z:0},{x:-1,y:-1,z:0},{x:-1,y:1,z:0},{x:1,y:-1,z:0}];
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
    removeWordAdjectives(allSentences);
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
  var wordsAndWordAdj = getWordsandWordAdjs();
  wordsAndWordAdj.sort((a,b)=>a.x - b.x);
  for (var ruleName in validSequences) {
    for (var sChar of validStartingChars) {
      var matchingWords = getWordsMatchingMask(wordsAndWordAdj, sChar);
       for (var matchingWord of matchingWords) {
        executeRuleDir(matchingWord, ruleName, { x: 1, y: 0, z: 0 });
       }
    }
  }
  wordsAndWordAdj.sort((a,b)=>a.y - b.y);
  for (var ruleName in validSequences) {
    for (var sChar of validStartingChars) {
      var matchingWords = getWordsMatchingMask(wordsAndWordAdj, sChar);
      for (var matchingWord of matchingWords) {
        executeRuleDir(matchingWord, ruleName, { x: 0, y: 1, z: 0 });
      }
    }
  }
  wordsAndWordAdj.sort((a,b)=>b.z - a.z);
  for (var ruleName in validSequences) {
    for (var sChar of validStartingChars) {
      var matchingWords = getWordsMatchingMask(wordsAndWordAdj, sChar);
      for (var matchingWord of matchingWords) {
        executeRuleDir(matchingWord, ruleName, { x: 0, y: 0, z: -1 });
      }
    }
  }
}

function preExecuteStep() {
  var allThings = gamestate.objects.concat(gamestate.words);
  for (var obj of allThings) {
    if (obj.move) {
      var moveCoords = getDirCoordsFromDir(obj);
      move(obj, moveCoords);    
    }
  }
  runDeferredMoves();

  var shifts = [];
  for (var obj of allThings) {
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
  var actors = [],
      abvSentence = [""],
      lastValidActors = [],
      lastActor = matchingWord,
      regexp = new RegExp(ruleName),
      nextWord = findAtPosition(lastActor.x, lastActor.y, lastActor.z, true);
  while (nextWord.length > 0) {
    for(var wordIndex in nextWord) {
      lastActor = nextWord[wordIndex];
      abvSentence[wordIndex] = abvSentence[wordIndex] == undefined ? ""+abvSentence[wordIndex-1] : abvSentence[wordIndex] ; 
    }
    var nextChar0 = getCharFromActor(nextWord[0]);
    if (nextChar0 == "l") {
      var actorCandidate = getActorFromLetters(nextWord[0], dir);
      if (!actorCandidate) break;
      nextWord = [actorCandidate];
      lastActor = nextWord[0].parentActors[nextWord[0].parentActors.length - 1];
    } 
    actors.push(nextWord);
    for(var sInd in abvSentence) {
      abvSentence[sInd] += getCharFromActor(nextWord[sInd]? nextWord[sInd] : nextWord[sInd-1]);
      if (regexp.test(abvSentence[sInd])) {// TODO: Multi word hack here doesn't work with multiple double words
        lastValidActors = copyArray(actors);
      }
    
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
function getActorFromLetters(actor, dir) {
  var curActor = actor,
    curChar = getCharFromActor(actor),
    builtWord = "",
    parentActors = [],
    allValidWords = [];
  for(var key in wordMasks) {
    allValidWords = allValidWords.concat(wordMasks[key]);
  }
  while (curChar == "l"){
    builtWord+= curActor.name;
    parentActors.push(curActor);
    curActor = findAtPosition(curActor.x + dir.x, curActor.y + dir.y, curActor.z + dir.z, true)[0];
    if(!curActor || ~allValidWords.indexOf(builtWord)){
      break;
    }
    curChar = getCharFromActor(curActor);
  }
  if (~allValidWords.indexOf(builtWord)) {
    var lastParent = parentActors[parentActors.length-1];
    return { name: builtWord, parentActors: parentActors, x:lastParent.x, y:lastParent.y, z:lastParent.z };
  }
  return null;
}
function getCharFromActor(actor) {
  for (var c in wordMasks) {
    if (~wordMasks[c].indexOf(actor.name)) {
      return c;
    }
  }
  return "l";
}
function getWordsandWordAdjs(){
  return gamestate.words.concat(gamestate.objects.filter(o => o.word));
}
function getWordsMatchingMask(wordlist, char) {
  var ret = [];
  for (var word of wordlist) {
    if (getCharFromActor(word) == char) {
      ret.push(word);
    }
  }
  return ret;
}

function addActorsToList(actor, list, notted, lonely) {
  if (notted) {
    var allOtherNouns = wordMasks.n.filter(n => gamestate.objects.filter(o => o.name == n && n != actor.name).length > 0);
    for (var noun of allOtherNouns) {
      list[noun] = {name : noun};
    }
  } else {
    var newNoun = { name: actor.name };
    list[actor.name] = newNoun;
    if (lonely && lonely.active) { // TODO: NOT LONELY vs LONELY NOT
      newNoun.condition = newNoun.condition || { on: [], facing: [] };
      newNoun.condition.on.push({ name: "", prenot: !lonely.not, postnot: true });
    }
  }
}
function filterByCondition(actors, nouns) {
  var condition = actors[0].condition;
  if (condition) {
    if (condition.on) {
      for (var condClause of condition.on) {
        nouns = nouns.filter(n => {
          var others = [];
          if (condClause.name == "text") {
            others = findAtPosition(n.x, n.y, n.z, true).filter(o => o != n);
          } else {
            if (condClause.postnot) {
              others = findAtPosition(n.x, n.y, n.z, false, true).filter(o => o != n && condClause.name != o.name);
            } else {
              others = findAtPosition(n.x, n.y, n.z, false, true).filter(o => o != n && condClause.name == o.name);
            }
          }
          return condClause.prenot ? (others.length == 0) : (others.length > 0);
        });
      }
    }
    if (condition.facing) {
      for (var condClause of condition.facing) {
        nouns = nouns.filter(n => {
          var dir = getDirCoordsFromDir(n);
          var others = [];
          if (condClause.name == "text") {
            others = findAtPosition(n.x + dir.x, n.y + dir.y, n.z + dir.z, true)
          } else {
            others = findAtPosition(n.x + dir.x, n.y + dir.y, n.z + dir.z, false, true).filter(o => o != n && condClause.name == o.name);
          }
          return condClause.prenot ? (others.length == 0) : (others.length > 0);
        });
      }
    }
    if (condition.near) {
      for (var condClause of condition.near) {
        nouns = nouns.filter(n => {
          var isNear = false;
          for (var dir of nearMask) {
            var others = [];
            if (condClause.name == "text") {
              others = findAtPosition(n.x + dir.x, n.y + dir.y, n.z + dir.z, true)
            } else {
              others = findAtPosition(n.x + dir.x, n.y + dir.y, n.z + dir.z, false, true).filter(o => o != n && condClause.name == o.name);
            }
            isNear = others.length > 0 ? true : isNear;
          }
          return condClause.prenot ? !isNear : isNear;
        });
      }
    }
  }
  return nouns;
}

function executeBase(actors) {
  for (var actor of actors) {
    if (actor.parentActors) {
      for (var pactor of actor.parentActors) { // Cant just recurse, don't want to add these to allSentences
        $("#"+pactor.id).addClass("active");
      }
    } else {
      $("#"+actor.id).addClass("active");
    }
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