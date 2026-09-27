# Phase 3C-1: 生態系生成・分布監査（V1候補1）

**未承認・確率調整前の候補です。正式V1生態系として凍結していません。**
承認前はゲームへ接続しません。既存地形・探索・セーブ・コードには変更なし。
Phase 3C-2はエンカウント・戦闘接続、3Dは宝箱・報酬・危険度・挑戦条件です。

## 成果物

- `js/special-map/ecology.js`: 純粋生成器、整数正規化、診断fingerprint。
- `js/special-map/ecology-pools-v1.js`: 候補ID・順序・baseWeightの明示snapshot。
- `scripts/ecology-pool-provenance.mjs`: 現行遭遇処理からsnapshot根拠を再計算する開発専用ツール。
- `scripts/audit-special-map-ecology.mjs`: 正式V1の全65,536 seed監査とMarkdown/JSON出力。
- `scripts/inspect-special-map.mjs`: 既存ASCIIに生態系ID・名前・比率・別fingerprintを追加。
- `tests/special-map-ecology.test.mjs`, `tests/special-map-ecology-helper.mjs`: 通常テストと監査検証器。
- `docs/special-maps-ecology-audit-candidate-1.md`: 全テーマ・全魔物統計、単一種全seed、偏重例、全baseWeight。
- `artifacts/special-map-ecology-candidate-1.json`: 同じ監査の機械可読版。

## 調査根拠と候補の決定

区域とtheme対応は `js/floorTheme.js` / `data/floor-zone-names.js`。
通常遭遇の実行順序は `js/main.js:getRandomEncounterEnemyPartyData`。

1. クエストによる強制敵（今回除外）。
2. `data/enemies.js:getRandomEncounterEnemy` の全区域共通マイケーファー1.5%。
3. 残り98.5%は以下の通常テーブル。区域内の各階を同じ重みとして集計。

|theme|対象階|通常候補の根拠|
|---|---|---|
|slate|1–9|enemies.js の getRandomEnemy：深度条件内を等確率|
|magic|10–19|magic-region-enemies.js の formations|
|torture|20–29|torture-region-enemies.js の formations|
|red|30–39|enemies.js の getRandomEnemy|
|blue|40–49|enemies.js の getRandomEnemy|
|green|50–59|enemies.js の getRandomEnemy|
|yellow|60–69|enemies.js の getRandomEnemy|
|water|70–79|water-region-enemies.js の formations（78Fの混成も含む）|
|crystal|80–89|crystal-region-enemies.js の formations|
|black|90–99|dark-region-enemies.js の formations|

各階で有効な編成の実効 `formation.weight` を正規化。混成編成は異なる種へ等分し、
同種複数体を二重加算しません。階ごとの確率を区域内で平均します。
これは「遭遇頻度を種の選出ウェイトへ変換する」ための明示的な設計上の集計方針であり、
本編の個体数分布そのものの再現ではありません。
通常種合計985,000へ最大剰余法で整数化し、希少枠15,000を加え、各テーマ合計1,000,000。
小数での元確率集計は開発用snapshot作成時のみ。生態系生成時はこの固定整数表しか参照しません。
全魔物の具体的な値は監査レポート末尾のテーマ別表に掲載しています。

**魔術区域の現行挙動に注意:** `defineEncounterFormation` は第3引数をweightとして扱います。
魔術区域は第2引数conditions内にweightを書いているため、現状の実効weightは全編成1です。
記述上の18/10等を勝手に有効値と見なさず、実効値から集計しました。
今回通常奈落の挙動修正はしていません。将来本編側を直しても固定snapshotは自動変更されません。

`randomEncounter` と `isBoss` だけで全分類は判断できません。
例えばマイケーファーは `randomEncounter:false` でも通常遭遇の希少分岐に存在します。
一方ミミック（宝箱戦）・フェルフォルガー（徘徊専用）は除外。
ボス定義 `data/bosses.js`、イベント・クエストの強制戦経路も候補取得に使用しません。
魔術区域で定義上深度が合っても編成側に出ない巨蜘蛛・ワスプ・ポイズントード・バンシー等は除外。
クリスタルミミックは通常区域編成に明示されているため採用しています。
実行時に敵辞書を走査して候補を自動追加する処理はありません。
HP/ATK/EXP等の性能はコピー・変更していません。

## 暫定生成規則

明示的に `special-map-v1` と既存 `phase2a-1` を受理し、それ以外は拒否。
全seed分布レポートは正式V1を対象とします。legacyは別乱数ドメインのまま単体テストします。
seedは0–65535の整数のみ。Phase 3A生成器で入力/テーマを検証し、渡されたblueprintは変更しません。
検証用の純粋な再生成は別の呼出しの乱数状態を消費しません。
既存生成器へ生態系を付加する変更も行っていません。

種数抽選は以下の1万分率。候補不足時は候補数に切り詰めます。

|種数|暫定確率|
|---|---:|
|1|0.20%|
|2|20.00%|
|3|35.00%|
|4|30.00%|
|5|14.80%|

- PRNGは既存V1 Mulberry32／用途別FNV-1a sub-seed基盤を再利用。
- 独立した用途名: `ecology-species-count`, `ecology-species`, `ecology-weights`。
- 種数を決め、固定poolのbaseWeightによる非復元抽選で生息種を選出。
- 選ばれた各種へ、1～100の一様整数の3乗を仮ウェイトとして付与。
- 各種に最低1を配り、残りを最大剰余法で分配。同率端数は選出順。
- 最終weightは正の整数、合計10,000。単一種は10,000、複数種は全種必ず正数。
- 整数積は1e10未満でJSの安全整数範囲内。日時・端末・署名・セーブ・DOM・Math.random非依存。
- fingerprintは候補版/ruleset/seed/themeId/順序付きspeciesの固定配列JSONにFNV-1a 32bit。
  診断値であり暗号学的認証には使いません。地形fingerprintは完全に別です。
- 全seed SHA-256はseed昇順の上記canonical JSONとLFを連結して計算。
  候補版 `v1-candidate-1` の比較値であり、承認済み互換性ゲートとしては固定しません。

## 初回分布の読み方・要判断点

単一種133枚（0.20294%）は指定の目安内です。
90%以上偏重は12,770枚（約19.49%）。3乗ウェイトの影響が強いので、ここは承認前に要評価です。
マイケーファー100%は0枚、90%以上437枚、含有18,153枚（約27.70%）。
100%が0枚でも異常として補正していません。

**候補数と種数の影響:** 密林/砂漠は通常3種＋希少1種の4候補。
種数4または5を引くと全候補が選ばれます。他の5候補区域も5種なら同様です。
したがってbaseWeight 1.5%は「最初の1種の選出率」であって、地図含有率ではありません。
また生息比率自体はbaseWeightと独立なので、選ばれた希少種も高比率になれます。
希少種含有をもっと抑えるなら、承認前に種数分布・選出上限等の共通規則を見直す余地があります。
今回この結果を見てからの確率調整・個別seed補正は実施していません。

## 実行方法・確認

```sh
node scripts/inspect-special-map.mjs 12345
node scripts/audit-special-map-ecology.mjs
node scripts/audit-special-maps.mjs
node --test tests/*.test.mjs
```

生態系全65,536 seedを2回ずつ生成し、全件一致。検査項目の違反はすべて0。
地形も正式V1とlegacy各65,536 seedを再監査し、既存の固定SHA-256を通過：

- formal: `b985066f1fb5720c8f27c56d925e58d700af9d637d90cd2c6e0fc33ce0920e58`
- legacy: `3d92b41f2e2994ca08e40626cd85e498a20c8c0dfc1a135c32472641805df592`
- 正式V1 seed12345: (0,2)西入口、(3,0)出口、東向き、torture、地形 `65bbb4f0` のまま。
- 同seedの候補生態系fingerprint: `fa8d0653`。

通常テストに反復100回、境界seed、不正入力、署名独立性、正規化端数、Math.random例外化、
snapshot出典再計算、検査器の異常検出、runtime非接続を追加。
2026-09-27の全自動テストは1,649件成功・失敗0（今回20件追加）。`git diff --check` も通過。
ブラウザ・UI・入場・探索・戦闘・セーブ処理には変更がないため、新規UI実機確認は対象外。
