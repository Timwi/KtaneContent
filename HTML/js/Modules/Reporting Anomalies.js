function changeFlavourTexts(languageCode) {
    let flavourTexts;
    switch(languageCode) {
        case "ENG":
            flavourTexts = [
                'I would like 5 anomalies, and 5 MORE anomalies.',
                'Look behind you.',
                'Blink again! I dare you! I double dare you!',
                'Rise from the ashes.',
                'Stop bothering me, I’m on observation duty.',
                'The perfect module for a community renowned for their attention span.',
                'Your family is not safe.',
                '!!HUGE MAN!!',
                '<img src="img/Minecraft Parody/Blanana.png" style="height:32px"> He sees all. Do you?',
                'There are four rooms, you just haven’t reported a Camera Malfunction.',
                'Read that again.',
                'Intruder? I hardly know ‘er.',
                'If I used Object Disappearance on your socks, would you faster notice one sock being gone, or two? Kind of weird if you think about it. Oh, and don’t check your sock drawer.',
                'Does F5 create or remove anomalies?',
                'Hello? Hello, hello? Uhh, I wanted to record a message for you... to help you get settled in on your first night. Um, I actually worked in that office before you. I’m... finishing up my last week now, as a matter of fact, so... I know it can be a bit overwhelming, but I’m here to tell you: there’s nothing to worry about. Uh, you’ll do fine! So... let’s just focus on getting you through your first week. Okay?',
                'You should use Solve to unlure the Anomalies.',
                'Fish has 13.6 hours on Observation Duty 3. Point and laugh, kids.'
            ];
            break;

        case "JA":
            flavourTexts = [
                '5つの異常と、さらに5つの異常が欲しい。',
                '後ろを見ろ。',
                'もう一度まばたきして！ほらやってよ！大事なことなので二回言うよ！',
                '灰の中から立ち上がる。',
                '邪魔しないでくれ、私は監視任務中なんだ。',
                '注目度の高さで知られるこのコミュニティには最適のモジュールだ。',
                'あなたの家族は安全ではない。',
                '！！クソデカい力士！！',
                '<img src="img/Minecraft Parody/Blanana.png" style="height:32px">彼はすべてを見ている。君は？',
                '部屋は4つあるが、カメラの故障を報告していないだけだ。',
                'もう一度読んでくれ。',
                '侵入者？ほとんど知らないよ。',
                'もし私があなたの靴下に「オブジェクトの消失」を使ったら、靴下が1枚消えていることに早く気づくだろうか、それとも2枚消えていることに早く気づくだろうか？考えてみれば奇妙なことだ。あ、靴下の引き出しはチェックしないでね。',
                'F5は異常を作り出したり、取り除いたりするのか？',
                'もしもし？もしもし、もしもし？伝言があってだな…初日の夜は落ち着いてもらえるようにな。実は君より前に あのオフィスで働いてたんだが、実は今、最後の週を終えて…不安だろうが、心配無用！君なら大丈夫だ！だから…とりあえず最初の1週間を乗り切ることに集中しよう。おけ？',
                '異常の除去には解除を使うべきだ。',
                'FishはObservation Duty 3を13.6時間もやってる。指さして笑えよ、ガキども。'
            ];

            break;
        case "FR":
            flavourTexts = [
                'Allez 5 anomalies, ET 5 ANOMALIES DE PLUS.',
                'Derrière-toi.',
                'Vas-y ! Je te défie de cligner ! Je te double-défie de cligner !',
                'Renaît de ses cendres.',
                'Arrête de me faire chier, je suis occupé.',
                'Le module parfait pour une communauté reputée pour sa capacité de concentration.',
                'Ta famille est en danger.',
                '!!MEC BARAQUÉ!!',
                '<img src="img/Minecraft Parody/Blanana.png" style="height:32px"> Il voit tout. Et toi ?',
                'Il y a quatre salles, il faut juste signaler un Disfonctionnement de Caméra.',
                'Relis-ça.',
                '"Intrus" ? Non, je connais pas.',
                'Si je signalais une Disparition sur tes chaussettes, est-ce que tu remarquerais plus vite la disparition de la paire, ou une seule ? Plutôt étrange quand tu y penses. Au fait, ne regarde pas dans ton tiroir à chaussettes.',
                'Est-ce que faire F5 crée ou supprime des anomalies ?',
                'Allô ? Allô, allô ? Heu, je veux juste enregistrer un message pour toi... pour que tu passes tranquillement ta première nuit. Heu, je travaillais ici avant toi. Je viens de... finir ma dernière semaine, pour info, donc... je sais que ce travail peut être un peu stressant, mais je tiens à te le dire : pas la peine de paniquer. Heu, tout ira bien ! Donc... concentrons-nous sur ta première semaine, ok ?',
                'Tu devrais te dépêcher de désamorcer ce module... ils pourraient bien te trouver avant.'
            ];
            break;
    }

    document.querySelector('.flavour-text').innerHTML = flavourTexts[(Math.random() * flavourTexts.length) | 0];
}

function changeTexts(languageCode) {
    let ParagraphOne;
    let ParagraphTwo;
    let ParagraphThree;
    let ParagraphFour;
    let ParagraphFive;
    let ParagraphSix;

    switch(languageCode) {
        case "ENG":
            ParagraphOne = [
                'Throughout the bomb, anomalies may appear in each of the rooms and it is your job to report them.',
                'As you <a href="../More/Ignore Table.html#mod=ReportingAnomalies">solve modules</a> on the bomb, an anomaly may appear in a room. The defuser must report that anomaly whenever it is present.',
                'Every time you <a href="../More/Ignore Table.html#mod=ReportingAnomalies">solve a module</a>, there is a chance that an anomaly comes into existence. Reporting the anomaly correctly will remove it.'
            ];
            
            ParagraphTwo = [
                'The chance for an anomaly to appear between solves is between 30 and 40 percent.',
                'The chance for an anomaly to appear between solves is between 30% and 40%.',
                'The chance for an anomaly to appear between solves is between thirty and forty percent.'
            ];
            
            ParagraphThree = [
                'If there are three active anomalies, a warning will be displayed alerting the defuser that they are in danger. This will only appear once and will be nullified if it occurs during the startup sequence.',
                'If the defuser allows for at least three active anomalies, there will be a warning alerting the defuser about the active anomalies. This will appear once, and never during the startup sequence.',
                'If you manage to miss at least three active anomalies, a warning will appear to signify that there are anomalies unaccounted for. This will only appear once and will be nullified if it occurs during the startup sequence.'
            ];
            
            ParagraphFour = [
                'Defusing all modules (with some exceptions) AND having no active anomalies will secure your safety as a watchman.',
                'If all modules have been defused (with some exceptions) and there are no active anomalies, then the module will disarm.',
                'When all modules are defused and all anomalies are reported, the module will be disarmed.'
            ];
            
            ParagraphFive = [
                'If multiple Reporting Anomalies are on a bomb, exactly one of them will be fully functional (i.e. only one of them can report the anomalies.)',
                'If multiple of this mod appear, only one of them will have the reporting functionality.',
                'If there are multiple Reporting Anomalies modules present, then only one of them will be able to report potential anomalies.'
            ];
            
            ParagraphSix = [
                'The duplicates will be able to act as extra monitors, allowing the defuser to view multiple rooms at once (at the cost of increased lag.)',
                'Duplicate mods can act as extra monitors, permitting the defuser to view multiple rooms simultaneously (at the cost of increased lag.)',
                'Extra Reporting Anomalies Modules will allow the defuser to use them as spare cameras, allowing them to view multiple rooms at once (at the cost of increased lag.)'
            ];
            break;

        case "JA":
            ParagraphOne = [
                '爆弾処理中、各部屋に異常が現れることがあり、それを報告するのがあなたの仕事だ。',
                '<a href="../More/Ignore Table.html#mod=ReportingAnomalies">無視されないモジュール</a>を解除するたびに、ある部屋に異常が1つ現れる可能性がある。異常があったら、処理担当者は毎回その異常を報告しなければならない。',
                '<a href="../More/Ignore Table.html#mod=ReportingAnomalies">無視されないモジュール</a>が解除されるたびに異常が1つ発生する可能性がある。その異常を正しく報告することで、異常が取り除かれる。'
            ];
            
            ParagraphTwo = [
                '解除間に異常が現れる確率は三十パーセントから四十パーセントである。',
                '解除間に異常が現れる確率は30％から40％である。',
                '解除間に異常が現れる確率は30~40パーセントである。'
            ];
            
            ParagraphThree = [
                '異常が3つある場合、警告が表示され、処理担当者に危険が迫っていることを警告する。これは一度だけ表示され、起動シーケンス中に発生した場合は無効となる。',
                '処理担当者が少なくとも3つの異常を見逃している場合、異常を警告する警告が表示される。この警告は一度だけ表示され、起動シーケンス中に表示されることはない。',
                '異常を3つ以上見逃すと、未発見の異常があることを示す警告が表示される。この警告は1回のみ表示され、起動中に表示された場合は無効となる。'
            ];
            
            ParagraphFour = [
                'すべてのモジュールを解除し(例外あり）、かつ異常がなければ、監視員としての安全は確保される。',
                'すべてのモジュールが解除され（一部の例外を除く）、異常がない場合、モジュールは解除される。',
                'すべてのモジュールが解除され、すべての異常が報告されると、モジュールは解除される。'
            ];
            
            ParagraphFive = [
                '爆弾に複数の「異常報告」モジュールが搭載されている場合、そのうちの1つだけが完全に機能する（つまり、異常を報告できるのは1つだけ）。',
                'このMODが複数現れた場合、報告機能を持つのはそのうちの1つだけである。',
                '複数の「異常報告」モジュールが存在する場合、異常の可能性を報告できるのはそのうちの1つだけである。'
            ];
            
            ParagraphSix = [
                '重複モジュールは追加モニターとして機能し、処理担当者が一度に複数の部屋を見ることができるようになる（その代償としてラグが増加する）。',
                '重複したMODは追加モニターとして機能し、処理担当者は複数の部屋を同時に見ることができる（その代償としてラグが増加する）。',
                '「異常報告」モジュールを追加すると、処理担当者は予備のカメラとして使用できるようになり、一度に複数の部屋を見ることができるようになる（その代償としてラグが増加する）。'
            ];
            break;

        case "FR":
            ParagraphOne = [
                'Tout au long de la bombe, des anomalies peuvent apparaître dans une des salles du module et il faut les signaler.',
                'En <a href="../More/Ignore Table.html#mod=ReportingAnomalies">désamorçant des modules</a>, une anomalie peut apparaître dans une des salles. Le désamorceur doit les signaler.',
                'À chaque <a href="../More/Ignore Table.html#mod=ReportingAnomalies">désamorçage de module</a>, une anomalie peut apparaître dans une des salles. Signaler correctement une anomalie la fera disparaître.'
            ];
            
            ParagraphTwo = [
                'À chaque désamorçage de module, une anomalie a entre 30 et 40 pourcent de chance de faire son apparition.',
                'À chaque désamorçage de module, une anomalie a entre 40% et 50% de chances de faire son apparition.',
                'À chaque désamorçage de module, une anomalie a entre trente et quarente pourcent de chance de faire son apparition.'
            ];
            
            ParagraphThree = [
                'Si il y a trois anomalies actives, une alerte sera diffusée indiquant un danger au désamorceur. Cette alerte sera diffusée une seule et unique fois et ne pourra pas être diffusée lors du démarrage.',
                'Si le désamorceur laisse apparaître trois anomalies, une alerte sera diffusée indiquant la présence de ces anomalies. Cette alarme est unique et ne pourra pas être diffusée lors du démarrage.',
                'Si le désamorceur laisse passer au moins trois anomalies, une alerte sera diffusée indiquant le non-signalement de ces anomalies. Cette alarme sera diffusée une seule et unique fois et ne pourra pas être diffusée lors du démarrage.'
            ];
            
            ParagraphFour = [
                'Désamorcer tous les modules (avec quelques exceptions) ET la non-présence des anomalies désamorcera le module.',
                'Si tous les modules ont été désamorcés (avec quelques exceptions) et que toutes les anomalies ont été signalées, le module se désamorcera.',
                'Quand tous les modules sont désamorcés et que toutes les anomalies ont été signalées, le module sera désamorcé.'
            ];
            
            ParagraphFive = [
                'Si plusieurs modules de ce type apparaissent, seulement un de ces modules sera complètement fonctionnel (seulement un des modules pourra signaler des anomalies.)',
                'Si ce mod apparaît plusieurs fois sur une bombe, seulement un de ces mods pourra signaler des anomalies.',
                'Si ce module apparaît plusieurs fois, seulement un de ces modules pourra signaler de potentielles anomalies.'
            ];
            
            ParagraphSix = [
                'Les modules supplémentaires peuvent servir de caméras en plus, permettant au désamorceur de surveiller plusieurs salles en même temps (au coût de forts lags.)',
                'En cas de plusieurs mods de ce type, ceux-ci peuvent servir comme des caméras supplémentaires, permettant de surveiller plusieurs salles en même temps (au coût de forts lags.)',
                'Ces modules en plus peuvent servir de caméras supplémentaires, permettant de surveiller plusieurs salles simultanément (au coût de forts lags.)'
            ];
        break;
    }

    document.querySelector('.ParagraphOne').innerHTML = ParagraphOne[(Math.random() * ParagraphOne.length) | 0];
    document.querySelector('.ParagraphTwo').innerText = ParagraphTwo[(Math.random() * ParagraphTwo.length) | 0];
    document.querySelector('.ParagraphThree').innerText = ParagraphThree[(Math.random() * ParagraphThree.length) | 0];
    document.querySelector('.ParagraphFour').innerText = ParagraphFour[(Math.random() * ParagraphFour.length) | 0];
    document.querySelector('.ParagraphFive').innerText = ParagraphFive[(Math.random() * ParagraphFive.length) | 0];
    document.querySelector('.ParagraphSix').innerText = ParagraphSix[(Math.random() * ParagraphSix.length) | 0];
}

function changeSvg() {
    let svgs = ["Bedroom", "Library", "Living Room"];
    document.querySelector('.diagram').src = `img/Component/Reporting Anomalies/${svgs[(Math.random() * svgs.length) | 0]}.svg`;
}
