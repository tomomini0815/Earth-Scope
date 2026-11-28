import { countries } from "@/data/countries";
import type { ContinentId, Country } from "@/data/types";

export interface RankInfo {
  worldRank: number;
  worldTotal: number;
  continentRank: number;
  continentTotal: number;
  /** 0〜100（高いほど上位） */
  percentile: number;
}

export interface PeerCountryBar {
  iso3: string;
  nameJa: string;
  value: number;
  isCurrent: boolean;
}

export interface ShareSlice {
  name: string;
  value: number;
  isCurrent: boolean;
  isOther?: boolean;
}

export interface CountryComputedStats {
  totalCountries: number;
  continentCount: number;

  // 算出値
  populationDensity: number; // 人/km²
  militaryGdpRatio: number; // %
  troopsPer1000: number; // 人口1,000人あたりの現役兵力

  // 世界平均・大陸平均・日本基準
  averages: {
    world: {
      area: number;
      population: number;
      populationDensity: number;
      populationGrowth: number;
      urbanRate: number;
      medianAge: number;
      gdp: number;
      gdpPerCapita: number;
      spending: number;
      activeTroops: number;
      militaryGdpRatio: number;
      troopsPer1000: number;
    };
    continent: {
      area: number;
      population: number;
      populationDensity: number;
      populationGrowth: number;
      urbanRate: number;
      medianAge: number;
      gdp: number;
      gdpPerCapita: number;
      spending: number;
      activeTroops: number;
      militaryGdpRatio: number;
      troopsPer1000: number;
    };
    japan: {
      area: number;
      population: number;
      populationDensity: number;
      populationGrowth: number;
      urbanRate: number;
      medianAge: number;
      gdp: number;
      gdpPerCapita: number;
      spending: number;
      activeTroops: number;
      militaryGdpRatio: number;
      troopsPer1000: number;
    };
  };

  // 順位・パーセンタイル
  ranks: {
    area: RankInfo;
    population: RankInfo;
    populationDensity: RankInfo;
    urbanRate: RankInfo;
    medianAge: RankInfo;
    gdp: RankInfo;
    gdpPerCapita: RankInfo;
    spending: RankInfo;
    activeTroops: RankInfo;
  };

  // シェア (%)
  shares: {
    worldAreaPct: number;
    continentAreaPct: number;
    worldPopPct: number;
    continentPopPct: number;
    worldGdpPct: number;
    continentGdpPct: number;
    worldSpendingPct: number;
  };

  // 総合レーダーチャート用（6軸・パーセンタイル 0〜100）
  radarProfile: {
    axis: string;
    score: number;
    worldAvg: number;
    rankText: string;
  }[];

  // 同大陸内シェア円グラフ用データ
  continentGdpPie: ShareSlice[];
  continentPopPie: ShareSlice[];
  continentAreaPie: ShareSlice[];

  // 同大陸内の近傍ランク国との比較データ（最大5ヵ国：小国でも棒グラフが潰れない）
  peers: {
    area: PeerCountryBar[];
    population: PeerCountryBar[];
    gdp: PeerCountryBar[];
    spending: PeerCountryBar[];
    activeTroops: PeerCountryBar[];
  };
}

function safeDensity(c: Country): number {
  return c.basic.area > 0 ? c.society.population / c.basic.area : 0;
}

function safeMilitaryGdpRatio(c: Country): number {
  if (c.economy.gdp <= 0 || c.military.spending <= 0) return 0;
  return (c.military.spending / c.economy.gdp) * 100;
}

function safeTroopsPer1000(c: Country): number {
  if (c.society.population <= 0 || c.military.activeTroops <= 0) return 0;
  return (c.military.activeTroops * 1000) / (c.society.population / 1000);
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function sum(nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0);
}

// 大陸別グループと全体合計を事前計算
const byContinent = new Map<ContinentId, Country[]>();
for (const c of countries) {
  const arr = byContinent.get(c.continent) ?? [];
  arr.push(c);
  byContinent.set(c.continent, arr);
}

const japanCountry = countries.find((c) => c.iso3 === "JPN") ?? countries[0]!;

const worldTotals = {
  area: sum(countries.map((c) => c.basic.area)),
  population: sum(countries.map((c) => c.society.population)),
  gdp: sum(countries.map((c) => c.economy.gdp)),
  spending: sum(countries.map((c) => c.military.spending)),
};

function computeAverages(list: Country[]) {
  const armed = list.filter((c) => c.military.spending > 0);
  const withTroops = list.filter((c) => c.military.activeTroops > 0);
  return {
    area: Math.round(avg(list.map((c) => c.basic.area))),
    population: Math.round(avg(list.map((c) => c.society.population))),
    // 人口密度の平均は極端な都市国家に引っ張られないよう中央値に近い総人口/総面積（加重平均）を使用
    populationDensity: Math.round(
      sum(list.map((c) => c.society.population)) / Math.max(1, sum(list.map((c) => c.basic.area))),
    ),
    populationGrowth: Number(avg(list.map((c) => c.society.populationGrowth)).toFixed(2)),
    urbanRate: Number(avg(list.map((c) => c.society.urbanRate)).toFixed(1)),
    medianAge: Number(avg(list.map((c) => c.society.medianAge)).toFixed(1)),
    gdp: Math.round(avg(list.map((c) => c.economy.gdp))),
    gdpPerCapita: Math.round(avg(list.map((c) => c.economy.gdpPerCapita))),
    spending: Number(avg(armed.map((c) => c.military.spending)).toFixed(1)),
    activeTroops: Math.round(avg(withTroops.map((c) => c.military.activeTroops))),
    militaryGdpRatio: Number(avg(armed.map(safeMilitaryGdpRatio)).toFixed(2)),
    troopsPer1000: Number(avg(withTroops.map(safeTroopsPer1000)).toFixed(2)),
  };
}

const worldAverages = computeAverages(countries);

const continentAveragesMap = new Map<ContinentId, ReturnType<typeof computeAverages>>();
const continentTotalsMap = new Map<
  ContinentId,
  { area: number; population: number; gdp: number; spending: number }
>();

for (const [continent, list] of byContinent.entries()) {
  continentAveragesMap.set(continent, computeAverages(list));
  continentTotalsMap.set(continent, {
    area: sum(list.map((c) => c.basic.area)),
    population: sum(list.map((c) => c.society.population)),
    gdp: sum(list.map((c) => c.economy.gdp)),
    spending: sum(list.map((c) => c.military.spending)),
  });
}

const japanMetrics = {
  area: japanCountry.basic.area,
  population: japanCountry.society.population,
  populationDensity: Math.round(safeDensity(japanCountry)),
  populationGrowth: japanCountry.society.populationGrowth,
  urbanRate: japanCountry.society.urbanRate,
  medianAge: japanCountry.society.medianAge,
  gdp: japanCountry.economy.gdp,
  gdpPerCapita: japanCountry.economy.gdpPerCapita,
  spending: japanCountry.military.spending,
  activeTroops: japanCountry.military.activeTroops,
  militaryGdpRatio: Number(safeMilitaryGdpRatio(japanCountry).toFixed(2)),
  troopsPer1000: Number(safeTroopsPer1000(japanCountry).toFixed(2)),
};

function buildRankInfo(
  country: Country,
  continentList: Country[],
  getter: (c: Country) => number,
): RankInfo {
  const val = getter(country);
  let worldHigher = 0;
  for (const c of countries) {
    if (getter(c) > val) worldHigher++;
  }
  let continentHigher = 0;
  for (const c of continentList) {
    if (getter(c) > val) continentHigher++;
  }
  const worldRank = worldHigher + 1;
  const continentRank = continentHigher + 1;
  const worldTotal = countries.length;
  const percentile = Math.round(((worldTotal - worldRank) / Math.max(1, worldTotal - 1)) * 100);
  return {
    worldRank,
    worldTotal,
    continentRank,
    continentTotal: continentList.length,
    percentile,
  };
}

/**
 * 同大陸内で対象国を含む最大5ヵ国の近傍ランク比較リストを抽出する
 */
function buildPeerBars(
  country: Country,
  continentList: Country[],
  getter: (c: Country) => number,
  excludeZero = false,
): PeerCountryBar[] {
  const filtered = excludeZero
    ? continentList.filter((c) => getter(c) > 0 || c.iso3 === country.iso3)
    : continentList;
  const sorted = [...filtered].sort((a, b) => getter(b) - getter(a));
  const idx = sorted.findIndex((c) => c.iso3 === country.iso3);
  if (idx === -1) return [];

  const count = Math.min(5, sorted.length);
  let start = Math.max(0, idx - 2);
  if (start + count > sorted.length) {
    start = Math.max(0, sorted.length - count);
  }
  return sorted.slice(start, start + count).map((c) => ({
    iso3: c.iso3,
    nameJa: c.nameJa,
    value: getter(c),
    isCurrent: c.iso3 === country.iso3,
  }));
}

/**
 * 同大陸シェア円グラフ用スライス（上位3〜4ヵ国 + 対象国 + その他）
 */
function buildContinentPie(
  country: Country,
  continentList: Country[],
  getter: (c: Country) => number,
): ShareSlice[] {
  const sorted = [...continentList].sort((a, b) => getter(b) - getter(a));
  const topN = sorted.slice(0, 4);
  const includesCurrent = topN.some((c) => c.iso3 === country.iso3);

  const selected = includesCurrent ? topN : [...sorted.slice(0, 3), country];
  const selectedIso = new Set(selected.map((c) => c.iso3));

  const slices: ShareSlice[] = selected.map((c) => ({
    name: c.nameJa,
    value: getter(c),
    isCurrent: c.iso3 === country.iso3,
  }));

  const otherTotal = sum(
    sorted.filter((c) => !selectedIso.has(c.iso3)).map((c) => getter(c)),
  );
  if (otherTotal > 0) {
    slices.push({
      name: "その他の国々",
      value: otherTotal,
      isCurrent: false,
      isOther: true,
    });
  }
  return slices;
}

const statsCache = new Map<string, CountryComputedStats>();

export function getCountryStats(country: Country): CountryComputedStats {
  const cached = statsCache.get(country.iso3);
  if (cached) return cached;

  const continentList = byContinent.get(country.continent) ?? [country];
  const continentAvg = continentAveragesMap.get(country.continent) ?? worldAverages;
  const continentTotals = continentTotalsMap.get(country.continent) ?? worldTotals;

  const density = safeDensity(country);
  const militaryGdpRatio = Number(safeMilitaryGdpRatio(country).toFixed(2));
  const troopsPer1000 = Number(safeTroopsPer1000(country).toFixed(2));

  const ranks = {
    area: buildRankInfo(country, continentList, (c) => c.basic.area),
    population: buildRankInfo(country, continentList, (c) => c.society.population),
    populationDensity: buildRankInfo(country, continentList, safeDensity),
    urbanRate: buildRankInfo(country, continentList, (c) => c.society.urbanRate),
    medianAge: buildRankInfo(country, continentList, (c) => c.society.medianAge),
    gdp: buildRankInfo(country, continentList, (c) => c.economy.gdp),
    gdpPerCapita: buildRankInfo(country, continentList, (c) => c.economy.gdpPerCapita),
    spending: buildRankInfo(country, continentList, (c) => c.military.spending),
    activeTroops: buildRankInfo(country, continentList, (c) => c.military.activeTroops),
  };

  const pct = (part: number, total: number) =>
    total > 0 ? Number(((part / total) * 100).toFixed(2)) : 0;

  const result: CountryComputedStats = {
    totalCountries: countries.length,
    continentCount: continentList.length,
    populationDensity: Math.round(density),
    militaryGdpRatio,
    troopsPer1000,
    averages: {
      world: worldAverages,
      continent: continentAvg,
      japan: japanMetrics,
    },
    ranks,
    shares: {
      worldAreaPct: pct(country.basic.area, worldTotals.area),
      continentAreaPct: pct(country.basic.area, continentTotals.area),
      worldPopPct: pct(country.society.population, worldTotals.population),
      continentPopPct: pct(country.society.population, continentTotals.population),
      worldGdpPct: pct(country.economy.gdp, worldTotals.gdp),
      continentGdpPct: pct(country.economy.gdp, continentTotals.gdp),
      worldSpendingPct: pct(country.military.spending, worldTotals.spending),
    },
    radarProfile: [
      {
        axis: "国土面積",
        score: ranks.area.percentile,
        worldAvg: 50,
        rankText: `世界 ${ranks.area.worldRank}位`,
      },
      {
        axis: "総人口",
        score: ranks.population.percentile,
        worldAvg: 50,
        rankText: `世界 ${ranks.population.worldRank}位`,
      },
      {
        axis: "人口密度",
        score: ranks.populationDensity.percentile,
        worldAvg: 50,
        rankText: `世界 ${ranks.populationDensity.worldRank}位`,
      },
      {
        axis: "名目GDP",
        score: ranks.gdp.percentile,
        worldAvg: 50,
        rankText: `世界 ${ranks.gdp.worldRank}位`,
      },
      {
        axis: "1人あたりGDP",
        score: ranks.gdpPerCapita.percentile,
        worldAvg: 50,
        rankText: `世界 ${ranks.gdpPerCapita.worldRank}位`,
      },
      {
        axis: "都市化率",
        score: ranks.urbanRate.percentile,
        worldAvg: 50,
        rankText: `世界 ${ranks.urbanRate.worldRank}位`,
      },
    ],
    continentGdpPie: buildContinentPie(country, continentList, (c) => c.economy.gdp),
    continentPopPie: buildContinentPie(country, continentList, (c) => c.society.population),
    continentAreaPie: buildContinentPie(country, continentList, (c) => c.basic.area),
    peers: {
      area: buildPeerBars(country, continentList, (c) => c.basic.area),
      population: buildPeerBars(country, continentList, (c) => c.society.population),
      gdp: buildPeerBars(country, continentList, (c) => c.economy.gdp),
      spending: buildPeerBars(country, continentList, (c) => c.military.spending, true),
      activeTroops: buildPeerBars(country, continentList, (c) => c.military.activeTroops, true),
    },
  };

  statsCache.set(country.iso3, result);
  return result;
}
