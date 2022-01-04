let particles = [];
let particleBody, particleBodyDiv;
let w, h, gridx, gridy, gridz;
let maxTime = 30;
function particle(origin, color, number, speed) {
    speed = speed || 1;
    for (var i = 0; i < number; i++) {
        var x = origin.x + 0.3, y = origin.y + 0.3, z = origin.z;
        var p = makesq("div", particleBodyDiv, "particle", x * gridx + z * gridz, y * gridy);
        p.innerHTML = "O";
        p.timer = maxTime;
        p.direction = Math.random() * Math.PI * 2;
        p.speed = Math.random() * speed;
        p.style.color = color;
        p.x = x;
        p.y = y;
        p.z = z;
        particles.push(p);
    }
}
$(document).ready(function () {
    particleBody = $("#gamebody");
    particleBodyDiv = particleBody[0];
    window.setInterval(function () {
        if (gamestate && gamestate.size) {
            w = particleBody.width();
            h = particleBody.height();
            gridx = w / gamestate.size.x / gamestate.size.z;
            gridz = w / gamestate.size.z;
            gridy = h / gamestate.size.y;
        }
        for (var i = particles.length - 1; i >= 0; i--) {
            var p = particles[i];
            p.x += Math.sin(p.direction) * p.speed;
            p.y += Math.cos(p.direction) * p.speed;
            p.style.left = (p.x * gridx)+(p.z * gridz) + "px";
            p.style.top = (p.y * gridy) + "px";
            p.style.opacity = p.timer/maxTime;
            p.timer--;
            if (p.timer <= 0) {
                delElement(p);
                particles.splice(i, 1);
            }
        }
    }, 33);
});