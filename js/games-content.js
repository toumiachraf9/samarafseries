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
function pickQuiz(lang, n, which, exclude) {
  var bank = ((which === 'series') ? SERIES_BANK : QUIZ_BANK)[lang] || QUIZ_BANK.fr;
  var ex = exclude || [];
  var pool = bank.filter(function (item) { return ex.indexOf(item[0]) < 0; });
  return gShuffle(pool).slice(0, n).map(function (item) {
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

// ---------- quiz Lost / The 100 (même moteur que le quiz) ----------
var SERIES_BANK = {
  "fr": [
    [
      "Quel est le nom de l'avion qui s'écrase sur l'île au début de Lost ?",
      [
        "Oceanic 815",
        "Pan Am 103",
        "Air France 447",
        "Vol 370"
      ],
      0
    ],
    [
      "Quel est le chiffre le plus répété dans Lost ?",
      [
        "42",
        "7",
        "13",
        "108"
      ],
      0
    ],
    [
      "Quelle compagnie est derrière le projet sur l'île ?",
      [
        "Initiative Dharma",
        "Oceanic Airlines",
        "Widmore Industries",
        "Fondation Hanso"
      ],
      0
    ],
    [
      "Comment s'appelle le premier épisode de Lost ?",
      [
        "Pilote",
        "La Balise",
        "Le Crash",
        "Bienvenue"
      ],
      0
    ],
    [
      "Où vivent les 100 jeunes avant de descendre sur Terre ?",
      [
        "Une station spatiale (l'Arche)",
        "Une base sous-marine",
        "Un bunker",
        "Une colonie sur Mars"
      ],
      0
    ],
    [
      "Quel personnage est mécanicienne sur l'Arche ?",
      [
        "Raven Reyes",
        "Octavia Blake",
        "Harper McIntyre",
        "Monty Green"
      ],
      0
    ],
    [
      "Qui est la commandante de Trikru ?",
      [
        "Lexa",
        "Anya",
        "Indra",
        "Nia"
      ],
      0
    ],
    [
      "Comment appelle-t-on les habitants de la Terre rencontrés par les 100 ?",
      [
        "Les Terrestres (Grounders)",
        "Les Ombres",
        "Les Sans-Terre",
        "Les Nomades"
      ],
      0
    ],
    [
      "Quel est le nom du chancelier de l'Arche ?",
      [
        "Thelonious Jaha",
        "Dante Wallace",
        "Cage Wallace",
        "Marcus Kane"
      ],
      0
    ],
    [
      "Quel est le nom du chien de Walt dans Lost ?",
      [
        "Vincent",
        "Max",
        "Bob",
        "Rex"
      ],
      0
    ],
    [
      "Quelle est la profession de Jack Shephard ?",
      [
        "Chirurgien",
        "Pilote",
        "Policier",
        "Professeur"
      ],
      0
    ],
    [
      "De quel pays vient Sun ?",
      [
        "Corée du Sud",
        "Japon",
        "Chine",
        "Vietnam"
      ],
      0
    ],
    [
      "Quel est le prénom de Locke ?",
      [
        "John",
        "Jack",
        "James",
        "Juan"
      ],
      0
    ],
    [
      "Quel est le nom de famille de Bellamy ?",
      [
        "Blake",
        "Griffin",
        "Reyes",
        "Jaha"
      ],
      0
    ],
    [
      "Quel peuple est dirigé par Lexa ?",
      [
        "Trikru",
        "Skaikru",
        "Azgeda",
        "Maunon"
      ],
      0
    ],
    [
      "Quelle est la nationalité de Jin ?",
      [
        "Coréenne",
        "Japonaise",
        "Chinoise",
        "Vietnamienne"
      ],
      0
    ],
    [
      "Quel est le métier de Charlie Pace ?",
      [
        "Chirurgien",
        "Musicien",
        "Pilote",
        "Écrivain"
      ],
      1
    ],
    [
      "Quel est le nom de famille de Sayid ?",
      [
        "Jarrah",
        "Hassan",
        "Karim",
        "Nadir"
      ],
      0
    ],
    [
      "Quel est le nom de famille de Charlie ?",
      [
        "Cole",
        "Pace",
        "Hart",
        "Reed"
      ],
      1
    ],
    [
      "Quel est le nom de famille de Finn ?",
      [
        "Murphy",
        "Miller",
        "Wells",
        "Collins"
      ],
      3
    ],
    [
      "Quel est le nom de famille de Monty ?",
      [
        "Blake",
        "Green",
        "Reyes",
        "Cole"
      ],
      1
    ],
    [
      "Quel est le nom de famille d'Harper ?",
      [
        "Miller",
        "Hayes",
        "McIntyre",
        "Moss"
      ],
      2
    ],
    [
      "Quel est le nom de famille de Jasper ?",
      [
        "Adams",
        "Lee",
        "Stone",
        "Jordan"
      ],
      3
    ],
    [
      "Quel est le nom de famille de Thelonious ?",
      [
        "Wallace",
        "Jaha",
        "Kane",
        "Griffin"
      ],
      1
    ],
    [
      "Quel est le nom de famille de Marcus ?",
      [
        "Wallace",
        "Jaha",
        "Kane",
        "Blake"
      ],
      2
    ],
    [
      "Quel est le nom de famille de Dante ?",
      [
        "Kane",
        "Jaha",
        "Griffin",
        "Wallace"
      ],
      3
    ],
    [
      "Quel est le nom de l'écoutille où Desmond tape les chiffres ?",
      [
        "La Balise",
        "L'Écoutille (The Hatch)",
        "Le Phare",
        "La Station Flamme"
      ],
      1
    ],
    [
      "Quel est le nom du groupe de Charlie Pace ?",
      [
        "Drive Shaft",
        "The Beatles",
        "Oasis",
        "Radiohead"
      ],
      0
    ],
    [
      "Quel est le surnom de Hugo Reyes ?",
      [
        "Huggy",
        "Big Hugo",
        "Hurley",
        "Reyes"
      ],
      2
    ],
    [
      "Quel est le surnom de James Ford ?",
      [
        "Jimmy",
        "Jim",
        "Boss",
        "Sawyer"
      ],
      3
    ],
    [
      "Dans quelle saison les 100 arrivent-ils sur Terre ?",
      [
        "Saison 2",
        "Saison 1",
        "Saison 3",
        "Saison 4"
      ],
      1
    ]
  ],
  "en": [
    [
      "What is the name of the plane that crashes on the island at the start of Lost?",
      [
        "Oceanic 815",
        "Pan Am 103",
        "Air France 447",
        "Flight 370"
      ],
      0
    ],
    [
      "Which number appears most often in Lost?",
      [
        "42",
        "7",
        "13",
        "108"
      ],
      0
    ],
    [
      "Which company is behind the project on the island?",
      [
        "Dharma Initiative",
        "Oceanic Airlines",
        "Widmore Industries",
        "Hanso Foundation"
      ],
      0
    ],
    [
      "What is the name of the first episode of Lost?",
      [
        "Pilot",
        "The Beacon",
        "The Crash",
        "Welcome"
      ],
      0
    ],
    [
      "Where do the 100 young people live before going down to Earth?",
      [
        "A space station (the Ark)",
        "An underwater base",
        "A bunker",
        "A colony on Mars"
      ],
      0
    ],
    [
      "Which character is the mechanic on the Ark?",
      [
        "Raven Reyes",
        "Octavia Blake",
        "Harper McIntyre",
        "Monty Green"
      ],
      0
    ],
    [
      "Who is the commander of Trikru?",
      [
        "Lexa",
        "Anya",
        "Indra",
        "Nia"
      ],
      0
    ],
    [
      "What do the 100 call the people of Earth they meet?",
      [
        "Grounders",
        "The Shadows",
        "The Earthless",
        "The Nomads"
      ],
      0
    ],
    [
      "What is the name of the Ark's chancellor?",
      [
        "Thelonious Jaha",
        "Dante Wallace",
        "Cage Wallace",
        "Marcus Kane"
      ],
      0
    ],
    [
      "What is Walt's dog called in Lost?",
      [
        "Vincent",
        "Max",
        "Bob",
        "Rex"
      ],
      0
    ],
    [
      "What is Jack Shephard's job?",
      [
        "Surgeon",
        "Pilot",
        "Police officer",
        "Teacher"
      ],
      0
    ],
    [
      "Which country is Sun from?",
      [
        "South Korea",
        "Japan",
        "China",
        "Vietnam"
      ],
      0
    ],
    [
      "What is Locke's first name?",
      [
        "John",
        "Jack",
        "James",
        "Juan"
      ],
      0
    ],
    [
      "What is Bellamy's last name?",
      [
        "Blake",
        "Griffin",
        "Reyes",
        "Jaha"
      ],
      0
    ],
    [
      "Which people does Lexa lead?",
      [
        "Trikru",
        "Skaikru",
        "Azgeda",
        "Maunon"
      ],
      0
    ],
    [
      "What is Jin's nationality?",
      [
        "Korean",
        "Japanese",
        "Chinese",
        "Vietnamese"
      ],
      0
    ],
    [
      "What is Charlie Pace's job?",
      [
        "Surgeon",
        "Musician",
        "Pilot",
        "Writer"
      ],
      1
    ],
    [
      "What is Sayid's last name?",
      [
        "Jarrah",
        "Hassan",
        "Karim",
        "Nadir"
      ],
      0
    ],
    [
      "What is Charlie's last name?",
      [
        "Cole",
        "Pace",
        "Hart",
        "Reed"
      ],
      1
    ],
    [
      "What is Finn's last name?",
      [
        "Murphy",
        "Miller",
        "Wells",
        "Collins"
      ],
      3
    ],
    [
      "What is Monty's last name?",
      [
        "Blake",
        "Green",
        "Reyes",
        "Cole"
      ],
      1
    ],
    [
      "What is Harper's last name?",
      [
        "Miller",
        "Hayes",
        "McIntyre",
        "Moss"
      ],
      2
    ],
    [
      "What is Jasper's last name?",
      [
        "Adams",
        "Lee",
        "Stone",
        "Jordan"
      ],
      3
    ],
    [
      "What is Thelonious's last name?",
      [
        "Wallace",
        "Jaha",
        "Kane",
        "Griffin"
      ],
      1
    ],
    [
      "What is Marcus's last name?",
      [
        "Wallace",
        "Jaha",
        "Kane",
        "Blake"
      ],
      2
    ],
    [
      "What is Dante's last name?",
      [
        "Kane",
        "Jaha",
        "Griffin",
        "Wallace"
      ],
      3
    ],
    [
      "What is the name of the hatch where Desmond types the numbers?",
      [
        "The Beacon",
        "The Hatch",
        "The Lighthouse",
        "The Flame Station"
      ],
      1
    ],
    [
      "What is the name of Charlie Pace's band?",
      [
        "Drive Shaft",
        "The Beatles",
        "Oasis",
        "Radiohead"
      ],
      0
    ],
    [
      "What is Hugo Reyes's nickname?",
      [
        "Huggy",
        "Big Hugo",
        "Hurley",
        "Reyes"
      ],
      2
    ],
    [
      "What is James Ford's nickname?",
      [
        "Jimmy",
        "Jim",
        "Boss",
        "Sawyer"
      ],
      3
    ],
    [
      "In which season do the 100 arrive on Earth?",
      [
        "Season 2",
        "Season 1",
        "Season 3",
        "Season 4"
      ],
      1
    ]
  ],
  "ar": [
    [
      "ما اسم الطائرة التي تتحطم على الجزيرة في بداية Lost؟",
      [
        "أوشيانيك 815",
        "بان أم 103",
        "إير فرانس 447",
        "الرحلة 370"
      ],
      0
    ],
    [
      "أي رقم يتكرر أكثر في Lost؟",
      [
        "42",
        "7",
        "13",
        "108"
      ],
      0
    ],
    [
      "أي شركة تقف وراء المشروع على الجزيرة؟",
      [
        "مبادرة دارما",
        "أوشيانيك للطيران",
        "شركة ويدمور",
        "مؤسسة هانسو"
      ],
      0
    ],
    [
      "ما اسم أول حلقة في Lost؟",
      [
        "الطيار",
        "المنارة",
        "التحطم",
        "أهلاً بك"
      ],
      0
    ],
    [
      "أين يعيش الـ100 الشباب قبل النزول إلى الأرض؟",
      [
        "محطة فضائية (الفُلك)",
        "قاعدة تحت الماء",
        "ملجأ",
        "مستعمرة على المريخ"
      ],
      0
    ],
    [
      "أي شخصية هي الميكانيكية على الفُلك؟",
      [
        "ريفن ريس",
        "أوكتافيا بلايك",
        "هاربر ماكنتاير",
        "مونتي غرين"
      ],
      0
    ],
    [
      "من هي قائدة تريكرو؟",
      [
        "ليكسا",
        "آنيا",
        "إندرا",
        "نيا"
      ],
      0
    ],
    [
      "ماذا يسمي الـ100 سكان الأرض الذين يلتقونهم؟",
      [
        "الأرضيون (Grounders)",
        "الظلال",
        "عديمو الأرض",
        "البدو"
      ],
      0
    ],
    [
      "ما اسم مستشار الفُلك؟",
      [
        "ثيلونيوس جاها",
        "دانتي والاس",
        "كيج والاس",
        "ماركوس كين"
      ],
      0
    ],
    [
      "ما اسم كلب والت في Lost؟",
      [
        "فينسينت",
        "ماكس",
        "بوب",
        "ريكس"
      ],
      0
    ],
    [
      "ما مهنة جاك شيفرد؟",
      [
        "جراح",
        "طيار",
        "شرطي",
        "معلم"
      ],
      0
    ],
    [
      "من أي بلد هي سون؟",
      [
        "كوريا الجنوبية",
        "اليابان",
        "الصين",
        "فيتنام"
      ],
      0
    ],
    [
      "ما الاسم الأول للوك؟",
      [
        "جون",
        "جاك",
        "جيمس",
        "خوان"
      ],
      0
    ],
    [
      "ما اسم عائلة بيلامي؟",
      [
        "بلاك",
        "غريفين",
        "ريس",
        "جاها"
      ],
      0
    ],
    [
      "أي شعب تقوده ليكسا؟",
      [
        "تريكرو",
        "سكايكرو",
        "أزجيدا",
        "مونون"
      ],
      0
    ],
    [
      "ما جنسية جين؟",
      [
        "كورية",
        "يابانية",
        "صينية",
        "فيتنامية"
      ],
      0
    ],
    [
      "ما مهنة تشارلي بايس؟",
      [
        "جراح",
        "موسيقي",
        "طيار",
        "كاتب"
      ],
      1
    ],
    [
      "ما اسم عائلة سايد؟",
      [
        "جارا",
        "حسن",
        "كريم",
        "نادر"
      ],
      0
    ],
    [
      "ما اسم عائلة تشارلي؟",
      [
        "كول",
        "بايس",
        "هارت",
        "ريد"
      ],
      1
    ],
    [
      "ما اسم عائلة فين؟",
      [
        "مورفي",
        "ميلر",
        "ويلز",
        "كولينز"
      ],
      3
    ],
    [
      "ما اسم عائلة مونتي؟",
      [
        "بلايك",
        "غرين",
        "ريس",
        "كول"
      ],
      1
    ],
    [
      "ما اسم عائلة هاربر؟",
      [
        "ميلر",
        "هايس",
        "ماكنتاير",
        "موس"
      ],
      2
    ],
    [
      "ما اسم عائلة جاسبر؟",
      [
        "آدامز",
        "لي",
        "ستون",
        "جوردان"
      ],
      3
    ],
    [
      "ما اسم عائلة ثيلونيوس؟",
      [
        "والاس",
        "جاها",
        "كين",
        "غريفين"
      ],
      1
    ],
    [
      "ما اسم عائلة ماركوس؟",
      [
        "والاس",
        "جاها",
        "كين",
        "بلايك"
      ],
      2
    ],
    [
      "ما اسم عائلة دانتي؟",
      [
        "كين",
        "جاها",
        "غريفين",
        "والاس"
      ],
      3
    ],
    [
      "ما اسم الفتحة التي يكتب فيها ديزموند الأرقام؟",
      [
        "المنارة",
        "الفتحة (The Hatch)",
        "القاعدة الشمالية",
        "محطة اللهب"
      ],
      1
    ],
    [
      "ما اسم فرقة تشارلي بايس؟",
      [
        "درايف شافت",
        "ذا بيتلز",
        "أوزيس",
        "راديوهيد"
      ],
      0
    ],
    [
      "ما لقب هوغو ريس؟",
      [
        "هاغي",
        "بيغ هوغو",
        "هيرلي",
        "ريس"
      ],
      2
    ],
    [
      "ما لقب جيمس فورد؟",
      [
        "جيمي",
        "جيم",
        "بوس",
        "سوير"
      ],
      3
    ],
    [
      "في أي موسم يصل الـ100 إلى الأرض؟",
      [
        "الموسم 2",
        "الموسم 1",
        "الموسم 3",
        "الموسم 4"
      ],
      1
    ]
  ]
};

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
function pickColorSubject() { return COLOR_SUBJECTS[Math.floor(Math.random() * COLOR_SUBJECTS.length)]; }

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
