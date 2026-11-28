import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Award,
  BarChart3,
  Building2,
  Coins,
  Compass,
  Globe,
  Hourglass,
  PieChart as PieChartIcon,
  Radar as RadarIcon,
  Shield,
  TrendingUp,
  Users,
} from "lucide-react";

import { continentLabel, type Country } from "@/data/types";
import type { CountryComputedStats, PeerCountryBar, ShareSlice } from "@/data/countryStats";
import { GDP_GROWTH_FORECAST_YEAR, getGdpGrowthSeries } from "@/data/gdpGrowthHistory";
import { cn } from "@/lib/utils";

const nf = new Intl.NumberFormat("ja-JP");

/** SSR環境でのResponsiveContainer警告・ハイドレーションズレを防ぐフック */
function useIsMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return mounted;
}

function ChartBox({
  icon: Icon,
  title,
  subtitle,
  badge,
  children,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string | undefined;
  badge?: string | undefined;
  children: React.ReactNode;
  className?: string | undefined;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/80 bg-card p-3.5 sm:p-5 shadow-xs flex flex-col justify-start gap-2.5 sm:gap-3 min-w-0",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2 border-b border-border/60 pb-2.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-1.5 sm:gap-2">
            <Icon className="size-4 text-sky-500 shrink-0 mt-0.5" />
            <h3 className="font-display text-sm sm:text-base font-bold text-foreground leading-snug">
              {title}
            </h3>
          </div>
          {subtitle && (
            <p className="mt-1 text-[11px] sm:text-xs text-muted-foreground leading-snug">
              {subtitle}
            </p>
          )}
        </div>
        {badge && (
          <span className="shrink-0 whitespace-nowrap rounded-full bg-sky-500/10 px-2 sm:px-2.5 py-0.5 text-[10px] sm:text-[11px] font-bold text-sky-600 dark:text-sky-400">
            {badge}
          </span>
        )}
      </div>
      <div className="flex flex-col justify-start min-w-0">{children}</div>
    </div>
  );
}

function ChartPlaceholder({ height }: { height: number }) {
  return (
    <div
      style={{ height }}
      className="w-full rounded-xl bg-muted/40 animate-pulse flex items-center justify-center text-xs text-muted-foreground"
    >
      グラフを読み込み中…
    </div>
  );
}

const tooltipStyle: React.CSSProperties = {
  backgroundColor: "var(--card)",
  borderColor: "var(--border)",
  borderRadius: "10px",
  fontSize: "12px",
  color: "var(--foreground)",
  boxShadow: "0 8px 24px -8px rgba(0, 0, 0, 0.25)",
};

const tooltipItemStyle: React.CSSProperties = {
  color: "var(--foreground)",
  fontWeight: 600,
};

/** 数値の簡潔なフォーマット */
export function formatCompactPop(pop: number): string {
  if (pop >= 100_000_000) return `${(pop / 100_000_000).toFixed(2)}億人`;
  if (pop >= 10_000) return `${Math.round(pop / 10_000).toLocaleString("ja-JP")}万人`;
  return `${nf.format(pop)}人`;
}

export function formatCompactGdp(gdpOku: number): string {
  if (gdpOku >= 10_000) return `${(gdpOku / 10_000).toFixed(2)}兆$`;
  if (gdpOku >= 1) return `${nf.format(Math.round(gdpOku))}億$`;
  return `${nf.format(Math.round(gdpOku * 100))}万$`;
}

export function formatCompactArea(area: number): string {
  if (area >= 10_000) return `${(area / 10_000).toFixed(1)}万km²`;
  return `${nf.format(area)}km²`;
}

/* ============================================================================
 * 1. 基本タブ用：6軸レーダーチャート & 世界順位ポジションバー
 * ========================================================================== */

export function CountryProfileRadar({
  country,
  stats,
  isPreview,
}: {
  country: Country;
  stats: CountryComputedStats;
  isPreview?: boolean | undefined;
}) {
  const mounted = useIsMounted();
  return (
    <ChartBox
      icon={RadarIcon}
      title="国の規模・特徴プロフィール"
      subtitle="全198ヵ国中の相対位置（パーセンタイル 0〜100、点線＝世界中央値50）"
      badge="6軸レーダー"
    >
      {mounted ? (
        <div className="h-[250px] sm:h-[270px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={stats.radarProfile} outerRadius="72%">
              <PolarGrid stroke="var(--border)" />
              <PolarAngleAxis
                dataKey="axis"
                tick={{ fill: "var(--foreground)", fontSize: 11, fontWeight: 600 }}
              />
              <PolarRadiusAxis
                angle={30}
                domain={[0, 100]}
                tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                tickCount={4}
              />
              <Radar
                name="世界中央値"
                dataKey="worldAvg"
                stroke="#94a3b8"
                strokeDasharray="4 4"
                fill="#94a3b8"
                fillOpacity={0.08}
                isAnimationActive={false}
              />
              <Radar
                name={country.nameJa}
                dataKey="score"
                stroke="#0ea5e9"
                strokeWidth={2.5}
                fill="#0ea5e9"
                fillOpacity={0.28}
                isAnimationActive={!isPreview}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                itemStyle={tooltipItemStyle}
                formatter={(value: unknown, name: string, item: { payload?: { rankText?: string } }) => {
                  if (name === "世界中央値") return ["50（中央値）", name];
                  const rank = item?.payload?.rankText ? `（${item.payload.rankText}）` : "";
                  return [`上位 ${Math.max(1, 100 - Number(value))}% ${rank}`, name];
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <ChartPlaceholder height={260} />
      )}
    </ChartBox>
  );
}

export function WorldRankBars({
  country,
  stats,
}: {
  country: Country;
  stats: CountryComputedStats;
}) {
  const cLabel = continentLabel(country.continent);
  const rows = [
    {
      label: "国土面積",
      valueText: formatCompactArea(country.basic.area),
      rank: stats.ranks.area,
      barColor: "bg-emerald-500",
    },
    {
      label: "総人口",
      valueText: formatCompactPop(country.society.population),
      rank: stats.ranks.population,
      barColor: "bg-sky-500",
    },
    {
      label: "人口密度",
      valueText: `${nf.format(stats.populationDensity)} 人/km²`,
      rank: stats.ranks.populationDensity,
      barColor: "bg-cyan-500",
    },
    {
      label: "名目GDP",
      valueText: formatCompactGdp(country.economy.gdp),
      rank: stats.ranks.gdp,
      barColor: "bg-amber-500",
    },
    {
      label: "1人あたりGDP",
      valueText: `$${nf.format(country.economy.gdpPerCapita)}`,
      rank: stats.ranks.gdpPerCapita,
      barColor: "bg-violet-500",
    },
  ];

  return (
    <ChartBox
      icon={Award}
      title="主要指標の世界ランキング位置"
      subtitle={`全${stats.totalCountries}ヵ国および${cLabel}（${stats.continentCount}ヵ国）内での順位`}
      badge="世界順位"
    >
      <div className="space-y-3 py-1">
        {rows.map((row) => (
          <div key={row.label} className="space-y-1">
            <div className="flex items-baseline justify-between gap-2 text-xs">
              <span className="font-semibold text-foreground">{row.label}</span>
              <div className="flex items-center gap-2 text-right">
                <span className="font-mono font-bold text-foreground">{row.valueText}</span>
                <span className="rounded bg-secondary px-1.5 py-0.5 text-[11px] font-bold text-foreground">
                  世界 {row.rank.worldRank}位
                </span>
                <span className="hidden sm:inline text-[11px] text-muted-foreground">
                  ({cLabel} {row.rank.continentRank}位)
                </span>
              </div>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full transition-all duration-500", row.barColor)}
                style={{ width: `${Math.max(4, row.rank.percentile)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </ChartBox>
  );
}

/* ============================================================================
 * 2. 汎用：同大陸シェア円グラフ（ドーナツ） & 近傍ランク比較横棒グラフ
 * ========================================================================== */

const PIE_PALETTE = ["#38bdf8", "#a78bfa", "#34d399", "#fbbf24"];
const CURRENT_COLOR = "#0284c7";
const OTHER_COLOR = "#94a3b8";

export function ContinentSharePieChart({
  title,
  subtitle,
  slices,
  sharePct,
  unitFormatter,
  isPreview,
  accentColor = CURRENT_COLOR,
}: {
  title: string;
  subtitle: string;
  slices: ShareSlice[];
  sharePct: number;
  unitFormatter: (v: number) => string;
  isPreview?: boolean | undefined;
  accentColor?: string;
}) {
  const mounted = useIsMounted();
  let paletteIdx = 0;
  const coloredSlices = slices.map((s) => {
    if (s.isCurrent) return { ...s, color: accentColor };
    if (s.isOther) return { ...s, color: OTHER_COLOR };
    const color = PIE_PALETTE[paletteIdx % PIE_PALETTE.length]!;
    paletteIdx++;
    return { ...s, color };
  });

  const shareText = sharePct >= 1 ? `${sharePct.toFixed(1)}%` : sharePct >= 0.05 ? `${sharePct.toFixed(2)}%` : "<0.1%";

  return (
    <ChartBox
      icon={PieChartIcon}
      title={title}
      subtitle={subtitle}
      badge={`シェア ${shareText}`}
    >
      <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] items-center gap-3">
        {mounted ? (
          <div className="relative h-[168px] sm:h-[180px] w-full max-w-[190px] mx-auto">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={coloredSlices}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={76}
                  paddingAngle={2}
                  stroke="var(--card)"
                  strokeWidth={2}
                  isAnimationActive={!isPreview}
                >
                  {coloredSlices.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipStyle}
                  itemStyle={tooltipItemStyle}
                  formatter={(val: unknown) => [unitFormatter(Number(val)), ""]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-[10px] font-medium text-muted-foreground">大陸内シェア</span>
              <span className="font-display text-lg font-extrabold text-foreground leading-tight">
                {shareText}
              </span>
            </div>
          </div>
        ) : (
          <ChartPlaceholder height={180} />
        )}

        <div className="space-y-1.5 text-xs">
          {coloredSlices.map((s) => (
            <div
              key={s.name}
              className={cn(
                "flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5",
                s.isCurrent ? "bg-sky-500/10 font-bold text-foreground ring-1 ring-sky-500/30" : "bg-muted/40",
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="size-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: s.color }}
                />
                <span className="leading-snug">{s.name}</span>
              </div>
              <span className="font-mono text-[11px] shrink-0 text-muted-foreground">
                {unitFormatter(s.value)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </ChartBox>
  );
}

export function PeerRankBarChart({
  icon = BarChart3,
  title,
  subtitle,
  badge,
  peers,
  unitFormatter,
  tickFormatter,
  accentColor = "#0ea5e9",
  isPreview,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  badge?: string;
  peers: PeerCountryBar[];
  unitFormatter: (v: number) => string;
  tickFormatter?: (v: number) => string;
  accentColor?: string;
  isPreview?: boolean | undefined;
  className?: string;
}) {
  const mounted = useIsMounted();

  return (
    <ChartBox icon={icon} title={title} subtitle={subtitle} badge={badge} className={className}>
      {mounted ? (
        <div className="h-[205px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={peers}
              layout="vertical"
              margin={{ top: 4, right: 16, left: 6, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
              <XAxis
                type="number"
                tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                tickFormatter={tickFormatter ?? unitFormatter}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="nameJa"
                width={84}
                tick={{ fill: "var(--foreground)", fontSize: 11, fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: "var(--muted)", opacity: 0.45 }}
                contentStyle={tooltipStyle}
                itemStyle={tooltipItemStyle}
                formatter={(val: unknown) => [unitFormatter(Number(val)), ""]}
              />
              <Bar
                dataKey="value"
                radius={[0, 6, 6, 0]}
                barSize={20}
                isAnimationActive={!isPreview}
              >
                {peers.map((entry) => (
                  <Cell
                    key={entry.iso3}
                    fill={entry.isCurrent ? accentColor : "#94a3b8"}
                    fillOpacity={entry.isCurrent ? 1 : 0.45}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <ChartPlaceholder height={205} />
      )}
    </ChartBox>
  );
}

/* ============================================================================
 * 3. 人口・社会タブ用：都市/農村ドーナツ、年齢中位数バー、人口増加率バー
 * ========================================================================== */

export function UrbanRuralDonutChart({
  country,
  stats,
  isPreview,
}: {
  country: Country;
  stats: CountryComputedStats;
  isPreview?: boolean | undefined;
}) {
  const mounted = useIsMounted();
  const urban = Math.min(100, Math.max(0, country.society.urbanRate));
  const rural = Math.max(0, Number((100 - urban).toFixed(1)));
  const worldAvg = stats.averages.world.urbanRate;
  const diff = Number((urban - worldAvg).toFixed(1));

  const data = [
    { name: "都市部人口", value: urban, color: "#0ea5e9" },
    { name: "農村・非都市部", value: rural, color: "#22c55e" },
  ];

  return (
    <ChartBox
      icon={Building2}
      title="都市部 vs 農村部の人口構成"
      subtitle={`世界平均 ${worldAvg}%（世界平均より ${diff >= 0 ? `+${diff}` : diff}pt）`}
      badge={`世界 ${stats.ranks.urbanRate.worldRank}位`}
    >
      <div className="grid grid-cols-1 sm:grid-cols-[170px_1fr] items-center gap-3">
        {mounted ? (
          <div className="relative h-[170px] w-full max-w-[180px] mx-auto">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={72}
                  startAngle={90}
                  endAngle={-270}
                  stroke="var(--card)"
                  strokeWidth={2}
                  isAnimationActive={!isPreview}
                >
                  {data.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipStyle}
                  itemStyle={tooltipItemStyle}
                  formatter={(v: unknown) => [`${v}%`, ""]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[10px] text-muted-foreground">都市化率</span>
              <span className="font-display text-xl font-extrabold text-sky-600 dark:text-sky-400">
                {urban}%
              </span>
            </div>
          </div>
        ) : (
          <ChartPlaceholder height={170} />
        )}

        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between rounded-lg bg-sky-500/10 px-3 py-2">
            <span className="flex items-center gap-2 font-semibold">
              <span className="size-2.5 rounded-full bg-sky-500" />
              都市部
            </span>
            <span className="font-mono font-bold text-sky-600 dark:text-sky-400">{urban}%</span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-emerald-500/10 px-3 py-2">
            <span className="flex items-center gap-2 font-semibold">
              <span className="size-2.5 rounded-full bg-emerald-500" />
              農村・非都市部
            </span>
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
              {rural}%
            </span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-1.5 text-[11px] text-muted-foreground">
            <span>日本参考値</span>
            <span className="font-mono font-semibold">{stats.averages.japan.urbanRate}%</span>
          </div>
        </div>
      </div>
    </ChartBox>
  );
}

export function MedianAgeBarChart({
  country,
  stats,
  isPreview,
}: {
  country: Country;
  stats: CountryComputedStats;
  isPreview?: boolean | undefined;
}) {
  const mounted = useIsMounted();
  const cLabel = continentLabel(country.continent);
  const age = country.society.medianAge;

  const stage =
    age >= 45
      ? "超高齢社会"
      : age >= 38
        ? "高齢社会"
        : age >= 28
          ? "成熟社会"
          : "若年人口国";

  const rows = [
    { name: country.nameJa, value: age, color: "#8b5cf6", isCurrent: true },
    { name: `${cLabel}平均`, value: stats.averages.continent.medianAge, color: "#64748b", isCurrent: false },
    { name: "世界平均", value: stats.averages.world.medianAge, color: "#94a3b8", isCurrent: false },
    ...(country.iso3 !== "JPN"
      ? [{ name: "日本", value: stats.averages.japan.medianAge, color: "#f43f5e", isCurrent: false }]
      : []),
  ];

  return (
    <ChartBox
      icon={Hourglass}
      title="年齢の中位数 比較"
      subtitle="国民の年齢構成の若さ・高齢化の目安（単位：歳）"
      badge={stage}
    >
      {mounted ? (
        <div className="h-[185px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={rows}
              layout="vertical"
              margin={{ top: 4, right: 18, left: 4, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
              <XAxis
                type="number"
                domain={[0, 60]}
                tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                tickFormatter={(v) => `${v}歳`}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={82}
                tick={{ fill: "var(--foreground)", fontSize: 11, fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: "var(--muted)", opacity: 0.45 }}
                contentStyle={tooltipStyle}
                itemStyle={tooltipItemStyle}
                formatter={(v: unknown) => [`${v} 歳`, "年齢の中位数"]}
              />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={20} isAnimationActive={!isPreview}>
                {rows.map((r) => (
                  <Cell key={r.name} fill={r.color} fillOpacity={r.isCurrent ? 1 : 0.72} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <ChartPlaceholder height={185} />
      )}
    </ChartBox>
  );
}

export function PopulationGrowthBarChart({
  country,
  stats,
  isPreview,
}: {
  country: Country;
  stats: CountryComputedStats;
  isPreview?: boolean | undefined;
}) {
  const mounted = useIsMounted();
  const cLabel = continentLabel(country.continent);
  const g = country.society.populationGrowth;

  const rows = [
    { name: country.nameJa, value: g, isCurrent: true },
    { name: `${cLabel}平均`, value: stats.averages.continent.populationGrowth, isCurrent: false },
    { name: "世界平均", value: stats.averages.world.populationGrowth, isCurrent: false },
    ...(country.iso3 !== "JPN"
      ? [{ name: "日本", value: stats.averages.japan.populationGrowth, isCurrent: false }]
      : []),
  ];

  const maxAbs = Math.max(2, ...rows.map((r) => Math.abs(r.value)));
  const bound = Math.ceil(maxAbs * 10) / 10;

  return (
    <ChartBox
      icon={TrendingUp}
      title="年間人口増加率の比較"
      subtitle="0%を基準にした増減トレンド（＋増加／－減少）"
      badge={`${g > 0 ? `+${g}` : g}% / 年`}
    >
      {mounted ? (
        <div className="h-[195px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 10, right: 12, left: -12, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="name"
                tick={{ fill: "var(--foreground)", fontSize: 11, fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[-Math.max(1, bound * 0.6), bound]}
                tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                tickFormatter={(v) => `${v}%`}
                axisLine={false}
                tickLine={false}
              />
              <ReferenceLine y={0} stroke="var(--foreground)" strokeOpacity={0.4} strokeWidth={1.5} />
              <Tooltip
                cursor={{ fill: "var(--muted)", opacity: 0.45 }}
                contentStyle={tooltipStyle}
                itemStyle={tooltipItemStyle}
                formatter={(v: unknown) => {
                  const num = Number(v);
                  return [`${num > 0 ? `+${num}` : num} %`, "年間増加率"];
                }}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={32} isAnimationActive={!isPreview}>
                {rows.map((r) => {
                  const fill = r.isCurrent
                    ? r.value >= 0
                      ? "#10b981"
                      : "#f43f5e"
                    : r.value >= 0
                      ? "#64748b"
                      : "#fb7185";
                  return (
                    <Cell key={r.name} fill={fill} fillOpacity={r.isCurrent ? 1 : 0.65} />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <ChartPlaceholder height={195} />
      )}
    </ChartBox>
  );
}

/* ============================================================================
 * 4. 経済タブ用：1人あたりGDP比較棒グラフ & 所得水準ゲージ
 * ========================================================================== */

export function GdpPerCapitaComparisonChart({
  country,
  stats,
  isPreview,
}: {
  country: Country;
  stats: CountryComputedStats;
  isPreview?: boolean | undefined;
}) {
  const mounted = useIsMounted();
  const cLabel = continentLabel(country.continent);
  const val = country.economy.gdpPerCapita;

  const tier =
    val >= 14000
      ? { label: "高所得国水準", color: "text-emerald-600 dark:text-emerald-400" }
      : val >= 4500
        ? { label: "上位中所得国水準", color: "text-sky-600 dark:text-sky-400" }
        : val >= 1150
          ? { label: "下位中所得国水準", color: "text-amber-600 dark:text-amber-400" }
          : { label: "低所得国水準", color: "text-rose-600 dark:text-rose-400" };

  const rows = [
    { name: country.nameJa, value: val, color: "#0ea5e9", isCurrent: true },
    { name: `${cLabel}平均`, value: stats.averages.continent.gdpPerCapita, color: "#64748b", isCurrent: false },
    { name: "世界平均", value: stats.averages.world.gdpPerCapita, color: "#94a3b8", isCurrent: false },
    ...(country.iso3 !== "JPN"
      ? [{ name: "日本", value: stats.averages.japan.gdpPerCapita, color: "#f59e0b", isCurrent: false }]
      : []),
  ];

  return (
    <ChartBox
      icon={Coins}
      title="1人あたりGDP（所得水準）の比較"
      subtitle={`世界 ${stats.ranks.gdpPerCapita.worldRank}位 / ${stats.totalCountries}ヵ国（${tier.label}）`}
      badge={`$${nf.format(val)}`}
    >
      {mounted ? (
        <div className="h-[195px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={rows}
              layout="vertical"
              margin={{ top: 4, right: 20, left: 4, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
              <XAxis
                type="number"
                tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                tickFormatter={(v) => (v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${v}`)}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={82}
                tick={{ fill: "var(--foreground)", fontSize: 11, fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: "var(--muted)", opacity: 0.45 }}
                contentStyle={tooltipStyle}
                itemStyle={tooltipItemStyle}
                formatter={(v: unknown) => [`$${nf.format(Number(v))} / 年`, "1人あたりGDP"]}
              />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={22} isAnimationActive={!isPreview}>
                {rows.map((r) => (
                  <Cell key={r.name} fill={r.color} fillOpacity={r.isCurrent ? 1 : 0.72} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <ChartPlaceholder height={195} />
      )}
    </ChartBox>
  );
}

/* ============================================================================
 * 5. 軍事タブ用：GDP比軍事費ドーナツ＋NATO2%比較 & 人口1000人あたり兵力バー
 * ========================================================================== */

export function MilitaryGdpRatioChart({
  country,
  stats,
  isPreview,
}: {
  country: Country;
  stats: CountryComputedStats;
  isPreview?: boolean | undefined;
}) {
  const mounted = useIsMounted();
  const ratio = stats.militaryGdpRatio;
  const clamped = Math.min(100, Math.max(0, ratio));

  const pieData = [
    { name: "軍事・防衛支出", value: clamped, color: "#ef4444" },
    { name: "その他GDP", value: Number((100 - clamped).toFixed(2)), color: "#cbd5e1" },
  ];

  const compRows = [
    { name: country.nameJa, value: ratio, color: "#ef4444", isCurrent: true },
    { name: "世界平均", value: stats.averages.world.militaryGdpRatio, color: "#64748b", isCurrent: false },
    { name: "NATO目安", value: 2.0, color: "#0ea5e9", isCurrent: false },
    ...(country.iso3 !== "JPN"
      ? [{ name: "日本", value: stats.averages.japan.militaryGdpRatio, color: "#f59e0b", isCurrent: false }]
      : []),
  ];

  return (
    <ChartBox
      icon={Shield}
      title="GDPに対する軍事費の割合"
      subtitle="名目GDPに占める防衛・軍事支出の比率（推計）"
      badge={`GDP比 ${ratio.toFixed(2)}%`}
    >
      <div className="grid grid-cols-1 sm:grid-cols-[150px_1fr] items-center gap-3">
        {mounted ? (
          <div className="relative h-[150px] w-full max-w-[160px] mx-auto">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={44}
                  outerRadius={64}
                  startAngle={90}
                  endAngle={-270}
                  stroke="var(--card)"
                  strokeWidth={2}
                  isAnimationActive={!isPreview}
                >
                  {pieData.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipStyle}
                  itemStyle={tooltipItemStyle}
                  formatter={(v: unknown) => [`${v}%`, ""]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[10px] text-muted-foreground">GDP比</span>
              <span className="font-display text-lg font-extrabold text-rose-600 dark:text-rose-400">
                {ratio.toFixed(1)}%
              </span>
            </div>
          </div>
        ) : (
          <ChartPlaceholder height={150} />
        )}

        <div className="space-y-2">
          {compRows.map((r) => {
            const maxVal = Math.max(5, ...compRows.map((x) => x.value));
            const widthPct = Math.min(100, Math.max(4, (r.value / maxVal) * 100));
            return (
              <div key={r.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className={cn(r.isCurrent ? "font-bold text-foreground" : "text-muted-foreground")}>
                    {r.name}
                  </span>
                  <span className="font-mono font-semibold">{r.value.toFixed(2)}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${widthPct}%`, backgroundColor: r.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </ChartBox>
  );
}

/* ============================================================================
 * 6. 地理タブ用：人口密度比較棒グラフ
 * ========================================================================== */

export function PopulationDensityBarChart({
  country,
  stats,
  isPreview,
}: {
  country: Country;
  stats: CountryComputedStats;
  isPreview?: boolean | undefined;
}) {
  const mounted = useIsMounted();
  const cLabel = continentLabel(country.continent);

  const rows = [
    { name: country.nameJa, value: stats.populationDensity, color: "#06b6d4", isCurrent: true },
    { name: `${cLabel}平均`, value: stats.averages.continent.populationDensity, color: "#64748b", isCurrent: false },
    { name: "世界平均", value: stats.averages.world.populationDensity, color: "#94a3b8", isCurrent: false },
    ...(country.iso3 !== "JPN"
      ? [{ name: "日本", value: stats.averages.japan.populationDensity, color: "#f59e0b", isCurrent: false }]
      : []),
  ];

  return (
    <ChartBox
      icon={Compass}
      title="人口密度の比較（人 / km²）"
      subtitle={`1km²あたりの居住人数（世界 ${stats.ranks.populationDensity.worldRank}位 / ${stats.totalCountries}ヵ国）`}
      badge={`${nf.format(stats.populationDensity)} 人/km²`}
    >
      {mounted ? (
        <div className="h-[195px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={rows}
              layout="vertical"
              margin={{ top: 4, right: 20, left: 4, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
              <XAxis
                type="number"
                tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                tickFormatter={(v) => nf.format(v)}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={82}
                tick={{ fill: "var(--foreground)", fontSize: 11, fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: "var(--muted)", opacity: 0.45 }}
                contentStyle={tooltipStyle}
                itemStyle={tooltipItemStyle}
                formatter={(v: unknown) => [`${nf.format(Number(v))} 人/km²`, "人口密度"]}
              />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={22} isAnimationActive={!isPreview}>
                {rows.map((r) => (
                  <Cell key={r.name} fill={r.color} fillOpacity={r.isCurrent ? 1 : 0.72} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <ChartPlaceholder height={195} />
      )}
    </ChartBox>
  );
}

/* ============================================================================
 * 7. コンパクト表示（地図横パネル・モバイルドロワー）用ミニチャート群
 * ========================================================================== */

function MiniProgressRow({
  label,
  valueText,
  rankText,
  pct,
  colorClass,
}: {
  label: string;
  valueText: string;
  rankText: string;
  pct: number;
  colorClass: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2 text-[11px]">
        <span className="font-medium text-muted-foreground">{label}</span>
        <div className="flex items-center gap-1.5">
          <span className="font-mono font-bold text-foreground">{valueText}</span>
          <span className="rounded bg-secondary px-1.5 py-0.2 text-[10px] font-bold text-foreground">
            {rankText}
          </span>
        </div>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all duration-300", colorClass)}
          style={{ width: `${Math.max(4, Math.min(100, pct))}%` }}
        />
      </div>
    </div>
  );
}

/** 地図横パネル：基本タブ用（世界順位ミニバー・2列コンパクトレイアウト） */
export function CompactBasicVisual({
  country,
  stats,
}: {
  country: Country;
  stats: CountryComputedStats;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-muted/30 p-2.5 space-y-2">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-bold text-foreground">
          <BarChart3 className="size-3.5 text-sky-500" />
          世界ランキング位置（全{stats.totalCountries}ヵ国）
        </span>
        <span className="text-[10px] text-muted-foreground">バーが長いほど上位</span>
      </div>
      <div className="grid grid-cols-2 gap-x-2.5 sm:gap-x-3 gap-y-2">
        <MiniProgressRow
          label="国土面積"
          valueText={formatCompactArea(country.basic.area)}
          rankText={`${stats.ranks.area.worldRank}位`}
          pct={stats.ranks.area.percentile}
          colorClass="bg-emerald-500"
        />
        <MiniProgressRow
          label="総人口"
          valueText={formatCompactPop(country.society.population)}
          rankText={`${stats.ranks.population.worldRank}位`}
          pct={stats.ranks.population.percentile}
          colorClass="bg-sky-500"
        />
        <MiniProgressRow
          label="名目GDP"
          valueText={formatCompactGdp(country.economy.gdp)}
          rankText={`${stats.ranks.gdp.worldRank}位`}
          pct={stats.ranks.gdp.percentile}
          colorClass="bg-amber-500"
        />
        <MiniProgressRow
          label="1人あたりGDP"
          valueText={`$${nf.format(country.economy.gdpPerCapita)}`}
          rankText={`${stats.ranks.gdpPerCapita.worldRank}位`}
          pct={stats.ranks.gdpPerCapita.percentile}
          colorClass="bg-violet-500"
        />
      </div>
    </div>
  );
}

/** 地図横パネル：人口・社会タブ用（都市化率ミニドーナツ + 年齢・増加率比較バー） */
export function CompactSocietyVisual({
  country,
  stats,
}: {
  country: Country;
  stats: CountryComputedStats;
}) {
  const mounted = useIsMounted();
  const urban = Math.min(100, Math.max(0, country.society.urbanRate));
  const rural = Math.max(0, Number((100 - urban).toFixed(1)));
  const pieData = [
    { name: "都市", value: urban, color: "#0ea5e9" },
    { name: "農村", value: rural, color: "#22c55e" },
  ];

  const agePct = Math.min(100, (country.society.medianAge / 60) * 100);
  const worldAgePct = Math.min(100, (stats.averages.world.medianAge / 60) * 100);

  return (
    <div className="rounded-xl border border-border/70 bg-muted/30 p-3 space-y-3">
      <div className="grid grid-cols-[96px_1fr] items-center gap-3">
        {mounted ? (
          <div className="relative h-[96px] w-[96px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  cx="50%"
                  cy="50%"
                  innerRadius={28}
                  outerRadius={42}
                  startAngle={90}
                  endAngle={-270}
                  stroke="var(--card)"
                  strokeWidth={2}
                  isAnimationActive={false}
                >
                  {pieData.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[9px] text-muted-foreground">都市率</span>
              <span className="font-display text-sm font-extrabold text-sky-600 dark:text-sky-400">
                {urban}%
              </span>
            </div>
          </div>
        ) : (
          <div className="h-[96px] w-[96px] rounded-full bg-muted/60" />
        )}

        <div className="space-y-2 text-[11px]">
          <div className="font-bold text-foreground flex items-center gap-1.5">
            <Users className="size-3.5 text-sky-500" />
            <span>人口構成 & 高齢化指標</span>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-sky-500" />
              都市 {urban}%
            </span>
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-emerald-500" />
              農村 {rural}%
            </span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">年齢中位数</span>
              <span className="font-mono font-bold">
                {country.society.medianAge}歳{" "}
                <span className="text-[10px] font-normal text-muted-foreground">
                  (世界平均 {stats.averages.world.medianAge}歳)
                </span>
              </span>
            </div>
            <div className="relative h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-violet-500"
                style={{ width: `${agePct}%` }}
              />
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-foreground/60"
                style={{ left: `${worldAgePct}%` }}
                title={`世界平均 ${stats.averages.world.medianAge}歳`}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** 地図横パネル：経済タブ用（1人あたりGDP比較バー + 大陸シェア） */
export function CompactEconomyVisual({
  country,
  stats,
}: {
  country: Country;
  stats: CountryComputedStats;
}) {
  const maxPerCapita = Math.max(
    country.economy.gdpPerCapita,
    stats.averages.world.gdpPerCapita,
    stats.averages.japan.gdpPerCapita,
    1,
  );
  const cLabel = continentLabel(country.continent);

  const items = [
    { label: country.nameJa, val: country.economy.gdpPerCapita, color: "bg-sky-500" },
    { label: "世界平均", val: stats.averages.world.gdpPerCapita, color: "bg-slate-400" },
    ...(country.iso3 !== "JPN"
      ? [{ label: "日本", val: stats.averages.japan.gdpPerCapita, color: "bg-amber-500" }]
      : []),
  ];

  return (
    <div className="rounded-xl border border-border/70 bg-muted/30 p-3 space-y-2.5">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 font-bold text-foreground">
          <Coins className="size-3.5 text-amber-500" />
          1人あたりGDP 比較
        </span>
        <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400">
          {cLabel}GDPシェア {stats.shares.continentGdpPct.toFixed(1)}%
        </span>
      </div>
      <div className="space-y-1.5">
        {items.map((it) => (
          <div key={it.label} className="space-y-0.5">
            <div className="flex justify-between text-[11px]">
              <span className="font-medium">{it.label}</span>
              <span className="font-mono font-bold">${nf.format(it.val)}</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={cn("h-full rounded-full", it.color)}
                style={{ width: `${Math.max(4, (it.val / maxPerCapita) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** 地図横パネル：軍事タブ用（GDP比軍事費ゲージ + 世界順位） */
export function CompactMilitaryVisual({
  country,
  stats,
}: {
  country: Country;
  stats: CountryComputedStats;
}) {
  if (country.military.spending === 0 && country.military.activeTroops === 0) {
    return null;
  }
  const ratio = stats.militaryGdpRatio;
  const maxBar = Math.max(5, ratio);

  return (
    <div className="rounded-xl border border-border/70 bg-muted/30 p-3 space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 font-bold text-foreground">
          <Shield className="size-3.5 text-rose-500" />
          GDP比 軍事費バランス
        </span>
        <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
          {ratio.toFixed(2)}%
        </span>
      </div>
      <div className="relative h-2 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-rose-500"
          style={{ width: `${Math.min(100, Math.max(4, (ratio / maxBar) * 100))}%` }}
        />
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-sky-500"
          style={{ left: `${(2 / maxBar) * 100}%` }}
          title="NATO基準 2.0%"
        />
      </div>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>軍事費 世界 {stats.ranks.spending.worldRank}位</span>
        <span>青線 = NATO基準 2.0%</span>
      </div>
    </div>
  );
}

/** 地図横パネル：地理タブ用（面積・人口密度ミニバー） */
export function CompactGeographyVisual({
  country,
  stats,
}: {
  country: Country;
  stats: CountryComputedStats;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-muted/30 p-3 space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
        <Globe className="size-3.5 text-emerald-500" />
        国土スケール（世界順位）
      </div>
      <MiniProgressRow
        label="国土面積"
        valueText={formatCompactArea(country.basic.area)}
        rankText={`世界 ${stats.ranks.area.worldRank}位`}
        pct={stats.ranks.area.percentile}
        colorClass="bg-emerald-500"
      />
      <MiniProgressRow
        label="人口密度"
        valueText={`${nf.format(stats.populationDensity)} 人/km²`}
        rankText={`世界 ${stats.ranks.populationDensity.worldRank}位`}
        pct={stats.ranks.populationDensity.percentile}
        colorClass="bg-cyan-500"
      />
    </div>
  );
}

/** 実質GDP成長率（年率 %）の折れ線グラフ（2015〜2026年・IMF WEO / World Bank 公式統計） */
export function GdpGrowthLineChart({
  country,
  isPreview,
}: {
  country: Country;
  isPreview?: boolean | undefined;
}) {
  const mounted = useIsMounted();
  const series = getGdpGrowthSeries(country.iso3);
  const isJapan = country.iso3 === "JPN";

  if (!series.hasData) {
    return (
      <ChartBox
        icon={TrendingUp}
        title="実質GDP成長率の推移（2015〜2026年）"
        subtitle="IMF WEO・世界銀行公式統計に基づく年率推移"
        badge="データ未収録"
      >
        <div className="rounded-xl bg-muted/40 px-4 py-6 text-center text-xs text-muted-foreground">
          この国・地域の実質GDP成長率の時系列データはIMF・世界銀行の公的統計に未収録です。
        </div>
      </ChartBox>
    );
  }

  const latest = series.latestValue;
  const isLatestForecast =
    series.latestYear !== null && series.latestYear >= GDP_GROWTH_FORECAST_YEAR;
  const latestBadge =
    latest !== null && series.latestYear !== null
      ? `${series.latestYear}年${isLatestForecast ? "見通し" : ""} ${latest > 0 ? `+${latest}` : latest}%`
      : undefined;

  return (
    <ChartBox
      icon={TrendingUp}
      title="実質GDP成長率の推移（2015〜2026年）"
      subtitle={`年率 %（平均: ${series.avgRate !== null ? `${series.avgRate > 0 ? `+${series.avgRate}` : series.avgRate}%` : "—"} ／ 2026年はIMF見通し ／ 出典: IMF WEO・World Bank）`}
      badge={latestBadge}
    >
      {mounted ? (
        <div className="h-[240px] sm:h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series.points} margin={{ top: 10, right: 16, left: -12, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="year"
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                tickFormatter={(y) => (Number(y) >= GDP_GROWTH_FORECAST_YEAR ? `${y}*` : String(y))}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                tickFormatter={(v) => `${v}%`}
                axisLine={false}
                tickLine={false}
              />
              <ReferenceLine
                y={0}
                stroke="var(--foreground)"
                strokeOpacity={0.35}
                strokeWidth={1.5}
              />
              <ReferenceLine
                x={GDP_GROWTH_FORECAST_YEAR}
                stroke="#0ea5e9"
                strokeOpacity={0.35}
                strokeDasharray="3 3"
              />
              <Tooltip
                contentStyle={tooltipStyle}
                itemStyle={tooltipItemStyle}
                labelFormatter={(label) =>
                  Number(label) >= GDP_GROWTH_FORECAST_YEAR
                    ? `${label}年（IMF見通し）`
                    : `${label}年`
                }
                formatter={(val: unknown, name: string) => {
                  if (val === null || val === undefined) return ["データなし", name];
                  const num = Number(val);
                  return [`${num > 0 ? `+${num}` : num}%`, name];
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: "11px", paddingTop: "6px" }}
                iconType="circle"
                iconSize={8}
              />
              <Line
                type="monotone"
                dataKey="country"
                name={country.nameJa}
                stroke="#0ea5e9"
                strokeWidth={2.75}
                dot={{ r: 3.5, fill: "#0ea5e9", strokeWidth: 1.5, stroke: "var(--card)" }}
                activeDot={{ r: 5.5 }}
                connectNulls
                isAnimationActive={!isPreview}
              />
              <Line
                type="monotone"
                dataKey="world"
                name="世界平均"
                stroke="#94a3b8"
                strokeWidth={1.75}
                strokeDasharray="4 4"
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
              {!isJapan && (
                <Line
                  type="monotone"
                  dataKey="japan"
                  name="日本"
                  stroke="#f59e0b"
                  strokeWidth={1.75}
                  strokeDasharray="3 3"
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <ChartPlaceholder height={250} />
      )}
    </ChartBox>
  );
}

/** 地図横パネル：経済タブ用の実質GDP成長率ミニ折れ線グラフ */
export function CompactGdpGrowthChart({ country }: { country: Country }) {
  const mounted = useIsMounted();
  const series = getGdpGrowthSeries(country.iso3);
  if (!series.hasData) return null;

  const latest = series.latestValue;
  const isLatestForecast =
    series.latestYear !== null && series.latestYear >= GDP_GROWTH_FORECAST_YEAR;

  return (
    <div className="rounded-xl border border-border/70 bg-muted/30 p-3 space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 font-bold text-foreground">
          <TrendingUp className="size-3.5 text-sky-500" />
          経済成長率推移 (2015–2026)
        </span>
        {latest !== null && series.latestYear !== null && (
          <span
            className={cn(
              "rounded px-1.5 py-0.5 text-[10px] font-mono font-bold",
              latest >= 0
                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                : "bg-rose-500/15 text-rose-700 dark:text-rose-400",
            )}
          >
            {series.latestYear}年{isLatestForecast ? "予" : ""}{" "}
            {latest > 0 ? `+${latest}` : latest}%
          </span>
        )}
      </div>
      {mounted ? (
        <div className="h-[125px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series.points} margin={{ top: 6, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="year"
                tick={{ fill: "var(--muted-foreground)", fontSize: 9 }}
                tickFormatter={(y) => `'${String(y).slice(2)}`}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "var(--muted-foreground)", fontSize: 9 }}
                tickFormatter={(v) => `${v}%`}
                axisLine={false}
                tickLine={false}
              />
              <ReferenceLine y={0} stroke="var(--foreground)" strokeOpacity={0.3} />
              <Tooltip
                contentStyle={tooltipStyle}
                itemStyle={tooltipItemStyle}
                labelFormatter={(l) =>
                  Number(l) >= GDP_GROWTH_FORECAST_YEAR ? `${l}年（IMF見通し）` : `${l}年`
                }
                formatter={(val: unknown, name: string) => {
                  if (val === null || val === undefined) return ["—", name];
                  const num = Number(val);
                  return [`${num > 0 ? `+${num}` : num}%`, name];
                }}
              />
              <Line
                type="monotone"
                dataKey="country"
                name={country.nameJa}
                stroke="#0ea5e9"
                strokeWidth={2}
                dot={{ r: 2.5, fill: "#0ea5e9" }}
                connectNulls
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="world"
                name="世界平均"
                stroke="#94a3b8"
                strokeWidth={1.25}
                strokeDasharray="3 3"
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-[125px] w-full rounded-lg bg-muted/50 animate-pulse" />
      )}
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-0.5 w-3 bg-sky-500" />
            {country.nameJa}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-0.5 w-3 border-t border-dashed border-slate-400" />
            世界平均
          </span>
        </span>
        <span>IMF WEO</span>
      </div>
    </div>
  );
}

/** 災害リスク文字列をチップ用に分割 */
export function splitDisasterItems(text: string): string[] {
  return text
    .split(/[、・,，]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s.length <= 24);
}
