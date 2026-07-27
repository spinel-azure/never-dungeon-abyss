# NDE Python validation tools

このフォルダは、Never Dungeon Engine / NEVER DUNGEON : ABYSS の開発時に、ゲームデータの不正値や設定ミスを検出するためのものです。

ゲーム本体は従来どおりHTML・CSS・JavaScriptだけで動作します。Pythonコードをブラウザから読み込んだり、ゲーム実行時に使用したりすることはありません。

## 実行方法

リポジトリ直下で実行します。

```bash
python tests/python/validate_game_data.py
```

WindowsでPython Launcherを使用する場合：

```bash
py tests/python/validate_game_data.py
```

外部パッケージは不要です。Python 3.10以降の標準ライブラリだけを使用します。

## 出力ステータス

- `PASS`: 検証対象に異常がありません。
- `WARN`: 実行は継続できますが、人による確認が推奨されます。終了コードは0です。
- `FAIL`: 明確な異常です。1件以上ある場合の終了コードは1です。
- `SKIP`: 対象データが未実装、またはJavaScriptの実行結果がなければ安全に検証できません。

## 現在の検証対象

- `data/classes.js`
- `data/enemies.js`
- `data/equipment.js`
- `data/items.js`
- `data/npcs.js`
- `data/skills.js`
- `data/spells.js`
- `data/status-effects.js`
- `data/town.js`
- `data/traps.js`
- `data/weapons.js`
- `prototype/card-system/cards/*/cards.js`
- `data/`および`prototype/`配下に将来追加されるJSONファイル

JavaScriptは実行せず、文字列・数値・真偽値として静的に判定できるデータだけを読み取ります。関数の実行結果、ランダムなダンジョン生成結果、動的に組み立てられる値は対象外です。

ID重複は、職業、町施設、登録用職業一覧、武器、武器種、カードなどのデータコレクション単位で検査します。異なる用途のIDが同じ文字列であることは重複扱いせず、参照関係として別に検査します。

## 新しい検証項目を追加する方法

1. `validate_game_data.py`の`DATA_FILES`または`CARD_FILES`へ対象ファイルを追加します。
2. `Validator`へ検証メソッドを追加します。
3. `Validator.run()`から新しいメソッドを呼び出します。
4. 異常は`self.report("FAIL", ...)`、確認事項は`WARN`、対象外は`SKIP`として報告します。
5. 正常データと意図的な異常データの両方で、終了コードと表示内容を確認します。

本体のデータ形式をPython検証の都合で変更しないでください。動的データを検証したい場合は、JavaScript側でJSONを出力する独立した開発用ブリッジを用意し、その出力をPythonで集計する構成を推奨します。
