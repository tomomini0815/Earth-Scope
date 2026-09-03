import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { Award, Lock } from "lucide-react";

import { SiteHeader } from "@/components/SiteHeader";
import { WorldMap } from "@/components/WorldMap";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { countries } from "@/data/countries";
import { byIso3, learnedIds } from "@/data/lookup";
import { CONTINENTS } from "@/data/types";
import { badgeList, useProgress } from "@/stores/progress";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/mypage")({
  head: () => ({
    meta: [
      { title: "マイページ — 学習の進捗とバッジ | GeoQuest" },
      {
        name: "description",
        content: "学習済みの国、大陸ごとの達成度、クイズの正答率、獲得バッジを確認できるマイページ。",
      },
      { property: "og:title", content: "マイページ | GeoQuest" },
      { property: "og:description", content: "学習済みマップ・正答率・バッジで進捗を可視化。" },
    ],
  }),
  component: MyPage,
});

function MyPage() {
  const { learned, favorites, results, reset } = useProgress();
  const learnedSet = useMemo(() => learnedIds(learned), [learned]);
  const rate = Math.round((learned.length / countries.length) * 100);

  const totals = results.reduce(
    (acc, r) => ({ correct: acc.correct + r.correct, total: acc.total + r.total }),
    { correct: 0, total: 0 },
  );
  const accuracy = totals.total ? Math.round((totals.correct / totals.total) * 100) : 0;

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <h1 className="font-display text-2xl font-bold">マイページ</h1>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="surface-card p-4">
            <p className="text-xs text-muted-foreground">学習した国</p>
            <p className="font-display text-2xl font-bold">
              {learned.length}
              <span className="text-sm font-normal text-muted-foreground"> / {countries.length}</span>
            </p>
            <Progress value={rate} className="mt-2 h-2" />
          </div>
          <div className="surface-card p-4">
            <p className="text-xs text-muted-foreground">クイズ正答率</p>
            <p className="font-display text-2xl font-bold">{accuracy}%</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {results.length}回の挑戦・{totals.correct}/{totals.total}問正解
            </p>
          </div>
          <div className="surface-card p-4">
            <p className="text-xs text-muted-foreground">お気に入り</p>
            <p className="font-display text-2xl font-bold">{favorites.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {favorites.map((f) => byIso3(f)?.flag).join(" ") || "まだありません"}
            </p>
          </div>
        </div>

        <section className="mt-6">
          <h2 className="font-display text-lg font-bold">学習済みマップ</h2>
          <p className="mb-3 text-sm text-muted-foreground">緑色の国が学習済みです。</p>
          <WorldMap
            learnedMapIds={learnedSet}
            activeContinent="all"
            onSelect={() => {}}
          />
        </section>

        <section className="mt-6">
          <h2 className="font-display text-lg font-bold">大陸ごとの達成度</h2>
          <div className="mt-3 space-y-2">
            {CONTINENTS.map((c) => {
              const total = countries.filter((x) => x.continent === c.id).length;
              const got = countries.filter(
                (x) => x.continent === c.id && learned.includes(x.iso3),
              ).length;
              const pct = total ? Math.round((got / total) * 100) : 0;
              return (
                <div key={c.id} className="flex items-center gap-3 text-sm">
                  <span className="w-24 shrink-0" style={{ color: c.colorVar }}>
                    {c.label}
                  </span>
                  <Progress value={pct} className="h-2" />
                  <span className="w-16 shrink-0 text-right text-xs text-muted-foreground">
                    {got}/{total}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-6">
          <h2 className="font-display text-lg font-bold">バッジ</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {badgeList.map((b) => {
              const got = learned.length >= b.need;
              return (
                <div
                  key={b.id}
                  className={cn(
                    "surface-card flex items-center gap-3 p-3",
                    !got && "opacity-60",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-10 shrink-0 place-items-center rounded-full",
                      got ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {got ? <Award className="size-5" /> : <Lock className="size-4" />}
                  </span>
                  <div>
                    <p className="text-sm font-bold">{b.label}</p>
                    <p className="text-xs text-muted-foreground">{b.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-6">
          <h2 className="font-display text-lg font-bold">クイズ履歴</h2>
          {results.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              まだ履歴がありません。
              <Link to="/quiz" className="ml-1 text-primary underline">
                クイズに挑戦
              </Link>
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-border text-sm">
              {results.map((r) => (
                <li key={r.id} className="flex items-center justify-between py-2">
                  <span>{r.mode}</span>
                  <span className="tabular-nums">
                    {r.correct}/{r.total}
                    <span className="ml-3 text-xs text-muted-foreground">
                      {new Date(r.at).toLocaleString("ja-JP")}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="mt-8">
          <Button variant="outline" onClick={reset}>
            学習データをリセット
          </Button>
        </div>
      </main>
    </div>
  );
}
