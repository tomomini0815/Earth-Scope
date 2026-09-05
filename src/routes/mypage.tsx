import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Award,
  BookOpen,
  CheckCircle2,
  Compass,
  ExternalLink,
  Flame,
  HelpCircle,
  Lock,
  Sparkles,
  Star,
  Target,
  Trash2,
  Trophy,
} from "lucide-react";

import { SiteHeader } from "@/components/SiteHeader";
import { WorldMap } from "@/components/WorldMap";
import { FlagImage } from "@/components/FlagImage";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { countries } from "@/data/countries";
import { byIso3, learnedIds } from "@/data/lookup";
import { CONTINENTS, type ContinentId, type Country } from "@/data/types";
import { badgeList, getRank, useProgress } from "@/stores/progress";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/mypage")({
  head: () => ({
    meta: [
      { title: "マイページ — 冒険者ランク・パスポート・学習進捗 | EarthScope (ES)" },
      {
        name: "description",
        content: "学習済みの国、デジタルパスポートスタンプ帳、冒険者ランク、弱点克服レコメンドを確認できるマイページ。",
      },
      { property: "og:title", content: "マイページ | EarthScope (ES)" },
      { property: "og:description", content: "デジタルパスポート・冒険者ランク・学習マップで進捗を可視化。" },
    ],
  }),
  component: MyPage,
});

function MyPage() {
  const { learned, favorites, wrongAnswers, results, removeWrong, reset } = useProgress();
  const [passportFilter, setPassportFilter] = useState<ContinentId | "all">("all");
  const [selectedMapId, setSelectedMapId] = useState<string | undefined>();

  const learnedSet = useMemo(() => learnedIds(learned), [learned]);
  const rate = Math.round((learned.length / countries.length) * 100);

  // クイズ統計
  const totals = results.reduce(
    (acc, r) => ({ correct: acc.correct + r.correct, total: acc.total + r.total }),
    { correct: 0, total: 0 },
  );
  const accuracy = totals.total ? Math.round((totals.correct / totals.total) * 100) : 0;

  // 冒険者ランク
  const rank = getRank(learned.length);
  const xp = learned.length * 100 + totals.correct * 25;

  // 次のランクまでの必要数
  const nextTarget = rank.nextLearned ?? countries.length;
  const prevTarget = rank.minLearned;
  const rankProgress = rank.nextLearned
    ? Math.min(100, Math.round(((learned.length - prevTarget) / (nextTarget - prevTarget)) * 100))
    : 100;
  const toNextRank = rank.nextLearned ? rank.nextLearned - learned.length : 0;

  // 大陸ごとの達成度
  const continentStats = useMemo(() => {
    return CONTINENTS.map((c) => {
      const allInContinent = countries.filter((x) => x.continent === c.id);
      const learnedInContinent = allInContinent.filter((x) => learned.includes(x.iso3));
      const total = allInContinent.length;
      const got = learnedInContinent.length;
      const pct = total ? Math.round((got / total) * 100) : 0;
      return { continent: c, total, got, pct, unlearned: allInContinent.filter((x) => !learned.includes(x.iso3)) };
    });
  }, [learned]);

  // 最も遅れている大陸（未開拓フロンティアのレコメンド）
  const lowestContinent = useMemo(() => {
    const incomplete = continentStats.filter((c) => c.got < c.total);
    if (incomplete.length === 0) return null;
    return [...incomplete].sort((a, b) => a.pct - b.pct)[0];
  }, [continentStats]);

  // パスポートスタンプ用の国一覧
  const passportCountries = useMemo(() => {
    const list = learned.map((iso3) => byIso3(iso3)).filter((c): c is Country => !!c);
    if (passportFilter === "all") return list;
    return list.filter((c) => c.continent === passportFilter);
  }, [learned, passportFilter]);

  // 要復習リスト（クイズで間違えた国）
  const reviewCountries = useMemo(() => {
    return (wrongAnswers ?? []).map((iso3) => byIso3(iso3)).filter((c): c is Country => !!c);
  }, [wrongAnswers]);

  return (
    <div className="min-h-screen pb-12">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-6 space-y-6">

        {/* 1. 冒険者プロファイル & ランク（③ 称号システム） */}
        <section className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-card via-card to-secondary/40 p-5 sm:p-7 shadow-sm">
          <div className="absolute right-0 top-0 -mr-16 -mt-16 size-64 rounded-full bg-sky-500/10 blur-3xl pointer-events-none" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            {/* ランク & アバター */}
            <div className="flex items-center gap-4">
              <div
                className="relative grid size-16 sm:size-20 shrink-0 place-items-center rounded-2xl shadow-md border border-white/20 text-3xl sm:text-4xl select-none"
                style={{
                  background: `linear-gradient(135deg, color-mix(in srgb, ${rank.color} 25%, transparent), color-mix(in srgb, ${rank.color} 10%, transparent))`,
                }}
              >
                <span>{rank.badge}</span>
                <span
                  className="absolute -bottom-1.5 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase text-white shadow"
                  style={{ backgroundColor: rank.color }}
                >
                  Lv.{rank.level}
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Adventurer Profile
                  </span>
                </div>
                <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                  <span>{rank.title}</span>
                </h1>
                <p className="mt-0.5 text-xs text-muted-foreground">{rank.desc}</p>
              </div>
            </div>

            {/* 主要ステータスグリッド */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 shrink-0">
              <div className="rounded-2xl border border-border/80 bg-background/80 p-2.5 sm:p-3 text-center backdrop-blur-xs">
                <span className="text-[11px] text-muted-foreground font-medium">制覇国数</span>
                <p className="font-display text-lg sm:text-xl font-bold text-foreground">
                  {learned.length}
                  <span className="text-[11px] font-normal text-muted-foreground"> / 198</span>
                </p>
              </div>
              <div className="rounded-2xl border border-border/80 bg-background/80 p-2.5 sm:p-3 text-center backdrop-blur-xs">
                <span className="text-[11px] text-muted-foreground font-medium">クイズ正答率</span>
                <p className="font-display text-lg sm:text-xl font-bold text-foreground">{accuracy}%</p>
              </div>
              <div className="rounded-2xl border border-border/80 bg-background/80 p-2.5 sm:p-3 text-center backdrop-blur-xs">
                <span className="text-[11px] text-muted-foreground font-medium">獲得経験値</span>
                <p className="font-display text-lg sm:text-xl font-bold text-sky-500">{xp} <span className="text-[10px] font-normal">XP</span></p>
              </div>
            </div>
          </div>

          {/* 次のランクへの進捗バー */}
          <div className="mt-5 border-t border-border/60 pt-4">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                <Sparkles className="size-3.5 text-amber-400" />
                <span>次の称号: <strong>{rank.nextLearned ? getRank(rank.nextLearned).title : "世界完全制覇"}</strong></span>
              </span>
              <span className="font-semibold text-foreground">
                {rank.nextLearned ? `あと ${toNextRank} カ国でランクアップ！` : "全ランク達成！"}
              </span>
            </div>
            <Progress value={rankProgress} className="h-2.5 bg-secondary" />
          </div>
        </section>

        {/* 2. 学習済みマップ & 大陸別達成度 */}
        <section className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          {/* 左：学習済みマップ */}
          <div className="surface-card p-4 sm:p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="font-display text-lg font-bold flex items-center gap-2">
                  <Compass className="size-5 text-sky-500" />
                  <span>学習済みワールドマップ</span>
                </h2>
                <p className="text-xs text-muted-foreground">緑色に点灯している国が学習を達成した地域です。</p>
              </div>
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                制覇率 {rate}%
              </span>
            </div>
            <div className="relative rounded-2xl overflow-hidden border border-border/80">
              <WorldMap
                learnedMapIds={learnedSet}
                activeContinent="all"
                selectedId={selectedMapId}
                onSelect={setSelectedMapId}
              />
            </div>
          </div>

          {/* 右：大陸ごとの達成度 */}
          <div className="surface-card p-4 sm:p-5 flex flex-col justify-between">
            <div>
              <h2 className="font-display text-lg font-bold flex items-center gap-2 mb-1">
                <Target className="size-5 text-emerald-500" />
                <span>大陸別達成度</span>
              </h2>
              <p className="text-xs text-muted-foreground mb-4">6大陸すべてを制覇して完全マスターを目指そう。</p>
            </div>

            <div className="space-y-3.5">
              {continentStats.map(({ continent: c, total, got, pct }) => (
                <div key={c.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold flex items-center gap-1.5" style={{ color: c.colorVar }}>
                      <span className="size-2 rounded-full" style={{ backgroundColor: c.colorVar }} />
                      <span>{c.label}</span>
                    </span>
                    <span className="text-muted-foreground font-medium">
                      {got} / {total} カ国 <span className="font-bold text-foreground">({pct}%)</span>
                    </span>
                  </div>
                  <Progress value={pct} className="h-2" />
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-border/60 text-center">
              <Link
                to="/compare"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-500 hover:underline"
              >
                <span>国同士の統計を比較する ➜</span>
              </Link>
            </div>
          </div>
        </section>

        {/* 3. 学習ハブ: 弱点克服 & 未開拓レコメンド（④ 復習・学習効率） */}
        <section className="surface-card p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-lg font-bold flex items-center gap-2">
                <BookOpen className="size-5 text-amber-500" />
                <span>スマート学習ハブ & 弱点克服</span>
              </h2>
              <p className="text-xs text-muted-foreground">
                クイズで間違えた国や、進捗の遅い大陸からのおすすめをピックアップ。
              </p>
            </div>
            <Link to="/quiz">
              <Button size="sm" variant="default" className="gap-1.5 text-xs shadow-sm">
                <Trophy className="size-3.5" />
                <span>クイズに挑戦</span>
              </Button>
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* 要復習リスト（クイズで間違えた国） */}
            <div className="rounded-2xl border border-border bg-secondary/25 p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-amber-500 dark:text-amber-400 flex items-center gap-1.5">
                    <HelpCircle className="size-3.5" />
                    <span>要復習リスト（クイズで間違えた国）</span>
                  </span>
                  <span className="text-[11px] text-muted-foreground font-medium">
                    {reviewCountries.length} カ国
                  </span>
                </div>

                {reviewCountries.length > 0 ? (
                  <div className="space-y-2 mt-3 max-h-56 overflow-y-auto pr-1">
                    {reviewCountries.map((c) => (
                      <div
                        key={c.iso3}
                        className="flex items-center justify-between gap-2 rounded-xl border border-border/70 bg-card p-2.5 text-xs hover:border-amber-500/40 transition-colors shadow-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <FlagImage flag={c.flag} size="xs" />
                          <div className="min-w-0">
                            <p className="font-bold text-foreground truncate">{c.nameJa}</p>
                            <p className="text-[10px] text-muted-foreground truncate">首都: {c.basic.capital}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button size="sm" variant="outline" className="h-7 px-2 text-xs" asChild>
                            <Link to="/country/$iso3" params={{ iso3: c.iso3.toLowerCase() }}>
                              復習する
                            </Link>
                          </Button>
                          <button
                            type="button"
                            title="復習完了（リストから削除）"
                            onClick={() => removeWrong(c.iso3)}
                            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <CheckCircle2 className="size-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-6 text-center text-muted-foreground">
                    <CheckCircle2 className="mx-auto size-8 text-emerald-500/80 mb-2" />
                    <p className="text-xs font-medium text-foreground">要復習の国はありません！</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      クイズで間違えた問題がここに自動的に記録されます。
                    </p>
                  </div>
                )}
              </div>

              {favorites.length > 0 && (
                <div className="mt-4 pt-3 border-t border-border/60">
                  <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1 mb-2">
                    <Star className="size-3 text-amber-400 fill-amber-400" />
                    <span>お気に入りの国 ({favorites.length})</span>
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {favorites.slice(0, 8).map((iso3) => {
                      const c = byIso3(iso3);
                      if (!c) return null;
                      return (
                        <Link
                          key={iso3}
                          to="/country/$iso3"
                          params={{ iso3: c.iso3.toLowerCase() }}
                          className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-medium hover:bg-secondary transition-colors"
                        >
                          <FlagImage flag={c.flag} size="xs" />
                          <span>{c.nameJa}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* 未開拓フロンティアのレコメンド */}
            <div className="rounded-2xl border border-border bg-secondary/25 p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-sky-500 dark:text-sky-400 flex items-center gap-1.5">
                    <Flame className="size-3.5" />
                    <span>次の一歩：未開拓フロンティア</span>
                  </span>
                  {lowestContinent && (
                    <span className="text-[11px] font-semibold text-muted-foreground">
                      {lowestContinent.continent.label}（達成率 {lowestContinent.pct}%）
                    </span>
                  )}
                </div>

                {lowestContinent && lowestContinent.unlearned.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs text-muted-foreground">
                      現在最も制覇率が低い<strong>「{lowestContinent.continent.label}」</strong>から、代表的な国を学んでみよう：
                    </p>
                    <div className="space-y-2 pt-1">
                      {lowestContinent.unlearned.slice(0, 3).map((c) => (
                        <div
                          key={c.iso3}
                          className="flex items-center justify-between gap-2 rounded-xl border border-border/70 bg-card p-2.5 text-xs hover:border-sky-500/40 transition-colors shadow-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <FlagImage flag={c.flag} size="xs" />
                            <div className="min-w-0">
                              <p className="font-bold text-foreground truncate">{c.nameJa}</p>
                              <p className="text-[10px] text-muted-foreground truncate">
                                首都: {c.basic.capital} · 面積: {c.basic.area.toLocaleString()} km²
                              </p>
                            </div>
                          </div>
                          <Button size="sm" variant="outline" asChild className="h-7 px-2 text-xs shrink-0 gap-1">
                            <Link to="/country/$iso3" params={{ iso3: c.iso3.toLowerCase() }}>
                              学ぶ
                              <ExternalLink className="size-3" />
                            </Link>
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="py-6 text-center text-muted-foreground">
                    <Trophy className="mx-auto size-8 text-amber-400 mb-2" />
                    <p className="text-xs font-medium text-foreground">世界全大陸を完全制覇しました！</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">おめでとうございます！偉大な世界マスターです。</p>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-border/60 text-right">
                <Link to="/" className="text-xs font-semibold text-sky-500 hover:underline">
                  世界地図から探す ➜
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* 4. デジタル・パスポート帳（① 消印スタンプコレクション） */}
        <section className="relative overflow-hidden rounded-3xl border-2 border-amber-900/30 dark:border-amber-500/20 bg-gradient-to-br from-[#182338] via-[#0f172a] to-[#1e1b4b] text-white p-5 sm:p-7 shadow-xl">
          {/* パスポート風装飾ヘッダー */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-amber-500/30 pb-4 mb-5">
            <div>
              <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-widest">
                <span>PASSPORT OF EARTH TRAVELER</span>
                <span>★</span>
                <span>ENTRY STAMPS</span>
              </div>
              <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-white mt-1 flex items-center gap-2">
                <span>デジタル・パスポート入国スタンプ帳</span>
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                学習を達成した国が公式入国スタンプとしてパスポートに記録されます。
              </p>
            </div>

            {/* 大陸フィルタータブ */}
            <div className="flex flex-wrap gap-1.5 bg-black/40 p-1 rounded-full border border-white/10">
              <button
                type="button"
                onClick={() => setPassportFilter("all")}
                className={cn(
                  "rounded-full px-3 py-1 text-[11px] font-semibold transition-colors",
                  passportFilter === "all" ? "bg-amber-400 text-slate-950 shadow" : "text-slate-300 hover:text-white"
                )}
              >
                すべて ({learned.length})
              </button>
              {CONTINENTS.map((c) => {
                const count = learned.filter((iso3) => byIso3(iso3)?.continent === c.id).length;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setPassportFilter(c.id)}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors",
                      passportFilter === c.id ? "bg-amber-400 text-slate-950 shadow" : "text-slate-300 hover:text-white"
                    )}
                  >
                    {c.label} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* スタンプグリッド */}
          {passportCountries.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
              {passportCountries.map((c) => {
                if (!c) return null;
                return (
                  <Link
                    key={c.iso3}
                    to="/country/$iso3"
                    params={{ iso3: c.iso3.toLowerCase() }}
                    className="group relative rounded-2xl border-2 border-dashed border-amber-400/40 bg-slate-900/60 p-3 text-center transition-all duration-200 hover:-translate-y-1 hover:border-amber-400 hover:bg-slate-900/90 hover:shadow-lg hover:shadow-amber-400/10 block overflow-hidden"
                  >
                    {/* 消印スタンプ風デザイン */}
                    <div className="absolute -right-3 -top-3 size-12 rounded-full border border-amber-400/20 pointer-events-none" />
                    <div className="flex items-center justify-between text-[9px] text-amber-400/80 uppercase font-mono tracking-wider border-b border-amber-400/20 pb-1 mb-2">
                      <span>OFFICIAL</span>
                      <span>ENTRY</span>
                    </div>
                    <div className="my-1.5 flex justify-center">
                      <div className="transition-transform duration-200 group-hover:scale-110">
                        <FlagImage flag={c.flag} size="md" />
                      </div>
                    </div>
                    <p className="font-bold text-xs text-white group-hover:text-amber-300 transition-colors truncate">
                      {c.nameJa}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">{c.basic.capital}</p>
                    <div className="mt-2 text-[9px] font-mono text-amber-400/70 border-t border-amber-400/20 pt-1">
                      PASSED · {c.iso3}
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center text-slate-300">
              <div className="mx-auto size-14 rounded-full border-2 border-dashed border-amber-400/40 flex items-center justify-center text-2xl mb-3">
                🛂
              </div>
              <p className="text-sm font-bold text-white">まだパスポートスタンプがありません</p>
              <p className="text-xs text-slate-300 mt-1 max-w-sm mx-auto">
                世界地図や国リストから国を選び、「学習済みにする」を押すと、ここにあなただけの公式スタンプが押されます！
              </p>
              <Button size="sm" variant="secondary" className="mt-4 text-xs" asChild>
                <Link to="/">世界地図を開く</Link>
              </Button>
            </div>
          )}
        </section>

        {/* 5. 獲得アチーブメントバッジ一覧 */}
        <section className="surface-card p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-lg font-bold flex items-center gap-2">
                <Award className="size-5 text-amber-500" />
                <span>アチーブメント・バッジ</span>
              </h2>
              <p className="text-xs text-muted-foreground">学習の進捗に応じてアンロックされる特別な勲章です。</p>
            </div>
            <span className="text-xs font-semibold text-muted-foreground">
              {badgeList.filter((b) => learned.length >= b.need).length} / {badgeList.length} 獲得
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {badgeList.map((b) => {
              const got = learned.length >= b.need;
              return (
                <div
                  key={b.id}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl border p-3.5 transition-all",
                    got
                      ? "border-amber-500/30 bg-amber-500/5 shadow-xs"
                      : "border-border/60 bg-muted/30 opacity-60"
                  )}
                >
                  <span
                    className={cn(
                      "grid size-11 shrink-0 place-items-center rounded-xl shadow-xs",
                      got ? "bg-amber-400 text-slate-950 font-bold" : "bg-muted text-muted-foreground"
                    )}
                  >
                    {got ? <Award className="size-6 text-amber-900" /> : <Lock className="size-4" />}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">{b.label}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{b.desc}</p>
                    <span className="text-[10px] font-semibold text-muted-foreground/80 mt-0.5 block">
                      {got ? "達成済み ✓" : `必要: ${b.need}カ国`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 6. クイズ履歴 & 設定 */}
        <section className="surface-card p-5 sm:p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg font-bold">クイズ挑戦履歴</h2>
            <Link to="/quiz" className="text-xs font-semibold text-sky-500 hover:underline">
              新しいクイズに挑戦 ➜
            </Link>
          </div>

          {results.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">
              まだクイズの挑戦履歴がありません。国旗や首都のクイズに挑戦してみましょう！
            </p>
          ) : (
            <div className="divide-y divide-border/60 text-xs">
              {results.slice(0, 8).map((r) => (
                <div key={r.id} className="flex items-center justify-between py-2.5">
                  <span className="font-semibold text-foreground">{r.mode}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-bold tabular-nums text-foreground">
                      {r.correct} / {r.total} 正解
                      <span className="ml-1 text-[10px] text-muted-foreground font-normal">
                        ({Math.round((r.correct / r.total) * 100)}%)
                      </span>
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(r.at).toLocaleDateString("ja-JP")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 学習データのリセット */}
          <div className="mt-6 border-t border-border/60 pt-4 flex justify-end">
            <Button
              size="sm"
              variant="ghost"
              className="text-xs text-destructive hover:bg-destructive/10"
              onClick={() => {
                if (window.confirm("すべての学習履歴・お気に入り・クイズ結果をリセットしますか？この操作は取り消せません。")) {
                  reset();
                }
              }}
            >
              <Trash2 className="size-3.5 mr-1" />
              学習データをリセット
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
