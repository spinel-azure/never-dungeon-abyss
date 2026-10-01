# V2 Candidate 3 / V2-B 実機フィードバック対応

正式凍結前の候補。コミット・pushは行わない。V2-C、敵・戦闘・報酬は対象外。

## 変更点

1. V2階段セルへの歩行完了時、上層／下層への移動案内をメッセージ欄へ表示する。
   初回入場・階層到着・オートウォーカー到着でも案内する。セルから離れたら古い案内を消す。
   A／Enter／通常ゲームパッド決定で実行し、乗っただけでは遷移しない。
   第1層の入口は「探索を終了して帰還しますか？」を表示し、Aで既存finish経路へ渡す。
   帰還前保護処理、session破棄、奈落入口UI／BGM復帰は既存経路を利用する。
   Bは引き続き通常探索メニュー。V1入口の挙動は変更しない。
2. 第3層金箱は既存 `playTreasureOpening('gold', callback)` と `treasureCanvas` を再利用。
   扉SE→回転／開蓋／光・粒子演出→完了callback→特殊地図専用キー付与→重要アイテムSE。
   演出中は移動・メニュー・二重開封・帰還をロック。開封失敗は未取得で再試行可能。
   破棄後のcallbackでは鍵を付与しない。WebGL未対応時の既存演出fallbackはそのまま。
   本編のloot付与・B9F鍵inventoryは呼び出さない。
3. 3層のテーマを**生成段階から地図単位の共通値**へ変更。
   表示だけの置換ではない。地図の `themeId` と全floorの `themeId` を同じ値にする。
   旧Candidate 2第1層の `floor-1-theme` streamを地図共通テーマとして引き継ぎ、一度だけ抽選。
   壁・階段・開始方向・ボス部屋・鍵箱・施錠扉metadata・階段linkは一切変更しない。
   既存の描画／BGMはfloor.themeIdを参照するため、3層とも同じ背景／BGMになる。
   green→jungleZone、yellow→desertZone、その他→dungeonの既存音声policyは不変。

## Candidateの扱い

- rulesetは未凍結の `special-map-v2` のまま。
- structure revisionは `v2-structure-candidate-3`。
- Candidate 1 fixture／監査JSON／仕様記録はそのまま保持。
- Candidate 2は `tests/fixtures/special-map-v2-candidate-2.mjs` に変更前生成器を保存。
  既存 `artifacts/special-map-v2-structure-candidate-2.json` と仕様記録も変更しない。
- V2原本・共有コードは再発行しない。既存V2コードを再生成すると地形配置は同じで、
  第2・第3層のテーマだけが第1層へ揃う。正式仕様としての永久凍結ではない。
- V1／旧暫定版の生成・共有コード・survey仕様は変更しない。

## fingerprint / SHAの対象範囲

`canonicalV2Structure()` の順序固定JSONを使用する。対象はruleset、seed、floorCount、
各層の番号・寸法・全walls・上り／下り階段・入口側・開始方向・**themeId**、
ボス部屋の向き・セル・接続位置・BOSS・扉edge／kind／lock情報、
鍵箱のID・位置・kind・内容のtype／keyId／name／scope、階段links。

地図直下のthemeIdはfloor.themeIdの共通値の別名として保持し、二重にはserializeしない。
全seed監査で地図直下と3層が必ず等しいことを検証する。

Lv、rarity、発見者署名、survey、runtime位置、開扉、鍵取得、torch、演出状態は対象外。
fingerprintは上記JSONの既存hash32V1を8桁hex化。
全seed SHAはseed 0→65535の順で各canonical JSON＋LFをSHA-256へ投入する。
**テーマも対象なので、配置が同じでもCandidate 3ではfingerprint／SHAが変わる。**

## seed 12345

|項目|Candidate 2|Candidate 3|
|---|---|---|
|テーマ 1/2/3|crystal / crystal / torture|crystal / crystal / crystal|
|構造fingerprint|5a0826f6|3519b715|
|鍵箱|9,8|9,8|
|前室|6,1|6,1|
|BOSS|6,0|6,0|

施錠時の第3層到達可能数は98セル。その98セルのうち1セルが鍵箱（98+1ではない）。

## 全seed監査

`node scripts/audit-special-map-v2.mjs`

65,536セット＝196,608フロア成功。生成／構造／鍵到達／反復／Lv・rarity独立性／
Candidate 1比較／Candidate 2比較／V1互換検証の失敗すべて0件。
Candidate 2との比較は全floorからthemeIdだけを除いたオブジェクトをdeepEqualし、
全階段linksもdeepEqual。したがってテーマ以外の配置差は0件。
第3層鍵箱は施錠中でも到達可能。上り階段からの最短距離10～53歩。
最終監査所要140.708秒。

|対象|SHA-256|
|---|---|
|Candidate 3 暫定|c1dbc28cf7bfc9f78fffa32281d8d001b4b0a1a8f1aa2f146cb5d0a5559f0e95|
|Candidate 2 比較資料（不変）|243b09bbd93f5ff783b1bf772c156e159132451d90a630a807a19b8d6fdd4db3|
|Candidate 1 比較資料（不変）|19f8f3aad737c8ab9e91c7e673e892ab810b7938b182cab63e77d3b9601750b1|
|V1 topology（不変）|b985066f1fb5720c8f27c56d925e58d700af9d637d90cd2c6e0fc33ce0920e58|
|旧暫定topology（不変）|3d92b41f2e2994ca08e40626cd85e498a20c8c0dfc1a135c32472641805df592|
|V1 doors（不変）|6a625e0aac5a8c87367c2ab52e46570dcb195e4260ecb7cacc4f1167c81f693f|
|V1 ecology（不変）|04c4c6902ef72c567a2166d4b4bd41d83b7ca89eab99a8926b0ceaa5d7c96a8a|

完全な監査結果は `artifacts/special-map-v2-structure-candidate-3.json`。

## 変更ファイル

- `js/special-map/generator-v2.js`: 共通テーマ生成、Candidate 3識別。
- `js/special-map/session-v2.js`: 階段案内／入口帰還action、鍵箱開封の開始・完了分離。
- `js/special-map/exploration-ui.js`: 到着通知、帰還、Three.js演出接続／入力ロック。
- `js/main.js`: 既存treasure演出hookを特殊地図へ公開。
- `scripts/audit-special-map-v2.mjs`: Candidate 2保存値検証、テーマ以外の全seed比較。
- `tests/fixtures/special-map-v2-candidate-2.mjs`: 旧候補の比較用生成器。
- `tests/special-map-v2*.test.mjs`: 新fingerprint、配置比較、階段・鍵箱の回帰。
- `tests/special-map-session.test.mjs`: 共通UI依存の注入更新（V1 assertions維持）。
- `tests/browser/special-map-v2-b.mjs`: PC／390pxの実アプリ入力・描画確認。
- 本資料、V2-B記録への追補リンク、監査JSON／ログ／スクリーンショット。

## 操作・回帰検証

- 全Nodeテスト **1,794件成功／失敗0、2回連続**。
  `artifacts/v2-followup-node-tests.log`、`v2-followup-node-tests-repeat.log`。
- headless Edgeの実アプリ（隔離context）でPC 1280×900と390×844を確認。
  既存V2-B経路の1⇄2⇄3、金箱、解錠、BOSSセル、オートウォーカー、上層復帰に加え、
  階段案内、全層crystal、Three.js金箱表示中は鍵未取得・入力ロック、演出完了後のみ鍵付与、
  第1層入口のA操作で帰還を確認。390pxは実際のタッチA/B経路を使用。
- 両画面とも横はみ出し0、pageerror 0、通常奈落stateは前後一致。
  `artifacts/special-map-v2-b/browser.json` と同フォルダの `*-gold-opening.png`、
  `*-entrance-return.png`、各層スクリーンショットを参照。
  390px金箱開蓋／光と入口案内はスクリーンショットを目視確認。
- 初回ブラウザ試験でオートウォーカーの到着メッセージが階段案内を上書きする問題を検出。
  案内を最後に表示するよう修正し、専用回帰テストとPC／390px再実行で成功。
- BGM／SEは自動ブラウザ検証中OFF。既存音声経路・設定を変更していない。
  iPhone・USBゲームパッド実機はユーザー確認対象。
- 敵・戦闘・報酬・V2 survey永続化は追加していない。
