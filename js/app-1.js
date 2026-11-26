
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var KEY = "samaraf-theme", WPKEY = "samaraf-wp";
  var PRESETS = [
    { n: "Nuit", c: ["#12111a", "#1f1a33", "#33203a"], a: 160, ac: "#ffb347", d: 0 },
    { n: "Coucher de soleil", c: ["#2b1055", "#c0392b", "#ff9a3c"], a: 160, ac: "#ffd166", d: 25 },
    { n: "Océan", c: ["#021b2e", "#0b4f6c", "#20a4a8"], a: 170, ac: "#7ee8d4", d: 10 },
    { n: "Aurore", c: ["#0f2027", "#2c5364", "#7b2ff7"], a: 150, ac: "#5fd3c4", d: 10 },
    { n: "Forêt", c: ["#0b1a12", "#1e4d2b", "#7a9e3a"], a: 165, ac: "#c8f26b", d: 15 },
    { n: "Rose néon", c: ["#1a0a2e", "#7a1fa2", "#ff3d81"], a: 155, ac: "#ff8fb8", d: 15 },
    { n: "Braise", c: ["#140806", "#5c1a0b", "#d9480f"], a: 165, ac: "#ffb347", d: 10 },
    { n: "Minuit", c: ["#05060f", "#10204a", "#3a2a7a"], a: 160, ac: "#8ab4ff", d: 0 }
  ];
  var DEF = { c: PRESETS[0].c.slice(), a: PRESETS[0].a, ac: PRESETS[0].ac, d: 0, p: 80, fit: "cover", ts: 0, wpId: "", sync: true };
  var theme = JSON.parse(JSON.stringify(DEF)), wp = null, opener = null;
  var wpHave = "", send = null, getConns = function () { return []; }, notifyFn = null, amHost = function () { return false; }, pushT = null, wpBuf = null;
  var sendingWp = false, queuedWp = false, lastNote = 0, lastSent = { id: "", at: 0 }, CH = 30000;

  function isHex(s) { return typeof s === "string" && /^#[0-9a-f]{6}$/i.test(s); }
  function clamp(v, a, b, def) { v = +v; return isFinite(v) ? Math.min(b, Math.max(a, v)) : def; }
  function ink(hex) {
    var n = parseInt(hex.slice(1), 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return (0.299 * r + 0.587 * g + 0.114 * b) > 150 ? "#2a1a00" : "#ffffff";
  }
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var t = JSON.parse(raw);
        if (t && Array.isArray(t.c) && t.c.length >= 3 && t.c.slice(0, 3).every(isHex)) theme.c = t.c.slice(0, 3);
        theme.a = clamp(t.a, 0, 360, DEF.a);
        if (isHex(t.ac)) theme.ac = t.ac;
        theme.d = clamp(t.d, 0, 85, 0);
        theme.p = clamp(t.p, 40, 100, 80);
        theme.fit = t.fit === "stretch" ? "stretch" : "cover";
        theme.ts = clamp(t.ts, 0, 9e15, 0);
        theme.wpId = (typeof t.wpId === "string" && /^[\w-]{1,32}$/.test(t.wpId)) ? t.wpId : "";
        theme.sync = true;
      }
    } catch (e) {}
    try { wp = localStorage.getItem(WPKEY) || null; if (wp && wp.indexOf("data:image/") !== 0) wp = null; } catch (e) { wp = null; }
    if (wp && !theme.wpId) theme.wpId = newId();
    if (!wp) theme.wpId = "";
    wpHave = wp ? theme.wpId : "";
  }
  // un ami connecté à une salle ne peut pas changer le thème : c'est celui de l'hôte
  function locked() { return !amHost() && getConns().length > 0; }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(theme)); } catch (e) {} }

  function apply() {
    var r = document.documentElement.style, c = theme.c;
    var grad = "linear-gradient(" + theme.a + "deg," + c[0] + "," + c[1] + "," + c[2] + ")";
    r.setProperty("--bg-grad", grad);
    r.setProperty("--accent", theme.ac);
    r.setProperty("--accent-ink", ink(theme.ac));
    r.setProperty("--pa", String(theme.p / 100));
    r.setProperty("--dim", String(theme.d / 100));
    [$("bg"), $("bgfs")].forEach(function (el) {
      if (!el) return;
      var w = el.querySelector(".wp");
      w.style.backgroundImage = wp ? 'url("' + wp + '")' : "none";
      w.style.backgroundSize = theme.fit === "stretch" ? "100% 100%" : "cover";
    });
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute("content", c[0]);
    $("t-prev").style.background = grad;
  }
  function syncUI() {
    ["t-c0", "t-c1", "t-c2"].forEach(function (id, i) { $(id).value = theme.c[i]; });
    $("t-ac").value = theme.ac;
    $("t-ang").value = theme.a; $("t-ang-v").textContent = theme.a + "°";
    $("t-dim").value = theme.d; $("t-dim-v").textContent = theme.d + " %";
    $("t-pa").value = theme.p; $("t-pa-v").textContent = theme.p + " %";
    $("t-fit").value = theme.fit;
    Array.prototype.forEach.call($("t-presets").children, function (b, i) {
      b.classList.toggle("on", PRESETS[i].c.join() === theme.c.join() && PRESETS[i].a === theme.a);
    });
    var lk = locked();
    Array.prototype.forEach.call($("tmodal").querySelectorAll("input,select,button"), function (el) { if (el.id !== "t-close") el.disabled = lk; });
    $("t-nowp").disabled = lk || !wp;
    if (lk) say("Le thème est choisi par l'hôte de la salle.");
  }
  // changement fait par moi : date mise à jour, puis envoyé à l'ami (regroupé pour ne pas inonder le canal pendant un glissement de curseur)
  function commit() { if (locked()) return; theme.ts = Date.now(); apply(); save(); syncUI(); pushTheme(); }
  function say(t) { $("t-msg").textContent = t; }

  /* ---------- fond d'écran : réduit pour le téléphone, puis enregistré ---------- */
  function loadImage(file) {
    return new Promise(function (res, rej) {
      var u = URL.createObjectURL(file), im = new Image();
      im.onload = function () { URL.revokeObjectURL(u); res(im); };
      im.onerror = function () { URL.revokeObjectURL(u); rej(new Error("img")); };
      im.src = u;
    });
  }
  function shrink(im, max, q) {
    var w = im.naturalWidth, h = im.naturalHeight, s = Math.min(1, max / Math.max(w, h));
    var cv = document.createElement("canvas");
    cv.width = Math.max(1, Math.round(w * s)); cv.height = Math.max(1, Math.round(h * s));
    var x = cv.getContext("2d");
    x.fillStyle = "#000"; x.fillRect(0, 0, cv.width, cv.height);
    x.drawImage(im, 0, 0, cv.width, cv.height);
    return cv.toDataURL("image/jpeg", q);
  }
  function setWallpaper(file) {
    if (!file || locked()) return;
    say("Préparation de l'image…");
    loadImage(file).then(function (im) {
      var tries = [[1440, 0.75], [1080, 0.65], [800, 0.55]], data = null, stored = false;
      for (var i = 0; i < tries.length && !stored; i++) {
        data = shrink(im, tries[i][0], tries[i][1]);
        try { localStorage.setItem(WPKEY, data); stored = true; } catch (e) {}
      }
      if (!stored) { try { localStorage.removeItem(WPKEY); } catch (e) {} }
      wp = data; theme.wpId = newId(); wpHave = theme.wpId;
      if (theme.d < 25) theme.d = 35;
      commit();
      say(stored ? "Fond d'écran enregistré sur cet appareil." : "Image trop lourde pour être enregistrée : elle ne sera gardée que jusqu'à la fermeture de la page.");
    }, function () { say("Image illisible. Essaie un fichier JPG ou PNG."); });
  }

  /* ---------- interface ---------- */
  PRESETS.forEach(function (p) {
    var b = document.createElement("button");
    b.type = "button"; b.className = "tpreset"; b.textContent = p.n;
    b.style.background = "linear-gradient(" + p.a + "deg," + p.c.join(",") + ")";
    b.addEventListener("click", function () {
      theme.c = p.c.slice(); theme.a = p.a; theme.ac = p.ac;
      if (!wp) theme.d = p.d;
      commit();
    });
    $("t-presets").appendChild(b);
  });
  ["t-c0", "t-c1", "t-c2"].forEach(function (id, i) {
    $(id).addEventListener("input", function () { theme.c[i] = this.value; commit(); });
  });
  $("t-ac").addEventListener("input", function () { theme.ac = this.value; commit(); });
  $("t-ang").addEventListener("input", function () { theme.a = clamp(this.value, 0, 360, 160); commit(); });
  $("t-dim").addEventListener("input", function () { theme.d = clamp(this.value, 0, 85, 0); commit(); });
  $("t-pa").addEventListener("input", function () { theme.p = clamp(this.value, 40, 100, 80); commit(); });
  $("t-fit").addEventListener("change", function () { theme.fit = this.value === "stretch" ? "stretch" : "cover"; commit(); });
  $("t-pick").addEventListener("click", function () { $("t-file").click(); });
  $("t-file").addEventListener("change", function (e) { setWallpaper(e.target.files[0]); e.target.value = ""; });
  $("t-nowp").addEventListener("click", function () {
    if (locked()) return;
    wp = null;
    try { localStorage.removeItem(WPKEY); } catch (e) {}
    theme.wpId = ""; wpHave = ""; commit(); say("Image retirée.");
  });
  $("t-reset").addEventListener("click", function () {
    if (locked()) return;
    var keep = theme.sync; theme = JSON.parse(JSON.stringify(DEF)); theme.sync = keep; wp = null; wpHave = "";
    try { localStorage.removeItem(WPKEY); } catch (e) {}
    commit(); say("Thème d'origine rétabli.");
  });
  function openTheme(from) {
    opener = from; syncUI();
    $("tmodal").hidden = false;
    $("t-close").focus();
  }
  function closeTheme() {
    $("tmodal").hidden = true;
    if (opener && opener.focus) { try { opener.focus(); } catch (e) {} }
  }
  $("btn-theme").addEventListener("click", function () { openTheme(this); });
  $("home-theme").addEventListener("click", function () { openTheme(this); });
  $("t-close").addEventListener("click", closeTheme);
  $("tmodal").addEventListener("click", function (e) { if (e.target === this) closeTheme(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !$("tmodal").hidden) closeTheme(); });

  /* ---------- synchronisation avec l'ami ----------
     - 'theme'   : couleurs et réglages + date de modification + identifiant du fond d'écran
     - 'wpneed'  : demande du fond d'écran (celui qui l'a l'envoie)
     - 'wpchunk' : morceaux de l'image (30 000 caractères), envoyés avec contrôle du débit
     La modification la plus récente gagne. Tout ce qui est reçu est vérifié avant d'être utilisé. */
  function newId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function pushTheme() {
    if (!amHost() || !send) return;
    clearTimeout(pushT);
    pushT = setTimeout(function () { if (getConns().length) send(snapshot()); }, 300);
  }
  function snapshot() {
    if (!amHost()) return null;                                   // seul l'hôte envoie son thème
    return { t: "theme", th: { c: theme.c.slice(), a: theme.a, ac: theme.ac, d: theme.d, p: theme.p, fit: theme.fit }, ts: theme.ts, wpId: theme.wpId };
  }
  function ask(id, n) {
    if (!send || !theme.sync || wpHave === id || theme.wpId !== id) return;
    n = n || 0;
    send({ t: "wpneed", id: id });
    if (n < 3) setTimeout(function () { if (theme.wpId === id && wpHave !== id) ask(id, n + 1); }, 8000);
  }
  function maxBuffered() {
    var m = 0;
    getConns().forEach(function (c) { try { if (c.dataChannel && c.dataChannel.bufferedAmount > m) m = c.dataChannel.bufferedAmount; } catch (e) {} });
    return m;
  }
  async function sendWp() {
    if (!send || !wp || !theme.sync || !wpHave) return;
    if (sendingWp) { queuedWp = true; return; }
    sendingWp = true;
    var id = wpHave, data = wp, n = Math.ceil(data.length / CH);
    try {
      for (var i = 0; i < n; i++) {
        if (id !== wpHave) break;                                   // le fond a changé entre-temps
        for (var k = 0; k < 400 && maxBuffered() > 1048576; k++) await new Promise(function (r) { setTimeout(r, 25); });
        send({ t: "wpchunk", id: id, i: i, n: n, s: data.slice(i * CH, (i + 1) * CH) });
      }
    } catch (e) {}
    sendingWp = false;
    if (queuedWp) { queuedWp = false; if (wpHave !== id) sendWp(); }
  }
  function receive(d, from) {
    if (!d) return;
    if (d.t === "theme") {
      if (amHost()) return;                                                            // l'hôte ne reçoit jamais de thème
      var t = d.th;
      if (!t) return;
      if (!Array.isArray(t.c) || t.c.length < 3 || !t.c.slice(0, 3).every(isHex) || !isHex(t.ac)) return;
      theme.c = t.c.slice(0, 3); theme.ac = t.ac;
      theme.a = clamp(t.a, 0, 360, 160); theme.d = clamp(t.d, 0, 85, 0); theme.p = clamp(t.p, 40, 100, 80);
      theme.fit = t.fit === "stretch" ? "stretch" : "cover";
      theme.ts = typeof d.ts === "number" ? d.ts : Date.now();
      var wid = (typeof d.wpId === "string" && /^[\w-]{1,32}$/.test(d.wpId)) ? d.wpId : "";
      theme.wpId = wid;
      if (!wid) { wp = null; wpHave = ""; try { localStorage.removeItem(WPKEY); } catch (e) {} }
      apply(); save(); syncUI();
      if (wid && wpHave !== wid) ask(wid);                                              // l'ancien fond reste affiché jusqu'à l'arrivée du nouveau
      var now = Date.now();
      if (notifyFn && now - lastNote > 4000) { lastNote = now; notifyFn("Le thème de l'hôte est appliqué."); }
    } else if (d.t === "wpneed") {
      if (!amHost()) return;
      if (typeof d.id !== "string" || d.id !== wpHave || !wp) return;
      var n2 = Date.now();
      if (lastSent.id === d.id && n2 - lastSent.at < 4000) return;                      // déjà en cours d'envoi
      lastSent = { id: d.id, at: n2 };
      sendWp();
    } else if (d.t === "wpchunk") {
      if (amHost()) return;
      if (d.id !== theme.wpId || d.id === wpHave || typeof d.s !== "string") return;
      if (!(d.n > 0 && d.n <= 120) || !(d.i >= 0 && d.i < d.n) || d.s.length > CH + 10) return;
      if (!wpBuf || wpBuf.id !== d.id) wpBuf = { id: d.id, n: d.n, parts: [], got: 0 };
      if (wpBuf.parts[d.i] == null) { wpBuf.parts[d.i] = d.s; wpBuf.got++; }
      if (wpBuf.got === wpBuf.n) {
        var data = wpBuf.parts.join(""); wpBuf = null;
        if (data.length < 3e6 && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+\/=]+$/.test(data)) {
          wp = data; wpHave = d.id;
          try { localStorage.setItem(WPKEY, data); } catch (e) {}
          apply(); syncUI();
        }
      }
    }
  }
  window.__theme = {
    bind: function (fnSend, fnConns, fnNote, fnHost) { send = fnSend; getConns = fnConns; notifyFn = fnNote; if (fnHost) amHost = fnHost; },
    refresh: function () { syncUI(); },
    snapshot: snapshot,
    receive: receive
  };

  load(); apply();
})();
