# 生態系全seed監査：V1候補2（未承認）

対象: 正式V1 65,536 seed。単一種率 0.2029%。

暫定 SHA-256: `04c4c6902ef72c567a2166d4b4bd41d83b7ca89eab99a8926b0ceaa5d7c96a8a`

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
- candidateSpeciesMismatch: 0
- candidateIdentityMismatch: 0
- requestedCountMismatch: 0

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
|70%|7804|
|80%|3866|
|90%|1537|
|95%|713|
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
|abyss_rat / 奈落ネズミ|3461|100%|3|29|17915, 41432, 45478|
|cave_slime / 洞窟スライム|3467|98.87%|0|25||
|bouncing_coin / 跳ねるコイン|2064|100%|2|7|25395, 50685|
|abyss_rabbit / 奈落ウサギ|2891|98.6%|0|14||
|wandering_dead / さまよう亡者|2876|100%|4|27|11602, 24560, 26427, 39824|
|poison_slime / ポイズンスライム|2827|100%|5|26|4196, 9958, 17086, 57236, 63586|
|vampire_bat / 吸血コウモリ|2550|100%|1|20|9063|
|viper / ヴァイパー|1966|100%|2|10|34103, 57206|
|maikaefer / マイケーファー|18153|98.77%|0|25||
|junghexe / ユングヘクセ|4267|100%|1|22|15579|
|merseburg_spell / メルゼブルクの呪文|5500|100%|3|38|11985, 19941, 50128|
|geistflamme / ガイストフラメ|5446|100%|3|44|6316, 9147, 19770|
|tanzlichter / タンツロイヒター|5550|100%|3|43|11772, 25671, 44742|
|morgenstern / モルゲンシュテルン|6190|100%|5|65|32362, 39592, 41018, 46782, 60605|
|inquisitorin / インクイジトーリン|5719|100%|7|47|6392, 15224, 18800, 31711, 32062, 44198, 59880|
|folterzange / フォルターツァンゲ|5209|98.84%|0|31||
|folterpanzer / フォルターパンツァー|3546|98.38%|0|19||
|fire_spirit / 火の精霊|5979|100%|4|60|829, 5166, 18799, 42753|
|fire_lizard / 火トカゲ|5605|100%|6|45|7494, 11415, 14271, 27150, 51239, 62969|
|loren_lava / ロレンラヴァ|4842|100%|4|25|12239, 14684, 32049, 48215|
|cassowary / ヒクイドリ|3264|100%|2|7|24774, 50494|
|ice_spirit / 氷の精霊|6291|100%|6|68|4682, 8826, 9110, 23353, 48805, 60941|
|ice_lizard / 氷トカゲ|5963|98.87%|0|38||
|ice_vogel / アイスフォーゲル|5123|100%|4|35|16537, 40342, 50039, 64754|
|ice_bear / 氷熊|3365|100%|1|14|39234|
|abyss_tiger / 奈落ティーガー|6002|100%|6|55|1751, 22499, 38144, 42485, 42514, 52517|
|abyss_panther / 奈落パンター|6011|100%|4|59|28578, 34159, 37719, 43200|
|abyss_mushroom / 奈落キノコ|6010|100%|5|60|1332, 22783, 34360, 51048, 53017|
|abyss_lizard / 奈落トカゲ|6121|100%|5|54|18482, 29612, 35586, 39988, 51792|
|abyss_giant_scorpion / 奈落オオサソリ|6083|100%|4|55|6020, 27582, 47016, 60994|
|cobra_gator / コブラゲーター|6071|100%|4|47|42369, 48271, 53153, 57786|
|abyss_piranha / 奈落ピラニア|6330|100%|9|68|8961, 23560, 26312, 28614, 31208, 35506, 46141, 57481, 58565|
|abgrund_krabbe / アプグルントクラッベ|5338|100%|1|32|47015|
|abgrund_aal / アプグルントアール|4884|100%|1|27|27921|
|abyss_giant_catfish / 奈落オオナマズ|3752|100%|1|14|23676|
|abyss_crystal_beetle / 奈落水晶虫|6168|100%|5|49|37631, 39623, 44142, 57230, 64869|
|prism_moth / プリズムモス|5472|100%|3|40|2051, 10863, 38191|
|amethyst_golem / アメジストゴーレム|5135|100%|2|26|16590, 55399|
|crystal_mimic / クリスタルミミック|4158|100%|1|14|59247|
|sensenmann / ゼンゼンマン|5611|100%|5|38|13840, 15316, 28313, 44094, 46626|
|wraith / レイス|4637|100%|2|23|43066, 43703|
|will_o_wisp / ウィルオーウィスプ|6027|100%|8|68|2559, 6241, 17024, 18732, 30314, 41392, 61881, 65307|
|schleipnir / シュライプニール|4603|100%|1|24|61879|

## 90%以上・複数種の代表例（魔物ごと最大3件）

|seed|theme|生態系|
|---:|---|---|
|90|water|abyss_piranha 2.05% / abgrund_aal 97.95%|
|135|yellow|abyss_lizard 92.70% / cobra_gator 7.30%|
|140|yellow|abyss_giant_scorpion 90.71% / abyss_lizard 4.13% / cobra_gator 5.16%|
|164|crystal|prism_moth 92.70% / amethyst_golem 7.30%|
|174|yellow|abyss_lizard 3.20% / abyss_giant_scorpion 96.80%|
|250|red|fire_spirit 97.55% / cassowary 2.45%|
|286|slate|abyss_rabbit 6.26% / vampire_bat 93.74%|
|326|yellow|abyss_giant_scorpion 5.63% / abyss_lizard 94.37%|
|376|yellow|abyss_giant_scorpion 2.14% / abyss_lizard 97.86%|
|391|slate|cave_slime 95.45% / abyss_rat 4.55%|
|525|slate|abyss_rat 6.91% / vampire_bat 93.09%|
|555|black|sensenmann 4.26% / will_o_wisp 95.74%|
|598|magic|tanzlichter 90.42% / geistflamme 9.58%|
|601|black|will_o_wisp 94.28% / sensenmann 5.72%|
|624|green|abyss_mushroom 91.30% / abyss_panther 8.70%|
|667|blue|ice_spirit 90.09% / ice_lizard 9.91%|
|741|red|fire_spirit 90.11% / fire_lizard 6.18% / cassowary 3.71%|
|748|red|fire_lizard 90.56% / loren_lava 9.44%|
|782|torture|folterzange 92.09% / morgenstern 5.27% / inquisitorin 2.64%|
|791|torture|inquisitorin 97.74% / morgenstern 2.26%|
|794|water|abyss_piranha 92.49% / abgrund_krabbe 7.51%|
|843|black|sensenmann 9.10% / schleipnir 90.90%|
|867|slate|vampire_bat 96.48% / abyss_rat 3.52%|
|878|water|abgrund_krabbe 2.51% / abyss_piranha 97.49%|
|893|crystal|abyss_crystal_beetle 1.99% / prism_moth 98.01%|
|1063|yellow|abyss_giant_scorpion 9.69% / cobra_gator 90.31%|
|1140|magic|tanzlichter 9.27% / geistflamme 90.73%|
|1275|red|fire_spirit 98.03% / fire_lizard 1.97%|
|1306|black|will_o_wisp 97.84% / wraith 2.16%|
|1366|green|abyss_tiger 96.11% / abyss_mushroom 3.89%|
|1530|blue|ice_vogel 93.54% / ice_spirit 6.46%|
|1543|torture|morgenstern 1.12% / inquisitorin 96.65% / folterzange 2.23%|
|1577|water|abgrund_krabbe 7.38% / abyss_piranha 92.62%|
|1587|black|sensenmann 98.03% / wraith 1.97%|
|1847|green|abyss_panther 90.90% / abyss_tiger 9.10%|
|1862|torture|morgenstern 92.67% / inquisitorin 7.33%|
|1988|crystal|abyss_crystal_beetle 4.77% / crystal_mimic 95.23%|
|2104|yellow|abyss_lizard 4.45% / abyss_giant_scorpion 95.55%|
|2114|water|abyss_piranha 1.52% / abgrund_aal 98.48%|
|2187|magic|tanzlichter 3.13% / geistflamme 96.87%|
|2310|green|abyss_tiger 7.85% / abyss_mushroom 92.15%|
|2320|yellow|abyss_lizard 4.70% / cobra_gator 95.30%|
|2322|slate|poison_slime 91.02% / vampire_bat 8.98%|
|2336|red|loren_lava 97.99% / fire_lizard 2.01%|
|2393|crystal|crystal_mimic 3.90% / amethyst_golem 93.49% / prism_moth 2.61%|
|2425|blue|ice_spirit 97.32% / ice_lizard 2.68%|
|2456|yellow|abyss_giant_scorpion 3.20% / cobra_gator 96.80%|
|2463|magic|tanzlichter 2.99% / geistflamme 97.01%|
|2500|crystal|prism_moth 93.32% / abyss_crystal_beetle 6.68%|
|2529|green|abyss_panther 5.89% / abyss_tiger 94.11%|
|2543|torture|inquisitorin 7.70% / folterzange 92.30%|
|2616|magic|merseburg_spell 96.19% / geistflamme 3.81%|
|2691|green|abyss_tiger 92.95% / abyss_mushroom 7.05%|
|2693|black|will_o_wisp 2.18% / wraith 97.82%|
|2785|torture|inquisitorin 9.53% / morgenstern 90.47%|
|2787|red|fire_lizard 90.90% / fire_spirit 9.10%|
|2820|black|schleipnir 94.51% / sensenmann 5.49%|
|2840|slate|viper 9.84% / bouncing_coin 90.16%|
|3090|green|abyss_tiger 1.97% / abyss_mushroom 95.08% / abyss_panther 2.95%|
|3224|blue|ice_lizard 94.99% / ice_spirit 5.01%|
|3255|blue|ice_lizard 1.62% / ice_spirit 96.76% / ice_bear 1.62%|
|3258|slate|abyss_rat 91.91% / cave_slime 8.09%|
|3518|green|abyss_tiger 3.01% / abyss_panther 96.99%|
|3537|crystal|abyss_crystal_beetle 94.56% / amethyst_golem 5.44%|
|3598|green|abyss_tiger 9.47% / abyss_panther 90.53%|
|3851|crystal|abyss_crystal_beetle 91.17% / crystal_mimic 8.83%|
|3958|blue|ice_lizard 4.71% / ice_bear 95.29%|
|3989|blue|ice_bear 90.47% / ice_spirit 9.53%|
|4161|black|sensenmann 98.91% / will_o_wisp 1.09%|
|4195|crystal|abyss_crystal_beetle 2.71% / crystal_mimic 97.29%|
|4204|torture|inquisitorin 97.74% / morgenstern 1.13% / folterpanzer 1.13%|
|4271|red|fire_spirit 9.91% / fire_lizard 90.09%|
|4466|black|sensenmann 9.69% / wraith 90.31%|
|4607|water|abgrund_aal 6.26% / abgrund_krabbe 93.74%|
|4622|magic|geistflamme 6.60% / tanzlichter 2.21% / junghexe 91.19%|
|4645|crystal|amethyst_golem 96.07% / abyss_crystal_beetle 3.93%|
|4664|magic|junghexe 94.93% / tanzlichter 5.07%|
|4793|black|wraith 9.10% / sensenmann 90.90%|
|4890|blue|ice_spirit 6.18% / ice_bear 93.82%|
|4920|magic|junghexe 3.78% / tanzlichter 96.22%|
|5150|torture|morgenstern 95.82% / maikaefer 4.18%|
|5226|red|fire_spirit 9.76% / loren_lava 90.24%|
|5248|magic|merseburg_spell 8.70% / junghexe 91.30%|
|5402|black|schleipnir 90.90% / sensenmann 9.10%|
|5666|crystal|abyss_crystal_beetle 97.49% / amethyst_golem 2.51%|
|5796|torture|folterzange 92.37% / morgenstern 7.63%|
|5807|water|abyss_piranha 8.58% / abyss_giant_catfish 91.42%|
|5871|slate|abyss_rat 1.40% / abyss_rabbit 98.60%|
|6282|slate|poison_slime 2.18% / abyss_rabbit 97.82%|
|6325|red|fire_lizard 5.27% / maikaefer 94.73%|
|6338|slate|viper 2.87% / abyss_rat 97.13%|
|6450|slate|cave_slime 97.13% / abyss_rat 2.87%|
|6455|water|abyss_piranha 1.60% / abgrund_aal 98.40%|
|6733|blue|ice_vogel 98.54% / ice_lizard 1.46%|
|6771|slate|abyss_rat 3.86% / poison_slime 96.14%|
|6844|magic|geistflamme 3.01% / tanzlichter 96.99%|
|6858|slate|wandering_dead 8.17% / bouncing_coin 91.83%|
|6915|blue|ice_vogel 94.44% / ice_spirit 5.56%|
|7137|blue|ice_lizard 94.73% / ice_spirit 5.27%|
|7160|magic|maikaefer 95.18% / merseburg_spell 4.82%|
|7385|crystal|abyss_crystal_beetle 3.07% / amethyst_golem 96.93%|
|7835|magic|merseburg_spell 94.63% / tanzlichter 5.37%|
|7848|blue|ice_bear 2.54% / ice_lizard 97.46%|
|7995|magic|tanzlichter 2.64% / merseburg_spell 97.36%|
|8094|slate|poison_slime 94.54% / wandering_dead 5.46%|
|8848|blue|ice_spirit 8.83% / maikaefer 91.17%|
|9257|slate|bouncing_coin 7.33% / viper 92.67%|
|9615|black|wraith 94.99% / sensenmann 5.01%|
|9708|water|abgrund_krabbe 95.38% / abyss_piranha 4.62%|
|9993|slate|cave_slime 98.87% / wandering_dead 1.13%|
|10194|water|abyss_giant_catfish 96.03% / abgrund_aal 3.97%|
|10765|water|abgrund_krabbe 92.85% / abgrund_aal 7.15%|
|10930|red|fire_lizard 1.20% / loren_lava 98.80%|
|10964|slate|cave_slime 8.21% / abyss_rat 91.79%|
|11022|slate|abyss_rabbit 91.48% / wandering_dead 8.52%|
|11887|torture|folterpanzer 94.51% / morgenstern 5.49%|
|12321|red|cassowary 93.99% / fire_spirit 6.01%|
|14977|slate|wandering_dead 96.87% / cave_slime 3.13%|
|15608|crystal|abyss_crystal_beetle 2.16% / crystal_mimic 97.84%|
|15636|water|abyss_piranha 2.75% / abyss_giant_catfish 97.25%|
|16087|slate|wandering_dead 4.05% / bouncing_coin 91.90% / poison_slime 4.05%|
|17590|slate|cave_slime 9.90% / viper 90.10%|
|18411|slate|abyss_rabbit 1.26% / viper 98.74%|
|19598|torture|morgenstern 1.62% / folterpanzer 98.38%|
|20115|slate|wandering_dead 92.75% / vampire_bat 7.25%|
|22597|torture|inquisitorin 1.01% / folterpanzer 94.98% / morgenstern 4.01%|
|25368|slate|wandering_dead 96.93% / abyss_rabbit 3.07%|
|29795|red|fire_spirit 4.86% / cassowary 95.14%|
|33405|red|cassowary 96.29% / loren_lava 3.71%|

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
    "revision": "v1-candidate-2",
    "ruleset": "special-map-v1",
    "seed": 0,
    "themeId": "magic",
    "species": [
      {
        "monsterId": "merseburg_spell",
        "weight": 2680
      },
      {
        "monsterId": "tanzlichter",
        "weight": 4381
      },
      {
        "monsterId": "junghexe",
        "weight": 362
      },
      {
        "monsterId": "geistflamme",
        "weight": 2577
      }
    ],
    "fingerprint": "e9e3a6a3",
    "topologyFingerprint": "085620c1"
  },
  {
    "revision": "v1-candidate-2",
    "ruleset": "special-map-v1",
    "seed": 1,
    "themeId": "red",
    "species": [
      {
        "monsterId": "fire_spirit",
        "weight": 228
      },
      {
        "monsterId": "fire_lizard",
        "weight": 739
      },
      {
        "monsterId": "loren_lava",
        "weight": 2954
      },
      {
        "monsterId": "cassowary",
        "weight": 3352
      },
      {
        "monsterId": "maikaefer",
        "weight": 2727
      }
    ],
    "fingerprint": "294ae532",
    "topologyFingerprint": "487444ba"
  },
  {
    "revision": "v1-candidate-2",
    "ruleset": "special-map-v1",
    "seed": 12345,
    "themeId": "torture",
    "species": [
      {
        "monsterId": "morgenstern",
        "weight": 1860
      },
      {
        "monsterId": "folterzange",
        "weight": 2397
      },
      {
        "monsterId": "folterpanzer",
        "weight": 2562
      },
      {
        "monsterId": "maikaefer",
        "weight": 3181
      }
    ],
    "fingerprint": "59f293a7",
    "topologyFingerprint": "65bbb4f0"
  },
  {
    "revision": "v1-candidate-2",
    "ruleset": "special-map-v1",
    "seed": 32768,
    "themeId": "crystal",
    "species": [
      {
        "monsterId": "abyss_crystal_beetle",
        "weight": 2621
      },
      {
        "monsterId": "prism_moth",
        "weight": 5379
      },
      {
        "monsterId": "crystal_mimic",
        "weight": 2000
      }
    ],
    "fingerprint": "3cffa073",
    "topologyFingerprint": "e7e9d2c5"
  },
  {
    "revision": "v1-candidate-2",
    "ruleset": "special-map-v1",
    "seed": 65535,
    "themeId": "crystal",
    "species": [
      {
        "monsterId": "crystal_mimic",
        "weight": 1389
      },
      {
        "monsterId": "abyss_crystal_beetle",
        "weight": 2778
      },
      {
        "monsterId": "amethyst_golem",
        "weight": 3426
      },
      {
        "monsterId": "prism_moth",
        "weight": 2407
      }
    ],
    "fingerprint": "1a0345a1",
    "topologyFingerprint": "26ac1209"
  }
]
```

## Candidate 1 / 2比較

Candidate 1再生成SHA-256: `33f521694198da8fd73de895fd844c6042d8c88f364c1465aa3c181968dc20a4`（保存済み値と一致）。

全65,536 seedで、選出monsterIdの順序・種数・theme・ruleset・seedが一致。

|指標|Candidate 1 件数（全seed比）|Candidate 2 件数（全seed比）|
|---|---:|---:|
|単一種|133 (0.2029%)|133 (0.2029%)|
|70%以上|29278 (44.6747%)|7804 (11.908%)|
|80%以上|20572 (31.3904%)|3866 (5.899%)|
|90%以上|12770 (19.4855%)|1537 (2.3453%)|
|95%以上|8447 (12.8891%)|713 (1.088%)|
|100%以上|133 (0.2029%)|133 (0.2029%)|
|マイケーファー90%以上|437 (0.6668%)|25 (0.0381%)|
|マイケーファー100%|0 (0%)|0 (0%)|

## 要求種数 → 実際の種数

|種数|要求件数（全seed比）|実際件数（全seed比）|
|---|---:|---:|
|1|133 (0.2029%)|133 (0.2029%)|
|2|13007 (19.8471%)|13007 (19.8471%)|
|3|22951 (35.0204%)|22951 (35.0204%)|
|4|19733 (30.1102%)|21698 (33.1085%)|
|5|9712 (14.8193%)|7747 (11.821%)|

|theme|候補数|要求5種|要求5種→4種以下|
|---|---:|---:|---:|
|slate|9|964|0|
|magic|5|993|0|
|torture|5|1000|0|
|red|5|932|0|
|blue|5|1007|0|
|green|4|985|985|
|yellow|4|980|980|
|water|5|958|0|
|crystal|5|950|0|
|black|5|943|0|

種数の全遷移・themeごとの要求/実数内訳はJSONのcountTransitions/themesを参照。

## 低baseWeight種の統計

監査上の抽出条件: いずれかのthemeでbaseWeight ≤ 100,000（初回選出比10%以下）。生成にはこの分類を使用しない。

|monsterId|該当theme:baseWeight|含有地図数|100%|90%以上 C1→C2|
|---|---|---:|---:|---:|
|bouncing_coin|slate:85992|2064|2|107 → 7|
|viper|slate:78175|1966|2|98 → 10|
|maikaefer|slate:15000, magic:15000, torture:15000, red:15000, blue:15000, green:15000, yellow:15000, water:15000, crystal:15000, black:15000|18153|0|437 → 25|
|folterpanzer|torture:60677|3546|0|145 → 19|
|cassowary|red:49250|3264|2|111 → 7|
|ice_bear|blue:49250|3365|1|125 → 14|
|abyss_giant_catfish|water:65667|3752|1|159 → 14|
|crystal_mimic|crystal:98500|4158|1|204 → 14|

## 同じseedの比率比較

|seed / theme|Candidate 1|Candidate 2|C2 fingerprint|
|---|---|---|---|
|0 / magic|merseburg_spell 15.98% / tanzlichter 69.76% / junghexe 0.05% / geistflamme 14.21%|merseburg_spell 26.8% / tanzlichter 43.81% / junghexe 3.62% / geistflamme 25.77%|e9e3a6a3|
|1 / red|fire_spirit 0.02% / fire_lizard 0.49% / loren_lava 30.64% / cassowary 44.75% / maikaefer 24.1%|fire_spirit 2.28% / fire_lizard 7.39% / loren_lava 29.54% / cassowary 33.52% / maikaefer 27.27%|294ae532|
|102 / water|abgrund_aal 2.23% / abyss_piranha 0.43% / abgrund_krabbe 2.23% / maikaefer 95.11%|abgrund_aal 16.46% / abyss_piranha 9.5% / abgrund_krabbe 16.46% / maikaefer 57.58%|615a7ec0|
|104 / crystal|maikaefer 95.63% / abyss_crystal_beetle 4.37%|maikaefer 73.68% / abyss_crystal_beetle 26.32%|6029448d|
|640 / blue|ice_spirit 0.21% / ice_lizard 3.46% / ice_vogel 0.13% / maikaefer 96.2%|ice_spirit 8.17% / ice_lizard 21.09% / ice_vogel 6.81% / maikaefer 63.93%|6a2d99d0|
|12345 / torture|morgenstern 9.3% / folterzange 19.89% / folterpanzer 24.29% / maikaefer 46.52%|morgenstern 18.6% / folterzange 23.97% / folterpanzer 25.62% / maikaefer 31.81%|59f293a7|
|32768 / crystal|abyss_crystal_beetle 9.92% / prism_moth 85.67% / crystal_mimic 4.41%|abyss_crystal_beetle 26.21% / prism_moth 53.79% / crystal_mimic 20%|3cffa073|
|65535 / crystal|crystal_mimic 3.43% / abyss_crystal_beetle 27.38% / amethyst_golem 51.36% / prism_moth 17.83%|crystal_mimic 13.89% / abyss_crystal_beetle 27.78% / amethyst_golem 34.26% / prism_moth 24.07%|1a0345a1|
