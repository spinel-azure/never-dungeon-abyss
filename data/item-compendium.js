// Display-only catalog entries; item mechanics remain in items.js / key-items.js.
export const ITEM_COMPENDIUM_TABS = Object.freeze(["すべて", "消耗品", "換金・素材", "貴重品"]);
export function filterItemCompendiumEntries(entries, tab = "すべて") {
  return entries.filter(entry => tab === "すべて" || entry.category === tab);
}
export const ITEM_COMPENDIUM_ENTRIES = Object.freeze({
  silver_beetle_wing: Object.freeze({
    id: "silver_beetle_wing", name: "銀甲虫の翅", category: "換金・素材",
    acquisition: "ズィルバーケーファー", purchasePrice: null,
    description: "ズィルバーケーファーの銀色に輝く翅。売却専用。"
  }),
  beetle_king_horn: Object.freeze({
    id: "beetle_king_horn", name: "甲虫王の角", category: "換金・素材",
    acquisition: "マイケーファーケーニヒ", purchasePrice: null,
    description: "マイケーファーケーニヒの威厳ある角。売却専用。"
  }),
  strength_engraving: engravingEntry("strength_engraving", "剛力の刻印", "STR"),
  intelligence_engraving: engravingEntry("intelligence_engraving", "叡智の刻印", "INT"),
  agility_engraving: engravingEntry("agility_engraving", "疾風の刻印", "AGI"),
  dexterity_engraving: engravingEntry("dexterity_engraving", "技巧の刻印", "DEX"),
  luck_engraving: engravingEntry("luck_engraving", "幸運の刻印", "LUC"),
  red_rust_key_b9f: Object.freeze({
    id: "red_rust_key_b9f",
    name: "赤錆びた鍵",
    category: "貴重品",
    acquisition: "金箱（区域ボス出現階層）",
    purchasePrice: null,
    imageSrc: "images/item-compendium/red_rust_key.avif",
    description: "区域ボスがいる部屋の赤い扉を開くことが出来る鍵。何故そんな重要なものがわざわざご丁寧に箱の中に入れられてダンジョン内に放置されているのかは深く考えてはいけない。…いいね？"
  }),
  kirke_special_birdlime: Object.freeze({
    id: "kirke_special_birdlime",
    name: "キルケ特製とりもち",
    category: "貴重品",
    acquisition: "依頼026「メルヒェンティーレ」",
    purchasePrice: null,
    imageSrc: "images/item-compendium/kirke_special_birdlime.avif",
    description: "いたずら動物トリオのメルヒェンティーレに手を焼いた魔女キルケが作った特製のとりもち。強力な粘着力で対象を拘束する。なお、メルヒェンティーレの3匹にはそれぞれ、「ブレッセ（白ぶち）」「カニンヒェン（うさぎ）」「ニートリヒ（小さい、可愛い）」という名前があるが、あまり深く考えてはいけない。…いいね？"
  }),
  trapezohedron: Object.freeze({
    "id": "trapezohedron",
    "name": "トラペツォエーダー",
    "category": "貴重品",
    "acquisition": "依頼030「異界の混沌」",
    "purchasePrice": null,
    "description": "怪しげな男から託された多面体。結晶区域の最奥にある祭壇で捧げる事により、「クリーヒェンデス・カーオス」を降臨させた。可視光の99.9％を吸収する物質で出来ており、まるで闇そのものを感じさせる。別の世界では「トラペゾヘドロン」とも呼ばれ、「這い寄る混沌」なる異形を呼び出す為に用いられたとも言われる。"
  }),
  royal_cat_medal: Object.freeze({
    "id": "royal_cat_medal",
    "name": "ケーニクリヒャー・カッツェンオルデン",
    "category": "貴重品",
    "acquisition": "エンドロール鑑賞後",
    "purchasePrice": null,
    "imageSrc": "images/item-compendium/royal_cat_medal.avif",
    "description": "ドゥンケルマギアー・アマイェナクを倒し、真実の杖を取り戻した功績を称えるべく女王ミカエラから授与された勲章。名前の意味はドイツ語で「王立猫勲章」。ステータス画面及びデータロード画面で表示される。なお、この勲章を所持していると「女王のティアラ」「女王のイヤリング」「女王の首飾り」と同じ効果がある。"
  }),
  queen_necklace: Object.freeze({
    id: "queen_necklace",
    name: "女王の首飾り",
    category: "貴重品",
    acquisition: "依頼032「女王の影を追え――その3」",
    purchasePrice: null,
    description: "カッツェンラントの女王が身に着けていたと言われる首飾り。柑橘系の匂いがする。所持しているだけでそのフロアのミニマップを全て表示する。ただしB100Fでは無効。"
  }),
  attracting_incense: Object.freeze({id:'attracting_incense',name:'引き寄せのお香',category:'消耗品',acquisition:'スタンプ交換',purchasePrice:null,imageSrc:'images/item-compendium/monster_attracting_incense.avif',description:'気配上昇量が2倍になる。奈落は区域移動まで、地図迷宮は帰還まで持続。'}),
  ewige_laterne:Object.freeze({id:'ewige_laterne',name:'エーヴィゲ・ラテルネ',category:'貴重品',acquisition:'調査報告の景品交換（45p）',purchasePrice:null,imageSrc:'images/item-compendium/ewige_laterne.avif',description:'所持中、地図迷宮でたいまつゲージが減らなくなる。奈落迷宮では無効。'}),
  magic_lantern:Object.freeze({id:'magic_lantern',name:'魔法のランタン',category:'貴重品',acquisition:'調査報告の景品交換（15p）',purchasePrice:null,imageSrc:'images/item-compendium/magic_lantern.avif',description:'所持中、地図迷宮でのたいまつ消費が半分になり、階層移動で全回復する。導きのたいまつは使用不可。奈落迷宮では無効。'}),
  hacking_device:Object.freeze({id:'hacking_device',name:'ハッキングデバイス',category:'貴重品',acquisition:'累計調査報告1000件達成報酬（転生3回・ポイント消費なし）',purchasePrice:null,imageSrc:'images/item-compendium/hacking_device.avif',description:'明らかにこの世界の物ではない。効果は不明。『HACKING AURORA OS』と書かれているが…？'}),
  stamp_book: Object.freeze({id:'stamp_book',name:'スタンプ帳',category:'貴重品',acquisition:'探検家テント',purchasePrice:null,imageSrc:'images/item-compendium/stamp_book.avif',description:'迷宮探検家トレリーレンから貰ったスタンプ帳。調査が完了する度にスタンプを押してくれる。'}),
  warding_incense: Object.freeze({
    "id": "warding_incense",
    "name": "魔除けのお香",
    "category": "消耗品",
    "acquisition": "イベント入手",
    "purchasePrice": null,
    "description": "迷宮探検家トレリーレンから譲り受けたお香。使用すると気配ゲージが上昇しなくなる。帰還または、別区域に移動するまで効果が持続する。このお香のおかげで、彼女は危険な奈落を安全に闊歩出来るのである。"
  }),
  queen_earring: Object.freeze({
    "id": "queen_earring",
    "name": "女王のイヤリング",
    "category": "貴重品",
    "acquisition": "依頼024「女王の影を追え――その2」",
    "purchasePrice": null,
    "description": "カッツェンラントの女王が身に着けていたと言われるイヤリング。柑橘系の匂いがする。所持しているだけで「階段探知」および「宝箱探知」と同じ効果がある。"
  }),
  lichtbringer: Object.freeze({
    id: "lichtbringer",
    name: "リヒトブリンガー",
    category: "貴重品",
    acquisition: "イベント入手",
    purchasePrice: null,
    description: "ドイツ語で「光もたらすもの」を意味する光の球。完全なる闇に閉ざされた漆黒区域を照らし出す。英語でライトブリンガーでも良かったんだけど、こっちの方が何となく語感がいいじゃない？ｗ"
  }),
  wing_gift: Object.freeze({
    id: "wing_gift",
    imageSrc: "images/item-compendium/wing_gift.avif",
    name: "ウィングギフト",
    category: "消耗品",
    acquisition: "商店購入",
    purchasePrice: 10000,
    description: "飲むと何かを授けられそうな滋養飲料。使用するとSPが50%回復するがその冒険中、ベース最大HPが20％減算される。効果は累積し最大4回まで使用可。カフェインの取り過ぎにはご用心…。"
  }),
  queen_tiara: Object.freeze({
    id: "queen_tiara",
    name: "女王のティアラ",
    category: "貴重品",
    acquisition: "依頼008「女王の影を追え」",
    purchasePrice: null,
    description: "カッツェンラントの女王が身に着けていたと言われるティアラ。柑橘系の匂いがする。所持しているだけで「人捜し」と同じ効果がある。"
  })
});

function engravingEntry(id,name,stat){
 return Object.freeze({id,name,category:"消耗品",acquisition:"地図迷宮Lv100ボスの金箱（V2）",purchasePrice:null,
  imageSrc:`images/item-compendium/${id}.avif`,description:`魂へ刻み込むと、${stat}が恒久的に1上昇する。`});
}

export function getItemCompendiumEntry(id) {
  return ITEM_COMPENDIUM_ENTRIES[id] || null;
}
