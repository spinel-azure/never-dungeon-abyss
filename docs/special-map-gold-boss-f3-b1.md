# V2-F3-B1 — gold固定ボス戦 Candidate 1

## 実装範囲

goldのB3F最奥を `karte_boss_maikaefer_koenig`／デアグローセ・ケーファーケーニヒへ接続した。素材READMEの016指定に従う。通常species `maikaefer_koenig` の名前・能力・報酬・画像・ecologyは変更していない。通常13bossの選出・能力も変更していない。

`rice / dusk / tender` は引き続き battleEnabled=false。最奥ではF3-B2予定メッセージで止まる。永続clear、次地図、pendingReward、専用アイテム、正式解禁は未接続。

## 開発用の起動

町で既存デバッグ画面の地図ページを開き、「探検家テスト」をONにする。そのページにある「【開発用】gold Lv60を探索」「Lv80を探索」「Lv100を探索」から開始できる。seed=12345、rarity=WHITE。通常どおりB1Fから歩き、鍵と扉を経由する。

入口APIは `developmentMapOptions({themeId:'gold',level,seed,rarity})`。テストOFFでは拒否する。探索中・戦闘中・通常奈落内からの重複起動も拒否する。

地図帳・共有コード・content/original IDの書式は変更しない。開発原本とsurveyは専用のメモリー内ストアに隔離し、通常登録原本へ書き込まない。同じタブでは帰還／敗北後も調査を保持し、再入場できる。**リロードでは開発地図の調査はリセットされる。** キャラクターEXP/Gの帰還精算は通常の保存処理を使う。gold用共有コードは発行しない。

gold bossのminMapLevelは1から60へ変更。明示設計図／探索でもLv60未満は拒否する。一方、Ecology Candidate 2の既存gold Lv1監査を壊さないため、共通theme/ecology定義のminMapLevel=1は維持した。これはボス戦の解禁条件ではない。

## 能力と行動

| Map Lv | HP | SP | STR | INT | AGI | DEX | LUC | DEF | 武器攻撃成分 | 基礎EXP | G |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
|60|22400|0|77|25|84|81|91|98|35|8400|1750|
|70|25600|0|88|28|96|92|104|112|40|9600|2000|
|80|28800|0|99|32|108|104|117|126|45|10800|2250|
|90|30400|0|105|33|114|109|124|133|48|11400|2375|
|100|32000|0|110|35|120|115|130|140|50|12000|2500|

各帯70/80/90/95/100%、四捨五入。SP=0。rarityによる能力増幅・乱数再抽選なし。

重要な既存仕様：`combat/collect-stats.js` は主要能力を共通上限30に丸める。上表は定義・combatantの基礎値であり、実ダメージ／行動順に使うSTR/INT/AGI/DEX/LUCは上限30の適用後となる。敵DEFはこの上限の対象外。今回、通常戦闘全体に影響する上限変更はしていない。`magicDefense` は設計metadataで、現在の魔法ダメージ計算には使用されない。実際の魔法耐性は既存5属性すべて倍率1、追加軽減なし。

| 行動 | weight | powerPerHit | speedModifier |
|---|---:|---:|---:|
|攻撃|35|1.0|0|
|甲虫王の強撃|30|1.6|-10|
|黄金突進|25|1.3|+10|
|黄金の翅を震わせている|10|wait|既定値|

全攻撃は既存physicalAttackの単体1Hit。新AI、変身、召喚、復活、敵逃走はない。プレイヤー逃走も既存isBoss／escapeRate=0で禁止。

即死・石化はimmune。resistancePointsは毒75、猛毒85、出血75、action_skip75、speed_down55。三女神の全耐性や最大HP割合攻撃無効はコピーしていない。

## 表示と戦闘順序

`images/karte_bosses/karte_boss_016.avif` を原色で使用。allowColorVariant=falseを維持し、戦闘前に画像decodeのみ実施する。HSL変換・生成canvasには進まない。探索中は既存の拡大boss表示、勝利後は既存拡大portal表示を使う。

セル進入→survey更新／flush→100マス・300マス通知と音声終了待ち→boss encounter。300達成時に戦闘BGMが先行しない。鍵・ボス扉が未解錠なら開始しない。BOSSセルでは一般遭遇しない。

battle contextは `source:'special-map-v2-special-boss'` と mapKey/contentId/mapSeed/mapLevel/rarity/themeId/floorIndex=2/bossId/sessionId/battleId。F3-Aと同じ結果処理へ明示的に配送する。

勝利後はB3Fの同位置・向き・torch・survey・鍵・扉へ復帰し、bossDefeatedをsession内で保持。再侵入では再戦しない。帰還して再入場すれば再戦可能。A／Enterでportalを使うとB1F入口へ戻り、転送では精算しない。

EXPはbattleExperience、GはLOT BAGへ積み立てる。noDrop=true。帰還時のLOT BAG→地図Lvボーナス付きEXP SETTLEMENT→雇用更新を共有する。女神カード、保存失敗の巻き戻し／再試行、battle IDによる二重報酬防止、通常奈落の保留EXP保護を維持する。敗北は既存死亡／寺院復活へ接続し、女神カードによるEXP保護も既存処理を使用する。

## 実戦バランス：要再調整

NodeとPCブラウザの実battle engineで各20試行（計120戦）。B60/B90の既存pacing装備+3、単独戦士／魔術師、回復薬40個、習得済みスキル・チャージ・奥義を使用。能力値・敵HPの改変なし。

| Lv | 職 | 勝利 | 平均ターン | 最大 | 平均回復回数 | プレイヤー被ダメ合計平均 | ボス被ダメ合計平均 |
|---:|---|---:|---:|---:|---:|---:|---:|
|60|戦士|0/20|84.75|93|40|3291|1513.2|
|60|魔術師|0/20|17.95|54|11.9|731.2|378.15|
|80|戦士|0/20|83.10|89|40|4375|5486.1|
|80|魔術師|0/20|22.70|58|14.35|1147.75|2587.55|
|100|戦士|0/20|91.25|98|40|5415|6336.15|
|100|魔術師|0/20|58.40|73|37.25|3419.25|4965.85|

1ターン目敗北0、200ターンtimeout0。ただし全試行で敗北しており、特に物理は長期戦化する。魔法が通りすぎて瞬殺する傾向はない。この装備・方針での結果であり、全ビルドで討伐不能と断定するものではない。指定値は維持しているが、正式バランスとしての採用を推奨できる結果ではない。

ブラウザの勝利後導線検証は別のfixtureで、フルHPのboss表示確認後にテストコードだけで残HPを1へ変更している。これは勝利／portal／精算の接続テストであり、自然な討伐成功や討伐ターンの実測には数えない。

## 互換監査

既存監査と同じ順序・入力で再実行した。

- Candidate 3 seed12345 fingerprint: `3519b715`
- Candidate 3全seed: `c1dbc28cf7bfc9f78fffa32281d8d001b4b0a1a8f1aa2f146cb5d0a5559f0e95`
- Ecology Candidate 2: `ab38d1e17e4f8d47c8fc89d895e20ed4eba33cc6e781db35cc0aac4a66a17dca`
- V1 ecology: `04c4c6902ef72c567a2166d4b4bd41d83b7ca89eab99a8926b0ceaa5d7c96a8a`
- F3-A通常boss選出1,769,472件: `6cf2013e47c6227a26e6af5774f80d2490fee33359a975b4ee2479abdf730183`、異常0
- V1/旧暫定版topology・doorsも既存SHA一致。

## 検証結果

- 全Nodeテスト：**1,915成功、0失敗**。
- Pythonゲームデータ検証：**29成功、0失敗、2skip**（カードiconレジストリ／生成分布の別検証項目）。
- goldのPC 1280px／390px × Lv60/80/100の計6ケース：一般遭遇、B1→B2→B3、金箱と鍵popup、施錠扉、299→300通知後boss開始、016画像、勝利後同位置復帰、portal、入口帰還、LOT BAG、EXP精算、雇用更新まで成功。通常奈落state不変。勝利部分は前述の残HP1 fixture。iPhone／ゲームパッド実機は未確認。
- 通常地図Lv50 PC回帰：boss017、HSL画像、通常能力で13ターン勝利、同位置復帰、gate、帰還精算を確認。
- 実装中のgold敗北・survey保存失敗・キャラクター保存失敗・再試行・女神の加護・重複callbackは、実際のmain.js結果処理を抽出して実行するNode統合テストで確認。
- 自分の変更範囲の `git diff --check` 成功。作業中に追加された素材READMEには末尾空行の警告があるが、そのファイルは変更していない。
- 実ブラウザのフル能力バランス120試行はNodeと一致。画像・生ログはOS一時フォルダー `nda-v2-gold-boss` に保存。

## 変更ファイル一覧

定義：`data/karte-special-bosses.js`、新規`data/karte-gold-boss.js`。

接続：`js/special-map/boss-encounter-v2.js`、`encounter-v2.js`、`session-v2.js`、`exploration-ui.js`、新規`development-map.js`、`js/main.js`、`js/battle.js`、`js/town.js`、`js/menu.js`、`index.html`。

検証：`tests/special-map-special-themes.test.mjs`、`tests/special-map-v2-experience.test.mjs`、新規`tests/special-map-gold-boss.test.mjs`、`tests/browser/special-map-gold-boss.mjs`、`tests/browser/special-map-gold-balance.mjs`、`tools/simulate-gold-map-boss.mjs`、`artifacts/special-map-gold-boss-pacing.json`、本書。

画像ファイル・READMEへの今回の作業外変更は編集していない。LAST UPDATE、commit、push、F3-B2は実施しない。
