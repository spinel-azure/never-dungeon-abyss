# NEVER DUNGEON : ABYSS

> THE MISSING QUEEN AND THE MYSTERIOUS CAT

![NEVER DUNGEON : ABYSS](images/screenshots/nda_ss_01.avif)

**NEVER DUNGEON : ABYSS（NDA）** は、ランダム生成される疑似3Dダンジョンを探索するブラウザRPGです。

[Never Dungeon Engine Ver.1.0](https://github.com/spinel-azure/never-dungeon-engine)をベースに、戦闘、職業、成長、装備、町、シナリオなどのRPG要素を開発しています。

現在のバージョンは **MVP1.0** です。

## Play

ブラウザからプレイできます。

**https://spinel-azure.github.io/never-dungeon-abyss/**

PC、スマートフォン、タブレットに対応しています。開発中のため、仕様やセーブデータ形式が変更される場合があります。

## Current Features

### ダンジョン探索

- 10×10マスのランダムダンジョン生成
- 全セルへの到達保証
- Canvas 2Dによる疑似3Dレイキャスト描画
- 扉、階段、階層移動
- フロアごとの壁・床テーマ
- 霧、暗闇、たいまつ
- 気配ゲージ
- コンパス、ミニマップ
- NPCイベントとタイプライター会話
- 宝箱と演出
- 踏破済み経路を使ったオート帰還
- 階層移動時のSE、暗転、フェード演出

### 町

- 町全景から施設を選択する拠点画面
- 施設ごとの背景、NPC立ち絵、会話
- NPC立ち絵の呼吸アニメーション
- 宿屋、ギルド、寺院、商店、図書館、ダンジョン入口
- ギルドでのキャラクター登録
- 宿屋でのHP・SP全回復
- 敵撃破時の持ち帰り経験値と宿屋での経験値精算
- Lv197までの連続レベルアップと職業別HP・SP成長
- 戦闘不能時の寺院での蘇生
- ダンジョン入口と転送施設の準備画面

一部の施設サービスは現在開発中です。

### キャラクター

以下の4職業から選択できます。

| 職業 | 特徴 |
| --- | --- |
| 戦士 / WARRIOR | 高いHP・STR・DEFを持つ物理戦闘型 |
| 盗賊 / THIEF | 高いAGI・DEXと短剣の2回攻撃を活かす技巧型 |
| 僧侶 / PRIEST | 回復、守護、防御貫通攻撃を扱う安定型 |
| 魔法使い / MAGE | 高いINTと属性呪文を扱う魔法戦闘型 |

- STR / INT / AGI / DEX / LUCによる能力値
- HP / SP / DEF
- 職業別の初期能力値、初期装備、初期スキル
- 装備補正を含むステータス表示
- 詳細ステータス表示

### 戦闘

- コマンド選択式のターン制戦闘
- 戦う、スキル、防御、アイテム、オート、逃げる
- 物理攻撃、命中、会心、防御貫通
- 攻撃呪文、回復、属性相性
- 毒、行動阻害、能力強化・弱体化
- AGIと行動速度補正による行動順
- 武器種ごとの攻撃特性
- 多段攻撃の個別ヒット表示と演出
- ダメージ、回復、毒ダメージのポップアップ表示
- 敵撃破時のフェードアウト
- オート戦闘とBボタンによる中断
- 戦闘からの逃走

### セーブと設定

- キャラクターデータの作成と継続プレイ
- オートセーブ
- メニューからの任意セーブ
- ダンジョン滞在中のフロア・マップ状態保存
- LocalStorageによる設定保存
- SE音量、画面の揺れ、たいまつの揺らぎ
- NPC会話のタイプライター表示と速度設定

## Controls

### PC

| キー | 操作 |
| --- | --- |
| 矢印キー | 移動、旋回、カーソル移動 |
| `X` | Aボタン：決定、調べる |
| `Z` | Bボタン：キャンセル、メニュー |

### Smartphone / Tablet

- バーチャルスティック：移動、旋回
- Aボタン：決定、調べる
- Bボタン：キャンセル、メニュー
- メニューやコマンドは直接タップでも選択可能

## Development

ゲーム本体は、HTML、CSS、JavaScriptで構成されています。ビルド工程はなく、静的ファイルとしてGitHub Pagesへ公開しています。

ローカルで確認する場合は、リポジトリ直下で開発用サーバーを起動します。

```bash
node tools/dev-server.cjs
```

その後、以下へアクセスしてください。

```text
http://127.0.0.1:4173/
```

## Tests and Data Validation

戦闘計算にはNode.jsの自動テストがあります。

```bash
node --test tests/combat.test.mjs
```

ゲームデータのID、必須項目、数値、参照先、画像パスなどは、開発用Pythonスクリプトで検証できます。

```bash
python tests/python/validate_game_data.py
```

Pythonは開発時の検証だけに使用し、ブラウザゲーム本体では使用していません。検証はGitHub Actions上でも自動実行されます。

詳しくは[`tests/python/README.md`](tests/python/README.md)を参照してください。

## Project Status

現在は、探索エンジンへRPG本編の基盤を接続するMVP開発段階です。戦闘、町、職業、初期装備、初期スキル、セーブの基本動作を実装済みです。

今後は、敵や装備の追加、各施設サービス、シナリオ、拠点機能、BGM、エンディングなどを順次実装予定です。

## Base Engine

- **Never Dungeon Engine Ver.1.0**
- https://github.com/spinel-azure/never-dungeon-engine
