# Phase 3C-1 Candidate 2 — 比率変換のみの比較

未承認の比較候補。V1互換性仕様として凍結していません。

## 変更箇所

`js/special-map/ecology.js` の比率元値のみ `return n*n*n` → `return n`。
乱数nは従来と同じ1〜100、同じ回数・同じ順序で取得します。
識別用revisionは `v1-candidate-2` に更新。fingerprintの計算方式は変更なしです。
revisionもfingerprintに含まれるため、比率が同じ単一種でも診断fingerprintは候補1と異なります。

変更していないもの：種数確率、allowlistと順序、baseWeight、重複なし選出、
PRNG/sub-seed、整数正規化・合計10,000、ruleset、seed、theme、署名、共有コード、
Phase 3A地形、Phase 3B探索。

## 比較方法・資料保存

旧生成器を `tests/fixtures/special-map-ecology-candidate-1.mjs` に保存しました。
これは監査・テスト専用で、ゲームからimportしません。
Candidate 1の既存Markdown/JSONは変更せず残しています。

`scripts/audit-special-map-ecology.mjs` は正式V1の全65,536 seedについて、
候補2を2回生成し、候補1とも比較します。
選出monsterIdの**順序まで**一致、ruleset/seed/theme一致、要求種数の上限処理一致を検査。
候補1を全件再生成したSHA-256が既存記録と一致することも検証します。
出力先はcandidate-2専用Markdown/JSONなので、candidate-1を上書きしません。

要求種数は監査側で同じspecies-countストリームの最初の抽選を独立再計算。
生成器へ監査用乱数消費や出力フィールドを追加していません。
希少種集計は「いずれかのテーマでbaseWeight ≤ 100,000」と明記した監査上の分類です。
その分類を生成規則には使いません。

## 結果

- 全seed整合性違反・A/B生息種不一致：すべて0。
- 単一種133枚はseed・monsterIdとも全件維持。
- 90%以上：12,770 → 1,537枚。95%以上：8,447 → 713枚。
- マイケーファー100%：0 → 0枚。90%以上：437 → 25枚。
- 要求5種9,712枚のうち、green985枚とyellow980枚が4種に制限。
  その他テーマの候補不足は0。実際の5種は7,747枚。
- 低ウェイト8種のうち単一種0枚はマイケーファーとフォルターパンツァー。
  他6種は1〜2枚。全種の含有地図数・単一種数は候補1と不変。
  今回は比率のみ変更しているため、単一種の不足を改善する変更ではありません。

全統計・割合・全魔物統計・低ウェイト種統計・比較seed・fingerprintは
`special-maps-ecology-audit-candidate-2.md` と
`../artifacts/special-map-ecology-candidate-2.json` に記録。

暫定全seed SHA-256：

- Candidate 1: `33f521694198da8fd73de895fd844c6042d8c88f364c1465aa3c181968dc20a4`
- Candidate 2: `04c4c6902ef72c567a2166d4b4bd41d83b7ca89eab99a8926b0ceaa5d7c96a8a`

## 回帰確認

全自動テスト1,653件成功・失敗0（比較用4件追加）。
Phase 3Aの全域監査も正式V1と旧版で成功：

- formal: `b985066f1fb5720c8f27c56d925e58d700af9d637d90cd2c6e0fc33ce0920e58`
- legacy: `3d92b41f2e2994ca08e40626cd85e498a20c8c0dfc1a135c32472641805df592`

seed12345の入口(0,2)西・出口(3,0)・東向き・torture・地形fingerprint
`65bbb4f0` は不変。候補2の生態系fingerprintは `59f293a7`。
Phase 3B関連コードは無変更で、既存入退場・移動・分離・タッチ回帰テストが成功。
今回ブラウザ/iPhone実機の再検証は行っていません。

エンカウント・戦闘・報酬・宝箱・Lv・挑戦条件・扉は未接続のままです。

## 変更ファイル

- `js/special-map/ecology.js`
- `scripts/audit-special-map-ecology.mjs`
- `tests/fixtures/special-map-ecology-candidate-1.mjs`
- `tests/special-map-ecology-candidate2.test.mjs`
- `artifacts/special-map-ecology-candidate-2.json`
- `docs/special-maps-ecology-audit-candidate-2.md`
- `docs/special-maps-phase3c1-candidate2.md`（本書）

```sh
node scripts/audit-special-map-ecology.mjs
node scripts/audit-special-maps.mjs
node --test tests/*.test.mjs
```
