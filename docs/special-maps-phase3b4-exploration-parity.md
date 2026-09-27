# 特殊地図 Phase 3B-4 — 探索操作の統一

実装・検証日: 2026-09-28。コミット・pushなし。敵・戦闘への接続なし。

## 差分調査と対応

| 項目 | 通常奈落 | 変更前の特殊迷宮 | 今回の対応 |
| --- | --- | --- | --- |
| 前進・後退 | 成功時step、移動170ms | 無音、170ms | 共通playSe経路＋STEP_MS |
| 旋回 | 150ms、方向別shake | 170ms、shakeなし | TURN_MS、同じshake |
| 補間 | 二次ease-in-out | smoothstep | 同じ二次式 |
| 壁 | blocked、shake、進行不可メッセージ | 移動拒否のみ | SE・揺れ・文言を一致 |
| 閉扉 | blocked、shake、A案内 | 独自文言のみ | 「扉がある。\n＊Aボタンで開く」 |
| 開扉 | 520ms、door、入力ロック | 520ms、door、入力ロック | DOOR_OPEN_MSを共通参照 |
| 通過した扉 | 移動完了時に閉じる | 開いたまま | 前進／後退とも完了時に閉じる |
| HUD | readout/chipとコンパス | 1行テキスト | 既存スタイル・コンパス描画を再利用 |
| ミニマップ | キャンバスのタップで拡大／解除 | ボタンのみ | 通常のpointer/touch処理を再利用 |
| ゲームパッド地図 | dungeon条件付き | town扱いで拒否 | 特殊探索へ先にルーティング |
| 帰還 | 本編の帰還導線 | Bで入口へ即時帰還 | 特殊側の現行仕様・保存失敗時保護を維持 |

通常奈落のplayer.jsはDOOR_OPEN_MSの定義元をconfig.jsへ移しただけで、値・ゲーム挙動は変更していない。

## Runtimeと音声

成功した移動の開始時、実際の移動方向（後退では向きの反対）からcanonical door keyを取得し、motion.crossedDoorへ記録する。移動完了時にopenedDoorsから削除するため、同一扉の両側が同時にclosedへ戻る。開けただけ／旋回だけでは閉じない。自動閉扉のSE・アニメーションは追加していない。

移動・旋回・開扉のいずれかが進行中なら別の移動／開扉は拒否する。歩行音は成功した移動開始時だけplaySe('step')へ渡す。壁・閉扉ではplaySe('blocked')を使用し、busy中は音を追加しない。前進／後退の衝突shakeは-12／9、外周境界の防御分岐は-7／5、成功歩行は3／-2、旋回は2／-2で通常奈落と同じ。外周に壁がある通常ケースは壁メッセージになる。

既存audio.jsは変更なし。ashioto.wav、door、blockedの既存音源、ミュート、音量をそのまま利用。タッチレイアウトでは既存policyによりstepだけでなくblockedも抑制される。特殊迷宮側から強制再生しない。ブラウザ操作では音の聴取判定はしておらず、SE呼び出し・設定・タッチ抑制は自動テストで検証。

## HUD・ミニマップ・入力

座標と「特殊地図」を既存chipで表示し、調査数／調査完了は別chipに表示。BxxFは表示しない。コンパスは通常描画関数に特殊session専用canvas/stateを渡し、通常コンパスの参照を書き換えない。

ミニマップの矢印、扉記号、拡大描画は既存実装を使用。小地図をタップすると拡大、拡大後のキャンバスタップで閉じる。touch後の互換pointerイベントによる二重切替も既存ハンドラーで防止する。帰還時に特殊canvasのハンドラーを除去し通常renderer依存関係を復元する。

キーボード方向キー／X／Enter／Z、既存画面A/B・方向ボタン、ゲームパッドdispatchは特殊探索コントローラーへ集約。ゲームパッドの地図割当も同じtoggleへ接続。キーボードでの地図ボタン操作はネイティブボタンによる操作を維持し、新しい専用キー割当は追加していない。

帰還・地図・開扉の補助ボタンは残した。特殊探索は町の画面内にあるため、通常奈落のコマンド全体をそのまま呼ぶと通常探索処理へ流れる危険がある。またタッチコントロールOFF時の操作手段として必要。390pxでは文字を14pxに整え、高さ44pxの押下領域を維持。拡大地図を隠さないよう、拡大中だけ補助ボタンを非表示にする（キャンバスタップで解除、B帰還は有効）。

## 分離を維持したもの

- surveyedMask/surveyViewは永続地図知識、exploredは今回の訪問だけ。保存形式・保存処理は変更していない。
- 100/100完了・通知・全地図表示・再入場、削除再登録時のリセット、保存失敗保護は既存テストで確認。
- exitはランドマークのまま。到達・Aによる強制終了なし。
- 通常奈落のstate・扉・進行フラグ・たいまつ残量を共有しない。
- 通常updateHud全体は流用しない。通常階層やたいまつ更新を含むため、見た目とコンパス描画のみ再利用。
- 敵、宝箱、イベント、報酬、activeSession永続化は追加していない。

## 検証結果

最終 `node --test tests/*.test.mjs`: **1,674成功、0失敗**（約9.9秒）。初回の変更途中一式も1,672成功、0失敗。最終ログ: `artifacts/phase3b4-node-tests.log`。

追加6テスト＋既存テスト拡充:
- 前進／後退それぞれの扉通過・終了直前までopen・完了時closed・反対側から再開扉
- 開けただけ／旋回だけでは閉じない、多重移動・開扉拒否
- 前進／後退step、壁／閉扉blockedとshake、busy中無音
- 旋回150ms・二次補間・調査数不変
- 通常pointer/touchミニマップハンドラーの再利用・二重切替防止・解除
- ゲームパッド地図ルーティングと通常奈落の条件維持
- UIのdoor SE連打抑止、ネイティブ地図ボタン、拡大状態
- audio設定尊重、タッチstep／blocked抑制、PC step成功

`node scripts/audit-special-map-doors.mjs`: **全65,536 seed成功**。地形・扉・生態系をすべて再生成し、既存監査と完全一致。生成コードに変更なし。

| 層 | 全seed SHA-256 |
| --- | --- |
| topology | b985066f1fb5720c8f27c56d925e58d700af9d637d90cd2c6e0fc33ce0920e58 |
| doors Candidate 1 | 6a625e0aac5a8c87367c2ab52e46570dcb195e4260ecb7cacc4f1167c81f693f |
| ecology Candidate 2 | 04c4c6902ef72c567a2166d4b4bd41d83b7ca89eab99a8926b0ceaa5d7c96a8a |

seed 12345: topology fingerprint **65bbb4f0**、door count **7**、door fingerprint **04ec0371**。監査ログ: `artifacts/phase3b4-layer-audit.log`。既存監査JSONも内容不変。

## ブラウザ確認

localhost専用テスト用セーブを使用（配信側でQA入口を挿入、製品コードへQA処理は未追加）。PCと390×844のin-appブラウザで確認。

- 正式V1 seed 12345へ入場。壁と閉扉のメッセージ、Enter開扉、(1,3)→(2,3)の前進通過後に振り返ってclosedを確認。
- 反対側から再開扉し、後退で(2,3)→(1,3)へ戻った後もclosedと衝突を確認。
- 390pxの開扉ボタン、帰還ボタン、ミニマップ本体タップによる拡大／解除を確認。
- 390pxでdocument幅=scroll幅=390。補助ボタンは高さ44px、右端最大273px。コンパスとボタンの重なりを解消。
- 完了済み原本はリロード／再入場後も「調査完了」、全域表示。入口へ戻り扉はclosed。
- 別のQA署名の共有コード原本（phase2a-1）をUIから登録。0/100→入場1/100→新規セル2/100→帰還→再入場2/100維持を確認。
- ブラウザのコンソールerrorは0件。
- iPhone実機・USBゲームパッド実機は未実施。自動テストでは既存入力経路とSE policyを確認。

画像: `artifacts/phase3b4-pc.png`、`artifacts/phase3b4-390px.png`、`artifacts/phase3b4-survey-390px.png`。

## 変更ファイル

- `js/config.js`、`js/player.js`: 開扉時間の共有
- `js/special-map/session.js`: 移動／扉／SE／shake／補間
- `js/special-map/exploration-ui.js`: HUD・コンパス・共通入力／音声接続
- `js/compass.js`: 独立描画ソースを任意引数で受け取る
- `js/renderer.js`: ミニマップ入力再利用・拡大状態参照
- `js/main.js`: ゲームパッド地図ルーティング
- `css/explorer-preview.css`: HUD・補助ボタン・390pxレイアウト
- `tests/special-map-exploration-parity.test.mjs`: 新規回帰テスト
- `tests/special-map-doors.test.mjs`、`tests/special-map-session.test.mjs`、`tests/audio.test.mjs`: 既存テスト拡充
- 本報告書と上記検証ログ・画像
