import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowUpDown,
  BookmarkCheck,
  Check,
  CheckCircle2,
  ChevronRight,
  Compass,
  ExternalLink,
  Filter,
  Grid2X2,
  Heart,
  HelpCircle,
  LayoutGrid,
  List,
  MapPin,
  RotateCcw,
  Search,
  Sparkles,
  Table as TableIcon,
  Users,
  X,
} from "lucide-react";

import { FlagImage } from "@/components/FlagImage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { continentLabel, CONTINENTS, type ContinentId, type Country } from "@/data/types";
import { MICROSTATES } from "@/data/microstates";
import { useProgress } from "@/stores/progress";
import { cn } from "@/lib/utils";

export type RegionFilter = ContinentId | "all" | "microstates";
type StatusFilter = "all" | "unlearned" | "learned" | "favorite";
type ViewMode = "grid" | "table" | "compact";
type SortOption =
  | "name"
  | "pop-desc"
  | "pop-asc"
  | "area-desc"
  | "area-asc"
  | "gdp-desc"
  | "unlearned-first";

interface CountryDirectoryProps {
  countries: Country[];
  activeRegionFilter?: RegionFilter | undefined;
  onRegionFilterChange?: ((filter: RegionFilter) => void) | undefined;
  selectedCountryId?: string | undefined;
  onSelectCountry?: ((country: Country) => void) | undefined;
  className?: string | undefined;
}

// 数値フォーマットヘルパー
function formatPopulation(pop: number): string {
  if (pop >= 100000000) {
    return `${(pop / 100000000).toFixed(1)}億人`;
  }
  if (pop >= 10000) {
    return `${Math.round(pop / 10000).toLocaleString("ja-JP")}万人`;
  }
  return `${pop.toLocaleString("ja-JP")}人`;
}

function formatArea(area: number): string {
  if (area >= 10000) {
    return `${(area / 10000).toFixed(1)}万 km²`;
  }
  return `${area.toLocaleString("ja-JP")} km²`;
}

function formatGdp(gdpOkuUsd?: number): string {
  if (gdpOkuUsd === undefined || gdpOkuUsd === null) return "-";
  if (gdpOkuUsd >= 10000) {
    return `$${(gdpOkuUsd / 10000).toFixed(1)}兆`;
  }
  if (gdpOkuUsd >= 1) {
    return `$${gdpOkuUsd.toLocaleString()}億`;
  }
  return `$${gdpOkuUsd}億`;
}

export function CountryDirectory({
  countries,
  activeRegionFilter,
  onRegionFilterChange,
  selectedCountryId,
  onSelectCountry,
  className = "",
}: CountryDirectoryProps) {
  const { learned, favorites, toggleLearned, toggleFavorite } = useProgress();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [continentFilter, setContinentFilter] = useState<RegionFilter>(activeRegionFilter ?? "all");
  const [sortBy, setSortBy] = useState<SortOption>("name");
  const [viewMode, setViewMode] = useState<ViewMode>("compact");

  // 親コンポーネント（上のタブ）でフィルターが切り替わった場合に同期
  useEffect(() => {
    if (activeRegionFilter !== undefined) {
      setContinentFilter(activeRegionFilter);
    }
  }, [activeRegionFilter]);

  const handleContinentChange = (val: RegionFilter) => {
    setContinentFilter(val);
    onRegionFilterChange?.(val);
  };

  // フィルタリングとソート
  const filteredCountries = useMemo(() => {
    let list = [...countries];

    // 1. 検索フィルター
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (c) =>
          c.nameJa.toLowerCase().includes(q) ||
          c.nameEn.toLowerCase().includes(q) ||
          c.iso3.toLowerCase().includes(q) ||
          c.basic.capital.toLowerCase().includes(q) ||
          c.basic.languages.toLowerCase().includes(q),
      );
    }

    // 2. 大陸・小国フィルター
    if (continentFilter === "microstates") {
      const msSet = new Set(MICROSTATES.map((m) => m.id));
      list = list.filter((c) => msSet.has(c.id));
    } else if (continentFilter !== "all") {
      list = list.filter((c) => c.continent === continentFilter);
    }

    // 3. 学習ステータスフィルター
    if (statusFilter === "learned") {
      list = list.filter((c) => learned.includes(c.iso3));
    } else if (statusFilter === "unlearned") {
      list = list.filter((c) => !learned.includes(c.iso3));
    } else if (statusFilter === "favorite") {
      list = list.filter((c) => favorites.includes(c.iso3));
    }

    // 4. ソート
    list.sort((a, b) => {
      switch (sortBy) {
        case "pop-desc":
          return b.society.population - a.society.population;
        case "pop-asc":
          return a.society.population - b.society.population;
        case "area-desc":
          return b.basic.area - a.basic.area;
        case "area-asc":
          return a.basic.area - b.basic.area;
        case "gdp-desc":
          return (b.economy.gdp ?? 0) - (a.economy.gdp ?? 0);
        case "unlearned-first": {
          const aLearned = learned.includes(a.iso3);
          const bLearned = learned.includes(b.iso3);
          if (aLearned === bLearned) return a.nameJa.localeCompare(b.nameJa, "ja");
          return aLearned ? 1 : -1;
        }
        case "name":
        default:
          return a.nameJa.localeCompare(b.nameJa, "ja");
      }
    });

    return list;
  }, [countries, searchQuery, continentFilter, statusFilter, sortBy, learned, favorites]);

  // フィルターリセット
  const resetFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setContinentFilter("all");
    setSortBy("name");
  };

  const hasActiveFilters =
    searchQuery !== "" || statusFilter !== "all" || continentFilter !== "all" || sortBy !== "name";

  return (
    <section className={`space-y-4 ${className}`}>
      {/* セクションヘッダー */}
      <div>
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
          <Compass className="size-3.5" />
          <span>COUNTRY DIRECTORY</span>
        </div>

        <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-0.5">
          全世界 探検ディレクトリ
        </h2>

        <p className="text-xs text-muted-foreground mt-1">
          人口・面積・GDPでの並び替えや、未学習・お気に入りでの絞り込みが可能です。
        </p>
      </div>

      {/* 検索 & フィルターコントロールバー */}
      <div className="surface-card p-4 sm:p-5 rounded-2xl border border-border/80 space-y-3.5 shadow-2xs">
        <div className="flex flex-col lg:flex-row gap-2.5">
          {/* 1. リアルタイム検索バー */}
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="国名・英語名・首都・ISOコードで検索..."
              className="pl-9 pr-8 h-10 text-base sm:text-sm bg-background/80"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          {/* 2. 大陸 & 小国セレクター */}
          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            {/* 2. 大陸 & 小国セレクター */}
            <div className="flex-1 sm:flex-initial sm:w-[175px]">
              <Select
                value={continentFilter}
                onValueChange={(val) => handleContinentChange(val as RegionFilter)}
              >
                <SelectTrigger className="h-10 text-base sm:text-sm bg-background/80">
                  <SelectValue placeholder="地域・小国で絞り込み" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて（198か国）</SelectItem>
                  <SelectItem value="microstates">🏝️ 小国・島国 (32か国)</SelectItem>
                  {CONTINENTS.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.label} ({countries.filter((x) => x.continent === c.id).length}か国)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 3. ソートセレクター */}
            <div className="flex-1 sm:flex-initial sm:w-[175px]">
              <Select value={sortBy} onValueChange={(val) => setSortBy(val as SortOption)}>
                <SelectTrigger className="h-10 text-base sm:text-sm bg-background/80">
                  <SelectValue placeholder="並び替え" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">五十音順（あいうえお）</SelectItem>
                  <SelectItem value="unlearned-first">未学習の国を優先</SelectItem>
                  <SelectItem value="pop-desc">人口が多い順 ⬇</SelectItem>
                  <SelectItem value="pop-asc">人口が少ない順 ⬆</SelectItem>
                  <SelectItem value="area-desc">面積が広い順 ⬇</SelectItem>
                  <SelectItem value="area-asc">面積が狭い順 ⬆</SelectItem>
                  <SelectItem value="gdp-desc">名目GDPが大きい順 ⬇</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 4. 表示形式切り替えタブ */}
            <div className="flex items-center gap-1 shrink-0 bg-muted/70 p-1 rounded-xl border border-border/80 h-10">
              <Button
                size="sm"
                variant={viewMode === "compact" ? "default" : "ghost"}
                className="size-8 p-0 cursor-pointer touch-manipulation"
                onClick={() => setViewMode("compact")}
                title="簡易表示（コンパクト一覧）"
              >
                <List className="size-4" />
              </Button>
              <Button
                size="sm"
                variant={viewMode === "table" ? "default" : "ghost"}
                className="size-8 p-0 cursor-pointer touch-manipulation"
                onClick={() => setViewMode("table")}
                title="統計テーブル表示"
              >
                <TableIcon className="size-4" />
              </Button>
              <Button
                size="sm"
                variant={viewMode === "grid" ? "default" : "ghost"}
                className="size-8 p-0 cursor-pointer touch-manipulation"
                onClick={() => setViewMode("grid")}
                title="カードグリッド表示"
              >
                <LayoutGrid className="size-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* ステータスフィルタータブ ＆ 件数カウンター */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-border/60">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-muted-foreground mr-1">状態:</span>
            <Button
              size="sm"
              variant={statusFilter === "all" ? "default" : "outline"}
              className="h-7 px-2.5 text-xs rounded-lg"
              onClick={() => setStatusFilter("all")}
            >
              すべて ({countries.length})
            </Button>
            <Button
              size="sm"
              variant={statusFilter === "unlearned" ? "default" : "outline"}
              className="h-7 px-2.5 text-xs rounded-lg"
              onClick={() => setStatusFilter("unlearned")}
            >
              未学習 ({countries.length - learned.length})
            </Button>
            <Button
              size="sm"
              variant={statusFilter === "learned" ? "default" : "outline"}
              className="h-7 px-2.5 text-xs rounded-lg"
              onClick={() => setStatusFilter("learned")}
            >
              <Check className="size-3 mr-1 text-emerald-500" />
              学習済み ({learned.length})
            </Button>
            <Button
              size="sm"
              variant={statusFilter === "favorite" ? "default" : "outline"}
              className="h-7 px-2.5 text-xs rounded-lg"
              onClick={() => setStatusFilter("favorite")}
            >
              <BookmarkCheck className="size-3 mr-1 text-amber-500" />
              お気に入り ({favorites.length})
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">
              表示: <strong className="text-foreground">{filteredCountries.length}</strong> /{" "}
              {countries.length} か国
            </span>
            {hasActiveFilters && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
                onClick={resetFilters}
              >
                <RotateCcw className="size-3" />
                リセット
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 国の一覧表示エリア */}
      {filteredCountries.length === 0 ? (
        <div className="py-12 text-center rounded-2xl border border-dashed border-border bg-card/50">
          <HelpCircle className="mx-auto size-10 text-muted-foreground mb-2 opacity-50" />
          <p className="text-sm font-bold text-foreground">条件に一致する国が見つかりませんでした</p>
          <p className="text-xs text-muted-foreground mt-1">
            検索キーワードやフィルター条件を変更してお試しください。
          </p>
          <Button size="sm" variant="outline" className="mt-4 text-xs" onClick={resetFilters}>
            フィルターをリセット
          </Button>
        </div>
      ) : viewMode === "grid" ? (
        /* 1. リッチカードグリッド表示 */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
          {filteredCountries.map((c) => {
            const isLearned = learned.includes(c.iso3);
            const isFavorite = favorites.includes(c.iso3);
            const isSelected = selectedCountryId === c.id || selectedCountryId === c.iso3;

            return (
              <div
                key={c.iso3}
                className={cn(
                  "group relative rounded-2xl border bg-card p-3.5 transition-all duration-200 hover:-translate-y-1 hover:shadow-md hover:border-primary/50 flex flex-col justify-between",
                  isSelected
                    ? "border-sky-500 bg-sky-500/5 ring-2 ring-sky-500/20"
                    : "border-border/80",
                )}
              >
                <div>
                  {/* ヘッダー: 国旗 ＆ 国名 ＆ 大陸バッジ */}
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FlagImage
                        flag={c.flag}
                        size="sm"
                        className="rounded shadow-xs shrink-0 group-hover:scale-105 transition-transform"
                      />
                      <div className="min-w-0">
                        <h3 className="font-bold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                          {c.nameJa}
                        </h3>
                        <p className="text-[10px] text-muted-foreground truncate">{c.nameEn}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0 font-normal px-1.5 py-0">
                      {continentLabel(c.continent)}
                    </Badge>
                  </div>

                  {/* 統計ミニグリッド */}
                  <div className="grid grid-cols-2 gap-1.5 py-2 border-y border-border/50 text-[11px]">
                    <div>
                      <span className="text-muted-foreground text-[10px] block">首都</span>
                      <span className="font-medium text-foreground truncate block">
                        {c.basic.capital || "-"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-[10px] block">人口</span>
                      <span className="font-medium text-foreground truncate block">
                        {formatPopulation(c.society.population)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-[10px] block">面積</span>
                      <span className="font-medium text-foreground truncate block">
                        {formatArea(c.basic.area)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-[10px] block">名目GDP</span>
                      <span className="font-medium text-foreground truncate block">
                        {formatGdp(c.economy.gdp)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* アクションフッター */}
                <div className="mt-3 flex items-center justify-between gap-2 pt-1">
                  {/* ワンクリックトグル群 */}
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant={isLearned ? "default" : "outline"}
                      className={cn(
                        "size-7 rounded-lg transition-colors",
                        isLearned
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                      onClick={() => toggleLearned(c.iso3)}
                      title={isLearned ? "学習済み（タップで解除）" : "未学習（タップで学習済みにする）"}
                    >
                      <Check className="size-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant={isFavorite ? "secondary" : "outline"}
                      className={cn(
                        "size-7 rounded-lg transition-colors",
                        isFavorite && "border-amber-400 bg-amber-500/15 text-amber-500",
                      )}
                      onClick={() => toggleFavorite(c.iso3)}
                      title={isFavorite ? "お気に入り中（タップで解除）" : "お気に入りに追加"}
                    >
                      <BookmarkCheck className="size-3.5" />
                    </Button>
                  </div>

                  {/* 遷移・選択ボタン */}
                  <div className="flex items-center gap-1.5">
                    {onSelectCountry && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs text-sky-600 dark:text-sky-400 hover:bg-sky-500/10"
                        onClick={() => onSelectCountry(c)}
                      >
                        地図で見る
                      </Button>
                    )}
                    <Button size="sm" variant="secondary" className="h-7 px-2.5 text-xs font-semibold" asChild>
                      <Link to="/country/$iso3" params={{ iso3: c.iso3.toLowerCase() }}>
                        詳細
                        <ChevronRight className="size-3 ml-0.5" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : viewMode === "table" ? (
        /* 2. 統計テーブル表示 */
        <div className="surface-card rounded-2xl border border-border/80 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[660px] text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/70 text-muted-foreground font-semibold">
                  <th className="py-2.5 px-3.5 sticky left-0 z-20 bg-muted whitespace-nowrap border-r border-border/60 shadow-[1px_0_0_0_hsl(var(--border))] w-[230px] min-w-[210px] max-w-[240px]">
                    国名（首都・地域）
                  </th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap w-[95px] min-w-[90px]">人口</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap w-[105px] min-w-[100px]">面積</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap w-[105px] min-w-[100px]">名目GDP</th>
                  <th className="py-2.5 px-3 text-center whitespace-nowrap w-[75px] min-w-[70px]">状態</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap w-[75px] min-w-[70px]">詳細</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredCountries.map((c) => {
                  const isLearned = learned.includes(c.iso3);
                  const isFavorite = favorites.includes(c.iso3);

                  return (
                    <tr
                      key={c.iso3}
                      className="hover:bg-muted/40 transition-colors group cursor-pointer"
                      onClick={() => onSelectCountry?.(c)}
                    >
                      <td className="py-2.5 px-3.5 font-medium text-foreground sticky left-0 z-10 bg-card group-hover:bg-secondary transition-colors whitespace-nowrap border-r border-border/60 shadow-[1px_0_0_0_hsl(var(--border))] w-[230px] min-w-[210px] max-w-[240px]">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <FlagImage flag={c.flag} size="xs" className="rounded-xs shrink-0" />
                          <div className="min-w-0 flex-1 overflow-hidden">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-xs leading-tight group-hover:text-primary transition-colors truncate">
                                {c.nameJa}
                              </span>
                              <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-normal whitespace-nowrap shrink-0">
                                {continentLabel(c.continent)}
                              </Badge>
                            </div>
                            <p className="text-[10px] text-muted-foreground truncate mt-0.5" title={`首都: ${c.basic.capital || "-"} · ${c.nameEn}`}>
                              <span>首都: {c.basic.capital ? c.basic.capital.split("（")[0]!.split("(")[0]!.trim() : "-"}</span>
                              <span className="mx-1 text-muted-foreground/40">·</span>
                              <span>{c.nameEn}</span>
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-foreground/90 whitespace-nowrap w-[95px] min-w-[90px]">
                        {formatPopulation(c.society.population)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-foreground/90 whitespace-nowrap w-[105px] min-w-[100px]">
                        {formatArea(c.basic.area)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-foreground/90 whitespace-nowrap w-[105px] min-w-[100px]">
                        {formatGdp(c.economy.gdp)}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap w-[75px] min-w-[70px]" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => toggleLearned(c.iso3)}
                            className={cn(
                              "p-1 rounded-md transition-colors cursor-pointer touch-manipulation",
                              isLearned
                                ? "text-emerald-500 hover:bg-emerald-500/10"
                                : "text-muted-foreground/40 hover:text-muted-foreground",
                            )}
                            title={isLearned ? "学習済み" : "未学習"}
                          >
                            <CheckCircle2 className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleFavorite(c.iso3)}
                            className={cn(
                              "p-1 rounded-md transition-colors cursor-pointer touch-manipulation",
                              isFavorite
                                ? "text-amber-500 hover:bg-amber-500/10"
                                : "text-muted-foreground/40 hover:text-muted-foreground",
                            )}
                            title={isFavorite ? "お気に入り中" : "お気に入り追加"}
                          >
                            <BookmarkCheck className="size-4" />
                          </button>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap w-[75px] min-w-[70px]" onClick={(e) => e.stopPropagation()}>
                        <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px] font-semibold cursor-pointer touch-manipulation" asChild>
                          <Link to="/country/$iso3" params={{ iso3: c.iso3.toLowerCase() }}>
                            詳細
                            <ExternalLink className="size-3 ml-1" />
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* 3. コンパクトチップ一覧表示 */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {filteredCountries.map((c) => {
            const isLearned = learned.includes(c.iso3);

            return (
              <Link
                key={c.iso3}
                to="/country/$iso3"
                params={{ iso3: c.iso3.toLowerCase() }}
                className={cn(
                  "surface-card flex items-center justify-between gap-1.5 p-2 rounded-xl transition-all hover:-translate-y-0.5 hover:shadow-xs group",
                  isLearned && "border-emerald-500/30 bg-emerald-500/5",
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FlagImage flag={c.flag} size="xs" className="rounded-xs shrink-0" />
                  <div className="min-w-0">
                    <p className="font-semibold text-xs text-foreground truncate group-hover:text-primary transition-colors">
                      {c.nameJa}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">{c.basic.capital}</p>
                  </div>
                </div>
                {isLearned && (
                  <span className="size-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] shrink-0">
                    ✓
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
