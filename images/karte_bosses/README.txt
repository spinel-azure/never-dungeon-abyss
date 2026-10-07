
◆ 地図迷宮ボス画像について ◆

【共通ルール】

・「エリア指定なし」は通常10themeのboss候補として使用可能。
・「専用」は指定theme以外では使用禁止。
・「カラーバリエーションOK」はHSL自動色替え可能。
・「カラーバリエーション厳禁」は原画像固定。
・専用bossを別themeへfallbackさせないこと。
・通常speciesとboss版が同系統の場合でも、内部ID・能力値・報酬・役割は別管理とする。

【重要：マイケーファーケーニヒ系について】

通常speciesとして登場する個体は、

「マイケーファーケーニヒ」

とする。

これは特殊地図の一般エンカウントに出現する地図限定魔物であり、
goldテーマ最奥のbossとは別個体・別戦闘定義として扱うこと。

goldテーマ最奥の固定bossは、

「デアグローセ・ケーファーケーニヒ」

とする。

つまり、

通常species：
マイケーファーケーニヒ

gold固定boss：
デアグローセ・ケーファーケーニヒ

として明確に区別する。

表示名だけでなく内部IDも必ず分離すること。
通常species版の戦闘定義・報酬・ecologyを、
boss版へ流用または上書きしないこと。

────────────────────

[karte_boss_001.avif]
name: ヒューテリン・ヴァッサーマン
theme: any-normal
colorVariant: true
note: エリア指定なしboss。

[karte_boss_002.avif]
name: ニュンフェ・デス・トーデス
theme: any-normal
colorVariant: true
note: エリア指定なしboss。

[karte_boss_003.avif]
name: ディーグローセ・アイスケーニギン
theme: blue
themeName: 極寒
exclusive: true
colorVariant: true

[karte_boss_004.avif]
name: ガイステル・ケーニヒ
theme: any-normal
colorVariant: true
note: エリア指定なしboss。

[karte_boss_005.avif]
name: ウーアヴェルク・メートヒェン
theme: any-normal
colorVariant: true
note: エリア指定なしboss。

[karte_boss_006.avif]
name: アイゼルネ・ユングフラウ
theme: torture
themeName: 拷問
exclusive: true
colorVariant: true

[karte_boss_007.avif]
name: グリミヒ・フライシュフレッサー
theme: green
themeName: 密林
exclusive: true
colorVariant: true

[karte_boss_008.avif]
name: アマイゼンレーヴェ
theme: yellow
themeName: 砂漠
exclusive: true
colorVariant: true

[karte_boss_009.avif]
name: ディーヴァ・ジレーネ
theme: water
themeName: 激流
exclusive: true
colorVariant: true

[karte_boss_010.avif]
name: メヒティガー・ウィッカーマン
theme: red
themeName: 灼熱
exclusive: true
colorVariant: true

[karte_boss_011.avif]
name: フレムデ・ヴァイスハイト
theme: any-normal
colorVariant: true
note: エリア指定なしboss。

[karte_boss_012.avif]
name: ディグローセ・レーヴェンケーニギン
theme: any-normal
colorVariant: true
note: エリア指定なしboss。

[karte_boss_013.avif]
name: 黄金の稲穂の女神・ルミナ
theme: rice
themeName: ルミナ
exclusive: true
colorVariant: false
note: rice専用固定boss。ルミナ以外のbossは禁止。原画像固定。

[karte_boss_014.avif]
name: 宵闇の夜露の女神・ノクティア
theme: dusk
themeName: ノクティア
exclusive: true
colorVariant: false
note: dusk専用固定boss。ノクティア以外のbossは禁止。原画像固定。

[karte_boss_015.avif]
name: 新緑の若葉の女神・ゼレーナ
theme: tender
themeName: ゼレーナ
exclusive: true
colorVariant: false
note: tender専用固定boss。ゼレーナ以外のbossは禁止。原画像固定。

[karte_boss_016.avif]
name: デアグローセ・ケーファーケーニヒ
theme: gold
themeName: 黄金
exclusive: true
colorVariant: false
note:
gold専用固定boss。
通常species「マイケーファーケーニヒ」とは別個体・別ID。
gold最奥では必ず「デアグローセ・ケーファーケーニヒ」を使用する。
通常species版の能力値・報酬・ecology定義を流用しないこと。
原画像固定。HSLカラーバリエーション禁止。

[karte_boss_017.avif]
name: アッシェンプッテル
theme: any-normal
colorVariant: true
note: エリア指定なしboss。