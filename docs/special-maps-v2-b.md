# V2-B: enemy-free three-floor runtime

> 以下はV2-B初回実装時点の記録です。実機確認後の階段案内・入口帰還・Three.js金箱・地図共通テーマへの変更は [Candidate 3追補](special-maps-v2-structure-candidate3.md) を参照してください。

V2 Candidate 2構造を変更せず、既存特殊地図探索UIに接続する。
V2-C（300マスsurvey保存）・敵・戦闘・報酬には進まない。

## 探索振り分け

`startSpecialMapExploration`が登録原本のrulesetを確認し、V2は
`createSpecialMapV2Session`、V1/旧暫定は従来の`createSpecialMapSession`へ渡す。
未登録・未鑑定からの入場はできない。既存contextでactive sessionは1つに制限。
V1の生成器・単層session・survey保存結果は変更しない。

V2詳細の探索禁止を解除し、既存の「探索する→確認」を使用する。
確認文はV2探索記録が今回の入場中のみ有効であることを明示。

## Runtime

```text
V2 session (kind: specialMapV2)
  mapKey / ruleset / seed / level / rarity
  blueprint (Candidate 2) / fingerprint
  currentFloor (0..2)
  torchFuel (3層共通、入場時100)
  bossKeyFound / bossDoorUnlocked
  transitioning
  floors[3]
    generatedFloor / cells（描画adapter）
    explored[10][10]
    playerX / playerY / direction
    doorByKey / openedDoors
    motion / autoPath / renderState
    chestOpened
```

現在層の参照を返すsession facadeにより、従来の歩行・旋回・扉・SE・ミニマップ・
フィールド効果処理を利用する。rendererが保持するrenderState参照は層移動でも不変。
torchFuelだけは全体sessionを参照する。床ごとのwallsはコピーした描画用cellへ変換し、
生成結果は変更しない。通常奈落stateを差し替えたり保存したりしない。

成功歩行完了ごとに1燃料消費。前進・後退・オートウォーカーとも同じ処理。
階段移動・旋回・衝突・開扉は消費しない。回復アイテムは既存特殊地図環境経由で共通燃料へ作用。
presenceは0表示のまま。本編のpresence・torchへ書き込まない。

## 階段

Candidate 2の`links[].upper/lower`を対応先として使用する。
セルに乗っただけでは遷移せず、A/Enter/決定時のみ切替。
第1層上り階段は入口ランドマークであり、通常奈落へ移動しない。
到着先は必ず対応階段。壁でない向きを既存開始方向resolverで決定する。
同一sessionを継続し、他階のexplored・開扉状態・鍵取得状態を保持。

通常奈落の`runSceneTransition`（暗転2700ms、保持120ms、復帰700ms、
既存stairs SE 3回）をhost callbackとして再利用する。
transition中は移動・開扉・階段・帰還入力をロックし、重複遷移させない。
遷移中のclose後には古い非同期callbackでrendererを変更しない。
初回は既存地図名バナー、階移動後は同じバナーUIで「第N層」を表示。

## 背景・UI・BGM

Candidate 2は**各層ごとにthemeIdを持つ**。階層切替時に背景とBGMを追従させる。
既存helperのgreen→jungleZone、yellow→desertZone、その他→dungeonを使用。
既存audio側が同一BGMの再起動を抑止し、ON/OFF・音量設定も尊重する。

共有のHUD/compass/座標/presence/torch/ステータス/NPC枠/メッセージ/Bメニューを使用。
HUDは「特殊地図 第N層」「今回探索 N / 100」。BxxFや恒久調査完了とは表示しない。
現在層のruntime exploredだけを既存ミニマップへ渡す。未訪問階は0セル、初期階だけ入口1セル。
たいまつ0の暗闇・ノイズは既存rendererの規則。探索記録自体は消えない。

## 第3層の鍵と扉

既存金箱sprite (`treasure-gold.png`) と赤いboss door textureを使用。
鍵箱セル上のAで一度だけ取得し、既存importantItem SEとメッセージを表示。
開封後は金箱spriteが消える。通常inventory/keyItemsへの書込みなし。
`red_rust_key_b9f`や本編ボスフラグは一切参照しない。

鍵なしの正面扉Aは施錠メッセージとblocked SE。通過不可。
鍵取得後は`bossDoorUnlocked=true`として520msの既存開扉処理へ渡す。
通過完了時には自動閉扉するが、解錠状態は保持する。両面とも同じcanonical edgeを参照。
前室・BOSSセルは普通に歩行可能で、bossIdや戦闘処理を付与しない。

**現在のCandidate 2に通常扉レイヤーは存在しない。** 設計図に含まれる扉は第3層の
施錠boss door 1枚のみ。V1扉生成器をV2へ勝手に適用せず、新規の配置規則も作っていない。

## オートウォーカーと帰還

既存のknown-path/旋回/開扉/歩行/自動閉扉処理を再利用。
目的地は現在階層のstairsUp。runtime explored内だけを通り、施錠中のedgeを除外。
解錠済みだが閉じている扉は自動開扉・通過後閉扉。
上り階段で停止し、自動階移動・退出はしない。手動操作でautoPathを解除。

Bは既存探索メニュー。メニュー帰還でcontextと3層sessionを破棄し、奈落入口表示へ戻す。
V2はsurvey flush不要。既存の冒険者データ保存失敗保護（帰還時効果解除など）は維持。
再入場は第1層・torch100・鍵未取得・扉施錠・explored入口1セルへ戻る。

## seed 12345 / Lv50 / SILVER / †ルル

共有コード: `NDA:AgIwOTIBAyAgMOsw65QoofYQw8Ta`

|階|theme|上り|下り|
|---|---|---|---|
|1|crystal|(0,3)|(7,7)|
|2|crystal|(8,9)|(1,5)|
|3|torture|(6,9)|なし|

鍵箱(9,8)、前室(6,1)、BOSS(6,0)、構造fingerprint `5a0826f6`は不変。

## 検証記録

構造監査: 全65,536セット＝196,608フロア、生成／構造／鍵到達／反復／Lv・色独立性／
旧互換の異常すべて0。118.431秒。

|監査|SHA-256（従来値と一致）|
|---|---|
|Candidate 2|243b09bbd93f5ff783b1bf772c156e159132451d90a630a807a19b8d6fdd4db3|
|Candidate 1比較資料|19f8f3aad737c8ab9e91c7e673e892ab810b7938b182cab63e77d3b9601750b1|
|V1 topology|b985066f1fb5720c8f27c56d925e58d700af9d637d90cd2c6e0fc33ce0920e58|
|旧暫定topology|3d92b41f2e2994ca08e40626cd85e498a20c8c0dfc1a135c32472641805df592|
|V1 doors|6a625e0aac5a8c87367c2ab52e46570dcb195e4260ecb7cacc4f1167c81f693f|
|V1 ecology|04c4c6902ef72c567a2166d4b4bd41d83b7ca89eab99a8926b0ceaa5d7c96a8a|

Node最終状態は**1,789件成功・失敗0を2回連続確認**。
途中、ブラウザ等と並行実行中に既存`rumor-notification.test.mjs`の
「a quest unlocked during an active batch is left for the next display」でタイムアウトが1回発生。
当該コード・アサートは変更せず、並行負荷を外した最終全体実行2回はともに成功。

PC (1280×900)／390×844の両方で、登録一覧→入場→1⇄2⇄3→鍵なし扉拒否→金箱取得→
2⇄3で鍵保持→解錠→前室→BOSS→オートウォーカーで3層上り停止→2→1→メニュー帰還を確認。
keyboardと390pxのタッチA/Bを使用。実際に金箱・赤扉画像がcanvasへ描画されたことも計測。
BOSS到達時は両環境とも位置(6,0)、torch52、今回探索[23,30,42]、開いたままの扉0。
通常奈落地形/explored/torch/presence、HP/SP/G、ストーリーフラグ、本編鍵、地図保存内容は
操作前後で一致。ブラウザ例外0、横はみ出し0。390pxのHUD・メニュー・扉スクリーンショットも目視確認。
BGM/SEは自動ブラウザ検証ではOFFとし、経路・theme選択はコードとNodeテストで確認。

最終結果は`artifacts/special-map-v2-b-node-tests.log`、`special-map-v2-b-node-tests-repeat.log`、
`special-map-v2-b/browser.json`および画面PNGを参照。
ブラウザ検証はisolated headless Edgeで実アプリを開き、入力と実際のanimation完了を使用。
fixture投入と観測hookはテストのroute差替えだけで、本番にデバッグAPIを追加しない。
iPhone・USBゲームパッド実機試験は未実施。

## 変更ファイル

- `js/special-map/session-v2.js`: V2全体session、floor runtime、階段・鍵・施錠扉。
- `js/special-map/session.js`: V2用のruntime-only訪問処理、開扉可否hook、施錠経路除外、遷移ロック。V1動作は同じ。
- `js/special-map/exploration-ui.js`: session振り分け、共通renderer・階段演出・層切替。
- `js/main.js`: HUD層表示、既存階段演出host、テーマBGM切替。
- `js/explorer-preview-ui.js`: V2入場許可とruntime-only説明。
- `tests/special-map-v2-session.test.mjs`: 3層・階段・鍵・扉・auto・torch・境界seed。
- `tests/special-map-session.test.mjs`: 既存V1 controllerテストへ追加依存を注入。
- `tests/explorer-touch.test.mjs`: V2の入場禁止テストを今回のdispatcher接続へ更新。
- `tests/browser/special-map-v2-b.mjs`: PC/390px実アプリの探索回帰。
- `artifacts/special-map-v2-b*`: 検証ログ、JSON、画面。
- `artifacts/special-map-v2-structure-candidate-2.json`: 再監査の計測時間のみ更新。

V2 survey、surveyComplete、cleared更新、敵、戦闘、報酬、ドロップ、pendingRewardは未実装。
共有コード・生成器・通常奈落のゲーム進行処理は変更しない。
