// Écran des jeux : affiche la partie et envoie les actions à la salle (les règles sont validées par l'hôte).
function $(id) { return document.getElementById(id); }
var STATE = { g: null, me: '', host: false, ui: 'fr' };
var GAME_ACT = function () {};
var PICK = null;                                   // jeu dont on choisit la langue
var GAME_TWO = { ttt: 1, rps: 1 };
var RPS_CH = ['Pierre', 'Feuille', 'Ciseaux'];
var RPS_KIND = { Pierre: 'rock', Feuille: 'paper', Ciseaux: 'scissors' };
var LANG_LABEL = { fr: 'Français', en: 'English', ar: 'العربية' };
var HS = '#f5a07f', HL = '#d9826a', HY = '#e8a722';
var NEEDS_LANG = { quiz: 1, series: 1 };
var GAME_KEYS = ['ttt', 'rps', 'series', 'color', 'quiz'];

function gEl(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
function T(key, vars) { return GT(STATE.ui, key, vars); }
function gName(g, i) { return g.players[i] ? g.players[i].name : '?'; }
function gPlayerIndex(g, cid) { if (!g || !g.players) return -1; for (var i = 0; i < g.players.length; i++) if (g.players[i].cid === cid) return i; return -1; }
function gBtn(text, fn, dis) {
  var b = document.createElement('button'); b.type = 'button'; b.className = 'btn small'; b.textContent = text;
  if (dis) b.disabled = true; else b.addEventListener('click', fn);
  return b;
}
function handSVG(kind) {
  if (kind === 'rock') return '<svg viewBox="0 0 160 160" class="hsvg"><rect x="20" y="80" width="46" height="36" rx="18" fill="' + HS + '"/><rect x="40" y="56" width="94" height="90" rx="36" fill="' + HS + '"/><path d="M58 98h58M58 118h58M58 138h58" stroke="' + HL + '" stroke-width="3" stroke-linecap="round"/></svg>';
  if (kind === 'paper') return '<svg viewBox="0 0 160 160" class="hsvg">' +
    '<rect x="40" y="16" width="20" height="84" rx="10" fill="' + HS + '" transform="rotate(-14 50 100)"/>' +
    '<rect x="64" y="8" width="20" height="92" rx="10" fill="' + HS + '"/>' +
    '<rect x="88" y="14" width="20" height="88" rx="10" fill="' + HS + '" transform="rotate(12 98 100)"/>' +
    '<rect x="110" y="30" width="18" height="72" rx="9" fill="' + HS + '" transform="rotate(26 119 100)"/>' +
    '<rect x="36" y="84" width="96" height="66" rx="32" fill="' + HS + '"/>' +
    '<rect x="14" y="98" width="38" height="22" rx="11" fill="' + HS + '" transform="rotate(-32 33 109)"/>' +
    '<path d="M70 100v28M96 100v28" stroke="' + HL + '" stroke-width="3" stroke-linecap="round"/></svg>';
  return '<svg viewBox="0 0 160 160" class="hsvg">' +
    '<rect x="54" y="14" width="22" height="94" rx="11" fill="' + HS + '" transform="rotate(-16 65 100)"/>' +
    '<rect x="84" y="14" width="22" height="94" rx="11" fill="' + HS + '" transform="rotate(16 95 100)"/>' +
    '<rect x="44" y="90" width="78" height="60" rx="30" fill="' + HS + '"/>' +
    '<rect x="18" y="104" width="38" height="20" rx="10" fill="' + HS + '" transform="rotate(-30 37 114)"/>' +
    '<path d="M76 102v40" stroke="' + HL + '" stroke-width="3" stroke-linecap="round"/></svg>';
}

// ---------- messages et actions ----------
function flash(t) {
  var body = $('gbody'); if (!body) return;
  var p = $('gflash');
  if (!p) { p = gEl('p', 'gscore'); p.id = 'gflash'; body.insertBefore(p, body.firstChild); }
  p.textContent = t;
}
function sendAct(a) {
  if (window.parent && typeof window.parent.gameAct === 'function') { window.parent.gameAct(a); flash(T('sent', { a: a.a })); }
  else flash(T('not_linked'));
}
// une action (choix, réponse, arrivée, coup) est renvoyée tant que la salle ne l'a pas confirmée
var PENDING = null, PENDING_TRIES = 0, PENDING_T = null;
function pendingDone(a) {
  var g = STATE.g; if (!g) return true;
  if (a.a === 'pick') return !!(g.picked && g.picked[STATE.me]) || !!g.result;
  if (a.a === 'join') return g.status !== 'lobby' || (g.players || []).some(function (p) { return p.cid === STATE.me; });
  if (a.a === 'answer') return a.qi !== g.qi || !!(g.answers && g.answers[STATE.me] !== undefined) || !!g.revealed;
  if (a.a === 'move' && g.type === 'ttt') return !!g.board[a.i];
  if (a.a === 'paint') return !!(g.regions && g.regions[a.r] !== null);
  return true;
}
function act(a) {
  sendAct(a);
  if (['pick', 'join', 'answer', 'move', 'paint'].indexOf(a.a) < 0) return;
  PENDING = a; PENDING_TRIES = 0; clearInterval(PENDING_T);
  PENDING_T = setInterval(function () {
    if (!PENDING || pendingDone(PENDING) || ++PENDING_TRIES > 5) { clearInterval(PENDING_T); PENDING = null; return; }
    sendAct(PENDING);
  }, 1200);
}

// ---------- textes d'état ----------
function gStatus(g, mine) {
  if (g.status === 'lobby') return T('lobby');
  if (g.type === 'ttt') {
    if (g.status === 'over') return g.winner < 0 ? T('draw') : T('win_named', { n: gName(g, g.winner) });
    return T('turn', { n: gName(g, g.turn) }) + (g.turn === mine ? ' ' + T('you') : '');
  }
  if (g.type === 'rps') {
    if (g.result) return g.result.w < 0 ? T('rps_draw') : T('rps_win', { n: gName(g, g.result.w) });
    if (mine < 0) return T('rps_secret');
    if (g.picked[STATE.me]) return T('rps_sent');
    return T('rps_pick');
  }
  if (g.type === 'wordle') {
    if (g.status === 'over') return g.won ? T('wordle_win') : T('wordle_lose', { w: g.word });
    return T('wordle_status', { i: g.rows.length + 1 });
  }
  if (g.type === 'color') { var who = g.players[g.turn % g.players.length]; return g.status === 'over' ? T('color_done') : T('turn', { n: who ? who.name : '?' }) + (g.turn % g.players.length === mine ? ' ' + T('you') : ''); }
  if (g.type === 'quiz' && g.status === 'batchdone') return T('quiz_batch_done');
  if (g.type === 'quiz') return g.status === 'over' ? T('quiz_done') : T('quiz_q', { i: g.qi + 1, n: g.qs.length });
  return '';
}
function gScoreText(g) {
  return Object.keys(g.pn || {}).map(function (k) { return g.pn[k] + ' : ' + (g.scores[k] || 0); }).join(' · ');
}
function rpsLabel(c) { return T('rps_' + c.toLowerCase()); }

// ---------- dessin des jeux ----------
function drawRps(body, g, mine) {
  var blob = gEl('div', 'blob rpsblob');
  [['14%', '6%', -38, 74], ['10%', '78%', 14, 60], ['78%', '74%', 58, 46]].forEach(function (sp) {
    var e = gEl('i', 'spike'); e.style.top = sp[0]; e.style.left = sp[1]; e.style.width = sp[3] + 'px'; e.style.transform = 'rotate(' + sp[2] + 'deg)'; blob.appendChild(e);
  });
  var waiting = !g.result && Object.keys(g.picked || {}).length > 0;
  var bk = 'rock', tk = 'rock';
  if (g.result) { bk = RPS_KIND[g.result.c[0]]; tk = RPS_KIND[g.result.c[1]]; }
  var topEl = gEl('div', 'hand top'), botEl = gEl('div', 'hand bottom');
  topEl.innerHTML = handSVG(tk); botEl.innerHTML = handSVG(bk);
  if (waiting) { topEl.classList.add('shake'); botEl.classList.add('shake'); }
  if (g.result) { topEl.classList.add('pop'); botEl.classList.add('pop'); }
  blob.appendChild(topEl); blob.appendChild(botEl);
  body.appendChild(blob);
  if (mine >= 0 && g.players.length === 2 && !g.result && !g.picked[STATE.me]) {
    var ch = gEl('div', 'choices');
    RPS_CH.forEach(function (c) {
      var b = gEl('button', 'choice', rpsLabel(c)); b.type = 'button';
      b.insertAdjacentHTML('afterbegin', handSVG(RPS_KIND[c]));
      b.addEventListener('click', function () { act({ a: 'pick', c: c }); });
      ch.appendChild(b);
    });
    body.appendChild(ch);
  }
  if (g.result && mine >= 0) body.appendChild(gBtn(T('next_round'), function () { act({ a: 'next' }); }));
  body.appendChild(gEl('p', 'gscore', T('score_line') + ' ' + gName(g, 0) + ' ' + g.score[0] + ' · ' + (g.players[1] ? g.players[1].name : '—') + ' ' + g.score[1] + ' · ' + T('draws') + ' ' + g.score[2]));
}
function drawTtt(body, g, mine) {
  var blob = gEl('div', 'blob tttblob'), grid = gEl('div', 'cgrid');
  g.board.forEach(function (v, i) {
    var can = g.status === 'play' && mine === g.turn && !v;
    var cell = gEl('button', 'cell' + (g.line && g.line.indexOf(i) >= 0 ? ' hit' : '')); cell.type = 'button';
    cell.disabled = !can;
    if (v === 'X') cell.innerHTML = '<svg viewBox="0 0 60 60" class="mark"><path class="draw" d="M14 14L46 46M46 14L14 46" stroke="' + HS + '" stroke-width="7" stroke-linecap="round" fill="none"/></svg>';
    if (v === 'O') cell.innerHTML = '<svg viewBox="0 0 60 60" class="mark"><circle class="draw" cx="30" cy="30" r="19" fill="none" stroke="' + HY + '" stroke-width="7"/></svg>';
    cell.addEventListener('click', function () { act({ a: 'move', i: i }); });
    grid.appendChild(cell);
  });
  blob.appendChild(grid); body.appendChild(blob);
}
function drawWordle(body, g) {
  var blob = gEl('div', 'blob wblob'), grid = gEl('div', 'wgrid2');
  for (var r = 0; r < 6; r++) {
    var rw = g.rows[r];
    for (var j = 0; j < 5; j++) {
      var letter = rw ? rw.d[j] : '';
      var t = gEl('div', 'tile' + (rw ? ' ' + rw.r[j] : '') + (rw && r === g.rows.length - 1 ? ' flip' : ''), letter.toUpperCase());
      t.style.animationDelay = (j * 120) + 'ms';
      grid.appendChild(t);
    }
  }
  blob.appendChild(grid); body.appendChild(blob);
  if (g.status === 'play') {
    var f = gEl('div', 'wrow');
    var inp = gEl('input', 'wig'); inp.type = 'text'; inp.maxLength = 12; inp.autocomplete = 'off'; inp.placeholder = T('word_ph');
    var go = gBtn(T('validate'), function () { var v = inp.value; inp.value = ''; act({ a: 'guess', w: v }); });
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); go.click(); } });
    f.appendChild(inp); f.appendChild(go); body.appendChild(f);
  }
}
// noms des joueurs ayant choisi cette réponse (-1 = je ne sais pas)
function quizWho(g, k) {
  return Object.keys(g.answers || {}).filter(function (c) { return g.answers[c] === k; })
    .map(function (c) { return (g.pn && g.pn[c]) || '?'; }).join(', ');
}
function drawQuiz(body, g, mine) {
  if (g.status === 'over') { body.appendChild(gEl('p', 'gscore', T('scores') + (gScoreText(g) || T('none')))); return; }
  if (g.status === 'batchdone') {
    body.appendChild(gEl('p', 'gmsg', T('quiz_batch_done')));
    var br = gEl('div', 'grow');
    br.appendChild(gBtn(T('more10'), function () { act({ a: 'more' }); }));
    br.appendChild(gBtn(T('end_quiz'), function () { act({ a: 'end' }); }));
    body.appendChild(br);
    body.appendChild(gEl('p', 'gscore', T('scores') + (gScoreText(g) || T('none'))));
    return;
  }
  var Q = g.qs[g.qi], mineA = g.answers[STATE.me];
  var card = gEl('div', 'qcard');
  card.appendChild(gEl('div', 'qprog', T('quiz_q', { i: g.qi + 1, n: g.qs.length })));
  card.appendChild(gEl('p', 'qq', Q.q));
  var opts = gEl('div', 'qopts');
  Q.c.forEach(function (txt, k) {
    var b = gEl('button', 'qopt q' + k, (k + 1) + '  ' + txt); b.type = 'button';
    b.disabled = g.revealed || mineA !== undefined;
    if (g.revealed && k === g.correct) b.classList.add('right');
    if (g.revealed && mineA === k && k !== g.correct) b.classList.add('wrong');
    b.addEventListener('click', function () { act({ a: 'answer', k: k, qi: g.qi }); });
    var wrap = gEl('div', 'qwrap'); wrap.appendChild(b);
    var who = quizWho(g, k); if (who) wrap.appendChild(gEl('span', 'qwho', '👥 ' + who));
    opts.appendChild(wrap);
  });
  var dk = gEl('button', 'qopt qdk', T('dont_know')); dk.type = 'button';
  dk.disabled = g.revealed || mineA !== undefined;
  if (g.revealed && mineA === -1) dk.classList.add('wrong');
  dk.addEventListener('click', function () { act({ a: 'answer', k: -1, qi: g.qi }); });
  var dwrap = gEl('div', 'qwrap'); dwrap.appendChild(dk);
  var dwho = quizWho(g, -1); if (dwho) dwrap.appendChild(gEl('span', 'qwho', '👥 ' + dwho));
  opts.appendChild(dwrap);
  card.appendChild(opts); body.appendChild(card);
  var qrow = gEl('div', 'grow');
  if (!g.revealed) qrow.appendChild(gBtn(T('reveal'), function () { act({ a: 'reveal' }); }));
  else qrow.appendChild(gBtn(g.qi + 1 < g.qs.length ? T('next_q') : T('see_result'), function () { act({ a: 'nextq' }); }));
  body.appendChild(qrow);
  body.appendChild(gEl('p', 'gscore', T('scores') + (gScoreText(g) || T('none'))));
}

// ---------- coloriage : un tour par joueur, une couleur et une zone à chaque tour ----------
var PAINT_C = null;
function drawColor(body, g, mine) {
  var sub = COLOR_SUBJECTS.filter(function (x) { return x.id === g.subject; })[0];
  if (!sub) return;
  var myTurn = g.status === 'play' && mine >= 0 && (g.turn % g.players.length) === mine;
  var wrap = gEl('div', 'blob colorblob');
  wrap.innerHTML = '<svg viewBox="0 0 300 300" class="csvg">' + colorMarkup(sub, g.regions) + '</svg>';
  wrap.querySelectorAll('[data-r]').forEach(function (el) {
    var i = +el.getAttribute('data-r');
    if (myTurn && g.regions[i] === null) {
      el.style.cursor = 'pointer';
      el.addEventListener('click', function () {
        if (!PAINT_C) { flash(T('pick_color')); return; }
        act({ a: 'paint', r: i, c: PAINT_C }); PAINT_C = null;
      });
    }
  });
  body.appendChild(wrap);
  if (g.status === 'play' && myTurn) {
    body.appendChild(gEl('p', 'gscore', T('pick_color')));
    var pal = gEl('div', 'palette');
    COLOR_PALETTE.forEach(function (c) {
      var b = gEl('button', 'swatch' + (PAINT_C === c ? ' on' : '')); b.type = 'button'; b.style.background = c;
      b.addEventListener('click', function () { PAINT_C = c; renderGame(); });
      pal.appendChild(b);
    });
    body.appendChild(pal);
  }
  if (g.status === 'over') body.appendChild(gBtn(T('save_img'), function () { saveColorImage(g, sub); }));
}
// sauvegarde l'image terminée au format PNG
function saveColorImage(g, sub) {
  var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300"><rect width="300" height="300" fill="#ffffff"/>' +
    colorMarkup(sub, g.regions).replace(/ data-r="\d+"/g, '') + '</svg>';
  var img = new Image();
  img.onload = function () {
    var cv = document.createElement('canvas'); cv.width = 900; cv.height = 900;
    cv.getContext('2d').drawImage(img, 0, 0, 900, 900);
    cv.toBlob(function (blob) {
      if (!blob) { flash('Sauvegarde impossible sur cet appareil.'); return; }
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'coloriage.png';
      document.body.appendChild(a); a.click(); a.remove();
    }, 'image/png');
  };
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

// ---------- choix de la langue (quiz et Lost / The 100) ----------
function drawPicker(body) {
  body.appendChild(gEl('p', 'gmsg', T('pick_lang')));
  var row = gEl('div', 'menu');
  GAME_LANGS_LIST().forEach(function (lg) {
    var b = gEl('button', 'mcard'); b.type = 'button';
    b.appendChild(gEl('span', 'mname', LANG_LABEL[lg]));
    b.addEventListener('click', function () { act({ a: 'open', type: PICK, lang: lg }); PICK = null; renderGame(); });
    row.appendChild(b);
  });
  body.appendChild(row);
  body.appendChild(gBtn(T('lang_back'), function () { PICK = null; renderGame(); }));
}
function GAME_LANGS_LIST() { return ['fr', 'en', 'ar']; }

// ---------- écran ----------
function renderGame() {
  var body = $('gbody'), title = $('gtitle'), box = $('gbox'); if (!body) return;
  if (box) box.dir = STATE.ui === 'ar' ? 'rtl' : 'ltr';
  if (title) title.textContent = T('games_title');
  var closeBtn = $('g-close'); if (closeBtn) closeBtn.textContent = T('close');
  body.textContent = '';
  if (!STATE.g) {
    title.textContent = T('games_title');
    if (PICK) { drawPicker(body); return; }
    body.appendChild(gEl('p', 'gmsg', T('menu_intro')));
    var menu = gEl('div', 'menu');
    GAME_KEYS.forEach(function (k) {
      var mb = gEl('button', 'mcard'); mb.type = 'button';
      mb.appendChild(gEl('span', 'mname', T('name_' + k)));
      mb.appendChild(gEl('span', 'mdesc', T('desc_' + k)));
      mb.addEventListener('click', function () {
        if (NEEDS_LANG[k]) { PICK = k; renderGame(); }
        else act({ a: 'open', type: k });
      });
      menu.appendChild(mb);
    });
    body.appendChild(menu); return;
  }
  var g = STATE.g, mine = gPlayerIndex(g, STATE.me);
  title.textContent = T('name_' + g.type);
  body.appendChild(gEl('p', 'gmsg', gStatus(g, mine)));
  if (g.type === 'ttt') drawTtt(body, g, mine);
  if (g.type === 'rps') drawRps(body, g, mine);
  if (g.type === 'wordle') drawWordle(body, g);
  if (g.type === 'quiz') drawQuiz(body, g, mine);
  if (g.type === 'color') drawColor(body, g, mine);
  if (g.msg) body.appendChild(gEl('p', 'gmsg', g.msg));
  var row = gEl('div', 'grow');
  if (((GAME_TWO[g.type] && g.status === 'lobby') || (g.type === 'color' && g.status === 'play')) && mine < 0) row.appendChild(gBtn(g.type === 'color' ? T('color_join') : T('join'), function () { act({ a: 'join' }); }));
  if (mine >= 0 || STATE.host || g.status === 'over') row.appendChild(gBtn(g.status === 'over' ? T('back') : T('stop'), function () { act({ a: 'close' }); }));
  body.appendChild(row);
}

// appelé par la salle : affiche la partie en cours et envoie les actions à la salle
window.GameUI = {
  show: function (game, me, host, actFn, ui) {
    STATE.g = game || null; STATE.me = me; STATE.host = !!host; GAME_ACT = actFn;
    if (ui && GAME_LANGS_LIST().indexOf(ui) >= 0) STATE.ui = ui;
    renderGame();
  }
};
$('g-close').addEventListener('click', function () {
  if (window.parent && window.parent.closeGamesFromFrame) window.parent.closeGamesFromFrame();
});
