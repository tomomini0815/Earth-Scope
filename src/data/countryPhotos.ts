/**
 * 世界198ヵ国の象徴的な名所・風景・世界遺産写真データ
 * Wikipedia / Wikimedia Commons の公式アーカイブに基づく正確な実在写真
 */

export type CountryPhoto = {
  url: string;
  caption: string;
};

// デフォルトフォールバック写真（特定国ではなく地球全体の宇宙写真・アポロ17号）
export const DEFAULT_EARTH_PHOTO: CountryPhoto = {
  url: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/The_Earth_seen_from_Apollo_17.jpg/330px-The_Earth_seen_from_Apollo_17.jpg",
  caption: "青い地球（宇宙より）",
};

// 大陸ごとの高品質フォールバック写真（万一の通信遅延用）
const CONTINENT_FALLBACKS: Record<string, CountryPhoto> = {
  asia: {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Mt.Fuji_from_Mierula.jpg/330px-Mt.Fuji_from_Mierula.jpg",
    caption: "富士山と桜（日本）",
  },
  europe: {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/Tour_Eiffel_Wikimedia_Commons_%28cropped%29.jpg/330px-Tour_Eiffel_Wikimedia_Commons_%28cropped%29.jpg",
    caption: "エッフェル塔（フランス）",
  },
  africa: {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/Great_Pyramid_Giza_%282%29.jpg/330px-Great_Pyramid_Giza_%282%29.jpg",
    caption: "ギザの大ピラミッド（エジプト）",
  },
  "north-america": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/New_York_City_%28New_York%2C_USA%29%2C_Statue_of_Liberty_--_2012_--_6660.jpg/330px-New_York_City_%28New_York%2C_USA%29%2C_Statue_of_Liberty_--_2012_--_6660.jpg",
    caption: "自由の女神像（北米）",
  },
  "south-america": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Machu_Picchu%2C_Peru.jpg/330px-Machu_Picchu%2C_Peru.jpg",
    caption: "空中都市マチュ・ピチュ（ペルー）",
  },
  oceania: {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/Sydney_Opera_House_from_Circular_Quay%2C_2023%2C_10.jpg/330px-Sydney_Opera_House_from_Circular_Quay%2C_2023%2C_10.jpg",
    caption: "シドニー・オペラハウス（オーストラリア）",
  },
};

// 全世界198ヵ国の完全個別・実在名所写真マップ
export const COUNTRY_PHOTOS: Record<string, CountryPhoto> = {
  JPN: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/55/Mt.Fuji_from_Mierula.jpg/330px-Mt.Fuji_from_Mierula.jpg",
    caption: "富士山と桜（日本）",
  },
  CHN: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/17/The_Great_wall_-_by_Hao_Wei.jpg/330px-The_Great_wall_-_by_Hao_Wei.jpg",
    caption: "万里の長城（中国）",
  },
  KOR: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/69/Gyeongbok-gung_palace-05_%28xndr%29.jpg/330px-Gyeongbok-gung_palace-05_%28xndr%29.jpg",
    caption: "景福宮（韓国）",
  },
  PRK: {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/Paektu-san.jpg/330px-Paektu-san.jpg",
    caption: "白頭山（白頭）の火口湖・天池（北朝鮮）",
  },
  MNG: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/95/Mongolia_Ger.jpg/330px-Mongolia_Ger.jpg",
    caption: "果てしない大草原とゲル（モンゴル）",
  },
  VNM: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e4/Halong_ensemble_%28colour_corrected%29.jpg/330px-Halong_ensemble_%28colour_corrected%29.jpg",
    caption: "世界自然遺産ハロン湾（ベトナム）",
  },
  IDN: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f0/Borobudur_scenery_1.jpg/330px-Borobudur_scenery_1.jpg",
    caption: "ボロブドゥール寺院（インドネシア）",
  },
  THA: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2a/%E0%B9%80%E0%B8%88%E0%B8%94%E0%B8%B5%E0%B8%A2%E0%B9%8C%E0%B8%9B%E0%B8%A3%E0%B8%B0%E0%B8%98%E0%B8%B2%E0%B8%99%E0%B8%97%E0%B8%A3%E0%B8%87%E0%B8%9B%E0%B8%A3%E0%B8%B2%E0%B8%87%E0%B8%84%E0%B9%8C%E0%B8%A7%E0%B8%B1%E0%B8%94%E0%B8%AD%E0%B8%A3%E0%B8%B8%E0%B8%932.jpg/330px-%E0%B9%80%E0%B8%88%E0%B8%94%E0%B8%B5%E0%B8%A2%E0%B9%8C%E0%B8%9B%E0%B8%A3%E0%B8%B0%E0%B8%98%E0%B8%B2%E0%B8%99%E0%B8%97%E0%B8%A3%E0%B8%87%E0%B8%9B%E0%B8%A3%E0%B8%B2%E0%B8%87%E0%B8%84%E0%B9%8C%E0%B8%A7%E0%B8%B1%E0%B8%94%E0%B8%AD%E0%B8%A3%E0%B8%B8%E0%B8%932.jpg",
    caption: "ワット・アルン暁の寺（タイ）",
  },
  PHL: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5e/El_Nido_Palawan_2.jpg/330px-El_Nido_Palawan_2.jpg",
    caption: "エルニドのエメラルドラグーン（フィリピン）",
  },
  MYS: {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/17/Kuala_Lumpur_Malaysia_Petronas-Twin-Towers-01.jpg/330px-Kuala_Lumpur_Malaysia_Petronas-Twin-Towers-01.jpg",
    caption: "ペトロナスツインタワー（マレーシア）",
  },
  SGP: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f9/Marina_Bay_Sands_in_the_evening_-_20101120.jpg/330px-Marina_Bay_Sands_in_the_evening_-_20101120.jpg",
    caption: "マリーナベイ・サンズ（シンガポール）",
  },
  MMR: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9c/20160801_Bagan_temples_6743_DxO.jpg/330px-20160801_Bagan_temples_6743_DxO.jpg",
    caption: "バガンの仏塔遺跡群（ミャンマー）",
  },
  KHM: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/41/Angkor_Wat.jpg/330px-Angkor_Wat.jpg",
    caption: "アンコール・ワット寺院群（カンボジア）",
  },
  LAO: {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/Phou_si_Luang_Prabang_Laos_%E3%83%97%E3%83%BC%E3%82%B7%E3%83%BC%E3%81%AE%E4%B8%98_%E3%83%A9%E3%82%AA%E3%82%B9%E3%83%BB%E3%83%AB%E3%82%A2%E3%83%B3%E3%83%97%E3%83%A9%E3%83%90%E3%83%BC%E3%83%B3_DSCF6777.jpg/330px-Phou_si_Luang_Prabang_Laos_%E3%83%97%E3%83%BC%E3%82%B7%E3%83%BC%E3%81%AE%E4%B8%98_%E3%83%A9%E3%82%AA%E3%82%B9%E3%83%BB%E3%83%AB%E3%82%A2%E3%83%B3%E3%83%97%E3%83%A9%E3%83%90%E3%83%BC%E3%83%B3_DSCF6777.jpg",
    caption: "世界遺産・古都ルアンパバーン（ラオス）",
  },
  BRN: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ed/Sultan_Omar_Ali_Saifuddien_Mosque%3B_2002.jpg/330px-Sultan_Omar_Ali_Saifuddien_Mosque%3B_2002.jpg",
    caption: "オマール・アリ・モスク（ブルネイ）",
  },
  TLS: {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/Christ_Dili.jpg/330px-Christ_Dili.jpg",
    caption: "ディリのクリスト・レイ像と青い海（東ティモール）",
  },
  IND: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/bd/Taj_Mahal%2C_Agra%2C_India_edit3.jpg/330px-Taj_Mahal%2C_Agra%2C_India_edit3.jpg",
    caption: "タージ・マハル（インド）",
  },
  PAK: {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Badshahi_Mosque_front_picture.jpg/330px-Badshahi_Mosque_front_picture.jpg",
    caption: "ラホールのバードシャヒ・モスク（パキスタン）",
  },
  BGD: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/25/Sun_in_Sunderbans.jpg/330px-Sun_in_Sunderbans.jpg",
    caption: "シュンドルボンのマングローブ（バングラデシュ）",
  },
  LKA: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c7/Sigiriya.jpg/330px-Sigiriya.jpg",
    caption: "古代天空都市シーギリヤ（スリランカ）",
  },
  NPL: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e7/Everest_North_Face_toward_Base_Camp_Tibet_Luca_Galuzzi_2006.jpg/330px-Everest_North_Face_toward_Base_Camp_Tibet_Luca_Galuzzi_2006.jpg",
    caption: "ヒマラヤ山脈エベレスト（ネパール）",
  },
  BTN: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/ce/Paro_2-33_%288213233907%29.jpg/330px-Paro_2-33_%288213233907%29.jpg",
    caption: "断崖のタクツァン僧院（ブータン）",
  },
  MDV: {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/83/Mal%C3%A9.jpg/330px-Mal%C3%A9.jpg",
    caption: "珊瑚礁の海とマレの街並み（モルディブ）",
  },
  AFG: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/50/Afghanistan_Statua_di_Budda_2.jpg/330px-Afghanistan_Statua_di_Budda_2.jpg",
    caption: "バーミヤン渓谷遺跡群（アフガニスタン）",
  },
  KAZ: {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/Charyn_Canyon%2C_Kazakhstan_03.jpg/330px-Charyn_Canyon%2C_Kazakhstan_03.jpg",
    caption: "チャリンキャニオンの奇岩群（カザフスタン）",
  },
  UZB: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/48/Registan_square2014.JPG/330px-Registan_square2014.JPG",
    caption: "サマルカンドのレギスタン広場（ウズベキスタン）",
  },
  TKM: {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bc/Darvasa_gas_crater_panorama_crop.jpg/330px-Darvasa_gas_crater_panorama_crop.jpg",
    caption: "燃え続ける地獄の門ダルヴァザ（トルクメニスタン）",
  },
  KGZ: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e4/Issyk_Kul.jpg/330px-Issyk_Kul.jpg",
    caption: "天山山脈とイシク・クル湖（キルギス）",
  },
  TJK: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3b/Pamir_Mountains%2C_Tajikistan%2C_06-04-2008.jpg/330px-Pamir_Mountains%2C_Tajikistan%2C_06-04-2008.jpg",
    caption: "パミール高原の雪山群（タジキスタン）",
  },
  SAU: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9c/Madain_Saleh_%286720497611%29.jpg/330px-Madain_Saleh_%286720497611%29.jpg",
    caption: "古代遺跡マダイン・サーレハ（サウジアラビア）",
  },
  TUR: {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Cappadocia_Balloon_Inflating_Wikimedia_Commons.JPG/330px-Cappadocia_Balloon_Inflating_Wikimedia_Commons.JPG",
    caption: "カッパドキアの奇岩と気球（トルコ）",
  },
  IRN: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0c/Naghshe_jahan_01.jpg/330px-Naghshe_jahan_01.jpg",
    caption: "イスファハンのイマーム広場（イラン）",
  },
  IRQ: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/80/Ziggurat_of_ur.jpg/330px-Ziggurat_of_ur.jpg",
    caption: "ウルの古代ジッグラト（イラク）",
  },
  ARE: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a6/Burj_Khalifa_%2816260269606%29.jpg/330px-Burj_Khalifa_%2816260269606%29.jpg",
    caption: "超高層ビル・ブルジュ・ハリファ（UAE）",
  },
  ISR: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8b/Jerusalem-2013%282%29-Temple_Mount-Dome_of_the_Rock_%28SE_exposure%29.jpg/330px-Jerusalem-2013%282%29-Temple_Mount-Dome_of_the_Rock_%28SE_exposure%29.jpg",
    caption: "エルサレムの岩のドーム（イスラエル）",
  },
  PSE: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2c/NativityChurch3.jpg/330px-NativityChurch3.jpg",
    caption: "ベツレヘムの聖誕教会（パレスチナ）",
  },
  JOR: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0b/Al-Khazneh%2C_Petra%2C_Jordan.jpg/330px-Al-Khazneh%2C_Petra%2C_Jordan.jpg",
    caption: "断崖に刻まれたペトラ遺跡（ヨルダン）",
  },
  LBN: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/99/Baalbek-Bacchus.jpg/330px-Baalbek-Bacchus.jpg",
    caption: "バールベックのローマ神殿群（レバノン）",
  },
  SYR: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/40/KRAK_DES_CHEVALIERS_-_GAR_-_6-00.jpg/330px-KRAK_DES_CHEVALIERS_-_GAR_-_6-00.jpg",
    caption: "騎士の城クラック・デ・シュヴァリエ（シリア）",
  },
  KWT: {
    url: "https://upload.wikimedia.org/wikipedia/en/thumb/8/8c/Kuwait_Towers_RB.jpg/330px-Kuwait_Towers_RB.jpg",
    caption: "クウェート・タワー（クウェート）",
  },
  OMN: {
    url: "https://upload.wikimedia.org/wikipedia/en/thumb/5/5b/Sultan_Qaboos_Grand_Mosque_RB.jpg/330px-Sultan_Qaboos_Grand_Mosque_RB.jpg",
    caption: "スルタン・カブース・グランド・モスク（オマーン）",
  },
  QAT: {
    url: "https://upload.wikimedia.org/wikipedia/en/thumb/c/c7/Museum_of_Islamic_Art_in_Doha%2C_Qatar_%2832673171432%29.jpg/330px-Museum_of_Islamic_Art_in_Doha%2C_Qatar_%2832673171432%29.jpg",
    caption: "ドーハのイスラム美術館と夜景（カタール）",
  },
  BHR: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5e/Bahrain_Fort_8.jpg/330px-Bahrain_Fort_8.jpg",
    caption: "世界遺産バーレーン要塞（バーレーン）",
  },
  YEM: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/64/%D8%AF%D8%B1%D8%A9_%D8%A7%D9%84%D9%88%D8%A7%D8%AF%D9%8A_%D8%B4%D8%A8%D8%A7%D9%85.jpg/330px-%D8%AF%D8%B1%D8%A9_%D8%A7%D9%84%D9%88%D8%A7%D8%AF%D9%8A_%D8%B4%D8%A8%D8%A7%D9%85.jpg",
    caption: "砂漠の摩天楼シバーム（イエメン）",
  },
  AZE: {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fc/Maiden_tower_IMG_8521.jpg/330px-Maiden_tower_IMG_8521.jpg",
    caption: "バクー旧市街の乙女の塔（アゼルバイジャン）",
  },
  GEO: {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Gergeti_Trinity_Church_09.23.jpg/330px-Gergeti_Trinity_Church_09.23.jpg",
    caption: "カズベク山とゲルゲティ三位一体教会（ジョージア）",
  },
  ARM: {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Garni_temple_2021_drone.jpg/330px-Garni_temple_2021_drone.jpg",
    caption: "古代ガルニ神殿（アルメニア）",
  },
  CYP: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c2/Lighthouse_Paphos_Cyprus_02.jpg/330px-Lighthouse_Paphos_Cyprus_02.jpg",
    caption: "古代都市パフォスのモザイク（キプロス）",
  },
  RUS: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f1/St_Basils_CathedralR.jpg/330px-St_Basils_CathedralR.jpg",
    caption: "赤の広場の聖ワシリイ大聖堂（ロシア）",
  },
  DEU: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1f/Schwangau_-_Schloss_Neuschwanstein_%28b%29.JPG/330px-Schwangau_-_Schloss_Neuschwanstein_%28b%29.JPG",
    caption: "ノイシュヴァンシュタイン城（ドイツ）",
  },
  FRA: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/85/Tour_Eiffel_Wikimedia_Commons_%28cropped%29.jpg/330px-Tour_Eiffel_Wikimedia_Commons_%28cropped%29.jpg",
    caption: "エッフェル塔（フランス）",
  },
  GBR: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b2/Clock_Tower_-_Palace_of_Westminster%2C_London_-_September_2006-2.jpg/330px-Clock_Tower_-_Palace_of_Westminster%2C_London_-_September_2006-2.jpg",
    caption: "ビッグ・ベンと国会議事堂（イギリス）",
  },
  ITA: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c7/Rom_%28IT%29%2C_Kolosseum_--_2024_--_0610.jpg/330px-Rom_%28IT%29%2C_Kolosseum_--_2024_--_0610.jpg",
    caption: "古代ローマの円形闘技場コロッセオ（イタリア）",
  },
  ESP: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/90/Sagrada_Familia_Test_upload.jpg/330px-Sagrada_Familia_Test_upload.jpg",
    caption: "サグラダ・ファミリア贖罪神殿（スペイン）",
  },
  PRT: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/29/Lisboa_Lisbon_Lissabon.jpg/330px-Lisboa_Lisbon_Lissabon.jpg",
    caption: "テージョ川の貴婦人・ベレンの塔（ポルトガル）",
  },
  NLD: {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/KinderdijkWindmills.jpg/330px-KinderdijkWindmills.jpg",
    caption: "キンデルダイクの伝統風車群（オランダ）",
  },
  BEL: {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/26/Grand-Place%2C_Brussels_-_panorama%2C_June_2018.jpg/330px-Grand-Place%2C_Brussels_-_panorama%2C_June_2018.jpg",
    caption: "壮麗な大広場グラン・プラス（ベルギー）",
  },
  LUX: {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/db/Luxembourg_Grand_Ducal_Palace_01.jpg/330px-Luxembourg_Grand_Ducal_Palace_01.jpg",
    caption: "断崖に築かれた古都ルクセンブルク（ルクセンブルク）",
  },
  IRL: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d1/Cliffs-Of-Moher-OBriens-From-South.JPG/330px-Cliffs-Of-Moher-OBriens-From-South.JPG",
    caption: "大西洋にそびえるモハーの断崖（アイルランド）",
  },
  CHE: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/cf/3818_-_Riffelberg_-_Matterhorn_viewed_from_Gornergratbahn.JPG/330px-3818_-_Riffelberg_-_Matterhorn_viewed_from_Gornergratbahn.JPG",
    caption: "名峰マッターホルン（スイス）",
  },
  AUT: {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/Hallstatt_-_Zentrum_.JPG/330px-Hallstatt_-_Zentrum_.JPG",
    caption: "ハルシュタット湖畔の景観（オーストリア）",
  },
  SWE: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3b/Gamla_Stan_swe.jpg/330px-Gamla_Stan_swe.jpg",
    caption: "ストックホルム旧市街ガムラスタン（スウェーデン）",
  },
  NOR: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ec/Geirangerfjord_from_Flydalsjuvet.jpg/330px-Geirangerfjord_from_Flydalsjuvet.jpg",
    caption: "雄大なガイランゲルフィヨルド（ノルウェー）",
  },
  DNK: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d5/Nyhavn%2C_Copenhagen.jpg/330px-Nyhavn%2C_Copenhagen.jpg",
    caption: "カラフルな運河沿いニューハウン（デンマーク）",
  },
  FIN: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/da/Suomenlinna.jpg/330px-Suomenlinna.jpg",
    caption: "海上要塞スオメンリンナ（フィンランド）",
  },
  ISL: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f7/Skogafoss_from_below.JPG/330px-Skogafoss_from_below.JPG",
    caption: "スコゥガフォスの大滝（アイスランド）",
  },
  POL: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a3/Krakow_Rynek_Glowny_panorama_2.jpg/330px-Krakow_Rynek_Glowny_panorama_2.jpg",
    caption: "クラクフの中央市場広場（ポーランド）",
  },
  CZE: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/20/Prague_07-2016_View_from_Petrinska_Tower_img2.jpg/330px-Prague_07-2016_View_from_Petrinska_Tower_img2.jpg",
    caption: "ヴルタヴァ川のカレル橋とプラハ城（チェコ）",
  },
  SVK: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1a/Spissky_hrad_2007.jpg/330px-Spissky_hrad_2007.jpg",
    caption: "スピシュ城塞群（スロバキア）",
  },
  HUN: {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/Hungarian_Parliament_Building_from_across_the_Danube%2C_2025-01-11.jpg/330px-Hungarian_Parliament_Building_from_across_the_Danube%2C_2025-01-11.jpg",
    caption: "ドナウ川のハンガリー国会議事堂（ハンガリー）",
  },
  GRC: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/da/The_Parthenon_in_Athens.jpg/330px-The_Parthenon_in_Athens.jpg",
    caption: "アクロポリスのパルテノン神殿（ギリシャ）",
  },
  ROU: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/aa/Castelul_Bran.jpg/330px-Castelul_Bran.jpg",
    caption: "ドラキュラ伝説のブラン城（ルーマニア）",
  },
  BGR: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d5/Affreschi_di_Rila_1.jpg/330px-Affreschi_di_Rila_1.jpg",
    caption: "山間に佇むリラ修道院（ブルガリア）",
  },
  ALB: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9a/Berat_Albania.jpg/330px-Berat_Albania.jpg",
    caption: "千の窓の街ベラト（アルバニア）",
  },
  MKD: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/16/Ohridsoeen.jpg/330px-Ohridsoeen.jpg",
    caption: "オフリド湖と聖ヨハネ・カネオ教会（北マケドニア）",
  },
  SRB: {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/P037152-661920_-_Belgrade_fortress_stand_at_the_downtown_of_Belgrade.jpg/330px-P037152-661920_-_Belgrade_fortress_stand_at_the_downtown_of_Belgrade.jpg",
    caption: "サヴァ川を臨むベオグラード要塞（セルビア）",
  },
  HRV: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d2/Dubrovnik_june_2011..JPG/330px-Dubrovnik_june_2011..JPG",
    caption: "アドリア海の真珠ドゥブロヴニク（クロアチア）",
  },
  SVN: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/db/Bled_okt-28-2006-21.JPG/330px-Bled_okt-28-2006-21.JPG",
    caption: "アルプスの瞳・ブレッド湖（スロベニア）",
  },
  BIH: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3b/Mostar_bridge.jpg/330px-Mostar_bridge.jpg",
    caption: "モスタルの歴史的古橋スタリ・モスト（ボスニア・ヘルツェゴビナ）",
  },
  MNE: {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/26/20090719_Crkva_Gospa_od_Zdravlja_Kotor_Bay_Montenegro.jpg/330px-20090719_Crkva_Gospa_od_Zdravlja_Kotor_Bay_Montenegro.jpg",
    caption: "コトル湾のフィヨルド城塞都市（モンテネグロ）",
  },
  XKX: {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d1/Vista_de_Prizren%2C_Kosovo%2C_2014-04-16%2C_DD_15.JPG/330px-Vista_de_Prizren%2C_Kosovo%2C_2014-04-16%2C_DD_15.JPG",
    caption: "山岳に囲まれた古都プリズレンの景観（コソボ）",
  },
  BLR: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/91/%D0%9C%D0%B8%D1%80_%28%D0%B7%D0%B0%D0%BC%D0%BE%D0%BA%29.jpg/330px-%D0%9C%D0%B8%D1%80_%28%D0%B7%D0%B0%D0%BC%D0%BE%D0%BA%29.jpg",
    caption: "ミール城（ベラルーシ）",
  },
  UKR: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/05/St._Sophia%27s.jpg/330px-St._Sophia%27s.jpg",
    caption: "聖ソフィア大聖堂（ウクライナ）",
  },
  MDA: {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Stanca_deasupra_Rautului_Butuceni.jpg/330px-Stanca_deasupra_Rautului_Butuceni.jpg",
    caption: "オルヘイ・ヴェッキの歴史的洞窟修道院（モルドバ）",
  },
  EST: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a8/Tallinn_Overview.JPG/330px-Tallinn_Overview.JPG",
    caption: "タリン旧市街の塔と城壁（エストニア）",
  },
  LVA: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fa/Edificios_en_la_Plaza_del_Mercado%2C_Riga%2C_Letonia%2C_2012-08-07%2C_DD_02.JPG/330px-Edificios_en_la_Plaza_del_Mercado%2C_Riga%2C_Letonia%2C_2012-08-07%2C_DD_02.JPG",
    caption: "リガ旧市街の中世建築群（ラトビア）",
  },
  LTU: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/29/Trakai-Troki.jpg/330px-Trakai-Troki.jpg",
    caption: "ガルヴェ湖に浮かぶトラカイ城（リトアニア）",
  },
  MLT: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b7/St_Sebastian_Curtain_%28cropped%29.jpg/330px-St_Sebastian_Curtain_%28cropped%29.jpg",
    caption: "地中海の要塞都市ヴァレッタ（マルタ）",
  },
  AND: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c9/Refuge_perafita_andorra.jpg/330px-Refuge_perafita_andorra.jpg",
    caption: "ピレネー山脈の氷河渓谷（アンドラ）",
  },
  MCO: {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Monaco_02.jpg/330px-Monaco_02.jpg",
    caption: "地中海に面する絶壁の都市国家モナコ港（モナコ）",
  },
  SMR: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3d/View_of_Mount_Titano_-_San_Marino.jpg/330px-View_of_Mount_Titano_-_San_Marino.jpg",
    caption: "ティターノ山上の城塞グアイタ（サンマリノ）",
  },
  VAT: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/92/Basilica_Sancti_Petri_blue_hour.jpg/330px-Basilica_Sancti_Petri_blue_hour.jpg",
    caption: "カトリック総本山サン・ピエトロ大聖堂（バチカン市国）",
  },
  LIE: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/96/Schloss_Vaduz._Ansicht_von_Nordwesten._2011-05-28_16-55-50.jpg/330px-Schloss_Vaduz._Ansicht_von_Nordwesten._2011-05-28_16-55-50.jpg",
    caption: "ファドゥーツ城とアルプス（リヒテンシュタイン）",
  },
  EGY: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/51/Great_Pyramid_Giza_%282%29.jpg/330px-Great_Pyramid_Giza_%282%29.jpg",
    caption: "ギザの三大ピラミッド（エジプト）",
  },
  ZAF: {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/dc/Table_Mountain_DanieVDM.jpg/330px-Table_Mountain_DanieVDM.jpg",
    caption: "ケープタウンとテーブルマウンテン（南アフリカ）",
  },
  NGA: {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/Zuma_Rock.jpg/330px-Zuma_Rock.jpg",
    caption: "アブジャ郊外の巨石ズマ・ロック（ナイジェリア）",
  },
  KEN: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/bd/Maasai-Mara-Typical-Scenery.JPG/330px-Maasai-Mara-Typical-Scenery.JPG",
    caption: "マサイマラの野生サファリ（ケニア）",
  },
  MAR: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/57/Old_medina_of_morocco.jpg/330px-Old_medina_of_morocco.jpg",
    caption: "青の迷宮都市シャウエン（モロッコ）",
  },
  ETH: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/17/Bete_Giyorgis_Lalibela_Ethiopia.jpg/330px-Bete_Giyorgis_Lalibela_Ethiopia.jpg",
    caption: "岩をくり抜いたラリベラ教会群（エチオピア）",
  },
  GHA: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a6/Elmina_slave_castle.jpg/330px-Elmina_slave_castle.jpg",
    caption: "大西洋岸最古の要塞エルミナ城（ガーナ）",
  },
  DZA: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/da/Algerien_5_0049.jpg/330px-Algerien_5_0049.jpg",
    caption: "先史壁画が残るタッシリ・ナジェール（アルジェリア）",
  },
  TUN: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/65/Tunisie_Sidi_Bousaid_01.jpg/330px-Tunisie_Sidi_Bousaid_01.jpg",
    caption: "地中海を望む青と白の街シディ・ブ・サイド（チュニジア）",
  },
  LBY: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f6/Leptis_Magna_Arch_of_Septimius_Severus.jpg/330px-Leptis_Magna_Arch_of_Septimius_Severus.jpg",
    caption: "保存状態の良い地中海のローマ遺跡（リビア）",
  },
  SDN: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/53/Sudan_Meroe_Pyramids_2001.JPG/330px-Sudan_Meroe_Pyramids_2001.JPG",
    caption: "クシュ王国のメロエ小ピラミッド群（スーダン）",
  },
  SSD: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5d/Sudd_swamp.jpg/330px-Sudd_swamp.jpg",
    caption: "世界最大級の内陸大湿地帯スッド（南スーダン）",
  },
  UGA: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/cc/Bwindi.JPG/330px-Bwindi.JPG",
    caption: "原生林のブウィンディ国立公園（ウガンダ）",
  },
  TZA: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fa/Elephants_at_Amboseli_national_park_against_Mount_Kilimanjaro.jpg/330px-Elephants_at_Amboseli_national_park_against_Mount_Kilimanjaro.jpg",
    caption: "アフリカ最高峰キリマンジャロ（タンザニア）",
  },
  RWA: {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/Mountain_Gorilla_%28Gorilla_beringei_beringei%29.jpg/330px-Mountain_Gorilla_%28Gorilla_beringei_beringei%29.jpg",
    caption: "ヴォルカン国立公園のマウンテンゴリラ（ルワンダ）",
  },
  BDI: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/46/STS51G-034-0012_Lake_Tanganyika_June1985.jpg/330px-STS51G-034-0012_Lake_Tanganyika_June1985.jpg",
    caption: "世界第2位の深さを誇るタンガニーカ湖（ブルンジ）",
  },
  SYC: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/78/NASA_Aldabra_Atoll.jpg/330px-NASA_Aldabra_Atoll.jpg",
    caption: "巨岩と世界最大級のアルダブラ環礁（セーシェル）",
  },
  MDG: {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/Adansonia_grandidieri_Pat_Hooper.jpg/330px-Adansonia_grandidieri_Pat_Hooper.jpg",
    caption: "モロンダバのバオバブ並木道（マダガスカル）",
  },
  MUS: {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Le_Morne_Peninsula_in_Mauritius_%2853697779236%29.jpg/330px-Le_Morne_Peninsula_in_Mauritius_%2853697779236%29.jpg",
    caption: "海にそびえる巨岩ル・モーン・ブラバント（モーリシャス）",
  },
  COM: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/71/Karthala_volcano-Comoros.jpg/330px-Karthala_volcano-Comoros.jpg",
    caption: "グランド・コモロ島の巨大活火山カルタラ（コモロ）",
  },
  ERI: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5a/Asmara%2C_veduta_01.JPG/330px-Asmara%2C_veduta_01.JPG",
    caption: "アール・デコ建築が残る高原都市アスマラ（エリトリア）",
  },
  DJI: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b5/Lake_Assal_NASA.jpg/330px-Lake_Assal_NASA.jpg",
    caption: "アフリカ最低標高の塩湖アッサル湖（ジブチ）",
  },
  SOM: {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Lido_beach_from_the_sea_in_Mogadishu.jpg/330px-Lido_beach_from_the_sea_in_Mogadishu.jpg",
    caption: "インド洋に面する港湾都市モガディシュ（ソマリア）",
  },
  AGO: {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/Kalandula_waterfalls_of_the_Lucala-River_in_Malange%2C_Angola.JPG/330px-Kalandula_waterfalls_of_the_Lucala-River_in_Malange%2C_Angola.JPG",
    caption: "迫力の大瀑布カランドゥーラ滝（アンゴラ）",
  },
  ZMB: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/57/Victoriaf%C3%A4lle.jpg/330px-Victoriaf%C3%A4lle.jpg",
    caption: "ザンベジ川のヴィクトリア滝（ザンビア）",
  },
  ZWE: {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Zimbabwe_great_enclosure.jpg/330px-Zimbabwe_great_enclosure.jpg",
    caption: "石造遺跡グレート・ジンバブエ（ジンバブエ）",
  },
  NAM: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e4/Namib-Naukluft_Sand_Dunes_%282011%29_original.jpg/330px-Namib-Naukluft_Sand_Dunes_%282011%29_original.jpg",
    caption: "世界最古のナミブ砂漠と赤砂丘（ナミビア）",
  },
  BWA: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/61/Okavango11.jpg/330px-Okavango11.jpg",
    caption: "内陸大湿地帯オカバンゴ・デルタ（ボツワナ）",
  },
  MOZ: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3d/Ilha_de_Mo%C3%A7ambique.jpg/330px-Ilha_de_Mo%C3%A7ambique.jpg",
    caption: "歴史的要塞とサンゴ礁モザンビーク島（モザンビーク）",
  },
  MWI: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/05/Lake_Malawi_seen_from_orbit.jpg/330px-Lake_Malawi_seen_from_orbit.jpg",
    caption: "世界遺産マラウイ湖の澄んだ湖水（マラウイ）",
  },
  LSO: {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Maluti_snow.jpg/330px-Maluti_snow.jpg",
    caption: "天空の王国マロティ山脈（レソト）",
  },
  SWZ: {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/Mbabane_%286035476964%29.jpg/330px-Mbabane_%286035476964%29.jpg",
    caption: "エズルウィニ渓谷とムババーネ（エスワティニ）",
  },
  CIV: {
    url: "https://upload.wikimedia.org/wikipedia/en/thumb/0/02/Notre_dame_de_la_paix_yamoussoukro_by_felix_krohn.jpg/330px-Notre_dame_de_la_paix_yamoussoukro_by_felix_krohn.jpg",
    caption: "ヤムスクロの平和の聖母大聖堂（コートジボワール）",
  },
  SEN: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/66/Ile_goree.jpg/330px-Ile_goree.jpg",
    caption: "世界遺産の歴史島ゴレ島（セネガル）",
  },
  MLI: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d7/Djenn%C3%A9.jpg/330px-Djenn%C3%A9.jpg",
    caption: "世界最大の泥造りモスク（マリ）",
  },
  BFA: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ac/2016.05-441-131ap_wall_Lorop%C3%A9ni_Ruins_nr.Lorop%C3%A9ni%28Poni_Prv.%29%2CBF_sun15may2016-1106h.jpg/330px-2016.05-441-131ap_wall_Lorop%C3%A9ni_Ruins_nr.Lorop%C3%A9ni%28Poni_Prv.%29%2CBF_sun15may2016-1106h.jpg",
    caption: "千年を超える巨石要塞ロロペニ（ブルキナファソ）",
  },
  NER: {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Niger%2C_Agadez_%2835%29%2C_auberge_Tellit_and_Grand_Mosque%2C_old_town.jpg/330px-Niger%2C_Agadez_%2835%29%2C_auberge_Tellit_and_Grand_Mosque%2C_old_town.jpg",
    caption: "サハラの門・アガデスの大泥造モスク（ニジェール）",
  },
  GIN: {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Guinea_-_Chutes_de_la_Sala.jpg/330px-Guinea_-_Chutes_de_la_Sala.jpg",
    caption: "フタ・ジャロン高原の滝（ギニア）",
  },
  BEN: {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ac/Ganvi%C3%A9_fishing_village_on_stilts_in_Benin_%2810282059623%29_%282%29.jpg/330px-Ganvi%C3%A9_fishing_village_on_stilts_in_Benin_%2810282059623%29_%282%29.jpg",
    caption: "湖上に広がる水上都市ガンヴィエ（ベナン）",
  },
  TGO: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/65/Togo_Taberma_house_02.jpg/330px-Togo_Taberma_house_02.jpg",
    caption: "泥造りの塔状要塞住宅クタマク（トーゴ）",
  },
  SLE: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f7/Banana_Islands_%28Sierra_Leone%29.jpg/330px-Banana_Islands_%28Sierra_Leone%29.jpg",
    caption: "大西洋の歴史と自然バナナ諸島（シエラレオネ）",
  },
  LBR: {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/Liberia%2C_Africa_-_panoramio_%28256%29.jpg/330px-Liberia%2C_Africa_-_panoramio_%28256%29.jpg",
    caption: "首都モンロビアと大西洋（リベリア）",
  },
  MRT: {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/Chinguetti_old_mosque.jpg/330px-Chinguetti_old_mosque.jpg",
    caption: "砂漠の中の聖都シンゲッティの古モスク（モーリタニア）",
  },
  GMB: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/00/River_gambia_galleryfull.jpg/330px-River_gambia_galleryfull.jpg",
    caption: "ガンビア川の歴史遺産クンタ・キンテ島（ガンビア）",
  },
  GNB: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b6/CaravelaIvybeach1p.jpg/330px-CaravelaIvybeach1p.jpg",
    caption: "マングローブ豊かなビジャゴ諸島（ギニアビサウ）",
  },
  CPV: {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Fogo%2C_Cape_Verde_Islands.jpg/330px-Fogo%2C_Cape_Verde_Islands.jpg",
    caption: "大西洋にそびえるフォゴ火山（カーボベルデ）",
  },
  CMR: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/88/Mount_Cameroon_craters.jpg/330px-Mount_Cameroon_craters.jpg",
    caption: "ギニア湾にそびえる活火山カメルーン山（カメルーン）",
  },
  COD: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/67/Nyiragongo2004.jpg/330px-Nyiragongo2004.jpg",
    caption: "活火山と熱帯雨林ヴィルンガ国立公園（コンゴ民主共和国）",
  },
  COG: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/49/Sunrise_near_Mossaka_%28Congo%29.JPG/330px-Sunrise_near_Mossaka_%28Congo%29.JPG",
    caption: "大河コンゴ川流域の大熱帯雨林（コンゴ共和国）",
  },
  GAB: {
    url: "https://upload.wikimedia.org/wikipedia/commons/8/8d/Lop%C3%A9_National_Park_river_crop.jpg",
    caption: "世界遺産ロペ＝オカンダの原生林とオゴウェ川（ガボン）",
  },
  GNQ: {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Pico_Basil%C3%A9.jpg/330px-Pico_Basil%C3%A9.jpg",
    caption: "ビオコ島最高峰ピコ・バシレ（赤道ギニア）",
  },
  CAF: {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/34/Manovo.jpg/330px-Manovo.jpg",
    caption: "マノヴォ＝グンダ・サン・フロリス国立公園（中央アフリカ）",
  },
  TCD: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2f/Ennedi_Mountains_-_northeastern_Chad_015.jpg/330px-Ennedi_Mountains_-_northeastern_Chad_015.jpg",
    caption: "サハラ砂漠の奇岩アーチ・エネディ山地（チャド）",
  },
  STP: {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/Pico_C%C3%A3o_Grande.jpg/330px-Pico_C%C3%A3o_Grande.jpg",
    caption: "空を突く針状火山峰カオ・グランデ（サントメ・プリンシペ）",
  },
  USA: {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/New_York_City_%28New_York%2C_USA%29%2C_Statue_of_Liberty_--_2012_--_6660.jpg/330px-New_York_City_%28New_York%2C_USA%29%2C_Statue_of_Liberty_--_2012_--_6660.jpg",
    caption: "ニューヨーク港にそびえる自由の女神像（アメリカ）",
  },
  CAN: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c5/Moraine_Lake_17092005.jpg/330px-Moraine_Lake_17092005.jpg",
    caption: "バンフ国立公園のモレーン湖（カナダ）",
  },
  MEX: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7a/Chichen-Itza-Castillo-Seen-From-East.JPG/330px-Chichen-Itza-Castillo-Seen-From-East.JPG",
    caption: "マヤ文明チチェン・イッツァ遺跡（メキシコ）",
  },
  GTM: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9a/Tikal_Giaguaro.jpg/330px-Tikal_Giaguaro.jpg",
    caption: "密林のマヤ大都市ティカル（グアテマラ）",
  },
  BLZ: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/61/Great_Blue_Hole.jpg/330px-Great_Blue_Hole.jpg",
    caption: "カリブ海の神秘グレート・ブルーホール（ベリーズ）",
  },
  SLV: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/35/ES_Joya_Ceren_05_2012_Estructura_9_Area_2_Tamazcal_wide_angle_1479.JPG/330px-ES_Joya_Ceren_05_2012_Estructura_9_Area_2_Tamazcal_wide_angle_1479.JPG",
    caption: "マヤのポンペイ・ホヤ・デ・セレン（エルサルバドル）",
  },
  HND: {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Copan_sculpture.jpg/330px-Copan_sculpture.jpg",
    caption: "マヤ文明コパン遺跡の石彫（ホンジュラス）",
  },
  NIC: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/be/Kathedrale_Leon_2.JPG/330px-Kathedrale_Leon_2.JPG",
    caption: "中央アメリカ最大のレオン大聖堂（ニカラグア）",
  },
  CRI: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5d/Arenal-Volcano.jpg/330px-Arenal-Volcano.jpg",
    caption: "熱帯雨林にそびえるアレナル火山（コスタリカ）",
  },
  PAN: {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Panama_canal_gatun_locks.jpg/330px-Panama_canal_gatun_locks.jpg",
    caption: "大西洋と太平洋を結ぶパナマ運河（パナマ）",
  },
  CUB: {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/Habana_vieja-panoramica.jpg/330px-Habana_vieja-panoramica.jpg",
    caption: "コロニアル建築が並ぶハバナ旧市街（キューバ）",
  },
  BHS: {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/Nassau%2C_Bahamas_aerial_view_%28cropped%29.jpg/330px-Nassau%2C_Bahamas_aerial_view_%28cropped%29.jpg",
    caption: "バハマ諸島の透き通るビーチ（バハマ）",
  },
  JAM: {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bb/Blue_Mountains%2C_Jamaica.jpg/330px-Blue_Mountains%2C_Jamaica.jpg",
    caption: "ブルー・マウンテン山脈の原生林（ジャマイカ）",
  },
  HTI: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/76/Citadelle_Laferri%C3%A8re.jpg/330px-Citadelle_Laferri%C3%A8re.jpg",
    caption: "山頂の巨城シタデル・ラフェリエール（ハイチ）",
  },
  DOM: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b0/Santodomingo_cathedral.jpg/330px-Santodomingo_cathedral.jpg",
    caption: "アメリカ大陸最古のサントドミンゴ旧市街（ドミニカ共和国）",
  },
  KNA: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/cb/BrimstoneHill01.jpg/330px-BrimstoneHill01.jpg",
    caption: "カリブのジブラルタル・ブリムストーンヒル要塞（セントクリストファー・ネイビス）",
  },
  ATG: {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f1/Nelson%27s_Dockyard.jpg/330px-Nelson%27s_Dockyard.jpg",
    caption: "ネルソンズ・ドックヤード（アンティグア・バーブーダ）",
  },
  DMA: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0b/Valley_of_desolation.jpg/330px-Valley_of_desolation.jpg",
    caption: "熱帯雨林のモルヌ・トロワ・ピトン（ドミニカ国）",
  },
  LCA: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ac/Pitonpair.JPG/330px-Pitonpair.JPG",
    caption: "海からそびえ立つ双子の火山ピトン（セントルシア）",
  },
  VCT: {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/Tobagocays2018.jpg/330px-Tobagocays2018.jpg",
    caption: "トバゴ・ケイズの環礁と海洋保護区（セントビンセント・グレナディーン）",
  },
  BRB: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b1/Bridgetown_Promenade.jpg/330px-Bridgetown_Promenade.jpg",
    caption: "ブリッジタウン歴史地区（バルバドス）",
  },
  GRD: {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/St_Georges_Grenada_Fort_-_panoramio.jpg/330px-St_Georges_Grenada_Fort_-_panoramio.jpg",
    caption: "カリブ海の港町セントジョージズ（グレナダ）",
  },
  TTO: {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Pitch_Lake_-_Trinidad.jpg/330px-Pitch_Lake_-_Trinidad.jpg",
    caption: "世界最大の天然アスファルトのピッチ湖（トリニダード・トバゴ）",
  },
  BRA: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/87/Cristo_Redentor_-_Rio_de_Janeiro%2C_Brasil.jpg/330px-Cristo_Redentor_-_Rio_de_Janeiro%2C_Brasil.jpg",
    caption: "リオデジャネイロのキリスト像（ブラジル）",
  },
  ARG: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/01/PeritoMoreno004.jpg/330px-PeritoMoreno004.jpg",
    caption: "パタゴニアのペリト・モレノ大氷河（アルゼンチン）",
  },
  COL: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1d/Montaje_Cartagena%2C_Colombia.jpg/330px-Montaje_Cartagena%2C_Colombia.jpg",
    caption: "カルタヘナの城塞都市（コロンビア）",
  },
  CHL: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/49/Cuernos_del_Paine_from_Lake_Peho%C3%A9.jpg/330px-Cuernos_del_Paine_from_Lake_Peho%C3%A9.jpg",
    caption: "パイネの角峰と青い氷河（チリ）",
  },
  PER: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/62/80_-_Machu_Picchu_-_Juin_2009_-_edit.jpg/330px-80_-_Machu_Picchu_-_Juin_2009_-_edit.jpg",
    caption: "インカの空中都市マチュ・ピチュ（ペルー）",
  },
  VEN: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/de/SaltoAngel4.jpg/330px-SaltoAngel4.jpg",
    caption: "落差世界一のエンジェルフォール（ベネズエラ）",
  },
  ECU: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/77/Galapagos-satellite-esislandnames.jpg/330px-Galapagos-satellite-esislandnames.jpg",
    caption: "固有生物の楽園ガラパゴス諸島（エクアドル）",
  },
  BOL: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/cd/Uyuni_Potosi_Ave_Aerial.jpg/330px-Uyuni_Potosi_Ave_Aerial.jpg",
    caption: "天空を映す鏡・ウユニ塩湖（ボリビア）",
  },
  PRY: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b8/ItaipuAerea2AAL.jpg/330px-ItaipuAerea2AAL.jpg",
    caption: "世界最大級の巨水力イタイプダム（パラグアイ）",
  },
  URY: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c5/Calle_en_Colonia_del_Sacramento.jpg/330px-Calle_en_Colonia_del_Sacramento.jpg",
    caption: "石畳のコロニアル古都コロニア（ウルグアイ）",
  },
  GUY: {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/GuyanaKaieteurFalls2004.jpg/330px-GuyanaKaieteurFalls2004.jpg",
    caption: "ギアナ高地の秘境カイエトゥール滝（ガイアナ）",
  },
  SUR: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/cb/Officiers_Woning_Paramaribo_Suriname.jpg/330px-Officiers_Woning_Paramaribo_Suriname.jpg",
    caption: "木造建築が並ぶ歴史都市パラマリボ（スリナム）",
  },
  AUS: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/92/Sydney_Opera_House_from_Circular_Quay%2C_2023%2C_10.jpg/330px-Sydney_Opera_House_from_Circular_Quay%2C_2023%2C_10.jpg",
    caption: "シドニー・オペラハウス（オーストラリア）",
  },
  NZL: {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/da/Milford_Sound_in_Fiordland_National_Park_01.jpg/330px-Milford_Sound_in_Fiordland_National_Park_01.jpg",
    caption: "氷河が削り出したミルフォード・サウンド（ニュージーランド）",
  },
  PNG: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7a/Kuk_New_Guinea_2002.jpg/330px-Kuk_New_Guinea_2002.jpg",
    caption: "熱帯雨林の高地クックの初期農業遺跡（パプアニューギニア）",
  },
  FJI: {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Bounty_Island_beach_Fiji.jpg/330px-Bounty_Island_beach_Fiji.jpg",
    caption: "珊瑚礁に囲まれたママヌザ諸島（フィジー）",
  },
  SLB: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2c/Dugout_canoe_Rennell.jpg/330px-Dugout_canoe_Rennell.jpg",
    caption: "世界最大の隆起サンゴ環礁・東レンネル（ソロモン諸島）",
  },
  VUT: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/db/Yasur_1.jpg/330px-Yasur_1.jpg",
    caption: "活発なマグマが見られるヤスール火山（バヌアツ）",
  },
  WSM: {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Lalomanu_Beach_-_Samoa.jpg/330px-Lalomanu_Beach_-_Samoa.jpg",
    caption: "ラロマヌ・ビーチのエメラルドの海（サモア）",
  },
  TON: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/dd/Tonga_-_Nuku_and_Fukave_islands%2C_Tongatapu_group.jpg/330px-Tonga_-_Nuku_and_Fukave_islands%2C_Tongatapu_group.jpg",
    caption: "ザトウクジラが訪れるハアパイ諸島（トンガ）",
  },
  KIR: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a0/Kiritimati-EO.jpg/330px-Kiritimati-EO.jpg",
    caption: "世界最大のサンゴ環礁クリスマス島（キリバス）",
  },
  FSM: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b8/Nan_Madol_2.jpg/330px-Nan_Madol_2.jpg",
    caption: "海上に築かれた巨石遺跡ナン・マドール（ミクロネシア連邦）",
  },
  MHL: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f0/Sunset_-_Majuro.jpg/330px-Sunset_-_Majuro.jpg",
    caption: "細長いサンゴ礁の環礁マジュロ（マーシャル諸島）",
  },
  PLW: {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Ngerukewid-2016-aerial-view-Luka-Peternel.jpg/330px-Ngerukewid-2016-aerial-view-Luka-Peternel.jpg",
    caption: "マッシュルーム型の奇島群ロックアイランド（パラオ）",
  },
  NRU: {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/Living_on_a_Blue_Planet_-_Nauru.jpg/330px-Living_on_a_Blue_Planet_-_Nauru.jpg",
    caption: "隆起サンゴ礁の絶景アニバレ湾（ナウル）",
  },
  TUV: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d4/Funafuti_township.jpg/330px-Funafuti_township.jpg",
    caption: "細長い環礁が連なるフナフティ（ツバル）",
  },
  COK: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/35/Aitutaki_Aerial.jpg/330px-Aitutaki_Aerial.jpg",
    caption: "息をのむ美しさのアイツタキラグーン（クック諸島）",
  },
  NIU: {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0d/Main_street_of_Alofi.jpg/330px-Main_street_of_Alofi.jpg",
    caption: "太平洋の孤島ポリネシアの断崖海岸（ニウエ）",
  },
  GRL: {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fc/Icebergs_in_Disko_Bay_off_the_coast_of_Ilulissat_Greenland_03.jpg/330px-Icebergs_in_Disko_Bay_off_the_coast_of_Ilulissat_Greenland_03.jpg",
    caption: "世界遺産イルリサット・ディスコ湾の巨大氷山（グリーンランド）",
  },
  ATA: {
    url: "https://upload.wikimedia.org/wikipedia/commons/b/bd/AntarcticaDomeCSnow.jpg",
    caption: "見渡す限りの白銀が広がる氷原（南極大陸・ドームC）",
  },
};

/**
 * 国の iso3 コードまたは大陸から、その国を象徴する写真を取得する
 */
export function getCountryPhoto(iso3?: string, continent?: string): CountryPhoto {
  if (iso3 && COUNTRY_PHOTOS[iso3]) {
    return COUNTRY_PHOTOS[iso3]!;
  }
  if (continent && CONTINENT_FALLBACKS[continent]) {
    return CONTINENT_FALLBACKS[continent]!;
  }
  return DEFAULT_EARTH_PHOTO;
}
