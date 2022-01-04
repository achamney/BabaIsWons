window.uniqueIds = 0;
window.makebtn = function (tagname, parent, text, left, top, funct, width, height) {
    width = width || 150;
    height = height || 50;
    var ret = makesq(tagname, parent, '', left, top, width, height);
    ret.innerHTML = text;
    ret.onclick = funct;
    return ret;
}
window.makesq = function(tagname, parent, clazz, left, top, width, height, drop) {
    var ret = make(tagname, parent, clazz);
    ret.style.left = left;
    ret.style.top = top ;
    width && (ret.style.width = width);
    height && (ret.style.height = height);
    ret.ondragover = function (e) { e.preventDefault(); };
    ret.ondrop = drop;
    return ret;
}
window.make = function(tagname, parent, clazz, prepend) {
    if (!parent) {
        parent = document.body;
    }
    var el = document.createElement(tagname);
    el.id = "gameid"+(uniqueIds++);
    if (prepend) {
        parent.prepend(el);
    } else {
        parent.appendChild(el);
    }
    if (clazz) {
        var spl = clazz.split(' ');
        for (var i = 0; i < spl.length; i++) {
            if (spl[i] && spl[i] != "") {
                el.classList.add(spl[i]);
            }
        }
    }
    return el;
}
window.delElement = function (el) {
    if (el)
        el.remove(el);
}
window.clear = function(el) {
    el.innerHTML = '';
}
window.get = function(id) {
    return document.getElementById(id);
}

window.clone = function(thing) {
    var newthing = {};
    for (var key in thing) {
        newthing[key] = thing[key];
    }
    return newthing;
}
window.deepClone = function (thing) {
    return JSON.parse(JSON.stringify(thing));
}

window.incTop = function (el, val) {
    el.style.top = parseFloat(el.style.top) + val + "px";
}
window.incLeft = function (el, val) {
    el.style.left = parseFloat(el.style.left) + val + "px";
}
window.updateURLParameter = function(url, param, paramVal){
    var newAdditionalURL = "";
    var tempArray = url.split("?");
    var baseURL = tempArray[0];
    var additionalURL = tempArray[1];
    var temp = "";
    if (additionalURL) {
        tempArray = additionalURL.split("&");
        for (var i=0; i<tempArray.length; i++){
            if(tempArray[i].split('=')[0] != param){
                newAdditionalURL += temp + tempArray[i];
                temp = "&";
            }
        }
    }

    var rows_txt = temp + "" + param + "=" + paramVal;
    return baseURL + "?" + newAdditionalURL + rows_txt;
}