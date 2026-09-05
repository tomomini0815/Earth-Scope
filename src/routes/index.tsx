import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { CountryDetail } from "@/components/CountryDetail";
import { FlagImage } from "@/components/FlagImage";
import { SiteHeader } from "@/components/SiteHeader";
import { WorldMap } from "@/components/WorldMap";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { byMapId, learnedIds, sortedCountries } from "@/data/lookup";
import { CONTINENTS, type ContinentId } from "@/data/types";
import { countries } from "@/data/countries";
import { MICROSTATES, microstateById } from "@/data/microstates";
import { useIsMobile } from "@/hooks/use-mobile";
import { useProgress } from "@/stores/progress";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EarthScope (ES) — インタラクティブ世界地図で学ぶ地理・歴史" },
      {
        name: "description",
        content:
          "世界地図をクリックして各国の歴史・文化・人口・経済・地理・入試ポイントを学べる EarthScope (ES)。クイズと比較機能で学習・受験対策に最適。",
      },
      { property: "og:title", content: "EarthScope (ES) — インタラクティブ世界地図で学ぶ" },
      {
        property: "og:description",
        content: "地図から国を選んで学び、クイズで定着。全世界198ヵ国の世界地図学習プラットフォーム EarthScope。",
      },
    ],
  }),
  component: Index,
});

type FilterType = ContinentId | "all" | "microstates";

function Index() {
  const [filter, setFilter] = useState<FilterType>("all");
  const [selectedMapId, setSelectedMapId] = useState<string | undefined>();
  const [hoveredMapId, setHoveredMapId] = useState<string | undefined>();
  const learned = useProgress((s) => s.learned);
  const markLearned = useProgress((s) => s.markLearned);
  const isMobile = useIsMobile();

  const learnedSet = useMemo(() => learnedIds(learned), [learned]);
  const selected = selectedMapId ? byMapId(selectedMapId) : undefined;
  const hoveredCountry = hoveredMapId ? byMapId(hoveredMapId) : undefined;
  // ホバーした国を優先してリアルタイムプレビュー表示（マウスが外れたら選択中の国に戻る）
  const activeCountry = hoveredCountry ?? selected;
  const isPreview = !!hoveredCountry && hoveredCountry.id !== selectedMapId;

  const rate = Math.round((learned.length / countries.length) * 100);

  const select = (mapId: string) => {
    setSelectedMapId(mapId);
  };

  const list = useMemo(() => {
    if (filter === "microstates") {
      return MICROSTATES.map((m) => byMapId(m.id)).filter(Boolean) as typeof sortedCountries;
    }
    return filter === "all" ? sortedCountries : sortedCountries.filter((c) => c.continent === filter);
  }, [filter]);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-4 sm:py-6">
        <section className="mb-4 sm:mb-5">
          <h1 className="font-display text-2xl font-bold sm:text-3xl">
            世界をクリックして、学ぼう。
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            地図から国を選ぶと、歴史・文化・人口・経済・地理のデータが読めます。学習済みの国は緑色になります。
          </p>
          <div className="mt-3 flex max-w-md items-center gap-3">
            <Progress value={rate} className="h-2" />
            <span className="whitespace-nowrap text-xs text-muted-foreground">
              {learned.length} / {countries.length} か国（{rate}%）
            </span>
          </div>
        </section>

        {/* 大陸 & 小国フィルター — モバイルで横スクロール、デスクトップでラップ */}
        <div className="mb-4 -mx-4 sm:mx-0">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4 sm:px-0 pb-1 sm:pb-0 sm:flex-wrap">
            <button
              onClick={() => setFilter("all")}
              className={cn(
                "shrink-0 rounded-full border border-border px-3 py-1.5 text-xs font-medium transition-colors",
                filter === "all" ? "bg-foreground text-background" : "bg-card hover:bg-secondary",
              )}
            >
              すべて
            </button>
            {CONTINENTS.map((c) => (
              <button
                key={c.id}
                onClick={() => setFilter(c.id)}
                className={cn(
                  "shrink-0 flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium transition-colors",
                  filter === c.id ? "bg-foreground text-background" : "bg-card hover:bg-secondary",
                )}
              >
                <span className="size-2.5 rounded-full" style={{ backgroundColor: c.colorVar }} />
                {c.label}
              </button>
            ))}
            {/* 小国・島国専用フィルター */}
            <button
              onClick={() => setFilter("microstates")}
              className={cn(
                "shrink-0 flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all shadow-sm",
                filter === "microstates"
                  ? "border-sky-500 bg-sky-500 text-white shadow-sky-500/20"
                  : "border-sky-500/30 bg-sky-950/20 text-sky-400 hover:bg-sky-900/30",
              )}
            >
              <span>🏝️</span>
              <span>小国・島国 (32)</span>
            </button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
          <WorldMap
            learnedMapIds={learnedSet}
            activeContinent={filter === "microstates" ? "all" : filter}
            selectedId={selectedMapId}
            onSelect={select}
            onHover={setHoveredMapId}
          />

          {!isMobile && (
            <div className="surface-card overflow-hidden">
              {activeCountry ? (
                <CountryDetail country={activeCountry} compact isPreview={isPreview} />
              ) : (
                <div className="flex h-full flex-col justify-between p-6">
                  <div>
                    <div className="flex items-center gap-2 text-sky-500 mb-2">
                      <span className="text-xl">✨</span>
                      <span className="text-xs font-semibold uppercase tracking-wider">インタラクティブ探索</span>
                    </div>
                    <h2 className="font-display text-xl font-bold">国を選んで学ぶ</h2>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                      地図や地球儀上の国にカーソルを合わせると、リアルタイムにその国の風景写真・基本データがここに表示されます。
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground/80 leading-relaxed">
                      クリックすると詳細情報（歴史年表・文化・経済・受験ポイント）を固定して学習できます。
                    </p>
                  </div>

                  <div className="mt-6 border-t border-border/60 pt-4">
                    <p className="text-xs font-semibold text-muted-foreground mb-2.5">
                      おすすめの国から始める
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {list.slice(0, 12).map((c) => (
                        <button
                          key={c.iso3}
                          onClick={() => select(c.id)}
                          className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-secondary hover:border-sky-500/40 transition-colors shadow-xs"
                        >
                          <FlagImage flag={c.flag} size="xs" />
                          <span>{c.nameJa}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <section className="mt-6 sm:mt-8">
          <h2 className="font-display text-lg font-bold">
            国の一覧（{list.length}か国）
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((c) => (
              <Link
                key={c.iso3}
                to="/country/$iso3"
                params={{ iso3: c.iso3.toLowerCase() }}
                className="surface-card flex items-center justify-between px-3 py-2.5 transition-transform hover:-translate-y-0.5 active:scale-[0.98]"
              >
                <span className="flex items-center gap-2 text-sm font-medium min-w-0">
                  <FlagImage flag={c.flag} size="sm" />
                  <span className="truncate">{c.nameJa}</span>
                </span>
                {learned.includes(c.iso3) && (
                  <span className="ml-1 shrink-0 rounded-full bg-success px-1.5 py-0.5 text-[9px] font-bold text-success-foreground">
                    ✓
                  </span>
                )}
              </Link>
            ))}
          </div>
        </section>


        <div className="mt-8 flex flex-wrap gap-2">
          <Button asChild>
            <Link to="/quiz">クイズで確認する</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/compare">国を比較する</Link>
          </Button>
        </div>
      </main>

      <Sheet open={isMobile && !!selected} onOpenChange={(o) => !o && setSelectedMapId(undefined)}>
        <SheetContent side="bottom" className="max-h-[88vh] overflow-y-auto p-0">
          {selected && <CountryDetail country={selected} compact />}
        </SheetContent>
      </Sheet>
    </div>
  );
}
