import { useEffect, useMemo, useRef, useState } from "react";
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
  GraduationCap,
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
  Plane,
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
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FlagImage } from "@/components/FlagImage";
import {
  CompactBasicVisual,
  CompactEconomyVisual,
  CompactGdpGrowthChart,
  CompactGeographyVisual,
  CompactMilitaryVisual,
  CompactSocietyVisual,
  ContinentSharePieChart,
  CountryProfileRadar,
  formatCompactArea,
  formatCompactGdp,
  formatCompactPop,
  GdpGrowthLineChart,
  GdpPerCapitaComparisonChart,
  MedianAgeBarChart,
  MilitaryGdpRatioChart,
  PeerRankBarChart,
  PopulationDensityBarChart,
  PopulationGrowthBarChart,
  splitDisasterItems,
  UrbanRuralDonutChart,
  WorldRankBars,
} from "@/components/CountryCharts";
import { getCountryStats } from "@/data/countryStats";
import { continentLabel, type Country, type ExamLevel } from "@/data/types";
import { EXAM_LEVELS, EXAM_LEVEL_MAP, getExamPointsByLevel } from "@/data/examPointsByLevel";
import { getCountryPhoto } from "@/data/countryPhotos";
import { useProgress } from "@/stores/progress";
import { cn } from "@/lib/utils";

const DETAIL_TABS = [
  "basic",
  "history",
  "culture",
  "society",
  "economy",
  "military",
  "geography",
] as const;

const nf = new Intl.NumberFormat("ja-JP");

// 日本の基準統計（比較用）
const JAPAN_AREA = 377975; // km²
const JAPAN_POP = 124000000; // 人

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg bg-muted/60 px-2.5 py-1.5">
      <span className="text-[11px] text-muted-foreground leading-tight">{label}</span>
      <span className="text-xs sm:text-sm font-medium leading-snug">{value}</span>
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
  subtext?: string | undefined;
  badge?: string | undefined;
  className?: string | undefined;
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
  onClose,
}: {
  country: Country;
  compact?: boolean;
  isPreview?: boolean;
  onClose?: () => void;
}) {
  const learned = useProgress((s) => s.learned.includes(country.iso3));
  const favorite = useProgress((s) => s.favorites.includes(country.iso3));
  const toggleLearned = useProgress((s) => s.toggleLearned);
  const toggleFavorite = useProgress((s) => s.toggleFavorite);
  const [activeTab, setActiveTab] = useState("basic");
  const [swipeDir, setSwipeDir] = useState<"left" | "right" | null>(null);
  const [examLevel, setExamLevel] = useState<ExamLevel | "all">("junior");

  const tabContentRef = useRef<HTMLDivElement | null>(null);
  const tabScrollContainerRef = useRef<HTMLDivElement | null>(null);
  const tabTriggerRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const isFirstTabRenderRef = useRef(true);

  // タブ切替時に上部タブバーのみ横スクロール調整（ページ全体の縦スクロールは絶対に動かさない）
  useEffect(() => {
    if (isFirstTabRenderRef.current) {
      isFirstTabRenderRef.current = false;
      return;
    }
    const triggerEl = tabTriggerRefs.current.get(activeTab);
    const scrollContainer = tabScrollContainerRef.current;
    if (triggerEl && scrollContainer) {
      const targetLeft =
        triggerEl.offsetLeft - scrollContainer.clientWidth / 2 + triggerEl.clientWidth / 2;
      scrollContainer.scrollTo({ left: Math.max(0, targetLeft), behavior: "smooth" });
    }
    if (tabContentRef.current) {
      tabContentRef.current.scrollTop = 0;
    }
  }, [activeTab]);

  // モバイルでの横スワイプによる前後タブ移動（縦スクロールと競合しないよう角度と距離を厳密判定）
  const handleContentTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 1) {
      touchStartRef.current = null;
      return;
    }
    const t = e.touches[0];
    if (!t) return;
    touchStartRef.current = { x: t.clientX, y: t.clientY, time: Date.now() };
  };

  const handleContentTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start || e.changedTouches.length !== 1) return;
    const t = e.changedTouches[0];
    if (!t) return;

    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    const elapsed = Date.now() - start.time;

    // 横方向へ48px以上、かつ縦移動より明確に横向き（1.4倍以上）かつ素早いスワイプ（800ms以内）
    if (elapsed > 800 || Math.abs(dx) < 48 || Math.abs(dx) <= Math.abs(dy) * 1.4) {
      return;
    }

    const currentIdx = DETAIL_TABS.indexOf(activeTab as (typeof DETAIL_TABS)[number]);
    if (dx < 0) {
      // 左スワイプ → 次のタブへ
      if (currentIdx === -1) {
        setSwipeDir("left");
        setActiveTab(DETAIL_TABS[0]);
      } else if (currentIdx < DETAIL_TABS.length - 1) {
        setSwipeDir("left");
        setActiveTab(DETAIL_TABS[currentIdx + 1]!);
      }
    } else {
      // 右スワイプ → 前のタブへ
      if (currentIdx === -1) {
        setSwipeDir("right");
        setActiveTab(DETAIL_TABS[DETAIL_TABS.length - 1]!);
      } else if (currentIdx > 0) {
        setSwipeDir("right");
        setActiveTab(DETAIL_TABS[currentIdx - 1]!);
      }
    }
  };

  const examByLevel = getExamPointsByLevel(country);
  const visibleExamPoints =
    examLevel === "all"
      ? [...examByLevel.junior, ...examByLevel.high, ...examByLevel.university]
      : examByLevel[examLevel];
  const examTotalCount =
    examByLevel.junior.length + examByLevel.high.length + examByLevel.university.length;

  const photo = getCountryPhoto(country.iso3, country.continent);
  const stats = useMemo(() => getCountryStats(country), [country]);
  const cLabel = continentLabel(country.continent);
  const disasterChips = useMemo(
    () => splitDisasterItems(country.geography.disasterRisk),
    [country.geography.disasterRisk],
  );

  // 日本との面積比
  const areaRatio =
    country.iso3 === "JPN"
      ? "日本全国の総面積（47都道府県）"
      : country.basic.area >= JAPAN_AREA
      ? `日本の約 ${(country.basic.area / JAPAN_AREA).toFixed(1)} 倍の国土`
      : `日本の約 ${(country.basic.area / JAPAN_AREA * 100).toFixed(1)} %（約 1/${Math.max(1, Math.round(JAPAN_AREA / Math.max(1, country.basic.area)))}）`;

  // 日本との人口比
  const popRatio =
    country.iso3 === "JPN"
      ? "日本の総人口（国内推計）"
      : country.society.population >= JAPAN_POP
      ? `日本の約 ${(country.society.population / JAPAN_POP).toFixed(1)} 倍`
      : `日本の約 ${(country.society.population / JAPAN_POP * 100).toFixed(1)} %（日本の約 1/${Math.max(1, Math.round(JAPAN_POP / Math.max(1, country.society.population)))}）`;

  return (
    <div className="flex h-full flex-col">
      {/* ホバープレビュー / 選択固定ステータスバナー（高さ統一で切替時のガタつきを防止） */}
      {isPreview ? (
        <div className="flex h-8 shrink-0 items-center justify-between px-4 bg-sky-500/10 border-b border-sky-500/20 text-sky-500 dark:text-sky-400 text-xs font-semibold">
          <span className="flex items-center gap-1.5">
            <Eye className="size-3.5 text-sky-500" />
            <span>リアルタイム・プレビュー中</span>
          </span>
          <span className="text-[11px] text-muted-foreground font-normal">
            地図をタップして固定 ➜
          </span>
        </div>
      ) : compact ? (
        <div className="flex h-8 shrink-0 items-center justify-between px-4 bg-emerald-500/10 border-b border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
          <span className="flex items-center gap-1.5">
            <Pin className="size-3.5" />
            <span>選択・固定中</span>
          </span>
          <span className="text-[10px] text-muted-foreground">学習・クイズ対象</span>
        </div>
      ) : null}

      {/* 象徴的な風景・名所写真ヒーローヘッダー */}
      <div className={cn("relative w-full overflow-hidden bg-slate-900 group shrink-0", compact ? "h-36 sm:h-40 md:h-44" : "aspect-[16/9] sm:aspect-[2/1] md:h-80 lg:h-96")}>
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

        {/* モバイル・ポップアップ用の閉じる×ボタン（快適なタッチターゲットサイズに最適化） */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="absolute top-2.5 right-2.5 z-30 flex size-9 items-center justify-center rounded-full bg-black/80 text-white backdrop-blur-md transition-all hover:bg-black active:scale-90 border border-white/30 shadow-lg cursor-pointer touch-manipulation"
          >
            <X className="size-5 stroke-[2.5]" />
          </button>
        )}

        {/* 写真グラデーション & キャプション */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-4 py-2 flex items-center justify-between text-xs text-white/95">
          <span className="font-semibold truncate drop-shadow-sm">📷 {photo.caption}</span>
          <span className="shrink-0 text-[11px] text-white/75 ml-2 font-medium bg-black/30 backdrop-blur-xs px-2 py-0.5 rounded border border-white/15">名所・世界遺産</span>
        </div>
      </div>

      <div className={cn("flex flex-wrap items-center justify-between gap-2 border-b border-border shrink-0", compact ? "px-3 py-2.5" : "p-4")}>
        <div className={cn("flex items-center justify-between gap-3 min-w-0", compact ? "w-full" : "w-full sm:w-auto")}>
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

          {/* compact時の詳細リンク（青系テキストボタン・国名行の右端に配置） */}
          {compact && (
            <Link
              to="/country/$iso3"
              params={{ iso3: country.iso3.toLowerCase() }}
              className="inline-flex items-center gap-1 py-1 px-2 rounded-md text-xs sm:text-sm font-semibold text-sky-500 hover:text-sky-600 dark:text-sky-400 dark:hover:text-sky-300 hover:bg-sky-500/10 transition-colors shrink-0 cursor-pointer ml-auto"
            >
              <span>詳細</span>
              <ExternalLink className="size-3.5" />
            </Link>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* 学習済みにするボタン */}
          <Button
            size="sm"
            variant={learned ? "default" : "outline"}
            className="h-8.5 px-2.5 sm:px-3 text-xs sm:text-sm shrink-0"
            onClick={() => toggleLearned(country.iso3)}
          >
            <Check className="size-4" />
            <span>{learned ? "学習済み" : "学習済みにする"}</span>
          </Button>

          {/* 受験ポイントボタン */}
          <Button
            size="sm"
            variant={activeTab === "exam" ? "default" : "outline"}
            className={cn(
              "h-8.5 px-2.5 sm:px-3 text-xs sm:text-sm gap-1.5 font-semibold transition-all shadow-xs shrink-0",
              activeTab === "exam"
                ? "bg-amber-500 hover:bg-amber-600 text-white border-transparent"
                : "text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700/60 hover:bg-amber-50 dark:hover:bg-amber-950/40"
            )}
            onClick={() => setActiveTab("exam")}
          >
            <GraduationCap className="size-4" />
            <span>受験ポイント</span>
          </Button>

          {/* お気に入りボタン（アイコンのみ） */}
          <Button
            size="icon"
            variant={favorite ? "secondary" : "outline"}
            className={cn(
              "size-8.5 shrink-0 transition-all",
              favorite && "border-amber-400 dark:border-amber-600 bg-amber-500/15 text-amber-500 hover:bg-amber-500/25"
            )}
            onClick={() => toggleFavorite(country.iso3)}
            title={favorite ? "お気に入り解除" : "お気に入りに追加"}
            aria-label={favorite ? "お気に入り解除" : "お気に入りに追加"}
          >
            <BookmarkCheck className={cn("size-4", favorite ? "fill-amber-500 text-amber-500" : "")} />
          </Button>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          setSwipeDir(null);
          setActiveTab(v);
        }}
        className="flex-1 min-h-0 overflow-hidden flex flex-col"
      >
        {/* レスポンシブ最適化タブナビゲーション */}
        <div
          ref={tabScrollContainerRef}
          className="overflow-x-auto px-3 sm:px-4 pt-2 pb-1.5 scrollbar-hide shrink-0"
        >
          <TabsList
            className="p-1 gap-1 rounded-2xl bg-muted/80 dark:bg-muted/40 border border-border/50 h-auto flex w-full min-w-max justify-stretch"
          >
            {(
              [
                { value: "basic", label: "基本" },
                { value: "history", label: "歴史" },
                { value: "culture", label: "文化" },
                { value: "society", label: "人口・社会" },
                { value: "economy", label: "経済" },
                { value: "military", label: "軍事" },
                { value: "geography", label: "地理" },
              ] as const
            ).map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                ref={(el) => {
                  if (el) {
                    tabTriggerRefs.current.set(tab.value, el);
                  } else {
                    tabTriggerRefs.current.delete(tab.value);
                  }
                }}
                className="flex-1 shrink-0 flex items-center justify-center min-h-[36px] sm:min-h-[38px] px-2.5 py-1.5 text-xs sm:text-sm font-semibold rounded-xl transition-all whitespace-nowrap active:scale-[0.98]"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <div
          ref={tabContentRef}
          onTouchStart={handleContentTouchStart}
          onTouchEnd={handleContentTouchEnd}
          className={cn(
            "text-sm leading-relaxed touch-pan-y",
            compact ? "flex-1 min-h-0 overflow-y-auto p-3" : "p-4 space-y-6",
            swipeDir === "left" && "animate-in fade-in slide-in-from-right-3 duration-200",
            swipeDir === "right" && "animate-in fade-in slide-in-from-left-3 duration-200",
          )}
          key={activeTab}
        >
          {/* 1. 基本タブ */}
          <TabsContent value="basic" className="mt-0 space-y-4">
            {compact ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <Row label="首都" value={country.basic.capital} />
                  <Row label="公用語・主な言語" value={country.basic.languages} />
                  <Row label="面積" value={`${nf.format(country.basic.area)} km²`} />
                  <Row label="日本との時差" value={country.basic.timeDiffFromJapan} />
                  <Row label="政治体制" value={country.basic.government} />
                  <Row label="気候・気温特性" value={country.geography.climate} />
                </div>
                <CompactBasicVisual country={country} stats={stats} />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
                    badge={`世界 ${stats.ranks.area.worldRank}位`}
                  />
                  <StatCard
                    icon={Clock}
                    label="日本との時差"
                    value={country.basic.timeDiffFromJapan}
                    subtext="日本標準時（JST）との時差"
                  />
                  <StatCard
                    icon={CloudSun}
                    label="気候・気温特性"
                    value={country.geography.climate.split("（")[0] || country.geography.climate}
                    subtext={country.geography.climate}
                    className="sm:col-span-2"
                  />
                </div>

                {/* 総合プロフィール レーダーチャート & 世界順位ポジション */}
                <div className="grid gap-4 lg:grid-cols-2">
                  <CountryProfileRadar country={country} stats={stats} isPreview={isPreview} />
                  <WorldRankBars country={country} stats={stats} />
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
              <div className="space-y-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  <Row label="人口" value={`${nf.format(country.society.population)} 人`} />
                  <Row label="人口増加率" value={`${country.society.populationGrowth} %`} />
                  <Row label="都市人口率" value={`${country.society.urbanRate} %`} />
                  <Row label="年齢の中位数" value={`${country.society.medianAge} 歳`} />
                </div>
                <CompactSocietyVisual country={country} stats={stats} />
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
                    badge={`世界 ${stats.ranks.population.worldRank}位`}
                  />
                  <StatCard
                    icon={TrendingUp}
                    label="年間人口増加率"
                    value={`${country.society.populationGrowth > 0 ? `+${country.society.populationGrowth}` : country.society.populationGrowth} %`}
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
                    badge={`世界 ${stats.ranks.urbanRate.worldRank}位`}
                  />
                  <StatCard
                    icon={Hourglass}
                    label="年齢の中位数"
                    value={`${country.society.medianAge} 歳`}
                    subtext="国民全体の若さ・高齢化水準（日本は約49歳）"
                    badge={`世界 ${stats.ranks.medianAge.worldRank}位`}
                  />
                </div>

                {/* 人口・社会 ビジュアルチャート群 */}
                <div className="grid gap-4 lg:grid-cols-2">
                  <UrbanRuralDonutChart country={country} stats={stats} isPreview={isPreview} />
                  <MedianAgeBarChart country={country} stats={stats} isPreview={isPreview} />
                  <PopulationGrowthBarChart country={country} stats={stats} isPreview={isPreview} />
                  <ContinentSharePieChart
                    title={`${cLabel}における人口シェア`}
                    subtitle={`${cLabel}（${stats.continentCount}ヵ国）の総人口に占める割合`}
                    slices={stats.continentPopPie}
                    sharePct={stats.shares.continentPopPct}
                    unitFormatter={formatCompactPop}
                    isPreview={isPreview}
                    accentColor="#0284c7"
                  />
                </div>

                <PeerRankBarChart
                  icon={Users}
                  title={`${cLabel}内の同規模国との総人口比較`}
                  subtitle={`${cLabel} ${stats.ranks.population.continentRank}位 / ${stats.continentCount}ヵ国（近傍ランク国との比較）`}
                  badge={`世界シェア ${stats.shares.worldPopPct >= 0.1 ? `${stats.shares.worldPopPct.toFixed(1)}%` : "<0.1%"}`}
                  peers={stats.peers.population}
                  unitFormatter={formatCompactPop}
                  accentColor="#0ea5e9"
                  isPreview={isPreview}
                />

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
                <CompactEconomyVisual country={country} stats={stats} />
                <CompactGdpGrowthChart country={country} />
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
                    subtext={`世界経済における生産規模（約 ${(country.economy.gdp * 150 / 10000).toFixed(1)} 兆円換算・世界シェア ${stats.shares.worldGdpPct >= 0.1 ? `${stats.shares.worldGdpPct.toFixed(1)}%` : "<0.1%"}）`}
                    badge={`世界 ${stats.ranks.gdp.worldRank}位`}
                  />
                  <StatCard
                    icon={Wallet}
                    label="1人あたりGDP"
                    value={`約 ${nf.format(country.economy.gdpPerCapita)} USドル`}
                    subtext="個人の経済水準・所得水準（日本は約34,000ドル水準）"
                    badge={`世界 ${stats.ranks.gdpPerCapita.worldRank}位`}
                  />
                </div>

                {/* 実質GDP成長率（年率 %）折れ線グラフ */}
                <GdpGrowthLineChart country={country} isPreview={isPreview} />

                {/* 経済ビジュアルチャート群 */}
                <div className="grid gap-4 lg:grid-cols-2">
                  <GdpPerCapitaComparisonChart country={country} stats={stats} isPreview={isPreview} />
                  <ContinentSharePieChart
                    title={`${cLabel}におけるGDPシェア`}
                    subtitle={`${cLabel}（${stats.continentCount}ヵ国）の経済規模に占める割合`}
                    slices={stats.continentGdpPie}
                    sharePct={stats.shares.continentGdpPct}
                    unitFormatter={formatCompactGdp}
                    isPreview={isPreview}
                    accentColor="#f59e0b"
                  />
                </div>

                <PeerRankBarChart
                  icon={Coins}
                  title={`${cLabel}内の同規模国との名目GDP比較`}
                  subtitle={`${cLabel} ${stats.ranks.gdp.continentRank}位 / ${stats.continentCount}ヵ国（近傍ランク国との比較）`}
                  badge={formatCompactGdp(country.economy.gdp)}
                  peers={stats.peers.gdp}
                  unitFormatter={formatCompactGdp}
                  accentColor="#f59e0b"
                  isPreview={isPreview}
                />

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
                <CompactMilitaryVisual country={country} stats={stats} />
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
                    value={
                      country.military.spending > 0
                        ? `約 ${nf.format(country.military.spending)} 億USドル`
                        : "計上なし（0 ドル）"
                    }
                    subtext={
                      country.military.spending > 0
                        ? `GDP比 約 ${stats.militaryGdpRatio.toFixed(2)}%（年間の防衛予算規模）`
                        : "常備軍非保持または防衛費計上なし"
                    }
                    badge={
                      country.military.spending > 0
                        ? `世界 ${stats.ranks.spending.worldRank}位`
                        : "非武装・非保持"
                    }
                  />
                  <StatCard
                    icon={Shield}
                    label="現役総兵力"
                    value={
                      country.military.activeTroops > 0
                        ? `約 ${nf.format(country.military.activeTroops)} 千人（約 ${nf.format(country.military.activeTroops * 1000)} 人）`
                        : "常備軍なし（0 人）"
                    }
                    subtext={
                      country.military.activeTroops > 0
                        ? `人口1,000人あたり約 ${stats.troopsPer1000.toFixed(1)} 人（日本は約2.0人）`
                        : "治安維持は警察・沿岸警備隊または協定国が担当"
                    }
                    badge={
                      country.military.activeTroops > 0
                        ? `世界 ${stats.ranks.activeTroops.worldRank}位`
                        : undefined
                    }
                  />
                </div>

                {/* 軍事・防衛ビジュアルチャート群（常備軍保持国のみ表示） */}
                {country.military.spending > 0 || country.military.activeTroops > 0 ? (
                  <div className="grid gap-4 lg:grid-cols-2">
                    {country.military.spending > 0 && (
                      <MilitaryGdpRatioChart country={country} stats={stats} isPreview={isPreview} />
                    )}
                    {country.military.spending > 0 && stats.peers.spending.length > 1 && (
                      <PeerRankBarChart
                        icon={ShieldAlert}
                        title={`${cLabel}内の同規模国との軍事費比較`}
                        subtitle={`${cLabel} ${stats.ranks.spending.continentRank}位（単位：億USドル）`}
                        badge={`約 ${nf.format(country.military.spending)} 億$`}
                        peers={stats.peers.spending}
                        unitFormatter={(v) => `${nf.format(v)} 億$`}
                        accentColor="#ef4444"
                        isPreview={isPreview}
                      />
                    )}
                    {country.military.activeTroops > 0 && stats.peers.activeTroops.length > 1 && (
                      <PeerRankBarChart
                        icon={Shield}
                        title={`${cLabel}内の同規模国との現役兵力比較`}
                        subtitle={`${cLabel} ${stats.ranks.activeTroops.continentRank}位（単位：千人）`}
                        badge={`約 ${nf.format(country.military.activeTroops)} 千人`}
                        peers={stats.peers.activeTroops}
                        unitFormatter={(v) => `${nf.format(v)} 千人`}
                        accentColor="#f97316"
                        isPreview={isPreview}
                        className="lg:col-span-2"
                      />
                    )}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 flex items-center gap-3 text-xs sm:text-sm">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-lg">
                      🕊️
                    </span>
                    <div>
                      <p className="font-bold text-foreground">常備軍を保持しない国家</p>
                      <p className="text-muted-foreground mt-0.5">
                        憲法や安全保障協定などに基づき常備軍を持たず、警察・沿岸警備隊や友好国との防衛協力によって安全を維持しています。
                      </p>
                    </div>
                  </div>
                )}

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
              <div className="space-y-3">
                <CompactGeographyVisual country={country} stats={stats} />
                <div className="grid gap-2 sm:grid-cols-2">
                  <Row label="気候" value={country.geography.climate} />
                  <Row label="地形" value={country.geography.terrain} />
                  <Row label="自然災害のリスク" value={country.geography.disasterRisk} />
                  <Row label="国境・周辺国" value={country.geography.borders} />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* 地理・国土スケール ビジュアルチャート群 */}
                <div className="grid gap-4 lg:grid-cols-2">
                  <ContinentSharePieChart
                    title={`${cLabel}における国土面積シェア`}
                    subtitle={`${cLabel}（${stats.continentCount}ヵ国）の総面積に占める割合`}
                    slices={stats.continentAreaPie}
                    sharePct={stats.shares.continentAreaPct}
                    unitFormatter={formatCompactArea}
                    isPreview={isPreview}
                    accentColor="#10b981"
                  />
                  <PopulationDensityBarChart country={country} stats={stats} isPreview={isPreview} />
                </div>

                <PeerRankBarChart
                  icon={Maximize2}
                  title={`${cLabel}内の同規模国との国土面積比較`}
                  subtitle={`${cLabel} ${stats.ranks.area.continentRank}位 / ${stats.continentCount}ヵ国（${areaRatio}）`}
                  badge={`世界 ${stats.ranks.area.worldRank}位`}
                  peers={stats.peers.area}
                  unitFormatter={formatCompactArea}
                  accentColor="#10b981"
                  isPreview={isPreview}
                />

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
                    {disasterChips.length >= 2 && (
                      <div className="flex flex-wrap gap-1.5">
                        {disasterChips.map((item) => (
                          <span
                            key={item}
                            className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-300"
                          >
                            <span>⚠️</span>
                            <span>{item}</span>
                          </span>
                        ))}
                      </div>
                    )}
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

          {/* 8. 受験ポイントタブ（中学・高校・大学 各10問 計30問） */}
          <TabsContent value="exam" className="mt-0 space-y-3">
            {/* シンプルな下線タブ（中学 / 高校 / 大学 / 全30問） */}
            <div className="flex items-center justify-between gap-2 border-b border-border/70">
              <div className="flex items-center gap-3 sm:gap-4 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                {EXAM_LEVELS.map((lvl) => {
                  const isActive = examLevel === lvl.id;
                  return (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() => setExamLevel(lvl.id)}
                      className={cn(
                        "relative pb-2 text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap touch-manipulation border-b-[4px] -mb-px",
                        isActive
                          ? "border-primary text-foreground"
                          : "border-transparent text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <span>{compact ? lvl.shortLabel : lvl.label}</span>
                      <span className="ml-0.5 text-xs sm:text-sm font-semibold opacity-80">
                        ({examByLevel[lvl.id].length})
                      </span>
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setExamLevel("all")}
                  className={cn(
                    "relative pb-2 text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap touch-manipulation border-b-[4px] -mb-px",
                    examLevel === "all"
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span>全{examTotalCount}問</span>
                </button>
              </div>

              <Link
                to="/quiz"
                search={{
                  country: country.iso3.toLowerCase(),
                  mode: "exam",
                  grade:
                    examLevel === "junior"
                      ? "elementary"
                      : examLevel === "high"
                        ? "junior_high"
                        : examLevel === "university"
                          ? "high_school"
                          : undefined,
                }}
                className="pb-2 text-xs text-sky-600 dark:text-sky-400 hover:underline font-bold shrink-0"
              >
                クイズで特訓 ➜
              </Link>
            </div>

            {/* 選択中レベルの簡潔な説明 */}
            <p className="text-[11px] text-muted-foreground">
              {examLevel === "all"
                ? `中学・高校・大学 全${examTotalCount}問（各10問）`
                : `${EXAM_LEVEL_MAP[examLevel].label}：${EXAM_LEVEL_MAP[examLevel].subtitle}`}
            </p>

            {compact ? (
              <div className="space-y-2.5">
                {visibleExamPoints.map((qa, idx) => (
                  <div key={`${qa.level}-${idx}-${qa.q}`} className="rounded-lg border border-border p-3">
                    <p className="font-bold text-primary text-xs sm:text-sm leading-snug">
                      Q{idx + 1}. {qa.q}
                    </p>
                    <p className="mt-1 text-xs sm:text-sm text-muted-foreground leading-snug">
                      A. {qa.a}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {visibleExamPoints.map((qa, index) => (
                  <div
                    key={`${qa.level}-${index}-${qa.q}`}
                    className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs space-y-2 hover:border-border transition-colors flex flex-col justify-between"
                  >
                    <div>
                      <span className="inline-block text-[11px] font-bold text-muted-foreground mb-1">
                        Q{index + 1}
                      </span>
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
            )}
          </TabsContent>

          {/* 出典情報 */}
          <div className={cn("border-t border-border text-xs text-muted-foreground", compact ? "mt-3 pt-2.5" : "mt-6 pt-4")}>
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
