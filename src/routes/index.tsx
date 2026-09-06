import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { CountryDetail } from "@/components/CountryDetail";
import { CountryDirectory } from "@/components/CountryDirectory";
import { FlagImage } from "@/components/FlagImage";
import { SiteHeader } from "@/components/SiteHeader";
import { WorldMap } from "@/components/WorldMap";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { byIso3, byMapId, learnedIds, sortedCountries } from "@/data/lookup";
import { CONTINENTS, continentLabel, type ContinentId, type Country } from "@/data/types";
import { countries } from "@/data/countries";
import { MICROSTATES, microstateById } from "@/data/microstates";
import { getCountryPhoto } from "@/data/countryPhotos";
import { useIsMobile } from "@/hooks/use-mobile";
import { useProgress } from "@/stores/progress";
import { cn } from "@/lib/utils";

// おすすめ主要15ヵ国（G7＋各大陸の代表的大国）
const MAJOR_COUNTRIES_ISO3 = [
  "JPN", // 日本
  "USA", // アメリカ合衆国
  "CHN", // 中国
  "GBR", // イギリス
  "FRA", // フランス
  "DEU", // ドイツ
  "ITA", // イタリア
  "CAN", // カナダ
  "AUS", // オーストラリア
  "KOR", // 韓国
  "IND", // インド
  "BRA", // ブラジル
  "EGY", // エジプト
  "ZAF", // 南アフリカ
  "RUS", // ロシア
];

// ピックアップ探検国（世界各地の魅惑的な国々）
const FEATURED_EXPLORER_ISO3S = [
  "ISL", // アイスランド（火山と氷河）
  "NZL", // ニュージーランド（大自然）
  "PER", // ペルー（マチュピチュ）
  "NOR", // ノルウェー（フィヨルド）
  "BTN", // ブータン（ヒマラヤ）
  "KEN", // ケニア（サバンナ）
  "GRC", // ギリシャ（エーゲ海・古代文明）
  "CHE", // スイス（アルプス）
  "MDV", // モルディブ（インド洋の環礁）
  "EGY", // エジプト（ピラミッド）
];

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

  const majorCountries = useMemo(() => {
    return MAJOR_COUNTRIES_ISO3.map((iso3) => byIso3(iso3)).filter((c): c is Country => !!c);
  }, []);

  const microstateCountries = useMemo(() => {
    return MICROSTATES.map((m) => byMapId(m.id)).filter((c): c is Country => !!c);
  }, []);

  const [featuredIso3, setFeaturedIso3] = useState<string>("ISL");

  // 初回表示時にランダムな国を選出
  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * countries.length);
    const c = countries[randomIndex];
    if (c) {
      setFeaturedIso3(c.iso3);
    }
  }, []);

  const featuredCountry = useMemo(() => {
    return byIso3(featuredIso3) || countries[0]!;
  }, [featuredIso3]);

  const featuredPhoto = useMemo(() => {
    return getCountryPhoto(featuredCountry.iso3, featuredCountry.continent);
  }, [featuredCountry]);

  // 次のピックアップ国をランダム選出
  const nextFeatured = () => {
    let next: Country;
    do {
      next = countries[Math.floor(Math.random() * countries.length)]!;
    } while (next.iso3 === featuredCountry.iso3 && countries.length > 1);
    setFeaturedIso3(next.iso3);
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
      <main className="mx-auto max-w-[1600px] w-full px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <section className="mb-4 sm:mb-5">
          <h1 className="font-display text-2xl font-bold sm:text-3xl tracking-tight">
            世界をタップして、学ぼう。
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed">
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
                "shrink-0 rounded-full border border-border px-3 py-1.5 text-xs font-medium transition-all active:scale-95 touch-manipulation",
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
                  "shrink-0 flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium transition-all active:scale-95 touch-manipulation",
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
                "shrink-0 flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium transition-all active:scale-95 touch-manipulation",
                filter === "microstates" ? "bg-foreground text-background" : "bg-card hover:bg-secondary",
              )}
            >
              <span>🏝️</span>
              <span>小国・島国 (32)</span>
            </button>
          </div>
        </div>

        <div className="grid gap-4 xl:gap-6 md:grid-cols-[1.15fr_1fr] lg:grid-cols-[1.25fr_1fr] md:h-[540px] lg:h-[580px] xl:h-[600px]">
          <div className="h-[380px] sm:h-[430px] md:h-full">
            <WorldMap
              learnedMapIds={learnedSet}
              activeContinent={filter}
              selectedId={selectedMapId}
              onSelect={select}
              onHover={setHoveredMapId}
            />
          </div>

            <div className="surface-card overflow-hidden h-full flex flex-col">
              {!isMobile && activeCountry ? (
                <CountryDetail country={activeCountry} compact isPreview={isPreview} />
              ) : (
                <div className="flex h-full flex-col justify-between p-3.5 sm:p-4 overflow-y-auto scrollbar-none">
                  {/* ヘッダーエリア */}
                  <div className="shrink-0">
                    <div className="flex items-center justify-between">
                      <h2 className="font-display text-base sm:text-lg font-bold tracking-tight text-foreground">
                        国を選んで学ぶ
                      </h2>
                      <span className="text-xs font-medium text-muted-foreground bg-muted/60 px-2.5 py-0.5 rounded-full border border-border/60">
                        198カ国 収録
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed line-clamp-2">
                      地図上の国をタップすると基本データが表示され、歴史・文化・受験ポイントなどの詳細を固定して学習できます。
                    </p>
                  </div>

                  {/* センターエリア：写真＋重要データ＋入試頻出ポイントをバランス良く凝縮 */}
                  <div className="my-auto py-1">
                    {/* ピックアップ探検国カード */}
                    <div
                      onClick={() => select(featuredCountry.id)}
                      className="group relative rounded-xl border border-border/80 bg-card overflow-hidden shadow-xs hover:border-primary/50 transition-all cursor-pointer"
                    >
                      <div className="relative h-24 sm:h-28 w-full overflow-hidden bg-muted">
                        <img
                          src={featuredPhoto.url}
                          alt={featuredCountry.nameJa}
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />

                        {/* トップバー */}
                        <div className="absolute top-2 inset-x-2.5 flex items-center justify-between text-white">
                          <span className="rounded bg-black/60 backdrop-blur-xs px-2 py-0.5 text-xs font-semibold text-white/95 border border-white/15 tracking-wide">
                            注目ピックアップ国
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              nextFeatured();
                            }}
                            className="rounded bg-black/60 backdrop-blur-xs px-2.5 py-0.5 text-xs font-medium text-white/90 hover:bg-black/80 transition-colors border border-white/15 cursor-pointer touch-manipulation"
                            title="別の国を表示"
                          >
                            別の国を表示
                          </button>
                        </div>

                        {/* ボトムバー：国名・首都・アクションリンク */}
                        <div className="absolute bottom-2 inset-x-2.5 flex items-end justify-between gap-2 text-white">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <FlagImage flag={featuredCountry.flag} size="sm" className="rounded shadow-xs shrink-0" />
                              <span className="font-bold text-sm sm:text-base text-white truncate drop-shadow-xs">
                                {featuredCountry.nameJa}
                              </span>
                              <span className="text-xs text-white/80 font-normal hidden sm:inline">
                                ({featuredCountry.nameEn})
                              </span>
                            </div>
                            <p className="mt-0.5 text-xs text-white/90 truncate drop-shadow-xs">
                              首都：{featuredCountry.basic.capital} ・ {continentLabel(featuredCountry.continent)}
                            </p>
                          </div>

                          <span className="shrink-0 text-xs font-semibold text-slate-900 bg-white/95 px-2.5 py-0.5 rounded shadow-xs group-hover:bg-white transition-colors">
                            詳細を見る ➜
                          </span>
                        </div>
                      </div>

                      {/* 写真下の国の特徴＆学習トピック */}
                      <div className="p-3 bg-card border-t border-border/50 space-y-2">
                        {/* 基本スペック */}
                        <div className="flex flex-wrap items-center justify-between gap-1 pb-1.5 border-b border-border/40">
                          <span className="font-bold text-xs sm:text-sm text-foreground">
                            {featuredCountry.nameJa}の基本データ
                          </span>
                          <span className="text-muted-foreground text-xs">
                            人口 約{(featuredCountry.society.population / 10000).toLocaleString()}万人 / 面積 約{featuredCountry.basic.area.toLocaleString()} km²
                          </span>
                        </div>

                        {/* クイック概要タグ */}
                        <div className="flex flex-wrap gap-1.5 text-xs">
                          <span className="rounded-md bg-secondary/80 px-2 py-0.5 text-foreground/90 font-medium">
                            <span className="text-muted-foreground mr-1">言語:</span>
                            {featuredCountry.basic.languages.split("、")[0]}
                          </span>
                          <span className="rounded-md bg-secondary/80 px-2 py-0.5 text-foreground/90 font-medium">
                            <span className="text-muted-foreground mr-1">時差:</span>
                            {featuredCountry.basic.timeDiffFromJapan}
                          </span>
                          {featuredCountry.culture.religion && (
                            <span className="rounded-md bg-secondary/80 px-2 py-0.5 text-foreground/90 font-medium">
                              <span className="text-muted-foreground mr-1">宗教:</span>
                              {featuredCountry.culture.religion.split("（")[0]?.split("、")[0]}
                            </span>
                          )}
                          {featuredCountry.basic.government && (
                            <span className="rounded-md bg-secondary/80 px-2 py-0.5 text-foreground/90 font-medium">
                              <span className="text-muted-foreground mr-1">政体:</span>
                              {featuredCountry.basic.government.split("（")[0]?.split("・")[0]}
                            </span>
                          )}
                        </div>

                        {/* 特徴リスト（地理・自然、産業・資源、文化・名物） */}
                        <div className="space-y-1.5">
                          {/* 地理・自然 */}
                          <div className="flex items-start gap-2 text-xs">
                            <span className="shrink-0 font-semibold text-muted-foreground bg-muted/80 px-2 py-0.5 rounded border border-border/50">
                              地理・自然
                            </span>
                            <span className="text-foreground/90 leading-snug line-clamp-1 sm:line-clamp-2 pt-0.5">
                              {featuredCountry.geography.climate}
                              {featuredCountry.geography.terrain && `。${featuredCountry.geography.terrain}`}
                            </span>
                          </div>

                          {/* 主要産業 & 資源 */}
                          {(featuredCountry.economy.industries.length > 0 || featuredCountry.economy.resources.length > 0) && (
                            <div className="flex items-start gap-2 text-xs">
                              <span className="shrink-0 font-semibold text-muted-foreground bg-muted/80 px-2 py-0.5 rounded border border-border/50">
                                産業・資源
                              </span>
                              <span className="text-foreground/90 leading-snug line-clamp-1 sm:line-clamp-2 pt-0.5">
                                {featuredCountry.economy.industries.length > 0 && featuredCountry.economy.industries.join("、")}
                                {featuredCountry.economy.resources.length > 0 && `（資源: ${featuredCountry.economy.resources.join("、")}）`}
                              </span>
                            </div>
                          )}

                          {/* 文化・食・世界遺産 */}
                          {(featuredCountry.culture.food || (featuredCountry.culture.heritage && featuredCountry.culture.heritage.length > 0)) && (
                            <div className="flex items-start gap-2 text-xs">
                              <span className="shrink-0 font-semibold text-muted-foreground bg-muted/80 px-2 py-0.5 rounded border border-border/50">
                                文化・名物
                              </span>
                              <span className="text-foreground/90 leading-snug line-clamp-1 sm:line-clamp-2 pt-0.5">
                                {featuredCountry.culture.food && `代表料理: ${featuredCountry.culture.food}`}
                                {featuredCountry.culture.heritage && featuredCountry.culture.heritage.length > 0 && `。世界遺産: ${featuredCountry.culture.heritage.slice(0, 2).join("、")}`}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* 入試・学習頻出Q&Aハイライト */}
                        {featuredCountry.examPoints[0] && (
                          <div className="rounded-lg border border-sky-500/25 bg-sky-500/5 p-2.5 space-y-1">
                            <div className="text-xs font-bold text-sky-600 dark:text-sky-400">
                              受験・入試頻出ポイント
                            </div>
                            <p className="text-foreground font-semibold text-xs sm:text-sm leading-snug">
                              Q. {featuredCountry.examPoints[0].q}
                            </p>
                            <p className="text-muted-foreground text-xs leading-snug pt-0.5">
                              <span className="font-bold text-emerald-600 dark:text-emerald-400">解答: </span>
                              {featuredCountry.examPoints[0].a}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* フッターエリア：主要15ヵ国 または 小国・島国32ヵ国 */}
                  <div className="border-t border-border/60 pt-2 shrink-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[11px] font-semibold text-muted-foreground">
                        {filter === "microstates"
                          ? "🏝️ 小国・島国から始める（全32ヵ国）"
                          : "主要国から始める（15ヵ国）"}
                      </p>
                      {filter === "microstates" && (
                        <span className="text-[10px] text-sky-600 dark:text-sky-400 font-medium">
                          地図上の水色ピンと連動中
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto scrollbar-thin pr-1">
                      {(filter === "microstates" ? microstateCountries : majorCountries).map((c) => (
                        <button
                          key={c.iso3}
                          onClick={() => select(c.id)}
                          className="flex items-center gap-1.5 rounded-md border border-border/70 bg-card px-2 py-0.5 text-[11px] font-medium hover:bg-secondary hover:border-primary/40 transition-colors shadow-2xs cursor-pointer"
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
          </div>

        {/* 高機能 国の一覧ディレクトリ（198か国） */}
        <CountryDirectory
          countries={countries}
          activeRegionFilter={filter}
          onRegionFilterChange={(f) => setFilter(f)}
          selectedCountryId={selectedMapId}
          onSelectCountry={(c) => {
            select(c.id);
            window.scrollTo({ top: 120, behavior: "smooth" });
          }}
          className="mt-8 sm:mt-10"
        />


        <div className="mt-8 flex flex-wrap gap-2">
          <Button asChild>
            <Link to="/quiz">クイズで確認する</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/compare">国を比較する</Link>
          </Button>
        </div>
      </main>

      <Drawer
        open={isMobile && !!selected}
        onOpenChange={(o) => {
          if (!o) setSelectedMapId(undefined);
        }}
      >
        <DrawerContent className="max-h-[88vh] overflow-hidden p-0 flex flex-col">
          <div className="flex-1 overflow-y-auto">
            {selected && (
              <CountryDetail
                country={selected}
                compact
                onClose={() => setSelectedMapId(undefined)}
              />
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
