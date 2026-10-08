# 特殊ボス実機フィードバック / Combat Candidate 2

## 変更

- ボス画像は地図入場時（B1F）にrendererの画像cacheへ先読み。読み込み途中の四角い代替描画は地図bossに出さない。画像ファイル未変更。
- 2歩以上手前では投影された部屋の天井と床の間に収まる高さに制限。1歩手前のサイズは維持。
- 障壁表示は独立fill要素のwidthを450ms ease-outで補間。残量数字と戦闘計算は即時確定し、ゲージだけ滑らかにする。reduced-motionでは即時更新。
- 三女神Combat Candidate 2：HPはルミナ20,000、ノクティア18,000、ゼレーナ24,000（Lv100、従来の2倍）。物理/魔法の実効ダメージへ1.6倍。DEF/報酬/技weight/耐性は据え置き。30capを超えるSTR/INTの書き増しではなく実効攻撃倍率を適用。
- gold/rice/dusk/tenderはライブ探索でMap Lv100のみ戦闘開始。battleMinMapLevel=100を明記。元の地図生成/共有コード/metadata scalingは互換維持し、低Lv戦闘定義の生成は過去の検証用に残す。
- Lv100未満の既存地図は削除・変換しない。B3Fの鍵ルートを通るとシルエット表示。BOSSセルで調査保存/達成演出を先に処理し、案内2.2秒→1秒fade→warp portal。A/EnterでB1入口へ。戦闘/討伐flag/報酬は発生しない。bossPreviewDismissedはsession限定、再入場時は初期化。

## 強化測定

本番engine480戦（Lv100 × 3女神 × 4職 × 4カード条件 × 10固定乱数）。NPCアレク/レベッカ/エリカ、B90装備+3、回復薬40。標準はプレイヤーLv100、Z6はLv200。同じ自動戦闘方針で比較。220Tで打切り。

|女神|カード条件|勝利/40|平均T（敗北/打切含む）|最大T|打切数|平均被ダメ総量|回復薬使用回数|
|---|---|---:|---:|---:|---:|---:|---:|
|rice|standard|0/40|50.4|112|0|5031|20.7|
|rice|standard-scorpio|2/40|47.7|107|0|4933|20.8|
|rice|z6|40/40|53.6|107|0|3248|0.0|
|rice|z6-no-scorpio|40/40|56.4|116|0|3485|0.0|
|dusk|standard|40/40|96.8|134|0|3167|1.9|
|dusk|standard-scorpio|40/40|93.2|132|0|3115|1.8|
|dusk|z6|40/40|45.2|96|0|1555|0.0|
|dusk|z6-no-scorpio|40/40|50.5|97|0|1751|0.0|
|tender|standard|30/40|200.2|220|10|6470|0.2|
|tender|standard-scorpio|31/40|193.1|220|9|6619|0.6|
|tender|z6|40/40|99.8|181|0|3491|0.0|
|tender|z6-no-scorpio|40/40|105.2|191|0|3607|0.0|

全Z6条件は勝利。標準構成のルミナは非常に厳しく、ゼレーナは200T超も発生。HP倍増による長期化は残るため正式バランス凍結ではない。Z6ではNPC回復・カード防御が強く回復薬0で済む条件も残る。「エリカ入りでも必ずHPが大きく減る」調整が全構成で成立したとは扱わない。職別・スコルピオ有無・残HP等はcandidate-2 JSONに記録。Candidate 1 JSON/報告は保持。

## 検証

Node全1,936件成功（失敗0）。Python29件成功・2件スキップ。git diff --check問題なし。
特殊4themeのLv99（survey待ち→案内→fade→無報酬portal→B1）を含む回帰テストを実施。
PC1280/390で2歩・1歩の表示、B1先読み、障壁の途中幅をブラウザ確認。Lv99 gold/tenderは390pxでシルエットと無報酬portalを確認。ブラウザ戦闘は遷移用短縮fixture、バランスは別途上記実エンジン試験。
地形/生態系/共有コード生成器とfixtureは変更なし。F4未着手。LAST UPDATE/コミット/push未変更。

## 主な変更先

renderer.js、special-map/session-v2.js、exploration-ui.js、boss-encounter-v2.js、battle.js、battle.css、karte-special-bosses.js、karte-goddess-bosses.js、enemies.js、combat/karte-goddesses.js。対応Node/ブラウザテストとsimulate-map-goddesses.mjs、Candidate 2測定JSONを更新/追加。
