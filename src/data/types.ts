export type ContinentId =
  | "asia"
  | "europe"
  | "africa"
  | "north-america"
  | "south-america"
  | "oceania";

export type TimelineItem = {
  year: string;
  event: string;
};

export type QA = {
  q: string;
  a: string;
};

export type Country = {
  /** world-atlas の数値ISOコード（地図データとの紐付けキー） */
  id: string;
  iso3: string;
  nameJa: string;
  nameEn: string;
  flag: string;
  continent: ContinentId;
  basic: {
    capital: string;
    languages: string;
    area: number; // km2
    timeDiffFromJapan: string;
    government: string;
  };
  history: {
    founding: string;
    timeline: TimelineItem[];
    relations: string;
  };
  culture: {
    religion: string;
    tradition: string;
    food: string;
    heritage: string[];
    people: string[];
  };
  society: {
    population: number; // 人
    populationGrowth: number; // %
    urbanRate: number; // %
    medianAge: number; // 歳
    note: string;
  };
  economy: {
    gdp: number; // 億USドル
    gdpPerCapita: number; // USドル
    industries: string[];
    resources: string[];
    trade: string;
  };
  military: {
    spending: number; // 億USドル
    activeTroops: number; // 千人
    alliances: string[];
    organizations: string[];
    note: string;
  };
  geography: {
    climate: string;
    terrain: string;
    disasterRisk: string;
    borders: string;
  };
  examPoints: QA[];
  sources: string[];
};

export const CONTINENTS: { id: ContinentId; label: string; colorVar: string }[] = [
  { id: "asia", label: "アジア", colorVar: "var(--asia)" },
  { id: "europe", label: "ヨーロッパ", colorVar: "var(--europe)" },
  { id: "africa", label: "アフリカ", colorVar: "var(--africa)" },
  { id: "north-america", label: "北アメリカ", colorVar: "var(--north-america)" },
  { id: "south-america", label: "南アメリカ", colorVar: "var(--south-america)" },
  { id: "oceania", label: "オセアニア", colorVar: "var(--oceania)" },
];

export const continentLabel = (id: ContinentId) =>
  CONTINENTS.find((c) => c.id === id)?.label ?? "";
