import { Link } from "@tanstack/react-router";
import { BookmarkCheck, Check, ExternalLink } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { continentLabel, type Country } from "@/data/types";
import { useProgress } from "@/stores/progress";

const nf = new Intl.NumberFormat("ja-JP");

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg bg-muted/60 px-3 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
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

export function CountryDetail({ country, compact }: { country: Country; compact?: boolean }) {
  const learned = useProgress((s) => s.learned.includes(country.iso3));
  const favorite = useProgress((s) => s.favorites.includes(country.iso3));
  const toggleLearned = useProgress((s) => s.toggleLearned);
  const toggleFavorite = useProgress((s) => s.toggleFavorite);

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border p-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-3xl leading-none">{country.flag}</span>
            <div>
              <h2 className="font-display text-xl font-bold leading-tight">{country.nameJa}</h2>
              <p className="text-xs text-muted-foreground">{country.nameEn}</p>
            </div>
          </div>
          <Badge className="mt-2" variant="outline">
            {continentLabel(country.continent)}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2">
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

      <Tabs defaultValue="basic" className="flex-1 overflow-hidden">
        <div className="overflow-x-auto px-4 pt-3">
          <TabsList className="w-max">
            <TabsTrigger value="basic">基本</TabsTrigger>
            <TabsTrigger value="history">歴史</TabsTrigger>
            <TabsTrigger value="culture">文化</TabsTrigger>
            <TabsTrigger value="society">人口・社会</TabsTrigger>
            <TabsTrigger value="economy">経済</TabsTrigger>
            <TabsTrigger value="military">軍事</TabsTrigger>
            <TabsTrigger value="geography">地理</TabsTrigger>
            <TabsTrigger value="exam">受験ポイント</TabsTrigger>
          </TabsList>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-4 text-sm leading-relaxed">
          <TabsContent value="basic" className="grid gap-2 sm:grid-cols-2">
            <Row label="首都" value={country.basic.capital} />
            <Row label="公用語・主な言語" value={country.basic.languages} />
            <Row label="面積" value={`${nf.format(country.basic.area)} km²`} />
            <Row label="日本との時差" value={country.basic.timeDiffFromJapan} />
            <Row label="政治体制" value={country.basic.government} />
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <p>{country.history.founding}</p>
            <ol className="space-y-2 border-l-2 border-primary/40 pl-4">
              {country.history.timeline.map((t) => (
                <li key={t.year + t.event} className="relative">
                  <span className="absolute -left-[21px] top-1.5 size-2 rounded-full bg-primary" />
                  <span className="font-display font-bold text-primary">{t.year}</span>
                  <span className="ml-2">{t.event}</span>
                </li>
              ))}
            </ol>
            <div>
              <h3 className="mb-1 text-sm font-bold">日本・周辺国との関係</h3>
              <p className="text-muted-foreground">{country.history.relations}</p>
            </div>
          </TabsContent>

          <TabsContent value="culture" className="space-y-3">
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
          </TabsContent>

          <TabsContent value="society" className="space-y-2">
            <div className="grid gap-2 sm:grid-cols-2">
              <Row label="人口" value={`${nf.format(country.society.population)} 人`} />
              <Row label="人口増加率" value={`${country.society.populationGrowth} %`} />
              <Row label="都市人口率" value={`${country.society.urbanRate} %`} />
              <Row label="年齢の中位数" value={`${country.society.medianAge} 歳`} />
            </div>
            <p className="text-muted-foreground">{country.society.note}</p>
          </TabsContent>

          <TabsContent value="economy" className="space-y-3">
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
          </TabsContent>

          <TabsContent value="military" className="space-y-3">
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
          </TabsContent>

          <TabsContent value="geography" className="grid gap-2 sm:grid-cols-2">
            <Row label="気候" value={country.geography.climate} />
            <Row label="地形" value={country.geography.terrain} />
            <Row label="自然災害のリスク" value={country.geography.disasterRisk} />
            <Row label="国境・周辺国" value={country.geography.borders} />
          </TabsContent>

          <TabsContent value="exam" className="space-y-3">
            {country.examPoints.map((qa) => (
              <div key={qa.q} className="rounded-lg border border-border p-3">
                <p className="font-bold text-primary">Q. {qa.q}</p>
                <p className="mt-1 text-muted-foreground">A. {qa.a}</p>
              </div>
            ))}
          </TabsContent>

          <div className="mt-6 border-t border-border pt-3 text-xs text-muted-foreground">
            <p className="font-bold">出典</p>
            <ul className="mt-1 list-inside list-disc">
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
