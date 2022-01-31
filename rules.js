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
var validSequences = {
    "^(x*n(on)?)(cx*n(on)?)*v((x*n)|(x*a))((cx*n)|(cx*a)|(chn))*$": executeIs,
    "^n(on)?(cn(on)?)*mn(cn)*$": executeMake,
    "^(x*n(on)?)(cx*n(on)?)*h(x*n)(cx*n)*$": executeHas
  },
  validStartingChars = ['x', 'n'];
var runningEqualities = [],
  runningChangeless = [],
  runningAdjectives = [],
  runningNAdjectives = [],
  runningNEqualities = [],
  runningHas = [],
  runningMake = [],
  allSentences = [];
function executeRules() {
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
    applyChanges();
    applyAdjectives();
    for (var actors of runningHas) {
      var hases = gamestate.objects.filter(o=>o.name == actors[0]);
      if (actors[0] == "text") {
        hases = gamestate.words;
      }
      hases.forEach(o=> {
        o.has=o.has || [];
        o.has.push(actors[2]);
      });
      if (actors[0] == "empty") {
        gamestate.empty.has = gamestate.empty.has || [];
        gamestate.empty.has.push(actors[2]);
      }
    }
    for (var actors of runningMake) {
      var makes = gamestate.objects.filter(o=>o.name == actors[0]);
      if (actors[0] == "text") {
        makes = gamestate.words;
      }
      makes.forEach(o=>{
        if (findAtPosition(o.x, o.y, o.z).filter(other => other.name == actors[2]).length == 0) {
          makeNewObjectFromOld(o, actors[2], actors[0] == "text");
        }
      })
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
  runningEqualities = [];
  runningChangeless = [];
  runningAdjectives = [];
  runningNAdjectives = [];
  runningNEqualities = [];
  runningHas = [];
  runningMake = [];
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
function applyChanges() {
  var dereferencedChanges = {};
  for (var actors of runningEqualities) {
    if (~runningChangeless.indexOf(actors[0].name) ||
      runningNEqualities.filter(n=>n[0].name == actors[0].name && n[3] == actors[2]).length>0) {
      continue;
    }
    if (actors[0] == "empty") {bnn
      for (var x = 0; x < gamestate.size.x; x ++) {
        for (var y = 0; y < gamestate.size.y; y ++) {
          for (var z = 0; z < gamestate.size.z; z ++) {
            var locKey = JSON.stringify({ x: x, y: y, z: z });
            var others = findAtPosition(x, y, z);
            if (others.length == 0) {
              dereferencedChanges[locKey] = dereferencedChanges[locKey] || []; 
              dereferencedChanges[locKey].push(actors[2]);
            }
          }
        } 
      }
    } else {
      var filteredObjs = gamestate.objects.filter(o=>o.name == actors[0].name);
      filteredObjs = filterByCondition(actors, filteredObjs);
      for (var obj of filteredObjs) {
        dereferencedChanges[obj.id] = dereferencedChanges[obj.id] || []; 
        dereferencedChanges[obj.id].push(actors[2]);
      }
    }
  }
  var rerunAdjs = false;
  for(var derefId in dereferencedChanges) {
    rerunAdjs = true;
    if (derefId.startsWith("{")) {
      var locKey = JSON.parse(derefId);
      for (var derefName of dereferencedChanges[derefId]) {
        if (derefName != "empty")
          makeNewObjectFromOld(locKey, derefName, derefName == "text");
      }
    } else {
      var obj = gamestate.objects.filter(o=>o.id == derefId)[0];
      removeObj(obj);
      for (var derefName of dereferencedChanges[derefId]) {
        if (derefName != "empty")
          makeNewObjectFromOld(obj, derefName, derefName == "text");
      }
    }
  }
  if (rerunAdjs) {
    applyAdjectives();
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
  if (obj.up) { obj.dir="u";updateObjPosition(obj, getDirCoordsFromDir(obj));}
  if (obj.down) { obj.dir="d";updateObjPosition(obj, getDirCoordsFromDir(obj));}
  if (obj.left) { obj.dir="l";updateObjPosition(obj, getDirCoordsFromDir(obj));}
  if (obj.right) { obj.dir="r";updateObjPosition(obj, getDirCoordsFromDir(obj));}
  if (obj.sink) {
    var objsAtPos = findAtPosition(obj.x, obj.y, obj.z);
    for (var sinking of objsAtPos) {
      if (obj == sinking || obj.float != sinking.float) continue;
      removeObj(obj);
      removeObj(sinking);
    }
  }
  if (obj.weak) {
    var objsAtPos = findAtPosition(obj.x, obj.y, obj.z).filter(o=>o.id != obj.id);
    if (objsAtPos.length > 0) {
      removeObj(obj);
      for (var other of objsAtPos) {
        if (other.weak) {
          removeObj(other); 
        }
      }
      return;
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
  if (obj.fall) {
    var newPositionObjs = findAtPosition(obj.x, obj.y + 1, obj.z).filter(o=>o.push || o.stop);
    while(newPositionObjs.length == 0 &&  !isOutside(obj.x, obj.y+1, obj.z)) {
      obj.y += 1;
      updateObjPosition(obj, getDirCoordsFromDir(obj));
      newPositionObjs = findAtPosition(obj.x, obj.y + 1, obj.z).filter(o=>o.push || o.stop);
    }
  }
  if (obj.tele) {
    var objsAtPos = findAtPosition(obj.x, obj.y, obj.z).filter(o => o.id != obj.id);
    var otherTeles = gamestate.objects.filter(o => o.name == obj.name && o.id != obj.id);
    for (var teled of objsAtPos) {
      if (!teled.teled && teled.float == obj.float) {
        var otherTele = otherTeles[Math.floor(Math.random() * otherTeles.length) ];
        teled.x = otherTele.x;
        teled.y = otherTele.y;
        teled.z = otherTele.z;
        updateObjPosition(teled, getDirCoordsFromDir(teled));
        teled.teled = true;
      }
    }
  }
  if (obj.win) {
    var objsAtPos = findAtPosition(obj.x, obj.y, obj.z);
    if (objsAtPos.filter(o => o.you && o.float == obj.float).length > 0) {
      particle(obj, "yellow", 100, 0.3);
      window.setTimeout(function () {
        window.location = updateURLParameter(window.location.href, "levelid", findLevelByIndex(gamestate.levelId, 1));
      }, 1000);
    }
  }
}
function preExecuteStep() {
  for (var obj of gamestate.objects) {
    if (obj.move) {
      move(obj, getDirCoordsFromDir(obj));
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
    move(shift[0], shift[1]);
  }
  runDeferredMoves();
}
function applyAdjectives(){
  for (var actors of runningAdjectives) {
    if (runningNAdjectives.filter(n=>n[0].name == actors[0].name && n[3] == actors[2]).length>0) {
      continue;
    }
    executeAdjectiveImpl(actors);
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
    rightHas = {},
    rightNAdjs = {},
    isIndex = 0,
    notted = false,
    has = false;
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
    else if (curActor.name == "on") {
      isIndex++;
      curActor = actors[isIndex];
      var conditionalNoun = leftNouns[actors[isIndex-2].name];
      conditionalNoun.condition = conditionalNoun.condition || { on: [], facing: [] };
      conditionalNoun.condition.on.push(curActor.name);
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
    } else if (curActor.name == "has") {
      has = true;
    } else if (curActor.name == "and") {
      continue;
    } else {
      if (getCharFromActor(curActor) == "n") {
        if (has) {
          has = false;
          rightHas[curActor.name] = true;
        } else {
          if (notted)
            rightNNouns[curActor.name] = true;
          else
            rightNouns[curActor.name] = true;
        }
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
      runningAdjectives.push([leftNouns[leftN],"is",rightA]);
    }
    for (var rightNA in rightNAdjs) {
      runningNAdjectives.push([leftNouns[leftN],"is","not",rightNA]);
    }
    for (var rightN in rightNouns) {
      if (leftN == rightN)
        runningChangeless.push(leftN);
      else
        runningEqualities.push([leftNouns[leftN],"is",rightN]);
    }
    for (var rightNN in rightNNouns) {
      runningNEqualities.push([leftNouns[leftN],"is","not",rightNN]);
    }
    for(var rightH in rightHas) {
      runningHas.push([leftNouns[leftN], "has", rightH]);
    }
  }
  executeBase(actors);
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
function executeAdjectiveImpl(actors) {
  var nouns = gamestate.objects.filter(o => o.name == actors[0].name);
  if (actors[0].name == "text") {
    nouns = gamestate.words;
  }
  nouns = filterByCondition(actors, nouns);
  for (var noun of nouns) {
    noun[actors[2]] = true;
    $("#"+noun.id).addClass(actors[2]);
  }
  if (actors[0].name=="empty") {
    gamestate.empty[actors[2]] = true;
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
          others = findAtPosition(n.x, n.y, n.z).filter(o=>o!=n && ~actors[0].condition.on.indexOf(o.name));
        }
        return others.length > 0;
      });
    }
  }
  return nouns;
}
function executeHas(actors, dir) {
  var leftNouns = {},
    rightNouns = {},
    hasIndex = 0,
    notted = false;
  for (hasIndex = 0; hasIndex < actors.length; hasIndex++) {
    var curActor = actors[hasIndex];
    if (curActor.name == "has") {
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
  for (var i = hasIndex+1; i < actors.length; i++) {
    var curActor = actors[i];
    if (curActor.name == "has") { // Left here in case of off by one error?
      break;
    }
    else if (curActor.name == "not") {
      notted = !notted;
    } else if (curActor.name == "and") {
      continue;
    } else {
      if (getCharFromActor(curActor) == "n") {
        addActorsToList(curActor, rightNouns, notted);
        notted = false;
      } 
    }
  }
  for (var leftN in leftNouns) {
    for (var rightN in rightNouns) {
      runningHas.push([leftN, "has", rightN]);
    }
  }
  executeBase(actors);
}
function executeMake(actors, dir) {
  var leftNouns = {},
    rightNouns = {},
    makeIndex = 0,
    notted = false;
  for (makeIndex = 0; makeIndex < actors.length; makeIndex++) {
    var curActor = actors[makeIndex];
    if (curActor.name == "make") {
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
  for (var i = makeIndex+1; i < actors.length; i++) {
    var curActor = actors[i];
    if (curActor.name == "make") { // Left here in case of off by one error?
      break;
    }
    else if (curActor.name == "not") {
      notted = !notted;
    } else if (curActor.name == "and") {
      continue;
    } else {
      if (getCharFromActor(curActor) == "n") {
        addActorsToList(curActor, rightNouns, notted);
        notted = false;
      } 
    }
  }
  for (var leftN in leftNouns) {
    for (var rightN in rightNouns) {
      runningMake.push([leftN, "make", rightN]);
    }
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
  gamestate.empty = {};
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