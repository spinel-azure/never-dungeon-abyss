# 特殊地図F4互換性監査：履歴調査と基準の修復

調査日：2026-10-19 JST。Node.js v24.19.0。作業開始時のHEAD／ローカルmainはともに `77ec690e9b6128526e9df8ae6e67671c6843eade`、`git status --short` は空（clean）。生成処理・ゲームデータ・共有コードは編集していない。LAST UPDATE、コミット、push、公開も実施していない。

## 結論

旧F4期待値は当時の仕様では正しく、現行との差は三女神強化ではなく、2026-10-14の連続する2コミットで説明できる。両変更は実装と同時更新されたテストに仕様意図が残っている。F4監査ツールの期待値更新が漏れていた。旧期待値を単に現行測定値へ置き換えず、変更前・変更後・現行を同一の全域条件で再計測して確定した。

採用基準：**`7f1320b0d610b0a865a3b8b53c957a132d09976a`**。Lv別テーマ抽選と黄金郷固定生態系の両仕様が初めてそろうコミット。この直後の全域結果が現行mainと一致するため採用。`9009aea720c705560a9e7cfa32d4c496caecbd6d` は三女神前後比較の参照として保持するが、基準採用の根拠にはしない。

## 発生履歴と分類

1. 旧期待値導入：`5d6a94b9e1ca22e6b80bf4e64bb5494ea9d98fa6`（F4周回報酬）。同コミットの `artifacts/special-map-f4/compatibility.json` は旧全6SHA・旧fingerprintでpassed=true。
2. テーマ変更直前：`c0cdfee1a7b17b4bc2ce52d863775ad7abcbe2e6`。今回の全域再測定で旧期待値6項目とfingerprintを再現。旧導入からここまで、V2生成・正規シリアライズ・C2生態系・生態系pool・地図命名の対象ファイルとプロファイル元artifactに差分なし。
3. `70b657f245fd1f46a0b8c2edeed0a620d83a3f94`（Implement level-weighted V2 map themes）。10テーマ一様抽選からLv帯別重みへ変更。`generator-v2.js` と `special-map-names-v2.js` が同じ `selectV2NormalTheme` を使用する。**意図的な仕様変更**。
   - 同コミットの `tests/special-map-theme-lottery-v2.test.mjs` に全11帯の明示期待表、100分率境界、seed12345のLv1=torture／Lv61=crystal／Lv100=blackが記録される。Lv100のslate/magic/torture/red/blue各1%もここで導入。
   - 同コミットの `tests/special-map-v2.test.mjs` はfingerprintを明示更新し、全Lv・rarityで「テーマを除いた地形」を維持する検査へ変更。単なる監査方式変更ではなく、ゲーム上のテーマ自体が変わる。
   - seed12345・Lv1はcrystal→torture。構造のcanonical配列には各階themeIdが含まれるため、壁が変わらなくても構造SHAとfingerprintが変わる。通常6プロファイルの生態系SHAだけが変化し、特殊16プロファイルは不変。
4. `7f1320b0d610b0a865a3b8b53c957a132d09976a`（Add completed map badges and fixed special map identities）。直前コミットは上記70b657そのもの。**意図的な仕様変更**。
   - `ecology-v2-candidate-2.js` に `V2_GOLD_FIXED_ECOLOGY` と固定配分（ズィルバー45%／マイ40%／甲虫王15%）を追加。全3階固定、revisionも専用値になる。
   - 同コミットの `tests/special-map-gold-boss.test.mjs` で専用revisionと全階固定speciesを明示検証。特殊地図名の固定化は `tests/special-map-special-themes.test.mjs` に期待名を記録。
   - 生態系22プロファイル中、goldの4プロファイルだけが変化。他18プロファイルとV2構造SHAは不変。名前の文字列は本監査のhash対象ではなく、themeIdも変わらないため、名前固定化そのものはSHA差の原因ではない。

分類②「生成は同じで監査方法だけ変化」は該当なし。旧監査の対象フィールド・JSONの順序・改行・seed範囲・profile順序に履歴変更はない。分類③「意図しない互換性破壊」および分類④「根拠不明のhash差」は、今回の検査範囲では検出されなかった。

## 測定条件（旧監査と同じ）

- V2構造：seed 0～65535（65,536件）、ruleset=special-map-v2、Lv1、WHITE。`canonicalV2Structure(map)` にLFを1つ付け、seed昇順にUTF-8でSHA-256へ投入。themeIdを含む主検査を削除していない。
- V1/legacy：同じ65,536seed。V1／legacy topologyは元オブジェクトのJSON.stringify＋LF、V1 doors／ecologyは既存canonical関数＋LF。旧4期待値を完全維持。
- V2生態系：各プロファイルseed 0～65535、22×65,536＝1,441,792件。profile外側・seed内側。C2生成結果の `canonicalV2Ecology`＋LF。通常地図は命名処理からthemeIdを解決し、特殊地図は明示themeIdを入力。Lv100 GOLD通常プロファイルに鑑定時の特殊テーマ抽選を新たに挟まない（旧監査条件を維持）。
- profile順：通常 (1 WHITE, 5 WHITE, 25 SILVER, 60 WHITE, 100 WHITE, 100 GOLD)、gold (1 WHITE, 60 WHITE, 100 WHITE, 100 GOLD)、rice→dusk→tender各 (80 WHITE, 90 WHITE, 100 WHITE, 100 GOLD)。
- profileの元artifactは当初から変更なし。今回、同じ22条件をaudit-coreへ固定し、別の結果JSONの変更で検査範囲が変わらないようにした。
- 追加診断：canonical構造配列のfloor[8]（themeId）だけをnullにした副SHA。主検査の代替ではない。全履歴・現行で `9b5ddabc33fdea9ff3a7576a02984eee25ecb929de9d538c384795c7380307dd`。壁、階段、鍵箱、ボス部屋、扉、階間接続を含む残りの全canonical内容は不変。
- 生態系は全体SHAに加えて22個の個別profile SHAを保存・照合し、差が出たprofileを追跡可能にした。

## 完全な旧／新期待値

|項目|旧F4|採用基準／現行|
|---|---|---|
|v2Structure|`c1dbc28cf7bfc9f78fffa32281d8d001b4b0a1a8f1aa2f146cb5d0a5559f0e95`|`3ef9d97820479cf1e53a50f3ca1a77a1c5b95ce3968714c4e8185bf23f9fb84a`|
|v1Topology|`b985066f1fb5720c8f27c56d925e58d700af9d637d90cd2c6e0fc33ce0920e58`|`b985066f1fb5720c8f27c56d925e58d700af9d637d90cd2c6e0fc33ce0920e58`|
|legacyTopology|`3d92b41f2e2994ca08e40626cd85e498a20c8c0dfc1a135c32472641805df592`|`3d92b41f2e2994ca08e40626cd85e498a20c8c0dfc1a135c32472641805df592`|
|v1Doors|`6a625e0aac5a8c87367c2ab52e46570dcb195e4260ecb7cacc4f1167c81f693f`|`6a625e0aac5a8c87367c2ab52e46570dcb195e4260ecb7cacc4f1167c81f693f`|
|v1Ecology|`04c4c6902ef72c567a2166d4b4bd41d83b7ca89eab99a8926b0ceaa5d7c96a8a`|`04c4c6902ef72c567a2166d4b4bd41d83b7ca89eab99a8926b0ceaa5d7c96a8a`|
|v2Ecology|`ab38d1e17e4f8d47c8fc89d895e20ed4eba33cc6e781db35cc0aac4a66a17dca`|`a8d7cdfae12a57726403504fca40cd2c00fefab8bbac9a45c6ef396fbc696170`|
|seed12345 fingerprint|`3519b715`|`36351d4a`|

Lv別テーマ導入直後、黄金郷変更前の中間V2生態系SHAは `9e3f074c82895f627bc9c9fa08b1f5e4ce0c8cb9478bb508bc5b71d7a6f9216a`。これにより、最終差が2つの別変更からなることを確認した。

## 変更ファイル

- `tools/verify-special-map-f4-compatibility.mjs`：固定基準との検証CLI。通常起動は必ず全域生成。失敗項目を列挙し非ゼロ終了。
- `tools/special-map-f4-audit-core.mjs`：旧と同じhash入力、固定22条件、全seed測定、地形副SHAとprofile別SHA。
- `tools/special-map-f4-baseline.json`：手動審査して採用した基準SHA・完全期待値・旧基準・入力条件。実行時の自動更新処理はない。
- `tools/special-map-f4-audit-validation.mjs`：6主要SHA・fingerprint・全seed/profile条件・副SHAの照合。
- `tools/measure-special-map-f4-reference.mjs`：完全commit SHAをgit archiveで一時展開し、現行と同じ測定器で過去ソースを測定する。checkout／reset不要。
- `tools/verify-goddess-superboss-compatibility.mjs`：旧監査スクリプト文字列を書き換える方式を廃止し共通測定器を使用。元の三女神記録は維持し、再確認は別recheck.jsonへ保存。古い結果を流用する環境変数も廃止。
- `tests/special-map-f4-audit.test.mjs`：実CLIの成功／失敗・期待値非更新・履歴分類の回帰テスト。
- `artifacts/special-map-f4/history-before.json`、`history-after.json`、`history-gold.json`、`current-measurement.json`：同じ測定器の各時点の結果。`compatibility.json`：修復した通常監査の結果。
- 本報告書。ゲーム側ファイルは変更なし。

## 再現コマンド

```powershell
node tools/measure-special-map-f4-reference.mjs c0cdfee1a7b17b4bc2ce52d863775ad7abcbe2e6 artifacts/special-map-f4/history-before.json
node tools/measure-special-map-f4-reference.mjs 70b657f245fd1f46a0b8c2edeed0a620d83a3f94 artifacts/special-map-f4/history-after.json
node tools/measure-special-map-f4-reference.mjs 7f1320b0d610b0a865a3b8b53c957a132d09976a artifacts/special-map-f4/history-gold.json
node tools/verify-special-map-f4-compatibility.mjs
node tools/verify-special-map-f4-compatibility.mjs --check-report artifacts/special-map-f4/history-gold.json
node --test tests/special-map-f4-audit.test.mjs
node tools/verify-goddess-superboss-compatibility.mjs
```

`--check-report` は保存済み／テスト用測定データの判定のみで、生成監査の代わりには使わない。通常コマンドにはseed数削減や期待値採用のオプションはない。負例テストは測定結果コピーの構造／生態系digestなどを改変し、実CLIがstatus=1となることと、基準JSONのバイト列が変化しないことを検証する。本体の生成処理は改変しない。

## 実行結果

- 変更直前・テーマ変更直後・黄金郷変更直後・現行main：各65,536seed、22×65,536生態系レコードを再測定済み。所要時間は順に110.343秒／108.824秒／98.247秒／100.131秒（同時実行の影響を含む）。
- 修正後の通常F4監査：96.673秒、passed=true、failures=[]、終了コード0。6主要SHA、fingerprint、追加地形SHA、全22profile SHA一致。
- Node全回帰：2,143件成功、失敗0。追加監査テスト14件を含む。
- 負例12ケース：構造・生態系・V1/legacyなど6digest、fingerprint、seed数、profile数、profile順序、個別生態系SHA、地形副SHAの改変をすべて非ゼロ終了で拒否。基準ファイルは変更されない。
- 三女神参照9009aeaとの再照合：両側で同じ全域監査を再実行し一致、採用基準とも一致、終了コード0。結果は `artifacts/goddess-superboss-compatibility-recheck.json`。元の `artifacts/goddess-superboss-compatibility.json` は一切変更していない。
- `git diff --check` 成功。ゲーム本体・既存fixture・生成データは差分なし。再現できないhash差や未解決の監査失敗はない。

## 注意・今後の運用

旧共有コードの文法が壊れた変更ではないが、同じV2コードでもテーマ／生態系の意味は10月14日に意図的に変わった。したがって「旧F4と完全互換」とは表現しない。今回、旧テーマや旧生態系を復元するゲーム変更は行っていない。今後は生成仕様変更と基準更新を同じレビューで扱い、保存済み地図・共有コードの意味を維持する必要がある場合は生成revisionを分けることを推奨する。

正当性の根拠はリポジトリの実装・同時更新テスト・全域再計測であり、未収録の元Excelや当時の会話を参照したという主張はしない。監査範囲外の全Lv×全rarityの全seed組合せまで今回検証したわけではない。旧検査の65,536seed／22プロファイルは維持している。
