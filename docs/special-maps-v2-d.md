# V2-D — はじまりの白地図と正式名称

## 開発用導線のみ（追加指示を優先）

通常プレイの正式解禁は行わない。トレリーレンの会話・本編イベントは変更せず、面識ありでも「探検家テスト」OFFなら探検家テント／地図探索は従来どおり未解禁。

探検家テストON → 探検家テント → 特殊地図用署名登録（冒険者名とは独立、1～4文字） → **【開発用】はじまりの白地図** → テスト用3枚受取 → 地図鑑定 → 地図帳登録 → 地図探索 → 入場演出 → 正式地図名 → B1F。鑑定・登録は既存の一体フローを使う。後で受け取る場合はテントの「【開発用】白地図を受け取る」から再開する。

本番用 `grantStarterMaps` はAPIとして実装するが、UI／通常イベントからの呼出しはない。開発UIは `grantTestStarterMaps` だけを呼ぶ。

## 初期配布と保存保護

- 本番の受領記録は `specialMaps.starterMapsGranted`、開発用は **`specialMaps.starterMapsTestGranted`**。テスト配布では後者だけを立てる。両方とも存在する場合のみ正規化・save/loadで保持し、旧saveへ勝手に追加しない。テスト配布・鑑定・reload後でも将来の本番3枚を受領できることを検証。
- 未鑑定枠が3つ空いているときだけ、**3枚と受領flagを一括transactionで保存**する。枠不足なら抽選すらせず、既存地図も受領権もそのまま。鑑定・整理してから再受領可能。初期配布pendingや報酬pendingは不要。
- saveの `.temp` / `.backup` / `.current` 書込失敗では元のcharacterへ戻し、3枚の一部だけ渡したりflagだけ立てたりしない。保存成功前には受取完了・内容公開を行わない。
- seedは取得時のゲームRNGから0～65535。Lvは独立の `1 + floor(random * 5)` で1～5各20%。rarityはWHITE固定。発見者は保存済み地図署名。
- 所持済みV2地図のseedと今回のbatch内seedを避ける。衝突時は16bit範囲内を順送りし、有限回で空きを選ぶ。登録最大10／未鑑定最大3のため枯渇しない。固定RNGでも無限再抽選しない。
- `createUnidentifiedV2Map` は既存V2原本schemaを作る共通API。取得由来 `acquisitionMethod: 'starter'` を未鑑定表示に用い、正式名を隠す。
- 鑑定は既存 `inspectAppraisal` / `appraiseMap` のみ。これらはseed/Lv/rarity/署名をコピーするだけで、RNGを呼ばない。鑑定前・鑑定後・登録後のreloadで内容は固定。
- 新規ゲームは別冒険者なので初期状態。現在のコードにはNEW GAME+そのものはない。既存character正規化では受領flagと地図帳を保持し、将来のNG+でも `specialMaps` ごと引き継げる。NEW GAME+処理は今回追加しない。

## 命名revision 1

`前半語 + 後半語 + の地図 Lv.{level}`。名前全文は保存しない。`describeTestMap` のV2分岐から純粋な `describeV2MapName` を呼ぶ。元の仮名を使っていた既存V2原本にも同じ派生名を表示する。

前半語はLv帯、後半語はCandidate 3の共通themeから選ぶ。署名・rarityは選出乱数に含めない。同seed・同Lvなら色／署名が違っても同名。無効ruleset・seed・Lv・rarityは拒否し、UI wrapperは未対応として安全に扱う。

専用purposeは `map-name-prefix` と `map-name-location`。既存の固定整数PRNGを再利用する。themeはCandidate 3の既存 `floor-1-theme` を独立streamとして読み、3層地形の構築を一覧の再描画ごとに行わない。生成器内の乱数状態には触れない。

将来のecology・boss特性は命名policyの別revisionで扱う境界にする。敵実装の追加だけで過去原本の名前が勝手に変わらないよう、現在はそれらを入力しない。

### 前半語

| Lv | 候補 |
| --- | --- |
| 1～20 | 古びた、霞む、静寂の、寂れた、朽ちかけた、淡き、忘れられた |
| 21～40 | 淀んだ、歪んだ、陰鬱な、かすれた、彷徨う、翳りし、不穏なる |
| 41～60 | 禍々しき、血染めの、狂える、蝕まれた、荒れ果てた、異形の、忌まわしき |
| 61～80 | 猛き、深淵の、烈なる、破滅の、猛威の、奈落の、凶兆の |
| 81～100 | 終焉の、災厄の、冥府の、忘却の、滅びの、虚無の、深奥の |

### 後半語

| theme | 候補 |
| --- | --- |
| slate | 石廊、岩窟、石牢、灰廊、岩宮、石窟 |
| magic | 魔導廟、秘儀殿、魔術廊、星辰堂、秘術宮、魔導塔 |
| torture | 刑廊、拷問廟、苦界、刑獄、責苦殿、血獄 |
| red | 炎窟、灼炉、火葬坑、熔岩廊、火焔宮、灼熱洞 |
| blue | 氷窟、霜廟、凍宮、氷牢、霜洞、凍結殿 |
| green | 樹海、翠廊、苔宮、深森、緑窟、翠宮 |
| yellow | 砂墓、砂廊、黄塵窟、砂宮、流砂洞、乾きの墓所 |
| water | 水廊、水没宮、蒼淵、沈殿廟、深水洞、沈みの宮 |
| crystal | 晶窟、晶廊、玻璃宮、結晶殿、晶宮、水晶洞 |
| black | 黒廟、影廊、暗獄、冥窟、黒宮、常闇洞 |

指定のDQ9禁止語および漢字表記の代表的な揺れをテスト・監査で除外。各帯内の前半語重複0、themeを跨いだ後半語重複0。候補変更なし。監査最大19文字（例：`忘れられた乾きの墓所の地図 Lv.20`）。

### seed12345 / crystal fixture

| Lv | 名前 |
| --- | --- |
| 1 | 朽ちかけた晶宮の地図 Lv.1 |
| 20 | 朽ちかけた晶宮の地図 Lv.20 |
| 21 | 彷徨う晶宮の地図 Lv.21 |
| 40 | 彷徨う晶宮の地図 Lv.40 |
| 41 | 荒れ果てた晶宮の地図 Lv.41 |
| 60 | 荒れ果てた晶宮の地図 Lv.60 |
| 61 | 猛威の晶宮の地図 Lv.61 |
| 80 | 猛威の晶宮の地図 Lv.80 |
| 81 | 滅びの晶宮の地図 Lv.81 |
| 100 | 滅びの晶宮の地図 Lv.100 |

fixtureは `tests/fixtures/special-map-v2-names.json` に記録。

## UI・共有互換

V2の一覧・詳細・管理・入場バナーに同じ正式名を使用し、Lvを二重表示しない。発見者は別行。未鑑定は「はじまりの白地図」と番号のみ。V2一覧名は必要に応じて折り返す。旧版・V1の名前と表示は維持。

共有コードのbinary・HMAC・署名・payloadは変更なし。encode/decode後のcontentから同名を生成する。名前・受領flag・surveyは共有しない。受信側のsurveyは0/300。既存V2-Cの保存形式・原本キー・調査進捗も変更なし。

## 検証結果

- 全Nodeテスト: **1,842件成功、失敗0**。
- 命名全seed監査: 65,536 seed × `[1,20,21,40,41,60,61,80,81,100]` = **655,360件**。例外・空名・不正文字列・禁止語・theme不一致・再生成不一致0。各seedで名前生成前後の構造が一致。
- 命名比較SHA: `0c3c720d06b6af31e311c27fab4eac2ad55abbc083d6b6e10afd2da7fdab8687`。
- Candidate 3 seed12345 fingerprint: **3519b715**。
- Candidate 3全seed SHA: `c1dbc28cf7bfc9f78fffa32281d8d001b4b0a1a8f1aa2f146cb5d0a5559f0e95`（不変）。
- 全65,536セット／196,608フロア監査も成功。旧暫定topology・V1 topology／doors／ecology・Candidate 1／2のSHAも不変。
- PC 1280×900／touch 390×844のEdge実ブラウザで正常動作。トレリーレン面識あり・署名／地図なしのテストセーブを開始点に、まず探検家テストOFFで未解禁を確認し、ONに切り替えて開発用UIから受取・3枚鑑定登録・各B1F入場を実施。原本を直接注入せず、開発配布ボタンを使用。reloadごとにテスト設定がOFFへ戻ることと、本番受領flagが未設定のままであることも確認。
- 未鑑定3/3、異なる3seed、Lv1～5／WHITE、鑑定前reload、各鑑定登録後reload、受領済み再配布なし、正式名・theme・入場バナー対応、共有コードから同名を確認。iPhone実機・USBパッド実機は未実施。
- 詳細は `artifacts/special-map-v2-d/naming-audit.json`、`structure-audit.json`、`browser.json` とスクリーンショットに保存。

## 変更ファイル

- 新規データ: `data/special-map-starter.js`、`data/special-map-names-v2.js`
- 保存正規化・名前adapter: `data/special-maps.js`
- 開発配布・鑑定UI: `js/town.js`、`js/explorer-preview-ui.js`、`css/explorer-preview.css`
- テスト: `tests/special-map-v2-starter.test.mjs`、`tests/special-map-save.test.mjs`、`tests/explorer-touch.test.mjs`、`tests/explorer-preview.test.mjs`、命名fixture
- ブラウザ: `tests/browser/special-map-v2-d.mjs`、既存B/C/QAの名前選択fixture更新
- 監査: `scripts/audit-special-map-names-v2.mjs`、監査成果物、本書

## 次Phaseの予定のみ

将来の次地図LvはWHITE: +1～5、SILVER: +10、GOLD: +20、Lv100でclampしLv100でも継続取得。rarity抽選は暫定WHITE94%／SILVER5%／GOLD1%。今回は設計資料に記録するだけで、実行コード・ボス報酬・drop・pendingRewardへ接続しない。

敵・戦闘・V2 ecology・ボス・報酬は未追加。LAST UPDATEは未変更。コミット・pushなし。
