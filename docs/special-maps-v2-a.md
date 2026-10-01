# V2-A: ownership and code format candidate

2026-10-01。Candidate 2構造は変更せず、地図原本・保存・鑑定・共有だけを接続。
正式製品仕様の永久凍結ではない。V2-B・多層探索・戦闘・報酬には進んでいない。

## 事前確認

施錠中の第3層は**鍵箱のセルを含めて合計98セル**へ到達できる。
鍵箱を99セル目として追加していない。前室とBOSSの2セルは施錠中に到達不可。
全体は各階100セル、施錠中3層合計298セル。独立BFSによる全seed監査で確認。

## データと識別

V2 ruleset: `special-map-v2`。

```js
{
  rulesetVersion: 'special-map-v2',
  seed: 12345,           // integer 0..65535
  level: 50,             // integer 1..100
  rarity: 'SILVER',       // WHITE | SILVER | GOLD
  discovererName: '†ルル' // existing NFC-normalized 1..4 BMP characters
}
```

|ID|JSON配列の構成|
|---|---|
|layout|ruleset, seed|
|content (V2)|ruleset, seed, level, rarity|
|original (V2)|ruleset, seed, level, rarity, discovererName|
|content (V1/旧暫定)|ruleset, seed（従来どおり）|
|original (V1/旧暫定)|ruleset, seed, discovererName（従来どおり）|

完全重複は容量判定より前。同内容・別署名のみ確認する。
同seedでもLvまたはrarityが違えば別内容。同一bookで未鑑定3・登録10を共有。

V2 normalizeは値を検証し、不正なlevel/rarityを補正しない。
所有者情報としてid/discoveryId/acquisitionMethod/memo/favorite/clearedを扱う余地を維持。
生成されたfloors・walls・runtime・V1 surveyはV2保存項目へコピーしない。
既存のspecialMapsと通常セーブスナップショットを使用し、別保存キーは作らない。
`dataVersion: 1`は既存コンテナ形式のまま。生成rulesetやコード形式版とは独立。
旧セーブ・V1にlevel/rarityを補充したり、V2へ移行したりしない。

fixtureから`discoverTestMap`へV2パラメータを指定して入手→鑑定できる。
本編デバッグの既定入手は従来の旧暫定版のまま。初回配布・自然入手は未接続。
鑑定時の再抽選なし。保存失敗時は既存transactionで冒険者スナップショット全体を戻す。
削除→コード再登録は原本5項目だけ復元し、favorite=false、memo空、cleared=false。
V2 surveyはまだ生成・保存しない。

## 共有コード形式 Candidate

接頭辞は`NDA:`、Base64URLはパディングなし。署名はUTF-16BE。

|offset|bytes|format 2|
|---:|---:|---|
|0|1|code format = 2|
|1|1|ruleset識別 = 2 (`special-map-v2`)|
|2|2|seed、big endian|
|4|1|level 1..100|
|5|1|rarity: 0 WHITE / 1 SILVER / 2 GOLD|
|6|1|署名文字数1..4|
|7|2×文字数|署名UTF-16BE|
|末尾|8|HMAC-SHA256先頭8 bytes|

formatとrulesetは別byte。対応する組み合わせだけ受理する。
V2 tagは鍵`NDA::SPECIAL-MAP-CODE::16BIT::2026::V2`、対象文字列
`map-original-v2:` + tag以外のbodyのBase64URL。V1の鍵・domain・演算は不変。
これはローカルJSの改ざん抑止であり、発見者本人認証ではない。

旧format 1は旧来の5-byte header、同じ署名・8-byte tagを維持。
**現リポジトリで発行されていたコードは`phase2a-1` (ruleset byte 0x80)のみ**。
`special-map-v1`のbyte 1は従来から予約・未対応だったため、今回も新規に意味を変更しない。
既存4コードを変更前に採取し、完全一致fixtureとしてテストする。

`NDA16:`も受理。接頭辞だけcase-insensitive、本文は一切大小変換せず厳密検証。
前後余白のみtrim。本文内余白、余剰・不足byte、非canonical Base64URL、
未知format/ruleset、値域外、非正規署名、tag不一致を拒否。
seedはuint16なのでdecode上65535超の表現はなく、byte追加は長さ不正として拒否。
encodeでは負数・65536以上・NaN・小数を拒否する。

|署名文字数|payload bytes（tag含む）|コード文字数（NDA:含む）|
|---:|---:|---:|
|1|17|27|
|2|19|30|
|3|21|32|
|4|23|35|

上記は実際のencode結果で計測。最大35文字。

例: `NDA:AgIwOTIBAyAgMOsw65QoofYQw8Ta`

decode結果は上記のseed12345 / Lv50 / SILVER / †ルル。
`generateRegisteredSpecialMap`でCandidate 2へ明示ルーティングする。
構造fingerprint=`5a0826f6`、鍵箱(9,8)、前室(6,1)、BOSS(6,0)。
Lv/rarity/署名を変えても地形骨格は不変。

## UI / 探索禁止

一覧・鑑定・管理・コード表示／コピー／貼付／登録の既存UIを利用。
V2は簡易名「三層の特殊地図」、入力Lv、白地図／銀地図／金地図を表示。
V1の仮Lvとは別にV2入力値を表示する。単層100セルの調査率は表示しない。
同内容確認の表示対象もcontent IDで照合する（seedだけで照合しない）。
探索ボタンは「V2多層探索は準備中です。」。入場コールバック直前と
`createSpecialMapSession`にもガードを持ち、単層runtimeへ流さない。
V1探索・survey・扉・戦闘未接続方針は変更なし。

## 検証

- Node: **1,783件成功、失敗0**。`node --test tests/*.test.mjs`
- 全65536セット / 196608フロア: 生成・構造・鍵アクセス・反復・Lv/rarity独立性・旧互換すべて異常0。122.261秒。
- 代表fixture12件、1024組のencode/decode property test、1文字改変総当たり。
- 独立Node HMACで署名した不正値も拒否（単にtag不一致だけで値検証を代用しない）。
- 実セーブtemp/backup/current失敗、鑑定rollback、reload、削除保護、再登録を確認。
- UIハンドラーでV2登録／同内容確認／コード表示と探索禁止を確認。
- PC/iPhone実機によるV2コード受け渡しは未実施。自動往復テストで確認。

|監査対象|SHA-256（すべて従来値と一致）|
|---|---|
|V2 Candidate 2|243b09bbd93f5ff783b1bf772c156e159132451d90a630a807a19b8d6fdd4db3|
|V2 Candidate 1比較資料|19f8f3aad737c8ab9e91c7e673e892ab810b7938b182cab63e77d3b9601750b1|
|V1 topology|b985066f1fb5720c8f27c56d925e58d700af9d637d90cd2c6e0fc33ce0920e58|
|旧暫定topology|3d92b41f2e2994ca08e40626cd85e498a20c8c0dfc1a135c32472641805df592|
|V1 doors|6a625e0aac5a8c87367c2ab52e46570dcb195e4260ecb7cacc4f1167c81f693f|
|V1 ecology Candidate 2|04c4c6902ef72c567a2166d4b4bd41d83b7ca89eab99a8926b0ceaa5d7c96a8a|

seed12345のV1 topology `65bbb4f0`、door `04ec0371`も不変。
再監査結果は`artifacts/special-map-v2-a-audit.log`、
Node結果は`artifacts/special-map-v2-a-node-tests.log`。

## 変更ファイル

- `data/special-maps.js`: V2 schema、ID、normalize、鑑定・登録、survey拒否。
- `data/special-map-code.js`: format 2、V2 tag、複数形式検証。
- `js/special-map/generator.js`: 登録原本からCandidate 2へのルート。
- `js/special-map/session.js`: V2入場拒否。
- `js/explorer-preview-ui.js`: Lv/rarity表示、同内容照合、探索禁止。
- `tests/special-map-v2-data.test.mjs`: データ／codec／ID／生成器往復。
- `tests/fixtures/special-map-v2-codes.json`: V2 Candidateコード12件。
- `tests/special-map-save.test.mjs`: V2実セーブ検証。
- `tests/explorer-touch.test.mjs`: V2共通UI検証。
- `tests/special-map-v2.test.mjs`: V2コード未対応という旧アサートを今回の対応へ更新。他の生成互換性アサートは維持。
- `artifacts/special-map-v2-structure-candidate-2.json`: 全seed再監査。旧結果との差は計測時間のみ。
- 上記ログ2件と本ドキュメント。
