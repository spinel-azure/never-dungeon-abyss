# 特殊地図 V2-C — 3層の永続調査

## 保存形式と原本

登録済み `special-map-v2` 原本に `surveyedMasks: [B1F, B2F, B3F]` を追加する。各要素は100bitを25文字の小文字16進表現で保持する。セルindexは `y * 10 + x`、各文字内の下位bitから4セルを格納する。3層で75文字。walls、階段、箱、扉配置は保存せず、既存Candidate 3から再生成する。

各層countはmaskの立っているbit数、総合countは3層の和、完了は総合300で算出する。V2のcount・complete booleanは永続保存しない。原本キーは既存の `ruleset + seed + level + rarity + discovererName`。Lv・rarity・署名の異なる原本へ知識は流用しない。

旧V2のmask欠落は3層空maskへ正規化。不正文字・25文字でないmaskはその層だけ空にし、他層の正常値は保持する。配列の欠けた層は空、余分な要素は採用しない。V1の単一 `surveyedMask` をV2へ変換しない。save version、共有コード、生成rulesetは変更しない。

## 訪問・描画・runtimeの分離

- 初回B1F入口、成功歩行の移動先、階段移動先を記録。同じセルの再訪は冪等。
- 金箱・前室・BOSSも通常セル。箱開封や扉解錠だけでは増えない。BOSSから他セルを埋めない。
- `floors[n].explored` は今回の探索だけ。`session.surveyedMasks` は過去探索を含む知識。
- 現在階層のmaskから作った `surveyView` を既存ミニマップ／オートウォーカーへ渡す。未調査セルは既存ノイズ。扉は生成位置とruntime開閉を参照する。
- 300/300を初めて保存した時だけ既存調査完了通知を出す。保存失敗時は成功通知を出さず、保存エラーと再試行を優先する。
- 完了済み原本では3層のmaskが全bit有効なので、再入場時から全地形が見える。torch0時の既存暗闇・ノイズは引き続き適用し、知識を消さない。
- 再入場時はB1F入口、torch100、runtime explored `[1,0,0]`、金箱未開封・鍵未取得・ボス扉未解錠。これらを保存しない。

## 保存と失敗保護

V2専用adapterが未保存のmaskをsession内に保持する。最初の更新から750msでまとめて既存地図transactionへ渡す。連続歩行を一歩ごとの同期フルセーブにしない。表示はsession内の最新知識へ即時追従する。

階段移動前と帰還前は即時flushする。失敗時はその操作を止め、原本を既存transactionでロールバックする。未保存maskはsession内に残り、A／階段／帰還／次回保存で再試行できる。300到達も即時flushし、恒久解放通知は成功後。`pagehide` と非表示化でもflushする。強制終了時にストレージ自体が書込不能なら保存は保証できないが、通常操作ではエラーを隠してsessionを破棄しない。

終了時は保存タイマーとイベントリスナーを解除する。階層切替では同一sessionを維持し、調査知識・3層共有torch・各層runtimeを保持する。

## UI

HUD: `B1F` 等の既存chipに続き `調査 xx / 100 ・ 総合 xxx / 300`。完了後は総合部分を `調査完了` とする。地図詳細にも `調査 xxx / 300` または `調査完了`。入場確認は、調査保存と鍵・torchリセットを明記する。V1の100マス表示は不変。

## 削除・共有・V1互換

原本削除はmaskも削除する。同じコードの再登録・新規鑑定は空maskで開始。コードencoderは既存の原本フィールドだけを扱うためsurveyは共有されない。既存V1のAPI・保存形式・完了boolean・同期保存経路は維持する。

## 検証

自動テストはmask境界値、0/1/100/200/299/300、階層独立、重複訪問、階段到着、BOSS最終セル、通常最終セル、保存失敗と再試行、原本分離、コード非含有、削除再登録、runtime初期化、V1混在、詳細表示、pagehideとlistener解除を検証する。

`node --test tests/*.test.mjs`: **2回とも1,820件成功、失敗0**。新規22件に加え、V2-B時点で「survey無し」を期待していた既存テストをV2-C仕様へ更新した。V1の移動・survey・共有互換テストは維持する。

ブラウザ検証スクリプト: `tests/browser/special-map-v2-c.mjs`。隔離したEdge/PlaywrightでPCと390pxを検証し、実際の移動入力を使って300セルへ侵入する。survey値の直接補完は行わない。開発用キャラクター・原本の準備以外は既存入場・歩行・階段・金箱演出・扉・メニュー帰還・セーブ／CONTINUE経路を使う。出力は `artifacts/special-map-v2-survey/`。

PC（1280×900）・タッチ設定390×844とも成功。途中 `[25,10,0]` を帰還・再入場・再読込／CONTINUE後も保持した。実歩行で `[100,100,99]` にし、最後にBOSSへ侵入して `[100,100,100]` と完了通知を確認。再読込後も3層全表示、完了通知の再表示なし。runtimeはB1F入口 `(0,3)`、探索数 `[1,0,0]`、torch100、鍵未取得・扉未解錠へ戻った。torch0ではミニマップがノイズになり、既存たいまつアイテム使用後に全地図表示が復帰した。

通常奈落のdepth・cells・explored・torch・presence、HP/SP/GOLD・story/key flagsは比較一致。両viewportでブラウザ例外0、横スクロールなし。390pxのHUDは調査chipが2段目へ自然に折り返され、ミニマップ・通知・メニュー帰還操作を妨げない。iPhone／USBゲームパッド実機は未確認。

全seed監査は65,536セット／196,608フロアで失敗0。比較資料は `artifacts/special-map-v2-survey/generation-audit.json`。既存Candidate 1/2/3資料を上書きしない。

| 対象 | 今回も一致したSHA-256 |
| --- | --- |
| V2 Candidate 3 | `c1dbc28cf7bfc9f78fffa32281d8d001b4b0a1a8f1aa2f146cb5d0a5559f0e95` |
| V1 topology | `b985066f1fb5720c8f27c56d925e58d700af9d637d90cd2c6e0fc33ce0920e58` |
| 旧暫定topology | `3d92b41f2e2994ca08e40626cd85e498a20c8c0dfc1a135c32472641805df592` |
| V1 doors | `6a625e0aac5a8c87367c2ab52e46570dcb195e4260ecb7cacc4f1167c81f693f` |
| V1 ecology Candidate 2 | `04c4c6902ef72c567a2166d4b4bd41d83b7ca89eab99a8926b0ceaa5d7c96a8a` |

seed12345 V2 fingerprintは `3519b715`。V1 topology `65bbb4f0`、door `04ec0371` も不変。新しい生成仕様の凍結はしない。

## 変更範囲

- `data/special-map-survey-v2.js`: 純粋な3mask操作。
- `data/special-maps.js`: V2登録原本の正規化・更新。
- `js/special-map/survey-v2.js`: V2知識・保存scheduler・再試行。
- `js/special-map/session-v2.js`: survey adapter、入口／階段訪問。
- `js/special-map/session.js`: V2だけのvisit/flush委譲。
- `js/special-map/exploration-ui.js`: 階段前flush・ブラウザ非表示保存・cleanup。
- `js/explorer-preview-ui.js`, `js/main.js`: 詳細・HUD。
- `tests/special-map-survey-v2.test.mjs`: V2-Cの新規テスト。
- `tests/special-map-v2-feedback.test.mjs`: 保存失敗時のUI・ブラウザlifecycle・箱／扉操作。
- `tests/special-map-v2-session.test.mjs`, `tests/special-map-v2-data.test.mjs`: V2-B時点の期待値を更新。
- `tests/special-map-session.test.mjs`: DOMモックのlifecycle対応（V1期待値は不変）。
- `tests/explorer-touch.test.mjs`: V2詳細の0/100/300表示。
- `tests/browser/special-map-v2-c.mjs`: PC／390pxの実ブラウザ検証。
- `tests/browser/special-map-v2-b.mjs`: 既存ブラウザfixtureを保存可能な初期状態へ整え、通常状態の比較からV2 surveyだけを除外。
- 本報告書、および `artifacts/special-map-v2-survey/` のログ・監査JSON・画面。

LAST UPDATE、生成器、V1 survey helper、コード形式は変更しない。敵・戦闘・報酬・cleared・V2 ecology・Lv進行・pendingRewardは追加しない。コミット・pushは行わない。
