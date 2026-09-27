# 生態系全seed監査：V1候補1（未承認）

対象: 正式V1 65,536 seed。単一種率 0.2029%。

暫定 SHA-256: `33f521694198da8fd73de895fd844c6042d8c88f364c1465aa3c181968dc20a4`

承認済み互換性ハッシュではありません。地形ハッシュとは独立です。

## 健全性

- generation: 0
- emptySpecies: 0
- duplicateMonster: 0
- invalidMonster: 0
- outsideTheme: 0
- weightSum: 0
- nonPositiveWeight: 0
- regenerationMismatch: 0
- identity: 0
- speciesCount: 0
- fingerprint: 0

## 生息種数

|種数|地図数|
|---|---:|
|1|133|
|2|13007|
|3|22951|
|4|21698|
|5+|7747|

## 最大比率（閾値以上、単一種を含む累積件数）

|比率|地図数|
|---|---:|
|70%|29278|
|80%|20572|
|90%|12770|
|95%|8447|
|100%|133|

## テーマ別

|theme|seed数|単一種|平均種数|最大比率|代表seed|
|---|---:|---:|---:|---:|---:|
|slate|6663|17|3.3797|100%|4196|
|magic|6521|10|3.4096|100%|6316|
|torture|6571|12|3.4018|100%|6392|
|red|6297|16|3.3992|100%|829|
|blue|6636|11|3.3966|100%|4682|
|green|6545|15|3.2391|100%|1332|
|yellow|6600|13|3.2520|100%|6020|
|water|6506|12|3.3836|100%|8961|
|crystal|6622|11|3.3920|100%|2051|
|black|6575|16|3.3973|100%|2559|

## 魔物別（全テーマ合算）

|monsterId / 名前|含有地図数|最大比率|100%|90%以上|100%の全seed|
|---|---:|---:|---:|---:|---|
|abyss_rat / 奈落ネズミ|3461|100%|3|214|17915, 41432, 45478|
|cave_slime / 洞窟スライム|3467|99.99%|0|190||
|bouncing_coin / 跳ねるコイン|2064|100%|2|107|25395, 50685|
|abyss_rabbit / 奈落ウサギ|2891|99.99%|0|149||
|wandering_dead / さまよう亡者|2876|100%|4|190|11602, 24560, 26427, 39824|
|poison_slime / ポイズンスライム|2827|100%|5|166|4196, 9958, 17086, 57236, 63586|
|vampire_bat / 吸血コウモリ|2550|100%|1|148|9063|
|viper / ヴァイパー|1966|100%|2|98|34103, 57206|
|maikaefer / マイケーファー|18153|99.99%|0|437||
|junghexe / ユングヘクセ|4267|100%|1|181|15579|
|merseburg_spell / メルゼブルクの呪文|5500|100%|3|330|11985, 19941, 50128|
|geistflamme / ガイストフラメ|5446|100%|3|361|6316, 9147, 19770|
|tanzlichter / タンツロイヒター|5550|100%|3|325|11772, 25671, 44742|
|morgenstern / モルゲンシュテルン|6190|100%|5|429|32362, 39592, 41018, 46782, 60605|
|inquisitorin / インクイジトーリン|5719|100%|7|365|6392, 15224, 18800, 31711, 32062, 44198, 59880|
|folterzange / フォルターツァンゲ|5209|99.99%|0|321||
|folterpanzer / フォルターパンツァー|3546|99.99%|0|145||
|fire_spirit / 火の精霊|5979|100%|4|444|829, 5166, 18799, 42753|
|fire_lizard / 火トカゲ|5605|100%|6|364|7494, 11415, 14271, 27150, 51239, 62969|
|loren_lava / ロレンラヴァ|4842|100%|4|255|12239, 14684, 32049, 48215|
|cassowary / ヒクイドリ|3264|100%|2|111|24774, 50494|
|ice_spirit / 氷の精霊|6291|100%|6|462|4682, 8826, 9110, 23353, 48805, 60941|
|ice_lizard / 氷トカゲ|5963|99.99%|0|387||
|ice_vogel / アイスフォーゲル|5123|100%|4|274|16537, 40342, 50039, 64754|
|ice_bear / 氷熊|3365|100%|1|125|39234|
|abyss_tiger / 奈落ティーガー|6002|100%|6|428|1751, 22499, 38144, 42485, 42514, 52517|
|abyss_panther / 奈落パンター|6011|100%|4|446|28578, 34159, 37719, 43200|
|abyss_mushroom / 奈落キノコ|6010|100%|5|406|1332, 22783, 34360, 51048, 53017|
|abyss_lizard / 奈落トカゲ|6121|100%|5|415|18482, 29612, 35586, 39988, 51792|
|abyss_giant_scorpion / 奈落オオサソリ|6083|100%|4|427|6020, 27582, 47016, 60994|
|cobra_gator / コブラゲーター|6071|100%|4|417|42369, 48271, 53153, 57786|
|abyss_piranha / 奈落ピラニア|6330|100%|9|487|8961, 23560, 26312, 28614, 31208, 35506, 46141, 57481, 58565|
|abgrund_krabbe / アプグルントクラッベ|5338|100%|1|295|47015|
|abgrund_aal / アプグルントアール|4884|100%|1|256|27921|
|abyss_giant_catfish / 奈落オオナマズ|3752|100%|1|159|23676|
|abyss_crystal_beetle / 奈落水晶虫|6168|100%|5|404|37631, 39623, 44142, 57230, 64869|
|prism_moth / プリズムモス|5472|100%|3|370|2051, 10863, 38191|
|amethyst_golem / アメジストゴーレム|5135|100%|2|289|16590, 55399|
|crystal_mimic / クリスタルミミック|4158|100%|1|204|59247|
|sensenmann / ゼンゼンマン|5611|100%|5|345|13840, 15316, 28313, 44094, 46626|
|wraith / レイス|4637|100%|2|218|43066, 43703|
|will_o_wisp / ウィルオーウィスプ|6027|100%|8|403|2559, 6241, 17024, 18732, 30314, 41392, 61881, 65307|
|schleipnir / シュライプニール|4603|100%|1|223|61879|

## 90%以上・複数種の代表例（魔物ごと最大3件）

|seed|theme|生態系|
|---:|---|---|
|7|yellow|cobra_gator 4.14% / abyss_giant_scorpion 95.86%|
|8|green|abyss_mushroom 99.73% / abyss_tiger 0.27%|
|9|yellow|abyss_lizard 2.11% / cobra_gator 97.89%|
|10|water|abyss_piranha 9.22% / abgrund_aal 0.10% / abyss_giant_catfish 90.68%|
|12|red|fire_spirit 3.58% / fire_lizard 96.41% / loren_lava 0.01%|
|18|magic|junghexe 0.31% / geistflamme 91.64% / merseburg_spell 8.05%|
|28|crystal|prism_moth 2.43% / crystal_mimic 4.85% / abyss_crystal_beetle 92.72%|
|30|black|schleipnir 92.08% / sensenmann 7.92%|
|36|green|abyss_panther 98.45% / abyss_tiger 1.55%|
|39|water|abyss_piranha 99.84% / abgrund_krabbe 0.10% / abgrund_aal 0.06%|
|45|red|fire_spirit 1.63% / fire_lizard 1.38% / loren_lava 91.80% / cassowary 5.19%|
|49|green|abyss_mushroom 2.52% / abyss_panther 97.22% / abyss_tiger 0.26%|
|53|water|abgrund_krabbe 0.01% / abyss_piranha 0.81% / abgrund_aal 9.10% / abyss_giant_catfish 90.08%|
|55|yellow|cobra_gator 4.22% / abyss_giant_scorpion 3.40% / abyss_lizard 91.66% / maikaefer 0.72%|
|58|magic|junghexe 0.37% / geistflamme 99.63%|
|63|red|fire_spirit 99.71% / fire_lizard 0.29%|
|65|slate|abyss_rabbit 0.05% / vampire_bat 0.34% / bouncing_coin 99.61%|
|73|yellow|abyss_lizard 99.41% / cobra_gator 0.59%|
|76|slate|viper 0.68% / abyss_rabbit 0.58% / poison_slime 98.74%|
|81|red|fire_spirit 0.28% / loren_lava 99.72%|
|82|water|abyss_piranha 0.53% / abgrund_krabbe 99.47%|
|87|red|fire_spirit 91.25% / fire_lizard 8.75%|
|90|water|abyss_piranha 0.01% / abgrund_aal 99.99%|
|92|magic|junghexe 6.10% / tanzlichter 0.23% / geistflamme 93.67%|
|95|slate|abyss_rat 0.01% / cave_slime 0.07% / abyss_rabbit 0.12% / vampire_bat 99.80%|
|100|crystal|abyss_crystal_beetle 7.74% / amethyst_golem 92.26%|
|102|water|abgrund_aal 2.23% / abyss_piranha 0.43% / abgrund_krabbe 2.23% / maikaefer 95.11%|
|104|crystal|maikaefer 95.63% / abyss_crystal_beetle 4.37%|
|105|water|abgrund_krabbe 95.73% / abyss_piranha 1.98% / abgrund_aal 2.29%|
|108|magic|geistflamme 7.79% / junghexe 90.98% / tanzlichter 1.23%|
|116|green|abyss_tiger 0.18% / abyss_panther 97.35% / abyss_mushroom 2.47%|
|122|crystal|prism_moth 92.22% / abyss_crystal_beetle 0.05% / amethyst_golem 7.73%|
|126|blue|ice_spirit 98.45% / ice_vogel 1.55%|
|127|red|fire_lizard 98.43% / fire_spirit 0.02% / loren_lava 1.55%|
|133|black|schleipnir 3.98% / sensenmann 96.02%|
|134|yellow|cobra_gator 3.21% / abyss_lizard 96.79%|
|137|green|abyss_panther 4.06% / abyss_tiger 90.67% / abyss_mushroom 5.27%|
|139|black|schleipnir 95.63% / will_o_wisp 4.37%|
|140|yellow|abyss_giant_scorpion 99.95% / abyss_lizard 0.02% / cobra_gator 0.03%|
|148|red|fire_spirit 99.32% / fire_lizard 0.68%|
|155|blue|ice_vogel 0.24% / ice_spirit 0.56% / ice_lizard 99.20%|
|158|torture|morgenstern 6.14% / folterpanzer 0.12% / inquisitorin 93.74%|
|162|water|abyss_giant_catfish 99.53% / abyss_piranha 0.47%|
|164|crystal|prism_moth 99.94% / amethyst_golem 0.06%|
|167|magic|geistflamme 8.59% / tanzlichter 91.40% / merseburg_spell 0.01%|
|174|yellow|abyss_lizard 0.01% / abyss_giant_scorpion 99.99%|
|177|red|fire_lizard 0.06% / fire_spirit 0.61% / loren_lava 99.33%|
|178|slate|maikaefer 3.34% / cave_slime 94.46% / abyss_rabbit 0.15% / vampire_bat 2.05%|
|198|black|will_o_wisp 0.63% / sensenmann 3.01% / schleipnir 90.36% / wraith 6.00%|
|210|torture|morgenstern 3.75% / folterzange 96.25%|
|211|black|sensenmann 0.47% / wraith 99.53%|
|212|black|wraith 0.01% / will_o_wisp 4.86% / schleipnir 0.32% / sensenmann 91.99% / maikaefer 2.82%|
|218|magic|merseburg_spell 8.33% / tanzlichter 90.30% / junghexe 1.37%|
|219|magic|merseburg_spell 0.19% / geistflamme 0.75% / junghexe 99.06%|
|232|torture|morgenstern 8.70% / inquisitorin 91.30%|
|236|black|sensenmann 0.02% / will_o_wisp 1.30% / wraith 91.73% / schleipnir 5.01% / maikaefer 1.94%|
|240|blue|ice_lizard 1.79% / ice_spirit 92.63% / ice_vogel 5.58%|
|275|water|abyss_piranha 0.01% / abgrund_krabbe 91.41% / abyss_giant_catfish 3.54% / abgrund_aal 5.04%|
|286|slate|abyss_rabbit 0.04% / vampire_bat 99.96%|
|294|crystal|abyss_crystal_beetle 0.40% / crystal_mimic 99.60%|
|298|blue|ice_spirit 0.45% / ice_vogel 5.37% / ice_bear 94.18%|
|301|magic|geistflamme 4.79% / merseburg_spell 91.80% / maikaefer 3.41%|
|304|red|loren_lava 1.55% / fire_spirit 0.02% / cassowary 98.43%|
|316|magic|tanzlichter 0.13% / merseburg_spell 99.86% / geistflamme 0.01%|
|317|crystal|abyss_crystal_beetle 1.32% / crystal_mimic 98.68%|
|329|slate|cave_slime 8.23% / wandering_dead 91.77%|
|331|slate|abyss_rabbit 0.28% / viper 1.70% / cave_slime 90.61% / vampire_bat 5.29% / abyss_rat 2.12%|
|332|magic|merseburg_spell 96.22% / tanzlichter 3.77% / junghexe 0.01%|
|338|blue|ice_bear 3.38% / ice_spirit 1.24% / ice_lizard 95.38%|
|366|blue|ice_lizard 1.44% / ice_spirit 7.27% / ice_bear 91.29%|
|385|yellow|cobra_gator 99.61% / abyss_lizard 0.05% / abyss_giant_scorpion 0.34%|
|391|slate|cave_slime 99.98% / abyss_rat 0.02%|
|394|blue|ice_lizard 2.33% / ice_spirit 97.53% / ice_vogel 0.14%|
|408|green|abyss_panther 0.28% / abyss_tiger 98.34% / abyss_mushroom 1.37% / maikaefer 0.01%|
|415|magic|merseburg_spell 0.31% / junghexe 99.69%|
|418|blue|ice_lizard 4.71% / ice_vogel 95.29%|
|459|torture|folterpanzer 1.61% / morgenstern 0.53% / inquisitorin 93.10% / folterzange 4.76%|
|478|torture|inquisitorin 3.21% / folterzange 96.79%|
|498|red|fire_lizard 98.55% / fire_spirit 1.45%|
|511|black|wraith 1.91% / schleipnir 0.09% / will_o_wisp 1.91% / sensenmann 96.09%|
|517|yellow|abyss_lizard 1.05% / cobra_gator 98.95%|
|525|slate|abyss_rat 0.05% / vampire_bat 99.95%|
|528|blue|ice_spirit 8.83% / ice_lizard 91.17%|
|536|magic|tanzlichter 99.74% / geistflamme 0.02% / merseburg_spell 0.24%|
|540|crystal|abyss_crystal_beetle 3.24% / prism_moth 96.76%|
|541|green|abyss_mushroom 0.26% / abyss_tiger 95.53% / abyss_panther 4.21%|
|544|crystal|abyss_crystal_beetle 91.45% / crystal_mimic 6.36% / prism_moth 2.19%|
|553|crystal|prism_moth 3.16% / amethyst_golem 96.06% / crystal_mimic 0.78%|
|555|black|sensenmann 0.02% / will_o_wisp 99.98%|
|579|green|abyss_mushroom 98.45% / abyss_panther 1.55%|
|581|black|will_o_wisp 99.60% / sensenmann 0.40%|
|601|black|will_o_wisp 99.97% / sensenmann 0.03%|
|624|green|abyss_mushroom 99.90% / abyss_panther 0.10%|
|633|crystal|crystal_mimic 0.01% / abyss_crystal_beetle 7.49% / amethyst_golem 92.50%|
|640|blue|ice_spirit 0.21% / ice_lizard 3.46% / ice_vogel 0.13% / maikaefer 96.20%|
|680|crystal|prism_moth 0.66% / abyss_crystal_beetle 0.65% / crystal_mimic 98.69%|
|682|water|abyss_piranha 8.54% / abgrund_aal 91.46%|
|723|water|abgrund_aal 1.19% / abyss_piranha 98.81%|
|731|blue|ice_lizard 7.30% / ice_spirit 0.02% / ice_vogel 92.68%|
|756|slate|abyss_rabbit 97.16% / abyss_rat 2.84%|
|768|slate|bouncing_coin 0.99% / abyss_rabbit 91.00% / vampire_bat 7.86% / cave_slime 0.15%|
|772|slate|viper 2.66% / poison_slime 92.82% / vampire_bat 0.14% / wandering_dead 4.38%|
|782|torture|folterzange 99.96% / morgenstern 0.03% / inquisitorin 0.01%|
|794|water|abyss_piranha 99.94% / abgrund_krabbe 0.06%|
|838|blue|ice_vogel 99.42% / ice_lizard 0.58%|
|881|torture|morgenstern 1.35% / folterpanzer 98.65%|
|913|slate|abyss_rabbit 0.70% / poison_slime 99.30%|
|945|torture|inquisitorin 1.56% / morgenstern 93.00% / folterzange 1.76% / maikaefer 3.68%|
|950|crystal|amethyst_golem 6.29% / abyss_crystal_beetle 93.71%|
|963|slate|wandering_dead 6.32% / bouncing_coin 93.59% / abyss_rat 0.01% / viper 0.08%|
|990|slate|vampire_bat 0.27% / wandering_dead 0.08% / abyss_rat 2.06% / viper 97.59%|
|1151|water|abyss_piranha 0.85% / abgrund_krabbe 1.91% / abgrund_aal 97.24%|
|1172|slate|abyss_rat 2.40% / vampire_bat 0.35% / viper 97.25%|
|1204|slate|abyss_rabbit 2.54% / abyss_rat 97.46%|
|1230|blue|ice_vogel 6.98% / ice_spirit 0.13% / ice_bear 92.89%|
|1285|slate|bouncing_coin 3.58% / abyss_rabbit 96.42%|
|1506|torture|inquisitorin 8.73% / morgenstern 91.27%|
|1572|slate|abyss_rat 96.01% / poison_slime 3.99%|
|1624|slate|abyss_rat 1.55% / wandering_dead 98.45%|
|1683|torture|folterzange 8.74% / morgenstern 91.26%|
|1733|slate|poison_slime 0.16% / abyss_rabbit 0.95% / cave_slime 0.01% / abyss_rat 98.88%|
|1737|slate|poison_slime 0.65% / viper 98.58% / wandering_dead 0.77%|
|1838|red|fire_lizard 8.19% / fire_spirit 0.27% / cassowary 91.54%|
|1856|slate|bouncing_coin 91.86% / cave_slime 2.86% / viper 5.28%|
|1985|torture|folterpanzer 92.89% / morgenstern 6.98% / folterzange 0.13%|
|2200|black|wraith 96.31% / sensenmann 3.69%|
|2473|slate|wandering_dead 91.92% / abyss_rat 8.08%|
|2477|red|cassowary 96.41% / fire_lizard 3.58% / loren_lava 0.01%|
|3000|torture|morgenstern 0.80% / folterpanzer 99.20%|

## V1候補プール：明示allowlistとbaseWeight

各テーマの合計は1,000,000。算出根拠・除外方針は special-maps-phase3c1.md を参照。

### slate

|monsterId|名前|baseWeight|
|---|---|---:|
|abyss_rat|奈落ネズミ|164167|
|cave_slime|洞窟スライム|164167|
|bouncing_coin|跳ねるコイン|85992|
|abyss_rabbit|奈落ウサギ|127685|
|wandering_dead|さまよう亡者|127685|
|poison_slime|ポイズンスライム|127685|
|vampire_bat|吸血コウモリ|109444|
|viper|ヴァイパー|78175|
|maikaefer|マイケーファー|15000|

### magic

|monsterId|名前|baseWeight|
|---|---|---:|
|junghexe|ユングヘクセ|127620|
|merseburg_spell|メルゼブルクの呪文|290810|
|geistflamme|ガイストフラメ|263448|
|tanzlichter|タンツロイヒター|303122|
|maikaefer|マイケーファー|15000|

### torture

|monsterId|名前|baseWeight|
|---|---|---:|
|morgenstern|モルゲンシュテルン|488782|
|inquisitorin|インクイジトーリン|261237|
|folterzange|フォルターツァンゲ|174304|
|folterpanzer|フォルターパンツァー|60677|
|maikaefer|マイケーファー|15000|

### red

|monsterId|名前|baseWeight|
|---|---|---:|
|fire_spirit|火の精霊|492500|
|fire_lizard|火トカゲ|295500|
|loren_lava|ロレンラヴァ|147750|
|cassowary|ヒクイドリ|49250|
|maikaefer|マイケーファー|15000|

### blue

|monsterId|名前|baseWeight|
|---|---|---:|
|ice_spirit|氷の精霊|492500|
|ice_lizard|氷トカゲ|295500|
|ice_vogel|アイスフォーゲル|147750|
|ice_bear|氷熊|49250|
|maikaefer|マイケーファー|15000|

### green

|monsterId|名前|baseWeight|
|---|---|---:|
|abyss_tiger|奈落ティーガー|328334|
|abyss_panther|奈落パンター|328333|
|abyss_mushroom|奈落キノコ|328333|
|maikaefer|マイケーファー|15000|

### yellow

|monsterId|名前|baseWeight|
|---|---|---:|
|abyss_lizard|奈落トカゲ|328334|
|abyss_giant_scorpion|奈落オオサソリ|328333|
|cobra_gator|コブラゲーター|328333|
|maikaefer|マイケーファー|15000|

### water

|monsterId|名前|baseWeight|
|---|---|---:|
|abyss_piranha|奈落ピラニア|623833|
|abgrund_krabbe|アプグルントクラッベ|172375|
|abgrund_aal|アプグルントアール|123125|
|abyss_giant_catfish|奈落オオナマズ|65667|
|maikaefer|マイケーファー|15000|

### crystal

|monsterId|名前|baseWeight|
|---|---|---:|
|abyss_crystal_beetle|奈落水晶虫|477725|
|prism_moth|プリズムモス|231475|
|amethyst_golem|アメジストゴーレム|177300|
|crystal_mimic|クリスタルミミック|98500|
|maikaefer|マイケーファー|15000|

### black

|monsterId|名前|baseWeight|
|---|---|---:|
|sensenmann|ゼンゼンマン|281429|
|wraith|レイス|140714|
|will_o_wisp|ウィルオーウィスプ|422143|
|schleipnir|シュライプニール|140714|
|maikaefer|マイケーファー|15000|

## 基準seed

```json
[
  {
    "revision": "v1-candidate-1",
    "ruleset": "special-map-v1",
    "seed": 0,
    "themeId": "magic",
    "species": [
      {
        "monsterId": "merseburg_spell",
        "weight": 1598
      },
      {
        "monsterId": "tanzlichter",
        "weight": 6976
      },
      {
        "monsterId": "junghexe",
        "weight": 5
      },
      {
        "monsterId": "geistflamme",
        "weight": 1421
      }
    ],
    "fingerprint": "8adad526",
    "topologyFingerprint": "085620c1"
  },
  {
    "revision": "v1-candidate-1",
    "ruleset": "special-map-v1",
    "seed": 1,
    "themeId": "red",
    "species": [
      {
        "monsterId": "fire_spirit",
        "weight": 2
      },
      {
        "monsterId": "fire_lizard",
        "weight": 49
      },
      {
        "monsterId": "loren_lava",
        "weight": 3064
      },
      {
        "monsterId": "cassowary",
        "weight": 4475
      },
      {
        "monsterId": "maikaefer",
        "weight": 2410
      }
    ],
    "fingerprint": "5464dd16",
    "topologyFingerprint": "487444ba"
  },
  {
    "revision": "v1-candidate-1",
    "ruleset": "special-map-v1",
    "seed": 12345,
    "themeId": "torture",
    "species": [
      {
        "monsterId": "morgenstern",
        "weight": 930
      },
      {
        "monsterId": "folterzange",
        "weight": 1989
      },
      {
        "monsterId": "folterpanzer",
        "weight": 2429
      },
      {
        "monsterId": "maikaefer",
        "weight": 4652
      }
    ],
    "fingerprint": "fa8d0653",
    "topologyFingerprint": "65bbb4f0"
  },
  {
    "revision": "v1-candidate-1",
    "ruleset": "special-map-v1",
    "seed": 32768,
    "themeId": "crystal",
    "species": [
      {
        "monsterId": "abyss_crystal_beetle",
        "weight": 992
      },
      {
        "monsterId": "prism_moth",
        "weight": 8567
      },
      {
        "monsterId": "crystal_mimic",
        "weight": 441
      }
    ],
    "fingerprint": "fc66809c",
    "topologyFingerprint": "e7e9d2c5"
  },
  {
    "revision": "v1-candidate-1",
    "ruleset": "special-map-v1",
    "seed": 65535,
    "themeId": "crystal",
    "species": [
      {
        "monsterId": "crystal_mimic",
        "weight": 343
      },
      {
        "monsterId": "abyss_crystal_beetle",
        "weight": 2738
      },
      {
        "monsterId": "amethyst_golem",
        "weight": 5136
      },
      {
        "monsterId": "prism_moth",
        "weight": 1783
      }
    ],
    "fingerprint": "b6e364f1",
    "topologyFingerprint": "26ac1209"
  }
]
```
