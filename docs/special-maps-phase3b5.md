# Phase 3B-5: 通常探索UIへの統合

2026-09-28。敵・戦闘・報酬は未接続。コミット／pushなし。

## 実装

通常の探索メニュー、HUDの実DOM、A/B・方向入力、音声経路、コンパス、ミニマップ描画を利用する。特殊地図専用の「帰還／地図／開扉」列は削除。Bは通常メニューを開閉し、メニューの帰還からsurveyをflushして奈落入口へ戻る。特殊地図中は通常メニューのセーブ枠を帰還に切り替え、退出時に戻す。ステータス・アイテム・スキル・デッキ・オプションは既存画面を利用する。

`special-map/context.js` がactiveなsessionとUIホストを明示的に仲介する。町経由で開始しても、フィールド使用contextはdungeonとして扱い、効果適用は特殊地図用ディスパッチャーへ先に分岐する。通常奈落のstateを特殊sessionで置換しない。保存スナップショットも従来の町／通常奈落情報を維持し、特殊地図runtimeは含めない。

HUDは既存のstatus要素を移設・復元し、値だけ特殊sessionを参照する。上部は「特殊地図／X:Y／調査」。気配は0固定。キャラクター・NPC・メッセージ欄は本編UIをそのまま利用する。

### 音楽・開始表示

| theme | BGM key |
| --- | --- |
| green | jungleZone |
| yellow | desertZone |
| その他 | dungeon |

純粋helper `getSpecialMapBgmKey()`で選択し、既存`startBgm()`へ渡す。BGM OFF・音量などは既存audio設定に従う。終了時は停止して奈落入口表示へ制御を返す。

既存floorLap描画で現在の地図名を表示。既存PixelFont（k8x12）を再利用し、計測縮小と最大幅指定で全文を画面内に収める。通常奈落の現行バナーは時間で自動消去する方式ではなく入力で閉じる方式のため、その挙動に合わせた。BxxFは表示しない。

### たいまつ・調査

- `session.renderState.torchFuel`は入場時100。成功した前進・後退のアニメーション完了時に1消費し、0で下限固定。
- 旋回・壁・閉扉・開扉のみ・多重入力では消費しない。自動歩行も同じ移動処理を使用。
- 0時は既存rendererの暗闇・ミニマップノイズへ移行。survey知識は保持し、燃料回復で再表示する。
- 再入場で燃料100・入口配置・扉closed。runtime exploredと永続surveyViewは従来通り別管理。
- 途中survey保存、100マス完了通知、完全地図、削除後の初期化は既存処理を維持。

### アイテム・スキルの明示的な振り分け

現在のdungeon使用可能アイテム18種類の効果を調査し、`SPECIAL_FIELD_EFFECT_TARGETS`で宛先を明示した。未登録の新しい効果は消費前に拒否する。

| 効果 | 特殊地図中の宛先／扱い |
| --- | --- |
| HP・SP回復、解毒、出血等の状態治療 | 本編冒険者。既存resolver・消費・保存を利用 |
| ウィングギフト | 本編冒険者。特殊地図帰還でも最大HP低下を解除。解除保存に失敗すれば元の冒険者を維持して帰還を止める |
| 導きのたいまつ、杖よ灯りを、稲穂の輝き | 特殊sessionの燃料のみ |
| オートウォーカー、全力疾走 | 特殊sessionの自動歩行のみ |
| 緊急脱出 | survey flush後に特殊地図を終了。通常の階層帰還処理を呼ばない |
| 魔除けのお香・退魔の護符・気配消し | 今回は気配0固定のため不要として拒否。アイテム／SPを消費しない |
| 宝箱探知アイテム | 宝箱未接続のため不要として拒否。消費しない |

拒否時は「今は使用する必要がない。」を表示する。インベントリの説明欄でも失敗メッセージを確認できる。通常奈落のpresence、気配抑制、incenseZone、torchへ適用するコードは呼ばない。

### 入口・exit・オートウォーカー

generated startDirectionが開口部なら採用、壁なら通常奈落と同じS/E/N/W順でruntime方向を解決する。生成オブジェクトは変更しない。入口だけruntime cellをstairsUp表示にし、通常の階層移動は発火させない。

exitは生成互換性のため保持するが、runtimeの通知・到達フラグ・表示・終了処理には使用しない。

既知セルのBFSを`known-path.js`へ抽出。通常側は従来の探索済み・障害物・鍵扉判定を渡し、特殊側はsurveyViewと独立cellsを渡す。特殊側autoPathもsession専用。入口を目的地として通常扉を自動開扉し、移動完了で自動閉鎖する。入口で停止して退出しない。手動の移動・旋回・決定・Bで中断する。

SEは既存playSe経路を維持。歩行step、衝突blocked、開扉door。タッチレイアウトのstep抑制は既存audio policyに任せる。移動170ms・旋回・開扉520msは既存共通定数を継続利用する。

## 検証

全Nodeテストを最終コードで2回実行：いずれも **1,685成功／0失敗**。

- `artifacts/phase3b5-node-tests.log`（約9.6秒）
- `artifacts/phase3b5-node-tests-repeat.log`（約10.0秒）

追加・更新テスト：torch消費・回復、既知道だけのauto path、扉開閉・SE・入口停止、手動中断、Bメニューとpause、survey flush失敗、現行全フィールド効果の宛先、回復・治療と非消費拒否、mainディスパッチャー、Wing Gift帰還処理、暗闇でもsurvey保持、生成exitとruntimeの分離。既存の共有コード・survey・保存・通常探索・入力テストも成功。

`node scripts/audit-special-map-runtime.mjs`で全65,536 seedの実sessionを生成した。

| 項目 | 結果 |
| --- | ---: |
| 壁を向く開始方向 | 0 |
| 不正入口／stairsUp表示不整合 | 0 |
| 生成地形への変更 | 0 |
| runtimeのみ方向を補正したseed | 25,809 |

監査結果は`artifacts/special-map-runtime-phase3b5.json`。3レイヤーの全seed SHAは完全一致。

```text
topology b985066f1fb5720c8f27c56d925e58d700af9d637d90cd2c6e0fc33ce0920e58
doors   6a625e0aac5a8c87367c2ab52e46570dcb195e4260ecb7cacc4f1167c81f693f
ecology 04c4c6902ef72c567a2166d4b4bd41d83b7ca89eab99a8926b0ceaa5d7c96a8a
```

seed12345も入口(0,2)、東向き、topology `65bbb4f0`、doors `04ec0371`を維持。

### ブラウザ

ローカル専用QAセーブでPCブラウザ確認：入場バナー、歩行、Bメニュー、導きのたいまつ消費・回復、オートウォーカー使用、入口停止、メニューから帰還を確認。seed12345では(1,3)東の扉を開けて跨ぎ、反対側から自動歩行で再開扉・通過して入口(0,2)へ到着。往復6歩後の燃料94%。退出せず停止した。

390pxでは通常A/B・方向ボタン、メニュー、地図名バナー、HUD、ミニマップのクリック拡大、帰還を確認。document scrollWidth=390で横はみ出しなし。途中調査3/100の再入場保持、燃料100への初期化、調査完了地図の全表示も確認。ブラウザconsole errorなし。

スクリーンショット：`artifacts/phase3b5-pc.png`、`artifacts/phase3b5-mobile.png`、`artifacts/phase3b5-mobile-banner.png`。

iPhone・USBゲームパッド実機は未検証。ブラウザ上のキー／ボタン経路と既存入力テストで確認した。音の実聴は行っていないが、BGM helper・既存音声経路・SEテストで確認した。

## 変更ファイル

- `js/special-map/context.js`：明示context・host・BGM helper（新規）
- `js/special-map/field-environment.js`：フィールド効果の宛先・拒否境界（新規）
- `js/known-path.js`：state非依存の既知経路BFS（新規）
- `js/special-map/session.js`：燃料、開始方向、入口表示、自動歩行、exit退役
- `js/special-map/exploration-ui.js`：通常HUD・メニュー連携、専用controls削除
- `js/main.js`：host接続、HUD値、BGM、アイテム／スキル分岐と帰還
- `js/menu.js`：帰還枠切替、拒否理由表示
- `js/town.js`：既存コマンドDOM復元関数の公開
- `js/explorer-preview-ui.js`：入場時のコマンド処理と説明
- `js/autoReturn.js`：既存判定を保持したBFS利用
- `js/renderer.js`：通常stairsUp描画の利用、地図名バナー幅制御
- `css/explorer-preview.css`：旧controls削除、通常HUD用配置
- `tests/special-map-integration.test.mjs`（新規）、`special-map-session.test.mjs`、`special-map-survey.test.mjs`、`special-map-doors.test.mjs`
- `scripts/audit-special-map-runtime.mjs`（新規）、本報告・監査JSON・実行ログ・画面記録

生成器、共有コード形式、セーブ形式は変更していない。探索runtime全体を永続化する処理も追加していない。
