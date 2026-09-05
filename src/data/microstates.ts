/**
 * world.geo.json (1:110m) ポリゴンに含まれていない小国・島国（全32ヵ国）の座標定義。
 * 地図上でインタラクティブなピン・サークルとして描画するために使用。
 */
export type Microstate = {
  id: string; // 国家ID (byMapId用)
  iso3: string;
  nameJa: string;
  coordinates: [number, number]; // [経度 lon, 緯度 lat]
  zoomTarget?: number;
};

export const MICROSTATES: Microstate[] = [
  // --- アジア (3ヵ国) ---
  { id: "702", iso3: "SGP", nameJa: "シンガポール", coordinates: [103.8198, 1.3521] },
  { id: "462", iso3: "MDV", nameJa: "モルディブ", coordinates: [73.5361, 3.2028] },
  { id: "048", iso3: "BHR", nameJa: "バーレーン", coordinates: [50.5577, 26.0667] },

  // --- ヨーロッパ (7ヵ国) ---
  { id: "383", iso3: "XKX", nameJa: "コソボ", coordinates: [20.9030, 42.6026] },
  { id: "470", iso3: "MLT", nameJa: "マルタ", coordinates: [14.3754, 35.9375] },
  { id: "020", iso3: "AND", nameJa: "アンドラ", coordinates: [1.5218, 42.5063] },
  { id: "492", iso3: "MCO", nameJa: "モナコ", coordinates: [7.4246, 43.7384] },
  { id: "674", iso3: "SMR", nameJa: "サンマリノ", coordinates: [12.4578, 43.9424] },
  { id: "336", iso3: "VAT", nameJa: "バチカン", coordinates: [12.4534, 41.9029] },
  { id: "438", iso3: "LIE", nameJa: "リヒテンシュタイン", coordinates: [9.5209, 47.1660] },

  // --- アフリカ (5ヵ国) ---
  { id: "690", iso3: "SYC", nameJa: "セーシェル", coordinates: [55.4920, -4.6796] },
  { id: "480", iso3: "MUS", nameJa: "モーリシャス", coordinates: [57.5522, -20.3484] },
  { id: "174", iso3: "COM", nameJa: "コモロ", coordinates: [43.3333, -11.6455] },
  { id: "132", iso3: "CPV", nameJa: "カーボベルデ", coordinates: [-23.5133, 14.9330] },
  { id: "678", iso3: "STP", nameJa: "サントメ・プリンシペ", coordinates: [6.6131, 0.1864] },

  // --- 北中米・カリブ海 (7ヵ国) ---
  { id: "659", iso3: "KNA", nameJa: "セントクリストファー・ネービス", coordinates: [-62.7830, 17.3578] },
  { id: "028", iso3: "ATG", nameJa: "アンティグア・バーブーダ", coordinates: [-61.8044, 17.0608] },
  { id: "212", iso3: "DMA", nameJa: "ドミニカ国", coordinates: [-61.3710, 15.4150] },
  { id: "662", iso3: "LCA", nameJa: "セントルシア", coordinates: [-60.9789, 13.9094] },
  { id: "670", iso3: "VCT", nameJa: "セントビンセント・グレナディーン", coordinates: [-61.2872, 13.2528] },
  { id: "052", iso3: "BRB", nameJa: "バルバドス", coordinates: [-59.5432, 13.1939] },
  { id: "308", iso3: "GRD", nameJa: "グレナダ", coordinates: [-61.6042, 12.1165] },

  // --- オセアニア (10ヵ国) ---
  { id: "882", iso3: "WSM", nameJa: "サモア", coordinates: [-172.1046, -13.7590] },
  { id: "776", iso3: "TON", nameJa: "トンガ", coordinates: [-175.1982, -21.1789] },
  { id: "296", iso3: "KIR", nameJa: "キリバス", coordinates: [172.9717, 1.3381] },
  { id: "583", iso3: "FSM", nameJa: "ミクロネシア連邦", coordinates: [158.1560, 6.8874] },
  { id: "584", iso3: "MHL", nameJa: "マーシャル諸島", coordinates: [171.1845, 7.1315] },
  { id: "585", iso3: "PLW", nameJa: "パラオ", coordinates: [134.5444, 7.5150] },
  { id: "520", iso3: "NRU", nameJa: "ナウル", coordinates: [166.9315, -0.5228] },
  { id: "798", iso3: "TUV", nameJa: "ツバル", coordinates: [179.1940, -8.5167] },
  { id: "184", iso3: "COK", nameJa: "クック諸島", coordinates: [-159.7777, -21.2367] },
  { id: "570", iso3: "NIU", nameJa: "ニウエ", coordinates: [-169.8672, -19.0544] },
];

export const microstateById = new Map(MICROSTATES.map((m) => [m.id, m]));
export const microstateByIso3 = new Map(MICROSTATES.map((m) => [m.iso3, m]));
