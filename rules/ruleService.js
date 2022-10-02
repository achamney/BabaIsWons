import {findAtPosition, getDirCoordsFromDir} from '../gameService.js'
export var physicalNouns = ["baba", "rock", "wall", "flag", "keke", "water", "skull",
  "lava", "grass", "jelly", "crab", "star", "love", "door", "key", "bolt",
  "box", "tree", "ice", "belt", "rose", "flower", "fire", "ghost", "fungus", "moon"];
export var wordMasks = {
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
export let allSentences = [];

export let isHandler={runningEqualities:[],
    runningChangeless :[],
    runningAdjectives :[],
    runningNAdjectives :[],
    runningNEqualities :[]}
export function getCharFromActor(actor) {
  for (var c in wordMasks) {
    if (~wordMasks[c].indexOf(actor.name)) {
      return c;
    }
  }
  return "l";
}

export function filterByCondition(actors, nouns) {
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

export function addActorsToList(actor, list, notted, lonely) {
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
export function executeBase(actors) {
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
