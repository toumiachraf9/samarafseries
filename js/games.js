function $(id) { return document.getElementById(id); }
var STATE = { g: null, me: '', host: false };
var GAME_ACT = function () {};
// envoie une action à la salle : directement à la page principale, sinon par la fonction reçue
function flash(t) {
  var body = document.getElementById('gbody'); if (!body) return;
  var p = document.getElementById('gflash');
  if (!p) { p = document.createElement('p'); p.id = 'gflash'; p.className = 'gscore'; body.insertBefore(p, body.firstChild); }
  p.textContent = t;
}
function sendAct(a) {
  if (window.parent && typeof window.parent.gameAct === 'function') { window.parent.gameAct(a); flash('Envoyé : ' + a.a); }
  else { flash("La salle n'est pas reliée. Reviens à la salle et touche Jeux."); }
}
function act(a) {
  sendAct(a);
  if (['pick', 'join', 'answer', 'move'].indexOf(a.a) < 0) return;
  PENDING = a; PENDING_TRIES = 0; clearInterval(PENDING_T);
  PENDING_T = setInterval(function () {
    if (!PENDING || pendingDone(PENDING) || ++PENDING_TRIES > 5) { clearInterval(PENDING_T); PENDING = null; return; }
    sendAct(PENDING);
  }, 1200);
}
function $(id) { return document.getElementById(id); }
  var GAME_NAMES = { ttt: 'Morpion', rps: 'Pierre-feuille-ciseaux', c4: 'Puissance 4', wordle: 'Mot mystère', quiz: 'Quiz' };
  var GAME_DESC = { ttt: 'Aligne 3 symboles', rps: 'Pierre, feuille, ciseaux à deux', c4: 'Aligne 4 jetons à deux', wordle: 'Trouve le mot de 5 lettres', quiz: 'Questions et score' };
  var GAME_TWO = { ttt: 1, rps: 1, c4: 1 };
  var RPS_CH = ['Pierre', 'Feuille', 'Ciseaux'];
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

  function gPlayerIndex(g, cid) { if (!g || !g.players) return -1; for (var i = 0; i < g.players.length; i++) if (g.players[i].cid === cid) return i; return -1; }

  function gName(g, i) { return g.players[i] ? g.players[i].name : '?'; }

  function gNorm(v) { return String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]/g, ''); }

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
      if (g.picked[STATE.me]) return "Choix envoyé, en attente de l'adversaire…";
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


  // ---------- écrans de jeu : pleine page, style illustré (fond pastel, plateau bleu nuit, mains pêche, accents jaunes) ----------
  var HS = '#f5a07f', HL = '#d9826a', HY = '#e8a722';
  var RPS_KIND = { Pierre: 'rock', Feuille: 'paper', Ciseaux: 'scissors' };
  function gEl(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
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
    if (g.result) body.appendChild(gEl('p', 'gscore', g.result.w < 0 ? 'Égalité !' : gName(g, g.result.w) + ' gagne la manche !'));
    if (mine >= 0 && g.players.length === 2 && !g.result && !g.picked[STATE.me]) {
      var ch = gEl('div', 'choices');
      RPS_CH.forEach(function (c) {
        var b = gEl('button', 'choice', c); b.type = 'button';
        b.insertAdjacentHTML('afterbegin', handSVG(RPS_KIND[c]));
        b.addEventListener('click', function () { act({ a: 'pick', c: c }); });
        ch.appendChild(b);
      });
      body.appendChild(ch);
    }
    if (g.result && mine >= 0) body.appendChild(gBtn('Manche suivante', function () { act({ a: 'next' }); }));
    body.appendChild(gEl('p', 'gscore', 'Score : ' + gName(g, 0) + ' ' + g.score[0] + ' · ' + (g.players[1] ? g.players[1].name : '—') + ' ' + g.score[1] + ' · égalités ' + g.score[2]));
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
  function drawC4(body, g, mine) {
    var blob = gEl('div', 'blob c4blob'), cols = gEl('div', 'c4cols2'), grid = gEl('div', 'c4board2');
    var myTurn = g.status === 'play' && mine === g.turn;
    for (var c = 0; c < 7; c++) (function (col) {
      var b = gEl('button', 'dropbtn', '▼'); b.type = 'button';
      b.disabled = !(myTurn && !g.board[0][col]);
      b.addEventListener('click', function () { act({ a: 'move', col: col }); });
      cols.appendChild(b);
    })(c);
    g.board.forEach(function (row, r) { row.forEach(function (v, c2) {
      var isWin = g.line && g.line.some(function (q) { return q[0] === r && q[1] === c2; });
      var isNew = g.last && g.last[0] === r && g.last[1] === c2;
      var d = gEl('div', 'hole' + (v ? ' disc ' + (v === 1 ? 'a' : 'b') : '') + (isNew ? ' drop' : '') + (isWin ? ' hit' : ''));
      grid.appendChild(d);
    }); });
    blob.appendChild(cols); blob.appendChild(grid); body.appendChild(blob);
  }
  function drawWordle(body, g) {
    var blob = gEl('div', 'blob wblob'), grid = gEl('div', 'wgrid2');
    for (var r = 0; r < 6; r++) {
      var rw = g.rows[r];
      for (var j = 0; j < 5; j++) {
        var t = gEl('div', 'tile' + (rw ? ' ' + rw.r[j] : '') + (rw && r === g.rows.length - 1 ? ' flip' : ''), rw ? rw.w[j].toUpperCase() : '');
        t.style.animationDelay = (j * 120) + 'ms';
        grid.appendChild(t);
      }
    }
    blob.appendChild(grid); body.appendChild(blob);
    if (g.status === 'play') {
      var f = gEl('div', 'wrow');
      var inp = gEl('input', 'wig'); inp.type = 'text'; inp.maxLength = 5; inp.autocomplete = 'off'; inp.placeholder = 'mot de 5 lettres';
      var go = gBtn('Valider', function () { var v = gNorm(inp.value); inp.value = ''; if (v.length === 5) act({ a: 'guess', w: v }); });
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); go.click(); } });
      f.appendChild(inp); f.appendChild(go); body.appendChild(f);
    }
  }
  function drawQuiz(body, g, mine) {
    if (g.status === 'over') { body.appendChild(gEl('p', 'gscore', 'Scores : ' + (gScoreText(g) || '—'))); return; }
    var Q = QUIZ[g.qi], mineA = g.answers[STATE.me];
    var card = gEl('div', 'qcard');
    card.appendChild(gEl('div', 'qprog', 'Question ' + (g.qi + 1) + ' / ' + QUIZ.length));
    card.appendChild(gEl('p', 'qq', Q.q));
    var opts = gEl('div', 'qopts');
    Q.c.forEach(function (txt, k) {
      var b = gEl('button', 'qopt q' + k, String.fromCharCode(65 + k) + '  ' + txt); b.type = 'button';
      b.disabled = g.revealed || mineA !== undefined;
      if (g.revealed && k === g.correct) b.classList.add('right');
      if (g.revealed && mineA === k && k !== g.correct) b.classList.add('wrong');
      b.addEventListener('click', function () { act({ a: 'answer', k: k }); });
      opts.appendChild(b);
    });
    card.appendChild(opts); body.appendChild(card);
    var qrow = gEl('div', 'grow');
    if (!g.revealed) qrow.appendChild(gBtn('Révéler', function () { act({ a: 'reveal' }); }));
    else qrow.appendChild(gBtn(g.qi + 1 < QUIZ.length ? 'Question suivante' : 'Voir le résultat', function () { act({ a: 'nextq' }); }));
    body.appendChild(qrow);
    body.appendChild(gEl('p', 'gscore', 'Scores : ' + (gScoreText(g) || '—')));
  }
  function renderGame() {
    var body = $('gbody'), title = $('gtitle'); if (!body) return;
    body.textContent = '';
      if (!STATE.g) {
      title.textContent = 'Jeux';
      body.appendChild(gEl('p', 'gmsg', 'Choisis un jeu à jouer ensemble. Une seule partie à la fois.'));
      var menu = gEl('div', 'menu');
      Object.keys(GAME_NAMES).forEach(function (k, i) {
        var mb = gEl('button', 'mcard'); mb.type = 'button';
        mb.appendChild(gEl('span', 'mname', GAME_NAMES[k])); mb.appendChild(gEl('span', 'mdesc', GAME_DESC[k]));
        mb.addEventListener('click', function () { act({ a: 'open', type: k }); });
        menu.appendChild(mb);
      });
      body.appendChild(menu); return;
    }
    var g = STATE.g, mine = gPlayerIndex(g, STATE.me);
    title.textContent = GAME_NAMES[g.type];
    body.appendChild(gEl('p', 'gmsg', gStatus(g, mine)));
    if (g.type === 'ttt') drawTtt(body, g, mine);
    if (g.type === 'c4') drawC4(body, g, mine);
    if (g.type === 'rps') drawRps(body, g, mine);
    if (g.type === 'wordle') drawWordle(body, g);
    if (g.type === 'quiz') drawQuiz(body, g, mine);
    if (g.msg) body.appendChild(gEl('p', 'gmsg', g.msg));
    var row = gEl('div', 'grow');
    if (GAME_TWO[g.type] && g.status === 'lobby' && mine < 0) row.appendChild(gBtn('Rejoindre la partie', function () { act({ a: 'join' }); }));
    if (mine >= 0 || STATE.host || g.status === 'over') row.appendChild(gBtn(g.status === 'over' ? 'Retour aux jeux' : 'Arrêter la partie', function () { act({ a: 'close' }); }));
    body.appendChild(row);
  }

// appelé par la salle : affiche la partie en cours et envoie les actions à la salle
var SHOWN = false;
window.GameUI = {
  show: function (game, me, host, actFn) {
    SHOWN = true;
    STATE.g = game || null; STATE.me = me; STATE.host = !!host; GAME_ACT = actFn;
    renderGame();
  }
};
// fermer : la salle ferme la fenêtre ; la partie terminée est retirée pour que la liste des jeux revienne
$('g-close').addEventListener('click', function () {
  if (window.parent && window.parent.closeGamesFromFrame) window.parent.closeGamesFromFrame();
});
// message clair si la page n'est pas reliée à la salle (ouverte depuis un fichier sur l'ordinateur, par exemple)
function gNoLink() {
  if (SHOWN) return;
  var body = $('gbody'); if (!body) return;
  body.textContent = '';
  body.appendChild(gEl('p', 'gmsg', location.protocol === 'file:'
    ? 'Les jeux ne marchent pas depuis un fichier sur ton ordinateur. Ouvre le site en ligne (https) et touche Jeux.'
    : 'Connexion à la salle en cours… Touche Jeux depuis la salle si rien n\'apparaît.'));
}
setTimeout(gNoLink, 1500);
