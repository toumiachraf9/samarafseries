// Quiz Lost / The 100 — SANS SPOILER : uniquement le point de départ des séries (pilote / tout début), les acteurs et la production.
// Les questions sont fabriquées à partir de tableaux (personnage ↔ acteur) + quelques faits ; l'ordre des réponses est mélangé à chaque partie.
(function () {
  var L = ['fr', 'en', 'ar'];

  // ---- personnages ↔ acteurs : [personnage fr/en/ar, acteur fr/en/ar] ----
  var LOST = [
    [['Jack Shephard', 'Jack Shephard', 'جاك شيفرد'], ['Matthew Fox', 'Matthew Fox', 'مات فوكس']],
    [['Kate Austen', 'Kate Austen', 'كيت أوستن'], ['Evangeline Lilly', 'Evangeline Lilly', 'إيفانجلين ليلي']],
    [['John Locke', 'John Locke', 'جون لوك'], ["Terry O'Quinn", "Terry O'Quinn", 'تيري أوكوين']],
    [['Sawyer', 'Sawyer', 'سوير'], ['Josh Holloway', 'Josh Holloway', 'جوش هولواي']],
    [['Hurley', 'Hurley', 'هيرلي'], ['Jorge Garcia', 'Jorge Garcia', 'خورخي غارسيا']],
    [['Sayid Jarrah', 'Sayid Jarrah', 'سايد جارا'], ['Naveen Andrews', 'Naveen Andrews', 'نافين أندروز']],
    [['Jin', 'Jin', 'جين'], ['Daniel Dae Kim', 'Daniel Dae Kim', 'دانيال داي كيم']],
    [['Sun', 'Sun', 'سون'], ['Yunjin Kim', 'Yunjin Kim', 'يونجين كيم']],
    [['Charlie Pace', 'Charlie Pace', 'تشارلي بايس'], ['Dominic Monaghan', 'Dominic Monaghan', 'دومينيك موناغان']],
    [['Claire Littleton', 'Claire Littleton', 'كلير ليتلتون'], ['Emilie de Ravin', 'Emilie de Ravin', 'إميلي دي رافين']],
    [['Michael Dawson', 'Michael Dawson', 'مايكل دوسون'], ['Harold Perrineau', 'Harold Perrineau', 'هارولد بيرينو']],
    [['Shannon', 'Shannon', 'شانون'], ['Maggie Grace', 'Maggie Grace', 'ماغي غريس']],
    [['Boone', 'Boone', 'بون'], ['Ian Somerhalder', 'Ian Somerhalder', 'إيان سومرهالدر']],
    [['Walt', 'Walt', 'والت'], ['Malcolm David Kelley', 'Malcolm David Kelley', 'مالكوم ديفيد كيلي']],
    [['Rose', 'Rose', 'روز'], ['L. Scott Caldwell', 'L. Scott Caldwell', 'إل. سكوت كالدويل']]
  ];
  var T100 = [
    [['Clarke Griffin', 'Clarke Griffin', 'كلارك غريفين'], ['Eliza Taylor', 'Eliza Taylor', 'إليزا تايلور']],
    [['Bellamy Blake', 'Bellamy Blake', 'بيلامي بلاك'], ['Bob Morley', 'Bob Morley', 'بوب مورلي']],
    [['Octavia Blake', 'Octavia Blake', 'أوكتافيا بلاك'], ['Marie Avgeropoulos', 'Marie Avgeropoulos', 'ماري أفجروبولوس']],
    [['Finn Collins', 'Finn Collins', 'فين كولينز'], ['Thomas McDonell', 'Thomas McDonell', 'توماس ماكدونيل']],
    [['Raven Reyes', 'Raven Reyes', 'ريفن ريس'], ['Lindsey Morgan', 'Lindsey Morgan', 'ليندسي مورغان']],
    [['Jasper Jordan', 'Jasper Jordan', 'جاسبر جوردان'], ['Devon Bostick', 'Devon Bostick', 'ديفن بوستيك']],
    [['Monty Green', 'Monty Green', 'مونتي غرين'], ['Christopher Larkin', 'Christopher Larkin', 'كريستوفر لاركن']],
    [['John Murphy', 'John Murphy', 'جون ميرفي'], ['Richard Harmon', 'Richard Harmon', 'ريتشارد هارمون']],
    [['Abby Griffin', 'Abby Griffin', 'آبي غريفين'], ['Paige Turco', 'Paige Turco', 'بيج توركو']],
    [['Thelonious Jaha', 'Thelonious Jaha', 'ثيلونيوس جاها'], ['Isaiah Washington', 'Isaiah Washington', 'إيزايا واشنطن']],
    [['Marcus Kane', 'Marcus Kane', 'ماركوس كين'], ['Henry Ian Cusick', 'Henry Ian Cusick', 'هنري إيان كوزيك']]
  ];
  var TPL = {
    lost: {
      who: ['Qui joue {x} dans Lost ?', 'Who plays {x} in Lost?', 'من يؤدي دور {x} في Lost؟'],
      role: ['Dans Lost, quel personnage est joué par {x} ?', 'In Lost, which character is played by {x}?', 'في Lost، أي شخصية يؤديها {x}؟']
    },
    t100: {
      who: ['Qui joue {x} dans The 100 ?', 'Who plays {x} in The 100?', 'من يؤدي دور {x} في The 100؟'],
      role: ['Dans The 100, quel personnage est joué par {x} ?', 'In The 100, which character is played by {x}?', 'في The 100، أي شخصية يؤديها {x}؟']
    }
  };
  // faits : un tableau par langue, même ordre
  var F = {
    fr: [
      // ---- Lost (début de la série seulement) ----
      ["Comment s'appelle l'avion qui s'écrase sur l'île au début de Lost ?", 'Oceanic 815', 'Pan Am 103', 'Air France 447', 'Vol 370'],
      ["D'où partait le vol Oceanic 815 ?", 'Sydney', 'Los Angeles', 'Fidji', 'Hawaï'],
      ['Où le vol Oceanic 815 devait-il atterrir ?', 'Los Angeles', 'New York', 'Sydney', 'Honolulu'],
      ["Dans quel océan l'avion s'écrase-t-il ?", 'Le Pacifique', "L'Atlantique", "L'océan Indien", "L'océan Arctique"],
      ['Quel est le chiffre le plus répété dans Lost ?', '42', '7', '13', '108'],
      ['Quels nombres reviennent sans cesse dans Lost ?', '4, 8, 15, 16, 23, 42', '1, 2, 3, 4, 5, 6', '7, 14, 21, 28, 35, 42', '3, 6, 9, 12, 15, 18'],
      ['Comment s’appelle le premier épisode de Lost ?', 'Pilote', 'La Balise', 'Le Crash', 'Bienvenue'],
      ['Quel est le nom du chien de Walt ?', 'Vincent', 'Max', 'Bob', 'Rex'],
      ['Quelle est la profession de Jack Shephard ?', 'Chirurgien', 'Pilote', 'Policier', 'Professeur'],
      ['De quel pays viennent Jin et Sun ?', 'Corée du Sud', 'Japon', 'Chine', 'Vietnam'],
      ['Quel est le prénom de Locke ?', 'John', 'Jack', 'James', 'Juan'],
      ['Quel est le métier de Charlie Pace ?', 'Musicien', 'Chirurgien', 'Pilote', 'Écrivain'],
      ['Quel est le nom du groupe de Charlie Pace ?', 'Drive Shaft', 'The Beatles', 'Oasis', 'Radiohead'],
      ['Quel est le surnom de Hugo Reyes ?', 'Hurley', 'Huggy', 'Big Hugo', 'Reyes'],
      ['Quel est le surnom de James Ford ?', 'Sawyer', 'Jimmy', 'Jim', 'Boss'],
      ['Quelle survivante est enceinte au moment du crash ?', 'Claire', 'Kate', 'Shannon', 'Sun'],
      ['Quel est le nom de famille de Kate ?', 'Austen', 'Ford', 'Shephard', 'Reyes'],
      ['Quel est le nom de famille de Hurley ?', 'Reyes', 'Pace', 'Jarrah', 'Dawson'],
      ['Quel est le nom de famille de Sayid ?', 'Jarrah', 'Hassan', 'Karim', 'Nadir'],
      ['Quel est le nom de famille de Charlie ?', 'Pace', 'Cole', 'Hart', 'Reed'],
      ['Quel est le nom de famille de Shannon et de son demi-frère Boone ?', 'Rutherford (Shannon) et Carlyle (Boone)', 'Shephard et Austen', 'Pace et Littleton', 'Ford et Reyes'],
      ['Quel est le lien entre Shannon et Boone ?', 'Frère et sœur par alliance', 'Mari et femme', 'Cousins', 'Voisins'],
      ['Quel est le lien entre Michael et Walt ?', 'Père et fils', 'Oncle et neveu', 'Frères', 'Grand-père et petit-fils'],
      ['Combien de survivants sont sur la plage au début, environ ?', '48', '12', '100', '200'],
      ['Quel est le titre français de Lost ?', 'Lost : Les Disparus', 'Les Naufragés', 'Perdus', 'Oceanic'],
      ['Quelle chaîne américaine a diffusé Lost ?', 'ABC', 'NBC', 'CBS', 'Fox'],
      ['Combien de saisons compte Lost ?', '6', '5', '7', '8'],
      ['Combien d’épisodes compte Lost ?', '121', '100', '150', '88'],
      ['En quelle année Lost a-t-elle commencé ?', '2004', '2002', '2006', '2008'],
      ['Dans quel État américain Lost a-t-elle été tournée ?', 'Hawaï', 'Floride', 'Californie', 'Alaska'],
      ['Qui a composé la musique de Lost ?', 'Michael Giacchino', 'Hans Zimmer', 'John Williams', 'Ennio Morricone'],
      ['Qui a créé Lost ?', 'J. J. Abrams, Damon Lindelof et Jeffrey Lieber', 'Joss Whedon', 'Vince Gilligan', 'Matt Groening'],
      // ---- The 100 (début de la série seulement) ----
      ['Qui a créé la série The 100 ?', 'Jason Rothenberg', 'J. J. Abrams', 'Julie Plec', 'Ronald D. Moore'],
      ['Sur quelle chaîne américaine The 100 a-t-elle été diffusée ?', 'The CW', 'ABC', 'HBO', 'Netflix'],
      ['Combien de saisons compte The 100 ?', '7', '5', '6', '8'],
      ['Combien d’épisodes compte The 100 ?', '100', '80', '90', '120'],
      ['En quelle année The 100 a-t-elle commencé ?', '2014', '2012', '2016', '2018'],
      ['Qui a écrit les romans dont est tirée la série The 100 ?', 'Kass Morgan', 'Suzanne Collins', 'Veronica Roth', 'James Dashner'],
      ['Dans quel pays The 100 est-elle tournée ?', 'Au Canada', 'En Australie', 'Aux États-Unis', 'En Nouvelle-Zélande'],
      ['Où vivent les 100 jeunes avant de descendre sur Terre ?', "Dans une station spatiale (l'Arche)", 'Dans une base sous-marine', 'Dans un bunker', 'Sur une colonie martienne'],
      ["Combien de stations forment l'Arche ?", '12', '10', '7', '20'],
      ['Combien d’années se sont écoulées depuis la catastrophe quand l’histoire commence ?', '97', '25', '50', '200'],
      ['Quelle catastrophe a rendu la Terre inhabitable ?', 'Une guerre nucléaire', 'Une météorite', 'Une pandémie', 'Une glaciation'],
      ['Pourquoi envoie-t-on les 100 jeunes détenus sur Terre ?', 'Savoir si la Terre est à nouveau habitable', 'Les punir', 'Chercher de l’or', 'Fonder une armée'],
      ['Que portent les 100 au poignet pour surveiller leurs signes vitaux ?', 'Des bracelets', 'Des montres', 'Des puces sous la peau', 'Des colliers'],
      ["Comment s'appelle l'engin qui les emmène sur Terre ?", 'Un vaisseau de largage (dropship)', 'Une navette lunaire', 'Un ballon', 'Un sous-marin'],
      ['Quelle est la profession d’Abby Griffin ?', 'Médecin', 'Ingénieure', 'Pilote', 'Garde'],
      ['Comment s’appelle le père de Clarke ?', 'Jake', 'Marcus', 'Thelonious', 'Dante'],
      ['Comment s’appelle la sœur de Bellamy ?', 'Octavia', 'Clarke', 'Raven', 'Harper'],
      ['Où Octavia a-t-elle vécu cachée pendant des années ?', 'Sous le plancher', 'Dans une prison', 'Dans un hôpital', 'Chez le chancelier'],
      ['Quelle loi de l’Arche Octavia enfreint-elle par sa seule existence ?', 'Un seul enfant par famille', 'Interdiction de sortir', 'Interdiction d’étudier', 'Interdiction de chanter'],
      ['Quel est le métier de Raven Reyes ?', 'Mécanicienne', 'Médecin', 'Pilote', 'Gardienne'],
      ["Quel est le nom du chancelier de l'Arche ?", 'Thelonious Jaha', 'Dante Wallace', 'Marcus Kane', 'Jake Griffin'],
      ['Quel est le prénom de Kane ?', 'Marcus', 'Thelonious', 'Bellamy', 'John'],
      ['Quel est le nom de famille de Monty ?', 'Green', 'Blake', 'Reyes', 'Cole'],
      ['Quel est le nom de famille de Jasper ?', 'Jordan', 'Adams', 'Lee', 'Stone'],
      ["Quel est le nom de famille d'Harper ?", 'McIntyre', 'Miller', 'Hayes', 'Moss'],
      ['Quel est le nom de famille de Finn ?', 'Collins', 'Murphy', 'Miller', 'Wells'],
      ['Quel est le nom de famille de Bellamy ?', 'Blake', 'Griffin', 'Reyes', 'Jaha'],
      ['Comment appelle-t-on les habitants de la Terre rencontrés par les 100 ?', 'Les Terrestres (Grounders)', 'Les Ombres', 'Les Sans-Terre', 'Les Nomades']
    ],
    en: [
      ['What is the plane that crashes on the island at the start of Lost called?', 'Oceanic 815', 'Pan Am 103', 'Air France 447', 'Flight 370'],
      ['Where did Oceanic flight 815 take off from?', 'Sydney', 'Los Angeles', 'Fiji', 'Hawaii'],
      ['Where was Oceanic flight 815 supposed to land?', 'Los Angeles', 'New York', 'Sydney', 'Honolulu'],
      ['In which ocean does the plane crash?', 'The Pacific', 'The Atlantic', 'The Indian Ocean', 'The Arctic Ocean'],
      ['What is the most repeated number in Lost?', '42', '7', '13', '108'],
      ['Which numbers keep coming back in Lost?', '4, 8, 15, 16, 23, 42', '1, 2, 3, 4, 5, 6', '7, 14, 21, 28, 35, 42', '3, 6, 9, 12, 15, 18'],
      ['What is the first episode of Lost called?', 'Pilot', 'The Hatch', 'The Crash', 'Welcome'],
      ["What is the name of Walt's dog?", 'Vincent', 'Max', 'Bob', 'Rex'],
      ["What is Jack Shephard's job?", 'Surgeon', 'Pilot', 'Police officer', 'Teacher'],
      ['Which country are Jin and Sun from?', 'South Korea', 'Japan', 'China', 'Vietnam'],
      ["What is Locke's first name?", 'John', 'Jack', 'James', 'Juan'],
      ["What is Charlie Pace's job?", 'Musician', 'Surgeon', 'Pilot', 'Writer'],
      ["What is the name of Charlie Pace's band?", 'Drive Shaft', 'The Beatles', 'Oasis', 'Radiohead'],
      ["What is Hugo Reyes's nickname?", 'Hurley', 'Huggy', 'Big Hugo', 'Reyes'],
      ["What is James Ford's nickname?", 'Sawyer', 'Jimmy', 'Jim', 'Boss'],
      ['Which survivor is pregnant at the time of the crash?', 'Claire', 'Kate', 'Shannon', 'Sun'],
      ["What is Kate's last name?", 'Austen', 'Ford', 'Shephard', 'Reyes'],
      ["What is Hurley's last name?", 'Reyes', 'Pace', 'Jarrah', 'Dawson'],
      ["What is Sayid's last name?", 'Jarrah', 'Hassan', 'Karim', 'Nadir'],
      ["What is Charlie's last name?", 'Pace', 'Cole', 'Hart', 'Reed'],
      ["What are the last names of Shannon and her stepbrother Boone?", 'Rutherford (Shannon) and Carlyle (Boone)', 'Shephard and Austen', 'Pace and Littleton', 'Ford and Reyes'],
      ['What is the relationship between Shannon and Boone?', 'Stepsiblings', 'Husband and wife', 'Cousins', 'Neighbors'],
      ['What is the relationship between Michael and Walt?', 'Father and son', 'Uncle and nephew', 'Brothers', 'Grandfather and grandson'],
      ['About how many survivors are on the beach at the start?', '48', '12', '100', '200'],
      ['On which American network did Lost air?', 'ABC', 'NBC', 'CBS', 'Fox'],
      ['How many seasons does Lost have?', '6', '5', '7', '8'],
      ['How many episodes does Lost have?', '121', '100', '150', '88'],
      ['In what year did Lost begin?', '2004', '2002', '2006', '2008'],
      ['In which US state was Lost filmed?', 'Hawaii', 'Florida', 'California', 'Alaska'],
      ['Who composed the music of Lost?', 'Michael Giacchino', 'Hans Zimmer', 'John Williams', 'Ennio Morricone'],
      ['Who created Lost?', 'J. J. Abrams, Damon Lindelof and Jeffrey Lieber', 'Joss Whedon', 'Vince Gilligan', 'Matt Groening'],
      ['Who created the series The 100?', 'Jason Rothenberg', 'J. J. Abrams', 'Julie Plec', 'Ronald D. Moore'],
      ['On which American network did The 100 air?', 'The CW', 'ABC', 'HBO', 'Netflix'],
      ['How many seasons does The 100 have?', '7', '5', '6', '8'],
      ['How many episodes does The 100 have?', '100', '80', '90', '120'],
      ['In what year did The 100 begin?', '2014', '2012', '2016', '2018'],
      ['Who wrote the novels The 100 is based on?', 'Kass Morgan', 'Suzanne Collins', 'Veronica Roth', 'James Dashner'],
      ['In which country is The 100 filmed?', 'Canada', 'Australia', 'United States', 'New Zealand'],
      ['Where do the 100 young people live before going down to Earth?', 'On a space station (the Ark)', 'In an underwater base', 'In a bunker', 'On a Mars colony'],
      ['How many stations make up the Ark?', '12', '10', '7', '20'],
      ['How many years have passed since the catastrophe when the story begins?', '97', '25', '50', '200'],
      ['What catastrophe made Earth uninhabitable?', 'A nuclear war', 'A meteorite', 'A pandemic', 'An ice age'],
      ['Why are the 100 young prisoners sent to Earth?', 'To find out if Earth is habitable again', 'To punish them', 'To look for gold', 'To found an army'],
      ['What do the 100 wear on their wrists to monitor their vital signs?', 'Wristbands', 'Watches', 'Chips under the skin', 'Necklaces'],
      ['What is the craft that takes them down to Earth called?', 'A dropship', 'A moon shuttle', 'A balloon', 'A submarine'],
      ["What is Abby Griffin's job?", 'Doctor', 'Engineer', 'Pilot', 'Guard'],
      ["What is Clarke's father called?", 'Jake', 'Marcus', 'Thelonious', 'Dante'],
      ["What is Bellamy's sister called?", 'Octavia', 'Clarke', 'Raven', 'Harper'],
      ['Where did Octavia live hidden for years?', 'Under the floor', 'In a prison', 'In a hospital', "In the chancellor's house"],
      ["Which Ark law does Octavia break just by existing?", 'Only one child per family', 'No leaving home', 'No studying', 'No singing'],
      ["What is Raven Reyes's job?", 'Mechanic', 'Doctor', 'Pilot', 'Guard'],
      ['What is the name of the Ark’s chancellor?', 'Thelonious Jaha', 'Dante Wallace', 'Marcus Kane', 'Jake Griffin'],
      ["What is Kane's first name?", 'Marcus', 'Thelonious', 'Bellamy', 'John'],
      ["What is Monty's last name?", 'Green', 'Blake', 'Reyes', 'Cole'],
      ["What is Jasper's last name?", 'Jordan', 'Adams', 'Lee', 'Stone'],
      ["What is Harper's last name?", 'McIntyre', 'Miller', 'Hayes', 'Moss'],
      ["What is Finn's last name?", 'Collins', 'Murphy', 'Miller', 'Wells'],
      ["What is Bellamy's last name?", 'Blake', 'Griffin', 'Reyes', 'Jaha'],
      ['What are the people living on Earth that the 100 meet called?', 'The Grounders', 'The Shadows', 'The Landless', 'The Nomads']
    ],
    ar: [
      ['ما اسم الطائرة التي تتحطم على الجزيرة في بداية Lost؟', 'أوشيانيك 815', 'بان أم 103', 'إير فرانس 447', 'الرحلة 370'],
      ['من أين أقلعت رحلة أوشيانيك 815؟', 'سيدني', 'لوس أنجلوس', 'فيجي', 'هاواي'],
      ['أين كان من المفترض أن تهبط رحلة أوشيانيك 815؟', 'لوس أنجلوس', 'نيويورك', 'سيدني', 'هونولولو'],
      ['في أي محيط تتحطم الطائرة؟', 'المحيط الهادئ', 'المحيط الأطلسي', 'المحيط الهندي', 'المحيط المتجمد الشمالي'],
      ['ما الرقم الأكثر تكراراً في Lost؟', '42', '7', '13', '108'],
      ['ما الأرقام التي تتكرر دائماً في Lost؟', '4, 8, 15, 16, 23, 42', '1, 2, 3, 4, 5, 6', '7, 14, 21, 28, 35, 42', '3, 6, 9, 12, 15, 18'],
      ['ما اسم أول حلقة في Lost؟', 'الطيار (Pilot)', 'الفتحة', 'التحطم', 'مرحباً'],
      ['ما اسم كلب والت؟', 'فينسينت', 'ماكس', 'بوب', 'ريكس'],
      ['ما مهنة جاك شيفرد؟', 'جراح', 'طيار', 'شرطي', 'معلم'],
      ['من أي بلد جين وسون؟', 'كوريا الجنوبية', 'اليابان', 'الصين', 'فيتنام'],
      ['ما الاسم الأول للوك؟', 'جون', 'جاك', 'جيمس', 'خوان'],
      ['ما مهنة تشارلي بايس؟', 'موسيقي', 'جراح', 'طيار', 'كاتب'],
      ['ما اسم فرقة تشارلي بايس؟', 'درايف شافت', 'البيتلز', 'أويسس', 'راديوهيد'],
      ['ما لقب هوغو ريس؟', 'هيرلي', 'هوغي', 'هوغو الكبير', 'ريس'],
      ['ما لقب جيمس فورد؟', 'سوير', 'جيمي', 'جيم', 'الزعيم'],
      ['أي ناجية حامل وقت التحطم؟', 'كلير', 'كيت', 'شانون', 'سون'],
      ['ما اسم عائلة كيت؟', 'أوستن', 'فورد', 'شيفرد', 'ريس'],
      ['ما اسم عائلة هيرلي؟', 'ريس', 'بايس', 'جارا', 'دوسون'],
      ['ما اسم عائلة سايد؟', 'جارا', 'حسن', 'كريم', 'نادر'],
      ['ما اسم عائلة تشارلي؟', 'بايس', 'كول', 'هارت', 'ريد'],
      ['ما اسما عائلتي شانون وأخيها غير الشقيق بون؟', 'رذرفورد (شانون) وكارلايل (بون)', 'شيفرد وأوستن', 'بايس وليتلتون', 'فورد وريس'],
      ['ما العلاقة بين شانون وبون؟', 'أخ وأخت بالمصاهرة', 'زوج وزوجة', 'ابنا عم', 'جاران'],
      ['ما العلاقة بين مايكل ووالت؟', 'أب وابن', 'عم وابن أخ', 'أخوان', 'جد وحفيد'],
      ['كم ناجياً تقريباً على الشاطئ في البداية؟', '48', '12', '100', '200'],
      ['على أي قناة أمريكية عُرض Lost؟', 'ABC', 'NBC', 'CBS', 'Fox'],
      ['كم موسماً في Lost؟', '6', '5', '7', '8'],
      ['كم حلقة في Lost؟', '121', '100', '150', '88'],
      ['في أي عام بدأ Lost؟', '2004', '2002', '2006', '2008'],
      ['في أي ولاية أمريكية صُوّر Lost؟', 'هاواي', 'فلوريدا', 'كاليفورنيا', 'ألاسكا'],
      ['من ألّف موسيقى Lost؟', 'مايكل جياكينو', 'هانز زيمر', 'جون ويليامز', 'إنيو موريكوني'],
      ['من أنشأ Lost؟', 'جي جي أبرامز وداميون ليندلوف وجيفري ليبر', 'جوس ويدون', 'فينس غيليغان', 'مات غرونينغ'],
      ['من أنشأ مسلسل The 100؟', 'جيسون روثنبرغ', 'جي جي أبرامز', 'جولي بليك', 'رونالد دي مور'],
      ['على أي قناة أمريكية عُرض The 100؟', 'The CW', 'ABC', 'HBO', 'Netflix'],
      ['كم موسماً في The 100؟', '7', '5', '6', '8'],
      ['كم حلقة في The 100؟', '100', '80', '90', '120'],
      ['في أي عام بدأ The 100؟', '2014', '2012', '2016', '2018'],
      ['من كتب الروايات التي اقتُبس منها The 100؟', 'كاس مورغان', 'سوزان كولينز', 'فيرونيكا روث', 'جيمس داشنر'],
      ['في أي بلد يُصوَّر The 100؟', 'كندا', 'أستراليا', 'الولايات المتحدة', 'نيوزيلندا'],
      ['أين يعيش الـ100 شاب قبل النزول إلى الأرض؟', 'في محطة فضائية (الفُلك)', 'في قاعدة تحت الماء', 'في ملجأ', 'في مستعمرة على المريخ'],
      ['كم محطة تشكّل الفُلك؟', '12', '10', '7', '20'],
      ['كم سنة مرّت منذ الكارثة عند بداية القصة؟', '97', '25', '50', '200'],
      ['ما الكارثة التي جعلت الأرض غير صالحة للعيش؟', 'حرب نووية', 'نيزك', 'وباء', 'عصر جليدي'],
      ['لماذا يُرسل الـ100 سجين شاب إلى الأرض؟', 'لمعرفة هل الأرض صالحة للعيش من جديد', 'لمعاقبتهم', 'للبحث عن الذهب', 'لتأسيس جيش'],
      ['ماذا يرتدي الـ100 في معاصمهم لمراقبة علاماتهم الحيوية؟', 'أساور', 'ساعات', 'شرائح تحت الجلد', 'قلادات'],
      ['ما اسم المركبة التي تنقلهم إلى الأرض؟', 'مركبة إنزال (دروبشيب)', 'مكوك قمري', 'منطاد', 'غواصة'],
      ['ما مهنة آبي غريفين؟', 'طبيبة', 'مهندسة', 'طيارة', 'حارسة'],
      ['ما اسم والد كلارك؟', 'جيك', 'ماركوس', 'ثيلونيوس', 'دانتي'],
      ['ما اسم أخت بيلامي؟', 'أوكتافيا', 'كلارك', 'ريفن', 'هاربر'],
      ['أين عاشت أوكتافيا مختبئة لسنوات؟', 'تحت الأرضية', 'في سجن', 'في مستشفى', 'في بيت المستشار'],
      ['أي قانون في الفُلك تخرقه أوكتافيا بمجرد وجودها؟', 'طفل واحد فقط لكل أسرة', 'ممنوع الخروج', 'ممنوع الدراسة', 'ممنوع الغناء'],
      ['ما مهنة ريفن ريس؟', 'ميكانيكية', 'طبيبة', 'طيارة', 'حارسة'],
      ['ما اسم مستشار الفُلك؟', 'ثيلونيوس جاها', 'دانتي والاس', 'ماركوس كين', 'جيك غريفين'],
      ['ما الاسم الأول لكين؟', 'ماركوس', 'ثيلونيوس', 'بيلامي', 'جون'],
      ['ما اسم عائلة مونتي؟', 'غرين', 'بلاك', 'ريس', 'كول'],
      ['ما اسم عائلة جاسبر؟', 'جوردان', 'آدامز', 'لي', 'ستون'],
      ['ما اسم عائلة هاربر؟', 'ماكنتاير', 'ميلر', 'هايز', 'موس'],
      ['ما اسم عائلة فين؟', 'كولينز', 'ميرفي', 'ميلر', 'ويلز'],
      ['ما اسم عائلة بيلامي؟', 'بلاك', 'غريفين', 'ريس', 'جاها'],
      ['ماذا يسمي الـ100 سكان الأرض الذين يلتقونهم؟', 'الأرضيون (Grounders)', 'الظلال', 'بلا أرض', 'الرحّل']
    ]
  };

  var out = { fr: [], en: [], ar: [] };
  L.forEach(function (l) { F[l].forEach(function (r) { out[l].push(r); }); });
  // personnage ↔ acteur (les gabarits « role » sont des tableaux de 3 textes)
  [[LOST, TPL.lost], [T100, TPL.t100]].forEach(function (pr) {
    var table = pr[0], tpl = pr[1], n = table.length;
    table.forEach(function (row, i) {
      L.forEach(function (l, li) {
        var a = [(i + 1) % n, (i + 4) % n, (i + 7) % n].map(function (k) { return k === i ? (k + 2) % n : k; });
        out[l].push([tpl.who[li].replace('{x}', row[0][li]), row[1][li], table[a[0]][1][li], table[a[1]][1][li], table[a[2]][1][li]]);
        var b = [(i + 2) % n, (i + 5) % n, (i + 8) % n].map(function (k) { return k === i ? (k + 3) % n : k; });
        out[l].push([tpl.role[li].replace('{x}', row[1][li]), row[0][li], table[b[0]][0][li], table[b[1]][0][li], table[b[2]][0][li]]);
      });
    });
  });

  L.forEach(function (l) {
    var have = {};
    SERIES_BANK[l] = [];
    out[l].forEach(function (r) {
      if (have[r[0]]) return;                              // jamais de doublon
      have[r[0]] = 1;
      SERIES_BANK[l].push([r[0], [r[1], r[2], r[3], r[4]], 0]);
    });
  });
})();
