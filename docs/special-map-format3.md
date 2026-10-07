# V2特殊テーマ共有コード Format 3

## 変更概要

通常V2地図はFormat 2のまま発行する。`themeOverride`を持つV2原本のみFormat 3を発行し、既存の地図帳・保存・探索へ接続する。
特殊テーマはgold / rice / dusk / tender限定。通常10テーマを明示上書きする形式ではない。
goldは既存ボス探索条件に合わせLv60～100、三女神テーマはLv80～100を受理する。
goldテーマとGOLDレアリティは独立し、WHITEのgold地図も有効。

## バイト仕様（固定）

|位置|内容|
|---|---|
|0|format = 3|
|1|ruleset = 2（special-map-v2）|
|2–3|seed uint16 big-endian、0～65535|
|4|level|
|5|rarity: WHITE=0 / SILVER=1 / GOLD=2|
|6|special theme: gold=0 / rice=1 / dusk=2 / tender=3|
|7|署名長、1～4 UTF-16コード単位（既存署名規則）|
|8以降|署名 UTF-16BE|
|末尾8バイト|HMAC-SHA256の先頭8バイト|

key: `NDA::SPECIAL-MAP-CODE::16BIT::2026::V3`

domain: `map-original-v3:`。これにbodyのパディングなしbase64url表現を連結してHMACを計算する。
既存のクライアント内公開キー方式を継承し、Format 1/2とはキー・domainを分離する。

完成コードは `NDA:` + body/tagのbase64url（パディングなし）。署名1/2/3/4文字でコード全長28/31/34/36文字。
`NDA16:`も既存どおり受理して`NDA:`へ正規化。接頭辞のみ大小文字を区別せず、payloadは区別する。
未知のformat/theme/ruleset、範囲外Lv/rarity、不正署名、不正tag、非canonical base64url、余剰・不足バイトを拒否する。
wire上のseedは常にuint16。encode APIでは負数・65536以上・非整数を拒否する。

## 保存・identity

通常V2のcontent IDは従来どおり `[ruleset,seed,level,rarity]`。
特殊テーマのみ `[ruleset,seed,level,rarity,themeOverride]` とし、original IDはその末尾にdiscovererNameを追加する。
geometryを表すlayout IDは変更しない。

登録原本の明示schemaに`themeOverride`を追加した。欠落/nullなら通常地図として扱い、既存セーブに一括書換やID変更は行わない。
不正なoverrideは通常テーマに黙って戻さず、原本の正規化で拒否する。
登録上限10件、未鑑定上限3件は共通。未鑑定の正規化もフィールドを保持できるが、新たな配布・報酬には接続しない。

favoriteと3層surveyはテーマ別originalに保存される。コードへは含めない。
完全一致はduplicate。同じcontentの別発見者は既存の確認フロー。同seedでも別themeなら別content。
お気に入り解除→削除→再登録では、surveyは0/300、favorite=falseへ初期化する。

## 生成・描画・戦闘

登録地図生成dispatcherから既存の特殊テーマ生成器へ接続した。Candidate 3の壁構造・階段・金箱・ボス部屋を維持し、3層のthemeだけを置き換える。
特殊地図の構造fingerprintは既存の特殊テーマ生成器が返すものを使用。通常地図のfingerprintは変更しない。
地図名は既存の特殊テーマ後半語と専用`map-name-special-location:<theme>` streamを使用。通常地図名は不変。

Ecology Candidate 2の該当theme pool、固定boss registry、専用壁を使用する。
goldは`karte_boss_maikaefer_koenig`との既存戦闘へ接続。rice/dusk/tenderの女神は画像表示のみで、BOSSセルではF3-B2未実装メッセージ。
4体ともHSL禁止を維持する。一般／boss戦contextのcontent IDにもthemeOverrideを含める。
本番配布・一般公開切替、永続clear、次地図drop、pendingReward、三女神戦は追加していない。

## 実機用コード

すべてseed=12345、rarity=WHITE、発見者=†ルル。コードを再decodeし、各フィールド・名前・固定bossをfixtureで検証した。
**Format 3対応版へ更新した端末で使用すること。旧公開版では未対応formatとして拒否される。**

|theme / Lv|正式名称|固定boss|
|---|---|---|
|gold 60|荒れ果てた金色廟の地図 Lv.60|デアグローセ・ケーファーケーニヒ|
|gold 80|猛威の金色廟の地図 Lv.80|同上|
|gold 100|滅びの金色廟の地図 Lv.100|同上|
|rice 100|滅びの光穂廟の地図 Lv.100|黄金の稲穂の女神・ルミナ|
|dusk 100|滅びの夜露殿の地図 Lv.100|宵闇の夜露の女神・ノクティア|
|tender 100|滅びの翠芽廟の地図 Lv.100|新緑の若葉の女神・ゼレーナ|

```text
gold Lv60  NDA:AwIwOTwAAAMgIDDrMOtalLzOMczbHw
gold Lv80  NDA:AwIwOVAAAAMgIDDrMOtIX-gHznCGpg
gold Lv100 NDA:AwIwOWQAAAMgIDDrMOsUrQSFA9AW9g
rice Lv100 NDA:AwIwOWQAAQMgIDDrMOvJeb24h94aUg
dusk Lv100 NDA:AwIwOWQAAgMgIDDrMOsPWBe6V1vKYg
tender Lv100 NDA:AwIwOWQAAwMgIDDrMOsc7kfnblX1MQ
```

## 検証

- Format 2の既存fixtureをencode/decode双方でbit-exact確認。旧Format 1（phase2a-1）とNDA16接頭辞も維持。未発行のformal V1コードを新規対応したわけではない。
- 新Formatの独立Node HMAC照合、単文字改変、署名長、認証済み不正値、domain混同をテスト。
- 混在10件、重複、別発見者、favorite、survey保存・削除再登録、3層生成、一般／boss contextを確認。
- Node: `node --test tests/*.test.mjs`、1,920成功、失敗0。
- Python: 29成功、失敗0、skip2。`git diff --check`問題なし。
- 既存全seed監査を同条件・順序で再実行。通常構造65,536 seed、196,608 floors、失敗0。
- Ecology Candidate 2監査でも通常Candidate 1との差分0、全profile成功。

|対象|不変SHA256|
|---|---|
|Candidate 3|c1dbc28cf7bfc9f78fffa32281d8d001b4b0a1a8f1aa2f146cb5d0a5559f0e95|
|Ecology Candidate 2|ab38d1e17e4f8d47c8fc89d895e20ed4eba33cc6e781db35cc0aac4a66a17dca|
|V1 topology|b985066f1fb5720c8f27c56d925e58d700af9d637d90cd2c6e0fc33ce0920e58|
|V1 ecology|04c4c6902ef72c567a2166d4b4bd41d83b7ca89eab99a8926b0ceaa5d7c96a8a|
|legacy topology|3d92b41f2e2994ca08e40626cd85e498a20c8c0dfc1a135c32472641805df592|
|V1 doors|6a625e0aac5a8c87367c2ab52e46570dcb195e4260ecb7cacc4f1167c81f693f|

seed12345の通常Candidate 3 fingerprintは`3519b715`を維持。

## ブラウザ実行結果

Edge/ChromiumのPC 1280pxと390pxで各4テーマ、計8ケース成功。コード入力→登録→正式名称→favorite★→コード再表示→保存/reload→地図詳細から探索→ENTERING MAP DUNGEON→B1F→B2F→B3F→金箱→鍵取得→施錠扉→BOSSセルを確認した。
全ケースで3層同テーマ、専用壁2枚の正常ロード、固定boss原画像、該当ecologyを確認。goldは実際に甲虫王戦へ入り、三女神は未実装メッセージで停止する。ページ例外0、横はみ出し0。入力・詳細・探索・bossのスクリーンショットも確認した。

検証fixtureではトレリーレン既知・開発配布済み・登録地図0件から開始し、共有コードは実UIで登録した。道中一般encounterを停止し、恒久の灯火を装備させて鍵ルートを歩行した。位置転送・鍵フラグの直接付与でルートを省略していない。今回のブラウザ確認は共有接続確認であり、戦闘バランス・勝利精算の再試験ではない。
390pxはPCブラウザのviewport確認で、iPhone実機確認ではない。生ログ・スクリーンショットはOS TEMPの`nda-format3-browser`へ保存。
追加の390px gold確認では調査85/300をflushしてリロードし、themeOverrideと3層surveyが保存から復元されることも確認した。小さな検証要約は`artifacts/special-map-format3-validation.json`に記録。

## 変更ファイル

- `data/special-map-code.js`: Format 3 wire codec。
- `data/special-map-theme-override.js`: 固定enum・原本テーマ条件。
- `data/special-maps.js`: 保存schema・identity・登録。
- `data/special-map-names-v2.js`: 登録原本から特殊テーマ名を生成。
- `js/special-map/special-themes-v2.js`: 既存特殊後半語を共通定義へ移動。
- `js/special-map/generator.js`: 登録特殊テーマ生成のdispatch。
- `js/special-map/session-v2.js`: セッションへoverrideを保持。
- `js/special-map/encounter-v2.js`, `boss-encounter-v2.js`: 戦闘content ID。
- `tests/special-map-format3.test.mjs`, `tests/fixtures/special-map-format3-codes.json`: codec・登録・探索の回帰テストと発行コード。
- `tests/browser/special-map-format3.mjs`: PC/390pxの共有コードUI→鍵ルート検証。
- この資料。
- `artifacts/special-map-format3-validation.json`: テスト・全seed SHA・ブラウザ結果の要約。

LAST UPDATE・コミット・pushは変更／実行していない。前タスクのZ6枚検証ファイルは今回の変更に含めない。

コミット文案: `feat: add V2 share-code format 3 for explicit special themes`
