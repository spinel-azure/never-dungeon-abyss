# V2入場演出・B1F～B3F表示（V2-C前のpresentation変更）

## 実装

V2だけ、登録地図の探索確定後に既存 `runSceneTransition` を使用する。

1. 地図詳細画面を残したまま既存 `playSeSequence('stairs', 3)` を呼ぶ。
2. 通常奈落入場と同じ2,700msで暗転しながら、中央の `ENTERING` / `MAP DUNGEON` も徐々に現れる。
3. 暗転とSEの完了を待つ。V2専用の追加1秒表示は行わない。
4. 暗転中に特殊地図session／3D描画を作成する。タイトルは通常奈落と同じく復帰開始時に隠す。
   既存host.enter経路でテーマBGMを開始する（既存ON/OFF・音量を尊重）。
5. 既存の暗転保持120ms・復帰700msの後、地図名バナーを表示して入力復帰。

地図名は既存の `describeTestMap` とfloorLapバナーを再利用。
暗転タイトルと地図名は同時表示しない。
新規音源・フォント・別transition systemは追加しない。
`PixelFont` は既存 `fonts/k8x12.woff2` 定義を使用する。

暗転タイトルは既存DOMを一時利用し、finallyで文字列・class・hidden状態を復元する。
V2入場待ちcontrollerは入力を消費し、session作成後も復帰完了までtransitioningを保持する。
途中破棄・失敗時もruntimeやタイトルを残さない。通常奈落／V1は既存経路のまま。

## 階層表示

HUD、階層移動バナー、移動通知を `B${currentFloor + 1}F` へ変換する。
内部のfloor index・stairs対応・通常奈落currentDepthは変更しない。
地図内部の階層移動は既存runStairsTransitionを使い、ENTERINGを再表示しない。

## 変更ファイル

- `js/main.js`: 既存transitionのV2タイトルoption、入場hook、HUD階層表示。
- `js/special-map/exploration-ui.js`: 入場待ちcontroller、暗転時session作成、復帰後バナー、階層表示。
- `js/explorer-preview-ui.js`: 暗転まで地図画面保持、二重開始防止。
- `css/scene-transition.css`: V2タイトルの幅・k8x12表示。
- `tests/special-map-entry-presentation.test.mjs`: 実transition関数の順序、SE呼出し、通常遷移不変、失敗時cleanup。
- `tests/special-map-v2-feedback.test.mjs`: 遅延入場・入力ロック／復帰・取消／失敗。
- `tests/browser/special-map-v2-b.mjs`: 実アプリでENTERING→地図名→B1F、B2F/B3F/復帰、再表示なしを検証。

## 検証

全Nodeテスト: 1,798件成功・失敗0。
全65,536seedについてV2 Candidate 3／V1 topology／旧暫定topology／V1 doors／V1 ecologyの
SHA-256を再計算し、すべて既存値と一致。生成器ファイル自体も変更なし。
V2 seed12345のfingerprintは `3519b715` のまま。

- V2 Candidate 3 SHA: `c1dbc28cf7bfc9f78fffa32281d8d001b4b0a1a8f1aa2f146cb5d0a5559f0e95`
- 詳細: `artifacts/v2-entry-sha.log`
- Node: `artifacts/v2-entry-node-tests.log`

ブラウザ証跡は `artifacts/special-map-v2-entry/`。
headless Edgeの隔離context、PC 1280×900／390×844で実アプリを起動。
fixture投入・観測はテスト側route置換のみで、本番へのデバッグAPI追加はなし。
音声はブラウザ自動検証ではOFF。SE×3呼出しと既存policy経路はNodeテストで確認する。
iPhone／USBゲームパッド実機の確認はユーザー側で実施。

survey・敵・戦闘・報酬・V2-Cは未変更。コミット・pushは行わない。

PC／390pxブラウザ回帰は、入場前A/B/方向入力が無効、暗転タイトル表示時はsession未作成、
復帰後は地図名バナーとB1F、階層往復時はB2F/B3Fだけの表示を検証する。
全Nodeテストは最終状態で1,798件成功・失敗0を2回連続確認。
`artifacts/v2-entry-node-tests-repeat.log` に反復結果を保存。

最終ブラウザ結果: PC／390pxとも成功。横はみ出し0、pageerror 0、通常奈落stateは前後一致。
入場タイトル・地図名・B2F/B3Fのスクリーンショットを保存し、PC／390pxの中央配置を目視確認。
入場演出カウントは階層往復後も1回。金箱・施錠扉・オートウォーカー・入口帰還の回帰も成功。

通常奈落との演出統一後も全Node 1,798件成功。PC／390pxでフェード途中のタイトル表示（opacityが0より大きく1未満）、終了後の地図名・入力復帰を確認。記録: artifacts/v2-entry-matched-browser.json、artifacts/v2-entry-matched-node-tests.log。
