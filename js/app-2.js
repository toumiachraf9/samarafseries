
/* Partage live de la vidéo de l'hôte : captureStream + RTCPeerConnection, une connexion par spectateur.
 * La qualité de chaque spectateur est fournie par l'application : getQuality(peerId) -> { h, bps }.
 * La signalisation passe par send(peerId, message), fournie par l'application (messages PeerJS existants). */
(function (global) {
  "use strict";

  var CONFIG = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }], // ajouter un serveur TURN ici si besoin
    audio: { maxBitrate: 256000, contentHint: "music" },
    opusStereoBitrate: 510000 // plafond du SDP ; le débit réel est réglé par spectateur
  };

  // Son stéréo Opus à débit élevé (sans ça, Chrome reste souvent en mono à bas débit)
  function mungeOpus(sdp) {
    var m = sdp.match(/a=rtpmap:(\d+) opus\/48000\/2/);
    if (!m) return sdp;
    var pt = m[1];
    var fmtp = "a=fmtp:" + pt + " minptime=10;useinbandfec=1;stereo=1;sprop-stereo=1;usedtx=0;maxaveragebitrate=" +
      CONFIG.opusStereoBitrate;
    var existing = new RegExp("a=fmtp:" + pt + " [^\\r\\n]*");
    if (existing.test(sdp)) return sdp.replace(existing, fmtp);
    return sdp.replace(new RegExp("(a=rtpmap:" + pt + " opus/48000/2\\r\\n)"), "$1" + fmtp + "\r\n");
  }

  // Qualité d'une connexion : débit maximum et réduction de résolution vers q.h (0 = origine)
  function applyQuality(pc, q) {
    var jobs = pc.getSenders().map(function (s) {
      if (!s.track) return Promise.resolve();
      var p = s.getParameters();
      if (!p.encodings || !p.encodings.length) p.encodings = [{}];
      var enc = p.encodings[0];
      if (s.track.kind === "video") {
        var srcH = (s.track.getSettings && s.track.getSettings().height) || 0;
        enc.maxBitrate = q.bps;
        enc.scaleResolutionDownBy = (q.h && srcH > q.h) ? srcH / q.h : 1;
        p.degradationPreference = "maintain-framerate";   // garde les i/s : en cas de réseau faible, c'est la résolution qui baisse
        s.track.contentHint = "motion";
      } else {
        enc.maxBitrate = q.abps || CONFIG.audio.maxBitrate;
        s.track.contentHint = CONFIG.audio.contentHint;
      }
      return s.setParameters(p).catch(function () {});
    });
    return Promise.all(jobs);
  }

  function IceQueue(pc) { this.pc = pc; this.ready = false; this.pending = []; }
  IceQueue.prototype.add = function (c) {
    if (!c) return;
    if (!this.ready) { this.pending.push(c); return; }
    this.pc.addIceCandidate(c).catch(function () {});
  };
  IceQueue.prototype.setReady = function () {
    this.ready = true;
    var self = this;
    this.pending.splice(0).forEach(function (c) { self.pc.addIceCandidate(c).catch(function () {}); });
  };

  /* ---------- HÔTE ---------- */
  function Broadcaster(stream, send, getQuality) {
    this.stream = stream;
    this.send = send;
    this.getQuality = getQuality;
    this.conns = {};
  }

  Broadcaster.prototype.addViewer = function (peerId) {
    var self = this;
    this.removeViewer(peerId);
    var pc = new RTCPeerConnection({ iceServers: CONFIG.iceServers });
    var entry = { pc: pc, ice: new IceQueue(pc), offerSent: false, outIce: [] };
    this.conns[peerId] = entry;
    this.stream.getTracks().forEach(function (t) { pc.addTrack(t, self.stream); });
    // les candidats ne partent qu'après l'offre : l'ami ne doit jamais recevoir un candidat avant la description
    pc.onicecandidate = function (e) {
      if (!e.candidate) return;
      var m = { k: "ice", c: e.candidate.toJSON() };
      if (entry.offerSent) self.send(peerId, m); else entry.outIce.push(m);
    };
    return pc.createOffer().then(function (offer) {
      offer.sdp = mungeOpus(offer.sdp);
      return pc.setLocalDescription(offer);
    }).then(function () {
      return applyQuality(pc, self.getQuality(peerId));
    }).then(function () {
      self.send(peerId, { k: "offer", sdp: pc.localDescription.sdp });
      entry.offerSent = true;
      entry.outIce.splice(0).forEach(function (m) { self.send(peerId, m); });
    });
  };

  Broadcaster.prototype.setQuality = function (peerId) {
    var e = this.conns[peerId];
    if (e) return applyQuality(e.pc, this.getQuality(peerId));
    return Promise.resolve();
  };

  Broadcaster.prototype.onMessage = function (peerId, m) {
    var e = this.conns[peerId];
    if (!e) return Promise.resolve();
    if (m.k === "answer") {
      return e.pc.setRemoteDescription({ type: "answer", sdp: m.sdp }).then(function () { e.ice.setReady(); });
    }
    if (m.k === "ice") e.ice.add(m.c);
    return Promise.resolve();
  };

  Broadcaster.prototype.removeViewer = function (peerId) {
    var e = this.conns[peerId];
    if (e) { e.pc.close(); delete this.conns[peerId]; }
  };

  Broadcaster.prototype.stop = function () {
    var self = this;
    Object.keys(this.conns).forEach(function (id) { self.removeViewer(id); });
  };

  /* ---------- SPECTATEUR ---------- */
  function Viewer(videoEl, send) {
    this.videoEl = videoEl;
    this.send = send;
    this.pc = null;
    this.ice = null;
    this.onStream = null;
  }

  Viewer.prototype.onMessage = function (peerId, m) {
    var self = this;
    if (m.k === "offer") {
      if (this.pc) this.pc.close();
      var pc = new RTCPeerConnection({ iceServers: CONFIG.iceServers });
      this.pc = pc;
      this.ice = new IceQueue(pc);
      (this.early || []).splice(0).forEach(function (c) { self.ice.add(c); });
      pc.ontrack = function (e) {
        var stream = e.streams[0] || new MediaStream([e.track]);
        if (self.videoEl.srcObject !== stream) self.videoEl.srcObject = stream;
        if (self.onStream) self.onStream(stream);
      };
      pc.onicecandidate = function (e) {
        if (e.candidate) self.send(peerId, { k: "ice", c: e.candidate.toJSON() });
      };
      return pc.setRemoteDescription({ type: "offer", sdp: m.sdp }).then(function () {
        self.ice.setReady();
        return pc.createAnswer();
      }).then(function (answer) {
        answer.sdp = mungeOpus(answer.sdp);
        return pc.setLocalDescription(answer);
      }).then(function () {
        self.send(peerId, { k: "answer", sdp: pc.localDescription.sdp });
      });
    }
    if (m.k === "ice") {
      if (this.ice) this.ice.add(m.c);
      else (this.early = this.early || []).push(m.c); // candidat arrivé avant l'offre : gardé
    }
    return Promise.resolve();
  };

  global.RTCCore = { CONFIG: CONFIG, Broadcaster: Broadcaster, Viewer: Viewer };
})(typeof window !== "undefined" ? window : globalThis);

