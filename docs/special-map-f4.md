# V2-F4 周回ごとの次地図報酬

## 対象と受領導線

通常10テーマのボスを倒すたびに、未鑑定地図1枚の獲得権を保存する。初回限定ではない。帰還・受領・再入場・再撃破で次の1枚を獲得できる。同じ探索中のボス再戦不可は維持する。gold固定ボスとrice/dusk/tenderの三女神は今回の地図報酬対象外。

撃破時に「未鑑定地図を発見。探検家テントで受領できます」と案内する。ポータル→B1F→帰還→LOT BAG→EXP SETTLEMENT→雇用更新は既存経路を維持する。探検家テントの「討伐地図報酬を受け取る」で未鑑定欄へ追加する。

未鑑定の所持上限は3枚。満杯なら報酬を保持し、鑑定・整理後に受領する。保留は1件。未受領中は次の通常V2探索の開始前に受領を案内して入場を止め、報酬を上書きしない。特殊4テーマ・V1/legacyの入場にはこの制限を掛けない。受領後は、未鑑定が3枚でも次の通常探索へ入場可能で、その撃破報酬を新たに1件保留できる。

保存済みの獲得権は、その後の敗北や再読み込みで失わない。地図報酬はEXP/Gのロット袋とは独立して扱う。

## 承認済み抽選

|項目|仕様|
|---|---|
|次地図Lv|攻略元WHITEなら+1～5各20%、SILVERなら+10、GOLDなら+20|
|上限|Lv100。攻略元Lv100でも次のLv100地図を獲得できる|
|次地図rarity|攻略元とは独立にWHITE94% / SILVER5% / GOLD1%|
|seed|0～65535から抽選。所持中V2の登録・未鑑定と同seedなら16bit範囲を順送りして回避|
|発見者|獲得する冒険者自身の登録済み地図署名。攻略元の発見者は引き継がない|
|生成版|special-map-v2。themeOverrideなし。既存seed選出の通常10テーマのみ|

報酬用RNGは生成器の乱数系列とは別。鑑定・再試行・ロードで再抽選しない。署名未登録なら通常V2の入場前にテントでの登録を案内する。

## 保存構造とトランザクション

`character.specialMaps`に以下の任意フィールドを追加した。既存dataVersionと旧データの読み込みを維持し、フィールドのない旧セーブも読める。

- `bossReward`: 直近1件の報酬処理記録。`version:1`、`status:prepared/pending/received`、`expeditionId`、`battleUuid`、`rewardId`、攻略元`contentId/mapKey/source`、自身の署名、抽選情報`lottery`。pending/receivedでは確定した未鑑定原本`map`も保持する。
- `bossClears`: content ID → true。今回の通常ボスの永続討伐記録。登録原本の`cleared`へ反映するが、周回報酬の獲得条件には使わない。
- `surveyRewardClaims`: content ID → true。将来の調査報告報酬用。今回追加するのは保存・正規化対応だけで、ゲーム内からtrueにする処理はない。

探索UUIDは入場ごと、戦闘UUIDはボス戦ごとに`crypto.randomUUID()`で作成する。報酬IDは`boss-map-<戦闘UUID>`。既存のメモリー内session/battle連番はEXP等の既存処理に残すが、永続報酬IDには使わない。戦闘開始・結果照合・探索復帰は、オブジェクト参照の同一性ではなくIDを照合し、structuredCloneしたcontextも扱える。

1. ボス戦開始前にUUIDと抽選再現情報をpreparedとして保存する。まだ獲得権はない。書込み失敗なら戦闘を開始せず、同じcontextと乱数値でA/Enter再試行する。
2. 勝利時に保存済み抽選情報から原本を確定し、`bossClears`・登録地図の`cleared`・pending原本を一括保存する。失敗なら永続変更を巻き戻し、探索復帰を保留する。A/Enterで同じ原本の保存を再試行する。
3. 勝利保存成功後に既存EXP/Gをsessionへ1回だけ積み立て、bossDefeatedを立ててポータルを表示する。再入のcallbackは実行中フラグ・戦闘ID・報酬状態で防止する。
4. テント受領では未鑑定への追加とreceived更新を一括保存する。保存失敗なら両方を巻き戻す。受領後の再実行は追加しない。
5. received記録は次の正規ボス戦のpreparedで置換する。古い戦闘callbackは現在の戦闘／報酬UUIDに一致せず付与できない。pendingの置換はデータ処理でも拒否する。

保存は既存`transactSpecialMaps`と`writeGame`を使う。temp検証→backup→currentの既存commit点を維持し、commit後のcleanup/通知例外で受領を巻き戻さない。未受領原本を正規化しても、seed/Lv/rarity/署名/報酬IDは変化しない。

### 再読み込みの範囲

保存済みpending/receivedはロード後も保持する。今回、探索途中・戦闘途中をロードして再開する機能は追加していない。勝利保存が一度も成功しないままブラウザを閉じた場合、討伐そのものは復元できない。preparedだけで報酬は付与しない。これは実装前に明示した範囲であり、通常の保存失敗後のA/Enter再試行とは区別する。

## 討伐・調査・将来の報告報酬

討伐記録、既存survey、調査報酬の受領履歴は独立する。調査完了は`surveyTotalV2(surveyedMasks) === 300`で判定し、ボス討伐を条件にしない。

将来の報告条件は「現在の登録地図が300/300、かつsurveyRewardClaims[contentId]が未受領」。ボス未討伐でも全マス調査して帰還すれば対象にできる。報告UI・報酬内容・報告時の付与処理は未実装。

content IDは通常V2なら`[ruleset,seed,level,rarity]`、特殊テーマではさらにthemeOverrideを含む。署名を含まないので同内容の別署名でも同じ履歴を見る。履歴は登録配列の外にあり、削除→同コード再登録でも消えない。

既存surveyの削除・再登録仕様は維持する。削除でその原本のsurveyは失われ、再登録で0/300になる。討伐記録・将来の報告受領履歴は保持する。300/300の保存だけで調査報酬を受領済みにはしない。

## 検証

- Node全1,952件成功、失敗0。Python29件成功、失敗0、2件スキップ。
- 通常10テーマそれぞれで初回1枚・次探索1枚、cloneした重複callback、旧戦闘ID拒否、WHITE上昇全5段階、rarity全100区間、Lv100継続獲得、seed衝突とwrap、特殊4テーマ除外を確認。
- 実保存APIのtemp/backup/current書込み失敗を注入し、討伐記録＋pendingと、原本追加＋receivedのrollbackを検証。ロード・再試行後も内容不変。commit後cleanup/通知エラーでも二重受領なし。
- 未鑑定3枚時の保留、保留の置換拒否、鑑定後の受領、削除・別署名再登録時の履歴保持、surveyリセットの従来挙動、テントのタッチ・方向操作を確認。
- 本番mainの結果処理で、勝利保存失敗→再試行、EXP/G各1回、帰還精算・雇用更新、通常奈落の保留EXP/ロット袋の保持を検証。
- Edge headless 1280×900 / 390×900で各2周。勝利保存失敗、portal→B1F→帰還精算→雇用更新、満杯時保留、保留中入場拒否、鑑定、受領保存失敗、pendingのreload、受領後の再探索を通過。390pxは受領・鑑定コマンドをtouchscreen tapで操作。横overflowなし、スクリーンショットを確認。
- ブラウザは通常ボスHP1・B3F直接配置・survey完成済みの遷移用fixture。戦闘バランスや鍵までの全歩行経路の再測定ではない。iPhone実機・USBパッド実機は未確認。
- ブラウザQAで残した通常奈落の777EXPは、reload時に既存の旧EXP精算処理が表示する。その精算画面を閉じてから町の操作を継続した。F4の帰還中には通常奈落EXP/ロット袋を消費しない。

### 互換性

`node tools/verify-special-map-f4-compatibility.mjs`で全65,536seed、V2 ecologyの既存22profileを再計算。全SHAが既存値と一致。コードcodecとFormat2/3/legacy fixtureは変更せず、対応テスト成功。

|項目|SHA256|
|---|---|
|V2 structure Candidate3|c1dbc28cf7bfc9f78fffa32281d8d001b4b0a1a8f1aa2f146cb5d0a5559f0e95|
|V2 ecology Candidate2|ab38d1e17e4f8d47c8fc89d895e20ed4eba33cc6e781db35cc0aac4a66a17dca|
|V1 topology|b985066f1fb5720c8f27c56d925e58d700af9d637d90cd2c6e0fc33ce0920e58|
|legacy topology|3d92b41f2e2994ca08e40626cd85e498a20c8c0dfc1a135c32472641805df592|
|V1 doors|6a625e0aac5a8c87367c2ab52e46570dcb195e4260ecb7cacc4f1167c81f693f|
|V1 ecology|04c4c6902ef72c567a2166d4b4bd41d83b7ca89eab99a8926b0ceaa5d7c96a8a|

seed12345のV2 fingerprintは3519b715。結果は`artifacts/special-map-f4/compatibility.json`、ブラウザ結果は同ディレクトリの`browser.json`と画像。

## 作業範囲

作業開始時に存在したCandidate2の三女神調整、特殊ボスLv100限定、画像先読み、障壁表示等の未コミット変更を保持した。F4ではその数値・画像・演出を変更していない。共有ファイルのsession/boss encounter/exploration UIに報酬用の接続だけを追加した。

F5・調査報告UI・三女神バランス調整・一般公開は未実施。LAST UPDATE・コミット・pushは変更していない。
