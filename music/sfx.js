
export function loadAudio(levelId) {
  if (config.playSnd) {
    var audio = $("audio")[0];
    var src = $("audio source").attr("src");
    for (var lvl in window.worlds) {
      if (~window.worlds[lvl].indexOf(levelId) && window.audioMapping[lvl] != src) {
        $("audio source").attr("src", window.audioMapping[lvl]);
        audio.load();
        window.audioLoaded = false;
      }
    }
    if(!window.audioLoaded) {
      window.audioLoaded = true;
      audio.volume=0.66;
      audio.play();
    }
  }
}

export function playSfx(str) {
  if (config.playSnd) {
    window.sndcnt = window.sndcnt || {};
    sndcnt[str] = sndcnt[str] || 0;
    var snd = $("#" + str + sndcnt[str])[0];
    snd.volume = 0.66;
    sndcnt[str]++;
    if (sndcnt[str] == $("."+str+"snd").length)
      sndcnt[str] = 0;
    snd.play();
  }
}
