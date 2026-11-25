import { continentLabel, type Country, type ExamLevel, type QA } from "./types";

export interface ExamLevelMeta {
  id: ExamLevel;
  label: string;
  shortLabel: string;
  subtitle: string;
  badgeClass: string;
  activeTabClass: string;
}

export const EXAM_LEVELS: ExamLevelMeta[] = [
  {
    id: "junior",
    label: "中学受験",
    shortLabel: "中学",
    subtitle: "基礎・重要知識（首都・文化・世界遺産など）",
    badgeClass:
      "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    activeTabClass:
      "bg-emerald-600 text-white border-emerald-600 shadow-2xs",
  },
  {
    id: "high",
    label: "高校受験",
    shortLabel: "高校",
    subtitle: "入試頻出の地理・歴史・産業の重要論点",
    badgeClass:
      "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
    activeTabClass:
      "bg-sky-600 text-white border-sky-600 shadow-2xs",
  },
  {
    id: "university",
    label: "大学受験",
    shortLabel: "大学",
    subtitle: "共通テスト・難関大（統計・経済・地政学・国際関係）",
    badgeClass:
      "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30",
    activeTabClass:
      "bg-purple-600 text-white border-purple-600 shadow-2xs",
  },
];

export const EXAM_LEVEL_MAP: Record<ExamLevel, ExamLevelMeta> = {
  junior: EXAM_LEVELS[0]!,
  high: EXAM_LEVELS[1]!,
  university: EXAM_LEVELS[2]!,
};

const nf = new Intl.NumberFormat("ja-JP");

function isMeaningful(val?: string | null): val is string {
  if (!val) return false;
  const trimmed = val.trim();
  if (!trimmed) return false;
  if (trimmed === "なし" || trimmed === "特になし" || trimmed === "不明" || trimmed === "-") {
    return false;
  }
  return true;
}

function formatPopulationJa(pop: number): string {
  if (pop >= 100_000_000) {
    return `約${(pop / 100_000_000).toFixed(2).replace(/\.?0+$/, "")}億人`;
  }
  if (pop >= 10_000) {
    return `約${nf.format(Math.round(pop / 10_000))}万人`;
  }
  return `約${nf.format(pop)}人`;
}

function formatGdpJa(gdpBillionUsd: number): string {
  if (gdpBillionUsd >= 10_000) {
    return `約${(gdpBillionUsd / 10_000).toFixed(2).replace(/\.?0+$/, "")}兆USドル`;
  }
  return `約${nf.format(gdpBillionUsd)}億USドル`;
}

function getPopulationStageLabel(growth: number, medianAge: number): string {
  if (medianAge >= 42 && growth <= 0.2) {
    return "少子高齢化・人口停滞〜減少局面（つぼ型に近い構造）";
  }
  if (medianAge <= 24 && growth >= 1.5) {
    return "若年層が多い人口急増局面（富士山型・ピラミッド型構造）";
  }
  if (medianAge >= 35) {
    return "高齢化が進行しつつある成熟社会（つりがね型〜つぼ型）";
  }
  return "生産年齢人口が多い成長・転換局面（ピラミッド型〜つりがね型）";
}

function getGdpPerCapitaTier(gdpPerCapita: number): string {
  if (gdpPerCapita >= 40_000) return "高所得の先進国水準（4万ドル以上）";
  if (gdpPerCapita >= 15_000) return "高〜中所得上位水準（1.5万〜4万ドル）";
  if (gdpPerCapita >= 5_000) return "中所得国・新興国水準（5千〜1.5万ドル）";
  return "発展途上・低〜中所得下位水準（5千ドル未満）";
}

/**
 * 中学受験レベル（10問）：小学生〜中学入試で押さえるべき基礎・重要知識
 */
function buildJuniorPoints(c: Country): QA[] {
  const items: QA[] = [];
  const name = c.nameJa;
  const cont = continentLabel(c.continent);

  // 1. 首都
  if (isMeaningful(c.basic.capital)) {
    items.push({
      level: "junior",
      q: `${name}の首都はどこ？`,
      a: c.basic.capital,
    });
  }

  // 2. 所属する州
  if (isMeaningful(cont)) {
    items.push({
      level: "junior",
      q: `${name}は世界の6つの州（大陸）のうち、どこに位置する国？`,
      a: `${cont}州`,
    });
  }

  // 3. 公用語・主な言語
  if (isMeaningful(c.basic.languages)) {
    items.push({
      level: "junior",
      q: `${name}で主に使われている公用語・言語は？`,
      a: c.basic.languages,
    });
  }

  // 4. 日本との時差
  if (isMeaningful(c.basic.timeDiffFromJapan)) {
    items.push({
      level: "junior",
      q: `${name}と日本との時差はどれくらい？`,
      a: c.basic.timeDiffFromJapan,
    });
  }

  // 5. 代表的な食文化
  if (isMeaningful(c.culture.food)) {
    items.push({
      level: "junior",
      q: `${name}を代表する有名な料理・食文化は？`,
      a: c.culture.food,
    });
  }

  // 6. 世界遺産・観光名所
  if (c.culture.heritage && c.culture.heritage.length > 0) {
    items.push({
      level: "junior",
      q: `${name}にある代表的な世界遺産・観光名所は？`,
      a: c.culture.heritage.slice(0, 3).join("、"),
    });
  }

  // 7. 主な宗教
  if (isMeaningful(c.culture.religion)) {
    items.push({
      level: "junior",
      q: `${name}で広く信仰されている主な宗教は？`,
      a: c.culture.religion,
    });
  }

  // 8. 伝統・文化
  if (isMeaningful(c.culture.tradition)) {
    items.push({
      level: "junior",
      q: `${name}に伝わる代表的な伝統文化や風習は？`,
      a: c.culture.tradition,
    });
  }

  // 9. 有名な人物
  if (c.culture.people && c.culture.people.length > 0) {
    items.push({
      level: "junior",
      q: `${name}ゆかりの代表的な歴史上の偉人や著名人は？`,
      a: c.culture.people.slice(0, 3).join("、"),
    });
  }

  // 10. 気候の特色
  if (isMeaningful(c.geography.climate)) {
    items.push({
      level: "junior",
      q: `${name}の主な気候の特色は？`,
      a: c.geography.climate,
    });
  }

  // 補完候補（万一10問未満になった場合）
  const fallbacks: QA[] = [
    {
      level: "junior",
      q: `${name}の国土面積はおよそどれくらい？`,
      a: `約${nf.format(c.basic.area)} km²`,
    },
    {
      level: "junior",
      q: `${name}の総人口はおよそ何人？`,
      a: formatPopulationJa(c.society.population),
    },
    {
      level: "junior",
      q: `${name}の主な産業にはどのようなものがある？`,
      a: c.economy.industries.slice(0, 3).join("、") || "農林水産業・サービス業",
    },
    {
      level: "junior",
      q: `${name}の周囲の海や国境の位置関係は？`,
      a: c.geography.borders,
    },
  ];

  for (const fb of fallbacks) {
    if (items.length >= 10) break;
    if (isMeaningful(fb.a)) {
      items.push(fb);
    }
  }

  return items.slice(0, 10);
}

/**
 * 高校受験レベル（10問）：既存の入試頻出論点（country.examPoints）を中核に構成
 */
function buildHighPoints(c: Country): QA[] {
  const items: QA[] = c.examPoints.slice(0, 10).map((ep) => ({
    q: ep.q,
    a: ep.a,
    level: "high",
  }));

  const name = c.nameJa;
  const fallbacks: QA[] = [
    {
      level: "high",
      q: `${name}の地形的な特徴（山脈・河川・島嶼など）は？`,
      a: c.geography.terrain,
    },
    {
      level: "high",
      q: `${name}の経済を支える主要産業は？`,
      a: c.economy.industries.join("、"),
    },
    {
      level: "high",
      q: `${name}で産出・保有される代表的な天然資源は？`,
      a: c.economy.resources.join("、"),
    },
    {
      level: "high",
      q: `${name}の貿易構造（主な輸出品・輸入品）の特色は？`,
      a: c.economy.trade,
    },
    {
      level: "high",
      q: `${name}で発生しやすい主な自然災害リスクは？`,
      a: c.geography.disasterRisk,
    },
  ];

  for (const fb of fallbacks) {
    if (items.length >= 10) break;
    if (isMeaningful(fb.a) && !items.some((it) => it.q === fb.q)) {
      items.push(fb);
    }
  }

  return items.slice(0, 10);
}

/**
 * 大学受験レベル（10問）：共通テスト（地理総合・地理探究・歴史総合）向けの統計・系統地理・地政学論点
 */
function buildUniversityPoints(c: Country): QA[] {
  const items: QA[] = [];
  const name = c.nameJa;

  // 1. 政治体制・国家形態
  if (isMeaningful(c.basic.government)) {
    items.push({
      level: "university",
      q: `${name}の現行の政治体制（政体・統治機構）の特色は？`,
      a: c.basic.government,
    });
  }

  // 2. GDP規模と1人あたりGDPから見る経済水準
  items.push({
    level: "university",
    q: `${name}の名目GDP規模と1人あたりGDPから読み取れる経済水準は？`,
    a: `GDP ${formatGdpJa(c.economy.gdp)}／1人あたり約${nf.format(c.economy.gdpPerCapita)} USドル（${getGdpPerCapitaTier(c.economy.gdpPerCapita)}）`,
  });

  // 3. 貿易構造と国際分業
  if (isMeaningful(c.economy.trade)) {
    items.push({
      level: "university",
      q: `世界経済における${name}の貿易構造・国際分業上の特色は？`,
      a: c.economy.trade,
    });
  }

  // 4. 基幹産業と資源基盤
  if (c.economy.industries.length > 0 || c.economy.resources.length > 0) {
    const ind = c.economy.industries.slice(0, 3).join("・");
    const res = c.economy.resources.slice(0, 3).join("・");
    items.push({
      level: "university",
      q: `${name}の産業構造を支える基幹産業と主要資源の組み合わせは？`,
      a: [ind && `産業：${ind}`, res && `資源：${res}`].filter(Boolean).join(" ／ "),
    });
  }

  // 5. 人口動態と年齢構造（人口ピラミッド読解）
  items.push({
    level: "university",
    q: `${name}の人口増加率（${c.society.populationGrowth}%）と年齢中位数（${c.society.medianAge}歳）から読み取れる人口構造は？`,
    a: `総人口${formatPopulationJa(c.society.population)}。${getPopulationStageLabel(c.society.populationGrowth, c.society.medianAge)}`,
  });

  // 6. 都市人口率と現代の社会課題
  if (isMeaningful(c.society.note)) {
    items.push({
      level: "university",
      q: `都市人口率${c.society.urbanRate}%の${name}が直面する社会構造上の特徴・課題は？`,
      a: c.society.note,
    });
  }

  // 7. 加盟する国際機関・地域統合
  if (c.military.organizations && c.military.organizations.length > 0) {
    items.push({
      level: "university",
      q: `${name}が加盟している主要な国際機関・地域協力の枠組みは？`,
      a: c.military.organizations.join("、"),
    });
  }

  // 8. 安全保障・地政学的位置づけ
  if (isMeaningful(c.military.note)) {
    const alliances =
      c.military.alliances && c.military.alliances.length > 0
        ? `（主な同盟・枠組み：${c.military.alliances.join("、")}）`
        : "";
    items.push({
      level: "university",
      q: `${name}の安全保障政策および地政学的な特徴は？`,
      a: `${c.military.note}${alliances}`,
    });
  }

  // 9. 歴史的成立過程と近現代の重要転換点
  if (c.history.timeline && c.history.timeline.length >= 2) {
    const keyEvent =
      c.history.timeline[Math.min(3, c.history.timeline.length - 1)] ??
      c.history.timeline[0]!;
    const recentEvent = c.history.timeline[c.history.timeline.length - 1]!;
    const summary =
      keyEvent === recentEvent
        ? `${keyEvent.year}年：${keyEvent.event}`
        : `${keyEvent.year}年「${keyEvent.event}」などを経て、${recentEvent.year}年「${recentEvent.event}」へ至る`;
    items.push({
      level: "university",
      q: `${name}の近現代史における重要な転換点と国家の歩みは？`,
      a: summary,
    });
  } else if (isMeaningful(c.history.founding)) {
    items.push({
      level: "university",
      q: `${name}の国家形成と歴史的成立過程の要点は？`,
      a: c.history.founding,
    });
  }

  // 10. 地形・災害リスク・外交関係（国際関係論）
  if (isMeaningful(c.history.relations)) {
    items.push({
      level: "university",
      q: `日本および国際社会における${name}の外交・国際関係の特色は？`,
      a: c.history.relations,
    });
  }

  // 補完候補（万一10問未満になった場合）
  const fallbacks: QA[] = [
    {
      level: "university",
      q: `${name}の地形条件と自然災害リスクの関連性は？`,
      a: `地形：${c.geography.terrain} ／ 主な災害リスク：${c.geography.disasterRisk}`,
    },
    {
      level: "university",
      q: `${name}の国境環境と地勢上の要点は？`,
      a: c.geography.borders,
    },
    {
      level: "university",
      q: `${name}の国家形成の歴史的背景は？`,
      a: c.history.founding,
    },
  ];

  for (const fb of fallbacks) {
    if (items.length >= 10) break;
    if (isMeaningful(fb.a) && !items.some((it) => it.q === fb.q)) {
      items.push(fb);
    }
  }

  return items.slice(0, 10);
}

const cache = new Map<string, Record<ExamLevel, QA[]>>();

/**
 * 指定した国の受験ポイントを「中学10問・高校10問・大学10問（計30問）」にレベル分けして返す
 */
export function getExamPointsByLevel(country: Country): Record<ExamLevel, QA[]> {
  const cached = cache.get(country.iso3);
  if (cached) return cached;

  const result: Record<ExamLevel, QA[]> = {
    junior: buildJuniorPoints(country),
    high: buildHighPoints(country),
    university: buildUniversityPoints(country),
  };
  cache.set(country.iso3, result);
  return result;
}

/**
 * 指定した国の受験ポイント全30問（中学10 + 高校10 + 大学10）をフラットな配列で返す
 */
export function getAllExamPoints(country: Country): QA[] {
  const byLevel = getExamPointsByLevel(country);
  return [...byLevel.junior, ...byLevel.high, ...byLevel.university];
}
