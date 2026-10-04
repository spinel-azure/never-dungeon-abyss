# V2-C 実機QA修正 — イベント確認と調査ジングル

## 変更範囲

- `js/special-map/session.js`: V2のセル訪問を移動アニメーション完了時に確定し、同じ処理内でセルイベントへ移行。確認待ち中は移動・旋回・開扉・auto-walker開始／継続を拒否する。V1の訪問タイミングは従来どおり。
- `js/special-map/session-v2.js`: runtimeのみの `cellPrompt`（`stairs` / `chest` / `null`）、案内文、キャンセル処理を追加。
- `js/special-map/exploration-ui.js`: A/Bの確認待ちをメニューより優先。通常メニューへのマウス・タッチ直接入力も遮断。V2の決定／キャンセルキーのautorepeatを抑制。300通知とSEを接続。
- `js/special-map/survey-v2.js`: 総合countのbefore/afterから最高の通過節目だけを選ぶ純粋helperと、100/200到達SEを追加。
- `tests/special-map-v2-feedback.test.mjs`: 入力ロック、キャンセル、階段到着、キーボードrepeat、ゲームパッドの押下edge、開封callback、節目SE、再読込相当、保存失敗、最後のイベントセルの回帰テスト。
- `tests/special-map-v2-session.test.mjs`、既存browserのB/Cシナリオ: 道中のイベント確認を明示的なBキャンセルで抜けるよう調整。
- `tests/browser/special-map-v2-c-qa.mjs`: 今回のPC／390pxブラウザQA。

## セル進入と入力

V2の成功歩行完了で、扉の自動閉鎖・torch消費 → runtime exploredとsurvey更新 → セルイベント判定の順に処理する。次の自動歩行処理へ戻る前に `cellPrompt` を立てるため、移動完了と確認待ちの間に通常入力を受け付ける時間はない。

階段はAで既存階段遷移、B1F入口では既存帰還へ進む。Bは位置・向きを変えず確認待ちだけ解除する。解除後は移動可能で、その場のAでも再度階段を使用できる。

階段遷移による到着と初回入場は、歩行による再進入と区別する。到着先は案内を表示し、追加の `cellPrompt` を自動設定しない。既存階層バナーが最初の入力を受け取り、その後通常探索へ戻る。キーボードのEnter/X/Z長押しrepeatはV2で無視する。既存ゲームパッドAは押下edge、タッチAはrelease処理を維持する。

未開封金箱ではAで既存Three.js演出を開始し、完了callbackでのみ鍵を取得する。Bキャンセルはその場に留まる。開封済み箱への再進入はロックしない。演出中は既存transitionロックに加え、直接メニューボタンも受け付けない。

auto-walkerにも同じ進入処理を適用し、階段・未開封箱で停止する。階段の自動使用は行わない。

## ジングルと永続化

| 総合調査数の変化 | 既存SE ID | 音源 |
| --- | --- | --- |
| 99 → 100 | `battleVictory` | `fanfare.wav` |
| 199 → 200 | `battleVictory` | `fanfare.wav` |
| 299 → 300 | `importantItem` | `juuyou-item.mp3` |

各層の100ではなく3層合計を比較する。再訪・既存maskのロードでは発火しない。複数の閾値を跨ぐ場合は最高の1種類だけを選ぶ。新しいSE登録・直接Audio再生・永続フラグは追加しない。既存のSE ON/OFF・音量・音声policyを通す。

300は既存方針どおり保存成功後の調査完了通知と同時に1回再生する。保存失敗時は未保存maskと確認待ちを保持し、保存再試行成功後に通知・SEを出す。階段・金箱が最後のセルなら、完了通知に確認案内を併記して双方を残す。BOSSセルも通常の訪問と同様に完了する。

V2のsurvey保存形式、coalesced save、flush／失敗保護、原本単位管理は変更しない。V1のsurvey・UI・audio、生成器、LAST UPDATEは変更しない。

## 検証

- `node --test tests/*.test.mjs`: **1,827件成功、失敗0**。
- 全seed監査: **65,536セット／196,608フロア**、全検査の失敗0。
- Candidate 3 seed12345 fingerprint: `3519b715`。
- Candidate 3全seed SHA: `c1dbc28cf7bfc9f78fffa32281d8d001b4b0a1a8f1aa2f146cb5d0a5559f0e95`（不変）。
- 旧暫定topology／V1 topology・doors・ecology／Candidate 1・2の全seed SHAも一致。
- 詳細監査: `artifacts/special-map-v2-c-qa/structure-audit.json`。
- ブラウザ結果・画像: `artifacts/special-map-v2-c-qa/`。ローカルEdgeでPC 1280×900、touch 390×844を検証。階段往復・入力停止／解除・開封演出・鍵取得・開封済み再訪を実行。
- ジングル確認は99／199／299の保存mask fixtureを用意し、その後の1セルを実際に歩行。既存AudioContextのsource開始成功と音源URLを記録し、帰還・reload・再入場後に再発火しないことを検証する。音を人間が聴いて評価した結果ではない。

V2-D、敵・戦闘・報酬へは進めない。コミット・pushなし。
