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

function gShuffle(arr) {
  var a = arr.slice();
  for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
  return a;
}
// tire n questions au hasard, mélange l'ordre des réponses ; renvoie [{q, c, a}] (a = bonne réponse dans c)
function pickQuiz(lang, n) {
  var bank = QUIZ_BANK[lang] || QUIZ_BANK.fr;
  return gShuffle(bank).slice(0, n).map(function (item) {
    var order = gShuffle([0, 1, 2, 3]);
    var c = order.map(function (k) { return item[1][k]; });
    return { q: item[0], c: c, a: order.indexOf(item[2]) };
  });
}
// tire un mot au hasard : {key, show}
function pickWord(lang) {
  var list = WORD_BANK[lang] || WORD_BANK.fr;
  var w = list[Math.floor(Math.random() * list.length)];
  return { key: gKey(w, lang), show: gShow(w, lang) };
}
