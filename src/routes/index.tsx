import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { CountryDetail } from "@/components/CountryDetail";
import { FlagImage } from "@/components/FlagImage";
import { SiteHeader } from "@/components/SiteHeader";
import { WorldMap } from "@/components/WorldMap";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent } from "@/components/ui/sheet";
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

  const [featuredIdx, setFeaturedIdx] = useState(0);

  const featuredCountry = useMemo(() => {
    const iso3 = FEATURED_EXPLORER_ISO3S[featuredIdx % FEATURED_EXPLORER_ISO3S.length] ?? "ISL";
    return byIso3(iso3) || majorCountries[0]!;
  }, [featuredIdx, majorCountries]);

  const featuredPhoto = useMemo(() => {
    return getCountryPhoto(featuredCountry.iso3, featuredCountry.continent);
  }, [featuredCountry]);

  const nextFeatured = () => {
    setFeaturedIdx((prev) => (prev + 1) % FEATURED_EXPLORER_ISO3S.length);
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

        <div className="grid gap-4 xl:gap-6 lg:grid-cols-[1.3fr_1fr] xl:grid-cols-[1.25fr_1fr]">
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
                <div className="flex h-full flex-col justify-between p-5 sm:p-6 space-y-4">
                  {/* ヘッダーエリア：アイコンを廃止し、タイポグラフィで端正に表現 */}
                  <div>
                    <div className="flex items-center justify-between">
                      <h2 className="font-display text-lg sm:text-xl font-bold tracking-tight text-foreground">
                        国を選んで学ぶ
                      </h2>
                      <span className="text-[11px] font-medium text-muted-foreground bg-muted/60 px-2.5 py-0.5 rounded-full border border-border/60">
                        198カ国 収録
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      地図上の国にカーソルを合わせると基本データが表示され、クリックすると歴史年表・文化・経済・受験ポイントなどの詳細を固定して学習できます。
                    </p>
                  </div>

                  {/* センターエリア：アイコンを排除し、写真＋知的な注目ポイント＋クリーンな統計数値で構成 */}
                  <div className="flex-1 my-1 flex flex-col justify-center space-y-3">
                    {/* ピックアップ探検国カード */}
                    <div
                      onClick={() => select(featuredCountry.id)}
                      className="group relative rounded-xl border border-border/80 bg-card overflow-hidden shadow-xs hover:border-primary/50 transition-all cursor-pointer"
                    >
                      <div className="relative h-32 sm:h-36 w-full overflow-hidden bg-muted">
                        <img
                          src={featuredPhoto.url}
                          alt={featuredCountry.nameJa}
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />

                        {/* トップバー：テキストのみの洗練されたバッジ ＆ 切り替えボタン */}
                        <div className="absolute top-2.5 inset-x-3 flex items-center justify-between text-white">
                          <span className="rounded-md bg-black/60 backdrop-blur-xs px-2 py-0.5 text-[10px] font-semibold text-white/95 border border-white/15 tracking-wide">
                            注目ピックアップ国
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              nextFeatured();
                            }}
                            className="rounded-md bg-black/60 backdrop-blur-xs px-2 py-0.5 text-[10px] font-medium text-white/90 hover:bg-black/80 transition-colors border border-white/15 cursor-pointer"
                            title="別の国を表示"
                          >
                            別の国を表示
                          </button>
                        </div>

                        {/* ボトムバー：国名・首都・アクションリンク */}
                        <div className="absolute bottom-2.5 inset-x-3 flex items-end justify-between gap-2 text-white">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <FlagImage flag={featuredCountry.flag} size="sm" className="rounded shadow-xs shrink-0" />
                              <span className="font-bold text-sm sm:text-base text-white truncate drop-shadow-xs">
                                {featuredCountry.nameJa}
                              </span>
                              <span className="text-[11px] text-white/80 font-normal hidden sm:inline">
                                ({featuredCountry.nameEn})
                              </span>
                            </div>
                            <p className="mt-0.5 text-[11px] text-white/85 truncate drop-shadow-xs">
                              首都：{featuredCountry.basic.capital} ・ {continentLabel(featuredCountry.continent)}
                            </p>
                          </div>

                          <span className="shrink-0 text-[11px] font-semibold text-slate-900 bg-white/95 px-2.5 py-1 rounded-md shadow-xs group-hover:bg-white transition-colors">
                            詳細を見る
                          </span>
                        </div>
                      </div>

                      {/* 写真下の知的なハイライトコラム（アイコンなし、テキストの質で魅せる） */}
                      <div className="p-2.5 px-3 bg-card border-t border-border/50 space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-foreground">
                            {featuredCountry.nameJa}の学習トピック
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            人口 約{(featuredCountry.society.population / 10000).toLocaleString()}万人 / 面積 約{featuredCountry.basic.area.toLocaleString()} km²
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                          {featuredCountry.examPoints[0]?.q
                            ? `ポイント：${featuredCountry.examPoints[0].q}`
                            : featuredCountry.history.founding || featuredCountry.geography.terrain}
                        </p>
                      </div>
                    </div>

                    {/* 3つのスタッツ・数値指標（絵文字やアイコンを排し、タイポグラフィと数字で知的でモダンに表現） */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-lg border border-border/70 bg-muted/20 p-2 text-center">
                        <span className="text-base font-bold text-foreground tracking-tight block">360°</span>
                        <span className="text-[10px] text-muted-foreground font-medium block mt-0.5">3D地球儀・地図連動</span>
                      </div>
                      <div className="rounded-lg border border-border/70 bg-muted/20 p-2 text-center">
                        <span className="text-base font-bold text-foreground tracking-tight block">7分野</span>
                        <span className="text-[10px] text-muted-foreground font-medium block mt-0.5">歴史・文化・経済等</span>
                      </div>
                      <div className="rounded-lg border border-border/70 bg-muted/20 p-2 text-center">
                        <span className="text-base font-bold text-foreground tracking-tight block">1,980問</span>
                        <span className="text-[10px] text-muted-foreground font-medium block mt-0.5">入試ポイント完備</span>
                      </div>
                    </div>
                  </div>

                  {/* フッターエリア：主要15ヵ国 */}
                  <div className="border-t border-border/60 pt-3">
                    <p className="text-xs font-semibold text-muted-foreground mb-2">
                      主要国から始める（15ヵ国）
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {majorCountries.map((c) => (
                        <button
                          key={c.iso3}
                          onClick={() => select(c.id)}
                          className="flex items-center gap-1.5 rounded-md border border-border/70 bg-card px-2.5 py-1 text-xs font-medium hover:bg-secondary hover:border-primary/40 transition-colors shadow-2xs cursor-pointer"
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
