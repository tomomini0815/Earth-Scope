import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Search, X, RotateCcw, BarChart3, ArrowUpDown, ArrowUp, ArrowDown, HelpCircle } from "lucide-react";

import { SiteHeader } from "@/components/SiteHeader";
import { FlagImage } from "@/components/FlagImage";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { sortedCountries } from "@/data/lookup";
import { continentLabel, type ContinentId, type Country } from "@/data/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/compare")({
  head: () => ({
    meta: [
      { title: "国データ比較（人口・GDP・面積・軍事費） | EarthScope (ES)" },
      {
        name: "description",
        content: "全世界198ヵ国の人口・GDP・1人あたりGDP・面積・軍事費・兵力をグラフで比較。最大10ヵ国まで並べて視覚的に学べます。",
      },
      { property: "og:title", content: "国データ比較 | EarthScope (ES)" },
      { property: "og:description", content: "人口・経済・面積・軍事などを最大10カ国並べてグラフで比較できます。" },
    ],
  }),
  component: ComparePage,
});

const METRICS = [
  { id: "population", label: "人口", shortUnit: "万人", subLabel: "億人・万人" },
  { id: "gdp", label: "名目GDP", shortUnit: "億ドル", subLabel: "兆$・億$" },
  { id: "gdpPerCapita", label: "1人あたりGDP", shortUnit: "USドル", subLabel: "ドル (円換算)" },
  { id: "area", label: "国土面積", shortUnit: "km²", subLabel: "万km² (日本比)" },
  { id: "spending", label: "軍事費", shortUnit: "億ドル", subLabel: "億$ (兆円換算)" },
  { id: "troops", label: "兵力", shortUnit: "千人", subLabel: "万人・千人" },
] as const;

type MetricId = (typeof METRICS)[number]["id"];

interface FormattedMetric {
  main: string;
  sub: string;
  rawValue: number;
}

/** 日本語として直感的に理解できる数値フォーマット関数 */
function formatCountryMetric(country: Country, metricId: MetricId): FormattedMetric {
  switch (metricId) {
    case "population": {
      const pop = country.society.population;
      if (pop >= 100_000_000) {
        const oku = (pop / 100_000_000).toFixed(2);
        const cleanOku = parseFloat(oku).toLocaleString("ja-JP");
        return {
          main: `${cleanOku} 億人`,
          sub: `${Math.round(pop / 10_000).toLocaleString("ja-JP")} 万人`,
          rawValue: pop,
        };
      }
      if (pop >= 10_000) {
        const man = (pop / 10_000).toFixed(1);
        const cleanMan = parseFloat(man).toLocaleString("ja-JP");
        return {
          main: `${cleanMan} 万人`,
          sub: `${pop.toLocaleString("ja-JP")} 人`,
          rawValue: pop,
        };
      }
      return {
        main: `${pop.toLocaleString("ja-JP")} 人`,
        sub: `実数: ${pop.toLocaleString("ja-JP")} 人`,
        rawValue: pop,
      };
    }
    case "gdp": {
      const gdpOku = country.economy.gdp; // 単位: 億USドル
      if (gdpOku >= 10_000) {
        const cho = (gdpOku / 10_000).toFixed(2);
        return {
          main: `約 ${parseFloat(cho).toLocaleString("ja-JP")} 兆ドル`,
          sub: `${gdpOku.toLocaleString("ja-JP")} 億USドル`,
          rawValue: gdpOku,
        };
      }
      if (gdpOku >= 1) {
        return {
          main: `約 ${gdpOku.toLocaleString("ja-JP")} 億ドル`,
          sub: `$${gdpOku.toLocaleString("ja-JP")} 億`,
          rawValue: gdpOku,
        };
      }
      return {
        main: `約 ${Math.round(gdpOku * 100).toLocaleString("ja-JP")} 万ドル`,
        sub: `${gdpOku} 億USドル`,
        rawValue: gdpOku,
      };
    }
    case "gdpPerCapita": {
      const usd = country.economy.gdpPerCapita;
      const yenApprox = Math.round((usd * 150) / 10_000);
      return {
        main: `$${usd.toLocaleString("ja-JP")}`,
        sub: `約 ${yenApprox.toLocaleString("ja-JP")} 万円 (1$=150円換算)`,
        rawValue: usd,
      };
    }
    case "area": {
      const area = country.basic.area;
      const japanArea = 377975;
      const ratio = area / japanArea;
      let ratioText = "";
      if (Math.abs(ratio - 1) < 0.05) {
        ratioText = "日本の約1.0倍";
      } else if (ratio >= 1) {
        ratioText = `日本の約${ratio.toFixed(1)}倍`;
      } else if (ratio >= 0.1) {
        ratioText = `日本の約${(ratio * 10).toFixed(1)}割`;
      } else {
        ratioText = `日本の約1/${Math.round(1 / ratio)}`;
      }

      let main = "";
      if (area >= 10_000) {
        main = `${(area / 10_000).toFixed(1)} 万 km²`;
      } else {
        main = `${area.toLocaleString("ja-JP")} km²`;
      }
      return {
        main,
        sub: `${area.toLocaleString("ja-JP")} km² (${ratioText})`,
        rawValue: area,
      };
    }
    case "spending": {
      const spending = country.military.spending; // 億USドル
      if (spending === 0) {
        return {
          main: "0 ドル",
          sub: "軍隊非保持 / 計上なし",
          rawValue: 0,
        };
      }
      if (spending >= 10_000) {
        const cho = (spending / 10_000).toFixed(2);
        return {
          main: `約 ${parseFloat(cho).toLocaleString("ja-JP")} 兆ドル`,
          sub: `${spending.toLocaleString("ja-JP")} 億USドル`,
          rawValue: spending,
        };
      }
      const yenApproxCho = ((spending * 150) / 10_000).toFixed(1);
      return {
        main: `約 ${spending.toLocaleString("ja-JP")} 億ドル`,
        sub: `${spending.toLocaleString("ja-JP")} 億$ (約${parseFloat(yenApproxCho)}兆円)`,
        rawValue: spending,
      };
    }
    case "troops": {
      const troopsK = country.military.activeTroops; // 千人
      if (troopsK === 0) {
        return {
          main: "0 人",
          sub: "常備軍なし",
          rawValue: 0,
        };
      }
      const actual = troopsK * 1000;
      if (actual >= 10_000) {
        const man = (actual / 10_000).toFixed(1);
        return {
          main: `${parseFloat(man).toLocaleString("ja-JP")} 万人`,
          sub: `${actual.toLocaleString("ja-JP")} 人 (${troopsK.toLocaleString("ja-JP")}千人)`,
          rawValue: actual,
        };
      }
      return {
        main: `${actual.toLocaleString("ja-JP")} 人`,
        sub: `${troopsK.toLocaleString("ja-JP")} 千人`,
        rawValue: actual,
      };
    }
  }
}

const value = (iso3: string, metric: MetricId) => {
  const c = sortedCountries.find((x) => x.iso3 === iso3);
  if (!c) return 0;
  switch (metric) {
    case "population":
      return Math.round(c.society.population / 10000);
    case "gdp":
      return c.economy.gdp;
    case "gdpPerCapita":
      return c.economy.gdpPerCapita;
    case "area":
      return c.basic.area;
    case "spending":
      return c.military.spending;
    case "troops":
      return c.military.activeTroops;
  }
};

const CONTINENT_TABS: { id: ContinentId | "all"; label: string }[] = [
  { id: "all", label: "すべて" },
  { id: "asia", label: "アジア" },
  { id: "europe", label: "ヨーロッパ" },
  { id: "africa", label: "アフリカ" },
  { id: "north-america", label: "北米" },
  { id: "south-america", label: "南米" },
  { id: "oceania", label: "オセアニア" },
];

function ComparePage() {
  const [selected, setSelected] = useState<string[]>(["JPN", "USA", "CHN", "DEU", "GBR"]);
  const [metric, setMetric] = useState<MetricId>("population");
  const [activeContinent, setActiveContinent] = useState<ContinentId | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<{
    key: MetricId | "name";
    direction: "asc" | "desc";
  }>({ key: "population", direction: "desc" });

  const toggle = (iso3: string) => {
    setSelected((s) => {
      if (s.includes(iso3)) {
        return s.filter((x) => x !== iso3);
      }
      if (s.length >= 10) {
        return s; // 最大10カ国
      }
      return [...s, iso3];
    });
  };

  const removeCountry = (iso3: string) => {
    setSelected((s) => s.filter((x) => x !== iso3));
  };

  const clearAll = () => {
    setSelected([]);
  };

  // フィルタリングされた国一覧（検索 + 大陸）
  const filteredCountries = useMemo(() => {
    return sortedCountries.filter((c) => {
      const matchContinent = activeContinent === "all" || c.continent === activeContinent;
      const q = searchQuery.trim().toLowerCase();
      const matchSearch =
        !q ||
        c.nameJa.toLowerCase().includes(q) ||
        c.nameEn.toLowerCase().includes(q) ||
        c.iso3.toLowerCase().includes(q);
      return matchContinent && matchSearch;
    });
  }, [activeContinent, searchQuery]);

  // テーブルソート用の国一覧
  const sortedSelectedCountries = useMemo(() => {
    const list = selected
      .map((iso3) => sortedCountries.find((x) => x.iso3 === iso3))
      .filter(Boolean) as Country[];

    if (!sortConfig) return list;

    return [...list].sort((a, b) => {
      if (sortConfig.key === "name") {
        return sortConfig.direction === "asc"
          ? a.nameJa.localeCompare(b.nameJa, "ja")
          : b.nameJa.localeCompare(a.nameJa, "ja");
      }
      const valA = formatCountryMetric(a, sortConfig.key).rawValue;
      const valB = formatCountryMetric(b, sortConfig.key).rawValue;
      return sortConfig.direction === "asc" ? valA - valB : valB - valA;
    });
  }, [selected, sortConfig]);

  // 各指標の最大値（1位判定 & プログレスバー用）
  const maxValues = useMemo(() => {
    const map: Record<MetricId, number> = {
      population: 0,
      gdp: 0,
      gdpPerCapita: 0,
      area: 0,
      spending: 0,
      troops: 0,
    };
    METRICS.forEach((m) => {
      let max = 0;
      selected.forEach((iso3) => {
        const c = sortedCountries.find((x) => x.iso3 === iso3);
        if (c) {
          const val = formatCountryMetric(c, m.id).rawValue;
          if (val > max) max = val;
        }
      });
      map[m.id] = max;
    });
    return map;
  }, [selected]);

  // グラフ用データ（ソート順に合わせて整列）
  const chartData = useMemo(() => {
    return sortedSelectedCountries.map((c) => ({
      name: c.nameJa,
      iso3: c.iso3,
      value: value(c.iso3, metric),
    }));
  }, [sortedSelectedCountries, metric]);

  const currentMetric = METRICS.find((m) => m.id === metric)!;

  const handleMetricChange = (mId: MetricId) => {
    setMetric(mId);
    setSortConfig({ key: mId, direction: "desc" });
  };

  const handleHeaderClick = (mId: MetricId) => {
    setMetric(mId);
    setSortConfig((prev) => {
      if (prev.key === mId) {
        return { key: mId, direction: prev.direction === "desc" ? "asc" : "desc" };
      }
      return { key: mId, direction: "desc" };
    });
  };

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="size-6 text-primary" /> 国データ統計比較
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              世界198ヵ国すべてから選んで比較可能。最大10ヵ国まで同時に並べてグラフと詳細表で確認できます。
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <span>選択中: {selected.length} / 10ヵ国</span>
            {selected.length > 0 && (
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={clearAll}>
                <RotateCcw className="size-3 mr-1" /> リセット
              </Button>
            )}
          </div>
        </div>

        {/* 比較指標選択ボタン — モバイルでは横スクロールで快適に、デスクトップではラップ */}
        <div className="mt-4 -mx-4 px-4 sm:mx-0 sm:px-0 flex gap-1.5 overflow-x-auto scrollbar-hide sm:flex-wrap pb-1 sm:pb-0">
          {METRICS.map((m) => (
            <button
              key={m.id}
              onClick={() => handleMetricChange(m.id)}
              className={cn(
                "shrink-0 flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all shadow-2xs cursor-pointer whitespace-nowrap",
                metric === m.id
                  ? "border-primary bg-primary text-primary-foreground shadow-xs"
                  : "border-border bg-card text-foreground hover:bg-secondary"
              )}
            >
              <span>{m.label}</span>
              <span className={cn("text-[10px] font-normal opacity-80 hidden sm:inline", metric === m.id ? "text-primary-foreground" : "text-muted-foreground")}>
                ({m.shortUnit})
              </span>
            </button>
          ))}
        </div>

        {/* グラフ描画エリア */}
        <div className="surface-card mt-4 p-3.5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between gap-2 mb-2">
            <h2 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1.5 truncate">
              {currentMetric.label}の比較グラフ
              <span className="text-[11px] font-normal text-muted-foreground hidden sm:inline">（{currentMetric.subLabel}）</span>
            </h2>
            <span className="text-[11px] text-muted-foreground font-medium shrink-0">単位: {currentMetric.shortUnit}</span>
          </div>
          {selected.length === 0 ? (
            <div className="flex h-56 sm:h-72 items-center justify-center text-xs sm:text-sm text-muted-foreground">
              下の国一覧から比較したい国を選択してください（最大10ヵ国）
            </div>
          ) : (
            <div className="h-60 sm:h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 12, right: 12, left: -14, bottom: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis
                    dataKey="name"
                    stroke="#888"
                    fontSize={10}
                    interval={0}
                    angle={-25}
                    textAnchor="end"
                    height={36}
                  />
                  <YAxis
                    stroke="#888"
                    fontSize={10}
                    width={56}
                    tickFormatter={(v) => {
                      if (metric === "population") {
                        if (v >= 10000) return `${(v / 10000).toFixed(1)}億人`;
                        return `${v}万人`;
                      }
                      if (metric === "gdp" || metric === "spending") {
                        if (v >= 10000) return `${(v / 10000).toFixed(1)}兆$`;
                        return `${v}億$`;
                      }
                      if (metric === "area") {
                        if (v >= 10000) return `${(v / 10000).toFixed(1)}万km²`;
                        return `${v}km²`;
                      }
                      if (metric === "troops") {
                        if (v >= 10) return `${(v / 10).toFixed(1)}万人`;
                        return `${v}千人`;
                      }
                      return `$${Number(v).toLocaleString("ja-JP")}`;
                    }}
                  />
                  <Tooltip
                    formatter={(_v, _name, item) => {
                      const payload = item?.payload as { iso3: string; name: string } | undefined;
                      const country = payload ? sortedCountries.find((c) => c.iso3 === payload.iso3) : undefined;
                      if (country) {
                        const f = formatCountryMetric(country, metric);
                        return [`${f.main} （${f.sub}）`, currentMetric.label];
                      }
                      return [`${Number(_v).toLocaleString("ja-JP")} ${currentMetric.shortUnit}`, currentMetric.label];
                    }}
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      borderColor: "var(--border)",
                      borderRadius: "10px",
                      fontSize: "12px",
                      boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                    }}
                  />
                  <Bar
                    dataKey="value"
                    fill="var(--chart-1)"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={52}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* 比較データ詳細テーブル */}
        {selected.length > 0 && (
          <div className="mt-8">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-sm sm:text-base font-bold text-foreground">
                    比較データ詳細テーブル
                  </h2>
                  <span className="text-[10px] sm:text-xs font-normal text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md border border-border/50">
                    日本語単位 ＋ 実数値
                  </span>
                  <span className="text-[10px] font-semibold text-sky-600 dark:text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded-full flex items-center gap-1 sm:hidden">
                    👉 横スクロール（国名固定）
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 hidden sm:block">
                  💡 列ヘッダーをクリックするとその指標で並び替え（昇順・降順）でき、上のグラフとも自動連動します。
                </p>
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-1.5 shrink-0">
                <span>ソート中:</span>
                <span className="font-semibold text-primary">
                  {sortConfig.key === "name"
                    ? "国名"
                    : METRICS.find((m) => m.id === sortConfig.key)?.label}
                </span>
                <span className="rounded bg-primary/10 px-1.5 py-0.5 font-bold text-primary text-[11px]">
                  {sortConfig.direction === "desc" ? "大きい順 ↓" : "小さい順 ↑"}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-xs scrollbar-thin">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/70 text-left text-xs text-muted-foreground">
                    <th
                      onClick={() =>
                        setSortConfig((prev) => ({
                          key: "name",
                          direction: prev.key === "name" && prev.direction === "asc" ? "desc" : "asc",
                        }))
                      }
                      className="sticky left-0 z-20 bg-muted/95 backdrop-blur-xs py-2.5 px-3 sm:px-4 font-bold cursor-pointer select-none hover:text-foreground transition-colors border-r border-border/80 shadow-[2px_0_6px_-2px_rgba(0,0,0,0.12)] min-w-[115px] sm:min-w-[150px]"
                    >
                      <div className="flex items-center gap-1">
                        <span>国名</span>
                        {sortConfig.key === "name" ? (
                          sortConfig.direction === "asc" ? (
                            <ArrowUp className="size-3 text-primary" />
                          ) : (
                            <ArrowDown className="size-3 text-primary" />
                          )
                        ) : (
                          <ArrowUpDown className="size-3 opacity-40" />
                        )}
                      </div>
                    </th>
                    {METRICS.map((m) => {
                      const isSorted = sortConfig.key === m.id;
                      const isCurrentGraph = metric === m.id;
                      return (
                        <th
                          key={m.id}
                          onClick={() => handleHeaderClick(m.id)}
                          className={cn(
                            "py-2.5 px-3 text-right font-bold whitespace-nowrap cursor-pointer select-none transition-colors group min-w-[110px] sm:min-w-[130px]",
                            isCurrentGraph
                              ? "bg-primary/10 text-primary font-extrabold border-x border-primary/20"
                              : "hover:bg-muted hover:text-foreground"
                          )}
                          title="クリックしてこの指標で並び替え & グラフ表示"
                        >
                          <div className="flex flex-col items-end gap-0.5 whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              <span>{m.label}</span>
                              {isSorted ? (
                                sortConfig.direction === "desc" ? (
                                  <ArrowDown className="size-3 text-primary" />
                                ) : (
                                  <ArrowUp className="size-3 text-primary" />
                                )
                              ) : (
                                <ArrowUpDown className="size-3 opacity-30 group-hover:opacity-80" />
                              )}
                            </div>
                            <span
                              className={cn(
                                "text-[10px] font-normal whitespace-nowrap",
                                isCurrentGraph ? "text-primary/80 font-medium" : "text-muted-foreground"
                              )}
                            >
                              [{m.shortUnit}]
                            </span>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {sortedSelectedCountries.map((c) => {
                    return (
                      <tr
                        key={c.iso3}
                        className="border-b border-border/60 hover:bg-muted/30 transition-colors"
                      >
                        <td className="sticky left-0 z-10 bg-card py-2.5 px-3 sm:px-4 border-r border-border/80 shadow-[2px_0_6px_-2px_rgba(0,0,0,0.12)] min-w-[115px] sm:min-w-[150px] whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <FlagImage flag={c.flag} size="xs" />
                            <div className="min-w-0">
                              <div className="font-bold text-xs sm:text-sm leading-tight truncate">{c.nameJa}</div>
                              <div className="text-[10px] text-muted-foreground truncate">
                                <span className="hidden sm:inline">{c.nameEn} ・ </span>
                                {continentLabel(c.continent)}
                              </div>
                            </div>
                          </div>
                        </td>
                        {METRICS.map((m) => {
                          const formatted = formatCountryMetric(c, m.id);
                          const isCurrentGraph = metric === m.id;
                          const isMax =
                            formatted.rawValue > 0 &&
                            formatted.rawValue === maxValues[m.id] &&
                            selected.length > 1;
                          const percent =
                            maxValues[m.id] > 0
                              ? Math.min(100, (formatted.rawValue / maxValues[m.id]) * 100)
                              : 0;

                          return (
                            <td
                              key={m.id}
                              className={cn(
                                "relative py-2 px-3 text-right transition-colors whitespace-nowrap min-w-[110px] sm:min-w-[130px]",
                                isCurrentGraph
                                  ? "bg-primary/5 border-x border-primary/20 font-semibold"
                                  : ""
                              )}
                            >
                              {/* グラフ選択中の列には相対比率バーを表示 */}
                              {isCurrentGraph && (
                                <div
                                  className="absolute bottom-0 right-0 h-1 bg-primary/40 rounded-full transition-all"
                                  style={{ width: `${percent}%` }}
                                />
                              )}
                              <div className="flex flex-col items-end gap-0.5 whitespace-nowrap">
                                <div className="flex items-center gap-1.5 whitespace-nowrap">
                                  {isMax && (
                                    <span
                                      className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shrink-0"
                                      title="選択中の国の中で最大"
                                    >
                                      1位
                                    </span>
                                  )}
                                  <span
                                    className={cn(
                                      "text-xs sm:text-sm font-bold tabular-nums whitespace-nowrap",
                                      isCurrentGraph
                                        ? "text-primary text-[13px] sm:text-[15px]"
                                        : "text-foreground"
                                    )}
                                  >
                                    {formatted.main}
                                  </span>
                                </div>
                                <span className="text-[10px] sm:text-[11px] text-muted-foreground tabular-nums font-normal whitespace-nowrap">
                                  {formatted.sub}
                                </span>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* テーブルフッターの数値ガイド */}
            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground px-1">
              <div className="flex items-center gap-1.5">
                <HelpCircle className="size-3.5" />
                <span>
                  <strong>数値の見方:</strong> 上段は直感的な単位（億人・兆ドル・万km²など）、下段は国際統計・正確な実数および日本との比較目安です。
                </span>
              </div>
              <div>※1ドル＝150円を目安として日本円概算を算出</div>
            </div>
          </div>
        )}

        {/* 現在選択中の国バッジ一覧（最大10ヵ国） */}
        {selected.length > 0 && (
          <div className="mt-8 rounded-xl border border-border bg-muted/40 p-3.5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-muted-foreground">
                選択中の国（クリックで解除・最大10ヵ国）:
              </span>
              <span className="text-xs font-semibold text-primary">{selected.length} / 10</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {selected.map((iso3) => {
                const c = sortedCountries.find((x) => x.iso3 === iso3);
                if (!c) return null;
                return (
                  <button
                    key={iso3}
                    onClick={() => removeCountry(iso3)}
                    className="flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-foreground hover:bg-destructive/15 hover:border-destructive/40 transition-colors group"
                    title={`${c.nameJa}を解除`}
                  >
                    <FlagImage flag={c.flag} size="xs" />
                    <span>{c.nameJa}</span>
                    <X className="size-3 text-muted-foreground group-hover:text-destructive transition-colors" />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 国選択セクション（全198ヵ国から選択可能） */}
        <div className="mt-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold">比較する国を選ぶ</h2>
              <p className="text-xs text-muted-foreground">
                全198ヵ国から自由に選べます。クリックして追加・解除できます。
              </p>
            </div>

            {/* 検索バー */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="国名・地域名で検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* 大陸フィルタータブ */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {CONTINENT_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveContinent(tab.id)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  activeContinent === tab.id
                    ? "border-primary bg-foreground text-background font-semibold"
                    : "border-border bg-card text-foreground hover:bg-secondary"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* 全国の選択ボタングリッド */}
          <div className="mt-3.5 max-h-72 overflow-y-auto rounded-xl border border-border bg-card/60 p-3">
            <div className="flex flex-wrap gap-1.5">
              {filteredCountries.map((c) => {
                const isSelected = selected.includes(c.iso3);
                return (
                  <button
                    key={c.iso3}
                    onClick={() => toggle(c.iso3)}
                    disabled={!isSelected && selected.length >= 10}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-all",
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground font-semibold shadow-xs"
                        : selected.length >= 10
                        ? "border-border/40 bg-muted/40 text-muted-foreground opacity-50 cursor-not-allowed"
                        : "border-border bg-background hover:bg-secondary hover:border-border/80"
                    )}
                  >
                    <FlagImage flag={c.flag} size="xs" />
                    <span>{c.nameJa}</span>
                  </button>
                );
              })}
              {filteredCountries.length === 0 && (
                <p className="py-6 text-center text-xs text-muted-foreground w-full">
                  該当する国が見つかりません。
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
