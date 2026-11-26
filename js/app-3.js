
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var video = $('video'), layout = $('layout');
  var plyrPlayer = null;
  if (window.Plyr) {
    plyrPlayer = new Plyr(video, {
      controls: ['play-large', 'rewind', 'play', 'fast-forward', 'progress', 'current-time', 'duration', 'mute', 'volume', 'captions', 'settings', 'fullscreen'],
      settings: ['captions'],
      seekTime: 10,
      i18n: { rewind: 'Reculer de {seektime} s', fastForward: 'Avancer de {seektime} s' },
      fullscreen: { enabled: true, fallback: true, iosNative: false },
      captions: { active: true, update: true },
      keyboard: { focused: true, global: false },
      tooltips: { controls: false, seek: true }
    });
    // plein écran du lecteur lui-même (bouton Plyr) : même rotation automatique sur téléphone
    plyrPlayer.on('enterfullscreen', function () {
      if (isFs()) return;                                  // c'est la salle entière qui est en plein écran : gérée ailleurs
      // plein écran du lecteur = vidéo seule (sans chat) ; on ne pivote en paysage que si la vidéo est en paysage
      if (!videoLandscape()) return;
      try { if (window.matchMedia('(pointer: coarse)').matches && screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(function () {}); } catch (e) {}
    });
    plyrPlayer.on('exitfullscreen', function () {
      if (isFs() || orient.want) return;
      try { if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); } catch (e) {}
    });
  }
  var PREFIX = 'samaraf-series-';
  var CH = 65536;                       // taille d'un morceau envoyé
  var peer = null, conns = [], isHost = false, myName = '', roomCode = '', roomId = '', myDev = '', inviteMode = false;
  var localFile = null, hasVideo = false;
  var qFor = {};
  var switchingUntil = 0, subsText = '', applyingUntil = 0, pendingState = null, toastTimer = null, wakeLock = null;
  var lastUserInput = 0, pointerDown = false, pseudoFs = false;
  var lastErrAt = 0;
  var myCid = (function () {                 // identifiant propre à cet onglet : une reconnexion remplace l'ancienne connexion
    try { var k = sessionStorage.getItem('samaraf-cid'); if (!k) { k = Math.random().toString(36).slice(2, 10); sessionStorage.setItem('samaraf-cid', k); } return k; }
    catch (e) { return Math.random().toString(36).slice(2, 10); }
  })();
  var joinedOnce = false, noReconnect = false, lastTry = 0, typers = {}, lastTypingSent = 0;
  var hadGuest = false, emptySince = 0, EMPTY_LIMIT = 60000, closing = false;   // plus personne en ligne depuis plus d'une minute : le salon se ferme
  var history = [], seenMids = {}, msgSeq = 0, lostShown = false, lastResume = 0, lastUnavail = 0;
  var remote = { playing: false, time: 0, at: 0, known: false };   // dernier état connu de la source
  // diffusion live : l'hôte capture sa vidéo et l'envoie à chaque ami ; l'ami la reçoit en flux live
  var rtcBroadcaster = null, rtcViewer = null, liveMode = false;
  var roomMode = 'stream', xferId = 0, rx = null;   // mode de la salle (stream | file), id d'envoi, réception en cours
  function qLive(pid) {
    var v = QUALS[qFor[pid] || DEF_Q] || QUALS[DEF_Q], a = AUDIO[aFor[pid] || DEF_A] || AUDIO[DEF_A];
    return { h: v.h, bps: v.bps, abps: a.bps };
  }
  function sendRtc(pid, m) {
    var c = openConns().find(function (x) { return x.peer === pid; });
    if (c) { try { c.send({ t: 'rtc', m: m }); } catch (e) {} }
  }
  function hostCapture() {
    if (screenStream || !localFile || roomMode !== 'stream' || !video.captureStream) return;
    var s = video.captureStream();
    if (!s) return;
    if (rtcBroadcaster) rtcBroadcaster.stop();
    rtcBroadcaster = new RTCCore.Broadcaster(s, sendRtc, qLive);
    holdScreen(true);
    openConns().forEach(function (c) { rtcBroadcaster.addViewer(c.peer).catch(function (err) { console.error('[diffusion]', err); }); });
  }
  // ---------- partage d'écran (hôte, ordinateur uniquement) ----------
  var screenStream = null;
  function canScreen() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) && !!(window.matchMedia && matchMedia('(pointer: fine)').matches);
  }
  function updateScreenBtn() {
    var ok = !!(isHost && canScreen());
    var k = screenStream ? 'scr_stop2' : 'scr_label';
    var t = $('src-screen'), m = $('pf-screen');
    if (t) { t.hidden = !ok; var lb = t.querySelector('.slbl'); lb.setAttribute('data-i18n', k); lb.textContent = tr(k); }
    if (m) { m.hidden = !ok; m.setAttribute('data-i18n', k); m.textContent = tr(k); }
  }
  function endScreenTracks() {                     // arrête la capture d'écran sans rien relancer (fermeture de la salle)
    if (!screenStream) return;
    screenStream.getTracks().forEach(function (t) { try { t.stop(); } catch (e) {} });
    screenStream = null;
  }
  async function startScreen() {
    if (!isHost || !canScreen() || screenStream) return;
    var st;
    try { st = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: true }); }
    catch (e) { addMsg('', tr('scr_refused'), 'sys'); return; }
    if (!st || !st.getVideoTracks().length) { addMsg('', tr('scr_refused'), 'sys'); return; }
    screenStream = st;
    st.getVideoTracks()[0].addEventListener('ended', stopScreen);   // arrêt via la barre du navigateur
    if (rtcBroadcaster) rtcBroadcaster.stop();
    rtcBroadcaster = new RTCCore.Broadcaster(st, sendRtc, qLive);
    holdScreen(true);
    openConns().forEach(function (c) { rtcBroadcaster.addViewer(c.peer).catch(function (err) { console.error('[diffusion]', err); }); });
    try { video.srcObject = st; video.muted = true; video.play().catch(function () {}); } catch (e) {}   // aperçu chez l'hôte
    hasVideo = true; $('drop').hidden = true; layout.classList.add('livemode');
    updateScreenBtn();
    addMsg('', tr('scr_on'), 'sys');
  }
  function stopScreen() {
    if (!screenStream) return;
    endScreenTracks();
    if (rtcBroadcaster) { rtcBroadcaster.stop(); rtcBroadcaster = null; }
    try { video.srcObject = null; } catch (e) {}
    holdScreen(sendsActive > 0);
    if (localFile && roomMode === 'stream') { hostCapture(); }                         // retour à la vidéo chargée
    else { hasVideo = false; layout.classList.remove('livemode'); }
    updateScreenBtn();
    addMsg('', tr('scr_off'), 'sys');
  }
  $('src-screen').addEventListener('click', function () { if (screenStream) stopScreen(); else startScreen(); });
  $('pf-screen').addEventListener('click', function () { closeYtPanel(); if (screenStream) stopScreen(); else startScreen(); });
  function rtcServe(pid) {
    if (!(localFile || screenStream) || !rtcBroadcaster || roomMode !== 'stream') return;
    if (rtcBroadcaster.conns[pid]) rtcBroadcaster.setQuality(pid);
    else rtcBroadcaster.addViewer(pid).catch(function (err) { console.error('[diffusion]', err); });
  }
  function rtcViewerEnsure() {
    if (!rtcViewer) rtcViewer = new RTCCore.Viewer(video, sendRtc);
    rtcViewer.onStream = onLiveStream;
    return rtcViewer;
  }
  function onLiveStream() {
    if (localFile) return;
    liveMode = true; hasVideo = true; layout.classList.add('livemode');
    $('drop').hidden = true;
    curQ = myQ;
    renderQ();
    if (pendingState) { var p = pendingState; pendingState = null; applyState(p); }
    else if (remote.known && remote.playing && video.paused) tryPlay();
  }
  video.addEventListener('loadeddata', function () { if (localFile) hostCapture(); });
  video.addEventListener('loadedmetadata', function () { if (localFile) origH = video.videoHeight || origH; });

  /* ---------- utilitaires ---------- */
  function genCode() {
    var a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', s = '';
    for (var i = 0; i < 6; i++) s += a[Math.floor(Math.random() * a.length)];
    return s;
  }
  function peerId(id) { return PREFIX + String(id); }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  // Mode fichier complet : l'hôte envoie le fichier entier sur une connexion dédiée, par morceaux de 64 Ko
  var sendsActive = 0, sendConn = {};
  var sendHidden = false;
  function anyReady() { return openConns().some(function (c) { return c.ready; }); }
  // ami prêt à lire (il l'annonce toutes les 1,5 s) : l'écran d'envoi de l'hôte disparaît
  setInterval(function () {
    if (!isHost || roomMode !== 'file' || !localFile || sendHidden || $('drop').hidden || !anyReady()) return;
    sendHidden = true; $('drop').hidden = true;
  }, 1000);
  // ami : indique à l'hôte s'il peut lire la vidéo
  setInterval(function () {
    if (isHost || roomMode !== 'file') return;
    var oc = openConns(); if (!oc.length) return;
    try { oc[0].send({ t: 'ready', ok: hasVideo && video.readyState >= 2 }); } catch (e) {}
  }, 1500);
  var WINDOW = 32;   // morceaux envoyés sans accusé de réception (32 × 64 Ko = 2 Mo)
  function mbTxt(b) { return (b / 1048576).toFixed(1) + ' Mo'; }
  // message système affiché au plus une fois par période (évite d'inonder le chat)
  var sysAt = {};
  function sysOnce(key, text, gap) {
    var n = Date.now();
    if (sysAt[key] && n - sysAt[key] < (gap || 60000)) return;
    sysAt[key] = n; addMsg('', text, 'sys');
  }
  // progression du transfert : discrète, dans la barre sous la vidéo (rien dans le chat, rien par-dessus la vidéo)
  function setXfer(text) {
    var x = $('xfer');
    if (!text) { x.hidden = true; x.textContent = ''; return; }
    x.hidden = false; x.textContent = text;
  }
  function fmtT(s) {
    s = Math.max(0, Math.floor(s));
    var h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60;
    return (h ? h + ':' + (m < 10 ? '0' : '') + m : m) + ':' + (x < 10 ? '0' : '') + x;
  }
  /* Réorganisation MP4 « faststart » : l'index (moov) est placé avant les données, pour que l'ami puisse
     lire la vidéo pendant la réception. Le contenu est identique et la taille ne change pas. */
  var fastCache = null;
  function prepareSend(f) {
    if (!fastCache || fastCache.src !== f) {
      var fc = { src: f, file: null };
      fc.p = faststart(f).then(function (r) { fc.file = r; return r; }, function () { fc.file = f; return f; });
      fastCache = fc;
    }
    return fastCache;
  }
  async function faststart(f) {
    var boxes = [], pos = 0, dv0;
    var FREE = { ftyp: 1, free: 1, skip: 1, wide: 1, pdin: 1 };
    while (pos + 8 <= f.size) {
      dv0 = new DataView(await f.slice(pos, Math.min(f.size, pos + 16)).arrayBuffer());
      var size = dv0.getUint32(0), hl = 8;
      var type = String.fromCharCode(dv0.getUint8(4), dv0.getUint8(5), dv0.getUint8(6), dv0.getUint8(7));
      if (size === 1) { if (dv0.byteLength < 16) break; size = dv0.getUint32(8) * 4294967296 + dv0.getUint32(12); hl = 16; }
      else if (size === 0) size = f.size - pos;
      if (size < hl || pos + size > f.size) return f;                    // structure inconnue : on envoie tel quel
      boxes.push({ type: type, start: pos, size: size });
      pos += size;
    }
    var moov = null, mdat = null;
    boxes.forEach(function (b) { if (b.type === 'moov' && !moov) moov = b; if (b.type === 'mdat' && !mdat) mdat = b; });
    if (!moov || !mdat || moov.start < mdat.start) return f;            // déjà optimisé ou pas de données avant : rien à faire
    if (moov.size > 33554432) return f;                                  // index anormalement gros : on n'y touche pas
    var mb = new Uint8Array(await f.slice(moov.start, moov.start + moov.size).arrayBuffer());
    var dv = new DataView(mb.buffer), delta = moov.size, CONT = { moov: 1, trak: 1, mdia: 1, minf: 1, stbl: 1, edts: 1 };
    function str4(p) { return String.fromCharCode(dv.getUint8(p), dv.getUint8(p + 1), dv.getUint8(p + 2), dv.getUint8(p + 3)); }
    // une position d'origine située avant l'index se décale de la taille de l'index
    function shift(v) { return v < moov.start ? v + delta : v; }
    function walk(a, b) {
      var p = a;
      while (p + 8 <= b) {
        var sz = dv.getUint32(p), t = str4(p + 4), h = 8;
        if (sz === 1) { sz = dv.getUint32(p + 8) * 4294967296 + dv.getUint32(p + 12); h = 16; }
        else if (sz === 0) sz = b - p;
        if (sz < h || p + sz > b) return;
        if (CONT[t]) walk(p + h, p + sz);
        else if (t === 'stco') {
          var n = dv.getUint32(p + 12);
          for (var i = 0; i < n; i++) { var o = p + 16 + i * 4; dv.setUint32(o, shift(dv.getUint32(o))); }
        } else if (t === 'co64') {
          var n6 = dv.getUint32(p + 12);
          for (var j = 0; j < n6; j++) {
            var q = p + 16 + j * 8, total = dv.getUint32(q) * 4294967296 + dv.getUint32(q + 4);
            total = shift(total);
            dv.setUint32(q, Math.floor(total / 4294967296)); dv.setUint32(q + 4, total % 4294967296);
          }
        }
        p += sz;
      }
    }
    walk(0, mb.length);
    // on place l'index juste après les en-têtes de début (ftyp, free…)
    var ins = 0;
    boxes.forEach(function (b) { if (b.start === ins && FREE[b.type]) ins = b.start + b.size; });
    if (ins >= moov.start) return f;
    return new File([f.slice(0, ins), mb, f.slice(ins, moov.start), f.slice(moov.start + moov.size)], f.name, { type: f.type });
  }
  /* Wake Lock : garde l'écran allumé pendant un envoi ou une diffusion, pour que le transfert ne soit pas gelé */
  async function holdScreen(on) {
    try {
      if (on && 'wakeLock' in navigator && !wakeLock) {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', function () { wakeLock = null; });
      } else if (!on && wakeLock) {
        var w = wakeLock; wakeLock = null; await w.release();
      }
    } catch (e) { wakeLock = null; }
  }
  // le navigateur relâche le verrou quand on change d'onglet : on le reprend au retour
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && (sendsActive > 0 || rtcBroadcaster || !$('room').hidden)) holdScreen(true);
  });
  function sendWholeFile(pid, tries, from) {
    tries = tries || 0; from = Math.floor((from || 0) / 65536) * 65536;
    if (!localFile || !peer || roomMode !== 'file') return;
    if (!openConns().some(function (o) { return o.peer === pid && !o.dead; })) return;   // ami parti : on n'envoie plus rien
    sendHidden = false;
    holdScreen(true);
    var fc = prepareSend(localFile);
    if (!fc.file) { fc.p.then(function () { sendWholeFile(pid, tries, from); }); return; }
    var f = fc.file, id = xferId;
    var who = (conns.find(function (x) { return x.peer === pid; }) || {}).peerName || 'ton ami';
    if (sendConn[pid]) { sendConn[pid].dead = true; try { sendConn[pid].close(); } catch (e) {} }
    var c = peer.connect(pid, { label: 'file', serialization: 'raw', reliable: true });
    sendConn[pid] = c; c.actAt = Date.now(); c.xid = id;
    // si la connexion d'envoi ne s'ouvre pas en 25 s, on recommence (jusqu'à 5 essais, avec une pause plus longue à chaque fois)
    var openTimer = setTimeout(function () {
      if (c.open || c.dead || id !== xferId) return;
      c.dead = true; try { c.close(); } catch (e) {}
      if (tries < 4) {
        setTimeout(function () { sendWholeFile(pid, tries + 1, from); }, 2000 * (tries + 1));
      } else {
        sysOnce('sendfail', "Impossible d'ouvrir la connexion d'envoi. Change de réseau (Wi-Fi ou données) ou demande à ton ami de recharger la page.", 60000);
      }
    }, 25000);
    var acked = from / 65536, lastAckAt = Date.now();
    c.on('data', function (d) {
      if (typeof d !== 'string') return;
      try { var m = JSON.parse(d); if (m.k === 'ack' && m.id === id && m.n > acked) { acked = m.n; lastAckAt = Date.now(); c.actAt = lastAckAt; } } catch (e) {}
    });
    c.on('open', async function () {
      clearTimeout(openTimer);
      sendsActive++;
      var lastPct = -1;
      function show(bytes) {
        var pct = Math.min(100, 100 * bytes / f.size);
        var key = pct.toFixed(1);
        if (key === lastPct) return;
        lastPct = key;
        if (!sendHidden && !anyReady()) setDrop('Envoi de la vidéo à ' + who, f.name + ' · ' + mbTxt(bytes) + ' / ' + mbTxt(f.size) + ' · ' + pct.toFixed(1) + ' %', false, Math.floor(pct));
      }
      try {
        c.send(JSON.stringify({ k: 'meta', id: id, key: fileKeyOf(f), name: f.name, size: f.size, type: f.type || 'video/mp4', from: from }));
        var SL = 65536, sent = acked;
        show(from);
        for (var off = from; off < f.size; off += SL) {
          if (id !== xferId || c.dead || !c.open) return;                        // autre fichier, nouvel envoi, ou ami parti
          // on n'envoie pas plus loin que l'accusé de réception : pas de file qui gonfle en mémoire
          while (c.open && !c.dead && (sent - acked > WINDOW || (c.dataChannel && c.dataChannel.bufferedAmount > 4194304))) {
            if (sent - acked > WINDOW && Date.now() - lastAckAt > 30000) throw new Error('stall');
            await sleep(20);
          }
          c.send(await readSlice(f, off, Math.min(f.size, off + SL)));           // relit en cas d'échec ponctuel
          sent++; c.actAt = Date.now();
          show(Math.min(f.size, off + SL));
        }
        if (id === xferId && c.open && !c.dead) c.send(JSON.stringify({ k: 'end', id: id }));
        while (c.open && !c.dead && c.dataChannel && c.dataChannel.bufferedAmount > 0) await sleep(100);
        show(100);
        await sleep(1500);
      } catch (e) {
        console.error('[fichier]', e);
        if (e && e.message === 'stall' && id === xferId && tries < 4) {
          try { c.close(); } catch (x) {}
          setTimeout(function () { sendWholeFile(pid, tries + 1, from); }, 2000 * (tries + 1));
          return;
        }
        if (id === xferId) {
          sysOnce('sendfail2', "L'envoi de la vidéo à " + who + " a échoué.", 30000);
          if (e && (e.name === 'NotReadableError' || e.name === 'NotFoundError' || /read/i.test(String(e.message || '')))) {
            sysOnce('sendread', "Ton téléphone ne peut plus lire ce fichier (souvent : vidéo stockée dans Google Photos ou Drive). Copie-la dans le stockage du téléphone, puis re-sélectionne-la.", 60000);
          }
        }
      }
      finally {
        sendsActive--; c.dead = true;
        if (sendsActive <= 0) { sendsActive = 0; setXfer(''); holdScreen(!!rtcBroadcaster); if (localFile && roomMode === 'file') $('drop').hidden = true; }
      }
      try { c.close(); } catch (x) {}
    });
    c.on('error', function (e) { console.error('[fichier]', e); });
  }

  /* =====================================================
     LECTURE PENDANT LA RÉCEPTION (mode fichier complet, côté ami)
     Principe (sans coupure ni bug) :
     - les morceaux reçus sont gardés dans des Blob (le navigateur les stocke sur disque si besoin) ;
     - dès que le début du fichier est lisible (index MP4 présent, testé dans un lecteur caché), la vidéo démarre sur un
       « instantané » des données reçues ;
     - l'instantané n'est remplacé par un plus récent que lorsque c'est nécessaire (lecture proche de la fin des données,
       blocage, saut vers une zone déjà reçue) et en gardant la même seconde ; jamais à chaque morceau ;
     - un saut vers une zone pas encore reçue est ramené au bord des données reçues (jamais de lecture qui repart du début) ;
     - à la fin du transfert, l'instantané est remplacé une dernière fois par le fichier complet.
     ===================================================== */
  var pvOpt = true;   // lecture pendant la réception : toujours active
  var PV_SEG = 8388608;
  function pvFresh() {
    return { on: false, active: false, done: false, failed: false, key: '', name: '', segs: [], batch: [], batchBytes: 0, got: 0, size: 0,
             mime: 'video/mp4', fullDur: 0, snapBytes: 0, nextProbe: 0, swapping: false, probing: false, lastSwap: 0, guard: false,
             lastPlaying: false, waitingSince: 0 };
  }
  var pv = pvFresh();
  function pvReset() { pv = pvFresh(); setXfer(''); }
  function pvStart(m) {
    if (!pvOpt || roomMode !== 'file' || localFile) { pv.on = false; return; }
    if (pv.on && pv.active && !pv.done && pv.key === m.key) {          // l'hôte relance l'envoi : la lecture en cours continue
      pv.segs = []; pv.batch = []; pv.batchBytes = 0; pv.got = 0; return;
    }
    pvReset();
    pv.on = true; pv.key = m.key; pv.name = m.name; pv.size = m.size;
    pv.mime = mimeFor(m.name, m.type);
    pv.nextProbe = Math.min(m.size, 4194304);
    pv.got = m.from || 0; pv.waitPrefix = !!m.from;
  }
  function pvFeed(d) {
    if (!pv.on || pv.failed || pv.done) return;
    pv.batch.push(d); pv.batchBytes += d.byteLength; pv.got += d.byteLength;
    if (pv.batchBytes >= PV_SEG) { pv.segs.push(new Blob(pv.batch)); pv.batch = []; pv.batchBytes = 0; }
  }
  function pvBlob() { return new Blob((pv.prefix ? [pv.prefix] : []).concat(pv.segs, pv.batch), { type: pv.mime }); }
  // durée lisible estimée avec n octets reçus (proportionnelle, avec une marge de sécurité)
  function pvAvailAt(bytes) { return (pv.fullDur && pv.size) ? Math.min(pv.fullDur, bytes / pv.size * pv.fullDur * 0.95) : 0; }
  function pvSnapAvail() { return pvAvailAt(pv.snapBytes); }
  function pvAllowed() { return pvAvailAt(pv.got); }
  function pvStep() { return Math.max(4194304, Math.floor(pv.size * 0.03)); }

  // test dans un lecteur caché : la vidéo démarre seulement si le navigateur sait déjà lire le début
  function pvProbe() {
    var me = pv; me.probing = true;
    var snap = me.got, url = URL.createObjectURL(pvBlob());
    var p = document.createElement('video'), fin = false, tm;
    p.preload = 'metadata'; p.muted = true;
    function end(ok) {
      if (fin) return; fin = true; clearTimeout(tm);
      var dur = p.duration;
      p.removeAttribute('src'); try { p.load(); } catch (e) {}
      me.probing = false;
      if (pv !== me || me.done || !me.on) { try { URL.revokeObjectURL(url); } catch (e) {} return; }
      if (ok && isFinite(dur) && dur > 1) {
        me.fullDur = dur; me.snapBytes = snap; me.active = true; me.lastSwap = Date.now(); me.lastPlaying = false;
        startVideo(url, me.name + ' · réception en cours');
        showToast('Vidéo', 'prête : tu peux lancer la lecture pendant la réception.');
      } else {
        try { URL.revokeObjectURL(url); } catch (e) {}
        if (me.nextProbe >= me.size * 0.5 || snap >= me.size) {
          me.failed = true; me.segs = []; me.batch = []; me.batchBytes = 0;
          sysOnce('pvfail', "Cette vidéo ne peut pas être lue avant la fin du transfert (son index est à la fin du fichier). Elle sera lisible dès qu'elle sera reçue.", 600000);
        } else me.nextProbe = Math.min(me.size, Math.max(snap * 2, snap + 4194304));
      }
    }
    p.addEventListener('loadedmetadata', function () { end(true); });
    p.addEventListener('error', function () { end(false); });
    tm = setTimeout(function () { end(false); }, 8000);
    p.src = url;
  }

  // remplace la source du lecteur en gardant la position et l'état lecture/pause
  function pvLoadSrc(url, t, wasPlaying, capFn, finish) {
    var old = video.currentSrc || video.src, called = false, ft;
    function onErr() { fin(); }
    function fin() {
      if (called) return; called = true; clearTimeout(ft);
      video.removeEventListener('error', onErr);
      if (finish) finish();
    }
    ft = setTimeout(fin, 12000);
    applyingUntil = Date.now() + 8000; switchingUntil = Date.now() + 8000;
    video.addEventListener('error', onErr);
    video.addEventListener('loadedmetadata', function once() {
      video.removeEventListener('loadedmetadata', once);
      if (video.src !== url) { fin(); return; }
      var cap = capFn ? capFn() : undefined, d = video.duration, tt = Math.max(0, t);
      if (typeof cap === 'number') tt = Math.min(tt, Math.max(0, cap - 0.5));
      if (isFinite(d)) tt = Math.min(tt, Math.max(0, d - 0.3));
      video.addEventListener('seeked', function sk() {
        video.removeEventListener('seeked', sk);
        applyingUntil = Date.now() + 1200; fin();
      });
      setTimeout(fin, 3000);
      try { video.currentTime = tt; } catch (e) { fin(); }
      if (wasPlaying) { applyingUntil = Date.now() + 1500; tryPlay(); }
    });
    video.src = url;
    setTimeout(function () { try { if (old && old !== url) URL.revokeObjectURL(old); } catch (e) {} }, 3000);
  }
  // nouvel instantané (plus de données), même position
  function pvSwap(t, userInit) {
    if (!pv.active || pv.done || pv.swapping) return;
    pv.swapping = true;
    var me = pv, cur = (typeof t === 'number') ? t : video.currentTime, snap = pv.got, wasPlaying = pv.lastPlaying;
    var url = URL.createObjectURL(pvBlob());
    pvLoadSrc(url, cur, wasPlaying, function () {
      me.snapBytes = snap; me.lastSwap = Date.now(); me.waitingSince = 0;
      return pvAvailAt(snap);
    }, function () {
      me.swapping = false;
      if (userInit) { try { broadcast(stateMsg()); } catch (e) {} }
    });
  }
  // transfert terminé : fichier complet à la place de l'instantané
  function pvFinal(url, label, n) {
    if (pv.swapping && (n || 0) < 50) { setTimeout(function () { pvFinal(url, label, (n || 0) + 1); }, 200); return; }
    var me = pv, t = video.currentTime, wasPlaying = pv.lastPlaying || !video.paused;
    me.done = true; me.swapping = true;
    pvLoadSrc(url, t, wasPlaying, null, function () {
      me.swapping = false; me.active = false; me.on = false; me.segs = []; me.batch = [];
    });
    $('fname').textContent = label;
  }
  function rxPlay(url, label) {
    if (pv.active && hasVideo && !pv.done) pvFinal(url, label);
    else { pv.done = true; pv.on = false; startVideo(url, label); }
  }
  // saut de position : jamais au-delà de ce qui est reçu
  function seekTo(t) {
    if (pv.active && !pv.done) {
      var sa = pvSnapAvail();
      if (t > sa) {
        if (pv.swapping) return;
        if (pv.got > pv.snapBytes && t <= pvAllowed()) { pvSwap(t, false); return; }
        var c = Math.max(0, Math.min(t, sa) - 0.5);
        if (Math.abs(video.currentTime - c) < 2) return;
        t = c;
      }
    }
    video.currentTime = t;
  }
  video.addEventListener('seeking', function () {
    if (!pv.active || pv.done || pv.swapping || pv.guard) return;
    var t = video.currentTime;
    if (t <= pvSnapAvail()) return;
    if (pv.got > pv.snapBytes && t <= pvAllowed()) { pvSwap(t, true); return; }
    pv.guard = true; applyingUntil = Date.now() + 1500;
    try { video.currentTime = Math.max(0, pvSnapAvail() - 1); } catch (e) {}
    showToast('Réception', 'cette partie n’est pas encore reçue (' + Math.floor(100 * pv.got / pv.size) + ' %).');
    setTimeout(function () { pv.guard = false; }, 400);
  });
  video.addEventListener('waiting', function () { if (pv.active && !pv.done && !pv.waitingSince) pv.waitingSince = Date.now(); });
  video.addEventListener('playing', function () { pv.waitingSince = 0; pv.lastPlaying = true; });
  video.addEventListener('pause', function () { if (!video.ended && !pv.swapping) pv.lastPlaying = false; });
  setInterval(function () {
    if (!pv.on || pv.done || pv.failed || localFile || pv.swapping || pv.probing || pv.waitPrefix) return;
    var now = Date.now();
    if (!pv.active) { if (pv.got >= pv.nextProbe) pvProbe(); return; }
    var fresh = pv.got - pv.snapBytes;
    if (fresh <= 0 || now - pv.lastSwap < 2500) return;
    var stalled = video.ended || !!video.error || (pv.waitingSince && now - pv.waitingSince > 1500);
    if (fresh < (stalled ? 524288 : pvStep())) return;
    if (stalled || video.currentTime >= pvSnapAvail() - 20) pvSwap();
  }, 1000);
  // progression dans la barre sous la vidéo
  function rxShow(st) {
    var now = Date.now();
    if (now - (st.shownAt || 0) < 250 && st.got < st.meta.size) return;
    st.shownAt = now;
    var pct = Math.min(100, 100 * st.got / st.meta.size);
    if (hasVideo) {
      var t = 'Réception ' + Math.floor(pct) + ' %';
      if (pv.active && !pv.done) t += ' · lisible jusqu’à ' + fmtT(pvAllowed());
      setXfer(t);
    } else {
      setXfer('');
      setDrop('Réception de la vidéo', st.meta.name + ' · ' + mbTxt(st.got) + ' / ' + mbTxt(st.meta.size) + ' · ' + pct.toFixed(1) + ' %', false, Math.floor(pct));
    }
  }
  // Réception côté ami : chaque morceau est écrit sur le disque de l'appareil (stockage privé du site),
  // au fur et à mesure. La mémoire reste faible, quelle que soit la taille du fichier.
  var DISK_OK = !!(navigator.storage && navigator.storage.getDirectory);
  var META_KEY = 'a2g-current';   // un seul fichier gardé : sa clé, son nom, sa taille
  function fileKeyOf(f) { return f.name + '|' + f.size; }
  function readMeta() { try { return JSON.parse(localStorage.getItem(META_KEY) || 'null'); } catch (e) { return null; } }
  function writeMeta(m) { try { localStorage.setItem(META_KEY, JSON.stringify(m)); } catch (e) {} }
  function receiveWhole(c) {
    if (rx && rx.conn) {
      try { rx.conn.close(); } catch (e) {}
      if (rx.w) rx.w.abort().catch(function () {});
    }
    var st = { conn: c, meta: null, id: null, got: 0, n: 0, written: 0, total: 0, lastAt: Date.now(), done: false,
               chain: Promise.resolve(), w: null, fh: null, fname: null, parts: null, err: null, wbytes: 0, ck: 0, from: 0 };
    rx = st;
    c.on('data', function (d) {
      if (typeof d === 'string') {
        var m; try { m = JSON.parse(d); } catch (e) { return; }
        if (m.k === 'meta') {
          st.meta = m; st.id = m.id; st.total = Math.ceil(m.size / 65536); st.lastAt = Date.now();
          pvStart(m);
          st.from = m.from || 0; st.got = st.from; st.wbytes = st.from; st.ck = st.from; st.written = st.from / 65536;
          setDrop('Réception de la vidéo', m.name, false, 0);
          st.chain = st.chain.then(function () { return openDiskFor(st); });
        } else if (m.k === 'end' && m.id === st.id && st.meta) {
          st.done = true;
          st.chain = st.chain.then(function () { return finishWhole(st); });
        }
        return;
      }
      if (!st.meta || st.err) return;
      st.lastAt = Date.now();
      st.got += d.byteLength; st.n++;
      pvFeed(d);
      st.chain = st.chain.then(function () {
        if (st.err) return;
        if (st.w) return st.w.write(d).then(function () { st.wbytes += d.byteLength; });
        st.parts.push(d);                                                    // secours : pas de disque disponible
      }).then(function () {
        st.written++;
        if (!st.err && c.open && (st.written % 16 === 0 || st.written === st.total)) {
          c.send(JSON.stringify({ k: 'ack', id: st.id, n: st.written }));
        }
      }).then(function () {
        if (st.w && !st.err && !st.done && st.wbytes - st.ck >= 16777216) return checkpoint(st);
      }).catch(function (e) {
        st.err = e; console.error('[réception]', e);
        if (st.w) st.w.abort().catch(function () {});
      });
      rxShow(st);
    });
    c.on('close', function () {
      if (rx === st && st.meta && !st.done) sysOnce('rxclose', "Le transfert s'est arrêté avant la fin. Si l'hôte ne le relance pas, demande-lui de re-sélectionner la vidéo.", 120000);
    });
  }
  // surveillance : si plus rien n'arrive pendant 20 s, on demande à l'hôte de renvoyer le fichier
  setInterval(function () {
    var st = rx;
    if (!st || !st.meta || st.done) return;
    if (Date.now() - st.lastAt < 20000) return;
    st.lastAt = Date.now();
    var host = openConns()[0];
    if (host) host.send({ t: 'needfile', key: st.meta.key, from: st.ck || 0 });

  }, 5000);
  // ouvre le fichier sur le disque pour y écrire les morceaux
  var PART_KEY = 'a2g-part';
  // morceau déjà validé sur le disque pour cette vidéo (reprise après rechargement ou coupure)
  function partFor(key) {
    try { var q = JSON.parse(localStorage.getItem(PART_KEY) || 'null'); return (q && q.key === key && q.bytes > 0) ? { file: q.file, bytes: q.bytes } : null; } catch (e) { return null; }
  }
  // tous les 16 Mo : le fichier partiel est validé sur le disque, sa taille est notée pour pouvoir reprendre
  async function checkpoint(st) {
    await st.w.close();
    st.ck = st.wbytes;
    try { localStorage.setItem(PART_KEY, JSON.stringify({ key: st.meta.key, file: st.fname, bytes: st.ck, at: Date.now() })); } catch (e) {}
    st.w = await st.fh.createWritable({ keepExistingData: true });
    await st.w.seek(st.ck);
  }
  async function openDiskFor(st) {
    if (!DISK_OK) { st.parts = []; addMsg('', "Ton navigateur ne peut pas garder la vidéo sur le disque : elle sera gardée en mémoire le temps de la lecture.", 'sys'); return; }
    try {
      var dir = await navigator.storage.getDirectory();
      var ck = st.from > 0 ? partFor(st.meta.key) : null;
      if (ck) {                                                   // reprise : on complète le fichier déjà sur le disque
        st.fname = ck.file;
        st.fh = await dir.getFileHandle(st.fname);
        st.w = await st.fh.createWritable({ keepExistingData: true });
        await st.w.seek(st.from);
        var pf = await st.fh.getFile();
        if (pv.key === st.meta.key) { pv.prefix = pf.slice(0, st.from); pv.waitPrefix = false; }
      } else {
        if (st.from > 0) throw new Error('reprise impossible');
        st.fname = 'v-' + Date.now().toString(36);
        st.fh = await dir.getFileHandle(st.fname, { create: true });
        st.w = await st.fh.createWritable();
      }
    } catch (e) {
      console.error('[disque]', e);
      if (st.from > 0) { st.err = e; try { st.conn.send({ t: 'needfile', key: st.meta.key, from: 0 }); } catch (x) {} return; }
      st.w = null; st.parts = [];
      addMsg('', "Impossible d'écrire sur le disque de ton appareil : la vidéo sera gardée en mémoire le temps de la lecture.", 'sys');
    }
  }
  // nettoyage du disque : on ne garde que la vidéo demandée (key) et les reprises de moins de 7 jours.
  // Sans key (au démarrage) : on garde la dernière vidéo et les reprises récentes, et on supprime le reste.
  var PART_TTL = 7 * 86400000;
  function rawPart() { try { return JSON.parse(localStorage.getItem(PART_KEY) || 'null'); } catch (e) { return null; } }
  async function cleanDisk(key) {
    var m = readMeta(), pt = rawPart(), keep = {};
    if (m && m.file) {
      if (key === undefined || m.key === key) keep[m.file] = 1;
      else { try { localStorage.removeItem(META_KEY); } catch (e) {} }
    }
    if (pt && pt.file) {
      if ((key === undefined || pt.key === key) && Date.now() - (pt.at || 0) < PART_TTL) keep[pt.file] = 1;
      else { try { localStorage.removeItem(PART_KEY); } catch (e) {} }
    }
    if (rx && rx.meta && rx.fname && (key === undefined || rx.meta.key === key)) keep[rx.fname] = 1;   // transfert en cours : jamais supprimé
    if (!DISK_OK) return;
    try {
      var dir = await navigator.storage.getDirectory();
      for await (var name of dir.keys()) {
        if (!keep[name]) { try { await dir.removeEntry(name); } catch (e) {} }
      }
    } catch (e) { console.error('[disque]', e); }
  }
  // supprime tous les autres fichiers stockés : il n'en reste qu'un
  async function pruneDisk(keep) {
    try {
      var dir = await navigator.storage.getDirectory();
      for await (var name of dir.keys()) { if (name !== keep) await dir.removeEntry(name); }
    } catch (e) { console.error('[disque]', e); }
  }
  // Côté ami : si le fichier est déjà sur le disque, on le lit directement ; sinon on le demande
  function answerSource(d, c) {
    var meta = readMeta();
    if (!d.key || !meta || meta.key !== d.key || !DISK_OK) { askFile(c, d.key); return; }
    navigator.storage.getDirectory()
      .then(function (dir) { return dir.getFileHandle(meta.file); })
      .then(function (fh) { return fh.getFile(); })
      .then(function (file) {
        if (file.size !== meta.size) throw new Error('taille différente');
        startVideo(URL.createObjectURL(file), meta.name + ' · ' + fmtSize(file.size));
        addMsg('', 'Vidéo retrouvée sur ton appareil. La lecture est synchronisée avec ton ami.', 'sys');
      })
      .catch(function () { askFile(c, d.key); });
  }
  // demande l'envoi à l'hôte ; si rien ne commence dans les 20 s, on le signale
  var askTimer = null;
  // abandonne la réception en cours (ancienne vidéo remplacée) : on ferme la connexion et le fichier partiel
  function teardownRx() {
    var st = rx; rx = null; setXfer('');
    clearTimeout(askTimer);
    if (st) { try { st.conn.close(); } catch (e) {} if (st.w) st.w.abort().catch(function () {}); }
  }
  // redemande le fichier à l'hôte toutes les 3 s tant que l'envoi n'a pas commencé (une demande perdue bloquait tout)
  function askFile(c, key) {
    var tries = 0;
    clearTimeout(askTimer);
    (function ask() {
      if (rx && rx.meta) return;
      if (!c || !c.open) return;
      if (tries >= 10) { sysOnce('askwait', "L'hôte n'a pas encore commencé l'envoi. Vérifie qu'il est connecté et que la vidéo est bien sélectionnée.", 60000); return; }
      tries++;
      try { c.send({ t: 'needfile', key: key, from: (partFor(key) || { bytes: 0 }).bytes }); } catch (e) {}
      askTimer = setTimeout(ask, 3000);
    })();
  }
  async function finishWhole(st) {
    try {
      if (st.err) throw st.err;
      if (st.got !== st.meta.size) throw new Error('taille incorrecte');
      if (st.w) {
        await st.w.close();                                                   // le fichier est validé sur le disque
        writeMeta({ key: st.meta.key, name: st.meta.name, size: st.meta.size, type: st.meta.type, file: st.fname });
        try { localStorage.removeItem(PART_KEY); } catch (e) {}
        await pruneDisk(st.fname);
        var file = await st.fh.getFile();
        rxPlay(URL.createObjectURL(file), st.meta.name + ' · ' + fmtSize(file.size));
      } else {
        var blob = new Blob(st.parts, { type: st.meta.type }); st.parts = [];
        rxPlay(URL.createObjectURL(blob), st.meta.name + ' · ' + fmtSize(blob.size));
      }
      setXfer('');
      addMsg('', 'Vidéo reçue en entier. La lecture est synchronisée avec ton ami.', 'sys');
    } catch (e) {
      console.error('[réception]', e);
      addMsg('', 'La vidéo reçue est incomplète. Demande à ton ami de la renvoyer.', 'sys');
    }
  }
  // Après la fin d'une vidéo, la capture peut se terminer : on en refait une avant de relancer
  function hostEnsureLive() {
    if (screenStream || !localFile || roomMode !== 'stream') return;
    var s = rtcBroadcaster && rtcBroadcaster.stream;
    var dead = !s || s.getTracks().some(function (t) { return t.readyState === 'ended'; });
    if (dead) hostCapture();
  }
  video.addEventListener('play', function () { if (localFile) hostEnsureLive(); });
  // Fin de vidéo : la capture se termine avec la lecture. On revient au début, en pause, et on refait une capture
  // vivante : l'ami garde le même écran, et la relance reprend sur le même flux.
  video.addEventListener('ended', function () {
    if (!localFile || roomMode !== 'stream') return;
    try { video.pause(); video.currentTime = 0; } catch (e) {}
    hostCapture();
  });
  // Chrome refuse certains fichiers (MKV, MOV…) quand leur type est mal annoncé : on donne un type qu'il accepte, le contenu reste le même
  function mimeFor(name, type) {
    if (/\.(mp4|m4v|mov)$/i.test(name)) return 'video/mp4';
    if (/\.(mkv|webm)$/i.test(name)) return 'video/webm';
    return type || 'video/mp4';
  }
  function typedBlob(f) { return f.slice(0, f.size, mimeFor(f.name, f.type)); }
  function fmtSize(n) { return n > 1e9 ? (n / 1e9).toFixed(2) + ' Go' : Math.round(n / 1e6) + ' Mo'; }
  var lastWho = null;

  /* ---------- file d'attente (hôte uniquement) ---------- */
  var queue = [];
  function isVideoFile(f) { return f && (f.type.indexOf('video') === 0 || /\.(mkv|mp4|m4v|mov|webm)$/i.test(f.name)); }
  // file d'attente avec des liens : YouTube (lecteur intégré) ou une autre plateforme (lecteur de la plateforme)
  function linkEntry(raw) {
    var p = parseYt(raw);
    if (p) return { isLink: true, kind: 'yt', yt: p, name: 'YouTube', url: raw };
    var e = parseEmbed(raw);
    if (e) return { isLink: true, kind: 'embed', embed: e, name: e.label, url: raw };
    return null;
  }
  function startLink(f) {
    if (f.kind === 'yt') {
      startYT(f.yt.id, f.yt.start, true, { playing: true, time: f.yt.start || 0 }, false);
      broadcast({ t: 'yt', id: f.yt.id, start: f.yt.start, name: myName, audio: false });
    } else {
      startEmbed(f.embed.src, f.embed.label, true);
      broadcast({ t: 'embed', src: f.embed.src, label: f.embed.label, name: myName });
    }
  }
  function addLinkToQueue() {
    if (!isHost) return;
    var raw = $('q-link').value.trim(), err = $('q-link-err');
    var f = linkEntry(raw);
    if (!f) { err.textContent = "Ce lien n'est pas reconnu. Colle un lien YouTube, Dailymotion, Twitch, Kick ou Facebook."; return; }
    err.textContent = ''; $('q-link').value = '';
    queue.push(f); renderQueue();
    if (!hasVideo && !yt.active && !embedSrc) playNext();
  }
  function renderQueue() {
    var n = queue.length, label = n ? "File d'attente (" + n + ')' : "File d'attente";
    $('btn-queue').textContent = label; $('fs-queue').textContent = label;
    $('qtitle').textContent = label;
    var ul = $('qlist'); ul.textContent = '';
    if (!n) {
      var p = document.createElement('li'); p.className = 'qempty';
      p.textContent = "Aucune vidéo en attente. Ajoutes-en : elles seront lues automatiquement l'une après l'autre.";
      ul.appendChild(p); return;
    }
    queue.forEach(function (f, i) {
      var li = document.createElement('li'); li.className = 'qitem';
      var num = document.createElement('span'); num.className = 'qn'; num.textContent = (i + 1) + '.';
      var nm = document.createElement('span'); nm.className = 'qname'; var shown = f.isLink ? f.name + ' · ' + f.url.replace(/^https?:\/\/(www\.)?/, '').slice(0, 45) : f.name; nm.textContent = shown; nm.title = shown;
      var sz = document.createElement('span'); sz.className = 'qsize'; sz.textContent = f.isLink ? 'lien' : fmtSize(f.size);
      li.appendChild(num); li.appendChild(nm); li.appendChild(sz);
      function mk(txt, label, fn, off) {
        var b = document.createElement('button'); b.type = 'button'; b.textContent = txt; b.setAttribute('aria-label', label);
        if (off) b.disabled = true; else b.addEventListener('click', fn);
        li.appendChild(b);
      }
      mk('▶', 'Lire maintenant', function () { queue.splice(i, 1); renderQueue(); startFromQueue(f); });
      mk('▲', 'Monter', function () { var t = queue[i - 1]; queue[i - 1] = queue[i]; queue[i] = t; renderQueue(); }, i === 0);
      mk('▼', 'Descendre', function () { var t = queue[i + 1]; queue[i + 1] = queue[i]; queue[i] = t; renderQueue(); }, i === n - 1);
      mk('✕', 'Retirer', function () { queue.splice(i, 1); renderQueue(); });
      ul.appendChild(li);
    });
  }
  function startFromQueue(f) {
    if (f.isLink) startLink(f); else loadFile(f).then(function (ok) { if (ok) tryPlay(); });
    $('qpanel').hidden = true;
    var rest = queue.length;
    var txt = 'Lecture : ' + f.name + (rest ? ' · ' + rest + ' en attente' : '');
    addMsg('', txt, 'sys');
    broadcast({ t: 'sys', text: txt });
  }
  function playNext() {
    if (!isHost || !queue.length) return false;
    var f = queue.shift(); renderQueue();
    startFromQueue(f);
    return true;
  }
  function addToQueue(files) {
    if (!isHost) return;
    var added = 0;
    Array.prototype.forEach.call(files || [], function (f) { if (isVideoFile(f)) { queue.push(f); added++; } });
    renderQueue();
    if (added && !hasVideo) playNext();          // rien en cours : on démarre tout de suite
  }
  $('q-link-add').addEventListener('click', addLinkToQueue);
  $('q-link').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); addLinkToQueue(); } });
  // ---------- jeux à plusieurs : l'hôte garde la partie et valide chaque coup ----------
  var GAME = null, GAME_SECRET = null, GAME_SEQ = 0;
  var GAME_NAMES = { ttt: 'Morpion', rps: 'Pierre-feuille-ciseaux', c4: 'Puissance 4', wordle: 'Mot mystère', quiz: 'Quiz' };
  var GAME_TWO = { ttt: 1, rps: 1, c4: 1 };
  var WORDS = ['chien','table','livre','arbre','route','fleur','nuage','pomme','lampe','porte','verre','plage','sable','neige','vague','poule','poire','rouge','jaune','orage','pluie','fruit','carte','bleue'];
  var RPS_CH = ['Pierre', 'Feuille', 'Ciseaux'];
  var RPS_ICON = { Pierre: '✊', Feuille: '✋', Ciseaux: '✌️' };
  var QUIZ = [
    { q: 'Quelle est la capitale de la Tunisie ?', c: ['Sfax', 'Tunis', 'Sousse', 'Bizerte'], a: 1 },
    { q: 'Combien de continents y a-t-il ?', c: ['5', '6', '7', '8'], a: 2 },
    { q: 'Quel est le plus grand océan ?', c: ['Atlantique', 'Indien', 'Arctique', 'Pacifique'], a: 3 },
    { q: 'Combien de côtés a un hexagone ?', c: ['5', '6', '7', '8'], a: 1 },
    { q: 'Quelle planète est la plus proche du Soleil ?', c: ['Vénus', 'Mars', 'Mercure', 'Terre'], a: 2 },
    { q: 'Combien font 12 × 12 ?', c: ['124', '132', '144', '156'], a: 2 },
    { q: 'Qui a peint la Joconde ?', c: ['Van Gogh', 'Léonard de Vinci', 'Picasso', 'Monet'], a: 1 },
    { q: 'Quel est le plus petit pays du monde ?', c: ['Monaco', 'Vatican', 'Malte', 'Saint-Marin'], a: 1 }
  ];
  var TTT_LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

  function gPlayerIndex(g, cid) { if (!g || !g.players) return -1; for (var i = 0; i < g.players.length; i++) if (g.players[i].cid === cid) return i; return -1; }
  function gName(g, i) { return g.players[i] ? g.players[i].name : '?'; }
  function gNorm(v) { return String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]/g, ''); }
  function gNew(type, cid, name) {
    var g = { id: ++GAME_SEQ, type: type, status: GAME_TWO[type] ? 'lobby' : 'play', players: [{ cid: cid, name: name }], turn: 0, msg: '' };
    GAME_SECRET = {};
    if (type === 'ttt') g.board = ['', '', '', '', '', '', '', '', ''];
    if (type === 'c4') { g.board = []; for (var r = 0; r < 6; r++) g.board.push([0, 0, 0, 0, 0, 0, 0]); }
    if (type === 'rps') { g.score = [0, 0, 0]; g.picked = {}; g.result = null; }
    if (type === 'wordle') { g.rows = []; GAME_SECRET.word = WORDS[Math.floor(Math.random() * WORDS.length)]; }
    if (type === 'quiz') { g.qi = 0; g.answers = {}; g.pn = {}; g.scores = {}; g.revealed = false; }
    return g;
  }
  function gWinLine(b) {
    for (var i = 0; i < TTT_LINES.length; i++) { var l = TTT_LINES[i]; if (b[l[0]] && b[l[0]] === b[l[1]] && b[l[0]] === b[l[2]]) return l; }
    return null;
  }
  function c4Win(b, r, c) {
    var v = b[r][c], dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
    for (var d = 0; d < 4; d++) {
      var cells = [[r, c]], dr = dirs[d][0], dc = dirs[d][1];
      for (var s2 = -1; s2 <= 1; s2 += 2) {
        var rr = r + dr * s2, cc = c + dc * s2;
        while (rr >= 0 && rr < 6 && cc >= 0 && cc < 7 && b[rr][cc] === v) { cells.push([rr, cc]); rr += dr * s2; cc += dc * s2; }
      }
      if (cells.length >= 4) return cells;
    }
    return null;
  }
  function wordleScore(guess, word) {
    var r = ['no', 'no', 'no', 'no', 'no'], cnt = {}, i;
    for (i = 0; i < 5; i++) { if (guess[i] === word[i]) r[i] = 'ok'; else cnt[word[i]] = (cnt[word[i]] || 0) + 1; }
    for (i = 0; i < 5; i++) if (r[i] !== 'ok' && cnt[guess[i]] > 0) { r[i] = 'mid'; cnt[guess[i]]--; }
    return r;
  }
  function gReveal(g) {
    var Q = QUIZ[g.qi]; g.revealed = true; g.correct = Q.a;
    Object.keys(g.answers).forEach(function (k) { if (g.answers[k] === Q.a) g.scores[k] = (g.scores[k] || 0) + 1; });
  }
  // seul l'hôte exécute ceci : il valide le coup puis diffuse l'état
  function gApply(act, cid, name) {
    if (!act || typeof act !== 'object') return;
    var a = act.a;
    if (a === 'open') {
      if (GAME || !GAME_NAMES[act.type]) return;
      GAME = gNew(act.type, cid, name); GAME.invite = { cid: cid, name: name }; return;
    }
    if (!GAME) return;
    var g = GAME, me = gPlayerIndex(g, cid);
    if (a === 'close') { GAME = null; GAME_SECRET = null; return; }
    if (a === 'join') {
      if (act.gid && act.gid !== g.id) return;
      if (GAME_TWO[g.type] && g.status === 'lobby' && me < 0) { g.players.push({ cid: cid, name: name }); g.status = 'play'; g.msg = ''; }
      return;
    }
    if (g.type === 'ttt' && a === 'move' && g.status === 'play' && me === g.turn) {
      var i = act.i | 0;
      if (i < 0 || i > 8 || g.board[i]) return;
      g.board[i] = me === 0 ? 'X' : 'O';
      g.last = i;
      var ln = gWinLine(g.board);
      if (ln || g.board.every(function (x) { return x; })) { g.status = 'over'; g.winner = ln ? me : -1; g.line = ln; }
      else g.turn = 1 - g.turn;
      return;
    }
    if (g.type === 'c4' && a === 'move' && g.status === 'play' && me === g.turn) {
      var col = act.col | 0;
      if (col < 0 || col > 6) return;
      var row = -1;
      for (var r = 5; r >= 0; r--) if (!g.board[r][col]) { row = r; break; }
      if (row < 0) return;
      g.board[row][col] = me + 1; g.last = [row, col];
      var cw = c4Win(g.board, row, col);
      if (cw) { g.status = 'over'; g.winner = me; g.line = cw; }
      else if (g.board[0].every(function (x) { return x; })) { g.status = 'over'; g.winner = -1; }
      else g.turn = 1 - g.turn;
      return;
    }
    if (g.type === 'rps' && me >= 0 && g.players.length === 2) {
      if (a === 'next' && g.result) { g.result = null; g.msg = ''; return; }
      if (a === 'pick' && !g.result && RPS_CH.indexOf(act.c) >= 0 && !g.picked[cid]) {
        GAME_SECRET[cid] = act.c; g.picked[cid] = true;
        var ids = [g.players[0].cid, g.players[1].cid];
        if (g.picked[ids[0]] && g.picked[ids[1]]) {
          var x = RPS_CH.indexOf(GAME_SECRET[ids[0]]), y = RPS_CH.indexOf(GAME_SECRET[ids[1]]);
          var win = x === y ? -1 : ((x + 1) % 3 === y ? 1 : 0);
          g.result = { c: [RPS_CH[x], RPS_CH[y]], w: win };
          if (win < 0) g.score[2]++; else g.score[win]++;
          g.picked = {}; GAME_SECRET = {};
        }
      }
      return;
    }
    if (g.type === 'wordle' && a === 'guess' && g.status === 'play') {
      var gw = gNorm(act.w);
      if (gw.length !== 5) { g.msg = 'Le mot doit faire 5 lettres.'; return; }
      g.msg = '';
      g.rows.push({ w: gw, r: wordleScore(gw, GAME_SECRET.word), by: name });
      if (gw === GAME_SECRET.word) { g.status = 'over'; g.won = true; g.word = GAME_SECRET.word; }
      else if (g.rows.length >= 6) { g.status = 'over'; g.won = false; g.word = GAME_SECRET.word; }
      return;
    }
    if (g.type === 'quiz') {
      if (a === 'answer' && !g.revealed && g.status === 'play' && g.answers[cid] === undefined) {
        var k = act.k | 0;
        if (k < 0 || k > 3) return;
        g.answers[cid] = k; g.pn[cid] = name;
        if (Object.keys(g.answers).length >= Math.max(1, roomCount)) gReveal(g);
        return;
      }
      if (a === 'reveal' && !g.revealed && g.status === 'play') { gReveal(g); return; }
      if (a === 'nextq' && g.revealed) {
        g.qi++; g.answers = {}; g.revealed = false; delete g.correct;
        if (g.qi >= QUIZ.length) g.status = 'over';
      }
    }
  }
  function gBroadcast() { broadcast({ t: 'gstate', g: GAME }); renderGame(); }
  // une action vient de cette personne : l'hôte l'applique directement, les autres l'envoient à l'hôte
  function gAction(act) {
    if (isHost) { gApply(act, myCid, myName); gBroadcast(); }
    else broadcast({ t: 'gact', act: act, cid: myCid, name: myName });
  }
  function gBtn(text, fn, dis) {
    var b = document.createElement('button'); b.type = 'button'; b.className = 'btn small'; b.textContent = text;
    if (dis) b.disabled = true; else b.addEventListener('click', fn);
    return b;
  }
  function gStatus(g, mine) {
    if (g.status === 'lobby') return "En attente d'un second joueur…";
    if (g.type === 'ttt' || g.type === 'c4') {
      if (g.status === 'over') return g.winner < 0 ? 'Match nul !' : gName(g, g.winner) + ' a gagné !';
      return 'Au tour de ' + gName(g, g.turn) + (g.turn === mine ? ' (toi)' : '');
    }
    if (g.type === 'rps') {
      if (g.result) return g.result.w < 0 ? 'Égalité !' : gName(g, g.result.w) + ' gagne la manche !';
      if (mine < 0) return 'Les deux joueurs choisissent en secret.';
      if (g.picked[myCid]) return "Choix envoyé, en attente de l'adversaire…";
      return 'Fais ton choix.';
    }
    if (g.type === 'wordle') {
      if (g.status === 'over') return g.won ? 'Bravo, trouvé !' : 'Perdu. Le mot était : ' + String(g.word).toUpperCase();
      return 'Essai ' + (g.rows.length + 1) + ' / 6 : propose un mot de 5 lettres.';
    }
    if (g.type === 'quiz') return g.status === 'over' ? 'Quiz terminé !' : 'Question ' + (g.qi + 1) + ' / ' + QUIZ.length;
    return '';
  }
  function gScoreText(g) {
    return Object.keys(g.pn || {}).map(function (k) { return g.pn[k] + ' : ' + (g.scores[k] || 0); }).join(' · ');
  }
  // ---------- jeux : affichés par-dessus la salle ; l'hôte garde la partie et valide chaque coup ----------
  var seenInvite = null, lastGameJson = '';
  function renderGame() {
    var fr = $('gframe');
    if (fr && !fr.hidden && fr.contentWindow && fr.contentWindow.GameUI) fr.contentWindow.GameUI.show(GAME, myCid, isHost, gAction);
    updateInvite();
  }
  function updateInvite() {
    var card = $('ginvite'); if (!card) return;
    var g = GAME, show = false;
    if (g && g.invite && g.invite.cid !== myCid && seenInvite !== g.id && gPlayerIndex(g, myCid) < 0 &&
        (GAME_TWO[g.type] ? g.status === 'lobby' : g.status === 'play')) show = true;
    card.hidden = !show;
    if (show) $('ginvite-text').textContent = g.invite.name + " t'invite à jouer : " + GAME_NAMES[g.type];
  }
  function openGames() { $('gframe').hidden = false; renderGame(); }
  function closeGames() {
    // une partie terminée est retirée : la prochaine ouverture affiche la liste des jeux
    if (GAME && GAME.status === 'over') gAction({ a: 'close' });
    $('gframe').hidden = true;
  }
  window.closeGamesFromFrame = closeGames;
  $('gframe').addEventListener('load', renderGame);
  function acceptInvite() {
    var g = GAME; if (!g) return;
    seenInvite = g.id; openGames();
    if (GAME_TWO[g.type] && g.status === 'lobby') gAction({ a: 'join', gid: g.id });
    updateInvite();
  }
  function declineInvite() { if (GAME) seenInvite = GAME.id; updateInvite(); }
  $('btn-games').addEventListener('click', function () { if ($('gframe').hidden) openGames(); else closeGames(); });
  $('ginvite-yes').addEventListener('click', acceptInvite);
  $('ginvite-no').addEventListener('click', declineInvite);
  function toggleQueue() { $('qpanel').hidden = !$('qpanel').hidden; }
  // fin de la vidéo : l'hôte enchaîne avec la suivante
  video.addEventListener('ended', function () {
    if (isHost && queue.length) setTimeout(function () { if (video.ended || !hasVideo) playNext(); }, 800);
  });
  var EMOJI_ONLY = /^(?:\p{Extended_Pictographic}|‍|️|\s){1,12}$/u;
  // texte avec liens cliquables (http, https, www.) ; rien n'est interprété comme du HTML
  function renderText(el, text) {
    var re = /(?:https?:\/\/|www\.)[^\s<>"']+/gi, last = 0, m;
    while ((m = re.exec(text))) {
      var trimmed = m[0].replace(/[.,;:!?)\]]+$/, '');
      if (!trimmed) break;
      if (m.index > last) el.appendChild(document.createTextNode(text.slice(last, m.index)));
      var href = /^www\./i.test(trimmed) ? 'https://' + trimmed : trimmed, ok = false;
      try { var u = new URL(href); ok = (u.protocol === 'http:' || u.protocol === 'https:'); } catch (e) {}
      if (ok) {
        var a = document.createElement('a');
        a.className = 'lnk'; a.href = href; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = trimmed;
        el.appendChild(a);
      } else el.appendChild(document.createTextNode(trimmed));
      last = m.index + trimmed.length;
      re.lastIndex = last;
    }
    if (last < text.length) el.appendChild(document.createTextNode(text.slice(last)));
  }
  // affiche une photo dans le chat (src doit être une image base64 validée)
  function addImgMsg(who, src, cls) {
    var box = $('msgs'), el = document.createElement('div');
    el.className = 'msg ' + (cls || '');
    var key = (cls || 'peer') + '|' + who;
    var same = (lastWho === key); lastWho = key;
    if (same) el.classList.add('cont');
    else { var w = document.createElement('span'); w.className = 'who'; w.textContent = who; el.appendChild(w); }
    var im = document.createElement('img');
    im.className = 'photo'; im.alt = 'Photo envoyée'; im.src = src; im.loading = 'lazy';
    el.appendChild(im);
    box.appendChild(el);
    box.scrollTop = box.scrollHeight;
  }
  // réduit la photo (1024 px max, JPEG) pour qu'elle passe facilement dans la connexion
  function compressPhoto(file, cb) {
    var url = URL.createObjectURL(file), im = new Image();
    im.onload = function () {
      var w = im.naturalWidth, h = im.naturalHeight, sc = Math.min(1, 1024 / Math.max(w, h));
      var cv = document.createElement('canvas');
      cv.width = Math.max(1, Math.round(w * sc)); cv.height = Math.max(1, Math.round(h * sc));
      var ctx = cv.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.drawImage(im, 0, 0, cv.width, cv.height);
      var out = cv.toDataURL('image/jpeg', 0.8);
      if (out.length > 380000) out = cv.toDataURL('image/jpeg', 0.6);
      URL.revokeObjectURL(url);
      cb(out.length > 450000 ? null : out);
    };
    im.onerror = function () { URL.revokeObjectURL(url); cb(null); };
    im.src = url;
  }
  function addMsg(who, text, cls, ts) {
    var box = $('msgs'), el = document.createElement('div');
    el.className = 'msg ' + (cls || '');
    if (cls === 'sys') {
      lastWho = null;
      el.textContent = text;
    } else {
      var key = (cls || 'peer') + '|' + who;
      var same = (lastWho === key);       // même personne que le message précédent : le nom n'est pas répété
      lastWho = key;
      if (same) el.classList.add('cont');
      else {
        var w = document.createElement('span'); w.className = 'who'; w.textContent = who;
        el.appendChild(w);
      }
      var tm = document.createElement('span'); tm.className = 'time';
      var when = ts && isFinite(+ts) ? new Date(+ts) : new Date();
      tm.textContent = when.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      el.appendChild(tm);
      var t = document.createElement('span'); t.className = 'txt'; renderText(t, text);
      if (EMOJI_ONLY.test(text)) el.classList.add('big');
      el.appendChild(t);
    }
    box.appendChild(el);
    box.scrollTop = box.scrollHeight;
  }
  // notifications : son + notification système + titre de l'onglet, seulement si la page n'est pas au premier plan
  var baseTitle = document.title, audioCtx = null, unread = 0;
  function getAudio() {
    if (!audioCtx) { var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; audioCtx = new AC(); }
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(function () {});
    return audioCtx;
  }
  function playPing() {
    var ac = getAudio(); if (!ac) return;
    var t = ac.currentTime;
    [[880, 0], [1320, 0.13]].forEach(function (n) {
      var o = ac.createOscillator(), g = ac.createGain();
      o.type = 'sine'; o.frequency.value = n[0];
      g.gain.setValueAtTime(0.0001, t + n[1]);
      g.gain.exponentialRampToValueAtTime(0.25, t + n[1] + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + n[1] + 0.35);
      o.connect(g); g.connect(ac.destination);
      o.start(t + n[1]); o.stop(t + n[1] + 0.4);
    });
  }
  function pageInBackground() { return document.hidden || !document.hasFocus(); }
  function notifyNew(who, text) {
    if (!pageInBackground()) return;
    unread++; document.title = '(' + unread + ') ' + baseTitle;
    playPing();
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        var n = new Notification(who + ' · Samaraf séries', { body: text, tag: 'samaraf-chat', icon: $('app-icon').href });
        n.onclick = function () { window.focus(); n.close(); };
      } catch (e) {}
    }
  }
  function clearUnread() { if (!pageInBackground()) { unread = 0; document.title = baseTitle; } }
  document.addEventListener('visibilitychange', clearUnread);
  window.addEventListener('focus', clearUnread);
  // au premier clic sur la page : demande l'autorisation des notifications et prépare le son
  document.addEventListener('pointerdown', function arm() {
    document.removeEventListener('pointerdown', arm);
    if ('Notification' in window && Notification.permission === 'default') { try { Notification.requestPermission(); } catch (e) {} }
    try { getAudio(); } catch (e) {}
  });
  function showToast(who, text) {
    var t = $('toast');
    t.textContent = '';
    var b = document.createElement('b'); b.textContent = who + ' : ';
    t.appendChild(b); t.appendChild(document.createTextNode(text));
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 5000);
  }
  function openConns() { return conns.filter(function (c) { return c.open; }); }
  // le nombre de spectateurs n'est affiché que chez l'hôte (celui qui a créé la salle)
  var roomCount = 0;   // nombre de personnes dans la salle (hôte compris), annoncé par l'hôte toutes les 3 s
  var roomNames = [];
  function memberNames() {
    return [myName].concat(openConns().map(function (c) { return c.pname; }).filter(Boolean)).slice(0, 12);
  }
  // réactions : un tap sur un message ouvre 4 émojis ; les réactions sont relayées à toute la salle
  var REACTS = ['👍', '😂', '❤️', '😮'];
  function tagMsg(mid) {
    if (!mid) return;
    var el = $('msgs').lastElementChild; if (!el || el.classList.contains('sys')) return;
    el.dataset.mid = mid;
    el.addEventListener('click', function (ev) {
      if (ev.target.closest && (ev.target.closest('a') || ev.target.closest('.rbar'))) return;
      toggleReactBar(el, mid);
    });
  }
  function toggleReactBar(el, mid) {
    var old = el.querySelector('.rbar');
    if (old) { old.remove(); return; }
    var bar = document.createElement('div'); bar.className = 'rbar';
    REACTS.forEach(function (e) {
      var b = document.createElement('button'); b.type = 'button'; b.textContent = e;
      b.addEventListener('click', function (ev) { ev.stopPropagation(); bar.remove(); sendReact(mid, e); });
      bar.appendChild(b);
    });
    el.appendChild(bar);
  }
  function sendReact(mid, e) { applyReact(mid, e); broadcast({ t: 'react', mid: mid, e: e }); }
  function applyReact(mid, e) {
    if (!mid || REACTS.indexOf(e) < 0) return;
    var el = null;
    Array.prototype.forEach.call($('msgs').children, function (c) { if (c.dataset && c.dataset.mid === String(mid)) el = c; });
    if (!el) return;
    el._rx = el._rx || {}; el._rx[e] = (el._rx[e] || 0) + 1;
    var box = el.querySelector('.reacts');
    if (!box) { box = document.createElement('div'); box.className = 'reacts'; el.appendChild(box); }
    box.textContent = '';
    Object.keys(el._rx).forEach(function (k) {
      var sp = document.createElement('span'); sp.textContent = k + ' ' + el._rx[k]; box.appendChild(sp);
    });
  }
  function updateStatus() {
    var seen = {}, n = 0, dot = $('dot'), txt = $('status-text');
    openConns().forEach(function (c) { var k = c.cid || c.peer; if (!seen[k]) { seen[k] = 1; n++; } });
    if (isHost) roomCount = n + 1;
    if (n > 0) { dot.className = 'dot ok'; if (isHost) roomNames = memberNames();
    txt.textContent = roomCount > 1 ? roomCount + ' en ligne' + (roomNames.length ? ' · ' + roomNames.join(', ') : '') : 'Connecté';
    txt.title = roomNames.join(', '); }
    else { dot.className = 'dot wait'; txt.textContent = isHost ? "En attente d'un ami…" : (joinedOnce ? 'Connexion perdue · reconnexion…' : 'Connexion…'); }
    if (window.__theme) window.__theme.refresh();
  }
  // présence : l'hôte envoie le nombre de personnes toutes les 3 s (même rythme que la synchro)
  setInterval(function () {
    if (!isHost || !peer || !openConns().length) return;
    updateStatus();
    broadcast({ t: 'count', n: roomCount, names: memberNames() });
      if (isHost && GAME) broadcast({ t: 'gstate', g: GAME });   // la salle renvoie l'état : aucun ami ne reste bloqué
  }, 3000);
  function setDrop(title, text, showPick, progress) {
    $('drop').hidden = false;
    $('drop-title').textContent = title;
    $('drop-text').textContent = text;
    $('btn-pick').hidden = !showPick;
    if ($('btn-yt-drop')) $('btn-yt-drop').hidden = !showPick;   // ce bouton a été retiré de la zone d'accueil
    $('prog').hidden = (progress === undefined);
    if (progress !== undefined) $('prog').value = progress;
  }

  /* ---------- gestes de l'utilisateur ---------- */
  // Seules les actions faites par une personne sont envoyées aux autres.
  // Les pauses ou sauts déclenchés par le navigateur ne sont jamais renvoyés (évite les boucles de resynchronisation).
  function markUser() { lastUserInput = Date.now(); }
  function userRecent() { return pointerDown || (Date.now() - lastUserInput < 2000); }
  $('stage').addEventListener('pointerdown', function () { pointerDown = true; markUser(); }, true);
  $('stage').addEventListener('click', markUser, true);
  $('stage').addEventListener('touchstart', markUser, { capture: true, passive: true });
  ['pointerup', 'pointercancel'].forEach(function (ev) {
    document.addEventListener(ev, function () { if (pointerDown) { pointerDown = false; markUser(); } }, true);
  });
  document.addEventListener('keydown', function (e) {
    var tg = e.target && e.target.tagName;
    if (tg === 'INPUT' || tg === 'TEXTAREA' || tg === 'SELECT') return;
    markUser();
  });

  /* ---------- réseau : messages ---------- */
  function broadcast(msg, except) {
    conns.forEach(function (c) { if (c !== except && c.open) c.send(msg); });
  }
  // retire une connexion (départ, coupure ou remplacement par une reconnexion)
  // met la vidéo en pause sans que ce soit pris pour une action de l'utilisateur ; renvoie true si quelque chose jouait
  function dropConn(c, quiet) {
    if (c.dead) return;
    c.dead = true;
    var i = conns.indexOf(c);
    if (i >= 0) conns.splice(i, 1);
    try { c.close(); } catch (e) {}
    delete typers[c.cid]; renderTyping();
    updateStatus();
    if (isHost) renderQ();
    if (rtcBroadcaster) rtcBroadcaster.removeViewer(c.peer);
    if (isHost && sendConn[c.peer]) { sendConn[c.peer].dead = true; try { sendConn[c.peer].close(); } catch (e) {} }
    // connexion jamais ouverte, remplacée par une reconnexion de la même personne, ou onglet remplacé : pas un vrai départ
    if (quiet || c.replaced || !c.wasOpen || noReconnect) return;
    // départ ou coupure d'un ami : aucun message, la lecture continue
    if (isHost) return;
    lostShown = true;
    lastTry = 0; guestLink();
  }
  function setupConn(c) {
    c.on('open', function () {
      // un lien valide existe déjà : cette connexion en double est abandonnée
      if (!isHost && openConns().some(function (o) { return o !== c && !o.dead; })) { c.replaced = true; dropConn(c, true); return; }
      c.wasOpen = true;
      c.lastSeen = Date.now();
      try {                                               // prévient si la liaison directe échoue (réseau bloqué)
        var pcx = c.peerConnection;
        if (pcx) pcx.addEventListener('iceconnectionstatechange', function () {
          if (pcx.iceConnectionState === 'failed') sysOnce('ice-fail', "La connexion directe n'a pas pu s'établir. Si ça persiste, essayez depuis un autre réseau (Wi-Fi ou 4G).", 120000);
        });
      } catch (e) {}
      if (conns.indexOf(c) < 0) conns.push(c);
      if (!isHost) {
        joinedOnce = true;
        try { localStorage.setItem('a2g-last-join', roomCode); localStorage.setItem('a2g-last-id', roomId); } catch (e) {}   // l'ami retrouvera l'ID et le code
        lostShown = false;
      }
      updateStatus();
      c.send({ t: 'hello', name: myName, cid: myCid, q: myQ, a: myA, code: isHost ? '' : roomCode });
    });
    c.on('data', function (d) { c.lastSeen = Date.now(); handle(d, c); });
    c.on('close', function () { dropConn(c); });
    c.on('error', updateStatus);
  }
  function pushHistory(mid, name, text, cid, ts) {
    history.push({ mid: mid, name: String(name || '').slice(0, 20), text: String(text).slice(0, 500), cid: cid, ts: ts });
    if (history.length > 200) history.shift();
  }
  // envoyé à l'autre dès que son 'hello' est reçu (on connaît alors son identifiant et ce qu'il possède déjà)
  function welcome(c, d) {
    if (isHost) c.send({ t: 'mode', m: roomMode });
    if (isHost) c.send({ t: 'gstate', g: GAME });
    if (localFile) {
      if (d.q && QUALS[d.q]) qFor[c.peer] = d.q;                              // qualité choisie par cette personne
      if (d.a && AUDIO[d.a]) aFor[c.peer] = d.a;                              // son choisi par cette personne
      c.send({ t: 'source', name: localFile.name, size: localFile.size, key: fileKeyOf(localFile) });
      if (subsText) c.send({ t: 'subs', text: subsText });
      if (roomMode === 'file') { /* l'ami répond : il a déjà le fichier, ou il le demande */ }
      else sendBest(c.peer);                                                   // diffusion live vers cet ami
    }
    if (yt.active) c.send({ t: 'yt', id: yt.id, time: ytCur(), playing: ytPlaying(), name: myName, audio: !!yt.audio });
    if (multi.active && isHost) { c.send({ t: 'multi', a: multi.a, b: multi.b }); c.send({ t: 'mmute', k: 'A', on: !!multi.mutedA }); c.send({ t: 'mmute', k: 'B', on: !!multi.mutedB }); }
    if (embedSrc) c.send({ t: 'embed', src: embedSrc, label: embedLabel, name: myName });
    if (spot.active && isHost) c.send({ t: 'spot', uri: spot.uri, name: myName });
    var thm = window.__theme && window.__theme.snapshot(); if (thm) c.send(thm);
    if (isHost && history.length) c.send({ t: 'history', msgs: history.slice(-200) });
  }
  function handle(d, c) {
    if (!d || !d.t) return;
    if (isHost && /^(chat|img|typing|state|hb|source|subs|yt|ytstate|yths|ytstop|quality|react)$/.test(d.t)) broadcast(d, c);
    switch (d.t) {
      case 'denied':                                 // l'hôte a refusé le code d'accès
        noReconnect = true; backHome("Code d'accès incorrect pour cette salle. Vérifie l'ID et le code."); return;
      case 'hello':                                  // arrivée silencieuse : rien dans le chat
        if (isHost) c.pname = String(d.name || '').slice(0, 20);
        if (isHost && d.code !== roomCode) {         // mauvais code d'accès : connexion refusée
          c.replaced = true; c.wasOpen = false;
          try { c.send({ t: 'denied' }); } catch (e) {}
          setTimeout(function () { dropConn(c, true); }, 400);
          return;
        }
        c.peerName = d.name; c.cid = d.cid;
        if (isHost) { hadGuest = true; emptySince = 0; }
        if (isHost) { c.q = QUALS[d.q] ? d.q : DEF_Q; renderQ(); }
        // même personne qui revient (actualisation, reconnexion) : l'ancienne connexion est retirée, elle n'est pas comptée en double
        if (isHost && d.cid) conns.slice().forEach(function (o) {
          if (o !== c && o.cid === d.cid) { o.replaced = true; try { o.send({ t: 'replaced' }); } catch (e) {} dropConn(o, true); }
        });
        updateStatus();
        welcome(c, d);
        break;
      case 'ping': try { c.send({ t: 'pong' }); } catch (e) {} break;
      case 'pong': break;
      case 'bye': dropConn(c); break;
      case 'closed': if (!isHost) closeRoom("L'hôte a fermé le salon.", false); break;
      case 'replaced':
        c.replaced = true;
        // si une autre connexion valide existe encore dans cet onglet, ce n'était qu'un doublon
        if (openConns().some(function (o) { return o !== c && !o.dead; })) { dropConn(c, true); break; }
        noReconnect = true; addMsg('', 'Tu es connecté depuis un autre onglet : celui-ci est déconnecté.', 'sys'); break;
      case 'typing':
        if (d.off) delete typers[d.cid]; else typers[d.cid] = { name: d.name, at: Date.now() };
        renderTyping();
        break;
      case 'sys': addMsg('', d.text, 'sys'); break;
      case 'count': if (!isHost) { roomCount = +d.n || 0; roomNames = Array.isArray(d.names) ? d.names.map(function (x) { return String(x).slice(0, 20); }) : []; updateStatus(); } break;
      case 'ready': if (isHost) c.ready = !!d.ok; break;
      case 'gstate':
        if (!isHost) {
          var gj = JSON.stringify(d.g || null);
          if (gj === lastGameJson) break;              // rien de nouveau : on ne redessine pas (la saisie reste)
          lastGameJson = gj;
          var wasGame = GAME; GAME = d.g || null; if (GAME && !wasGame) showToast('Jeux', 'Une partie vient de commencer'); renderGame();
        }
        break;
      case 'gact':
        if (isHost) { gApply(d.act, String(d.cid || '').slice(0, 40), String(d.name || '').slice(0, 20)); gBroadcast(); }
        break;
      case 'react': applyReact(d.mid, d.e); break;
      case 'chat':
        delete typers[d.cid]; renderTyping();
        if (typeof d.text !== 'string') break;
        if (d.mid) { if (seenMids[d.mid]) break; seenMids[d.mid] = 1; }
        if (isHost) pushHistory(d.mid, d.name, d.text, d.cid, d.ts);
        addMsg(String(d.name || '').slice(0, 20), d.text.slice(0, 500), '', d.ts); tagMsg(d.mid); showToast(String(d.name || '').slice(0, 20), d.text.slice(0, 500)); notifyNew(String(d.name || 'Ami').slice(0, 20), d.text.slice(0, 120)); break;
      case 'img':
        if (typeof d.data !== 'string' || !/^data:image\/(jpeg|png|webp|gif);base64,/.test(d.data) || d.data.length > 600000) break;
        if (d.mid) { if (seenMids[d.mid]) break; seenMids[d.mid] = 1; }
        var imName = String(d.name || '').slice(0, 20);
        addImgMsg(imName, d.data, ''); showToast(imName, 'a envoyé une photo'); notifyNew(imName || 'Ami', '📷 Photo'); break;
      case 'history':
        if (isHost || !Array.isArray(d.msgs)) break;
        var firstTime = !Object.keys(seenMids).length, shown = 0;
        d.msgs.slice(-200).forEach(function (m) {
          if (!m || typeof m.text !== 'string' || (m.mid && seenMids[m.mid])) return;
          if (m.mid) seenMids[m.mid] = 1;
          if (!shown) addMsg('', firstTime ? 'Messages du salon :' : 'Messages reçus pendant ton absence :', 'sys');
          shown++;
          addMsg(String(m.name || '').slice(0, 20), m.text.slice(0, 500), (m.cid && m.cid === myCid) ? 'me' : '', m.ts);
        });
        break;
      case 'source':
        // transfert déjà en cours pour cette même vidéo (reconnexion, message en double) : on ne remet rien à zéro
        if (!localFile && roomMode === 'file' && rx && rx.meta && !rx.done && rx.meta.key === d.key) break;
        if (rx && rx.meta && rx.meta.key !== d.key) teardownRx();
        if (DISK_OK) cleanDisk(d.key);
        // un ami choisit une vidéo : la mienne (si j'en ai une) est remplacée par la sienne
        stopYT(true);
        if (localFile) localFile = null;
        pvReset();
        resetVideo();
        $('fname').textContent = d.name;
        setDrop(roomMode === 'file' ? 'Réception de la vidéo' : "Connexion à la vidéo de ton ami…", d.name, false, 0);
        if (roomMode === 'file') answerSource(d, c);
        break;
      case 'subs': applySubs(d.text); break;
      case 'audio':
        if (isHost) {
          aFor[c.peer] = AUDIO[d.a] ? d.a : DEF_A;
          if (rtcBroadcaster) rtcBroadcaster.setQuality(c.peer).catch(function (err) { console.error('[diffusion]', err); });
          renderQ();
        }
        break;
      case 'quality': if (isHost && c && c !== peer) { c.q = QUALS[d.q] ? d.q : DEF_Q; renderQ(); }
        if (localFile && d.pid && peer && d.pid !== peer.id) serveQuality(d.pid, QUALS[d.q] ? d.q : DEF_Q, +d.at || 0); break;
      case 'rtc':
        if (isHost) { if (rtcBroadcaster) rtcBroadcaster.onMessage(c.peer, d.m).catch(function (err) { console.error('[diffusion]', err); }); }
        else rtcViewerEnsure().onMessage(c.peer, d.m).catch(function (err) { console.error('[réception]', err); });
        break;
      case 'mode': roomMode = d.m === 'file' ? 'file' : 'stream'; renderQ(); break;
      case 'needfile':
        if (isHost && localFile && roomMode === 'file') {
          var sc = sendConn[c.peer];
          if (sc && !sc.dead && sc.xid === xferId && Date.now() - (sc.actAt || 0) < 10000) break;     // envoi déjà en cours : pas de doublon
          var nf = (d.key === fileKeyOf(localFile)) ? (+d.from || 0) : 0;
          sendWholeFile(c.peer, 0, Math.min(nf, localFile.size));
        }
        break;
      case 'state': applyState(d); break;
      case 'hb': onHeartbeat(d); break;
      case 'yt':
        if (!/^[\w-]{11}$/.test(String(d.id))) break;
        if (yt.active && yt.id === d.id) { if (typeof d.time === 'number') applyYtState({ playing: !!d.playing, time: d.time }); break; }
        ytAudioIncoming = !!d.audio;
        startYT(d.id, d.start || d.time || 0, false, typeof d.time === 'number' ? { playing: !!d.playing, time: d.time } : null);
        addMsg('', (d.name || 'Ton ami') + ' a ouvert une vidéo YouTube. Appuyez sur lecture : vous serez synchronisés.', 'sys');
        break;
      case 'ytstate': if (yt.active && d.id === yt.id) applyYtState(d); break;
      case 'embed': if (!isHost) startEmbed(d.src, d.label, false); break;
      case 'embedstop': if (!isHost) stopEmbed(true); break;
      case 'spot': if (!isHost) startSpot(d.uri); break;
      case 'spotstate': if (!isHost) applySpotState(d); break;
      case 'spotctl': if (isHost) hostSpotCtl(d); break;
      case 'multi': startMulti(d.a, d.b, false); break;
      case 'mctl': if (multi.active) mDo(d.act, d.arg); break;
      case 'mmute': if (multi.active) mSetLocalMute(d.k, d.on, false); break;
      case 'spotstop': if (!isHost && spot.active) stopSpot(false); break;
      case 'yths': onYtHeartbeat(d); break;
      case 'theme': case 'wpneed': case 'wpchunk': if (window.__theme) window.__theme.receive(d, c.peerName); break;
      case 'ytstop': if (yt.active) { stopYT(true); addMsg('', (d.name || 'Ton ami') + ' a arrêté la vidéo YouTube.', 'sys'); } break;
    }
  }

  // Présence : chacun envoie un signe de vie toutes les 3 s. Sans nouvelles pendant 20 s, la connexion est considérée coupée.
  // invité : rétablit le lien avec l'hôte (nouveau lien de signalisation, ou nouvelle connexion directe)
  function guestLink() {
    if (isHost || noReconnect || !joinedOnce || !roomCode || openConns().length) return;
    var now = Date.now();
    if (now - lastTry < 6000) return;
    lastTry = now;
    if (!peer || peer.destroyed) {
      startPeer(null, function () { setupConn(peer.connect(peerId(roomId), { reliable: true })); });
    } else if (peer.disconnected) {
      try { peer.reconnect(); } catch (e) {}                       // l'événement 'open' relance la connexion
    } else {
      try { setupConn(peer.connect(peerId(roomId), { reliable: true })); } catch (e) {}
    }
  }
  // retour au premier plan (appel téléphonique, changement d'application, réseau revenu) : on vérifie tout de suite que le lien est vivant
  function onResume() {
    if (!peer || document.hidden) return;
    var t = Date.now();
    if (t - lastResume < 1500) return;
    lastResume = t; lastTry = 0;
    if (peer.disconnected && !peer.destroyed) { try { peer.reconnect(); } catch (e) {} }
    openConns().forEach(function (c) { try { c.send({ t: 'ping' }); } catch (e) { dropConn(c); } });
    setTimeout(function () {
      conns.slice().forEach(function (c) { if ((c.lastSeen || 0) < t) dropConn(c); });   // aucune réponse : lien mort
      lastTry = 0; guestLink();
    }, 4000);
    guestLink();
  }
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') onResume(); });
  window.addEventListener('pageshow', onResume);
  window.addEventListener('online', onResume);
  // battement de cœur : tourne dans un Web Worker, que le navigateur ralentit moins en arrière-plan
  function tickLink() {
    var now = Date.now();
    openConns().forEach(function (c) { try { c.send({ t: 'ping' }); } catch (e) {} });
    conns.slice().forEach(function (c) { if (now - (c.lastSeen || now) > 90000) dropConn(c); });   // 90 s sans nouvelles : lien mort
    if (peer && peer.disconnected && !peer.destroyed) { try { peer.reconnect(); } catch (e) {} }
    guestLink();
    // invité : hôte injoignable depuis plus de 30 secondes => le salon se ferme
    if (!isHost && joinedOnce && !openConns().length) {
      if (!guestDownSince) guestDownSince = now;
      else if (now - guestDownSince > 30000 && !closing) closeRoom("L'hôte ne répond plus : le salon est fermé.", false);
    } else guestDownSince = 0;
  }
  var guestDownSince = 0;
  var tickWorker = null;
  try {
    tickWorker = new Worker(URL.createObjectURL(new Blob(['setInterval(function () { postMessage(1); }, 3000);'], { type: 'application/javascript' })));
    tickWorker.onmessage = tickLink;
  } catch (e) { tickWorker = null; }
  if (!tickWorker) setInterval(tickLink, 3000);
  // fermeture de l'onglet : on prévient les autres tout de suite
  function leave(e) {
    // l'hôte qui ferme l'onglet ferme le salon pour tout le monde ; l'ami ne fait que se retirer
    // l'hôte qui ferme la page : la salle est fermée, elle ne sera pas restaurée à la réouverture
    if (isHost && !(e && e.persisted)) { try { localStorage.removeItem('a2g-session'); } catch (x) {} }
    if (!(e && e.persisted)) conns.slice().forEach(function (c) { try { c.send({ t: isHost ? 'closed' : 'bye' }); } catch (x) {} });
    if (!(e && e.persisted)) { try { peer && peer.destroy(); } catch (x) {} }     // page mise en cache (retour arrière) : on garde la connexion
  }
  window.addEventListener('pagehide', leave);
  window.addEventListener('beforeunload', leave);   // filet de sécurité : certains navigateurs mobiles ne déclenchent que l'un des deux

  /* ---------- réseau : connexion ---------- */
  /* Serveurs de connexion (STUN + TURN) : le TURN relaie la vidéo quand la connexion directe échoue (4G, certaines box).
     Remplace les identifiants TURN par les tiens si tu en as (plus fiable que le service public de test). */
  // Relais TURN : « openrelay » est un service public partagé, il peut être lent ou saturé.
  // Pour une connexion plus fiable, ajoute ici tes propres identifiants TURN (compte gratuit chez un fournisseur TURN),
  // puis garde openrelay en secours.
  var PEER_OPTS = {
    config: {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
        { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
        { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' }
      ],
      iceCandidatePoolSize: 4
    }
  };
  // mêmes serveurs STUN/TURN pour la diffusion vidéo que pour la connexion PeerJS (indispensable sur 4G / Wi-Fi différents)
  RTCCore.CONFIG.iceServers = PEER_OPTS.config.iceServers;

  // Identifiants TURN temporaires fournis par ton Worker Cloudflare (voir le guide). Tant que l'adresse n'est pas remplie, rien ne change.
  var TURN_URL = 'https://anything2gether.toumiachraf9.workers.dev';
  var ICE_READY = (function () {
    if (!TURN_URL || TURN_URL.indexOf('VOTRE-') !== -1) return Promise.resolve();
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var tm = setTimeout(function () { if (ctrl) ctrl.abort(); }, 4000);
    return fetch(TURN_URL, ctrl ? { signal: ctrl.signal } : {})
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        clearTimeout(tm);
        if (!j || !j.iceServers || !j.iceServers.length) return;
        PEER_OPTS.config.iceServers = j.iceServers.concat(PEER_OPTS.config.iceServers);
        RTCCore.CONFIG.iceServers = PEER_OPTS.config.iceServers;
      })
      .catch(function () { clearTimeout(tm); });   // service indisponible : on garde les serveurs de secours
  })();
  // on ne crée la connexion qu'une fois les serveurs relais prêts
  function startPeer(id, onOpen) { ICE_READY.then(function () { startPeerNow(id, onOpen); }); }
  function startPeerNow(id, onOpen) {
    if (typeof Peer === 'undefined') {
      $('home-error').textContent = 'Impossible de charger la connexion directe. Vérifie ta connexion internet.';
      return;
    }
    var firstOpen = true;
    peer = id ? new Peer(id, PEER_OPTS) : new Peer(PEER_OPTS);
    peer.on('open', function (pid) {
      if (firstOpen) { firstOpen = false; onOpen(pid); }
      else if (!isHost && !openConns().length) { try { setupConn(peer.connect(peerId(roomId), { reliable: true })); } catch (e) {} }   // lien de signalisation rétabli
    });
    peer.on('connection', function (c) {
      if (c.label === 'file') receiveWhole(c);
      else if (isHost) setupConn(c);
    });
    peer.on('error', function (e) {
      if (e.type === 'peer-unavailable') {
        if (isHost) return;                                   // un ami est parti : la salle reste ouverte, sans message
        if (joinedOnce) {                                   // déjà entré dans la salle : on réessaie, sans renvoyer à l'accueil
          lastUnavail = Date.now();
        } else backHome("Aucune salle avec cet ID. Vérifie l'ID ou demande à ton ami de recréer la salle.");
      }
      else if (e.type === 'unavailable-id' && isHost) {
        // cet ID est déjà utilisé : ancienne session pas encore libérée, ou autre appareil. On réessaie, puis on en tire un autre.
        try { peer.destroy(); } catch (x) {}
        if (++devTries > 10) { setNewDev(); roomId = myDev; devTries = 1; }
        $('home-error').textContent = 'Connexion de ton ID ' + fmtId(roomId) + '…';
        setTimeout(function () { if (isHost && !$('home').hidden) openHost(); }, 2500);
      }
      else {
        var MSG = {
          'network': "Impossible de joindre le serveur de connexion. Vérifie ta connexion Internet.",
          'server-error': "Le serveur de connexion ne répond pas. Réessaie dans un instant.",
          'socket-error': "Le serveur de connexion ne répond pas. Réessaie dans un instant.",
          'socket-closed': "Le serveur de connexion ne répond pas. Réessaie dans un instant.",
          'browser-incompatible': "Ce navigateur ne permet pas la connexion. Essaie Chrome, Firefox ou Safari récent."
        };
        $('home-error').textContent = MSG[e.type] || ('Erreur de connexion : ' + e.type);
        updateStatus();
      }
    });
    peer.on('disconnected', function () { try { peer.reconnect(); } catch (e) {} });
  }

  video.addEventListener('loadeddata', function () { if (hasVideo) { $('drop').hidden = true; } });
  video.addEventListener('loadedmetadata', function () { renderQ(); });
  video.addEventListener('resize', function () { renderQ(); });


  var localRetry = { n: 0, at: 0 };
  function recoverLocal() {
    var now = Date.now(), f = localFile;
    if (now - localRetry.at > 60000) localRetry.n = 0;
    if (localRetry.n >= 3) return false;               // trop d'échecs de suite : on affiche le message d'erreur
    localRetry.n++; localRetry.at = now;
    var t = video.currentTime || 0, wasPlaying = !video.paused;
    applyingUntil = Date.now() + 5000;                  // la pause causée par l'erreur n'est pas envoyée à l'ami
    // 1) le fichier est-il encore lisible ? 2) si oui on crée une nouvelle adresse de lecture et on reprend à la même seconde
    f.slice(0, 65536).arrayBuffer().then(function () {
      if (f !== localFile || !hasVideo) return;
      var old = video.currentSrc || video.src;
      video.src = URL.createObjectURL(typedBlob(f));
      try { if (old) URL.revokeObjectURL(old); } catch (x) {}
      video.addEventListener('loadedmetadata', function once() {
        video.removeEventListener('loadedmetadata', once);
        try { video.currentTime = t; } catch (x) {}
        applyingUntil = Date.now() + 2000;
        if (wasPlaying) tryPlay();
      });
    }, function () {
      if (f !== localFile) return;
      addMsg('', "Le téléphone ne peut plus lire le fichier (déplacé, supprimé, ou stocké sur Drive/Photos). Re-sélectionne la vidéo depuis la mémoire du téléphone.", 'sys');
    });
    return true;
  }
  // mode fichier complet : en cas d'erreur, la vidéo recharge depuis le début (3 essais par minute)
  var fullRetry = { n: 0, at: 0 };
  function restartFromStart() {
    var now = Date.now();
    if (now - fullRetry.at > 60000) fullRetry.n = 0;
    if (fullRetry.n >= 3) return false;
    var src = video.currentSrc || video.src;
    if (!src) return false;
    fullRetry.n++; fullRetry.at = now;
    applyingUntil = Date.now() + 5000;                 // la pause due à l'erreur n'est pas envoyée aux autres
    try { video.removeAttribute('src'); video.load(); } catch (x) {}
    video.src = src;
    video.addEventListener('loadedmetadata', function once() {
      video.removeEventListener('loadedmetadata', once);
      try { video.currentTime = 0; } catch (x) {}
      tryPlay();
    });
    addMsg('', 'Erreur de lecture : la vidéo redémarre depuis le début.', 'sys');
    return true;
  }
  video.addEventListener('error', function () {
    var e = video.error;
    if (!e || !hasVideo) return;
    if (pv.active && !pv.done) { if (!pv.waitingSince) pv.waitingSince = Date.now(); return; }   // données encore incomplètes : géré par la lecture progressive
    if (roomMode === 'file' && !yt.active && !embedSrc && restartFromStart()) return;
    // lecture de MON fichier (hôte) interrompue par une erreur de lecture disque : on rouvre le fichier et on reprend là où on était
    if (localFile && e.code === 2 && recoverLocal()) return;
    if (Date.now() - lastErrAt < 4000) return;
    lastErrAt = Date.now();
    if (e.code === 4) {
      addMsg('', "Ce fichier ne peut pas être lu par ce navigateur : format ou codec non pris en charge (souvent H.265/HEVC, ou MKV avec un codec rare). Convertis-le en MP4 (H.264 + AAC), ou essaie avec un autre navigateur.", 'sys');
    } else if (localFile && e.code === 2) {
      addMsg('', "Le navigateur n'arrive plus à lire ton fichier (erreur « " + (e.message || 'lecture') + " »). Re-sélectionne la vidéo depuis la mémoire du téléphone (dossier Téléchargements ou Films, pas depuis Drive, Photos ou une carte réseau) avec « Choisir un fichier ».", 'sys');
    } else {
      addMsg('', 'Erreur de lecture (code ' + e.code + (e.message ? ' : ' + e.message : '') + '). Si elle continue, demande à ton ami de renvoyer la vidéo.', 'sys');
    }
  });

  /* ---------- lecture locale et synchronisation ---------- */
  function resetVideo() {
    // remise à zéro complète : chaque source part d'un écran propre (aucun reste d'une source précédente)
    if (typeof multi !== 'undefined' && multi.active) stopMulti(true);
    if (typeof spot !== 'undefined' && spot.active) stopSpot(true);
    if (typeof yt !== 'undefined' && yt.active) stopYT(true);
    if (embedSrc) stopEmbed(true);
    if (typeof applyAudioMode === 'function') applyAudioMode(false);
    if (typeof screenStream !== 'undefined' && screenStream) {
      endScreenTracks();
      if (rtcBroadcaster) { try { rtcBroadcaster.stop(); } catch (e) {} rtcBroadcaster = null; }
      holdScreen(false);
      if (typeof updateScreenBtn === 'function') updateScreenBtn();
    }
    if (typeof clearYtBox === 'function') clearYtBox();
    if (typeof syncPlyr === 'function') syncPlyr();
    applyingUntil = Date.now() + 3000;                                   // la pause qui suit est faite par l'appli, pas par la personne : on ne l'envoie pas aux autres
    hasVideo = false; pendingState = null; liveMode = false; layout.classList.remove('livemode');
    video.srcObject = null;
    try { video.pause(); } catch (e) {}
    video.playbackRate = 1;
    if (video.src) { try { URL.revokeObjectURL(video.src); } catch (e) {} video.removeAttribute('src'); video.load(); }
  }
  // Côté ami : on retient la position de lecture par fichier (sur cet appareil), pour reprendre au même endroit
  // après la fin du téléchargement, après un rechargement ou une reconnexion, au lieu de repartir de 0.
  var POS_KEY = 'a2g-pos', lastPosSave = 0;
  function savePos() {
    if (localFile || !hasVideo || liveMode || yt.active || (pv.active && !pv.done)) return;
    var m = readMeta(); if (!m || !m.key) return;
    if (!isFinite(video.duration) || video.duration - video.currentTime < 5) return;   // presque fini : on ne reprend pas à la fin
    var now = Date.now(); if (now - lastPosSave < 2000) return; lastPosSave = now;
    try { localStorage.setItem(POS_KEY, JSON.stringify({ key: m.key, t: video.currentTime })); } catch (e) {}
  }
  function savedPosFor(key) {
    try { var q = JSON.parse(localStorage.getItem(POS_KEY) || 'null'); return (q && q.key === key && q.t > 1) ? q.t : 0; } catch (e) { return 0; }
  }
  video.addEventListener('timeupdate', savePos);
  function armPending() {
    video.addEventListener('loadedmetadata', function once() {
      video.removeEventListener('loadedmetadata', once);
      if (pendingState) { var p = pendingState; pendingState = null; applyState(p); }
      else if (!localFile && (!pv.active || pv.done)) {                 // pas de position de l'hôte : on reprend là où on était
        var mm = readMeta(), sp = mm ? savedPosFor(mm.key) : 0;
        if (sp) { try { video.currentTime = sp; } catch (e) {} }
      }
    });
  }
  function startVideo(url, label) {
    resetVideo();
    video.src = url;
    hasVideo = true;
    $('drop').hidden = true;
    $('fname').textContent = label;
    armPending();
  }
  // avant de lancer quoi que ce soit, on vérifie que le navigateur sait vraiment LIRE ce fichier (début, milieu, fin).
  // Sur téléphone, un fichier « choisi » peut être illisible (stocké sur Drive/Photos, déplacé, accès retiré) : on le dit tout de suite
  // au lieu de laisser l'ami devant un écran bloqué.
  // lecture d'un morceau du fichier : sur téléphone, une lecture peut échouer ponctuellement (fichier prêté par le système) → on réessaie, puis on tente FileReader
  async function readSlice(f, a, b) {
    var last;
    for (var k = 0; k < 3; k++) {
      try { return await f.slice(a, b).arrayBuffer(); } catch (e) { last = e; }
      try {
        return await new Promise(function (res, rej) {
          var r = new FileReader();
          r.onload = function () { res(r.result); };
          r.onerror = function () { rej(r.error || new Error('read')); };
          r.readAsArrayBuffer(f.slice(a, b));
        });
      } catch (e) { last = e; }
      await sleep(300 * (k + 1));
    }
    throw last;
  }
  async function probeFile(f) {
    var sz = f.size;
    if (!sz) throw new Error('fichier vide');
    var pts = [0];
    if (sz > 262144) { pts.push(Math.floor(sz / 2)); pts.push(sz - 65536); }
    for (var i = 0; i < pts.length; i++) await readSlice(f, pts[i], Math.min(sz, pts[i] + 65536));
  }
  function fileUnreadable(f, e) {
    var n = String((e && (e.name || e.message)) || 'lecture').slice(0, 40);
    addMsg('', "Le navigateur n'arrive pas à lire « " + f.name + " » (" + n + "). Causes fréquentes : la vidéo n'est pas vraiment stockée sur le téléphone (Google Photos, Drive), elle est encore en cours de copie, ou elle a été déplacée. Télécharge-la sur le téléphone, puis appuie à nouveau sur « Choisir un fichier » : le sélecteur de fichiers complet s'ouvre (Téléchargements, Films…).", 'sys');
    try { $('file').accept = ''; $('file').value = ''; } catch (x) {}   // prochain choix : sélecteur de fichiers complet, pas la galerie
  }
  function loadFile(f) {
    if (!f) return Promise.resolve(false);
    // tout fichier est accepté : on avertit seulement si ce navigateur ne sait pas le lire
    var probeV = document.createElement('video');
    var canMine = probeV.canPlayType(mimeFor(f.name, f.type) || 'video/mp4');
    if (!canMine) {
      addMsg('', '« ' + f.name + ' » ne peut peut-être pas être lu par ton navigateur. Il sera envoyé quand même (mode fichier complet), mais la lecture pourrait échouer chez toi ou chez ton ami.', 'sys');
    }
    return probeFile(f).then(function () { loadFileNow(f); return true; }, function (e) { fileUnreadable(f, e); return false; });
  }
  function loadFileNow(f) {
    if (!f) return;
    xferId++;
    for (var pk in sendConn) { if (sendConn[pk]) { sendConn[pk].dead = true; try { sendConn[pk].close(); } catch (e) {} } }
    sendConn = {};
    stopYT(true);
    stopEmbed(true);
    localFile = f;
    var nm = savedMode();                          // mode choisi pour cet envoi (mémorisé)
    if (nm !== roomMode) { roomMode = nm; broadcast({ t: 'mode', m: nm }); }
    prepareSend(f);
    renderQ();   // nouveau film : les anciennes versions converties ne servent plus
    startVideo(URL.createObjectURL(typedBlob(f)), f.name + ' · ' + fmtSize(f.size));
    broadcast({ t: 'source', name: f.name, size: f.size, key: fileKeyOf(f) });
    endScreenTracks();
    if (rtcBroadcaster) { rtcBroadcaster.stop(); rtcBroadcaster = null; holdScreen(sendsActive > 0); }
    if (!openConns().length) addMsg('', "En attente d'un ami : la vidéo lui sera envoyée dès qu'il rejoint.", 'sys');
    else if (roomMode !== 'file') addMsg('', "Envoi de la vidéo à ton ami. Si le lecteur de ton ami attend des données, utilise « Synchroniser » pour vous recaler.", 'sys');
  }
  function tryPlay() {
    if (pv.active && !pv.done && video.ended) return;     // fin des données reçues : play() repartirait du début
    var p = video.play();
    if (p && p.catch) p.catch(function () { $('tap').hidden = false; });
  }
  function stateMsg() { return { t: 'state', playing: !video.paused, time: video.currentTime }; }

  // action d'une personne (lecture, pause, saut) : envoyée aux autres
  function emit(force) {
    if (!hasVideo || liveMode) return;
    if (!force && Date.now() < switchingUntil) return;                    // changement de qualité en cours : aucune pause/saut n'est envoyé aux autres
    if (!force && (!userRecent() || Date.now() < applyingUntil)) return;
    broadcast(stateMsg());
  }
  ['play', 'pause', 'seeked'].forEach(function (ev) { video.addEventListener(ev, function () { emit(false); }); });
  video.addEventListener('playing', function () { $('tap').hidden = true; switchingUntil = 0; });

  // état reçu après une action de l'autre personne : on s'aligne tout de suite
  function applyState(s) {
    remote = { playing: s.playing, time: s.time, at: performance.now(), known: true };
    if (!hasVideo || (!liveMode && video.readyState < 1)) { pendingState = s; return; }
    applyingUntil = Date.now() + 1200;
    if (pv.active && !pv.done) pv.lastPlaying = !!s.playing;
    if (!liveMode && Math.abs(video.currentTime - s.time) > 0.7) seekTo(s.time);
    if (pv.swapping) return;
    video.playbackRate = 1;
    if (s.playing && video.paused) tryPlay();
    else if (!s.playing && !video.paused) video.pause();
  }

  // la source (celui qui a le fichier) envoie sa position toutes les 2,5 s : les autres se recalent doucement
  function sendHeartbeat() { broadcast({ t: 'hb', playing: !video.paused, time: video.currentTime, oh: origH || 0 }); }
  setInterval(function () {
    if (!localFile || !hasVideo || !openConns().length) return;
    hostEnsureLive();
    sendHeartbeat();
  }, 2500);

  function onHeartbeat(s) {
    remote = { playing: s.playing, time: s.time, at: performance.now(), known: true };
    if (s.oh) origH = s.oh;
    if (localFile) return;
    if (!hasVideo || (!liveMode && video.readyState < 1)) { pendingState = s; return; }
    if (userRecent() || pv.swapping) return;
    if (liveMode) {                       // flux live : seule la lecture/pause suit l'hôte
      if (s.playing) { if (video.paused) tryPlay(); }
      else if (!video.paused) { applyingUntil = Date.now() + 1500; video.pause(); }
      return;
    }
    var diff = video.currentTime - s.time;
    if (s.playing) {
      if (video.paused) tryPlay();
      if (Math.abs(diff) > 3) { applyingUntil = Date.now() + 1500; seekTo(s.time); video.playbackRate = 1; }
      else if (Math.abs(diff) > 0.35 && video.readyState >= 3) { video.playbackRate = diff > 0 ? 0.94 : 1.06; }
      else if (video.playbackRate !== 1) { video.playbackRate = 1; }
    } else {
      video.playbackRate = 1;
      if (!video.paused) { applyingUntil = Date.now() + 1500; video.pause(); }
      if (Math.abs(diff) > 1.5) { applyingUntil = Date.now() + 1500; seekTo(s.time); }
    }
  }

  // surveillance côté ami : si la lecture reste en pause ou figée alors que l'hôte joue, on se recale et on relance tout seul
  var wdLast = -1, wdSince = 0;
  setInterval(function () {
    if (localFile || yt.active || !hasVideo || !remote.known || !remote.playing) { wdSince = 0; return; }
    if (pv.swapping) return;
    var now = performance.now();
    if (now - remote.at > 6000) { wdSince = 0; return; }
    if (liveMode) { if (video.paused && !userRecent() && Date.now() >= switchingUntil) tryPlay(); return; }
    if (userRecent() || Date.now() < switchingUntil) return;
    var target = remote.time + (now - remote.at) / 1000;
    if (video.paused) {
      if (video.readyState >= 1 && !video.ended) {
        applyingUntil = Date.now() + 1500;
        if (Math.abs(video.currentTime - target) > 1) seekTo(target);
        tryPlay();
      }
      return;
    }
    if (Math.abs(video.currentTime - wdLast) < 0.05) {          // position figée : données manquantes
      if (!wdSince) wdSince = now;
      else if (now - wdSince > 2500) {
        wdSince = now;
        if (video.readyState >= 2) tryPlay();
      }
    } else { wdLast = video.currentTime; wdSince = 0; }
  }, 1000);

  // pause que personne n'a demandée alors que la source joue : on reprend
  video.addEventListener('pause', function () {
    if (localFile || userRecent() || pv.swapping) return;
    if (remote.known && remote.playing && performance.now() - remote.at < 6000) {
      setTimeout(function () {
        if (video.paused && !userRecent() && remote.playing && performance.now() - remote.at < 8000) tryPlay();
      }, 300);
    }
  });

  // garde l'écran allumé pendant la lecture (téléphone)
  function keepAwake() {
    try {
      if (navigator.wakeLock && !wakeLock) {
        navigator.wakeLock.request('screen').then(function (l) {
          wakeLock = l; l.addEventListener('release', function () { wakeLock = null; });
        }, function () {});
      }
    } catch (e) {}
  }
  video.addEventListener('play', keepAwake);
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible' && !video.paused) keepAwake(); });

  /* =====================================================
     QUALITÉ DE LECTURE
     - Original : le fichier est transmis tel quel (aucun réencodage ; seul le découpage en fragments pour lire pendant la réception).
     - 1080p / 720p / 480p / 360p : la personne qui a le fichier le convertit (WebCodecs, H.264, son conservé tel quel),
       puis l'envoie à celui qui l'a demandé. Chacun choisit sa qualité ; la lecture reste synchronisée.
     - Le bouton est intégré à la barre du lecteur (Plyr).
     ===================================================== */
  var DEF_Q = '360';                        // qualité par défaut à chaque session
  var QUALS = {
    'orig': { label: 'Original', h: 0, bps: 12000000 },
    '2160': { label: '2160p (4K)', h: 2160, bps: 12000000 },
    '1440': { label: '1440p', h: 1440, bps: 8000000 },
    '1080': { label: '1080p', h: 1080, bps: 5000000 },
    '720': { label: '720p', h: 720, bps: 2500000 },
    '480': { label: '480p', h: 480, bps: 1200000 },
    '360': { label: '360p', h: 360, bps: 700000 },
    '240': { label: '240p', h: 240, bps: 400000 },
    '144': { label: '144p', h: 144, bps: 200000 }
  };
  var QORDER = ['orig', '2160', '1440', '1080', '720', '480', '360', '240', '144'];
  // Son : Opus stéréo 128 kbps, fixe (le réglage n'est plus proposé)
  var AUDIO = { '128': { label: 'Standard (128 kbps)', kb: 128, bps: 128000 } };
  var DEF_A = '128', myA = DEF_A;
  var aFor = {};
  var myQ = DEF_Q, curQ = DEF_Q, origH = 0, qNote = {}, qUI = null, qChosenAt = 0;
  try { localStorage.removeItem('samaraf-quality'); } catch (e) {}   // toujours Original au départ
  function qLabel(k) { return (QUALS[k] || QUALS[DEF_Q]).label; }
  function saveQ() { /* la qualité n'est plus mémorisée : on repart toujours d'Original */ }

  /* ---------- interface ---------- */
  function mountQualityUI() {
    if (!plyrPlayer || qUI) return;
    var ctrls = plyrPlayer.elements && plyrPlayer.elements.controls;
    if (!ctrls) return;
    var wrap = document.createElement('div');
    wrap.className = 'plyr__menu q-menu';
    wrap.innerHTML =
      '<button class="plyr__control q-btn" type="button" aria-haspopup="true" aria-expanded="false" aria-label="Qualité de lecture"><span class="q-cur">Orig.</span></button>' +
      '<div class="plyr__menu__container q-pop" hidden><div><div role="menu" class="q-list"></div></div></div>';
    var gear = ctrls.querySelector('.plyr__menu'), fs = ctrls.querySelector('[data-plyr="fullscreen"]');
    ctrls.insertBefore(wrap, gear || fs || null);
    qUI = { wrap: wrap, btn: wrap.querySelector('.q-btn'), cur: wrap.querySelector('.q-cur'), pop: wrap.querySelector('.q-pop'), list: wrap.querySelector('.q-list') };
    function setOpen(o) { qUI.pop.hidden = !o; qUI.btn.setAttribute('aria-expanded', o ? 'true' : 'false'); }
    qUI.close = function () { setOpen(false); };
    qUI.btn.addEventListener('click', function (e) { e.stopPropagation(); renderQ(); setOpen(qUI.pop.hidden); });
    qUI.list.addEventListener('click', function (e) {
      var ba = e.target.closest && e.target.closest('[data-a]');
      if (ba && !ba.disabled) { e.stopPropagation(); setOpen(false); chooseAudio(ba.getAttribute('data-a')); return; }
      var b = e.target.closest && e.target.closest('[data-q]');
      if (!b || b.disabled) return;
      e.stopPropagation(); setOpen(false); chooseQuality(b.getAttribute('data-q'));
    });
    document.addEventListener('click', function (e) { if (!qUI.pop.hidden && !wrap.contains(e.target)) setOpen(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !qUI.pop.hidden) setOpen(false); });
    try { plyrPlayer.on('controlshidden', function () { setOpen(false); }); } catch (e) {}
    renderQ();
  }
  function renderQ() {
    if (qUI) qUI.wrap.hidden = (roomMode === 'file');   // mode fichier complet : pas de menu de qualité
    if (!qUI) return;
    var owner = !!localFile;
    if (roomMode === 'file' && !owner) {
      qUI.list.innerHTML = '<div class="q-title">Fichier complet : la qualité est celle du fichier reçu.</div>';
      qUI.cur.textContent = 'Fichier';
      return;
    }
    var html = '<div class="q-title">Qualité de lecture</div>';
    // ce qui est affiché = ce qui est vraiment lu ; le choix qu'on vient de faire s'affiche en attendant son arrivée
    var shown = owner ? null : ((hasVideo && myQ !== curQ && Date.now() - qChosenAt < 120000) ? myQ : (hasVideo ? curQ : myQ));
    QORDER.forEach(function (k) {
      var tooBig = origH && QUALS[k].h > origH + 8;
      if (tooBig && k !== DEF_Q) return;                          // inutile de proposer plus grand que la vidéo
      var lab = QUALS[k].label;
      if (k === 'orig') lab = origH ? 'Original (' + origH + 'p)' : 'Original';
      else if (tooBig) lab = 'Source (' + origH + 'p)';
      var on = (k === shown), val = '';
      html += '<button type="button" role="menuitemradio" class="plyr__control" data-q="' + k + '" aria-checked="' + (on ? 'true' : 'false') + '"' +
        (owner ? ' disabled' : '') + '><span>' + lab + '<span class="plyr__menu__value">' + val + '</span></span></button>';
    });
    qUI.list.innerHTML = html;
    // hôte uniquement : qualité choisie par chaque personne de la salle
    if (isHost) {
      var ps = openConns().filter(function (c) { return !c.dead; });
      if (ps.length) {
        var t = document.createElement('div'); t.className = 'q-title q-sep'; t.textContent = 'Dans la salle'; qUI.list.appendChild(t);
        ps.forEach(function (c) {
          var r = document.createElement('div'); r.className = 'q-peer';
          var n = document.createElement('span'); n.className = 'q-pn'; n.textContent = c.peerName || 'Un ami';
          var v = document.createElement('span'); v.className = 'q-pq'; v.textContent = qLabel(c.q || DEF_Q) + ' · son ' + (AUDIO[aFor[c.peer] || DEF_A] || AUDIO[DEF_A]).kb + ' kbps';
          r.appendChild(n); r.appendChild(v); qUI.list.appendChild(r);
        });
      }
    }
    qUI.cur.textContent = owner ? 'Ton fichier' : QUALS[shown].label;
  }
  if (plyrPlayer) { mountQualityUI(); if (!qUI) { try { plyrPlayer.on('ready', mountQualityUI); } catch (e) {} } }

  function chooseAudio(k) {
    if (!AUDIO[k] || k === myA || localFile || roomMode === 'file') return;
    myA = k; renderQ();
    conns.forEach(function (c) { if (c.open) c.send({ t: 'audio', a: k }); });
  }
  function chooseQuality(k) {
    if (!QUALS[k] || k === myQ) return;
    if (localFile || roomMode === 'file') return;
    myQ = k; qNote = {}; qChosenAt = Date.now(); saveQ(); renderQ();
    if (!localFile) broadcast({ t: 'quality', q: k, pid: peer && peer.id, at: hasVideo ? Math.max(0, video.currentTime - 2) : 0 });
  }

  /* ---------- envoi : qui reçoit quoi ---------- */
  function sendBest(pid) {
    rtcServe(pid);                                                   // diffusion live de la vidéo à cet ami
  }
  function serveQuality(pid, key, hint) {
    if (!localFile || !peer) return;
    if (!QUALS[key]) key = DEF_Q;
    qFor[pid] = key;
    rtcServe(pid);
  }

  /* =====================================================
     YOUTUBE
     Chacun lit la vidéo directement depuis YouTube : rien ne passe entre vous (fluide, qualité adaptative).
     Seuls lecture, pause et position sont synchronisées.
     - une action faite par une personne est envoyée aux autres (les actions du lecteur sont ignorées pendant 1,8 s après une synchro reçue)
     - celui qui a ouvert le lien envoie sa position toutes les 3 s ; les autres ne se recalent que si l'écart dépasse 1,5 s
       (jamais pendant le chargement, au plus une correction toutes les 4 s) pour éviter les saccades
     ===================================================== */
  var yt = { active: false, id: '', source: false, ready: false, pready: false, player: null, pend: null, gen: 0 };
  var ytApplyUntil = 0, ytLastLocal = 0, ytLastCorr = 0, ytWant = false, ytPoll = null, ytApiP = null, ytTapTimer = null;
  var DROP0 = { t: $('drop-title').textContent, x: $('drop-text').textContent };

  function parseYt(s) {
    s = (s || '').trim();
    if (!s) return null;
    if (/^[\w-]{11}$/.test(s)) return { id: s, start: 0 };
    var u;
    try { u = new URL(/^https?:\/\//i.test(s) ? s : 'https://' + s); } catch (e) { return null; }
    var h = u.hostname.replace(/^(www|m|music)\./, ''), id = null;
    if (h === 'youtu.be') id = u.pathname.split('/')[1];
    else if (h === 'youtube.com' || h === 'youtube-nocookie.com') {
      var m = u.pathname.match(/^\/(?:shorts|embed|live|v)\/([\w-]{11})/);
      id = m ? m[1] : u.searchParams.get('v');
    }
    if (!id || !/^[\w-]{11}$/.test(id)) return null;
    var t = u.searchParams.get('t') || u.searchParams.get('start') || '', sec = 0;
    if (/^\d+s?$/.test(t)) sec = parseInt(t, 10);
    else if (t) { var mm = t.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/); if (mm) sec = (+mm[1] || 0) * 3600 + (+mm[2] || 0) * 60 + (+mm[3] || 0); }
    return { id: id, start: sec };
  }
  function loadYtApi() {
    if (window.YT && window.YT.Player) return Promise.resolve();
    if (ytApiP) return ytApiP;
    ytApiP = new Promise(function (res, rej) {
      var prev = window.onYouTubeIframeAPIReady, done = false;
      window.onYouTubeIframeAPIReady = function () { done = true; try { if (prev) prev(); } catch (e) {} res(); };
      var s = document.createElement('script'); s.src = 'https://www.youtube.com/iframe_api'; s.async = true;
      s.onerror = function () { ytApiP = null; rej(new Error('yt')); };
      document.head.appendChild(s);
      setTimeout(function () { if (!done) { ytApiP = null; rej(new Error('timeout')); } }, 12000);
    });
    return ytApiP;
  }
  // l'API est chargée en tâche de fond dès l'entrée dans la salle : le premier lien démarre plus vite
  function warmYt() {
    var go = function () { loadYtApi().catch(function () {}); };
    if (window.requestIdleCallback) requestIdleCallback(go, { timeout: 4000 }); else setTimeout(go, 1500);
  }
  function ytState() { try { return yt.player && yt.pready ? yt.player.getPlayerState() : -1; } catch (e) { return -1; } }
  function ytCur() { try { return yt.ready ? yt.player.getCurrentTime() : (yt.pend ? yt.pend.time : 0); } catch (e) { return 0; } }
  function ytPlaying() { var s = ytState(); return s === 1 || (s === 3 && ytWant); }
  function armTap() {
    clearTimeout(ytTapTimer);
    ytTapTimer = setTimeout(function () {
      if (yt.active && yt.ready && ytWant) { var s = ytState(); if (s !== 1 && s !== 3) $('tap').hidden = false; }
    }, 2000);
  }

  var ytHost = 'https://www.youtube.com', ytAlt = false, ytLoadTimer = null;
  // L'iframe est construite ici (et non par l'API) pour imposer l'envoi de l'adresse de la page à YouTube :
  // sans cette adresse (« referrer »), YouTube répond par l'erreur 153.
  function buildYtPlayer(id, start, gen) {
    try { if (yt.player) yt.player.destroy(); } catch (e) {}
    yt.player = null; yt.pready = false; yt.ready = false;
    var q = 'enablejsapi=1&autoplay=0&controls=1&playsinline=1&rel=0&modestbranding=1&iv_load_policy=3&fs=0&start=' + Math.floor(start || 0);
    if (/^https?:$/.test(location.protocol)) q += '&origin=' + encodeURIComponent(location.origin) + '&widget_referrer=' + encodeURIComponent(location.href.split('#')[0]);
    var f = document.createElement('iframe');
    f.src = ytHost + '/embed/' + id + '?' + q;
    f.title = 'YouTube';
    f.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    f.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture');
    f.setAttribute('frameborder', '0');
    clearYtBox(); $('yt').appendChild(f);                  // on garde le panneau audio seul s'il est affiché
    yt.player = new YT.Player(f, {
      events: {
        onReady: function () { yt.pready = true; if (yt.active && gen === yt.gen) onYtLoaded(gen); },
        onStateChange: onYtState,
        onError: onYtError
      }
    });
    clearTimeout(ytLoadTimer);
    ytLoadTimer = setTimeout(function () {
      if (yt.active && gen === yt.gen && !yt.ready) { addMsg('', 'Le lecteur YouTube ne répond pas. ' + ytHelp(), 'sys'); }
    }, 12000);
  }
  function ytHelp() {
    if (location.protocol === 'file:') return "Le site est ouvert comme un simple fichier : YouTube refuse ce mode (erreur 153). Mets le fichier sur un hébergement https gratuit (Netlify Drop, GitHub Pages ou Cloudflare Pages) et ouvre-le depuis ce lien.";
    if (location.hostname === 'appassets.androidplatform.net') return "L'application n'envoie pas l'adresse de la page à YouTube (erreur 153). Ouvre le site depuis un navigateur via un lien https, ou fais ajouter un referrer dans l'application.";
    return "YouTube refuse la lecture depuis cette adresse. Vérifie que la page est servie en https et sans l'en-tête Referrer-Policy no-referrer ou same-origin.";
  }

  var ytAudioIncoming = false;
  function startYT(id, start, asSource, pend, audio) {
    if (!/^[\w-]{11}$/.test(String(id))) return;
    var aud = !!(audio || ytAudioIncoming); ytAudioIncoming = false;
    // on quitte le mode fichier : envoi arrêté, réception ignorée, mémoire du lecteur libérée
    if (localFile) localFile = null;
    if (rtcBroadcaster) rtcBroadcaster.stop();
    resetVideo();
    $('tap').hidden = true; $('drop').hidden = true; $('yt').hidden = false;
    stopEmbed(true);
    yt.active = true; yt.id = id; yt.source = !!asSource; yt.ready = false;
    applyAudioMode(aud);
    yt.pend = pend || { playing: false, time: start || 0 };
    ytWant = !!yt.pend.playing; ytPoll = null; ytLastLocal = 0;
    var gen = ++yt.gen;
    ytAlt = false;
    $('fname').textContent = 'YouTube';
    loadYtApi().then(function () {
      if (!yt.active || gen !== yt.gen) return;
      ytApplyUntil = Date.now() + 2500;
      if (yt.player && yt.pready) {                       // lecteur déjà prêt : on le réutilise (plus rapide)
        yt.player.cueVideoById({ videoId: id, startSeconds: start || 0 });
        onYtLoaded(gen);
      } else {
        ytAlt = false;
        buildYtPlayer(id, start || 0, gen);
      }
    }, function () {
      if (gen !== yt.gen) return;
      addMsg('', "Impossible de charger YouTube. Vérifie ta connexion internet.", 'sys');
      stopYT(true);
    });
  }
  // ---------- YouTube audio seul : la vidéo reste chargée mais masquée, le son continue ----------
  // vide la zone du lecteur sauf le panneau « audio seul »
  function clearYtBox() {
    var box = $('yt'); if (!box) return;
    Array.prototype.slice.call(box.childNodes).forEach(function (n) {
      if (!(n.nodeType === 1 && n.id === 'yt-audio-cover')) box.removeChild(n);
    });
  }
  // la barre de commandes Plyr (lecteur des fichiers) se cache dès qu'une vidéo externe est affichée
  function syncPlyr() {
    var box = $('yt'); var ext = !!box && !box.hidden;
    Array.prototype.forEach.call(document.querySelectorAll('.plyr'), function (pl) {
      if (ext) {
        if (pl.dataset.a2gPrev === undefined) pl.dataset.a2gPrev = pl.style.display || '';
        pl.style.setProperty('display', 'none', 'important');
      } else if (pl.dataset.a2gPrev !== undefined) {
        pl.style.removeProperty('display');
        if (pl.dataset.a2gPrev) pl.style.display = pl.dataset.a2gPrev;
        delete pl.dataset.a2gPrev;
      }
    });
  }
  function setAudioTitle(t) {
    var el = document.getElementById('yac-title'); if (el) el.textContent = t || '';
  }
  function applyAudioMode(on) {
    yt.audio = !!on;
    var box = $('yt'); if (!box) return;
    box.classList.toggle('yt-audio', !!on);
    // le lecteur YouTube reste chargé et joue, mais il est sorti de l'écran (ses commandes ne s'affichent pas)
    Array.prototype.forEach.call(box.querySelectorAll('iframe'), function (f) {
      if (on) {
        f.style.setProperty('position', 'absolute', 'important');
        f.style.setProperty('left', '-9999px', 'important');
        f.style.setProperty('top', '0', 'important');
        f.style.setProperty('width', '320px', 'important');
        f.style.setProperty('height', '180px', 'important');
        f.style.setProperty('pointer-events', 'none', 'important');
      } else {
        ['position', 'left', 'top', 'width', 'height', 'pointer-events'].forEach(function (k) { f.style.removeProperty(k); });
      }
    });
    syncPlyr();
    var cov = document.getElementById('yt-audio-cover');
    if (on && !cov) {
      cov = document.createElement('div'); cov.id = 'yt-audio-cover';
      var top = document.createElement('div'); top.className = 'yac-top';
      var ico = document.createElement('span'); ico.className = 'yac-ico'; ico.textContent = '🎧';
      var t = document.createElement('span'); t.className = 'yac-t'; t.setAttribute('data-i18n', 'yt_audio_t'); t.textContent = tr('yt_audio_t');
      top.appendChild(ico); top.appendChild(t);
      var mid = document.createElement('div'); mid.className = 'yac-mid';
      var pb = document.createElement('button'); pb.type = 'button'; pb.className = 'yac-btn'; pb.id = 'yt-audio-play';
      pb.setAttribute('aria-label', 'Lecture / pause');
      var PLAY = '<svg viewBox="0 0 24 24" width="34" height="34" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
      var PAUSE = '<svg viewBox="0 0 24 24" width="34" height="34" fill="currentColor" aria-hidden="true"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>';
      pb.innerHTML = PLAY;
      pb.addEventListener('click', function () {                 // clic de la personne : la lecture est autorisée
        if (!yt.player) { addMsg('', 'Le lecteur YouTube se charge…', 'sys'); return; }
        var st = -1; try { st = yt.player.getPlayerState(); } catch (e) {}
        if (st === 1 || st === 3) { try { yt.player.pauseVideo(); } catch (e) {} pb.innerHTML = PLAY; }
        else { try { yt.player.playVideo(); } catch (e) { addMsg('', 'Impossible de lancer la lecture.', 'sys'); } pb.innerHTML = PAUSE; }
      });
      var ttl = document.createElement('div'); ttl.className = 'yac-title'; ttl.id = 'yac-title';
      try { ttl.textContent = yt.player.getVideoData().title || ''; } catch (e) {}
      var chg = document.createElement('button'); chg.type = 'button'; chg.className = 'btn small yac-change';
      chg.setAttribute('data-i18n', 'yt_audio_change'); chg.textContent = tr('yt_audio_change');
      chg.addEventListener('click', function () { openYtPanel(); });   // choisir une autre vidéo ou playlist
      mid.appendChild(pb); mid.appendChild(ttl); mid.appendChild(chg);
      cov.appendChild(top); cov.appendChild(mid);
      (box.parentNode || box).appendChild(cov);
      $('tap').hidden = true;                     // le bouton du panneau remplace l'appui au centre
    } else if (!on && cov) cov.remove();
  }
  function onYtLoaded(gen) {
    if (!yt.active || gen !== yt.gen) return;
    applyAudioMode(yt.audio);
    yt.ready = true;
    setTimeout(function () {
      try { var t = yt.player.getVideoData().title; if (t && yt.active) { $('fname').textContent = 'YouTube · ' + t; setAudioTitle(t); } } catch (e) {}
    }, 800);
    if (yt.pend) { var p = yt.pend; yt.pend = null; applyYtState(p); }
  }
  function stopYT(quiet) {
    if (!yt.active) return;
    applyAudioMode(false);
    yt.active = false; yt.ready = false; yt.pready = false; yt.gen++;
    try { if (yt.player) yt.player.destroy(); } catch (e) {}
    yt.player = null; ytPoll = null; clearTimeout(ytTapTimer);
    $('yt').textContent = ''; $('yt').hidden = true; $('tap').hidden = true;
    if (!hasVideo) { setDrop(DROP0.t, DROP0.x, true); $('fname').textContent = "Aucune vidéo pour l'instant"; }
  }

  // état envoyé par un ami : on s'aligne
  function applyYtState(d) {
    if (!yt.active) return;
    if (!yt.ready) { yt.pend = d; return; }
    var p = yt.player, st = ytState(), cur = ytCur(), seeked = false;
    ytApplyUntil = Date.now() + 1800;
    ytWant = !!d.playing;
    try {
      if (Math.abs(cur - d.time) > 0.7) { p.seekTo(d.time, true); seeked = true; }
      if (d.playing) { if (st !== 1 && st !== 3) { p.playVideo(); armTap(); } }
      else if (seeked || st === 1 || st === 3) p.pauseVideo();
    } catch (e) {}
    ytPoll = null;
  }
  // action faite par une personne : envoyée à tout le monde
  function ytEmit() {
    if (!yt.active || !yt.ready) return;
    ytLastLocal = Date.now(); ytPoll = null;
    broadcast({ t: 'ytstate', id: yt.id, playing: ytPlaying(), time: ytCur() });
  }
  function onYtState(e) {
    if (!yt.active) return;
    var s = e.data;
    if (s === 1) { ytWant = true; $('tap').hidden = true; keepAwake(); }
    else if (s === 2) ytWant = false;
    else if (s === 0 && isHost && queue.length) {
      setTimeout(function () { if (yt.active && ytState() === 0 && queue.length) playNext(); }, 800);
    }
    if (s !== 1 && s !== 2) return;
    if (Date.now() < ytApplyUntil) return;
    ytEmit();
  }
  function onYtError(e) {
    if (e.data === 153) {
      if (!ytAlt && yt.active) {                       // premier échec : on réessaie une fois avec l'autre adresse de lecteur
        ytAlt = true;
        ytHost = ytHost.indexOf('nocookie') >= 0 ? 'https://www.youtube.com' : 'https://www.youtube-nocookie.com';
        var g = ++yt.gen, at = ytCur(), id = yt.id;
        if (!yt.pend) yt.pend = { playing: false, time: at };
        setTimeout(function () { if (yt.active && g === yt.gen) buildYtPlayer(id, at, g); }, 150);
        return;
      }
      addMsg('', 'Erreur YouTube 153. ' + ytHelp(), 'sys');
      return;
    }
    var msgs = {
      2: 'Lien YouTube invalide.',
      5: 'Cette vidéo ne peut pas être lue par le lecteur.',
      100: 'Vidéo introuvable ou privée.',
      101: "Le propriétaire de cette vidéo interdit sa lecture sur d'autres sites.",
      150: "Le propriétaire de cette vidéo interdit sa lecture sur d'autres sites."
    };
    addMsg('', msgs[e.data] || ('Erreur YouTube (' + e.data + ').'), 'sys');
  }
  // recalage doux : uniquement si l'écart est net, jamais pendant le chargement, et au plus une fois toutes les 4 s
  function onYtHeartbeat(d) {
    if (!yt.active || !yt.ready || yt.source || d.id !== yt.id) return;
    var now = Date.now();
    if (now < ytApplyUntil || now - ytLastLocal < 3500) return;
    var st = ytState(), diff = ytCur() - d.time, p = yt.player;
    try {
      if (d.playing) {
        ytWant = true;
        if (st === 3) return;
        if (st !== 1) { ytApplyUntil = now + 1500; p.playVideo(); armTap(); return; }
        if (Math.abs(diff) > 1.5 && now - ytLastCorr > 4000) { ytLastCorr = now; ytApplyUntil = now + 1500; p.seekTo(d.time + 0.3, true); ytPoll = null; }
      } else {
        ytWant = false;
        if (st === 1 || st === 3) { ytApplyUntil = now + 1500; p.pauseVideo(); }
        if (Math.abs(diff) > 1.0 && now - ytLastCorr > 4000) { ytLastCorr = now; ytApplyUntil = now + 1500; p.seekTo(d.time, true); p.pauseVideo(); ytPoll = null; }
      }
    } catch (e) {}
  }
  setInterval(function () {
    if (!yt.active || !yt.ready || !yt.source || !openConns().length || document.hidden) return;
    broadcast({ t: 'yths', id: yt.id, playing: ytPlaying(), time: ytCur() });
  }, 3000);
  // saut de position fait avec la barre du lecteur YouTube (aucun événement dédié) : détecté par comparaison toutes les 0,5 s
  setInterval(function () {
    if (!yt.active || !yt.ready) return;
    if (document.hidden) { ytPoll = null; return; }
    var now = Date.now(), t = ytCur(), st = ytState();
    var prev = ytPoll;
    ytPoll = { t: t, at: now, p: st === 1 };
    if (!prev || now < ytApplyUntil) return;
    var exp = prev.t + (prev.p ? (now - prev.at) / 1000 : 0);
    if (Math.abs(t - exp) > 1.2 && (st === 1 || st === 2 || st === 3)) ytEmit();
  }, 500);

  // fenêtre du lien
  /* ---------- autres plateformes : lecture dans un lecteur intégré (sans synchronisation) ---------- */
  var embedSrc = null, embedLabel = '';
  var EMBED_OK = /^https:\/\/(www\.dailymotion\.com\/embed\/|player\.twitch\.tv\/|clips\.twitch\.tv\/embed|www\.facebook\.com\/plugins\/video\.php|player\.kick\.com\/)/;
  function parseEmbed(s) {
    s = (s || '').trim();
    if (!s) return null;
    var u;
    try { u = new URL(/^https?:\/\//i.test(s) ? s : 'https://' + s); } catch (e) { return null; }
    var h = u.hostname.replace(/^(www|m|go|mobile)\./, ''), path = u.pathname, m;
    var parent = encodeURIComponent(location.hostname || 'localhost');
    if (h === 'dailymotion.com' || h === 'dai.ly') {
      m = h === 'dai.ly' ? path.match(/^\/([a-z0-9]+)/i) : path.match(/\/video\/([a-z0-9]+)/i);
      if (!m) return null;
      return { label: 'Dailymotion', src: 'https://www.dailymotion.com/embed/video/' + m[1] + '?autoplay=1' };
    }
    if (h === 'clips.twitch.tv') {
      m = path.match(/^\/([\w-]+)/);
      if (!m) return null;
      return { label: 'Twitch', src: 'https://clips.twitch.tv/embed?clip=' + m[1] + '&parent=' + parent + '&autoplay=true' };
    }
    if (h === 'twitch.tv') {
      m = path.match(/^\/videos\/(\d+)/);
      if (m) return { label: 'Twitch', src: 'https://player.twitch.tv/?video=v' + m[1] + '&parent=' + parent + '&autoplay=true' };
      m = path.match(/^\/[\w]+\/clip\/([\w-]+)/);
      if (m) return { label: 'Twitch', src: 'https://clips.twitch.tv/embed?clip=' + m[1] + '&parent=' + parent + '&autoplay=true' };
      m = path.match(/^\/(\w+)\/?$/);
      if (m) return { label: 'Twitch', src: 'https://player.twitch.tv/?channel=' + m[1] + '&parent=' + parent + '&autoplay=true' };
      return null;
    }
    if (h === 'kick.com') {
      m = path.match(/^\/video\/([\w-]+)/);
      if (m) return { label: 'Kick', src: 'https://player.kick.com/video/' + m[1] + '?autoplay=true' };
      m = path.match(/^\/([\w-]+)\/?$/);
      if (m) return { label: 'Kick', src: 'https://player.kick.com/' + m[1] + '?autoplay=true' };
      return null;
    }
    if (h === 'facebook.com' || h === 'fb.watch') {
      if (h === 'facebook.com' && !/^\/(.*\/)?(videos|reel|reels|watch)(\/|$)/.test(path)) return null;   // liens « partage » (/share/…) refusés
      return { label: 'Facebook', src: 'https://www.facebook.com/plugins/video.php?href=' + encodeURIComponent(u.href) + '&show_text=false&autoplay=true' };
    }
    return null;
  }
  var embedBase = '', embedRatio = 16 / 9, embedFit = false;
  function fbBox() {                                    // plus grand cadre au bon format, centré dans la zone
    var r = $('yt').getBoundingClientRect();
    var W = Math.floor(r.width), H = Math.floor(r.height);
    var w = W, h = Math.floor(w / embedRatio);
    if (h > H) { h = H; w = Math.floor(h * embedRatio); }
    return { w: w, h: h, x: Math.floor((W - w) / 2), y: Math.floor((H - h) / 2) };
  }
  function fitEmbed() {
    if (!embedFit || !embedSrc) return;
    var f = $('yt').querySelector('iframe');
    if (!f) return;
    var b = fbBox();
    f.style.inset = 'auto'; f.style.left = b.x + 'px'; f.style.top = b.y + 'px';
    f.style.width = b.w + 'px'; f.style.height = b.h + 'px';
    var want = embedBase + '&width=' + b.w + '&height=' + b.h;
    if (f.getAttribute('data-src') !== want) { f.setAttribute('data-src', want); f.src = want; }
  }
  window.addEventListener('resize', function () { clearTimeout(embedFitTimer); embedFitTimer = setTimeout(fitEmbed, 300); });
  var embedFitTimer = null;
  function startEmbed(src, label, asSource) {
    if (!EMBED_OK.test(src)) return;                   // seules les adresses des lecteurs connus sont affichées
    if (yt.active) stopYT(true);
    if (localFile) localFile = null;
    if (rtcBroadcaster) rtcBroadcaster.stop();
    resetVideo();
    $('tap').hidden = true; $('drop').hidden = true; $('yt').hidden = false;
    embedSrc = src; embedLabel = label;
    embedBase = src; embedFit = (label === 'Facebook');
    embedRatio = /reel|share\/r/.test(decodeURIComponent(src)) ? 9 / 16 : 16 / 9;
    var f = document.createElement('iframe');
    f.src = src; f.title = label;
    f.setAttribute('allow', 'autoplay; fullscreen; encrypted-media; picture-in-picture');
    f.setAttribute('allowfullscreen', '');
    f.setAttribute('frameborder', '0');
    $('yt').textContent = ''; $('yt').appendChild(f);
    $('fname').textContent = label;
    if (embedFit) setTimeout(fitEmbed, 0);
  }
  function stopEmbed(quiet) {
    if (!embedSrc) return;
    embedSrc = null; embedLabel = '';
    $('yt').textContent = ''; $('yt').hidden = true; $('tap').hidden = true;
    if (!quiet && !hasVideo) { setDrop(DROP0.t, DROP0.x, true); $('fname').textContent = "Aucune vidéo pour l'instant"; }
  }

  var selPf = '';
  // ---------- Spotify : lecteur officiel, lecture synchronisée par l'API IFrame ----------
  var spot = { active: false, uri: '', ctrl: null, api: null, loading: false, pending: null, lastSent: 0, paused: true, pos: 0, sentPaused: true, applyUntil: 0 };
  var SPOT_RE = /^https?:\/\/open\.spotify\.com\/(?:intl-[a-z]+\/)?(track|album|playlist|episode|show)\/([A-Za-z0-9]+)/;
  function spotUri(raw) {
    var m = (raw || '').trim().match(SPOT_RE);
    return m ? 'spotify:' + m[1] + ':' + m[2] : null;
  }
  function loadSpotApi(cb) {
    if (spot.api) return cb(spot.api);
    spot.pending = cb;
    if (spot.loading) return;
    spot.loading = true;
    window.onSpotifyIframeApiReady = function (IFrameAPI) {
      spot.api = IFrameAPI;
      var p = spot.pending; spot.pending = null;
      if (p) p(IFrameAPI);
    };
    var sc = document.createElement('script');
    sc.src = 'https://open.spotify.com/embed/iframe-api/v1';
    sc.async = true;
    document.head.appendChild(sc);
  }
  function startSpot(uri) {
    if (!uri) return;
    if (yt.active) stopYT(true);
    if (embedSrc) stopEmbed(true);
    if (localFile) localFile = null;
    if (rtcBroadcaster) rtcBroadcaster.stop();
    resetVideo();
    $('tap').hidden = true; $('drop').hidden = true; $('yt').hidden = false;
    spot.uri = uri; spot.active = true; spot.paused = true; spot.pos = 0; spot.sentPaused = true; spot.applyUntil = 0;
    $('yt').textContent = '';
    var box = document.createElement('div');
    box.className = 'spot-box';
    $('yt').appendChild(box);
    $('fname').textContent = 'Spotify';
    loadSpotApi(function (API) {
      if (!spot.active || spot.uri !== uri) return;
      API.createController(box, { uri: uri, width: '100%', height: '352' }, function (c) {
        if (!spot.active || spot.uri !== uri) { try { c.destroy(); } catch (e) {} return; }
        spot.ctrl = c;
        c.addListener('playback_update', function (e) { onSpotUpdate(e.data || {}); });
      });
    });
  }
  function onSpotUpdate(d) {
    spot.paused = !!d.isPaused; spot.pos = d.position || 0;
    if (!spot.active || Date.now() < spot.applyUntil) return;   // changement dû à une synchronisation : pas de renvoi
    var now = Date.now();
    var changed = spot.paused !== spot.sentPaused;
    if (!changed && (isHost ? now - spot.lastSent < 1500 : true)) return;   // position : envoyée par l'hôte seulement, à intervalle
    if (!changed && !isHost) return;
    spot.sentPaused = spot.paused; spot.lastSent = now;
    if (isHost) broadcast({ t: 'spotstate', uri: spot.uri, paused: spot.paused, pos: spot.pos });
    else broadcast({ t: 'spotctl', uri: spot.uri, paused: spot.paused, pos: spot.pos });   // un ami n'a qu'une connexion : l'hôte
  }
  function hostSpotCtl(d) {                             // l'hôte reçoit pause/lecture d'un ami : il l'applique et le rediffuse à tous
    if (!isHost || !spot.active || !spot.ctrl || d.uri !== spot.uri) return;
    applySpotState({ uri: spot.uri, paused: !!d.paused, pos: d.pos || 0 });
    spot.sentPaused = !!d.paused; spot.lastSent = Date.now();
    broadcast({ t: 'spotstate', uri: spot.uri, paused: !!d.paused, pos: spot.pos });
  }
  function applySpotState(d) {
    if (!spot.ctrl || d.uri !== spot.uri) return;
    var c = spot.ctrl;
    spot.applyUntil = Date.now() + 1500;
    try {
      if (Math.abs((d.pos || 0) - spot.pos) > 2000) c.seek((d.pos || 0) / 1000);
      if (d.paused && !spot.paused) c.pause();
      if (!d.paused && spot.paused) c.play();
    } catch (e) { console.error('[spotify]', e); }
  }
  function stopSpot(quiet) {
    if (!spot.active) return;
    spot.active = false; spot.ctrl = null;
    $('yt').textContent = ''; $('yt').hidden = true;
    if (!quiet && !hasVideo) { setDrop(DROP0.t, DROP0.x, true); $('fname').textContent = "Aucune vidéo pour l'instant"; }
  }
  var PF_NAME = { youtube: 'YouTube', youtube_audio: 'YouTube (audio seul)', dailymotion: 'Dailymotion', facebook: 'Facebook', twitch: 'Twitch', kick: 'Kick', spotify: 'Spotify' };
  var PF_HINT = {
    youtube: 'https://www.youtube.com/watch?v=...',
    dailymotion: 'https://www.dailymotion.com/video/...',
    facebook: 'https://www.facebook.com/.../videos/...',
    twitch: 'https://www.twitch.tv/nom_de_la_chaine ou /videos/...',
    kick: 'https://kick.com/nom_de_la_chaine',
    spotify: 'https://open.spotify.com/track/...',
    youtube_audio: 'https://www.youtube.com/watch?v=...'
  };
  function showPfPick() { selPf = ''; $('pf-pick').hidden = false; $('pf-link').hidden = true; $('yt-err').textContent = ''; }
  function openYtPanel() {
    showPfPick();
    $('yt-stop').hidden = !(yt.active || embedSrc);
    $('ytmodal').hidden = false;
  }
  Array.prototype.forEach.call(document.querySelectorAll('#pf-pick [data-pf]'), function (b) {
    b.addEventListener('click', function () {
      selPf = b.getAttribute('data-pf');
      $('pf-name').textContent = PF_NAME[selPf];
      var ul = document.querySelector('label[for="yt-url"]');
      if (ul) { var uk = selPf === 'spotify' ? 'r_url_spot' : 'r_url'; ul.setAttribute('data-i18n', uk); ul.textContent = tr(uk); }
      if ($('spot-acct')) { $('spot-acct').hidden = selPf !== 'spotify'; if (selPf === 'spotify') spotShowState(); }
      if ($('yt-audio-opt')) { $('yt-audio-opt').hidden = selPf !== 'youtube'; }
      $('yt-url').placeholder = PF_HINT[selPf];
      $('yt-url').value = '';
      $('yt-err').textContent = '';
      $('pf-pick').hidden = true; $('pf-link').hidden = false;
      $('yt-url').focus();
    });
  });
  $('pf-back').addEventListener('click', showPfPick);
  function closeYtPanel() { $('ytmodal').hidden = true; }
  function submitYt() {
    var raw = $('yt-url').value, want = selPf;
    var audioOnly = want === 'youtube' && !!($('yt-audio-chk') && $('yt-audio-chk').checked);
    var p = (!want || want === 'youtube') ? parseYt(raw) : null;
    if (!p) {
      if (want === 'spotify') {
        var su = spotUri(raw);
        if (!su) { $('yt-err').textContent = tr('sp_bad_link'); return; }
        closeYtPanel(); $('yt-url').value = '';
        startSpot(su);
        broadcast({ t: 'spot', uri: su, name: myName });
        addMsg('', tr('sp_opened'), 'sys');
        return;
      }
      var e = want === 'youtube' ? null : parseEmbed(raw);
      if (!e || (want && e.label !== PF_NAME[want])) {
        if (want === 'facebook' && /facebook\.com\/share\//.test(raw)) { $('yt-err').textContent = "Les liens « Partager » de Facebook ne marchent pas. Sur téléphone, ouvre ce lien dans Chrome ou Safari (pas dans l'appli Facebook) : il redirige vers la vraie adresse, que tu copies depuis la barre d'adresse (celle qui contient /reel/ ou /watch)."; return; }
        $('yt-err').textContent = want ? "Ce lien n'est pas un lien " + PF_NAME[want] + '.' : 'Lien non reconnu. Colle un lien YouTube, Dailymotion, Facebook, Twitch ou Kick.';
        return;
      }
      closeYtPanel(); $('yt-url').value = '';
      startEmbed(e.src, e.label, true);
      broadcast({ t: 'embed', src: e.src, label: e.label, name: myName });
      addMsg('', 'Vidéo ' + e.label + ' ouverte.', 'sys');
      return;
    }
    closeYtPanel(); $('yt-url').value = '';
    startYT(p.id, p.start, true, { playing: true, time: p.start || 0 }, audioOnly);   // « Lire » lance la lecture tout de suite
    broadcast({ t: 'yt', id: p.id, start: p.start, name: myName, audio: audioOnly });
    addMsg('', "Vidéo YouTube ouverte. Appuie sur lecture : tout le monde sera synchronisé.", 'sys');
  }
  $('btn-yt').addEventListener('click', openYtPanel);
  Array.prototype.forEach.call(document.querySelectorAll('[data-quick]'), function (b) {
    b.addEventListener('click', function () {
      openYtPanel();
      var t = document.querySelector('#pf-pick [data-pf="' + b.getAttribute('data-quick') + '"]');
      if (t) t.click();
    });
  });
  $('yt-cancel').addEventListener('click', closeYtPanel);
  $('yt-go').addEventListener('click', submitYt);
  $('yt-url').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); submitYt(); } });
  $('yt-stop').addEventListener('click', function () {
    closeYtPanel(); stopYT(true);
    if (embedSrc) { stopEmbed(true); broadcast({ t: 'embedstop' }); }
    else broadcast({ t: 'ytstop', name: myName });
    addMsg('', 'Vidéo YouTube arrêtée.', 'sys');
  });
  $('ytmodal').addEventListener('click', function (e) { if (e.target === this) closeYtPanel(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('ytmodal').hidden) closeYtPanel(); });

  /* ---------- sous-titres ---------- */
  function applySubs(raw) {
    subsText = raw;
    var vtt = 'WEBVTT\n\n' + raw.replace(/\r/g, '').replace(/^﻿/, '').replace(/^WEBVTT[^\n]*\n/, '').replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
    var url = URL.createObjectURL(new Blob([vtt], { type: 'text/vtt' }));
    Array.prototype.forEach.call(video.querySelectorAll('track'), function (t) { t.remove(); });
    var tr = document.createElement('track');
    tr.kind = 'subtitles'; tr.label = 'Sous-titres'; tr.default = true; tr.src = url;
    video.appendChild(tr);
    setTimeout(function () { if (video.textTracks[0]) video.textTracks[0].mode = 'showing'; }, 150);
  }
  function loadSubs(f) {
    if (!f) return;
    var r = new FileReader();
    r.onload = function () {
      applySubs(String(r.result));
      broadcast({ t: 'subs', text: subsText });
      addMsg('', 'Sous-titres chargés et partagés.', 'sys');
    };
    r.readAsText(f);
  }

  /* ---------- accueil : prénom, création, invitation ---------- */
  function readName() {
    var n = $('name').value.trim();
    if (!n) {
      $('home-error').textContent = tr('err_name');
      $('name').focus();
      return null;
    }
    try { localStorage.setItem('cad-name', n); } catch (e) {}
    $('home-error').textContent = '';
    return n;
  }
  function lastJoinCode() {
    try { var c = (localStorage.getItem('a2g-last-join') || '').toUpperCase(); return /^[A-Z0-9]{6}$/.test(c) ? c : ''; } catch (e) { return ''; }
  }
  function enterInviteMode(id, code) {
    inviteMode = true;
    $('room-id').value = fmtId(id);
    $('code').value = code;
    $('card-create').hidden = true;
    $('field-id').hidden = true;
    $('field-code').hidden = true;
    $('invite').hidden = false;
    $('lede').hidden = true;
    $('invite-code').textContent = fmtId(id) + ' · ' + code;
    $('btn-join').textContent = 'Entrer dans la salle';
    $('join-title').textContent = 'Choisis ton nom, puis entre';
    $('name-label').textContent = 'Ton nom dans la salle';
  }
  function exitInviteMode() {
    inviteMode = false;
    $('card-create').hidden = false;
    $('field-code').hidden = false;
    $('field-id').hidden = false;
    $('invite').hidden = true;
    $('lede').hidden = false;
    $('btn-join').textContent = 'Rejoindre';
    $('join-title').textContent = 'Rejoindre une salle';
    $('name-label').textContent = 'Ton prénom';
    $('room-id').value = fmtId(lastJoinId());
    $('code').value = lastJoinCode();
    try { window.history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
  }

  /* ---------- salle ---------- */
  function backHome(msg) {
    try { localStorage.removeItem('a2g-session'); } catch (e) {}
    holdScreen(false);
    try { peer && peer.destroy(); } catch (e) {}
    conns = []; peer = null;
    document.body.classList.remove('in-room');
    $('room').hidden = true; $('home').hidden = false;
    GAME = null;
    $('home-error').textContent = msg || '';
    renderHistory();
  }
  var roomPushed = false;
  function enterRoom() {
    saveSession();
    try { saveHistory(roomId); } catch (e) {}
    holdScreen(true);
    // flèche « retour » du navigateur : dans la salle, elle fait la même chose que « Quitter » (retour à l'accueil)
    try { if (!roomPushed) { window.history.pushState({ a2gRoom: 1 }, ''); roomPushed = true; } } catch (e) {}
    $('btn-queue').hidden = !isHost; $('fs-queue').hidden = !isHost;
    if (!isHost) { queue = []; $('qpanel').hidden = true; } else renderQueue();
    $('home').hidden = true; $('room').hidden = false;
    document.body.classList.add('in-room');
    $('room-code').textContent = roomCode;
    $('room-id-show').textContent = fmtId(roomId);
    $('pin-id').textContent = fmtId(roomId);
    $('pin-code').textContent = roomCode;
    $('pin').hidden = false;
    warmYt();
    updateStatus();
  }
  /* code de salle inchangé : option « Garder toujours le même code », mémorisée sur cet appareil */
  var roomFixed = false, fixedTries = 0;
  function savedCode() {
    try { var c = localStorage.getItem('a2g-code') || ''; return /^[A-Z0-9]{6}$/.test(c) ? c : ''; } catch (e) { return ''; }
  }
  function saveCode(c) { try { localStorage.setItem('a2g-code', c); } catch (e) {} }
  function syncFixedUi() {
    var on = $('fixed-code').checked;
    try { localStorage.setItem('a2g-fixed', on ? '1' : '0'); } catch (e) {}
    if (on) { var c = savedCode(); if (!c) { c = genCode(); saveCode(c); } $('fixed-val').value = c; }
    $('fixed-info').hidden = !on;
  }
  function cleanCode(v) { return String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6); }
  /* ---------- ID de salle (style TeamViewer) : 9 chiffres, attribué à cet appareil et gardé ---------- */
  var devTries = 0;
  function newDevId() { return String(100000000 + Math.floor(Math.random() * 900000000)); }
  function setNewDev() {
    myDev = newDevId();
    try { localStorage.setItem('a2g-devid', myDev); } catch (e) {}
    $('dev-id').textContent = fmtId(myDev);
  }
  function loadDev() {
    var d = '';
    try { d = localStorage.getItem('a2g-devid') || ''; } catch (e) {}
    if (/^[1-9][0-9]{8}$/.test(d)) { myDev = d; $('dev-id').textContent = fmtId(myDev); }
    else setNewDev();
  }
  // salles récentes : seulement l'ID est gardé ; le code d'accès est toujours demandé
  function readHistory() { try { return JSON.parse(localStorage.getItem('a2g-history') || '[]'); } catch (e) { return []; } }
  function saveHistory(id) {
    if (!id) return;
    var h = readHistory().filter(function (x) { return String(x) !== String(id); });
    h.unshift(String(id));
    try { localStorage.setItem('a2g-history', JSON.stringify(h.slice(0, 5))); } catch (e) {}
  }
  function renderHistory() {
    var box = $('hist'), list = $('hist-list'); if (!box || !list) return;
    var h = readHistory(); list.textContent = ''; box.hidden = !h.length;
    h.forEach(function (id) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'btn small'; b.textContent = fmtId(id);
      b.addEventListener('click', function () { $('room-id').value = fmtId(id); $('home-error').textContent = ''; $('code').focus(); });
      list.appendChild(b);
    });
  }
  renderHistory();
  function fmtId(id) { return String(id || '').replace(/(\d{3})(?=\d)/g, '$1 '); }
  function cleanId(v) { return String(v || '').replace(/\D/g, '').slice(0, 9); }
  function lastJoinId() {
    try { var c = localStorage.getItem('a2g-last-id') || ''; return /^[1-9][0-9]{8}$/.test(c) ? c : ''; } catch (e) { return ''; }
  }
  /* ---------- session : le salon reste ouvert après actualisation ---------- */
  function saveSession() {
    try { localStorage.setItem('a2g-session', JSON.stringify({ host: isHost, id: roomId, code: roomCode, name: myName })); } catch (e) {}
  }
  function readSession() {
    try {
      var x = JSON.parse(localStorage.getItem('a2g-session') || 'null');
      return (x && /^[1-9][0-9]{8}$/.test(x.id) && /^[A-Z0-9]{6}$/.test(x.code)) ? x : null;
    } catch (e) { return null; }
  }
  function restoreSession(x) {
    myName = x.name || 'Moi';
    $('name').value = myName;
    if (x.host) {                                  // hôte : on reprend le même ID et le même code
      isHost = true; roomMode = savedMode(); roomId = x.id; roomCode = x.code; devTries = 0;
      openHost();
    } else {                                       // ami : on se reconnecte à la salle ; l'hôte peut être absent un moment
      joinRoom(x.id, x.code);
      joinedOnce = true;
    }
  }
  /* ---------- mode d'envoi : demandé à chaque envoi de vidéo, mémorisé ---------- */
  function savedMode() { try { return localStorage.getItem('a2g-mode') === 'file' ? 'file' : 'stream'; } catch (e) { return 'stream'; } }
  function openModePicker() {
    var cur = savedMode();
    Array.prototype.forEach.call(document.querySelectorAll('input[name="mode-send"]'), function (r) { r.checked = (r.value === cur); });
    $('mode-modal').hidden = false;
    setTimeout(function () { $('mode-ok').focus(); }, 30);
  }
  function closeModePicker() { $('mode-modal').hidden = true; }

  function openHost() {
    setTimeout(updateScreenBtn, 0);
    startPeer(peerId(roomId), function () {
      enterRoom();
      addMsg('', "Salle créée. Envoie l'ID " + fmtId(roomId) + ' et le code ' + roomCode + ' à ton ami.', 'sys');
    });
  }
  function createRoom() {
    var fixed = $('fixed-code').checked;
    var typed = cleanCode($('fixed-val').value);
    if (fixed) {                                   // code choisi par l'utilisateur : 6 caractères
      $('fixed-val').value = typed;
      if (typed.length !== 6) { $('home-error').textContent = 'Ton code doit faire 6 caractères (lettres et chiffres).'; $('fixed-val').focus(); return; }
    }
    isHost = true; roomMode = savedMode(); roomFixed = fixed; devTries = 0;
    roomCode = fixed ? typed : genCode();
    if (fixed) saveCode(roomCode);
    roomId = myDev;
    openHost();
  }
  function joinRoom(id, code) {
    isHost = false; roomId = id; roomCode = code; roomMode = 'stream';
    joinedOnce = false; noReconnect = false; lastTry = Date.now();
    teardownRx(); pvReset();
    startPeer(null, function () {
      enterRoom();
      setupConn(peer.connect(peerId(roomId), { reliable: true }));
    });
  }

  /* ---------- plein écran (vidéo + chat) ---------- */
  function isFs() { return document.fullscreenElement === layout || document.webkitFullscreenElement === layout || pseudoFs; }
  // téléphone : en plein écran, l'écran passe en paysage tout seul (Android/Chrome). Sur iPhone, le CSS fait pivoter la salle.
  // Un seul mécanisme à la fois, pour éviter que la vidéo pivote puis revienne :
  // 1) on demande le verrouillage en paysage au système ; 2) seulement si l'écran reste en portrait après cela, on fait pivoter la salle avec le CSS (classe « rot »).
  var fsWas = false, orient = { want: false, settled: false, locked: false, tm: null };
  function devicePortrait() {
    try { var ty = screen.orientation && screen.orientation.type; if (ty) return ty.indexOf('portrait') === 0; } catch (e) {}
    return window.innerHeight > window.innerWidth;
  }
  function applyRot() {
    layout.classList.toggle('rot', !!(orient.want && orient.settled && pseudoFs && devicePortrait()));
  }
  // la salle ne pivote en paysage que si la vidéo est en paysage (largeur ≥ hauteur) ; une vidéo verticale reste en portrait
  function videoLandscape() {
    if (yt.active) return true;
    if (hasVideo && video.videoWidth && video.videoHeight) return video.videoWidth >= video.videoHeight;
    return true;
  }
  // si les dimensions de la vidéo ne sont connues qu'après coup (ou si la vidéo change), on réévalue en plein écran
  video.addEventListener('loadedmetadata', function () {
    /* pas de rotation en plein écran avec chat */
  });
  function setLandscape(on) {
    on = on && videoLandscape();
    clearTimeout(orient.tm);
    orient.want = on; orient.settled = false;
    if (!on) {
      if (orient.locked) { try { screen.orientation.unlock(); } catch (e) {} orient.locked = false; }
      applyRot(); return;
    }
    function settle() {
      orient.settled = true;
      // plein écran réel mais l'écran est resté en portrait : on passe en plein écran simulé et on pivote avec le CSS
      if (orient.want && devicePortrait() && !pseudoFs && isFs()) {
        pseudoFs = true;
        try { (document.exitFullscreen || document.webkitExitFullscreen).call(document); } catch (e) {}
        syncFs();
      }
      applyRot();
    }
    function finish(ok, delay) { orient.locked = !!ok; orient.tm = setTimeout(settle, delay); }
    var p = null;
    try {
      if (window.matchMedia('(pointer: coarse)').matches && screen.orientation && screen.orientation.lock) p = screen.orientation.lock('landscape');
    } catch (e) { p = null; }
    if (p && p.then) p.then(function () { finish(true, 700); }, function () { finish(false, 0); });   // 700 ms : le temps que l'écran pivote vraiment
    else finish(false, 0);
  }
  window.addEventListener('resize', applyRot);
  window.addEventListener('orientationchange', function () { setTimeout(applyRot, 200); });
  /* menu du haut (plein écran + chat) : s'affiche à l'entrée, se range derrière la flèche après quelques secondes, et s'ouvre à la demande */
  var fsHideTm = null;
  function armFsHide(ms) {
    clearTimeout(fsHideTm);
    fsHideTm = setTimeout(function () {
      if (!isFs()) return;
      if ($('sizebar').classList.contains('open')) { armFsHide(2500); return; }   // le panneau Taille est ouvert : on ne range pas le menu
      fsMenu(false);
    }, ms || 4000);
  }
  function fsMenu(open) {
    clearTimeout(fsHideTm);
    $('fsbar').classList.toggle('hide', !open);
    $('fs-tab').setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) armFsHide(3500);
  }
  function syncFs() {
    var on = isFs();
    // plein écran avec chat (bouton du dessous) : l'écran ne pivote jamais, la vidéo garde son orientation
    if (on !== fsWas) { fsWas = on; setLandscape(false); if (on) fsMenu(true); else { clearTimeout(fsHideTm); $('fsbar').classList.remove('hide'); } }
    layout.classList.toggle('fs', on);
    layout.classList.toggle('pfs', pseudoFs);
    applyRot();
    $('btn-full').textContent = on ? 'Quitter le plein écran' : 'Plein écran';
    // le panneau taille/zoom est déplacé dans la scène en plein écran, puis remis à sa place
    var sb = $('sizebar'), fm = $('fsmenu');
    if (on && sb.parentNode !== fm) { fm.appendChild(sb); sb.classList.add('fs-panel'); }
    else if (!on && sb.parentNode === fm) { sb.classList.remove('fs-panel', 'open'); layout.querySelector('.stage-col').appendChild(sb); }
  }
  function toggleFs() {
    if (isFs()) {
      if (pseudoFs) { pseudoFs = false; syncFs(); }
      else (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      return;
    }
    var req = layout.requestFullscreen || layout.webkitRequestFullscreen;
    if (req) {
      var p;
      try { p = req.call(layout); } catch (e) { pseudoFs = true; syncFs(); return; }
      if (p && p.catch) p.catch(function () { pseudoFs = true; syncFs(); });
    } else {
      pseudoFs = true; syncFs();        // iPhone : plein écran simulé, le chat reste visible
    }
  }
  document.addEventListener('fullscreenchange', syncFs);
  document.addEventListener('webkitfullscreenchange', syncFs);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && pseudoFs) { pseudoFs = false; syncFs(); } });
  function toggleChat() {
    var hide = layout.classList.toggle('nochat');
    $('btn-chat').textContent = hide ? 'Afficher le chat' : 'Masquer le chat';
    $('fs-chat').textContent = hide ? 'Afficher le chat' : 'Masquer le chat';
  }

  /* ---------- taille de la zone de chat ---------- */
  var CHAT_SIZES = ['Petit', 'Moyen', 'Grand', 'Très grand'], chatLvl = 1;
  try { var sv = parseInt(localStorage.getItem('samaraf-chatsize'), 10); if (sv >= 0 && sv < CHAT_SIZES.length) chatLvl = sv; } catch (e) {}
  function setChatLvl(n) {
    chatLvl = n;
    layout.setAttribute('data-chat', String(n));
    $('chatsize').value = String(n);
    try { localStorage.setItem('samaraf-chatsize', String(n)); } catch (e) {}
  }
  setChatLvl(chatLvl);
  $('chatsize').addEventListener('change', function (e) {
    if (layout.classList.contains('nochat')) toggleChat();                 // chat masqué : choisir une taille le réaffiche
    setChatLvl(parseInt(e.target.value, 10));
  });

  /* ---------- interface ---------- */
  $('btn-create').addEventListener('click', function () {
    var n = readName(); if (!n) return;
    myName = n; createRoom();
  });
  $('btn-join').addEventListener('click', function () {
    var n = readName(); if (!n) return;
    var id = cleanId($('room-id').value);
    if (id.length !== 9) { $('home-error').textContent = "Entre l'ID de la salle (9 chiffres)."; $('room-id').focus(); return; }
    var code = cleanCode($('code').value);
    if (code.length !== 6) { $('home-error').textContent = "Entre le code d'accès à 6 caractères."; $('code').focus(); return; }
    $('room-id').value = fmtId(id); $('code').value = code;
    myName = n; joinRoom(id, code);
  });
  $('invite-own').addEventListener('click', exitInviteMode);
  try { $('fixed-code').checked = localStorage.getItem('a2g-fixed') === '1'; } catch (e) {}
  syncFixedUi();
  $('fixed-code').addEventListener('change', syncFixedUi);
  $('fixed-val').addEventListener('input', function (e) {
    var c = cleanCode(e.target.value); if (c !== e.target.value) e.target.value = c;
    if (c.length === 6) saveCode(c);
  });
  $('fixed-val').addEventListener('keydown', function (e) { if (e.key === 'Enter') $('btn-create').click(); });
  $('fixed-new').addEventListener('click', function () { var c = genCode(); saveCode(c); $('fixed-val').value = c; });
  $('code').addEventListener('keydown', function (e) { if (e.key === 'Enter') $('btn-join').click(); });
  $('room-id').addEventListener('input', function (e) { e.target.value = fmtId(cleanId(e.target.value)); });
  $('room-id').addEventListener('keydown', function (e) { if (e.key === 'Enter') $('code').focus(); });
  $('name').addEventListener('keydown', function (e) { if (e.key === 'Enter' && inviteMode) $('btn-join').click(); });
  $('btn-pick').addEventListener('click', openModePicker);
  $('btn-change').addEventListener('click', openModePicker);
  $('mode-ok').addEventListener('click', function () {
    var ch = document.querySelector('input[name="mode-send"]:checked');
    try { localStorage.setItem('a2g-mode', ch && ch.value === 'file' ? 'file' : 'stream'); } catch (e) {}
    closeModePicker();
    $('file').click();
  });
  $('mode-cancel').addEventListener('click', closeModePicker);
  $('mode-modal').addEventListener('click', function (e) { if (e.target === this) closeModePicker(); });
  $('btn-queue').addEventListener('click', toggleQueue);
  $('fs-queue').addEventListener('click', toggleQueue);
  $('q-add').addEventListener('click', function () { $('qfile').click(); });
  $('q-close').addEventListener('click', function () { $('qpanel').hidden = true; });
  $('q-clear').addEventListener('click', function () { queue = []; renderQueue(); });
  $('qfile').addEventListener('change', function (e) { addToQueue(e.target.files); e.target.value = ''; });
  $('btn-sub').addEventListener('click', function () { $('subfile').click(); });
  $('btn-sync').addEventListener('click', function () {
    if (yt.active) { ytEmit(); addMsg('', 'Ta position a été envoyée à tout le monde.', 'sys'); return; }
    if (!hasVideo) return;
    applyingUntil = 0;
    emit(true);
    addMsg('', 'Ta position a été envoyée à tout le monde.', 'sys');
  });
  $('file').addEventListener('change', function (e) { loadFile(e.target.files[0]); e.target.value = ''; });
  $('subfile').addEventListener('change', function (e) { loadSubs(e.target.files[0]); e.target.value = ''; });
  $('btn-tap').addEventListener('click', function () {
    markUser(); $('tap').hidden = true;
    if (yt.active) { if (yt.ready) { ytApplyUntil = Date.now() + 1500; try { yt.player.playVideo(); } catch (e) {} } return; }
    video.play().catch(function () {});
  });
  $('fit').addEventListener('change', function (e) { video.style.objectFit = e.target.value; });
  $('zoom').addEventListener('input', function (e) {
    video.style.transform = 'scale(' + (e.target.value / 100) + ')';
    $('yt').style.transform = video.style.transform;
    $('zoom-val').textContent = e.target.value + ' %';
  });
  $('zoom-val').addEventListener('dblclick', function () { $('zoom').value = 100; $('zoom').dispatchEvent(new Event('input')); });
  $('btn-chat').addEventListener('click', toggleChat);
  $('fs-chat').addEventListener('click', toggleChat);
  $('fs-size').addEventListener('click', function () { $('sizebar').classList.toggle('open'); });
  $('fs-tab').addEventListener('click', function () { fsMenu($('fsbar').classList.contains('hide')); });
  // tant que l'utilisateur touche au menu, on repousse le rangement automatique
  ['pointerdown', 'pointermove', 'input', 'focusin'].forEach(function (ev) {
    $('fsmenu').addEventListener(ev, function () { if (!$('fsbar').classList.contains('hide')) armFsHide(4000); });
  });
  $('btn-full').addEventListener('click', toggleFs);
  $('fs-exit').addEventListener('click', toggleFs);
  $('btn-opts').addEventListener('click', function () { $('sizebar').classList.toggle('show'); });
  $('btn-copy').addEventListener('click', function () {
    // dans l'application Android, l'adresse interne n'est pas partageable : on copie seulement le code
    var inApp = location.hostname === 'appassets.androidplatform.net';
    var link = inApp ? fmtId(roomId) + ' ' + roomCode : location.href.split('#')[0] + '#' + roomId + '-' + roomCode, btn = $('btn-copy');
    function ok(t) { btn.textContent = t; setTimeout(function () { btn.textContent = 'Copier le lien'; }, 1800); }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(link).then(function () { ok(inApp ? 'Code copié' : 'Lien copié'); }, function () { ok('ID ' + fmtId(roomId) + ' · code ' + roomCode); });
    else ok('ID ' + fmtId(roomId) + ' · code ' + roomCode);
  });

  // ferme la salle et revient à l'accueil. notify : prévient les autres (l'hôte ferme le salon pour tout le monde)
  function closeRoom(msg, notify) {
    endScreenTracks();
    setTimeout(updateScreenBtn, 0);
    if (closing) return;
    closing = true;
    if (notify) conns.slice().forEach(function (c) { try { c.send({ t: isHost ? 'closed' : 'bye' }); } catch (e) {} });
    try { localStorage.removeItem('a2g-session'); } catch (e) {}
    try { if (msg) sessionStorage.setItem('a2g-notice', msg); } catch (e) {}
    setTimeout(function () { location.replace(location.pathname + location.search); }, notify ? 250 : 0);
  }
  $('btn-leave').addEventListener('click', function () { closeRoom('', true); });
  // le salon reste ouvert même si l'ami part : il ne se ferme que par « Quitter » ou si l'hôte le ferme

  /* ---------- chat et emotes ---------- */
  var EMOTES = [
    { tab: '😀', list: ['😀','😂','🤣','😊','😍','😘','😎','🤩','😅','😉','🥹','😭','😢','😡','🤯','😱','🥶','🤔','🙄','😴','🤤','😏','🥳','😇'] },
    { tab: '👍', list: ['👍','👎','👏','🙌','🙏','💪','👀','🤝','✌️','🤞','👌','🤌','🫶','🤙','🖐️','☝️','🫡','🤦','🤷','🕺','💃','🙈','🙉','🙊'] },
    { tab: '❤️', list: ['❤️','🧡','💛','💚','💙','💜','🖤','💔','🔥','✨','💯','🎉','🎬','🍿','🥤','🍕','⭐','💀','👻','😈','🌹','☕','⚡','🚀'] }
  ];
  function showTab(i) {
    var tabs = $('ptabs').children;
    for (var k = 0; k < tabs.length; k++) tabs[k].classList.toggle('on', k === i);
    var grid = $('pgrid');
    grid.textContent = '';
    EMOTES[i].list.forEach(function (e) {
      var b = document.createElement('button');
      b.type = 'button'; b.textContent = e; b.setAttribute('aria-label', e);
      b.addEventListener('click', function () { insertEmote(e); });
      grid.appendChild(b);
    });
  }
  function insertEmote(e) {
    var inp = $('msg'), s = inp.selectionStart == null ? inp.value.length : inp.selectionStart, en = inp.selectionEnd == null ? s : inp.selectionEnd;
    inp.value = inp.value.slice(0, s) + e + inp.value.slice(en);
    var pos = s + e.length;
    inp.dispatchEvent(new Event('input'));
    if (!window.matchMedia('(pointer: coarse)').matches) { inp.focus(); try { inp.setSelectionRange(pos, pos); } catch (x) {} }
  }
  EMOTES.forEach(function (g, i) {
    var b = document.createElement('button');
    b.type = 'button'; b.textContent = g.tab;
    b.addEventListener('click', function () { showTab(i); });
    $('ptabs').appendChild(b);
  });
  showTab(0);
  function renderTyping() {
    var now = Date.now(), names = [];
    Object.keys(typers).forEach(function (k) { if (now - typers[k].at > 4000) delete typers[k]; else names.push(typers[k].name); });
    var t = '';
    if (names.length === 1) t = names[0] + " est en train d'écrire…";
    else if (names.length === 2) t = names[0] + ' et ' + names[1] + " sont en train d'écrire…";
    else if (names.length > 2) t = 'Plusieurs personnes écrivent…';
    $('typing').textContent = t;
  }
  setInterval(renderTyping, 1000);
  $('msg').addEventListener('input', function () {
    var now = Date.now();
    if (!this.value.trim()) {
      if (lastTypingSent) { lastTypingSent = 0; broadcast({ t: 'typing', cid: myCid, off: true }); }
      return;
    }
    if (now - lastTypingSent > 2000) { lastTypingSent = now; broadcast({ t: 'typing', cid: myCid, name: myName }); }
  });
  $('btn-emoji').addEventListener('click', function () { $('picker').hidden = !$('picker').hidden; });
  $('btn-photo').addEventListener('click', function () { $('photo').click(); });
  $('photo').addEventListener('change', function (e) {
    var f = e.target.files[0]; e.target.value = '';
    if (!f || !/^image\//.test(f.type)) return;
    if (!isHost && !openConns().length) { addMsg('', "Tu n'es pas connecté au salon : photo non envoyée.", 'sys'); return; }
    addMsg('', 'Envoi de la photo…', 'sys');
    compressPhoto(f, function (data) {
      if (!data) { addMsg('', 'Photo non envoyée : format non pris en charge ou image trop lourde.', 'sys'); return; }
      var mid = myCid + '-' + (++msgSeq) + '-' + Date.now().toString(36);
      seenMids[mid] = 1;
      addImgMsg(myName, data, 'me');
      broadcast({ t: 'img', name: myName, data: data, cid: myCid, mid: mid });
    });
  });
  $('send').addEventListener('submit', function (e) {
    e.preventDefault();
    var inp = $('msg'), text = inp.value.trim();
    if (!text) return;
    // invité sans lien avec l'hôte : le message ne partirait nulle part, on le dit au lieu de faire semblant
    if (!isHost && !openConns().length) {
      void 0;
      lastTry = 0; guestLink();
      return;
    }
    var ts = Date.now();
    var mid = myCid + '-' + (++msgSeq) + '-' + Date.now().toString(36);
    seenMids[mid] = 1;
    if (isHost) pushHistory(mid, myName, text, myCid, ts);
    addMsg(myName, text, 'me', ts); tagMsg(mid);
    broadcast({ t: 'chat', name: myName, text: text, cid: myCid, mid: mid, ts: ts });
    lastTypingSent = 0;
    inp.value = '';
    $('picker').hidden = true;
  });

  var stage = $('stage');
  ['dragenter', 'dragover'].forEach(function (ev) { stage.addEventListener(ev, function (e) { e.preventDefault(); stage.classList.add('dragover'); }); });
  ['dragleave', 'drop'].forEach(function (ev) { stage.addEventListener(ev, function (e) { e.preventDefault(); stage.classList.remove('dragover'); }); });
  stage.addEventListener('drop', function (e) {
    var f = e.dataTransfer && e.dataTransfer.files[0];
    if (f) loadFile(f);
  });

  if (window.__theme) window.__theme.bind(broadcast, openConns, function (t) { addMsg('', t, 'sys'); }, function () { return isHost; });

  /* ---------- clavier du téléphone ----------
     Deux cas :
     1) le clavier redimensionne la page (navigateur, ou appli en « adjustResize ») : la salle suit la hauteur visible ;
     2) le clavier se pose par-dessus sans rien redimensionner (WebView d'une appli) : on le détecte au focus du champ
        et on réserve en bas une hauteur égale à celle du clavier (mesurée si possible, sinon estimée). */
  (function () {
    var vv = window.visualViewport, root = document.documentElement.style;
    var baseH = window.innerHeight, focused = false, settled = false, vkH = 0, tSettle = null, tBlur = null, sawResize = false;
    function closeKb() {                                                   // le clavier est fermé : le champ perd le focus et la mise en page revient
      focused = false; settled = false; sawResize = false; vkH = 0;
      try { if (isText(document.activeElement)) document.activeElement.blur(); } catch (e) {}
      fit();
    }
    // PC (grand écran + souris) : pas de clavier virtuel, donc aucune hauteur n'est réservée et la salle ne rétrécit pas
    function isDesk() { try { return window.matchMedia('(min-width: 861px) and (pointer: fine)').matches; } catch (e) { return false; } }
    function isText(el) { return el && el.tagName === 'INPUT' && (el.type === 'text' || el.type === 'search' || el.type === 'url'); }
    function fit() {
      var h = vv ? vv.height : window.innerHeight, t = vv ? vv.offsetTop : 0;
      var zoomed = !!(vv && vv.scale > 1.05), cur = Math.min(window.innerHeight, h);
      if (!focused && !zoomed) baseH = Math.max(cur, 1);                  // hauteur sans clavier
      var resized = baseH - cur > 120, pad = 0;
      if (isDesk()) { resized = false; sawResize = false; }
      if (focused && resized) sawResize = true;
      else if (focused && sawResize && !resized) { closeKb(); return; }     // la page a retrouvé sa taille : clavier fermé (touche retour)
      if (!isDesk() && focused && settled && !zoomed && !resized) pad = vkH > 0 ? vkH : Math.round(baseH * 0.42);
      root.setProperty('--vvh', Math.round(h) + 'px');
      root.setProperty('--vvt', Math.round(t) + 'px');
      root.setProperty('--kbpad', pad + 'px');
      // plein écran réel : le clavier recouvre le bas de l'écran sans redimensionner la page → on mesure ce qu'il cache
      root.setProperty('--kbov', ((!isDesk() && !zoomed) ? Math.max(0, Math.round(window.innerHeight - h - t)) : 0) + 'px');
      var kb = !zoomed && (focused || resized);
      if (isDesk()) { root.setProperty('--vvh', '100dvh'); root.setProperty('--vvt', '0px'); kb = false; }
      if (kb && !document.body.classList.contains('kb') && isFs()) fsMenu(false);   // le clavier s'ouvre : le menu se range pour laisser la place
      document.body.classList.toggle('kb', kb);
      if (kb) { var m = $('msgs'); m.scrollTop = m.scrollHeight; }
    }
    document.addEventListener('focusin', function (e) {
      if (!isText(e.target)) return;
      clearTimeout(tBlur); clearTimeout(tSettle);
      focused = true; settled = false; fit();
      tSettle = setTimeout(function () { settled = true; fit(); }, 600);   // on laisse au clavier le temps de redimensionner la page
    });
    document.addEventListener('focusout', function (e) {
      if (!isText(e.target)) return;
      clearTimeout(tBlur);
      tBlur = setTimeout(function () { if (!isText(document.activeElement)) { focused = false; settled = false; fit(); } }, 250);
    });
    if (vv) { vv.addEventListener('resize', fit); vv.addEventListener('scroll', fit); }
    window.addEventListener('resize', fit);
    window.addEventListener('orientationchange', function () { setTimeout(function () { if (!focused) baseH = window.innerHeight; fit(); }, 300); });
    try {                                                                  // hauteur exacte du clavier quand le système la fournit
      if (navigator.virtualKeyboard) navigator.virtualKeyboard.addEventListener('geometrychange', function () {
        var prev = vkH; vkH = Math.round(navigator.virtualKeyboard.boundingRect.height || 0);
        if (prev > 0 && vkH === 0 && focused) closeKb(); else fit();
      });
    } catch (e) {}
    fit();
  })();

  /* ---------- compte (connexion facultative) ----------
     Le service de comptes (Firebase) est chargé à part ; il annonce l'utilisateur par l'événement « a2g-user ».
     Connecté : le prénom vient du compte, et l'ID de salle est calculé à partir du compte (le même sur tous les appareils). */
  /* ---------- langue de l'accueil et nom affiché ---------- */
  var I18N = {"fr": {"lede": "Regardez une vidéo à deux, en même temps, même à distance. Choisissez une vidéo publique (YouTube, Dailymotion, Twitch, Kick, Facebook) ou un fichier que vous possédez : la lecture, la pause et la position sont synchronisées, avec un chat à côté. Les fichiers passent directement entre vous, sans être stockés sur nos serveurs.", "name": "Ton pseudo", "theme": "🎨 Thème", "login": "Se connecter", "signup": "Créer un compte", "logout": "Se déconnecter", "f1": "Regarder ensemble des vidéos Dailymotion, YouTube, Twitch, Kick et Facebook", "f2": "Partage de fichier vidéo en direct", "f3": "Lecture, pause et avance synchronisées", "f4": "Chat, émojis et photos pendant le film", "f5": "Thème et fond d'écran partagés", "f6": "Sans serveur : le fichier passe directement entre vous", "create_h": "Créer une salle", "id_label": "Ton ID de salle", "devnote": "Fixe sur cet appareil. Ton ami a besoin de cet ID et du code ci-dessous.", "fixed_chk": "Garder toujours le même code", "fixed_lbl": "Ton code (6 lettres ou chiffres, modifiable)", "random": "Aléatoire", "create_btn": "Créer la salle", "join_h": "Rejoindre une salle", "join_id_lbl": "ID de la salle (9 chiffres)", "join_code_lbl": "Code d'accès (6 caractères)", "join_btn": "Rejoindre", "f_about": "À propos", "f_privacy": "Confidentialité", "f_terms": "Conditions", "f_contact": "Contact", "consent": "Ce site utilise des cookies et le stockage de ton navigateur pour fonctionner (préférences, session de salle). Si des publicités sont affichées, Google peut aussi utiliser des cookies pour les personnaliser.", "learn": "En savoir plus", "consent_ok": "J'ai compris", "err_name": "Choisis ton pseudo avant d'entrer dans la salle.", "au_home": "Accueil", "au_login_title": "Connectez-vous à votre compte", "au_signup_title": "Créez votre compte", "au_email": "E-mail", "au_pass": "Mot de passe", "au_show": "Afficher", "au_forgot": "Mot de passe oublié ?", "au_login_btn": "Connexion", "au_google": "Continuer avec Google", "au_to_signup": "Pas de compte ? Créez-en un", "au_have": "Vous avez déjà un compte ?", "au_login_link": "Connectez-vous !", "au_first": "Prénom", "au_last": "Nom", "au_pass_hint": "6 caractères minimum", "au_create": "Créer mon compte", "note": "Dans la salle, celui qui possède la vidéo la choisit. Pour un MP4, l'autre peut lancer la lecture après quelques secondes. Pour les autres formats, il faut attendre la fin du transfert. Gardez l'onglet ouvert.", "inv_pre": "Tu es invité dans la salle", "inv_own": "Créer ma propre salle", "legal_close": "Fermer", "r_copy": "Copier le lien", "r_wait": "En attente d'un ami…", "r_leave": "Quitter", "r_drop": "Il sera envoyé à ton ami, qui pourra le regarder pendant la réception. Si c'est lui qui l'a, attends qu'il le choisisse.", "r_pick": "Choisir un fichier vidéo", "r_ytdrop": "▶ Lire depuis une plateforme", "r_qtitle": "File d'attente", "r_qadd": "Ajouter des vidéos", "r_qclear": "Vider", "r_close": "Fermer", "r_tap": "Appuie pour lancer la lecture", "r_size": "Taille", "r_chat_hide": "Masquer le chat", "r_nov": "Aucune vidéo pour l'instant", "r_sync": "Synchroniser", "r_sync_tt": "Envoie ta position à tout le monde", "r_change": "Envoyer une vidéo", "r_yt": "▶ Lecture depuis plateformes", "r_theme": "🎨 Thème", "r_sub": "Sous-titres", "r_full": "Plein écran", "r_fit_contain": "Ajuster (tout voir)", "r_fit_cover": "Remplir (rogne les bords)", "r_fit_fill": "Étirer", "r_zoom": "Zoom", "r_chat": "Chat", "r_small": "Petit", "r_medium": "Moyen", "r_large": "Grand", "r_xlarge": "Très grand", "r_msg_ph": "Écrire un message…", "r_send": "Envoyer", "r_yt_title": "Lecture depuis plateformes", "r_choose_pf": "Choisis la plateforme", "r_back_pf": "← Autres plateformes", "r_go": "Lire pour tous", "r_stop": "Arrêter la lecture", "r_ytmsg": "YouTube : lecture, pause et avance sont synchronisées entre vous.", "r_url": "Lien de la vidéo", "scr_start": "🖥 Partager l'écran", "scr_stop": "⏹ Arrêter le partage", "scr_on": "Tu partages ton écran avec ton ami.", "scr_off": "Partage d'écran arrêté.", "scr_refused": "Partage d'écran annulé.", "scr_nosupport": "Le partage d'écran marche seulement sur ordinateur.", "src_file": "Fichier vidéo", "drop_title": "Choisis ta source", "r_url_spot": "Lien Spotify (titre, album ou playlist)", "pin_copy_id": "Copier l'ID", "pin_copy_code": "Copier le code", "sp_login": "Se connecter à Spotify", "sp_logged": "Connecté à Spotify : ", "sp_noid": "Connexion Spotify pas encore configurée.", "sp_fail": "La connexion Spotify a échoué. Réessaie.", "scr_label": "Partager l'écran", "scr_stop2": "Arrêter le partage", "sp_addr": "Adresse envoyée à Spotify : ", "sp_connecting": "Connexion en cours…", "sp_opened": "Spotify ouvert.", "sp_bad_link": "Ce lien n'est pas un lien Spotify (titre, album, playlist ou épisode).", "sp_logged_in": "Connecté à Spotify : ", "pf_yt_audio": "YouTube audio seul", "yt_audio_t": "Mode audio seul", "yt_audio_s": "La vidéo est masquée. Le son continue.", "yt_audio_play": "▶ Lire", "yt_audio_pause": "⏸ Pause", "yt_audio_change": "Choisir une autre vidéo ou playlist", "yt_audio_opt": "Audio seul (masquer la vidéo)", "multi_label": "Multi-vidéo", "multi_title": "Multi-vidéo (YouTube ou Twitch)", "multi_top": "Vidéo du haut (lien)", "multi_bottom": "Vidéo du bas (lien)", "multi_go": "Lancer", "multi_cancel": "Annuler", "multi_bad": "Les deux liens doivent être YouTube ou les deux Twitch, et valides.", "multi_opened": "Multi-vidéo ouverte. Les deux vidéos sont synchronisées.", "multi_fit_all": "Tout voir", "multi_fit_fill": "Remplir l'écran", "multi_manual": "La vidéo du bas ne démarre pas toute seule : appuie sur son bouton lecture.", "mv_stuck": "Une des deux vidéos ne répond pas. Clique une fois dedans pour l'activer.", "how_h": "Comment ça marche", "how_1": "Crée une salle, ou rejoins celle de ton ami avec son ID et son code.", "how_2": "Choisis une vidéo : un lien YouTube, Dailymotion, Twitch, Kick ou Facebook, ou un fichier de ton appareil.", "how_3": "Regardez ensemble : lecture, pause et position restent synchronisées, et vous pouvez discuter dans le chat.", "how_4": "Un compte n'est pas obligatoire.", "q_link_ph": "Lien YouTube, Dailymotion, Twitch, Kick ou Facebook", "q_link_add": "Ajouter le lien", "hist_h": "Salles récentes"}, "en": {"lede": "Watch a video together, at the same time, even from a distance. Choose a public video (YouTube, Dailymotion, Twitch, Kick, Facebook) or a file you own: play, pause and position are synced, with a chat on the side. Files go directly between you, without being stored on our servers.", "name": "Your nickname", "theme": "🎨 Theme", "login": "Log in", "signup": "Create account", "logout": "Log out", "f1": "Watch Dailymotion, YouTube, Twitch, Kick and Facebook videos together", "f2": "Live video file sharing", "f3": "Synced play, pause and seek", "f4": "Chat, emojis and photos during the movie", "f5": "Shared theme and wallpaper", "f6": "No server: the file goes directly between you", "create_h": "Create a room", "id_label": "Your room ID", "devnote": "Fixed to this device. Your friend needs this ID and the code below.", "fixed_chk": "Always keep the same code", "fixed_lbl": "Your code (6 letters or digits, editable)", "random": "Random", "create_btn": "Create room", "join_h": "Join a room", "join_id_lbl": "Room ID (9 digits)", "join_code_lbl": "Access code (6 characters)", "join_btn": "Join", "f_about": "About", "f_privacy": "Privacy", "f_terms": "Terms", "f_contact": "Contact", "consent": "This site uses cookies and your browser storage to work (preferences, room session). If ads are shown, Google may also use cookies to personalize them.", "learn": "Learn more", "consent_ok": "Got it", "err_name": "Choose your nickname before entering the room.", "au_home": "Home", "au_login_title": "Log in to your account", "au_signup_title": "Create your account", "au_email": "Email", "au_pass": "Password", "au_show": "Show", "au_forgot": "Forgot password?", "au_login_btn": "Log in", "au_google": "Continue with Google", "au_to_signup": "No account? Create one", "au_have": "Already have an account?", "au_login_link": "Log in!", "au_first": "First name", "au_last": "Last name", "au_pass_hint": "At least 6 characters", "au_create": "Create my account", "note": "In the room, whoever has the video chooses it. For an MP4, the other can start playback after a few seconds. For other formats, you have to wait until the transfer finishes. Keep the tab open.", "inv_pre": "You are invited to room", "inv_own": "Create my own room", "legal_close": "Close", "r_copy": "Copy link", "r_wait": "Waiting for a friend…", "r_leave": "Leave", "r_drop": "It will be sent to your friend, who can watch it while it arrives. If they have it, wait for them to choose it.", "r_pick": "Choose a video file", "r_ytdrop": "▶ Play from a platform", "r_qtitle": "Queue", "r_qadd": "Add videos", "r_qclear": "Clear", "r_close": "Close", "r_tap": "Tap to start playback", "r_size": "Size", "r_chat_hide": "Hide chat", "r_nov": "No video yet", "r_sync": "Sync", "r_sync_tt": "Send your position to everyone", "r_change": "Send a video", "r_yt": "▶ Play from platforms", "r_theme": "🎨 Theme", "r_sub": "Subtitles", "r_full": "Fullscreen", "r_fit_contain": "Fit (show all)", "r_fit_cover": "Fill (crop edges)", "r_fit_fill": "Stretch", "r_zoom": "Zoom", "r_chat": "Chat", "r_small": "Small", "r_medium": "Medium", "r_large": "Large", "r_xlarge": "Extra large", "r_msg_ph": "Write a message…", "r_send": "Send", "r_yt_title": "Play from platforms", "r_choose_pf": "Choose the platform", "r_back_pf": "← Other platforms", "r_go": "Play for everyone", "r_stop": "Stop playback", "r_ytmsg": "YouTube: play, pause and seek are synced between you.", "r_url": "Video link", "scr_start": "🖥 Share screen", "scr_stop": "⏹ Stop sharing", "scr_on": "You are sharing your screen with your friend.", "scr_off": "Screen sharing stopped.", "scr_refused": "Screen sharing cancelled.", "scr_nosupport": "Screen sharing only works on a computer.", "src_file": "Video file", "drop_title": "Choose your source", "r_url_spot": "Spotify link (track, album or playlist)", "pin_copy_id": "Copy ID", "pin_copy_code": "Copy code", "sp_login": "Log in to Spotify", "sp_logged": "Logged in to Spotify: ", "sp_noid": "Spotify login is not configured yet.", "sp_fail": "Spotify login failed. Try again.", "scr_label": "Share screen", "scr_stop2": "Stop sharing", "sp_addr": "Address sent to Spotify: ", "sp_connecting": "Connecting…", "sp_opened": "Spotify opened.", "sp_bad_link": "This is not a Spotify link (track, album, playlist or episode).", "sp_logged_in": "Logged in to Spotify: ", "pf_yt_audio": "YouTube audio only", "yt_audio_t": "Audio-only mode", "yt_audio_s": "The video is hidden. The sound keeps playing.", "yt_audio_play": "▶ Play", "yt_audio_pause": "⏸ Pause", "yt_audio_change": "Choose another video or playlist", "yt_audio_opt": "Audio only (hide the video)", "multi_label": "Multi-video", "multi_title": "Multi-video (YouTube or Twitch)", "multi_top": "Top video (link)", "multi_bottom": "Bottom video (link)", "multi_go": "Start", "multi_cancel": "Cancel", "multi_bad": "Both links must be YouTube, or both Twitch, and valid.", "multi_opened": "Multi-video opened. Both videos are synced.", "multi_fit_all": "Show all", "multi_fit_fill": "Fill screen", "multi_manual": "The bottom video did not start by itself: press its play button.", "mv_stuck": "One of the two videos is not responding. Click inside it once to activate it.", "how_h": "How it works", "how_1": "Create a room, or join your friend's room with their ID and code.", "how_2": "Pick a video: a YouTube, Dailymotion, Twitch, Kick or Facebook link, or a file from your device.", "how_3": "Watch together: play, pause and position stay in sync, and you can chat as you watch.", "how_4": "An account is optional.", "q_link_ph": "YouTube, Dailymotion, Twitch, Kick or Facebook link", "q_link_add": "Add link", "hist_h": "Recent rooms"}, "ar": {"lede": "شاهدوا فيديو معاً في نفس الوقت، حتى من مسافات بعيدة. اختاروا فيديو عاماً (YouTube وDailymotion وTwitch وKick وFacebook) أو ملفاً تملكونه: التشغيل والإيقاف والموضع متزامنة، مع دردشة جانبية. تنتقل الملفات مباشرة بينكم دون تخزينها على خوادمنا.", "name": "اسمك المستعار", "theme": "🎨 المظهر", "login": "تسجيل الدخول", "signup": "إنشاء حساب", "logout": "تسجيل الخروج", "f1": "شاهدوا فيديوهات Dailymotion وYouTube وTwitch وKick وFacebook معاً", "f2": "مشاركة ملف الفيديو مباشرة", "f3": "تزامن التشغيل والإيقاف والتقديم", "f4": "دردشة وإيموجي وصور أثناء الفيلم", "f5": "مظهر وخلفية مشتركان", "f6": "بدون خادم: الملف ينتقل مباشرة بينكم", "create_h": "إنشاء غرفة", "id_label": "معرّف غرفتك", "devnote": "ثابت على هذا الجهاز. يحتاج صديقك إلى هذا المعرّف والرمز أدناه.", "fixed_chk": "الاحتفاظ دائماً بالرمز نفسه", "fixed_lbl": "رمزك (6 أحرف أو أرقام، قابل للتعديل)", "random": "عشوائي", "create_btn": "إنشاء الغرفة", "join_h": "الانضمام إلى غرفة", "join_id_lbl": "معرّف الغرفة (9 أرقام)", "join_code_lbl": "رمز الدخول (6 أحرف)", "join_btn": "انضمام", "f_about": "حول الموقع", "f_privacy": "الخصوصية", "f_terms": "الشروط", "f_contact": "اتصل بنا", "consent": "يستخدم هذا الموقع ملفات تعريف الارتباط وتخزين المتصفح ليعمل (التفضيلات، جلسة الغرفة). وإذا ظهرت إعلانات، فقد تستخدم Google ملفات تعريف الارتباط لتخصيصها.", "learn": "اعرف المزيد", "consent_ok": "فهمت", "err_name": "اختر اسمك المستعار قبل الدخول إلى الغرفة.", "au_home": "الرئيسية", "au_login_title": "سجّل الدخول إلى حسابك", "au_signup_title": "أنشئ حسابك", "au_email": "البريد الإلكتروني", "au_pass": "كلمة المرور", "au_show": "إظهار", "au_forgot": "نسيت كلمة المرور؟", "au_login_btn": "تسجيل الدخول", "au_google": "المتابعة باستخدام Google", "au_to_signup": "ليس لديك حساب؟ أنشئ حساباً", "au_have": "لديك حساب بالفعل؟", "au_login_link": "سجّل الدخول!", "au_first": "الاسم الأول", "au_last": "اسم العائلة", "au_pass_hint": "6 أحرف على الأقل", "au_create": "إنشاء حسابي", "note": "داخل الغرفة، من يملك الفيديو هو من يختاره. بالنسبة لملفات MP4 يمكن للطرف الآخر بدء التشغيل بعد ثوانٍ قليلة. أما الصيغ الأخرى فيجب انتظار انتهاء النقل. أبقِ الصفحة مفتوحة.", "inv_pre": "أنت مدعو إلى الغرفة", "inv_own": "أنشئ غرفتي الخاصة", "legal_close": "إغلاق", "r_copy": "نسخ الرابط", "r_wait": "بانتظار صديق…", "r_leave": "مغادرة", "r_drop": "سيُرسل إلى صديقك، الذي يمكنه مشاهدته أثناء الاستقبال. إذا كان هو من يملكه، فانتظر أن يختاره.", "r_pick": "اختر ملف فيديو", "r_ytdrop": "▶ التشغيل من منصة", "r_qtitle": "قائمة الانتظار", "r_qadd": "إضافة فيديوهات", "r_qclear": "تفريغ", "r_close": "إغلاق", "r_tap": "اضغط لبدء التشغيل", "r_size": "الحجم", "r_chat_hide": "إخفاء الدردشة", "r_nov": "لا يوجد فيديو بعد", "r_sync": "مزامنة", "r_sync_tt": "أرسل موضعك للجميع", "r_change": "إرسال فيديو", "r_yt": "▶ التشغيل من المنصات", "r_theme": "🎨 المظهر", "r_sub": "الترجمة", "r_full": "ملء الشاشة", "r_fit_contain": "ملاءمة (عرض الكل)", "r_fit_cover": "ملء (قص الحواف)", "r_fit_fill": "تمديد", "r_zoom": "تكبير", "r_chat": "الدردشة", "r_small": "صغير", "r_medium": "متوسط", "r_large": "كبير", "r_xlarge": "كبير جداً", "r_msg_ph": "اكتب رسالة…", "r_send": "إرسال", "r_yt_title": "التشغيل من المنصات", "r_choose_pf": "اختر المنصة", "r_back_pf": "منصات أخرى →", "r_go": "تشغيل للجميع", "r_stop": "إيقاف التشغيل", "r_ytmsg": "يوتيوب: التشغيل والإيقاف والتقديم متزامنة بينكم.", "r_url": "رابط الفيديو", "scr_start": "🖥 مشاركة الشاشة", "scr_stop": "⏹ إيقاف المشاركة", "scr_on": "أنت تشارك شاشتك مع صديقك.", "scr_off": "تم إيقاف مشاركة الشاشة.", "scr_refused": "تم إلغاء مشاركة الشاشة.", "scr_nosupport": "مشاركة الشاشة متاحة فقط على الحاسوب.", "src_file": "ملف فيديو", "drop_title": "اختر مصدر الفيديو", "r_url_spot": "رابط Spotify (مقطع أو ألبوم أو قائمة)", "pin_copy_id": "نسخ المعرّف", "pin_copy_code": "نسخ الرمز", "sp_login": "تسجيل الدخول إلى Spotify", "sp_logged": "متصل بـ Spotify: ", "sp_noid": "تسجيل الدخول إلى Spotify غير مُعد بعد.", "sp_fail": "فشل تسجيل الدخول إلى Spotify. حاول مرة أخرى.", "scr_label": "مشاركة الشاشة", "scr_stop2": "إيقاف المشاركة", "sp_addr": "العنوان المُرسل إلى Spotify: ", "sp_connecting": "جارٍ الاتصال…", "sp_opened": "تم فتح Spotify.", "sp_bad_link": "هذا ليس رابط Spotify (مقطع أو ألبوم أو قائمة أو حلقة).", "sp_logged_in": "متصل بـ Spotify: ", "pf_yt_audio": "YouTube صوت فقط", "yt_audio_t": "وضع الصوت فقط", "yt_audio_s": "الفيديو مخفي والصوت مستمر.", "yt_audio_play": "▶ تشغيل", "yt_audio_pause": "⏸ إيقاف مؤقت", "yt_audio_change": "اختيار فيديو أو قائمة أخرى", "yt_audio_opt": "صوت فقط (إخفاء الفيديو)", "multi_label": "فيديو متعدد", "multi_title": "فيديو متعدد (YouTube أو Twitch)", "multi_top": "الفيديو العلوي (رابط)", "multi_bottom": "الفيديو السفلي (رابط)", "multi_go": "ابدأ", "multi_cancel": "إلغاء", "multi_bad": "يجب أن يكون الرابطان من YouTube معاً أو من Twitch معاً، وصالحين.", "multi_opened": "تم فتح الفيديو المتعدد. الفيديوهان متزامنان.", "multi_fit_all": "عرض الكل", "multi_fit_fill": "ملء الشاشة", "multi_manual": "لم يبدأ الفيديو السفلي تلقائياً: اضغط على زر التشغيل الخاص به.", "mv_stuck": "إحدى الفيديوهين لا تستجيب. اضغط داخلها مرة واحدة لتفعيلها.", "how_h": "كيف يعمل", "how_1": "أنشئ غرفة، أو انضم إلى غرفة صديقك بمعرّفها ورمزها.", "how_2": "اختر فيديو: رابطاً من YouTube أو Dailymotion أو Twitch أو Kick أو Facebook، أو ملفاً من جهازك.", "how_3": "شاهدا معاً: التشغيل والإيقاف والموضع تبقى متزامنة، ويمكنكما الدردشة أثناء المشاهدة.", "how_4": "الحساب اختياري.", "q_link_ph": "رابط YouTube أو Dailymotion أو Twitch أو Kick أو Facebook", "q_link_add": "أضف الرابط", "hist_h": "الغرف الأخيرة"}};
  var LANG_NAMES = { fr: 'Français', en: 'English', ar: 'العربية' };
  function pickLang() {
    var s = ''; try { s = localStorage.getItem('a2g-lang') || ''; } catch (e) {}
    if (I18N[s]) return s;
    var n = (navigator.language || 'fr').slice(0, 2).toLowerCase();
    return LANG_NAMES[n] ? n : 'fr';
  }
  function renderBrand() {                       // menu principal : toujours le nom du site
    var b = $('brand'); if (!b) return;
    b.innerHTML = 'anything<span>2</span>gether';
  }
  var curLang = 'fr';
  function tr(k) {
    var L = I18N[curLang] || I18N.fr;
    return L[k] != null ? L[k] : (I18N.fr[k] || k);
  }
  function applyLang(code) {
    if (!I18N[code]) code = 'fr';
    var L = I18N[code];
    curLang = code;
    document.documentElement.lang = code;
    document.documentElement.dir = code === 'ar' ? 'rtl' : 'ltr';
    Array.prototype.forEach.call(document.querySelectorAll('[data-i18n]'), function (el) {
      var k = el.getAttribute('data-i18n'); if (L[k] != null) el.textContent = L[k];
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-i18n-title]'), function (el) {
      var k = el.getAttribute('data-i18n-title'); if (L[k] != null) el.title = L[k];
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-i18n-ph]'), function (el) {
      var k = el.getAttribute('data-i18n-ph'); if (L[k] != null) el.placeholder = L[k];
    });
    if ($('lang-sel')) $('lang-sel').value = code;
    renderBrand();
  }
  (function () {
    var sel = $('lang-sel'); if (!sel) return;
    Object.keys(LANG_NAMES).forEach(function (c) {
      var o = document.createElement('option'); o.value = c; o.textContent = LANG_NAMES[c]; sel.appendChild(o);
    });
    sel.addEventListener('change', function () {
      try { localStorage.setItem('a2g-lang', sel.value); } catch (e) {}
      applyLang(sel.value);
    });
    applyLang(pickLang());
  })();


  /* ---------- pages légales, bandeau cookies ---------- */
  // À modifier une seule fois : nom du responsable du site et adresse de contact (affichées dans les pages)
  var LEGAL_OWNER = 'Achraf Toumi';
  var LEGAL_EMAIL = 'toumiachraf9@gmail.com';
  var LEGAL_SITE = 'anything2gether';
  var LEGAL_T = {"fr": {"legal_close": "Fermer", "about_t": "À propos", "about_h": "<p>{SITE} est un site gratuit pour regarder une vidéo à deux, en même temps, même à distance.</p><h3>Comment ça marche</h3><p>L'un de vous choisit une vidéo (fichier sur son téléphone ou son ordinateur, ou lien YouTube, Dailymotion, Twitch, Kick ou Facebook). Le fichier est envoyé directement à l'autre personne (connexion pair à pair) : il n'est pas stocké sur nos serveurs. La lecture, la pause et la position sont synchronisées, et un chat permet d'échanger pendant le film.</p><h3>Qui gère le site</h3><p>{OWNER}. Pour toute question : voir la page Contact.</p>", "privacy_t": "Politique de confidentialité", "privacy_h": "<p>Cette page explique quelles données sont utilisées quand tu utilises {SITE}.</p><h3>Données que nous traitons</h3><ul><li><b>Prénom ou pseudo</b> : saisi pour la salle. Il est visible par les personnes présentes dans la salle.</li><li><b>Compte (facultatif)</b> : e-mail, mot de passe chiffré et pseudo, gérés par Firebase Authentication (Google). Un compte Google peut aussi être utilisé pour se connecter.</li><li><b>Messages du chat et photos</b> : envoyés directement entre les personnes de la salle. Ils ne sont pas enregistrés sur nos serveurs. L'historique du chat reste dans la salle tant qu'elle est ouverte.</li><li><b>Vidéos</b> : les fichiers ne quittent pas tes appareils et ceux de ton ami. Ils ne sont pas stockés chez nous.</li><li><b>Préférences sur ton appareil</b> : langue, thème, fond d'écran, taille du chat, et session de salle. Elles sont stockées dans le navigateur (localStorage) et peuvent être effacées à tout moment.</li></ul><h3>Services tiers</h3><ul><li><b>Serveurs de connexion</b> (PeerJS, STUN et TURN) : nécessaires pour établir la connexion entre deux appareils. Des adresses IP peuvent être traitées pendant la connexion.</li><li><b>Firebase (Google)</b> : gestion des comptes.</li><li><b>Lecteurs intégrés</b> (YouTube, Dailymotion, Twitch, Kick, Facebook) : ces services ont leurs propres cookies et règles de confidentialité, que tu acceptes en utilisant leur lecteur.</li><li><b>Google AdSense</b> (si des publicités sont affichées) : Google et ses partenaires peuvent utiliser des cookies pour afficher des publicités en fonction de tes visites sur ce site et d'autres sites. Tu peux gérer ces réglages dans les paramètres publicitaires de Google (adssettings.google.com).</li></ul><h3>Cookies</h3><p>Des cookies et le stockage du navigateur servent au fonctionnement du site. Des cookies de publicité peuvent être ajoutés si des publicités sont affichées. Tu peux les refuser ou les supprimer dans les réglages de ton navigateur.</p><h3>Durée de conservation</h3><p>Les préférences restent sur ton appareil jusqu'à ce que tu les effaces. Un compte est conservé tant qu'il existe ; tu peux demander sa suppression.</p><h3>Tes droits</h3><p>Tu peux demander l'accès, la correction ou la suppression de tes données en écrivant à {EMAIL}.</p><h3>Mineurs</h3><p>Le site ne cible pas les enfants de moins de 13 ans. Si tu penses qu'un enfant nous a fourni des données, écris-nous pour qu'on les supprime.</p><h3>Modifications</h3><p>Cette politique peut évoluer. La date de dernière mise à jour est indiquée ci-dessous.</p><p><i>Dernière mise à jour : 23 novembre 2026.</i></p>", "terms_t": "Conditions d'utilisation", "terms_h": "<h3>Utilisation</h3><p>{SITE} est fourni gratuitement, tel quel. Tu l'utilises pour regarder des vidéos avec des personnes que tu connais ou que tu as invitées.</p><h3>Contenus</h3><p>Tu ne dois partager que des vidéos que tu as le droit de diffuser. Il est interdit d'utiliser le site pour distribuer des contenus piratés ou protégés sans autorisation.</p><h3>Comportement</h3><p>Pas de harcèlement, de contenu illégal, haineux ou pornographique, ni de tentative d'accès aux salles d'autres personnes. Nous pouvons restreindre l'accès en cas d'abus.</p><h3>Comptes</h3><p>Tu es responsable de la confidentialité de ton mot de passe. Tu peux supprimer ton compte à tout moment en nous écrivant.</p><h3>Limites</h3><p>La qualité de la connexion dépend de ton réseau et de celui de ton ami. Les lecteurs intégrés (YouTube, Dailymotion, Twitch, Kick, Facebook) relèvent des conditions de leur plateforme.</p><h3>Responsabilité</h3><p>Le site est fourni sans garantie. Nous ne sommes pas responsables des pertes de données ou des interruptions de service.</p><h3>Contact</h3><p>Pour toute question sur ces conditions : {EMAIL}.</p>", "contact_t": "Contact", "contact_h": "<p>Pour une question, un bug, une demande de suppression de données ou un signalement :</p><p><b>E-mail : </b><a href=\"mailto:{EMAIL}\">{EMAIL}</a></p><p>Responsable du site : {OWNER}.</p>"}, "en": {"legal_close": "Close", "about_t": "About", "about_h": "<p>{SITE} is a free site to watch a video together, at the same time, even from a distance.</p><h3>How it works</h3><p>One of you chooses a video (a file on your phone or computer, or a YouTube, Dailymotion, Twitch, Kick or Facebook link). The file is sent directly to the other person (peer-to-peer connection): it is not stored on our servers. Play, pause and position are synced, and a chat lets you talk during the movie.</p><h3>Who runs the site</h3><p>{OWNER}. For any question, see the Contact page.</p>", "privacy_t": "Privacy policy", "privacy_h": "<p>This page explains what data is used when you use {SITE}.</p><h3>Data we process</h3><ul><li><b>First name or nickname</b>: entered for the room. It is visible to people in the room.</li><li><b>Account (optional)</b>: email, encrypted password and nickname, managed by Firebase Authentication (Google). A Google account can also be used to log in.</li><li><b>Chat messages and photos</b>: sent directly between people in the room. They are not stored on our servers. Chat history stays in the room while it is open.</li><li><b>Videos</b>: files never leave your devices or your friend's. They are not stored by us.</li><li><b>Preferences on your device</b>: language, theme, wallpaper, chat size, and room session. They are stored in the browser (localStorage) and can be cleared at any time.</li></ul><h3>Third-party services</h3><ul><li><b>Connection servers</b> (PeerJS, STUN and TURN): needed to connect two devices. IP addresses may be processed during the connection.</li><li><b>Firebase (Google)</b>: account management.</li><li><b>Embedded players</b> (YouTube, Dailymotion, Twitch, Kick, Facebook): these services have their own cookies and privacy rules, which you accept by using their player.</li><li><b>Google AdSense</b> (if ads are shown): Google and its partners may use cookies to show ads based on your visits to this site and others. You can manage these settings in Google's ad settings (adssettings.google.com).</li></ul><h3>Cookies</h3><p>Cookies and browser storage are used to operate the site. Advertising cookies may be added if ads are shown. You can refuse or delete them in your browser settings.</p><h3>Retention</h3><p>Preferences stay on your device until you clear them. An account is kept as long as it exists; you can ask for its deletion.</p><h3>Your rights</h3><p>You can ask for access, correction or deletion of your data by writing to {EMAIL}.</p><h3>Minors</h3><p>The site is not aimed at children under 13. If you think a child has given us data, write to us so we can delete it.</p><h3>Changes</h3><p>This policy may change. The last update date is shown below.</p><p><i>Last updated: November 23, 2026.</i></p>", "terms_t": "Terms of use", "terms_h": "<h3>Use</h3><p>{SITE} is provided free of charge, as is. Use it to watch videos with people you know or have invited.</p><h3>Content</h3><p>Only share videos you have the right to distribute. Using the site to distribute pirated or unauthorized protected content is forbidden.</p><h3>Behavior</h3><p>No harassment, illegal, hateful or pornographic content, and no attempt to access other people's rooms. We may restrict access in case of abuse.</p><h3>Accounts</h3><p>You are responsible for keeping your password confidential. You can delete your account at any time by writing to us.</p><h3>Limits</h3><p>Connection quality depends on your network and your friend's. Embedded players (YouTube, Dailymotion, Twitch, Kick, Facebook) are governed by their platform's terms.</p><h3>Liability</h3><p>The site is provided without warranty. We are not responsible for data loss or service interruptions.</p><h3>Contact</h3><p>For any question about these terms: {EMAIL}.</p>", "contact_t": "Contact", "contact_h": "<p>For a question, a bug, a data deletion request or a report:</p><p><b>Email: </b><a href=\"mailto:{EMAIL}\">{EMAIL}</a></p><p>Site owner: {OWNER}.</p>"}, "ar": {"legal_close": "إغلاق", "about_t": "حول الموقع", "about_h": "<p>{SITE} موقع مجاني لمشاهدة فيديو معاً في نفس الوقت، حتى من مسافات بعيدة.</p><h3>كيف يعمل</h3><p>يختار أحدكم فيديو (ملف على هاتفه أو حاسوبه، أو رابط من YouTube أو Dailymotion أو Twitch أو Kick أو Facebook). يُرسل الملف مباشرة إلى الشخص الآخر (اتصال نظير إلى نظير)، ولا يُخزَّن على خوادمنا. التشغيل والإيقاف والموضع متزامنة، ويتيح الشات التحدث أثناء الفيلم.</p><h3>من يدير الموقع</h3><p>{OWNER}. لأي سؤال، راجع صفحة الاتصال.</p>", "privacy_t": "سياسة الخصوصية", "privacy_h": "<p>توضح هذه الصفحة البيانات المستخدمة عند استعمال {SITE}.</p><h3>البيانات التي نعالجها</h3><ul><li><b>الاسم الأول أو الاسم المستعار</b>: يُدخل للغرفة، ويكون مرئياً للحاضرين فيها.</li><li><b>الحساب (اختياري)</b>: البريد الإلكتروني وكلمة المرور المشفّرة والاسم المستعار، وتُدار عبر Firebase Authentication (Google). ويمكن أيضاً استخدام حساب Google لتسجيل الدخول.</li><li><b>رسائل الشات والصور</b>: تُرسل مباشرة بين الحاضرين في الغرفة، ولا تُسجَّل على خوادمنا. يبقى سجل الشات في الغرفة ما دامت مفتوحة.</li><li><b>الفيديوهات</b>: لا تغادر الملفات أجهزتك أو جهاز صديقك، ولا نخزّنها.</li><li><b>التفضيلات على جهازك</b>: اللغة والمظهر وخلفية الشاشة وحجم الشات وجلسة الغرفة. تُحفظ في المتصفح (localStorage) ويمكن مسحها في أي وقت.</li></ul><h3>الخدمات الخارجية</h3><ul><li><b>خوادم الاتصال</b> (PeerJS وSTUN وTURN): لازمة لربط جهازين، وقد تُعالج عناوين IP أثناء الاتصال.</li><li><b>Firebase (Google)</b>: إدارة الحسابات.</li><li><b>المشغلات المدمجة</b> (YouTube وDailymotion وTwitch وKick وFacebook): لهذه الخدمات ملفات تعريف الارتباط وقواعد خصوصية خاصة بها، تقبلها عند استخدام مشغلها.</li><li><b>Google AdSense</b> (إذا ظهرت إعلانات): قد تستخدم Google وشركاؤها ملفات تعريف الارتباط لعرض إعلانات بناءً على زياراتك لهذا الموقع ومواقع أخرى. يمكنك إدارة ذلك من إعدادات الإعلانات في Google (adssettings.google.com).</li></ul><h3>ملفات تعريف الارتباط</h3><p>تُستخدم ملفات تعريف الارتباط وتخزين المتصفح لتشغيل الموقع. وقد تُضاف ملفات إعلانية إذا ظهرت إعلانات. يمكنك رفضها أو حذفها من إعدادات متصفحك.</p><h3>مدة الحفظ</h3><p>تبقى التفضيلات على جهازك حتى تمسحها. يُحفظ الحساب ما دام موجوداً، ويمكنك طلب حذفه.</p><h3>حقوقك</h3><p>يمكنك طلب الاطلاع على بياناتك أو تصحيحها أو حذفها بمراسلة {EMAIL}.</p><h3>القاصرون</h3><p>الموقع غير موجَّه للأطفال دون 13 سنة. إذا علمت أن طفلاً زوّدنا ببيانات، فراسلنا لحذفها.</p><h3>التعديلات</h3><p>قد تتغير هذه السياسة. تاريخ آخر تحديث مذكور أدناه.</p><p><i>آخر تحديث: 23 نوفمبر 2026.</i></p>", "terms_t": "شروط الاستخدام", "terms_h": "<h3>الاستخدام</h3><p>يُقدَّم {SITE} مجاناً وكما هو. استخدمه لمشاهدة الفيديوهات مع أشخاص تعرفهم أو دعوتهم.</p><h3>المحتوى</h3><p>شارك فقط الفيديوهات التي تملك حق نشرها. يُمنع استخدام الموقع لتوزيع محتوى مقرصن أو محمي دون إذن.</p><h3>السلوك</h3><p>يُمنع التحرش والمحتوى غير القانوني أو الكراهية أو الإباحي، كما يُمنع محاولة دخول غرف الآخرين. قد نقيّد الوصول في حالة إساءة الاستخدام.</p><h3>الحسابات</h3><p>أنت مسؤول عن سرية كلمة مرورك. يمكنك حذف حسابك في أي وقت بمراسلتنا.</p><h3>القيود</h3><p>تعتمد جودة الاتصال على شبكتك وشبكة صديقك. تخضع المشغلات المدمجة (YouTube وDailymotion وTwitch وKick وFacebook) لشروط منصتها.</p><h3>المسؤولية</h3><p>يُقدَّم الموقع دون ضمان. ولسنا مسؤولين عن فقدان البيانات أو انقطاع الخدمة.</p><h3>التواصل</h3><p>لأي سؤال حول هذه الشروط: {EMAIL}.</p>", "contact_t": "اتصل بنا", "contact_h": "<p>لسؤال أو خلل أو طلب حذف بيانات أو بلاغ:</p><p><b>البريد الإلكتروني: </b><a href=\"mailto:{EMAIL}\">{EMAIL}</a></p><p>المسؤول عن الموقع: {OWNER}.</p>"}};
  function openLegal(k) {
    var T = LEGAL_T[curLang] || LEGAL_T.fr;
    if (!T[k + '_t']) return;
    var site = LEGAL_SITE;
    var fill = function (h) { return h.split('{SITE}').join(site).split('{OWNER}').join(LEGAL_OWNER).split('{EMAIL}').join(LEGAL_EMAIL); };
    $('legal-title').textContent = T[k + '_t'];
    $('legal-body').innerHTML = fill(T[k + '_h']);
    $('legal-body').scrollTop = 0;
    $('legal-modal').hidden = false;
  }
  function closeLegal() { $('legal-modal').hidden = true; }
  Array.prototype.forEach.call(document.querySelectorAll('[data-legal]'), function (b) {
    b.addEventListener('click', function () { openLegal(b.getAttribute('data-legal')); });
  });
  $('legal-close').addEventListener('click', closeLegal);
  $('legal-modal').addEventListener('click', function (e) { if (e.target === this) closeLegal(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('legal-modal').hidden) closeLegal(); });
  (function () {
    var ok = false; try { ok = localStorage.getItem('a2g-consent') === '1'; } catch (e) {}
    if (!ok) $('consent').hidden = false;
    $('consent-ok').addEventListener('click', function () {
      try { localStorage.setItem('a2g-consent', '1'); } catch (e) {}
      $('consent').hidden = true;
    });
  })();

  // ---------- copie de l'ID et du code de la salle depuis l'épingle ----------
  function copyText(t, btn) {
    var done = function () {
      btn.classList.add('ok');
      setTimeout(function () { btn.classList.remove('ok'); }, 1200);
    };
    var fallback = function () {
      var ta = document.createElement('textarea');
      ta.value = t; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { if (document.execCommand('copy')) done(); } catch (e) {}
      document.body.removeChild(ta);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done, fallback);
    else fallback();
  }
  $('pin-copy-id').addEventListener('click', function () { copyText($('pin-id').textContent.trim(), this); });
  $('pin-copy-code').addEventListener('click', function () { copyText($('pin-code').textContent.trim(), this); });
  // ---------- connexion au compte Spotify (PKCE, sans secret) ----------
  var SPOTIFY_CLIENT_ID = 'bd08f8e0767b43d3bfb9bc4f3b10be20';                       // ← colle ici l'identifiant de ton application Spotify
  var SPOTIFY_SCOPES = 'user-read-private user-read-email';
  function spotRedirect() { return new URL('spotify-callback', location.href).href; }   // sans « .html » : GitHub Pages perd ?code= en redirigeant .html
  function spotRand(n) {
    var a = new Uint8Array(n); crypto.getRandomValues(a);
    return Array.prototype.map.call(a, function (x) { return ('0' + (x % 36).toString(36)).slice(-1); }).join('');
  }
  function b64url(buf) {
    var bin = ''; new Uint8Array(buf).forEach(function (b) { bin += String.fromCharCode(b); });
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function spotShowState() {
    var box = $('spot-acct'); if (!box) return;
    var st = null; try { st = JSON.parse(localStorage.getItem('a2g-spotify') || 'null'); } catch (e) {}
    var b = $('spot-login');
    if (st && st.name) {
      $('spot-who').textContent = tr('sp_logged_in') + st.name;
      b.hidden = true;
    } else {
      $('spot-who').textContent = '';
      b.hidden = false;
      b.textContent = tr('sp_login'); b.setAttribute('data-i18n', 'sp_login');
      b.onclick = spotLogin;
    }
  }
  async function spotLogin() {
    if (!SPOTIFY_CLIENT_ID) { $('spot-who').textContent = tr('sp_noid'); return; }
    var verifier = spotRand(64);
    var challenge = b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
    try { localStorage.setItem('a2g-spot-verifier', verifier); } catch (e) {}
    var q = new URLSearchParams({ client_id: SPOTIFY_CLIENT_ID, response_type: 'code', redirect_uri: spotRedirect(), scope: SPOTIFY_SCOPES, code_challenge_method: 'S256', code_challenge: challenge });
    var url = 'https://accounts.spotify.com/authorize?' + q.toString();
    $('spot-who').textContent = tr('sp_addr') + spotRedirect();   // pour vérifier qu'elle est identique à celle du tableau de bord
    var w = window.open(url, 'a2g-spotify', 'width=480,height=720');
    if (!w) location.href = url;                  // fenêtre bloquée : connexion dans cette page
    var tries = 0;
    var poll = setInterval(function () {                // on surveille le compte : dès qu'il est enregistré, on affiche « connecté »
      tries++;
      var st = null; try { st = localStorage.getItem('a2g-spotify'); } catch (e) {}
      if (st || tries > 300) { clearInterval(poll); spotShowState(); }
    }, 1000);
  }
  window.addEventListener('storage', function (e) { if (e.key === 'a2g-spotify') spotShowState(); });
  if ($('yt')) { new MutationObserver(syncPlyr).observe($('yt'), { attributes: true, attributeFilter: ['hidden'] }); }
  syncPlyr();
  // ---------- Multi-vidéo (YouTube ou Twitch, les deux du même site) ----------
  var multi = { active: false, kind: '', a: '', b: '', pa: null, pb: null, zoom: 1, ox: 0, oy: 0, timer: null, ready: 0, muted: false, playing: false, fill: false, quietUntil: 0, placePad: null, oyA: 0, oyB: 0, startMuted: false, mutedA: false, mutedB: false, pauseT: null };
  var M_PLAY = '<svg viewBox="0 0 24 24" width="34" height="34" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
  var M_PAUSE = '<svg viewBox="0 0 24 24" width="34" height="34" fill="currentColor" aria-hidden="true"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>';
  var M_VOL = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M11 5L6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a9 9 0 0 1 0 14"/></svg>';
  var twApiP = null;
  function mFmt(t) { t = Math.max(0, Math.floor(t || 0)); var m = Math.floor(t / 60), x = t % 60; return m + ':' + (x < 10 ? '0' : '') + x; }
  function mOpen() { $('multi-modal').hidden = false; $('multi-err').textContent = ''; }
  function mClose() { $('multi-modal').hidden = true; }
  // lit un lien Twitch : vidéo enregistrée (/videos/ID) ou chaîne en direct (nom de la chaîne)
  function parseTwitch(raw) {
    var t = (raw || '').trim();
    if (t && !/^https?:\/\//i.test(t)) t = 'https://' + t;      // accepte aussi twitch.tv/... sans https://
    var m = t.match(/^https?:\/\/(?:www\.|m\.)?twitch\.tv\/videos\/(\d+)/i);
    if (m) return { kind: 'video', id: m[1] };
    m = t.match(/^https?:\/\/(?:www\.|m\.)?twitch\.tv\/([A-Za-z0-9_]{3,25})\/?(?:[?#].*)?$/i);
    if (m && !/^(videos|clips|directory|settings)$/i.test(m[1])) return { kind: 'channel', id: m[1] };
    return null;
  }
  function mLaunchFromForm() {
    var ra = $('multi-a').value, rb = $('multi-b').value;
    var ta = parseTwitch(ra), tb = parseTwitch(rb);
    var ya = parseYt(ra), yb = parseYt(rb);
    if (ta && tb) { mClose(); startMulti('twitch|' + ta.kind + '|' + ta.id, 'twitch|' + tb.kind + '|' + tb.id, true); return; }
    if (ya && yb && ya.id && yb.id) { mClose(); startMulti(ya.id, yb.id, true); return; }
    $('multi-err').textContent = tr('multi_bad');
  }
  function loadTwApi() {
    if (window.Twitch && window.Twitch.Player) return Promise.resolve();
    if (twApiP) return twApiP;
    twApiP = new Promise(function (res, rej) {
      var sc = document.createElement('script');
      sc.src = 'https://player.twitch.tv/js/embed/v1.js';
      sc.onload = function () { res(); }; sc.onerror = function () { rej(new Error('twitch')); };
      document.head.appendChild(sc);
    });
    return twApiP;
  }
  function parseMultiId(x) {                       // renvoie { kind:'youtube'|'twitch', ... } ou null
    var q = String(x || '').split('|');
    if (q[0] === 'twitch' && q.length === 3 && /^(video|channel)$/.test(q[1]) && /^[A-Za-z0-9_]+$/.test(q[2])) return { kind: 'twitch', type: q[1], id: q[2] };
    if (/^[\w-]{11}$/.test(String(x))) return { kind: 'youtube', id: x };
    return null;
  }
  function startMulti(a, b, asSource) {
    var pa = parseMultiId(a), pb = parseMultiId(b);
    if (!pa || !pb || pa.kind !== pb.kind) return;
    resetVideo();                                             // on repart d'un écran propre
    $('tap').hidden = true; $('drop').hidden = true; $('yt').hidden = false;
    var box = $('yt');
    var wrap = document.createElement('div'); wrap.id = 'multi-wrap';
    var side = function (k) {
      return '<div class="mside" id="ms' + k + '">' +
        '<button type="button" class="msbtn" id="m-mute' + k + '" aria-label="Couper le son">' + M_VOL + '</button>' +
      '</div>';
    };
    wrap.innerHTML = '<div class="mcell" id="mcellA"><div id="mpA"></div>' + side('A') + '</div>' +
      '<div class="mcell" id="mcellB"><div id="mpB"></div>' + side('B') + '</div>' +
      '<div id="m-panel">' +
        '<div class="mrow"><span id="m-time">0:00 / 0:00</span><input type="range" id="m-seek" min="0" max="1000" value="0" aria-label="Position"></div>' +
        '<div class="mrow"><span class="mlab">Volume</span><input type="range" id="m-vol" min="0" max="100" value="100" aria-label="Volume"></div>' +
        '<div class="mrow"><span class="mlab">Zoom</span><input type="range" id="m-zoom" min="0" max="100" step="1" value="50" aria-label="Zoom"><span id="m-zoomv" class="mzv">1.0x</span></div>' +
        '<div class="mrow"><button type="button" class="mbtn" id="m-fit"></button></div>' +
        '<div class="mrow mpadrow">' +
          '<div class="mpadcol"><span class="mlab">Haut</span><div id="m-padA" class="mpadv" aria-label="Balayer la vidéo du haut"><span class="mdot"></span></div></div>' +
          '<div class="mpadcol"><span class="mlab">Bas</span><div id="m-padB" class="mpadv" aria-label="Balayer la vidéo du bas"><span class="mdot"></span></div></div>' +
        '</div>' +
      '</div>' +
      '<div id="multi-bar"><button type="button" class="mbtn" id="m-toggle" aria-label="Afficher les réglages"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button></div>';
    box.appendChild(wrap);
    multi.active = true; multi.kind = pa.kind; multi.a = a; multi.b = b; multi.ready = 0; multi.zoom = 1; multi.ox = 0; multi.oyA = 0; multi.oyB = 0; multi.muted = false; multi.mutedA = false; multi.mutedB = true;
    multi.quietUntil = Date.now() + 4000;
    multi.pendingAct = null;
    multi.startMuted = true;          // au démarrage, les lecteurs signalent des états provisoires : on ne les relaie pas
    if (asSource) broadcast({ t: 'multi', a: a, b: b });
    wireMultiBar();
    if (pa.kind === 'youtube') {
      loadYtApi().then(function () {
        if (!multi.active) return;
        var mk = function (id, elId) {
          return new YT.Player(elId, { videoId: id, width: '100%', height: '100%',
            playerVars: { controls: 1, autoplay: 1, rel: 0, modestbranding: 1, playsinline: 1 },
            events: { onReady: function () { multi.ready++; if (multi.ready === 2) { mStartTimer(); mFit(); mDo('mute', true); if (multi.pendingAct) { var pd = multi.pendingAct; multi.pendingAct = null; mDo(pd.act, pd.arg); } else mDo('play'); setTimeout(function () { mEnsurePlaying(1); }, 800); } },
                      onStateChange: function (e) { if (e.data === 1) mState(true); else if (e.data === 2) mState(false); } } });
        };
        multi.pa = mk(pa.id, 'mpA'); multi.pb = mk(pb.id, 'mpB');
      });
    } else {
      loadTwApi().then(function () {
        if (!multi.active) return;
        var mk = function (info, elId) {
          var o = { width: '100%', height: '100%', parent: [location.hostname || 'localhost'], autoplay: false, muted: false, controls: true };
          if (info.type === 'video') o.video = info.id; else o.channel = info.id;
          var pl = new Twitch.Player(elId, o);
          pl.addEventListener(Twitch.Player.READY, function () { multi.ready++; if (multi.ready === 2) { mStartTimer(); mFit(); mDo('mute', true); if (multi.pendingAct) { var pd = multi.pendingAct; multi.pendingAct = null; mDo(pd.act, pd.arg); } else mDo('play'); setTimeout(function () { mEnsurePlaying(1); }, 800); } });
          pl.addEventListener(Twitch.Player.PLAY, function () { mState(true); });
          pl.addEventListener(Twitch.Player.PAUSE, function () { mState(false); });
          return pl;
        };
        multi.pa = mk(pa, 'mpA'); multi.pb = mk(pb, 'mpB');
      }).catch(function () { addMsg('', 'Impossible de charger Twitch.', 'sys'); });
    }
    addMsg('', tr('multi_opened'), 'sys');
  }
  function wireMultiBar() {
    $('m-toggle').addEventListener('click', function () {
      var open = $('m-panel').classList.toggle('open');
      this.classList.toggle('open', open);
      this.setAttribute('aria-label', open ? 'Masquer les réglages' : 'Afficher les réglages');
    });
    $('m-seek').addEventListener('change', function () {
      var d = mDur(); if (d > 0) mCtl('seek', (this.value / 1000) * d);
    });

    $('m-fit').addEventListener('click', function () {
      multi.fill = !multi.fill; updateFitBtn(); mFit();
    });
    updateFitBtn();
    ['A', 'B'].forEach(function (k) {
      $('m-mute' + k).addEventListener('click', function () { mSetLocalMute(k, !multi['muted' + k], true); });
      // sur écran tactile, les contrôles s'affichent quelques secondes au toucher
      $('mcell' + k).addEventListener('pointerdown', function () {
        var m = $('ms' + k); m.classList.add('show');
        clearTimeout(m._hide); m._hide = setTimeout(function () { m.classList.remove('show'); }, 2500);
      });
    });
    $('m-zoom').addEventListener('input', function () { mSetZoom(zoomOf(+this.value)); });
    $('m-vol').addEventListener('input', function () { mCtl('vol', +this.value); });
    wirePads();
    mSetZoom(multi.zoom);
  }
  // muet propre à chaque vidéo et à chaque personne : rien n'est envoyé à l'autre
  function mSetLocalMute(k, on, send) {
    multi['muted' + k] = !!on;
    if (send) broadcast({ t: 'mmute', k: k, on: !!on });
    mVolApply();
    var b = $('m-mute' + k);
    if (b) {
      b.classList.toggle('off', !!on);
      b.innerHTML = on ? '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M11 5L6 9H2v6h4l5 4z"/><path d="M22 9l-6 6M16 9l6 6"/></svg>' : M_VOL;
    }
  }
  function mApplyLocalMute() { mSetLocalMute('A', multi.mutedA, false); mSetLocalMute('B', multi.mutedB, false); }
  function updateFitBtn() {
    var b = $('m-fit'); if (!b) return;
    b.textContent = tr(multi.fill ? 'multi_fit_fill' : 'multi_fit_all');
    b.setAttribute('data-i18n', multi.fill ? 'multi_fit_fill' : 'multi_fit_all');
  }
  function mDur() { try { return multi.kind === 'twitch' ? (multi.pa.getDuration() || 0) : (multi.pa.getDuration() || 0); } catch (e) { return 0; } }
  // applique une commande aux deux vidéos (sans la renvoyer)
  function mState(play) {                     // un lecteur a changé d'état
    multi.playing = play;
    if (Date.now() < multi.quietUntil) return;  // provoqué par l'appli elle-même : rien à relayer
    if (!play && document.hidden) return;        // onglet en arrière-plan : le navigateur met la vidéo en pause, pas la personne
    clearTimeout(multi.pauseT);
    if (play) { mCtl('play'); return; }         // lecture : les deux vidéos suivent
    // pause : on attend un peu, une pause technique (mise en mémoire tampon) repart toute seule
    multi.pauseT = setTimeout(function () { if (!multi.playing) mCtl('pause'); }, 1200);
  }
  // recale la vidéo en retard sur l'autre au moment de lancer (vidéos enregistrées seulement)
  function mAlign() {
    if (multi.kind !== 'youtube' || !multi.pa || !multi.pb) return;
    try {
      var ta = multi.pa.getCurrentTime(), tb = multi.pb.getCurrentTime();
      if (Math.abs(ta - tb) < 0.8) return;
      if (ta < tb) multi.pa.seekTo(tb, true); else multi.pb.seekTo(ta, true);
    } catch (e) {}
  }
  // vérifie que chaque lecteur a bien suivi la commande ; sinon on la renvoie à celui qui ne répond pas
  function mVerify(act, tries) {
    if (!multi.active || document.hidden) return;
    var want = act === 'play';
    var bad = [];
    if (multi.pa && mRealPlaying(multi.pa) !== want) bad.push(['A', multi.pa]);
    if (multi.pb && mRealPlaying(multi.pb) !== want) bad.push(['B', multi.pb]);
    if (!bad.length) return;
    if (tries >= 3) { addMsg('', tr('mv_stuck'), 'sys'); return; }
    bad.forEach(function (x) {
      try {
        if (multi.kind === 'twitch') { if (want) x[1].play(); else x[1].pause(); }
        else { if (want) x[1].playVideo(); else x[1].pauseVideo(); }
      } catch (e) {}
    });
    setTimeout(function () { mVerify(act, tries + 1); }, 1200);
  }
  // applique le volume : 1 % quand la vidéo est « muette » (le navigateur la garde active en arrière-plan)
  function mVolApply() {
    var v = multi.vol == null ? 100 : multi.vol;
    ['A', 'B'].forEach(function (k) {
      var p = k === 'A' ? multi.pa : multi.pb;
      var lvl = multi['muted' + k] ? 1 : v;
      try { if (multi.kind === 'twitch') p.setVolume(lvl / 100); else p.setVolume(lvl); } catch (e) {}
    });
  }
  function mDo(act, arg) {
    if (act === 'mute') { multi.muted = !!arg; multi.mutedA = multi.mutedB = !!arg; mVolApply(); return; }
    if (act === 'vol') { multi.vol = +arg; mVolApply(); if ($('m-vol')) $('m-vol').value = arg; return; }
    if (multi.ready < 2 && act !== 'vol' && act !== 'mute') { multi.pendingAct = { act: act, arg: arg }; return; }
    if (act === 'play') mAlign();
    multi.quietUntil = Date.now() + 1200;
    [multi.pa, multi.pb].forEach(function (p) {
      if (!p) return;
      try {
        if (multi.kind === 'twitch') {
          if (act === 'play') p.play();
          else if (act === 'pause') p.pause();
          else if (act === 'seek') p.seek(+arg || 0);
          else if (act === 'vol') p.setVolume((+arg || 0) / 100);
          else if (act === 'mute') p.setMuted(!!arg);
        } else {
          if (act === 'play') p.playVideo();
          else if (act === 'pause') p.pauseVideo();
          else if (act === 'seek') p.seekTo(+arg || 0, true);
          else if (act === 'vol') p.setVolume(+arg);
          else if (act === 'mute') { if (arg) p.mute(); else p.unMute(); }
        }
      } catch (e) {}
    });
    if (act === 'mute') multi.muted = !!arg;
    if (act === 'vol' && $('m-vol')) $('m-vol').value = arg;
    if (act === 'play' || act === 'pause') setTimeout(function () { mVerify(act, 1); }, 1200);
  }
  // commande de la personne : appliquée ici et envoyée à l'autre
  function mCtl(act, arg) { mDo(act, arg); broadcast({ t: 'mctl', act: act, arg: arg }); }
  // recadrage : 16:9 au centre par défaut, zoom et décalage réglables, identiques pour les deux
  // curseur : 50 = 1x (au milieu), vers la gauche = zoom arrière (0,5x), vers la droite = zoom avant (2x)
  function zoomOf(v) { return Math.pow(2, (v - 50) / 50); }
  function sliderOf(z) { return 50 + 50 * Math.log(z) / Math.LN2; }
  // réglages propres à chaque personne (rien n'est envoyé à l'autre)
  function mSetZoom(z) {
    multi.zoom = z;
    if ($('m-zoom')) $('m-zoom').value = sliderOf(z);
    if ($('m-zoomv')) $('m-zoomv').textContent = z.toFixed(1) + 'x';
    mFit();
  }
  // balayage vertical : chaque vidéo a son propre décalage
  function wirePads() {
    ['A', 'B'].forEach(function (k) {
      var pad = $('m-pad' + k); if (!pad) return;
      var dot = pad.querySelector('.mdot'), drag = false;
      var place = function () { dot.style.top = ((multi['oy' + k] + 0.5) * 100) + '%'; };
      multi['placePad' + k] = place; place();
      var set = function (e) {
        var r = pad.getBoundingClientRect();
        var y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
        multi['oy' + k] = y - 0.5; place(); mFit();
      };
      pad.addEventListener('pointerdown', function (e) { drag = true; try { pad.setPointerCapture(e.pointerId); } catch (x) {} set(e); });
      pad.addEventListener('pointermove', function (e) { if (drag) set(e); });
      pad.addEventListener('pointerup', function () { drag = false; });
      pad.addEventListener('dblclick', function () { multi['oy' + k] = 0; place(); mFit(); });
    });
  }
  // lecture de secours : si une vidéo reste à l'arrêt au démarrage, on relance (quelques essais)
  function mEnsurePlaying(tries) {
    if (!multi.active) return;
    var both = true;
    var isPlaying = function (p) {
      try {
        if (multi.kind === 'twitch') return !(p.isPaused && p.isPaused());
        var st = p.getPlayerState(); return st === 1 || st === 3;
      } catch (e) { return false; }
    };
    if (!isPlaying(multi.pa) || !isPlaying(multi.pb)) { both = false; if (tries < 3) mDo('play'); }
    // au démarrage les vidéos sont en muet ; dès qu'elles jouent (ou à la dernière tentative), on rétablit le son
    if (multi.startMuted && (both || tries >= 3)) { multi.startMuted = false; mApplyLocalMute(); }
    if (!both && tries < 3) setTimeout(function () { mEnsurePlaying(tries + 1); }, 1500);
    else if (!both) addMsg('', tr('multi_manual'), 'sys');
  }
  function mFit() {
    ['A', 'B'].forEach(function (k) {
      var c = $('mcell' + k); if (!c) return;
      var f = c.querySelector('iframe'); if (!f) return;
      var w = c.clientWidth, h = c.clientHeight; if (!w || !h) return;
      var iw, ih;
      // tout voir : la vidéo entière est affichée (bandes noires si besoin) ; remplir : elle recouvre la case (rognage)
      var wide = w / h > 16 / 9;
      if (multi.fill ? wide : !wide) { iw = w; ih = w * 9 / 16; } else { ih = h; iw = h * 16 / 9; }
      iw *= multi.zoom; ih *= multi.zoom;
      f.style.width = iw + 'px'; f.style.height = ih + 'px';
      var oy = k === 'A' ? multi.oyA : multi.oyB;
      f.style.left = ((w - iw) / 2) + 'px';
      f.style.top = ((h - ih) / 2 + oy * h) + 'px';
    });
  }
  function mStartTimer() {
    if (multi.timer) clearInterval(multi.timer);
    multi.timer = setInterval(function () {
      if (!multi.active || !multi.pa) return;
      var cur = 0, dur = 0;
      try { cur = multi.kind === 'twitch' ? multi.pa.getCurrentTime() : multi.pa.getCurrentTime(); dur = mDur(); } catch (e) {}
      if ($('m-time')) $('m-time').textContent = dur > 0 ? mFmt(cur) + ' / ' + mFmt(dur) : 'Direct';
      if ($('m-seek')) {
        $('m-seek').disabled = !(dur > 0);                     // en direct : pas de position à régler
        if (dur > 0 && document.activeElement !== $('m-seek')) $('m-seek').value = Math.round(cur / dur * 1000);
      }
    }, 500);
  }
  function stopMulti(quiet) {
    if (!multi.active) return;
    if (multi.timer) { clearInterval(multi.timer); multi.timer = null; }
    if (multi.kind !== 'twitch') [multi.pa, multi.pb].forEach(function (p) { try { if (p && p.destroy) p.destroy(); } catch (e) {} });
    multi.pa = null; multi.pb = null; multi.active = false; multi.ready = 0; multi.muted = false; multi.kind = ''; multi.playing = false;
    var w = document.getElementById('multi-wrap'); if (w) w.remove();
  }
  window.addEventListener('resize', function () { if (multi.active) mFit(); });
  $('pf-multi').addEventListener('click', function () { closeYtPanel(); mOpen(); });
  $('src-multi').addEventListener('click', function () { mOpen(); });
  $('multi-go').addEventListener('click', mLaunchFromForm);
  $('multi-cancel').addEventListener('click', mClose);
  $('multi-modal').addEventListener('click', function (e) { if (e.target === this) mClose(); });
  var acctUser = null;
  var ACCT_ICON = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zm0 2.25c-3.2 0-9.5 1.6-9.5 4.75V21h19v-2c0-3.15-6.3-4.75-9.5-4.75z"/></svg>';
  function renderAcct() {
    renderBrand();
    var t = $('acct-text'), b = $('acct-btn'), note = $('dev-note');
    $('acct-guest').hidden = !!acctUser; $('acct-user').hidden = !acctUser;
    if (acctUser) {
      t.textContent = '';
      var nb = document.createElement('b'); nb.textContent = acctUser.name || acctUser.email; t.appendChild(nb);
      if (acctUser.email) { var em = document.createElement('span'); em.className = 'em'; em.textContent = acctUser.email; t.appendChild(document.createElement('br')); t.appendChild(em); }
      b.textContent = (acctUser.name || acctUser.email || '?').trim().charAt(0);
      b.classList.add('on'); b.title = 'Mon compte'; b.setAttribute('aria-label', 'Mon compte');
      if (note) note.textContent = tr('devnote');
    } else {
      b.innerHTML = ACCT_ICON;
      b.classList.remove('on'); b.title = 'Se connecter'; b.setAttribute('aria-label', 'Se connecter');
      $('acct-menu').hidden = true;
      if (note) note.textContent = tr('devnote');
    }
  }
  function onAcct(u) {
    acctUser = u;
    if (u) {
      var first = String(u.name || '').trim().split(/\s+/)[0].slice(0, 20);
      if (first) { $('name').value = first; try { localStorage.setItem('cad-name', first); } catch (e) {} }
      if (!$('authpage').hidden) closeAuth();
    } else loadDev();
    renderAcct();
  }
  window.addEventListener('a2g-user', function (e) { onAcct(e.detail); });
  function auErr(e) {
    var c = e && e.code, m = {
      'auth/invalid-credential': 'E-mail ou mot de passe incorrect.',
      'auth/wrong-password': 'E-mail ou mot de passe incorrect.',
      'auth/user-not-found': 'E-mail ou mot de passe incorrect.',
      'auth/invalid-email': "Cet e-mail n'est pas valide.",
      'auth/email-already-in-use': 'Cet e-mail a déjà un compte : utilise « Se connecter ».',
      'auth/weak-password': 'Mot de passe trop court (6 caractères minimum).',
      'auth/missing-password': 'Entre ton mot de passe.',
      'auth/too-many-requests': 'Trop d\'essais. Réessaie dans quelques minutes.',
      'auth/network-request-failed': 'Pas de connexion internet.',
      'auth/unauthorized-domain': "Ce site n'est pas autorisé dans Firebase (Authentication → Paramètres → Domaines autorisés).",
      'auth/operation-not-allowed': "Cette méthode de connexion n'est pas activée dans Firebase.",
      'auth/popup-closed-by-user': '',
      'auth/cancelled-popup-request': ''
    };
    return (c in m) ? m[c] : ('Erreur de connexion' + (c ? ' (' + c + ')' : '') + '.');
  }
  function auRun(fn, errId) {
    var A = window.a2gAuth, er = $(errId);
    if (!A) { er.textContent = "Le service de comptes n'a pas pu se charger. Vérifie ta connexion internet et que le site est ouvert depuis un lien https."; return; }
    er.textContent = '';
    Promise.resolve().then(function () { return fn(A); }).then(function () { closeAuth(); }, function (e) { er.textContent = auErr(e); });
  }
  function openAuth(view) {
    $('acct-menu').hidden = true;
    $('au-login').hidden = view !== 'login'; $('au-signup').hidden = view !== 'signup';
    ['li-err', 'su-err'].forEach(function (i) { $(i).textContent = ''; });
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();   // le clavier ne s'ouvre pas tout seul
    $('authpage').hidden = false; $('authpage').scrollTop = 0;
    // flèche « retour » du navigateur : revient à la page précédente (l'accueil) au lieu de quitter le site
    try {
      if (!authPushed) { window.history.pushState({ a2gAuth: 1 }, ''); authPushed = true; }
    } catch (e) {}
  }
  var authPushed = false;
  function closeAuth() {
    var was = authPushed; authPushed = false;
    $('authpage').hidden = true;
    if (was) { try { window.history.back(); } catch (e) {} }
  }
  window.addEventListener('popstate', function () {
    authPushed = false;
    if (!$('authpage').hidden) { $('authpage').hidden = true; return; }
    if (roomPushed && !$('room').hidden) {
      roomPushed = false;
      if (pseudoFs) {                 // plein écran simulé : « retour » en sort d'abord, on reste dans la salle
        pseudoFs = false; syncFs();
        try { window.history.pushState({ a2gRoom: 1 }, ''); roomPushed = true; } catch (e) {}
        return;
      }
      closeRoom('', true);
    }
  });
  function pwToggle(inp, btn) {
    var show = $(inp).type === 'password';
    $(inp).type = show ? 'text' : 'password';
    $(btn).textContent = show ? 'Masquer' : 'Afficher';
  }
  $('acct-btn').addEventListener('click', function () {
    $('acct-menu').hidden = !$('acct-menu').hidden;
  });
  $('acct-go-login').addEventListener('click', function () { openAuth('login'); });
  $('acct-go-signup').addEventListener('click', function () { openAuth('signup'); });
  $('acct-out').addEventListener('click', function () { $('acct-menu').hidden = true; if (window.a2gAuth) window.a2gAuth.out(); });
  document.addEventListener('click', function (e) { if (!$('acct-menu').hidden && !e.target.closest('.home-acct')) $('acct-menu').hidden = true; });
  // les écouteurs des pages de connexion sont isolés : une erreur ici ne doit jamais empêcher le site de démarrer
  try {
  Array.prototype.forEach.call(document.querySelectorAll('.ap-home'), function (b) { b.addEventListener('click', closeAuth); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('authpage').hidden) closeAuth(); });
  $('li-to-signup').addEventListener('click', function () { openAuth('signup'); });
  $('su-to-login').addEventListener('click', function () { openAuth('login'); });
  $('li-show').addEventListener('click', function () { pwToggle('li-pass', 'li-show'); });
  $('su-show').addEventListener('click', function () { pwToggle('su-pass', 'su-show'); });
  $('li-go').addEventListener('click', function () {
    var em = $('li-email').value.trim();
    if (!em || !$('li-pass').value) { $('li-err').textContent = 'Entre ton e-mail et ton mot de passe.'; return; }
    auRun(function (A) { return A.signIn(em, $('li-pass').value); }, 'li-err');
  });
  $('li-pass').addEventListener('keydown', function (e) { if (e.key === 'Enter') $('li-go').click(); });
  $('li-g').addEventListener('click', function () { auRun(function (A) { return A.google(); }, 'li-err'); });
  $('su-g').addEventListener('click', function () { auRun(function (A) { return A.google(); }, 'su-err'); });
  $('su-go').addEventListener('click', function () {
    var f = $('su-first').value.trim(), l = $('su-last').value.trim(), em = $('su-email').value.trim();
    if (!f) { $('su-err').textContent = 'Entre ton prénom.'; $('su-first').focus(); return; }
    if (!em) { $('su-err').textContent = 'Entre ton e-mail.'; $('su-email').focus(); return; }
    auRun(function (A) { return A.signUp(em, $('su-pass').value, (f + ' ' + l).trim()); }, 'su-err');
  });
  $('su-pass').addEventListener('keydown', function (e) { if (e.key === 'Enter') $('su-go').click(); });
  $('li-reset').addEventListener('click', function () {
    var em = $('li-email').value.trim();
    if (!em) { $('li-err').textContent = "Entre d'abord ton e-mail."; $('li-email').focus(); return; }
    var A = window.a2gAuth;
    if (!A) { $('li-err').textContent = "Le service de comptes n'a pas pu se charger."; return; }
    A.reset(em).then(function () { $('li-err').textContent = 'E-mail de réinitialisation envoyé (vérifie aussi les indésirables).'; }, function (e) { $('li-err').textContent = auErr(e); });
  });
  } catch (e) { console.error('[comptes-ui]', e); }

  /* ---------- démarrage ---------- */
  // téléphone : un filtre « vidéo » fait ouvrir la galerie (sélecteur de photos), dont les fichiers sont parfois illisibles.
  // Sans filtre, Android ouvre l'explorateur de fichiers, qui donne un vrai accès au fichier.
  try {
    if (window.matchMedia('(pointer: coarse)').matches) { $('file').removeAttribute('accept'); $('qfile').removeAttribute('accept'); }
  } catch (e) {}
  try { var saved = localStorage.getItem('cad-name'); if (saved) $('name').value = saved; } catch (e) {}
  Array.prototype.forEach.call(document.querySelectorAll('img.app-icon'), function (im) { im.src = $('app-icon').href; });
  try { loadDev(); } catch (e) { console.error(e); }
  try { renderAcct(); } catch (e) { console.error(e); }
  if (window.__a2gUser) onAcct(window.__a2gUser);
  var h = (location.hash || '').replace('#', '').toUpperCase();
  if (DISK_OK) cleanDisk();
  var hm = /^(\d{9})-([A-Z0-9]{6})$/.exec(h), sess = readSession();
  try { var notice = sessionStorage.getItem('a2g-notice'); if (notice) { sessionStorage.removeItem('a2g-notice'); $('home-error').textContent = notice; } } catch (e) {}
  if (hm) enterInviteMode(hm[1], hm[2]);
  else if (sess) restoreSession(sess);
  else { $('room-id').value = fmtId(lastJoinId()); $('code').value = lastJoinCode(); }
  Array.prototype.forEach.call(document.querySelectorAll('img.app-icon'), function (im) { im.src = $('app-icon').href; });
})();
