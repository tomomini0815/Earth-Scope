import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { SiteHeader } from "@/components/SiteHeader";
import { sortedCountries } from "@/data/lookup";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/compare")({
  head: () => ({
    meta: [
      { title: "国データ比較（人口・GDP・面積・軍事費） | GeoQuest" },
      {
        name: "description",
        content: "選んだ国の人口・GDP・1人あたりGDP・面積・軍事費・兵力をグラフで比較。公開統計にもとづくデータで学べます。",
      },
      { property: "og:title", content: "国データ比較 | GeoQuest" },
      { property: "og:description", content: "人口・経済・面積などをグラフで並べて比較できます。" },
    ],
  }),
  component: ComparePage,
});

const METRICS = [
  { id: "population", label: "人口（万人）", get: (i: number) => Math.round(i / 10000) },
  { id: "gdp", label: "GDP（億USドル）" },
  { id: "gdpPerCapita", label: "1人あたりGDP（USドル）" },
  { id: "area", label: "面積（km²）" },
  { id: "spending", label: "軍事費（億USドル）" },
  { id: "troops", label: "兵力（千人）" },
] as const;

type MetricId = (typeof METRICS)[number]["id"];

const value = (iso3: string, metric: MetricId) => {
  const c = sortedCountries.find((x) => x.iso3 === iso3)!;
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

function ComparePage() {
  const [selected, setSelected] = useState<string[]>(["JPN", "USA", "CHN"]);
  const [metric, setMetric] = useState<MetricId>("population");

  const toggle = (iso3: string) =>
    setSelected((s) =>
      s.includes(iso3) ? s.filter((x) => x !== iso3) : s.length >= 5 ? s : [...s, iso3],
    );

  const data = selected.map((iso3) => {
    const c = sortedCountries.find((x) => x.iso3 === iso3)!;
    return { name: `${c.flag} ${c.nameJa}`, value: value(iso3, metric) };
  });

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-6">
        <h1 className="font-display text-2xl font-bold">国データ比較</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          最大5か国まで選べます。数値は公開統計にもとづく概数です。
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {METRICS.map((m) => (
            <button
              key={m.id}
              onClick={() => setMetric(m.id)}
              className={cn(
                "rounded-full border border-border px-3 py-1.5 text-xs font-medium",
                metric === m.id ? "bg-foreground text-background" : "bg-card hover:bg-secondary",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="surface-card mt-4 p-4">
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
                <YAxis tick={{ fontSize: 11 }} width={64} />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => [v.toLocaleString("ja-JP"), METRICS.find((m) => m.id === metric)!.label]}
                />
                <Bar dataKey="value" fill="var(--chart-1)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <h2 className="mt-6 font-display text-lg font-bold">比較する国を選ぶ</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {sortedCountries.map((c) => (
            <button
              key={c.iso3}
              onClick={() => toggle(c.iso3)}
              className={cn(
                "rounded-full border border-border px-3 py-1.5 text-xs",
                selected.includes(c.iso3)
                  ? "bg-primary text-primary-foreground"
                  : "bg-card hover:bg-secondary",
              )}
            >
              {c.flag} {c.nameJa}
            </button>
          ))}
        </div>

        <table className="mt-6 w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="py-2">国</th>
              {METRICS.map((m) => (
                <th key={m.id} className="py-2 text-right">
                  {m.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {selected.map((iso3) => {
              const c = sortedCountries.find((x) => x.iso3 === iso3)!;
              return (
                <tr key={iso3} className="border-b border-border/60">
                  <td className="py-2 whitespace-nowrap">
                    {c.flag} {c.nameJa}
                  </td>
                  {METRICS.map((m) => (
                    <td key={m.id} className="py-2 text-right tabular-nums">
                      {value(iso3, m.id).toLocaleString("ja-JP")}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </main>
    </div>
  );
}
