# V2-F3-B2 三女神戦 Combat Candidate 1

元の設計metadata（HP55,000 / 48,000 / 60,000）は保存し、ユーザーの承認に従って戦闘専用HP/DEFを実測調整した。Lv80以上のみ。rice/dusk/tender固定ID・原画像013/014/015を使用し、HSL変換なし。通常13boss・goldの戦闘能力と報酬は変更していない。

## 能力値

Lv80–89は90%、90–99は95%、100は100%。小数は四捨五入。SP9999固定。STR/INT/AGI/DEX/LUCは元metadataのscaledStatsを保持し、既存collectStatsにより全員・全対象Lvで実効30になる。AGIの差は技速度、INTの差は技威力と段階強化で表現する。

|女神|Lv|HP|DEF|ATK|magicDefense設計値|実効魔法軽減|EXP|G|
|---|---:|---:|---:|---:|---:|---:|---:|---:|
|ルミナ|80|9000|59|72|95|19%|22500|4500|
|ルミナ|90|9500|62|76|100|20%|23750|4750|
|ルミナ|100|10000|65|80|105|21%|25000|5000|
|ノクティア|80|8100|45|50|113|22.6%|22500|4500|
|ノクティア|90|8550|48|52|119|23.8%|23750|4750|
|ノクティア|100|9000|50|55|125|25%|25000|5000|
|ゼレーナ|80|10800|63|50|104|20.8%|27000|5400|
|ゼレーナ|90|11400|67|52|109|21.8%|28500|5700|
|ゼレーナ|100|12000|70|55|115|23%|30000|6000|

主要能力の元Lv100値（STR/INT/AGI/DEX/LUC）：ルミナ115/105/100/110/120、ノクティア80/130/125/115/105、ゼレーナ95/120/105/100/115。DEFのみ戦闘Candidate別値。magicDefense自体は既存engineが直接読まないため、magicDefense/500を既存magicDamageReductionへ変換する。

## 行動

抽選weightは使用可能な技の間で再正規化する。回復/強化/再生は各2回、障壁は3回まで。回復はHP80%以下、障壁は残量0の場合のみ。長期戦で回復し続ける状態を避けた。全大技は1行動前に予告し、既存guardで対処可能。

|女神|技とweight|方式|
|---|---|---|
|ルミナ|通常攻撃20|1Hit物理×1|
|ルミナ|黄金雷閃25|雷spellPower65|
|ルミナ|稲妻の双刃25|雷2Hit物理、各0.8倍|
|ルミナ|豊穣の光15|最大HP5%回復＋主要状態異常解除、cooldown8|
|ルミナ|黄金の稲穂10|続く3行動の攻撃威力1.1倍、cooldown5|
|ルミナ|天穹雷霆5|予告→雷spellPower115|
|ノクティア|ノクティス25|既存闇属性spellPower70、速度+12|
|ノクティア|夜露の雫20|SP25吸収、実吸収量だけ自身SP回復、速度+12|
|ノクティア|宵闇15|闇spellPower20＋速度低下65%基礎率|
|ノクティア|月蝕15|闇spellPower30＋DEF25%低下65%基礎率|
|ノクティア|夜の帳15|既存固定障壁180、cooldown6|
|ノクティア|夜天星葬10|予告→闇spellPower120、速度+12|
|ゼレーナ|シルワンエメラ25|自然の代用に既存earth、spellPower60|
|ゼレーナ|若葉の息吹20|最大HP4%回復＋主要状態異常解除、cooldown10|
|ゼレーナ|翠緑障壁15|既存固定障壁250、cooldown6|
|ゼレーナ|森羅の蔦15|earth spellPower25＋速度低下60%基礎率|
|ゼレーナ|萌芽15|3回、最大HP1%再生。使用した行動末から発動。cooldown12|
|ゼレーナ|大樹の審判10|予告→既存holy spellPower105|

ルミナはHP50%以下で雷威力1.2倍、会心率+0.08、技速度+12（予告済み大技にも適用）。ノクティアはHP30%以下で1ターンにつき魔法倍率+4%、最大+40%。ゼレーナは最初のHP0で30%復活し、報酬/撃破演出/portalを保留。通常攻撃・NPC追撃・複数敵outcomeに共通の復活判定を置いた。

即死/石化は無効。毒/出血90、猛毒/死毒/行動不能/感電/魅了95、速度/charge系DEF低下75の耐性点。非無効の確率には既存下限5%がある。既存のguaranteedなDEF低下技は確定成功の仕様を維持する。各属性倍率は1。スコルピオ直付与は三女神だけ1%に下げ、死毒は最大HP依存ではなく最大MapLv×0.8ダメージ/行動、他の毒/出血はMapLv×0.4で上限化。完全無効にはしない。逃走不可、敵自身の逃走なし。

## 探索・報酬

B3F金箱→鍵→施錠扉→BOSSセル、survey保存と100/300達成通知終了後に戦闘開始。sourceはspecial-map-v2-special-boss、theme/boss/map identity/Lv/floorを保持する。一般ecologyには追加しない。
勝利後は同じ位置・向き・torch・survey・鍵/扉を保持したB3Fへ戻り、session内bossDefeatedで再戦を防止。portalをA/Enterで使用するとB1F入口。EXPはbattleExperience、Gはsession LOT BAGへ一度だけ蓄積。帰還時LOT BAG→EXP SETTLEMENT（地図Lv/女神カード）→雇用更新。敗北は既存寺院処理、女神カードEXP保護・survey保存再試行・通常奈落の保留EXP分離を維持。
永続clear/次地図/pendingReward/専用dropは未実装。帰還後の再入場は再戦可。

## 表示・BGM

- 甲虫王：黄金の強い光彩と粒子。ルミナ：金の稲穂、ノクティア：紫の夜露、ゼレーナ：緑の若葉。探索と戦闘の両方に実行時canvas演出。AVIF原画像を変更しない。
- お気に入りは地図名の後ろに半角スペース＋黄色い「⭐」。
- 三女神戦背景：images/battle_effects/magic_circle.avif、不透明度0.8、80秒で1回転。動きを減らすOS設定では静止。
- BGM：アマイェナク/エルツデモーニンと同じfinalBoss、bgm/tozasareshi-seisen.mp3。
- 最終撃破：「呼べ、女神の名を」のtvOffと同じcollapse500ms、演出1500ms。ゼレーナの初回復活では発火しない。

## 実測条件と限界

tools/simulate-map-goddesses.mjsで本番battle engineを使用。3女神×MapLv80/90/100×4職×4カード条件×固定乱数10試行＝1,440戦。NPCはアレク/レベッカ/エリカ成長9、B90装備+3、回復薬40、予告大技には防御する自動方針。
標準はプレイヤーLv=MapLv、合法デッキ（魔力障壁/帰還加護系L＋能力強化SR2枚、cost20）。スコルピオ比較はSR1枚を差替えcost24。Z6はプレイヤーLv200・cost48。NPC/装備を揃えた準備済み条件であり、同Lvの新規プレイヤー全員の勝利を保証する試験ではない。
Z6職別（共通サジタリウス/リブラ/カプリコーン/スコルピオ）：戦士レオ/タウラス、盗賊ジェミニ/ピスケス、魔術師ジェミニ/ヴァルゴ、僧侶ジェミニ/タウラス。スコルピオなしはピスケスへ交換（盗賊はタウラス）。個別カードID/所持枚数/コストはスクリプトのassertで合法性を検証。

|女神|条件|勝利/120|平均T|最大T|
|---|---|---:|---:|---:|
|rice|standard|108/120|47.4|80|
|rice|standard-scorpio|110/120|50.3|89|
|rice|z6|120/120|26.1|60|
|rice|z6-no-scorpio|120/120|26.6|64|
|dusk|standard|120/120|44.5|69|
|dusk|standard-scorpio|120/120|46.0|70|
|dusk|z6|120/120|23.9|62|
|dusk|z6-no-scorpio|120/120|26.1|61|
|tender|standard|120/120|97.9|137|
|tender|standard-scorpio|120/120|100.8|139|
|tender|z6|120/120|52.8|113|
|tender|z6-no-scorpio|120/120|54.7|112|

200T到達0、満タンHP以上の単発ダメージ0。ゼレーナは標準で約98～101T、僧侶Z6でも最大113Tで、強構成25～50Tの目安を全職で満たしたわけではない。耐久型としては成立したが、職差/再生量は実機で追加調整する余地がある。スコルピオなしでも全Z6試行勝利。標準比較は差し替えカードの能力差も含むため純粋な死毒効果だけではない。

各条件の中央値/残HP/回復回数/boss回復量/障壁量/状態異常試行と成功/死毒総ダメージ/復活前後ターン/phase前後被ダメはartifacts/special-map-goddess-pacing.jsonに保存。phaseダメージ平均には技抽選/防御/NPC等も混ざるため、固有補正そのものは別途単体テストで1.2倍/最大1.4倍を確認した。

## 自動・ブラウザ検証

- Node全1,932件成功、失敗0。固定選出、Lv拒否、原画像/HSL不使用、cap30、phase/growth、復活、NPC致死追撃、二重報酬、帰還/敗北保存失敗再試行、通常boss/gold/F2等を含む。
- Python29件成功、失敗0、2件スキップ。
- Edge headless PC1280px/390px ×3女神：既存Format3コード入力→登録→再読込→詳細→B1/B2/B3→金箱→鍵扉→戦闘→勝利→portal→帰還→LOT BAG→EXP→雇用更新を通過。ゼレーナ390px再検証でTV消灯が最終撃破時1回のみであることを確認。原画像ロード、専用wall、魔法陣80%・80秒回転を検査し、スクリーンショットを確認。
- ブラウザの勝利遷移試験ではHP1/待機行動の短縮fixtureを使用。ゼレーナは復活を挟んで2回撃破する。本番戦闘能力の測定は上記1,440戦に分離。iPhone/USBパッド実機は未確認。

## 互換性監査

Candidate3全65,536seed構造SHA c1dbc28cf7bfc9f78fffa32281d8d001b4b0a1a8f1aa2f146cb5d0a5559f0e95、seed12345 fingerprint3519b715不変。
Ecology Candidate2全seed同条件監査SHA ab38d1e17e4f8d47c8fc89d895e20ed4eba33cc6e781db35cc0aac4a66a17dca不変。
V1 ecology全seed監査SHA 04c4c6902ef72c567a2166d4b4bd41d83b7ca89eab99a8926b0ceaa5d7c96a8a不変。
V1 topology b985066f1fb5720c8f27c56d925e58d700af9d637d90cd2c6e0fc33ce0920e58、legacy topology 3d92b41f2e2994ca08e40626cd85e498a20c8c0dfc1a135c32472641805df592、V1 doors 6a625e0aac5a8c87367c2ab52e46570dcb195e4260ecb7cacc4f1167c81f693f不変。
Format2/3の既存fixtureを変更せず全テスト成功。

## 既存実機コード（全てLv100 WHITE seed12345）

- rice: `NDA:AwIwOWQAAQMgIDDrMOvJeb24h94aUg`
- dusk: `NDA:AwIwOWQAAgMgIDDrMOsPWBe6V1vKYg`
- tender: `NDA:AwIwOWQAAwMgIDDrMOsc7kfnblX1MQ`

## 変更ファイル

- `combat/battle-engine.js`
- `combat/npc-support.js`
- `css/battle.css`
- `data/enemies.js`
- `data/karte-gold-boss.js`
- `data/karte-special-bosses.js`
- `js/battle.js`
- `js/enemy-ambient-effects.js`
- `js/explorer-preview-ui.js`
- `js/main.js`
- `js/renderer.js`
- `js/special-map/boss-encounter-v2.js`
- `js/special-map/boss-sparkles.js`
- `tests/browser/special-map-format3.mjs`
- `tests/explorer-touch.test.mjs`
- `tests/special-map-format3.test.mjs`
- `tests/special-map-gold-boss.test.mjs`
- `tests/special-map-special-themes.test.mjs`
- `tests/special-map-v2-experience.test.mjs`
- `artifacts/special-map-goddess-pacing.json`
- `combat/karte-goddesses.js`
- `data/karte-goddess-bosses.js`
- `js/special-map/goddess-presentation.js`
- `tests/browser/special-map-goddesses.mjs`
- `tests/special-map-goddess-boss.test.mjs`
- `tools/simulate-map-goddesses.mjs`
- `docs/special-map-goddesses-f3-b2.md`

ユーザーが更新した特殊theme壁6枚は保持し、本作業では編集していない。LAST UPDATE、コミット、pushは変更していない。

## Lv・職業別結果

|theme|Lv|職|条件|勝利/10|平均T|中央値|最大T|残HP平均|回復回数|boss回復|障壁生成|死毒ダメージ|
|---|---:|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
|rice|80|warrior|standard|10|43.4|41|60|216.8|7.1|855|0|0|
|rice|80|warrior|standard-scorpio|10|41.3|41.5|62|243.8|7.7|765|0|64|
|rice|80|warrior|z6|10|17.1|17|19|1359.2|0|495|0|19.2|
|rice|80|warrior|z6-no-scorpio|10|16.9|17|18|1327.1|0|405|0|0|
|rice|80|thief|standard|10|33.7|33.5|39|190.7|7.2|765|0|0|
|rice|80|thief|standard-scorpio|10|36.2|36|41|185.9|8.8|810|0|83.2|
|rice|80|thief|z6|10|9.5|9.5|11|822.4|0|225|0|0|
|rice|80|thief|z6-no-scorpio|10|9.1|9|11|1240.9|0|180|0|0|
|rice|80|mage|standard|3|29.6|30.5|56|50.7|9.5|540|0|0|
|rice|80|mage|standard-scorpio|4|29.6|22|53|54|10|450|0|64|
|rice|80|mage|z6|10|21|21.5|24|786|0|495|0|57.6|
|rice|80|mage|z6-no-scorpio|10|19|19.5|22|801.8|0|180|0|0|
|rice|80|priest|standard|8|66.9|70.5|76|114.6|23.8|900|0|0|
|rice|80|priest|standard-scorpio|10|70.2|68|86|168.3|24.6|900|0|584.4|
|rice|80|priest|z6|10|49.6|50|60|1085.5|0|810|0|595.2|
|rice|80|priest|z6-no-scorpio|10|54.1|54|59|1113|0|855|0|0|
|rice|90|warrior|standard|10|43.8|41|56|261|5.9|950|0|0|
|rice|90|warrior|standard-scorpio|10|50.2|49|59|292.1|7.3|950|0|129.6|
|rice|90|warrior|z6|10|18|18|20|1307.6|0|522.5|0|21.6|
|rice|90|warrior|z6-no-scorpio|10|17.7|18|19|1306.6|0|427.5|0|0|
|rice|90|thief|standard|10|33|34.5|38|236.8|5.7|807.5|0|0|
|rice|90|thief|standard-scorpio|10|36.3|35.5|45|233.3|7.1|855|0|288|
|rice|90|thief|z6|10|10.5|10.5|12|813|0|332.5|0|7.2|
|rice|90|thief|z6-no-scorpio|10|9.8|10|11|1225|0|190|0|0|
|rice|90|mage|standard|8|43.2|47|55|118.2|15|855|0|0|
|rice|90|mage|standard-scorpio|8|49.8|49.5|60|123.4|18.3|902.5|0|172.8|
|rice|90|mage|z6|10|23.8|25|26|793|0|617.5|0|64.8|
|rice|90|mage|z6-no-scorpio|10|22.4|22.5|26|790|0|332.5|0|0|
|rice|90|priest|standard|10|73.3|75.5|80|185|22.7|950|0|0|
|rice|90|priest|standard-scorpio|10|75.1|74|85|199.2|21.8|950|0|136.8|
|rice|90|priest|z6|10|52.6|52|57|1086|0|950|0|626.4|
|rice|90|priest|z6-no-scorpio|10|56.5|56|64|1096.9|0|902.5|0|0|
|rice|100|warrior|standard|10|42.4|42|54|301.5|4.3|1000|0|0|
|rice|100|warrior|standard-scorpio|10|47.3|47|53|286.6|6.7|1000|0|56|
|rice|100|warrior|z6|10|18.7|19|21|1318.8|0|500|0|48|
|rice|100|warrior|z6-no-scorpio|10|18.6|19|20|1318.9|0|450|0|0|
|rice|100|thief|standard|10|34.8|35|40|228|6.3|900|0|0|
|rice|100|thief|standard-scorpio|10|38.9|39.5|43|226.2|7.2|950|0|256|
|rice|100|thief|z6|10|11.7|11.5|14|813.3|0|400|0|8|
|rice|100|thief|z6-no-scorpio|10|10.4|10|12|1231.3|0|200|0|0|
|rice|100|mage|standard|9|50.5|52|63|146.6|15.9|1000|0|0|
|rice|100|mage|standard-scorpio|8|51.4|49.5|62|148.3|18.3|950|0|224|
|rice|100|mage|z6|10|25.2|26|28|792.7|0|700|0|88|
|rice|100|mage|z6-no-scorpio|10|25|25.5|28|797.5|0|400|0|0|
|rice|100|priest|standard|10|74|73.5|80|175.8|20.8|1000|0|0|
|rice|100|priest|standard-scorpio|10|77.6|76.5|89|180.1|23.2|1000|0|48.1|
|rice|100|priest|z6|10|54.9|54|60|1107.4|0|1000|0|720|
|rice|100|priest|z6-no-scorpio|10|59.2|59|64|1103.4|0|950|0|0|
|dusk|80|warrior|standard|10|43.2|46|51|314.7|0|0|450|0|
|dusk|80|warrior|standard-scorpio|10|41.1|42.5|52|305.4|0|0|522|0|
|dusk|80|warrior|z6|10|16.4|16.5|18|1340.8|0|0|198|115.2|
|dusk|80|warrior|z6-no-scorpio|10|16.7|16.5|19|1329.2|0|0|180|0|
|dusk|80|thief|standard|10|37.2|37|50|251.8|0|0|468|0|
|dusk|80|thief|standard-scorpio|10|41.1|37.5|62|251.2|0|0|504|108.7|
|dusk|80|thief|z6|10|8.8|9|10|833.8|0|0|72|70.4|
|dusk|80|thief|z6-no-scorpio|10|10.3|9|17|1259.6|0|0|126|0|
|dusk|80|mage|standard|10|37.3|36.5|56|169.3|0.1|0|396|0|
|dusk|80|mage|standard-scorpio|10|40.1|41|48|178.3|0.2|0|468|249.6|
|dusk|80|mage|z6|10|21.7|18.5|36|802.6|0|0|288|179.8|
|dusk|80|mage|z6-no-scorpio|10|21.1|18.5|40|801.7|0|0|270|0|
|dusk|80|priest|standard|10|57.3|56.5|65|220.1|0|0|522|0|
|dusk|80|priest|standard-scorpio|10|56|56.5|63|223.6|0|0|486|281.6|
|dusk|80|priest|z6|10|44|42.5|56|1117.5|0|0|486|1131.8|
|dusk|80|priest|z6-no-scorpio|10|50.6|51|55|1107.4|0|0|522|0|
|dusk|90|warrior|standard|10|42.3|40|60|351.6|0|0|432|0|
|dusk|90|warrior|standard-scorpio|10|41.5|42|53|350.1|0|0|504|337.2|
|dusk|90|warrior|z6|10|17.2|17|19|1369|0|0|234|129.6|
|dusk|90|warrior|z6-no-scorpio|10|17.2|17.5|19|1363.2|0|0|180|0|
|dusk|90|thief|standard|10|35.8|36|44|301.4|0|0|450|0|
|dusk|90|thief|standard-scorpio|10|38.1|38.5|55|309.7|0|0|432|172.8|
|dusk|90|thief|z6|10|9.1|9|10|831.7|0|0|72|79.2|
|dusk|90|thief|z6-no-scorpio|10|10.8|9|17|1259.9|0|0|144|0|
|dusk|90|mage|standard|10|41|39.5|62|220.6|0|0|450|0|
|dusk|90|mage|standard-scorpio|10|42.4|43|57|216.4|0|0|468|385.6|
|dusk|90|mage|z6|10|23.7|20.5|39|799.6|0|0|288|230.4|
|dusk|90|mage|z6-no-scorpio|10|23|20.5|41|808.8|0|0|270|0|
|dusk|90|priest|standard|10|59.6|60|67|260.6|0|0|540|0|
|dusk|90|priest|standard-scorpio|10|62|63.5|69|251.7|0|0|540|266.4|
|dusk|90|priest|z6|10|45.6|43.5|60|1109.5|0|0|522|1312.1|
|dusk|90|priest|z6-no-scorpio|10|53.2|53|58|1107.7|0|0|522|0|
|dusk|100|warrior|standard|10|43.2|46|53|398.4|0|0|504|0|
|dusk|100|warrior|standard-scorpio|10|45.5|46.5|58|406.4|0|0|522|224|
|dusk|100|warrior|z6|10|17.9|18|20|1369.6|0|0|234|160|
|dusk|100|warrior|z6-no-scorpio|10|18.3|18|20|1351.1|0|0|216|0|
|dusk|100|thief|standard|10|32.9|34.5|41|341.9|0|0|378|0|
|dusk|100|thief|standard-scorpio|10|38.2|37.5|56|336.9|0|0|396|177.5|
|dusk|100|thief|z6|10|9.8|10|11|833.5|0|0|108|95.6|
|dusk|100|thief|z6-no-scorpio|10|11.3|10|19|1258.3|0|0|144|0|
|dusk|100|mage|standard|10|43.1|41|67|239.7|0|0|468|0|
|dusk|100|mage|standard-scorpio|10|46.5|44|69|252.4|0|0|468|304|
|dusk|100|mage|z6|10|26.1|23.5|42|806.5|0|0|342|299.5|
|dusk|100|mage|z6-no-scorpio|10|25.1|23|45|803.7|0|0|270|0|
|dusk|100|priest|standard|10|60.9|60.5|69|292.4|0|0|504|0|
|dusk|100|priest|standard-scorpio|10|59.6|61|70|287.7|0|0|540|664|
|dusk|100|priest|z6|10|46.7|43.5|62|1102.3|0|0|522|1498.4|
|dusk|100|priest|z6-no-scorpio|10|55.7|56|61|1108.9|0|0|522|0|
|tender|80|warrior|standard|10|87.2|84.5|102|316.2|0|1492|750|0|
|tender|80|warrior|standard-scorpio|10|83.9|81.5|107|322.9|0|1484.8|750|141.5|
|tender|80|warrior|z6|10|29.3|30|33|1362.7|0|1382.4|550|38.4|
|tender|80|warrior|z6-no-scorpio|10|28.8|30|32|1359.7|0|1328.4|625|0|
|tender|80|thief|standard|10|89.2|87|113|275.3|0|1512|750|0|
|tender|80|thief|standard-scorpio|10|92.8|90.5|116|278|0|1512|750|467.9|
|tender|80|thief|z6|10|24.1|22|32|838.1|0|1047.6|475|140.8|
|tender|80|thief|z6-no-scorpio|10|22.6|22.5|30|1261.5|0|972|425|0|
|tender|80|mage|standard|10|96.1|91|117|202.9|0|1510.4|750|0|
|tender|80|mage|standard-scorpio|10|101|98|119|194.3|0|1511.1|750|198.4|
|tender|80|mage|z6|10|53.8|52.5|69|799|0|1407.4|700|262.4|
|tender|80|mage|z6-no-scorpio|10|59.3|56.5|77|803.5|0|1391.5|675|0|
|tender|80|priest|standard|10|109.9|111|126|240.9|0|1510.8|750|0|
|tender|80|priest|standard-scorpio|10|112.3|115|125|240.7|0|1475.6|750|873.7|
|tender|80|priest|z6|10|94.1|93|105|1114|0|1504.4|750|665.6|
|tender|80|priest|z6-no-scorpio|10|97.7|98.5|102|1116|0|1485.8|750|0|
|tender|90|warrior|standard|10|90.8|88.5|107|366.5|0|1573|750|0|
|tender|90|warrior|standard-scorpio|10|82.1|84|102|358.4|0|1563.8|750|115.3|
|tender|90|warrior|z6|10|31|31|33|1346.3|0|1527.6|600|43.2|
|tender|90|warrior|z6-no-scorpio|10|30.2|30.5|33|1350.6|0|1447.8|675|0|
|tender|90|thief|standard|10|86.3|84.5|103|306.5|0|1596|750|0|
|tender|90|thief|standard-scorpio|10|91.9|91|111|305.8|0|1596|750|606.3|
|tender|90|thief|z6|10|25|23.5|31|835.1|0|1185.6|575|187.2|
|tender|90|thief|z6-no-scorpio|10|24.7|24|34|1258.9|0|1174.2|500|0|
|tender|90|mage|standard|10|100.1|98|119|229.8|0|1572.2|750|0|
|tender|90|mage|standard-scorpio|10|105.8|101.5|131|229.4|0|1562.5|750|246.4|
|tender|90|mage|z6|10|57.8|54|76|804.6|0|1503.5|700|338|
|tender|90|mage|z6-no-scorpio|10|63.1|58|80|803|0|1547.3|725|0|
|tender|90|priest|standard|10|114|114.5|126|275.2|0|1592.9|750|0|
|tender|90|priest|standard-scorpio|10|127.3|128|137|268.2|0|1550.2|750|158.4|
|tender|90|priest|z6|10|96.6|97|108|1113.4|0|1586.3|750|979.5|
|tender|90|priest|z6-no-scorpio|10|100.5|100.5|106|1100.8|0|1566|750|0|
|tender|100|warrior|standard|10|92.2|90|104|401.7|0|1654|750|0|
|tender|100|warrior|standard-scorpio|10|83.8|83|95|404.2|0|1642.8|750|613.7|
|tender|100|warrior|z6|10|31.5|31.5|34|1363.7|0|1608|600|48|
|tender|100|warrior|z6-no-scorpio|10|31.4|31|33|1334.7|0|1560|725|0|
|tender|100|thief|standard|10|83.8|80.5|108|337.3|0|1680|750|0|
|tender|100|thief|standard-scorpio|10|91.1|90|108|346.1|0|1680|750|483|
|tender|100|thief|z6|10|27.3|26|33|840.1|0|1344|600|242.6|
|tender|100|thief|z6-no-scorpio|10|26.1|25|33|1263.9|0|1332|625|0|
|tender|100|mage|standard|10|106|102.5|125|256.2|0|1648.6|750|0|
|tender|100|mage|standard-scorpio|10|105.1|105|132|261.5|0|1639.6|750|568|
|tender|100|mage|z6|10|61.4|60.5|76|801.5|0|1626.3|750|484.6|
|tender|100|mage|z6-no-scorpio|10|67.7|65|85|807|0|1627.7|750|0|
|tender|100|priest|standard|10|118.9|117.5|137|303.2|0|1673.3|750|0|
|tender|100|priest|standard-scorpio|10|132|132.5|139|301.5|0|1624.9|750|114.7|
|tender|100|priest|z6|10|101.7|99|113|1111.3|0|1666.8|750|805|
|tender|100|priest|z6-no-scorpio|10|104.2|104.5|112|1103.1|0|1643|750|0|
