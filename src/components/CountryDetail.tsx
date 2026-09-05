import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeftRight,
  Award,
  BookOpen,
  BookmarkCheck,
  Building2,
  Check,
  Clock,
  CloudSun,
  Coins,
  Compass,
  ExternalLink,
  Eye,
  Factory,
  FileText,
  Gem,
  Globe,
  Handshake,
  Heart,
  History,
  Hourglass,
  Landmark,
  Languages,
  MapPin,
  Maximize2,
  Mountain,
  Pin,
  Radio,
  Scale,
  Scroll,
  Shield,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Users,
  UtensilsCrossed,
  Wallet,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FlagImage } from "@/components/FlagImage";
import { continentLabel, type Country } from "@/data/types";
import { getCountryPhoto } from "@/data/countryPhotos";
import { useProgress } from "@/stores/progress";
import { cn } from "@/lib/utils";

const nf = new Intl.NumberFormat("ja-JP");

// 日本の基準統計（比較用）
const JAPAN_AREA = 377975; // km²
const JAPAN_POP = 124000000; // 人

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg bg-muted/60 px-3 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  subtext,
  badge,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  subtext?: string;
  badge?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/80 bg-card/80 p-4 shadow-xs flex flex-col justify-between transition-all hover:border-border",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
          <Icon className="size-4 text-sky-500 shrink-0" />
          <span>{label}</span>
        </span>
        {badge && (
          <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] font-bold text-sky-600 dark:text-sky-400 shrink-0">
            {badge}
          </span>
        )}
      </div>
      <div>
        <div className="font-display text-lg sm:text-xl font-bold text-foreground leading-tight">{value}</div>
        {subtext && <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{subtext}</p>}
      </div>
    </div>
  );
}

function SectionBox({
  icon: Icon,
  title,
  children,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs space-y-3", className)}>
      <div className="flex items-center gap-2 border-b border-border/60 pb-2.5">
        <Icon className="size-4.5 text-sky-500" />
        <h3 className="font-display text-sm sm:text-base font-bold text-foreground">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Chips({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((i) => (
        <Badge key={i} variant="secondary" className="font-normal">
          {i}
        </Badge>
      ))}
    </div>
  );
}

export function CountryDetail({
  country,
  compact,
  isPreview,
}: {
  country: Country;
  compact?: boolean;
  isPreview?: boolean;
}) {
  const learned = useProgress((s) => s.learned.includes(country.iso3));
  const favorite = useProgress((s) => s.favorites.includes(country.iso3));
  const toggleLearned = useProgress((s) => s.toggleLearned);
  const toggleFavorite = useProgress((s) => s.toggleFavorite);

  const photo = getCountryPhoto(country.iso3, country.continent);

  // 日本との面積比
  const areaRatio =
    country.basic.area >= JAPAN_AREA
      ? `日本の約 ${(country.basic.area / JAPAN_AREA).toFixed(1)} 倍の国土`
      : `日本の約 ${(country.basic.area / JAPAN_AREA * 100).toFixed(1)} %（約 1/${Math.max(1, Math.round(JAPAN_AREA / Math.max(1, country.basic.area)))}）`;

  // 日本との人口比
  const popRatio =
    country.society.population >= JAPAN_POP
      ? `日本の約 ${(country.society.population / JAPAN_POP).toFixed(1)} 倍`
      : `日本の約 ${(country.society.population / JAPAN_POP * 100).toFixed(1)} %（日本の約 1/${Math.max(1, Math.round(JAPAN_POP / Math.max(1, country.society.population)))}）`;

  return (
    <div className="flex h-full flex-col">
      {/* ホバープレビュー / 選択固定ステータスバナー */}
      {isPreview ? (
        <div className="flex items-center justify-between px-4 py-2 bg-sky-500/10 border-b border-sky-500/20 text-sky-500 dark:text-sky-400 text-xs font-semibold animate-fadeIn">
          <span className="flex items-center gap-1.5">
            <Eye className="size-3.5 animate-pulse text-sky-500" />
            <span>リアルタイム・プレビュー中</span>
          </span>
          <span className="text-[11px] text-muted-foreground font-normal">
            地図をクリックして固定 ➜
          </span>
        </div>
      ) : compact ? (
        <div className="flex items-center justify-between px-4 py-1.5 bg-emerald-500/10 border-b border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
          <span className="flex items-center gap-1.5">
            <Pin className="size-3.5" />
            <span>選択・固定中</span>
          </span>
          <span className="text-[10px] text-muted-foreground">学習・クイズ対象</span>
        </div>
      ) : null}

      {/* 象徴的な風景・名所写真ヒーローヘッダー */}
      <div className="relative aspect-[21/9] sm:aspect-[16/7] w-full overflow-hidden bg-slate-900 group">
        <img
          src={photo.url}
          aria-hidden
          className="absolute inset-0 size-full object-cover scale-110 blur-sm brightness-40 saturate-150"
          loading="eager"
          referrerPolicy="no-referrer"
        />
        <img
          src={photo.url}
          alt={photo.caption}
          className="relative size-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="eager"
          referrerPolicy="no-referrer"
          onError={(e) => {
            const img = e.currentTarget;
            if (!img.dataset["fallback"]) {
              img.dataset["fallback"] = "true";
              img.src = "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&h=300&q=80";
            }
          }}
        />
        {/* 写真グラデーション & キャプション */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent px-3.5 py-1.5 flex items-center justify-between text-[11px] text-white/90">
          <span className="font-medium truncate drop-shadow-sm">📷 {photo.caption}</span>
          <span className="shrink-0 text-[10px] text-white/60 ml-2">名所・世界遺産</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
        <div className="flex items-center gap-3 min-w-0">
          <FlagImage flag={country.flag} size="lg" className="rounded shadow shrink-0" />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-display text-xl sm:text-2xl font-bold leading-tight">{country.nameJa}</h2>
              <Badge variant="outline" className="text-xs font-medium shrink-0">
                {continentLabel(country.continent)}
              </Badge>
              {!compact && (
                <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-mono text-muted-foreground">
                  ISO: {country.iso3}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{country.nameEn}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant={learned ? "default" : "outline"}
            onClick={() => toggleLearned(country.iso3)}
          >
            <Check className="size-4" />
            {learned ? "学習済み" : "学習済みにする"}
          </Button>
          <Button
            size="sm"
            variant={favorite ? "secondary" : "outline"}
            onClick={() => toggleFavorite(country.iso3)}
          >
            <BookmarkCheck className="size-4" />
            {favorite ? "お気に入り中" : "お気に入り"}
          </Button>
          {compact && (
            <Button size="sm" variant="ghost" asChild>
              <Link to="/country/$iso3" params={{ iso3: country.iso3.toLowerCase() }}>
                詳細ページ
                <ExternalLink className="size-4" />
              </Link>
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="basic" className="flex-1 overflow-hidden flex flex-col">
        <div className="overflow-x-auto px-4 pt-3 scrollbar-hide">
          <TabsList className="w-full justify-between h-auto p-1 gap-0.5">
            <TabsTrigger value="basic" className="px-2 sm:px-2.5 py-1.5 text-xs">基本</TabsTrigger>
            <TabsTrigger value="history" className="px-2 sm:px-2.5 py-1.5 text-xs">歴史</TabsTrigger>
            <TabsTrigger value="culture" className="px-2 sm:px-2.5 py-1.5 text-xs">文化</TabsTrigger>
            <TabsTrigger value="society" className="px-2 sm:px-2.5 py-1.5 text-xs">人口・社会</TabsTrigger>
            <TabsTrigger value="economy" className="px-2 sm:px-2.5 py-1.5 text-xs">経済</TabsTrigger>
            <TabsTrigger value="military" className="px-2 sm:px-2.5 py-1.5 text-xs">軍事</TabsTrigger>
            <TabsTrigger value="geography" className="px-2 sm:px-2.5 py-1.5 text-xs">地理</TabsTrigger>
            <TabsTrigger value="exam" className="px-2 sm:px-2.5 py-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">受験ポイント</TabsTrigger>
          </TabsList>
        </div>

        <div className={cn("p-4 text-sm leading-relaxed", compact ? "max-h-[60vh] overflow-y-auto" : "space-y-6")}>
          {/* 1. 基本タブ */}
          <TabsContent value="basic" className="mt-0 space-y-4">
            {compact ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <Row label="首都" value={country.basic.capital} />
                <Row label="公用語・主な言語" value={country.basic.languages} />
                <Row label="面積" value={`${nf.format(country.basic.area)} km²`} />
                <Row label="日本との時差" value={country.basic.timeDiffFromJapan} />
                <Row label="政治体制" value={country.basic.government} />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <StatCard
                    icon={Landmark}
                    label="首都"
                    value={country.basic.capital}
                    subtext="政治・行政の中心都市"
                  />
                  <StatCard
                    icon={Languages}
                    label="公用語・主な言語"
                    value={country.basic.languages}
                    subtext="国家公式または日常で広く話される言語"
                  />
                  <StatCard
                    icon={Maximize2}
                    label="国土面積"
                    value={`${nf.format(country.basic.area)} km²`}
                    subtext={areaRatio}
                  />
                  <StatCard
                    icon={Clock}
                    label="日本との時差"
                    value={country.basic.timeDiffFromJapan}
                    subtext="日本標準時（JST）との時差"
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <SectionBox icon={Scale} title="国家体制 & 政治制度">
                    <p className="text-foreground font-medium">{country.basic.government}</p>
                    <p className="text-xs text-muted-foreground">
                      国の統治形態、立法・行政・司法の枠組み、および国家元首の役割を定めています。
                    </p>
                  </SectionBox>

                  <SectionBox icon={Compass} title="所属大陸 & 国際識別コード">
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between py-1 border-b border-border/50">
                        <span className="text-muted-foreground">所属大陸</span>
                        <span className="font-semibold text-foreground">{continentLabel(country.continent)}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-border/50">
                        <span className="text-muted-foreground">ISO 3文字コード</span>
                        <span className="font-mono font-semibold text-foreground">{country.iso3}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-muted-foreground">国コード番号</span>
                        <span className="font-mono font-semibold text-foreground">{country.id}</span>
                      </div>
                    </div>
                  </SectionBox>
                </div>
              </div>
            )}
          </TabsContent>

          {/* 2. 歴史タブ */}
          <TabsContent value="history" className="mt-0 space-y-4">
            {compact ? (
              <div className="space-y-4">
                <p>{country.history.founding}</p>
                <ol className="space-y-2 border-l-2 border-primary/40 pl-4">
                  {country.history.timeline.map((t) => (
                    <li key={t.year + t.event} className="relative">
                      <span className="absolute -left-[21px] top-1.5 size-2 rounded-full bg-primary" />
                      <span className="font-display font-bold text-primary">
                        {t.year.endsWith("年") || t.year.includes("現在") || t.year.endsWith("代") ? t.year : `${t.year} 年`}
                      </span>
                      <span className="ml-2">{t.event}</span>
                    </li>
                  ))}
                </ol>
                <div>
                  <h3 className="mb-1 text-sm font-bold">日本・周辺国との関係</h3>
                  <p className="text-muted-foreground">{country.history.relations}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <SectionBox icon={Scroll} title="建国の起源 & 歴史的歩み">
                  <p className="text-sm sm:text-base leading-relaxed text-foreground font-medium">
                    {country.history.founding}
                  </p>
                </SectionBox>

                <SectionBox icon={History} title="歴史の重要転換点（クロノロジー年表）">
                  <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-sky-500/30">
                    {country.history.timeline.map((t) => (
                      <div key={t.year + t.event} className="relative group">
                        <span className="absolute -left-[21px] top-1.5 size-3 rounded-full border-2 border-background bg-sky-500 group-hover:scale-125 transition-transform" />
                        <div className="rounded-xl border border-border/70 bg-secondary/20 p-3 hover:bg-secondary/40 transition-colors">
                          <span className="inline-block rounded-md bg-sky-500/10 px-2 py-0.5 text-xs font-bold text-sky-600 dark:text-sky-400 mb-1">
                            {t.year.endsWith("年") || t.year.includes("現在") || t.year.endsWith("代") ? t.year : `${t.year} 年`}
                          </span>
                          <p className="text-xs sm:text-sm text-foreground font-medium">{t.event}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </SectionBox>

                <SectionBox icon={Handshake} title="日本および国際社会との関係・地政学的同盟">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {country.history.relations}
                  </p>
                </SectionBox>
              </div>
            )}
          </TabsContent>

          {/* 3. 文化タブ */}
          <TabsContent value="culture" className="mt-0 space-y-4">
            {compact ? (
              <div className="space-y-3">
                <Row label="宗教" value={country.culture.religion} />
                <Row label="伝統・文化" value={country.culture.tradition} />
                <Row label="食文化" value={country.culture.food} />
                <div>
                  <h3 className="mb-1.5 text-sm font-bold">世界遺産・観光名所</h3>
                  <Chips items={country.culture.heritage} />
                </div>
                <div>
                  <h3 className="mb-1.5 text-sm font-bold">有名な人物</h3>
                  <Chips items={country.culture.people} />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <SectionBox icon={Heart} title="宗教 & 信仰">
                    <p className="text-sm text-foreground font-medium">{country.culture.religion}</p>
                  </SectionBox>

                  <SectionBox icon={Sparkles} title="伝統文化 & 国民性">
                    <p className="text-sm text-foreground font-medium">{country.culture.tradition}</p>
                  </SectionBox>

                  <SectionBox icon={UtensilsCrossed} title="代表的な食文化 & 郷土料理">
                    <p className="text-sm text-foreground font-medium">{country.culture.food}</p>
                  </SectionBox>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <SectionBox icon={MapPin} title="ユネスコ世界遺産 & 主要観光名所">
                    <div className="flex flex-wrap gap-2 pt-1">
                      {country.culture.heritage.map((h) => (
                        <div
                          key={h}
                          className="flex items-center gap-1.5 rounded-xl border border-border/80 bg-secondary/30 px-3 py-2 text-xs font-medium hover:border-sky-500/40 transition-colors"
                        >
                          <span className="text-sky-500">🏛️</span>
                          <span>{h}</span>
                        </div>
                      ))}
                    </div>
                  </SectionBox>

                  <SectionBox icon={Users} title="歴史の偉人 & 代表的な著名人">
                    <div className="flex flex-wrap gap-2 pt-1">
                      {country.culture.people.map((p) => (
                        <div
                          key={p}
                          className="flex items-center gap-1.5 rounded-xl border border-border/80 bg-secondary/30 px-3 py-2 text-xs font-medium hover:border-sky-500/40 transition-colors"
                        >
                          <span className="text-amber-500">🌟</span>
                          <span>{p}</span>
                        </div>
                      ))}
                    </div>
                  </SectionBox>
                </div>
              </div>
            )}
          </TabsContent>

          {/* 4. 人口・社会タブ */}
          <TabsContent value="society" className="mt-0 space-y-4">
            {compact ? (
              <div className="space-y-2">
                <div className="grid gap-2 sm:grid-cols-2">
                  <Row label="人口" value={`${nf.format(country.society.population)} 人`} />
                  <Row label="人口増加率" value={`${country.society.populationGrowth} %`} />
                  <Row label="都市人口率" value={`${country.society.urbanRate} %`} />
                  <Row label="年齢の中位数" value={`${country.society.medianAge} 歳`} />
                </div>
                <p className="text-muted-foreground">{country.society.note}</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <StatCard
                    icon={Users}
                    label="総人口"
                    value={`${nf.format(country.society.population)} 人`}
                    subtext={popRatio}
                  />
                  <StatCard
                    icon={TrendingUp}
                    label="年間人口増加率"
                    value={`${country.society.populationGrowth} %`}
                    subtext={
                      country.society.populationGrowth > 0
                        ? "人口増加傾向"
                        : country.society.populationGrowth < 0
                          ? "少子高齢化・減少傾向"
                          : "人口横ばい"
                    }
                  />
                  <StatCard
                    icon={Building2}
                    label="都市部人口率"
                    value={`${country.society.urbanRate} %`}
                    subtext="主要都市圏への居住集中度"
                  />
                  <StatCard
                    icon={Hourglass}
                    label="年齢の中位数"
                    value={`${country.society.medianAge} 歳`}
                    subtext="国民全体の若さ・高齢化水準（日本は約49歳）"
                  />
                </div>

                <SectionBox icon={FileText} title="社会構造・国民生活の特徴 & 現代の課題">
                  <p className="text-sm sm:text-base leading-relaxed text-foreground font-medium">
                    {country.society.note}
                  </p>
                </SectionBox>
              </div>
            )}
          </TabsContent>

          {/* 5. 経済タブ */}
          <TabsContent value="economy" className="mt-0 space-y-4">
            {compact ? (
              <div className="space-y-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  <Row label="GDP" value={`約 ${nf.format(country.economy.gdp)} 億USドル`} />
                  <Row
                    label="1人あたりGDP"
                    value={`約 ${nf.format(country.economy.gdpPerCapita)} USドル`}
                  />
                </div>
                <div>
                  <h3 className="mb-1.5 text-sm font-bold">主要産業</h3>
                  <Chips items={country.economy.industries} />
                </div>
                <div>
                  <h3 className="mb-1.5 text-sm font-bold">資源</h3>
                  <Chips items={country.economy.resources} />
                </div>
                <Row label="貿易の特色" value={country.economy.trade} />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <StatCard
                    icon={Coins}
                    label="名目GDP（国内総生産）"
                    value={`約 ${nf.format(country.economy.gdp)} 億USドル`}
                    subtext={`世界経済における生産規模（約 ${(country.economy.gdp * 100 / 10000).toFixed(1)} 兆円換算）`}
                  />
                  <StatCard
                    icon={Wallet}
                    label="1人あたりGDP"
                    value={`約 ${nf.format(country.economy.gdpPerCapita)} USドル`}
                    subtext="個人の経済水準・所得水準（日本は約34,000ドル水準）"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <SectionBox icon={Factory} title="国を支える主要産業">
                    <div className="flex flex-wrap gap-2 pt-1">
                      {country.economy.industries.map((ind) => (
                        <div
                          key={ind}
                          className="flex items-center gap-1.5 rounded-xl border border-border/80 bg-secondary/30 px-3 py-2 text-xs font-medium hover:border-sky-500/40 transition-colors"
                        >
                          <span className="text-emerald-500">🏭</span>
                          <span>{ind}</span>
                        </div>
                      ))}
                    </div>
                  </SectionBox>

                  <SectionBox icon={Gem} title="豊かな天然資源 & エネルギー">
                    <div className="flex flex-wrap gap-2 pt-1">
                      {country.economy.resources.map((res) => (
                        <div
                          key={res}
                          className="flex items-center gap-1.5 rounded-xl border border-border/80 bg-secondary/30 px-3 py-2 text-xs font-medium hover:border-sky-500/40 transition-colors"
                        >
                          <span className="text-amber-500">⛏️</span>
                          <span>{res}</span>
                        </div>
                      ))}
                    </div>
                  </SectionBox>
                </div>

                <SectionBox icon={ArrowLeftRight} title="貿易構造・主要輸出品目 & パートナー">
                  <p className="text-sm sm:text-base leading-relaxed text-foreground font-medium">
                    {country.economy.trade}
                  </p>
                </SectionBox>
              </div>
            )}
          </TabsContent>

          {/* 6. 軍事タブ */}
          <TabsContent value="military" className="mt-0 space-y-4">
            {compact ? (
              <div className="space-y-3">
                <p className="rounded-lg bg-secondary/70 px-3 py-2 text-xs text-secondary-foreground">
                  ここでは兵力数・軍事費などの客観的な公開統計のみを扱います。国の優劣を示すものではありません。
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Row label="軍事費（推計）" value={`約 ${nf.format(country.military.spending)} 億USドル`} />
                  <Row label="兵力（現役）" value={`約 ${nf.format(country.military.activeTroops)} 千人`} />
                </div>
                <div>
                  <h3 className="mb-1.5 text-sm font-bold">同盟・安全保障の枠組み</h3>
                  <Chips items={country.military.alliances} />
                </div>
                <div>
                  <h3 className="mb-1.5 text-sm font-bold">加盟する国際機関</h3>
                  <Chips items={country.military.organizations} />
                </div>
                <p className="text-muted-foreground">{country.military.note}</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl border border-border/80 bg-secondary/40 px-4 py-3 text-xs text-muted-foreground flex items-center gap-2">
                  <span className="text-base shrink-0">ℹ️</span>
                  <span>
                    当データはSIPRI・IISSミリタリーバランス等の公開推計値に基づく客観的指標です。国家間の優劣を評価するものではありません。
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <StatCard
                    icon={ShieldAlert}
                    label="国防支出・軍事費（推計）"
                    value={`約 ${nf.format(country.military.spending)} 億USドル`}
                    subtext="年間の防衛予算・軍事支出規模"
                  />
                  <StatCard
                    icon={Shield}
                    label="現役総兵力"
                    value={`約 ${nf.format(country.military.activeTroops)} 千人（約 ${nf.format(country.military.activeTroops * 1000)} 人）`}
                    subtext="陸・海・空軍等の現役軍務人員数（日本の自衛隊は約24万人）"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <SectionBox icon={Award} title="主要な同盟 & 安全保障協定">
                    <div className="flex flex-wrap gap-2 pt-1">
                      {country.military.alliances.map((a) => (
                        <div
                          key={a}
                          className="flex items-center gap-1.5 rounded-xl border border-border/80 bg-secondary/30 px-3 py-2 text-xs font-medium hover:border-sky-500/40 transition-colors"
                        >
                          <span className="text-sky-500">🛡️</span>
                          <span>{a}</span>
                        </div>
                      ))}
                    </div>
                  </SectionBox>

                  <SectionBox icon={Globe} title="加盟する国際機関 & 多国間枠組み">
                    <div className="flex flex-wrap gap-2 pt-1">
                      {country.military.organizations.map((org) => (
                        <div
                          key={org}
                          className="flex items-center gap-1.5 rounded-xl border border-border/80 bg-secondary/30 px-3 py-2 text-xs font-medium hover:border-sky-500/40 transition-colors"
                        >
                          <span className="text-teal-500">🌐</span>
                          <span>{org}</span>
                        </div>
                      ))}
                    </div>
                  </SectionBox>
                </div>

                <SectionBox icon={Radio} title="防衛政策の特色 & 地政学的環境">
                  <p className="text-sm sm:text-base leading-relaxed text-foreground font-medium">
                    {country.military.note}
                  </p>
                </SectionBox>
              </div>
            )}
          </TabsContent>

          {/* 7. 地理タブ */}
          <TabsContent value="geography" className="mt-0 space-y-4">
            {compact ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <Row label="気候" value={country.geography.climate} />
                <Row label="地形" value={country.geography.terrain} />
                <Row label="自然災害のリスク" value={country.geography.disasterRisk} />
                <Row label="国境・周辺国" value={country.geography.borders} />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <SectionBox icon={CloudSun} title="気候区分 & 四季の特色">
                    <p className="text-sm sm:text-base leading-relaxed text-foreground font-medium">
                      {country.geography.climate}
                    </p>
                  </SectionBox>

                  <SectionBox icon={Mountain} title="地形・山脈・水系・自然景観">
                    <p className="text-sm sm:text-base leading-relaxed text-foreground font-medium">
                      {country.geography.terrain}
                    </p>
                  </SectionBox>

                  <SectionBox icon={AlertTriangle} title="自然災害リスク & 環境的課題">
                    <p className="text-sm sm:text-base leading-relaxed text-foreground font-medium">
                      {country.geography.disasterRisk}
                    </p>
                  </SectionBox>

                  <SectionBox icon={Compass} title="国境・隣接国 & 海洋の地勢">
                    <p className="text-sm sm:text-base leading-relaxed text-foreground font-medium">
                      {country.geography.borders}
                    </p>
                  </SectionBox>
                </div>
              </div>
            )}
          </TabsContent>

          {/* 8. 受験ポイントタブ */}
          <TabsContent value="exam" className="mt-0 space-y-4">
            {compact ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">入試頻出 10問</span>
                  <Link
                    to="/quiz"
                    search={{ country: country.iso3.toLowerCase(), mode: "exam" }}
                    className="text-xs text-sky-500 hover:underline font-bold"
                  >
                    クイズで特訓 ➜
                  </Link>
                </div>
                {country.examPoints.map((qa) => (
                  <div key={qa.q} className="rounded-lg border border-border p-3">
                    <p className="font-bold text-primary">Q. {qa.q}</p>
                    <p className="mt-1 text-muted-foreground">A. {qa.a}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                    <BookOpen className="size-4" />
                    <span>入試頻出・重要マスター10問</span>
                    <span className="text-[11px] font-normal text-muted-foreground">（中学・高校・大学受験対策）</span>
                  </span>
                  <Link
                    to="/quiz"
                    search={{ country: country.iso3.toLowerCase(), mode: "exam" }}
                    className="inline-flex items-center gap-1 font-bold text-amber-700 dark:text-amber-300 hover:underline bg-amber-500/15 hover:bg-amber-500/25 px-3 py-1.5 rounded-lg transition-colors text-xs"
                  >
                    この10問をクイズで特訓する ➜
                  </Link>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {country.examPoints.map((qa, index) => (
                    <div
                      key={qa.q}
                      className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs space-y-2 hover:border-amber-500/40 transition-colors flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 font-display text-[11px] font-bold text-amber-600 dark:text-amber-400">
                            Q{index + 1}
                          </span>
                          <span className="text-[11px] text-muted-foreground">地理・歴史の重要論点</span>
                        </div>
                        <p className="text-xs sm:text-sm font-bold text-foreground leading-snug">{qa.q}</p>
                      </div>
                      <div className="rounded-xl bg-secondary/50 p-2.5 border border-border/60">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                          正解
                        </span>
                        <p className="text-xs sm:text-sm font-bold text-sky-600 dark:text-sky-400">{qa.a}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* 出典情報 */}
          <div className="mt-6 border-t border-border pt-4 text-xs text-muted-foreground">
            <p className="font-bold text-foreground mb-1">統計・データ出典</p>
            <ul className="list-inside list-disc flex flex-wrap gap-x-4 gap-y-1">
              {country.sources.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
        </div>
      </Tabs>
    </div>
  );
}
