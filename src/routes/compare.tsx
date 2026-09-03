import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Search, X, RotateCcw, BarChart3 } from "lucide-react";

import { SiteHeader } from "@/components/SiteHeader";
import { FlagImage } from "@/components/FlagImage";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { sortedCountries } from "@/data/lookup";
import { continentLabel, type ContinentId } from "@/data/types";
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
  { id: "population", label: "人口（万人）", unit: "万人" },
  { id: "gdp", label: "GDP（億USドル）", unit: "億USドル" },
  { id: "gdpPerCapita", label: "1人あたりGDP（USドル）", unit: "USドル" },
  { id: "area", label: "面積（km²）", unit: "km²" },
  { id: "spending", label: "軍事費（億USドル）", unit: "億USドル" },
  { id: "troops", label: "兵力（千人）", unit: "千人" },
] as const;

type MetricId = (typeof METRICS)[number]["id"];

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

  const data = selected.map((iso3) => {
    const c = sortedCountries.find((x) => x.iso3 === iso3);
    return {
      name: c ? c.nameJa : iso3,
      value: value(iso3, metric),
    };
  });

  const currentMetric = METRICS.find((m) => m.id === metric)!;

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
              世界198ヵ国すべてから選んで比較可能。最大10ヵ国まで同時に並べてグラフで確認できます。
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

        {/* 比較指標選択ボタン */}
        <div className="mt-5 flex flex-wrap gap-2">
          {METRICS.map((m) => (
            <button
              key={m.id}
              onClick={() => setMetric(m.id)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all shadow-sm",
                metric === m.id
                  ? "border-primary bg-primary text-primary-foreground shadow"
                  : "border-border bg-card text-foreground hover:bg-secondary"
              )}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* グラフ描画エリア（水色系 var(--chart-1)） */}
        <div className="surface-card mt-4 p-4 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold text-muted-foreground">
              {currentMetric.label}の比較グラフ
            </h2>
            <span className="text-xs text-muted-foreground font-medium">単位: {currentMetric.unit}</span>
          </div>
          {selected.length === 0 ? (
            <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
              下の国一覧から比較したい国を選択してください（最大10ヵ国）
            </div>
          ) : (
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 16, right: 16, left: 8, bottom: 32 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis
                    dataKey="name"
                    stroke="#888"
                    fontSize={11}
                    interval={0}
                    angle={data.length > 5 ? -25 : 0}
                    textAnchor={data.length > 5 ? "end" : "middle"}
                  />
                  <YAxis stroke="#888" fontSize={11} width={64} />
                  <Tooltip
                    formatter={(v) => [
                      `${Number(v).toLocaleString("ja-JP")} ${currentMetric.unit}`,
                      currentMetric.label,
                    ]}
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      borderColor: "var(--border)",
                      borderRadius: "8px",
                      fontSize: "12px",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                  />
                  {/* 水色系のバーカラー（var(--chart-1)） */}
                  <Bar
                    dataKey="value"
                    fill="var(--chart-1)"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={60}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* 現在選択中の国バッジ一覧（最大10ヵ国） */}
        {selected.length > 0 && (
          <div className="mt-5 rounded-xl border border-border bg-muted/40 p-3.5">
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
                        ? "border-primary bg-primary text-primary-foreground font-semibold shadow-sm"
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

        {/* 比較データ詳細テーブル */}
        {selected.length > 0 && (
          <div className="mt-8 overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left text-xs text-muted-foreground">
                  <th className="py-3 px-4 font-bold">国名</th>
                  {METRICS.map((m) => (
                    <th
                      key={m.id}
                      className={cn(
                        "py-3 px-3 text-right font-bold whitespace-nowrap",
                        metric === m.id && "text-primary font-extrabold"
                      )}
                    >
                      {m.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {selected.map((iso3) => {
                  const c = sortedCountries.find((x) => x.iso3 === iso3);
                  if (!c) return null;
                  return (
                    <tr key={iso3} className="border-b border-border/60 hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <FlagImage flag={c.flag} size="xs" />
                          <span className="font-semibold">{c.nameJa}</span>
                          <span className="text-xs text-muted-foreground">({continentLabel(c.continent)})</span>
                        </div>
                      </td>
                      {METRICS.map((m) => (
                        <td
                          key={m.id}
                          className={cn(
                            "py-2.5 px-3 text-right tabular-nums",
                            metric === m.id && "font-bold text-foreground bg-primary/5"
                          )}
                        >
                          {value(iso3, m.id).toLocaleString("ja-JP")}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
