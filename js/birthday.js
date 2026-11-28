// Vidéo d'anniversaire : affichée seulement si le pseudo saisi à la connexion est « samar », une seule fois par appareil.
// Rien ne démarre sans un tap (avec le son).
(function () {
  var KEY = 'a2g-bday-seen', NAME = 'samar';
  var ov = document.getElementById('bday'), built = false;
  var vid, stage, start, sound, err, cf;
  function build() {
    if (built) return; built = true;
    vid = document.getElementById('bday-video'); stage = document.getElementById('bday-stage');
    start = document.getElementById('bday-start'); sound = document.getElementById('bday-sound');
    err = document.getElementById('bday-err'); cf = document.getElementById('bday-confetti');
    var colors = ['#ffd27a', '#ffb347', '#ff8fb1', '#8fd3ff', '#b5f5a6', '#e7a3ff'];
    for (var i = 0; i < 60; i++) {
      var s = document.createElement('span');
      s.style.left = (Math.random() * 100) + '%';
      s.style.background = colors[i % colors.length];
      s.style.animationDuration = (4 + Math.random() * 5) + 's';
      s.style.animationDelay = (Math.random() * 6) + 's';
      cf.appendChild(s);
    }
    start.addEventListener('click', startWithSound);
    sound.addEventListener('click', function () {
      if (vid.paused && !start.hidden) { startWithSound(); return; }
      vid.muted = !vid.muted; setSoundLabel();
    });
    vid.addEventListener('ended', finish);
    vid.addEventListener('error', function () { err.hidden = false; });
    document.getElementById('bday-close').addEventListener('click', function () { try { vid.pause(); } catch (e) {} ov.hidden = true; });
  }
  function setSoundLabel() { sound.textContent = vid.muted ? '🔊 Activer le son' : '🔇 Couper le son'; }
  function finish() {
    try { localStorage.setItem(KEY, '1'); } catch (e) {}
    try { vid.pause(); } catch (e) {}
    ov.hidden = true;
  }
  function startWithSound() {
    vid.muted = false; setSoundLabel(); start.hidden = true;
    var p = vid.play();
    if (p && p.catch) p.catch(function () { start.hidden = false; vid.muted = true; setSoundLabel(); });
  }
  // appelée par la page de connexion, avec le pseudo saisi avant de créer ou rejoindre la salle
  window.bdayStart = function (name) {
    if (!ov) return;
    try { if (localStorage.getItem(KEY) === '1') return; } catch (e) {}
    if (String(name || '').trim().toLowerCase() !== NAME) return;
    build();
    ov.hidden = false;
  };
})();
