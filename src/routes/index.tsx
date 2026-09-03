import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { CountryDetail } from "@/components/CountryDetail";
import { SiteHeader } from "@/components/SiteHeader";
import { WorldMap } from "@/components/WorldMap";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { byMapId, learnedIds, sortedCountries } from "@/data/lookup";
import { CONTINENTS, type ContinentId } from "@/data/types";
import { countries } from "@/data/countries";
import { useIsMobile } from "@/hooks/use-mobile";
import { useProgress } from "@/stores/progress";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GeoQuest — インタラクティブ世界地図で学ぶ地理・歴史" },
      {
        name: "description",
        content:
          "世界地図をクリックして各国の歴史・文化・人口・経済・地理を学べる、中高生向けの学習アプリ。クイズと比較機能で受験対策にも。",
      },
      { property: "og:title", content: "GeoQuest — インタラクティブ世界地図で学ぶ" },
      {
        property: "og:description",
        content: "地図から国を選んで学び、クイズで定着。中高生・受験生のための世界地図学習アプリ。",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const [continent, setContinent] = useState<ContinentId | "all">("all");
  const [selectedMapId, setSelectedMapId] = useState<string | undefined>();
  const learned = useProgress((s) => s.learned);
  const markLearned = useProgress((s) => s.markLearned);
  const isMobile = useIsMobile();

  const learnedSet = useMemo(() => learnedIds(learned), [learned]);
  const selected = selectedMapId ? byMapId(selectedMapId) : undefined;
  const rate = Math.round((learned.length / countries.length) * 100);

  const select = (mapId: string) => {
    setSelectedMapId(mapId);
    const c = byMapId(mapId);
    if (c) markLearned(c.iso3);
  };

  const list = continent === "all" ? sortedCountries : sortedCountries.filter((c) => c.continent === continent);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <section className="mb-5">
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

        <div className="mb-4 flex flex-wrap gap-2">
          <button
            onClick={() => setContinent("all")}
            className={cn(
              "rounded-full border border-border px-3 py-1.5 text-xs font-medium transition-colors",
              continent === "all" ? "bg-foreground text-background" : "bg-card hover:bg-secondary",
            )}
          >
            すべて
          </button>
          {CONTINENTS.map((c) => (
            <button
              key={c.id}
              onClick={() => setContinent(c.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium transition-colors",
                continent === c.id ? "bg-foreground text-background" : "bg-card hover:bg-secondary",
              )}
            >
              <span className="size-2.5 rounded-full" style={{ backgroundColor: c.colorVar }} />
              {c.label}
            </button>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
          <WorldMap
            learnedMapIds={learnedSet}
            activeContinent={continent}
            selectedId={selectedMapId}
            onSelect={select}
          />

          {!isMobile && (
            <div className="surface-card overflow-hidden">
              {selected ? (
                <CountryDetail country={selected} compact />
              ) : (
                <div className="p-6">
                  <h2 className="font-display text-lg font-bold">国を選んでください</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    地図をクリック、または下の一覧から選べます。ホイールで拡大、ドラッグで移動できます。
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {list.slice(0, 12).map((c) => (
                      <button
                        key={c.iso3}
                        onClick={() => select(c.id)}
                        className="rounded-full border border-border bg-card px-3 py-1.5 text-xs hover:bg-secondary"
                      >
                        {c.flag} {c.nameJa}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <section className="mt-8">
          <h2 className="font-display text-lg font-bold">
            国の一覧（{list.length}か国）
          </h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((c) => (
              <Link
                key={c.iso3}
                to="/country/$iso3"
                params={{ iso3: c.iso3.toLowerCase() }}
                className="surface-card flex items-center justify-between px-3 py-2.5 transition-transform hover:-translate-y-0.5"
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  <span className="text-xl">{c.flag}</span>
                  {c.nameJa}
                </span>
                {learned.includes(c.iso3) && (
                  <span className="rounded-full bg-success px-2 py-0.5 text-[10px] text-success-foreground">
                    学習済み
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
