import {isRule} from './is.js'
import {makeRule} from './make.js'
import {hasRule} from './has.js'
import {applyAdjectives,removeAllAdjectives,runAdjectiveStep,removeWordAdjectives} from './adjective.js'
import {wordMasks,getCharFromActor,allSentences} from './ruleService.js'
import * as gmSrv from '../gameService.js'

var ruleVerbs = ["is", "has", "make"];
var validSequences = {
    "^(x*(n|l+)(x*on)?)(cx*(n|l+)(x*on)?)*v((x*(n|l+))|(x*(a|l+)))((cx*(n|l+))|(cx*(a|l+))|(ch(n|l+)))*$": isRule,
    "^n(x*on)?(cn(x*on)?)*mn(cn)*$": makeRule,
    "^(x*n(x*on)?)(cx*n(x*on)?)*h(x*n)(cx*n)*$": hasRule
  },
  validStartingChars = ['x', 'l', 'n'];

var nearMask = [{x:1,y:0,z:0},{x:-1,y:0,z:0},{x:0,y:1,z:0},{x:0,y:-1,z:0},{x:1,y:1,z:0},{x:-1,y:-1,z:0},{x:-1,y:1,z:0},{x:1,y:-1,z:0}];
export function executeRules(gameHandler) {
  applyAdjectives();
  preExecuteStep(gameHandler);
  removeAllAdjectives(gamestate);
  var combObjAndWords = gamestate.objects.concat(gamestate.words);
  for (var obj of combObjAndWords) {
    delete obj.teled;
  }
  allSentences.splice(0, allSentences.length); // delete array
  var oldRules = copyArray(allSentences),
    breakCounter = 0;
  findAllSentences();
  while (sentencesHaveChanged(allSentences, oldRules)) {
    removeAllAdjectives(gamestate);
    for (var ruleName in validSequences) {
      validSequences[ruleName].apply(gameHandler);
    }
    for (var i = gamestate.objects.length - 1; i >= 0; i--) {
      var obj = gamestate.objects[i];
      if(obj) // TODO: After two deletions, could run into a deleted object
        runAdjectiveStep(obj, gameHandler);
    }
    for (var i = gamestate.words.length - 1; i >= 0; i--) {
      var obj = gamestate.words[i];
      runAdjectiveStep(obj, gameHandler);
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
  allSentences.splice(0, allSentences.length); // delete array
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

function preExecuteStep(gameHandler) {
  var allThings = gamestate.objects.concat(gamestate.words);
  for (var obj of allThings) {
    if (obj.move) {
      var moveCoords = gmSrv.getDirCoordsFromDir(obj);
      gameHandler.move(obj, moveCoords);
    }
  }
  gameHandler.runDeferredMoves();

  var shifts = [];
  for (var obj of allThings) {
    if (obj.shift) {
      var objsAtPos = gmSrv.findAtPosition(obj.x, obj.y, obj.z);
      for (var shifted of objsAtPos) {
        if (shifted != obj && shifted.float == obj.float)
         shifts.push([shifted, gmSrv.getDirCoordsFromDir(obj)]);
      }
    }
  }
  for (var shift of shifts) {
    var obj = shift[0],
      moveCoords = shift[1];
    if(gameHandler.move(obj, moveCoords)){
      var newPositionObjs = gmSrv.findAtPosition(obj.x+moveCoords.x, obj.y+moveCoords.y, obj.z + moveCoords.z);
      for (var newObj of newPositionObjs) {
        if (newObj.shift) {
          movesToExecute[movesToExecute.length-1].facing = gmSrv.getDirCoordsFromDir(newObj);
        }
      }
    }
  }
  gameHandler.runDeferredMoves();
}
export function isAdjective(name) {
  return ~wordMasks.a.indexOf(name)
}
export function getLockKeyCombos(obj1, objs2) {
  var combos = [];
  for (var obj2 of objs2) {
    if ((obj1.open && obj2.shut) ||
      (obj1.shut && obj2.open)) {
      combos.push({o1:obj1,o2:obj2});
    }
  }
  return combos;
}
function executeRuleDir(matchingWord, ruleName, dir) {
  var actors = [],
      abvSentence = [""],
      lastValidActors = [],
      lastActor = matchingWord,
      regexp = new RegExp(ruleName),
      nextWord = gmSrv.findAtPosition(lastActor.x, lastActor.y, lastActor.z, true);
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
    nextWord = gmSrv.findAtPosition(lastActor.x + dir.x, lastActor.y + dir.y, lastActor.z + dir.z, true);
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

        if (actorMultiplexed.used[gmSrv.coordDirToText(dir)] && i == 0) {
          return;
        }
        if (~ruleVerbs.indexOf(actorMultiplexed.name)) { // Nouns can be used by multiple rules, but not verbs
          actorMultiplexed.used[gmSrv.coordDirToText(dir)] = true;
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
    curActor = gmSrv.findAtPosition(curActor.x + dir.x, curActor.y + dir.y, curActor.z + dir.z, true)[0];
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
export function convertRulesToSimple(rules) {
  rules = rules ? rules : allSentences;
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
