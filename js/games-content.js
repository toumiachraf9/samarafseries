// Contenu des jeux dans les 3 langues : textes, questions du quiz (mélangées à chaque partie), mots du jeu.
var GAME_LANGS = ['fr', 'en', 'ar'];

var GAME_T = {
  fr: {
    games_title: 'Jeux', close: 'Fermer', back: 'Retour aux jeux', join: 'Rejoindre la partie', stop: 'Arrêter la partie',
    menu_intro: 'Choisis un jeu à jouer ensemble. Une seule partie à la fois.',
    name_ttt: 'Morpion', desc_ttt: 'Aligne 3 symboles',
    name_rps: 'Pierre-feuille-ciseaux', desc_rps: 'Pierre, feuille, ciseaux à deux',
    name_c4: 'Puissance 4', desc_c4: 'Aligne 4 jetons à deux',
    name_wordle: 'Mot mystère', desc_wordle: 'Trouve le mot de Lost ou The 100',
    name_quiz: 'Quiz', desc_quiz: 'Questions et score',
    pick_lang: 'Choisis la langue de la partie', lang_back: 'Retour aux jeux',
    lobby: "En attente d'un second joueur…", turn: 'Au tour de {n}', you: '(toi)',
    win_named: '{n} a gagné !', draw: 'Match nul !',
    rps_win: '{n} gagne la manche !', rps_draw: 'Égalité !', rps_secret: 'Les deux joueurs choisissent en secret.',
    rps_sent: "Choix envoyé, en attente de l'adversaire…", rps_pick: 'Fais ton choix.', next_round: 'Manche suivante',
    rps_pierre: 'Pierre', rps_feuille: 'Feuille', rps_ciseaux: 'Ciseaux',
    wordle_status: 'Essai {i} / 6 : propose un mot de 5 lettres.', wordle_win: 'Bravo, trouvé !', wordle_lose: 'Perdu. Le mot était : {w}',
    wordle_len: 'Le mot doit faire 5 lettres.', word_ph: 'mot de 5 lettres', validate: 'Valider',
    quiz_q: 'Question {i} / {n}', quiz_done: 'Quiz terminé !', reveal: 'Révéler', next_q: 'Question suivante', see_result: 'Voir le résultat',
    scores: 'Scores : ', none: '—', score_line: 'Score :', draws: 'égalités',
    invite: "{n} t'invite à jouer : {g}", accept: 'Accepter', refuse: 'Refuser',
    started: 'Une partie vient de commencer', no_conn: "Pas de connexion à l'hôte : reviens à la salle",
    sent: 'Envoyé : {a}', not_linked: "La salle n'est pas reliée. Reviens à la salle et touche Jeux."
  },
  en: {
    games_title: 'Games', close: 'Close', back: 'Back to games', join: 'Join the game', stop: 'Stop the game',
    menu_intro: 'Choose a game to play together. One game at a time.',
    name_ttt: 'Tic-tac-toe', desc_ttt: 'Get 3 in a row',
    name_rps: 'Rock-paper-scissors', desc_rps: 'Rock, paper, scissors for two',
    name_c4: 'Connect Four', desc_c4: 'Get 4 discs in a row',
    name_wordle: 'Mystery word', desc_wordle: 'Find the word from Lost or The 100',
    name_quiz: 'Quiz', desc_quiz: 'Questions and score',
    pick_lang: 'Choose the game language', lang_back: 'Back to games',
    lobby: 'Waiting for a second player…', turn: "{n}'s turn", you: '(you)',
    win_named: '{n} wins!', draw: 'Draw!',
    rps_win: '{n} wins the round!', rps_draw: 'Draw!', rps_secret: 'Both players choose in secret.',
    rps_sent: 'Choice sent, waiting for your opponent…', rps_pick: 'Make your choice.', next_round: 'Next round',
    rps_pierre: 'Rock', rps_feuille: 'Paper', rps_ciseaux: 'Scissors',
    wordle_status: 'Try {i} / 6: guess a 5-letter word.', wordle_win: 'Well done, found it!', wordle_lose: 'Lost. The word was: {w}',
    wordle_len: 'The word must have 5 letters.', word_ph: '5-letter word', validate: 'Send',
    quiz_q: 'Question {i} / {n}', quiz_done: 'Quiz finished!', reveal: 'Reveal', next_q: 'Next question', see_result: 'See result',
    scores: 'Scores: ', none: '—', score_line: 'Score:', draws: 'draws',
    invite: '{n} invites you to play: {g}', accept: 'Accept', refuse: 'Decline',
    started: 'A game has just started', no_conn: 'No connection to the host: go back to the room',
    sent: 'Sent: {a}', not_linked: 'Not connected to the room. Go back to the room and tap Games.'
  },
  ar: {
    games_title: 'الألعاب', close: 'إغلاق', back: 'العودة إلى الألعاب', join: 'انضم إلى اللعبة', stop: 'أوقف اللعبة',
    menu_intro: 'اختر لعبة تلعبونها معاً. لعبة واحدة في كل مرة.',
    name_ttt: 'إكس وأو', desc_ttt: 'صف من 3 رموز',
    name_rps: 'حجر ورقة مقص', desc_rps: 'حجر، ورقة، مقص بين لاعبين',
    name_c4: 'أربعة في صف', desc_c4: 'صف من 4 قطع بين لاعبين',
    name_wordle: 'الكلمة الغامضة', desc_wordle: 'اعثر على كلمة من Lost أو The 100',
    name_quiz: 'مسابقة', desc_quiz: 'أسئلة ونقاط',
    pick_lang: 'اختر لغة اللعبة', lang_back: 'العودة إلى الألعاب',
    lobby: 'في انتظار لاعب ثانٍ…', turn: 'دور {n}', you: '(أنت)',
    win_named: 'فاز {n}!', draw: 'تعادل!',
    rps_win: 'فاز {n} بالجولة!', rps_draw: 'تعادل!', rps_secret: 'يختار اللاعبان سراً.',
    rps_sent: 'تم إرسال الاختيار، في انتظار المنافس…', rps_pick: 'اختر حركتك.', next_round: 'الجولة التالية',
    rps_pierre: 'حجر', rps_feuille: 'ورقة', rps_ciseaux: 'مقص',
    wordle_status: 'المحاولة {i} / 6: اقترح كلمة من 5 حروف.', wordle_win: 'أحسنت، وجدتها!', wordle_lose: 'خسرتم. الكلمة كانت: {w}',
    wordle_len: 'يجب أن تتكون الكلمة من 5 حروف.', word_ph: 'كلمة من 5 حروف', validate: 'إرسال',
    quiz_q: 'السؤال {i} / {n}', quiz_done: 'انتهت المسابقة!', reveal: 'اكشف', next_q: 'السؤال التالي', see_result: 'عرض النتيجة',
    scores: 'النقاط: ', none: '—', score_line: 'النقاط:', draws: 'تعادلات',
    invite: '{n} يدعوك للعب: {g}', accept: 'قبول', refuse: 'رفض',
    started: 'بدأت لعبة للتو', no_conn: 'لا يوجد اتصال بالمضيف: عد إلى الغرفة',
    sent: 'أُرسل: {a}', not_linked: 'غير متصل بالغرفة. عد إلى الغرفة واضغط الألعاب.'
  }
};

function GT(lang, key, vars) {
  var t = (GAME_T[lang] || GAME_T.fr)[key];
  if (t == null) t = GAME_T.fr[key] != null ? GAME_T.fr[key] : key;
  if (vars) Object.keys(vars).forEach(function (k) { t = t.split('{' + k + '}').join(vars[k]); });
  return t;
}

// clé de comparaison d'un mot (sans accents / sans voyelles courtes pour l'arabe)
function gKey(v, lang) {
  v = String(v || '');
  if (lang === 'ar') return v.replace(/[\u064B-\u065F\u0640\s]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه');
  return v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]/g, '');
}
// affichage d'un mot tapé (lettres seulement)
function gShow(v, lang) {
  if (lang === 'ar') return String(v || '').replace(/[\u064B-\u065F\u0640\s]/g, '');
  return gKey(v, lang);
}
function gLen(s) { return Array.from(String(s)).length; }

var WORD_BANK = {
  fr: ['plage','crash','fumee','terre','locke','sayid','jacob','monty','wells','raven'],
  en: ['hatch','smoke','locke','sayid','beach','crash','raven','wells','monty','earth','jacob','ghost','mount'],
  ar: ['جزيرة','طائرة','سفينة','جيكوب','مونتي','شانون','رافين','جاسبر']
};

var QUIZ_BANK = {
  fr: [
    ['Quelle est la capitale de la Tunisie ?', ['Sfax','Tunis','Sousse','Bizerte'], 1],
    ['Combien de continents y a-t-il ?', ['5','6','7','8'], 2],
    ['Quel est le plus grand océan ?', ['Atlantique','Indien','Arctique','Pacifique'], 3],
    ["Combien de côtés a un hexagone ?", ['5','6','7','8'], 1],
    ['Quelle planète est la plus proche du Soleil ?', ['Vénus','Mars','Mercure','Terre'], 2],
    ['Combien font 12 × 12 ?', ['124','132','144','156'], 2],
    ['Qui a peint la Joconde ?', ['Van Gogh','Léonard de Vinci','Picasso','Monet'], 1],
    ['Quel est le plus petit pays du monde ?', ['Monaco','Vatican','Malte','Saint-Marin'], 1],
    ['Combien de joueurs par équipe sur le terrain au football ?', ['9','10','11','12'], 2],
    ['Quel gaz les plantes absorbent-elles ?', ['Oxygène','Azote','Dioxyde de carbone','Hélium'], 2],
    ["Combien d'os compte environ le corps adulte ?", ['106','206','306','406'], 1],
    ["Quel est le plus long fleuve d'Afrique ?", ['Le Congo','Le Nil','Le Niger','Le Zambèze'], 1],
    ['En quelle année un homme a-t-il marché sur la Lune pour la première fois ?', ['1959','1965','1969','1975'], 2],
    ["Quel est le symbole chimique de l'or ?", ['Ag','Au','Or','Go'], 1],
    ['Combien de cordes a une guitare classique ?', ['4','5','6','7'], 2],
    ['Quelle est la monnaie du Japon ?', ['Yuan','Won','Yen','Baht'], 2],
    ['Quel est le plus grand désert chaud du monde ?', ['Gobi','Kalahari','Sahara','Atacama'], 2],
    ["Combien de minutes dans une heure et demie ?", ['60','90','120','150'], 1],
    ['Qui a écrit « Les Misérables » ?', ['Zola','Hugo','Flaubert','Balzac'], 1],
    ['Quelle langue a le plus de locuteurs natifs ?', ['Anglais','Espagnol','Mandarin','Hindi'], 2]
  ],
  en: [
    ['What is the capital of Tunisia?', ['Sfax','Tunis','Sousse','Bizerte'], 1],
    ['How many continents are there?', ['5','6','7','8'], 2],
    ['What is the largest ocean?', ['Atlantic','Indian','Arctic','Pacific'], 3],
    ['How many sides does a hexagon have?', ['5','6','7','8'], 1],
    ['Which planet is closest to the Sun?', ['Venus','Mars','Mercury','Earth'], 2],
    ['What is 12 × 12?', ['124','132','144','156'], 2],
    ['Who painted the Mona Lisa?', ['Van Gogh','Leonardo da Vinci','Picasso','Monet'], 1],
    ['What is the smallest country in the world?', ['Monaco','Vatican City','Malta','San Marino'], 1],
    ['How many players from each team are on a football pitch?', ['9','10','11','12'], 2],
    ['Which gas do plants absorb?', ['Oxygen','Nitrogen','Carbon dioxide','Helium'], 2],
    ['About how many bones does an adult human body have?', ['106','206','306','406'], 1],
    ['What is the longest river in Africa?', ['Congo','Nile','Niger','Zambezi'], 1],
    ['In what year did a human first walk on the Moon?', ['1959','1965','1969','1975'], 2],
    ['What is the chemical symbol for gold?', ['Ag','Au','Or','Go'], 1],
    ['How many strings does a classical guitar have?', ['4','5','6','7'], 2],
    ['What is the currency of Japan?', ['Yuan','Won','Yen','Baht'], 2],
    ['What is the largest hot desert in the world?', ['Gobi','Kalahari','Sahara','Atacama'], 2],
    ['How many minutes are in an hour and a half?', ['60','90','120','150'], 1],
    ['Who wrote "Les Misérables"?', ['Zola','Hugo','Flaubert','Balzac'], 1],
    ['Which language has the most native speakers?', ['English','Spanish','Mandarin','Hindi'], 2]
  ],
  ar: [
    ['ما عاصمة تونس؟', ['صفاقس','تونس','سوسة','بنزرت'], 1],
    ['كم عدد القارات في العالم؟', ['5','6','7','8'], 2],
    ['ما أكبر محيط في العالم؟', ['الأطلسي','الهندي','المتجمد الشمالي','الهادئ'], 3],
    ['كم ضلعاً للسداسي؟', ['5','6','7','8'], 1],
    ['أي كوكب هو الأقرب إلى الشمس؟', ['الزهرة','المريخ','عطارد','الأرض'], 2],
    ['كم يساوي 12 × 12؟', ['124','132','144','156'], 2],
    ['من رسم لوحة الموناليزا؟', ['فان غوخ','ليوناردو دا فينشي','بيكاسو','مونيه'], 1],
    ['ما أصغر دولة في العالم؟', ['موناكو','الفاتيكان','مالطا','سان مارينو'], 1],
    ['كم لاعباً في كل فريق داخل ملعب كرة القدم؟', ['9','10','11','12'], 2],
    ['ما الغاز الذي تمتصه النباتات؟', ['الأكسجين','النيتروجين','ثاني أكسيد الكربون','الهيليوم'], 2],
    ['كم عظمة تقريباً في جسم الإنسان البالغ؟', ['106','206','306','406'], 1],
    ['ما أطول نهر في أفريقيا؟', ['الكونغو','النيل','النيجر','الزامبيزي'], 1],
    ['في أي عام مشى الإنسان على القمر لأول مرة؟', ['1959','1965','1969','1975'], 2],
    ['ما الرمز الكيميائي للذهب؟', ['Ag','Au','Or','Go'], 1],
    ['كم عدد أوتار الغيتار الكلاسيكي؟', ['4','5','6','7'], 2],
    ['ما عملة اليابان؟', ['اليوان','الوون','الين','البات'], 2],
    ['ما أكبر صحراء حارة في العالم؟', ['جوبي','كالاهاري','الصحراء الكبرى','أتاكاما'], 2],
    ['كم دقيقة في ساعة ونصف؟', ['60','90','120','150'], 1],
    ['من كتب رواية "البؤساء"؟', ['زولا','فيكتور هوغو','فلوبير','بلزاك'], 1],
    ['ما اللغة الأكثر انتشاراً بين الناطقين الأصليين؟', ['الإنجليزية','الإسبانية','الماندرين','الهندية'], 2]
  ]
};

// vrai hasard : crypto.getRandomValues quand il existe (Math.random en secours)
function gRand(n) {
  try {
    var c = window.crypto || window.msCrypto, buf = new Uint32Array(1), lim = Math.floor(4294967296 / n) * n, v;
    do { c.getRandomValues(buf); v = buf[0]; } while (v >= lim);   // sans biais
    return v % n;
  } catch (e) { return Math.floor(Math.random() * n); }
}
function gShuffle(arr) {
  var a = arr.slice();
  for (var i = a.length - 1; i > 0; i--) { var j = gRand(i + 1); var t = a[i]; a[i] = a[j]; a[j] = t; }
  return a;
}
// historique des questions déjà posées (gardé sur l'appareil de l'hôte) : une question ne revient qu'une fois toute la banque épuisée
function gUsedLoad(key) { try { var v = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
function gUsedSave(key, list) { try { localStorage.setItem(key, JSON.stringify(list)); } catch (e) {} }
// tire n questions au hasard, mélange l'ordre des réponses ; renvoie [{q, c, a}] (a = bonne réponse dans c)
function pickQuiz(lang, n, which, exclude) {
  var bank = ((which === 'series') ? SERIES_BANK : QUIZ_BANK)[lang] || QUIZ_BANK.fr;
  var key = 'a2g-used-' + (which === 'series' ? 'series' : 'general') + '-' + lang;
  var cur = exclude || [], hist = gUsedLoad(key);
  var pool = bank.filter(function (it) { return cur.indexOf(it[0]) < 0 && hist.indexOf(it[0]) < 0; });
  var out = gShuffle(pool).slice(0, n);
  if (out.length < n) {                                  // banque épuisée : nouveau cycle (sans reprendre les questions de la partie)
    hist = [];
    var taken = out.map(function (it) { return it[0]; });
    var more = bank.filter(function (it) { return cur.indexOf(it[0]) < 0 && taken.indexOf(it[0]) < 0; });
    if (more.length < n - out.length) more = bank.filter(function (it) { return taken.indexOf(it[0]) < 0; });
    out = out.concat(gShuffle(more).slice(0, n - out.length));
  }
  gUsedSave(key, hist.concat(out.map(function (it) { return it[0]; })));
  return out.map(function (item) {
    var order = gShuffle([0, 1, 2, 3]);
    var c = order.map(function (k) { return item[1][k]; });
    return { q: item[0], c: c, a: order.indexOf(item[2]) };
  });
}
// tire un mot au hasard : {key, show}
function pickWord(lang) {
  var list = WORD_BANK[lang] || WORD_BANK.fr;
  var w = list[gRand(list.length)];
  return { key: gKey(w, lang), show: gShow(w, lang) };
}

// ---------- quiz Lost / The 100 (même moteur que le quiz) ----------
// (les questions Lost / The 100 sont dans games-q-series.js, sans spoiler)
var SERIES_BANK = { fr: [], en: [], ar: [] };

// ---------- coloriage : images à colorier (chaque zone est un élément, {F} = couleur)
var COLOR_PALETTE = ['#f5a07f', '#e8a722', '#7bc96f', '#4aa3df', '#e05d6f', '#a57bd9', '#7a5230', '#ffffff'];
var COLOR_SUBJECTS = [
  { id: 'cat', parts: [
    '<ellipse cx="150" cy="170" rx="95" ry="85" fill="{F}" stroke="#2b3d55" stroke-width="4"/>',
    '<polygon points="70,120 85,35 140,100" fill="{F}" stroke="#2b3d55" stroke-width="4" stroke-linejoin="round"/>',
    '<polygon points="230,120 215,35 160,100" fill="{F}" stroke="#2b3d55" stroke-width="4" stroke-linejoin="round"/>',
    '<circle cx="115" cy="160" r="14" fill="{F}" stroke="#2b3d55" stroke-width="4"/>',
    '<circle cx="185" cy="160" r="14" fill="{F}" stroke="#2b3d55" stroke-width="4"/>',
    '<polygon points="140,195 160,195 150,210" fill="{F}" stroke="#2b3d55" stroke-width="4" stroke-linejoin="round"/>'
  ] },
  { id: 'fish', parts: [
    '<ellipse cx="135" cy="150" rx="95" ry="60" fill="{F}" stroke="#2b3d55" stroke-width="4"/>',
    '<polygon points="220,150 290,100 290,200" fill="{F}" stroke="#2b3d55" stroke-width="4" stroke-linejoin="round"/>',
    '<polygon points="110,92 140,50 165,95" fill="{F}" stroke="#2b3d55" stroke-width="4" stroke-linejoin="round"/>',
    '<circle cx="95" cy="135" r="12" fill="{F}" stroke="#2b3d55" stroke-width="4"/>'
  ] },
  { id: 'room', parts: [
    '<rect x="20" y="20" width="260" height="200" fill="{F}" stroke="#2b3d55" stroke-width="4"/>',
    '<rect x="20" y="220" width="260" height="60" fill="{F}" stroke="#2b3d55" stroke-width="4"/>',
    '<rect x="50" y="60" width="70" height="70" fill="{F}" stroke="#2b3d55" stroke-width="4"/>',
    '<rect x="190" y="110" width="60" height="110" fill="{F}" stroke="#2b3d55" stroke-width="4"/>',
    '<rect x="95" y="175" width="95" height="40" rx="8" fill="{F}" stroke="#2b3d55" stroke-width="4"/>'
  ] },
  { id: 'elephant', parts: [
    '<ellipse cx="160" cy="170" rx="90" ry="58" fill="{F}" stroke="#2b3d55" stroke-width="4"/>',
    '<rect x="88" y="200" width="28" height="72" rx="13" fill="{F}" stroke="#2b3d55" stroke-width="4"/>',
    '<rect x="122" y="200" width="28" height="72" rx="13" fill="{F}" stroke="#2b3d55" stroke-width="4"/>',
    '<rect x="188" y="200" width="28" height="72" rx="13" fill="{F}" stroke="#2b3d55" stroke-width="4"/>',
    '<rect x="222" y="200" width="28" height="72" rx="13" fill="{F}" stroke="#2b3d55" stroke-width="4"/>',
    '<ellipse cx="108" cy="112" rx="34" ry="44" fill="{F}" stroke="#2b3d55" stroke-width="4"/>',
    '<ellipse cx="92" cy="118" rx="50" ry="46" fill="{F}" stroke="#2b3d55" stroke-width="4"/>',
    '<path d="M52 128 Q22 150 28 200 Q32 216 46 204 Q42 168 66 150 Z" fill="{F}" stroke="#2b3d55" stroke-width="4" stroke-linejoin="round"/>',
    '<path d="M54 134 Q34 136 38 156 Q50 146 58 146 Z" fill="{F}" stroke="#2b3d55" stroke-width="3" stroke-linejoin="round"/>',
    '<circle cx="84" cy="104" r="6" fill="{F}" stroke="#2b3d55" stroke-width="3"/>',
    '<path d="M246 150 Q266 158 262 186 L256 184 Q258 164 240 158 Z" fill="{F}" stroke="#2b3d55" stroke-width="3" stroke-linejoin="round"/>'
  ] },
  { id: 'bird', parts: [
    '<ellipse cx="150" cy="170" rx="70" ry="85" fill="{F}" stroke="#2b3d55" stroke-width="4"/>',
    '<path d="M220 190 L262 240 L226 246 L210 214 Z" fill="{F}" stroke="#2b3d55" stroke-width="4"/>',
    '<path d="M96 150 Q118 130 128 190 Q108 216 88 190 Z" fill="{F}" stroke="#2b3d55" stroke-width="4"/>',
    '<circle cx="150" cy="95" r="55" fill="{F}" stroke="#2b3d55" stroke-width="4"/>',
    '<circle cx="132" cy="90" r="16" fill="{F}" stroke="#2b3d55" stroke-width="4"/>',
    '<circle cx="168" cy="90" r="16" fill="{F}" stroke="#2b3d55" stroke-width="4"/>',
    '<polygon points="150,110 140,130 160,130" fill="{F}" stroke="#2b3d55" stroke-width="4"/>',
    '<polygon points="122,52 130,20 142,50" fill="{F}" stroke="#2b3d55" stroke-width="4"/>',
    '<polygon points="158,50 170,20 178,52" fill="{F}" stroke="#2b3d55" stroke-width="4"/>',
    '<rect x="120" y="250" width="16" height="24" rx="4" fill="{F}" stroke="#2b3d55" stroke-width="4"/>',
    '<rect x="164" y="250" width="16" height="24" rx="4" fill="{F}" stroke="#2b3d55" stroke-width="4"/>'
  ] },
  { id: 'house', parts: [
    '<rect x="0" y="262" width="300" height="38" fill="{F}" stroke="#2b3d55" stroke-width="4"/>',
    '<rect x="60" y="120" width="180" height="142" fill="{F}" stroke="#2b3d55" stroke-width="4"/>',
    '<polygon points="40,125 150,40 260,125" fill="{F}" stroke="#2b3d55" stroke-width="4"/>',
    '<rect x="200" y="55" width="25" height="50" fill="{F}" stroke="#2b3d55" stroke-width="4"/>',
    '<rect x="130" y="180" width="40" height="82" fill="{F}" stroke="#2b3d55" stroke-width="4"/>',
    '<circle cx="162" cy="222" r="4" fill="{F}" stroke="#2b3d55" stroke-width="4"/>',
    '<rect x="78" y="150" width="40" height="40" fill="{F}" stroke="#2b3d55" stroke-width="4"/>',
    '<rect x="182" y="150" width="40" height="40" fill="{F}" stroke="#2b3d55" stroke-width="4"/>'
  ] },
  { id: 'tree', parts: [
    '<rect x="0" y="250" width="300" height="50" fill="{F}" stroke="#2b3d55" stroke-width="4"/>',
    '<rect x="130" y="170" width="40" height="90" fill="{F}" stroke="#2b3d55" stroke-width="4"/>',
    '<circle cx="150" cy="120" r="70" fill="{F}" stroke="#2b3d55" stroke-width="4"/>',
    '<circle cx="95" cy="150" r="45" fill="{F}" stroke="#2b3d55" stroke-width="4"/>',
    '<circle cx="205" cy="150" r="45" fill="{F}" stroke="#2b3d55" stroke-width="4"/>',
    '<circle cx="120" cy="110" r="10" fill="{F}" stroke="#2b3d55" stroke-width="4"/>',
    '<circle cx="185" cy="130" r="10" fill="{F}" stroke="#2b3d55" stroke-width="4"/>'
  ] },
  { id: 'car', parts: [
    '<path d="M40 200 L40 160 Q45 140 80 135 L110 105 Q130 95 190 95 L225 125 Q255 130 262 160 L262 200 Z" fill="{F}" stroke="#2b3d55" stroke-width="4"/>',
    '<polygon points="118,110 185,110 208,138 115,138" fill="{F}" stroke="#2b3d55" stroke-width="4"/>',
    '<circle cx="95" cy="205" r="28" fill="{F}" stroke="#2b3d55" stroke-width="4"/>',
    '<circle cx="215" cy="205" r="28" fill="{F}" stroke="#2b3d55" stroke-width="4"/>',
    '<circle cx="95" cy="205" r="10" fill="{F}" stroke="#2b3d55" stroke-width="4"/>',
    '<circle cx="215" cy="205" r="10" fill="{F}" stroke="#2b3d55" stroke-width="4"/>',
    '<circle cx="252" cy="165" r="8" fill="{F}" stroke="#2b3d55" stroke-width="4"/>'
  ] },
  { id: 'boat', parts: [
    '<rect x="0" y="230" width="300" height="70" fill="{F}" stroke="#2b3d55" stroke-width="4"/>',
    '<path d="M60 230 L240 230 L210 265 L90 265 Z" fill="{F}" stroke="#2b3d55" stroke-width="4"/>',
    '<rect x="145" y="40" width="8" height="190" fill="{F}" stroke="#2b3d55" stroke-width="4"/>',
    '<polygon points="155,50 155,215 230,215" fill="{F}" stroke="#2b3d55" stroke-width="4"/>',
    '<polygon points="140,70 140,215 70,215" fill="{F}" stroke="#2b3d55" stroke-width="4"/>',
    '<polygon points="153,40 178,50 153,60" fill="{F}" stroke="#2b3d55" stroke-width="4"/>'
  ] },
  { id: 'mug', parts: [
    '<rect x="70" y="80" width="130" height="150" rx="14" fill="{F}" stroke="#2b3d55" stroke-width="4"/>',
    '<path d="M200 110 h25 a35 35 0 0 1 0 70 h-25" fill="{F}" stroke="#2b3d55" stroke-width="4"/>',
    '<ellipse cx="135" cy="245" rx="115" ry="20" fill="{F}" stroke="#2b3d55" stroke-width="4"/>'
  ] }
];
function colorMarkup(sub, regions) {
  return sub.parts.map(function (p, i) {
    return p.replace('{F}', regions[i] || '#ffffff').replace(/^<(\w+)/, '<$1 data-r="' + i + '"');
  }).join('');
}
function pickColorSubject() { return COLOR_SUBJECTS[gRand(COLOR_SUBJECTS.length)]; }

var GT_EXTRA = {
  fr: { name_series: 'Quiz Lost / The 100', desc_series: 'Questions sur les deux séries', name_color: 'Coloriage', desc_color: 'Colorie une image à tour de rôle',
        pick_color: 'Choisis une couleur, puis touche une zone', color_done: 'Coloriage terminé !', save_img: "Sauvegarder l'image", color_join: 'Rejoindre le coloriage' },
  en: { name_series: 'Lost / The 100 quiz', desc_series: 'Questions about both shows', name_color: 'Coloring', desc_color: 'Color a picture, one turn at a time',
        pick_color: 'Pick a color, then tap an area', color_done: 'Coloring finished!', save_img: 'Save image', color_join: 'Join the coloring' },
  ar: { name_series: 'مسابقة Lost / The 100', desc_series: 'أسئلة عن المسلسلين', name_color: 'تلوين', desc_color: 'لوّن صورة بالتناوب',
        pick_color: 'اختر لوناً، ثم اضغط على منطقة', color_done: 'انتهى التلوين!', save_img: 'حفظ الصورة', color_join: 'انضم إلى التلوين' }
};
Object.keys(GT_EXTRA).forEach(function (l) { Object.assign(GAME_T[l], GT_EXTRA[l]); });
Object.keys({fr:1,en:1,ar:1}).forEach(function (l) {
  Object.assign(GAME_T[l], {
    quiz_batch_done: { fr: '10 questions terminées ! Continuer ?', en: 'Round finished! Keep going?', ar: 'انتهت 10 أسئلة! هل تكملون؟' }[l],
    dont_know: { fr: 'Je ne sais pas', en: "I don't know", ar: 'لا أعرف' }[l],
    more10: { fr: 'Continuer (10 de plus)', en: 'Continue (10 more)', ar: 'متابعة (10 أسئلة أخرى)' }[l],
    end_quiz: { fr: 'Terminer le quiz', en: 'End the quiz', ar: 'إنهاء المسابقة' }[l]
  });
});
Object.keys({fr:1,en:1,ar:1}).forEach(function (l) {
  GAME_T[l].next_img = { fr: 'Image suivante', en: 'Next picture', ar: 'الصورة التالية' }[l];
});
Object.keys({fr:1,en:1,ar:1}).forEach(function (l) {
  Object.assign(GAME_T[l], {
    answered_by: { fr: 'Ont répondu : {n}', en: 'Answered: {n}', ar: 'أجاب: {n}' }[l],
    answered_wait: { fr: 'Réponse envoyée. Les réponses des autres apparaîtront quand tout le monde aura répondu.', en: "Answer sent. Everyone's answers will show once all have answered.", ar: 'تم إرسال إجابتك. ستظهر إجابات الجميع بعد أن يجيب الكل.' }[l],
    no_answer_yet: { fr: 'Personne n\'a encore répondu.', en: 'Nobody has answered yet.', ar: 'لم يجب أحد بعد.' }[l]
  });
});
Object.keys({fr:1,en:1,ar:1}).forEach(function (l) {
  Object.assign(GAME_T[l], {
    fx_right: { fr: 'Bonne réponse !', en: 'Correct!', ar: 'إجابة صحيحة!' }[l],
    fx_wrong: { fr: 'Raté !', en: 'Missed!', ar: 'إجابة خاطئة!' }[l],
    fx_none: { fr: 'Pas de réponse', en: 'No answer', ar: 'بلا إجابة' }[l],
    fx_was: { fr: 'La bonne réponse : {a}', en: 'The right answer: {a}', ar: 'الإجابة الصحيحة: {a}' }[l],
    fx_streak: { fr: 'Série de {n}', en: '{n} in a row', ar: '{n} متتالية' }[l],
    waiting: { fr: 'En attente des autres joueurs…', en: 'Waiting for the other players…', ar: 'في انتظار اللاعبين الآخرين…' }[l]
  });
});
