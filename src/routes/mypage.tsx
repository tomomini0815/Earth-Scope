import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useEffect, useRef } from "react";
import {
  AlertTriangle,
  Award,
  BarChart3,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Compass,
  Crown,
  ExternalLink,
  Flag,
  Flame,
  Globe,
  GraduationCap,
  HelpCircle,
  Hourglass,
  Lock,
  Map,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Timer,
  Trash2,
  Trophy,
  Users,
  Zap,
} from "lucide-react";

import { SiteHeader } from "@/components/SiteHeader";
import { WorldMap } from "@/components/WorldMap";
import { FlagImage } from "@/components/FlagImage";
import { PassportStamp } from "@/components/PassportStamp";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { countries } from "@/data/countries";
import { byIso3, learnedIds } from "@/data/lookup";
import { CONTINENTS, type ContinentId, type Country } from "@/data/types";
import { badgeList, getRank, useProgress } from "@/stores/progress";
import { cn } from "@/lib/utils";

import { BADGE_DESIGNS, EmeraldGem } from "@/components/GemIcons";

// 学習時間の表示ヘルパー
function formatTimeDisplay(seconds: number = 0): { main: string; unit: string } {
  if (seconds < 60) {
    return { main: `${Math.max(1, seconds)}`, unit: "秒" };
  }
  const mins = Math.floor(seconds / 60);
  if (mins < 60) {
    return { main: `${mins}`, unit: "分" };
  }
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return {
    main: `${hours}`,
    unit: remMins > 0 ? `時間 ${remMins}分` : "時間",
  };
}

// 達成感フライト換算メッセージ
function getFlightMetaphor(totalSec: number = 0): { title: string; desc: string; icon: string; nextTargetMin: number } {
  const mins = Math.floor(totalSec / 60);
  if (mins < 15) {
    return {
      icon: "🛫",
      title: "テイクオフ！学習の旅路がスタート",
      desc: "飛行機が離陸するように、世界探検の第一歩を踏み出しました！継続して知識を深めましょう。",
      nextTargetMin: 30,
    };
  } else if (mins < 60) {
    return {
      icon: "✈️",
      title: "近隣アジア便クルーズ達成！",
      desc: "東京からソウル・台北へのフライト時間に匹敵！アジアの国々を中心に地理感覚が身についています。",
      nextTargetMin: 60,
    };
  } else if (mins < 180) {
    return {
      icon: "🌏",
      title: "東南アジア・オセアニア便達成！",
      desc: "東京〜シンガポールやシドニーへのフライト時間に匹敵する充実の探検量！着実に世界への理解が深まっています。",
      nextTargetMin: 180,
    };
  } else if (mins < 600) {
    return {
      icon: "🗺️",
      title: "ユーラシア大陸横断フライト達成！",
      desc: "ヨーロッパ直行便に匹敵する5時間以上の学習達成！大陸をまたぐ広大な知識が身についています。",
      nextTargetMin: 600,
    };
  } else {
    return {
      icon: "🪐",
      title: "地球一周・世界旅行マスター！",
      desc: "10時間以上の大記録！世界一周旅行に相当する膨大な努力と探求心を積み重ねた真の地球の主です。",
      nextTargetMin: 1200,
    };
  }
}

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
  const {
    learned,
    learnedAt,
    favorites,
    wrongAnswers,
    results,
    totalStudySeconds,
    todayStudySeconds,
    dailyStudyHistory,
    studyStreakDays,
    removeWrong,
    reset,
  } = useProgress();
  const [passportFilter, setPassportFilter] = useState<ContinentId | "all">("all");
  const [selectedMapId, setSelectedMapId] = useState<string | undefined>();
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);

  // 学習データの完全リセット処理
  const handleResetData = () => {
    reset();
    try {
      localStorage.removeItem("geoquest-progress");
      localStorage.removeItem("earthscope_last_study_tick");
    } catch {
      // ignore
    }
    setIsResetDialogOpen(false);
  };

  // 直近7日間の学習推移
  const last7Days = useMemo(() => {
    const list: { key: string; label: string; dateShort: string; minutes: number; isToday: boolean }[] = [];
    const now = new Date();
    const dayNames = ["日", "月", "火", "水", "木", "金", "土"];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const sec = dailyStudyHistory?.[key] || 0;
      const minutes = Math.round(sec / 60);
      const dayOfWeek = dayNames[d.getDay()];
      list.push({
        key,
        label: i === 0 ? "今日" : `${d.getMonth() + 1}/${d.getDate()}`,
        dateShort: `(${dayOfWeek})`,
        minutes,
        isToday: i === 0,
      });
    }
    return list;
  }, [dailyStudyHistory]);

  const maxDailyMinutes = useMemo(() => {
    return Math.max(...last7Days.map((d) => d.minutes), 15); // 最低15分スケール
  }, [last7Days]);

  const weeklyTotalMinutes = useMemo(() => {
    return last7Days.reduce((sum, d) => sum + d.minutes, 0);
  }, [last7Days]);

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

  // 地球踏破スタッツ（学習した国々のカバー人口・陸地面積）
  const worldCoverage = useMemo(() => {
    const totalWorldPop = 8000000000;
    const totalLandArea = 148940000;
    const learnedCountries = learned.map((iso3) => byIso3(iso3)).filter((c): c is Country => !!c);
    const coveredPop = learnedCountries.reduce((sum, c) => sum + (c.society?.population || 0), 0);
    const coveredArea = learnedCountries.reduce((sum, c) => sum + (c.basic?.area || 0), 0);
    const popPct = Math.min(100, Math.round((coveredPop / totalWorldPop) * 100));
    const areaPct = Math.min(100, Math.round((coveredArea / totalLandArea) * 100));
    return { coveredPop, coveredArea, popPct, areaPct };
  }, [learned]);

  // パスポートスタンプ用の国一覧
  const passportCountries = useMemo(() => {
    const list = learned.map((iso3) => byIso3(iso3)).filter((c): c is Country => !!c);
    if (passportFilter === "all") return list;
    return list.filter((c) => c.continent === passportFilter);
  }, [learned, passportFilter]);

  // パスポートスタンプの3行目以降のホバー展開状態
  const [isStampHovered, setIsStampHovered] = useState(false);
  const [isStampClickedOpen, setIsStampClickedOpen] = useState(false);
  const [hasStampThirdRow, setHasStampThirdRow] = useState(false);
  const stampGridRef = useRef<HTMLDivElement | null>(null);

  const isStampOpen = isStampHovered || isStampClickedOpen;

  useEffect(() => {
    const checkOverflow = () => {
      if (stampGridRef.current) {
        // 2行の高さは約430px。それを超える場合は3行目以降が存在する
        setHasStampThirdRow(stampGridRef.current.scrollHeight > 450);
      }
    };
    const t = setTimeout(checkOverflow, 50);
    window.addEventListener("resize", checkOverflow);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", checkOverflow);
    };
  }, [passportCountries]);

  // 要復習リスト（クイズで間違えた国）
  const reviewCountries = useMemo(() => {
    return (wrongAnswers ?? []).map((iso3) => byIso3(iso3)).filter((c): c is Country => !!c);
  }, [wrongAnswers]);

  // 学習時間の集計と達成感演出
  const totalTime = formatTimeDisplay(totalStudySeconds);
  const todayTime = formatTimeDisplay(todayStudySeconds);
  const flightMetaphor = getFlightMetaphor(totalStudySeconds);
  const streak = studyStreakDays || 1;
  const targetPct = Math.min(100, Math.round(((totalStudySeconds || 0) / (flightMetaphor.nextTargetMin * 60)) * 100));

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

            {/* 主要ステータスグリッド（制覇国数・総学習時間・正答率・経験値） */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5 shrink-0">
              <div className="rounded-2xl border border-border/80 bg-background/80 p-2.5 sm:p-3 text-center backdrop-blur-xs">
                <span className="text-[11px] text-muted-foreground font-medium">制覇国数</span>
                <p className="font-display text-base sm:text-lg font-bold text-foreground">
                  {learned.length}
                  <span className="text-[11px] font-normal text-muted-foreground"> / 198</span>
                </p>
              </div>
              <div className="rounded-2xl border border-border/80 bg-background/80 p-2.5 sm:p-3 text-center backdrop-blur-xs">
                <span className="text-[11px] text-muted-foreground font-medium">総学習時間</span>
                <p className="font-display text-base sm:text-lg font-bold text-foreground">
                  {totalTime.main}<span className="text-[11px] font-normal text-muted-foreground">{totalTime.unit}</span>
                </p>
              </div>
              <div className="rounded-2xl border border-border/80 bg-background/80 p-2.5 sm:p-3 text-center backdrop-blur-xs">
                <span className="text-[11px] text-muted-foreground font-medium">正答率</span>
                <p className="font-display text-base sm:text-lg font-bold text-foreground">{accuracy}%</p>
              </div>
              <div className="rounded-2xl border border-border/80 bg-background/80 p-2.5 sm:p-3 text-center backdrop-blur-xs">
                <span className="text-[11px] text-muted-foreground font-medium">獲得経験値</span>
                <p className="font-display text-base sm:text-lg font-bold text-amber-500">{xp} <span className="text-[10px] font-normal">XP</span></p>
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

        {/* 2. 学習タイムマスター ＆ 努力の軌跡（達成感向上セクション） */}
        <section className="relative overflow-hidden rounded-3xl border border-sky-500/25 bg-gradient-to-br from-card via-card to-sky-500/5 p-5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-sky-600 dark:text-sky-400 text-[11px] font-bold uppercase tracking-wider">
                <Timer className="size-3.5" />
                <span>STUDY RECORD</span>
              </div>
              <h2 className="font-display text-base sm:text-xl font-bold tracking-tight text-foreground mt-0.5 truncate">
                学習時間と記録
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">
                世界地図やクイズに真剣に向き合った実時間と継続の記録。
              </p>
            </div>

            {/* 連続学習ストリーク表示（右側に常時配置・クリーンなSVGデザイン） */}
            <div className="flex items-center gap-2 rounded-xl border border-border/80 bg-background/80 px-2.5 sm:px-3 py-1.5 shadow-2xs shrink-0">
              <div className="size-7 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0">
                <Flame className="size-4 fill-orange-500/20 text-orange-500" />
              </div>
              <div>
                <span className="text-[10px] font-medium text-muted-foreground block leading-none">連続学習</span>
                <span className="text-xs sm:text-sm font-bold text-foreground leading-tight">{streak}日連続</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
            {/* 総学習時間 */}
            <div className="rounded-2xl border border-border/80 bg-background/80 p-2.5 sm:p-3.5 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3.5 shadow-2xs">
              <div className="size-8 sm:size-11 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                <Hourglass className="size-4 sm:size-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] sm:text-[11px] text-muted-foreground font-medium block truncate">総学習時間</span>
                <p className="font-display text-sm sm:text-xl font-black text-foreground leading-tight mt-0.5">
                  {totalTime.main} <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground">{totalTime.unit}</span>
                </p>
              </div>
            </div>

            {/* 今日の学習時間 */}
            <div className="rounded-2xl border border-border/80 bg-background/80 p-2.5 sm:p-3.5 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3.5 shadow-2xs">
              <div className="size-8 sm:size-11 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Clock className="size-4 sm:size-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] sm:text-[11px] text-muted-foreground font-medium block truncate">今日の学習時間</span>
                <p className="font-display text-sm sm:text-xl font-black text-foreground leading-tight mt-0.5">
                  {todayTime.main} <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground">{todayTime.unit}</span>
                </p>
              </div>
            </div>

            {/* 1カ国あたりの平均探検時間 */}
            <div className="rounded-2xl border border-border/80 bg-background/80 p-2.5 sm:p-3.5 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3.5 shadow-2xs">
              <div className="size-8 sm:size-11 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Zap className="size-4 sm:size-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] sm:text-[11px] text-muted-foreground font-medium block truncate">1カ国平均探検</span>
                <p className="font-display text-sm sm:text-xl font-black text-foreground leading-tight mt-0.5">
                  {learned.length > 0 ? Math.max(1, Math.round((totalStudySeconds || 0) / learned.length / 60)) : 0}{" "}
                  <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground">分/国</span>
                </p>
              </div>
            </div>
          </div>

          {/* 直近7日間の学習リズム（週間バーチャート） */}
          <div className="rounded-2xl border border-border/80 bg-background/80 p-4 mb-4 shadow-2xs">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                  <BarChart3 className="size-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-foreground">直近7日間の学習リズム</h3>
                  <p className="text-[11px] text-muted-foreground">過去1週間の継続推移</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-muted-foreground font-medium">週間合計</span>
                <p className="text-sm font-black text-foreground">
                  {weeklyTotalMinutes >= 60
                    ? `${Math.floor(weeklyTotalMinutes / 60)}時間 ${weeklyTotalMinutes % 60}分`
                    : `${weeklyTotalMinutes} 分`}
                </p>
              </div>
            </div>

            {/* バーチャート */}
            <div className="grid grid-cols-7 gap-2 items-end h-28 pt-4 pb-1 px-1 border-b border-border/50">
              {last7Days.map((d) => {
                const heightPct = d.minutes > 0 ? Math.max(12, Math.round((d.minutes / maxDailyMinutes) * 100)) : 4;
                return (
                  <div key={d.key} className="flex flex-col items-center justify-end h-full group">
                    <span
                      className={cn(
                        "text-[10px] font-bold mb-1 transition-opacity",
                        d.minutes > 0
                          ? "text-foreground"
                          : "text-muted-foreground/50 opacity-0 group-hover:opacity-100",
                      )}
                    >
                      {d.minutes > 0 ? `${d.minutes}分` : "0分"}
                    </span>
                    <div className="w-full max-w-[36px] bg-secondary/40 rounded-t-md relative flex items-end h-full overflow-hidden">
                      <div
                        style={{ height: `${heightPct}%` }}
                        className={cn(
                          "w-full rounded-t-md transition-all duration-500",
                          d.minutes > 0
                            ? "bg-sky-500 hover:bg-sky-400 shadow-2xs"
                            : "bg-muted/40",
                        )}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 曜日・日付ラベル */}
            <div className="grid grid-cols-7 gap-2 pt-2 px-1 text-center">
              {last7Days.map((d) => (
                <div key={`label-${d.key}`} className="flex flex-col items-center">
                  <span
                    className={cn(
                      "text-[11px] font-bold leading-none",
                      d.isToday ? "text-sky-600 dark:text-sky-400" : "text-muted-foreground",
                    )}
                  >
                    {d.label}
                  </span>
                  <span className="text-[9px] text-muted-foreground/80 leading-tight mt-0.5">
                    {d.dateShort}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 達成感フライト換算メッセージカード */}
          <div className="rounded-2xl border border-sky-500/30 bg-gradient-to-r from-sky-500/10 via-background/90 to-indigo-500/10 p-4">
            <div className="flex items-start gap-3.5">
              <span className="text-3xl select-none shrink-0 mt-0.5">{flightMetaphor.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-foreground">
                    {flightMetaphor.title}
                  </h3>
                  <span className="text-[11px] font-semibold text-sky-600 dark:text-sky-400">
                    次のマイルストーン（{flightMetaphor.nextTargetMin}分）まで {targetPct}%
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {flightMetaphor.desc}
                </p>
                <div className="mt-2.5">
                  <Progress value={targetPct} className="h-2 bg-secondary" />
                </div>
              </div>
            </div>
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

          {/* 右：大陸ごとの達成度 & 地球踏破ハイライト */}
          <div className="surface-card p-4 sm:p-5 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <h2 className="font-display text-lg font-bold flex items-center gap-2">
                  <Target className="size-5 text-emerald-500" />
                  <span>大陸別達成度</span>
                </h2>
                <span className="text-[11px] font-semibold text-muted-foreground">全6大陸</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">6大陸すべてを制覇して完全マスターを目指そう。</p>

              {/* 6大陸プログレス */}
              <div className="space-y-2.5">
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
            </div>

            {/* 地球踏破スケール & 未開拓フロンティアのレコメンド（大画面での上下余白を解消） */}
            <div className="space-y-3 pt-2">
              {/* 地球カバレッジミニバッジ */}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-border/80 bg-background/60 p-2.5">
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
                    <Globe className="size-3 text-sky-500" />
                    <span>世界陸地カバー率</span>
                  </div>
                  <p className="font-display text-sm font-bold text-foreground mt-0.5">
                    {worldCoverage.areaPct}% <span className="text-[10px] font-normal text-muted-foreground">({(worldCoverage.coveredArea / 10000).toLocaleString("ja-JP", { maximumFractionDigits: 0 })}万km²)</span>
                  </p>
                </div>
                <div className="rounded-xl border border-border/80 bg-background/60 p-2.5">
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
                    <Users className="size-3 text-indigo-500" />
                    <span>世界人口カバー率</span>
                  </div>
                  <p className="font-display text-sm font-bold text-foreground mt-0.5">
                    {worldCoverage.popPct}% <span className="text-[10px] font-normal text-muted-foreground">({(worldCoverage.coveredPop / 100000000).toFixed(1)}億人)</span>
                  </p>
                </div>
              </div>

              {/* 次の探検ターゲット（未開拓大陸からのおすすめ） */}
              {lowestContinent && lowestContinent.unlearned.length > 0 && (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-2.5">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 mb-1.5">
                    <span className="flex items-center gap-1">
                      <Compass className="size-3.5" />
                      <span>次の探検：{lowestContinent.continent.label} (残り{lowestContinent.unlearned.length}カ国)</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-0.5">
                    {lowestContinent.unlearned.slice(0, 2).map((c) => (
                      <Link
                        key={c.iso3}
                        to="/country/$iso3"
                        params={{ iso3: c.iso3.toLowerCase() }}
                        className="flex-1 flex items-center justify-between gap-1.5 rounded-lg border border-border/80 bg-background/90 px-2 py-1 text-xs hover:border-emerald-500/50 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-all cursor-pointer group shrink-0 min-w-[130px]"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <FlagImage flag={c.flag} size="xs" />
                          <span className="truncate font-semibold text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                            {c.nameJa}
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground group-hover:text-emerald-600 font-bold shrink-0">➜</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-border/60 text-center">
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
        <section className="surface-card p-5 sm:p-6 overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="min-w-0">
              <h2 className="font-display text-lg font-bold flex items-center gap-2">
                <BookOpen className="size-5 text-amber-500 shrink-0" />
                <span className="truncate">スマート学習ハブ & 弱点克服</span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                クイズで間違えた国や、進捗の遅い大陸からのおすすめをピックアップ。
              </p>
            </div>
            <Link to="/quiz" className="shrink-0 self-start sm:self-auto">
              <Button size="sm" variant="default" className="gap-1.5 text-xs shadow-sm">
                <Trophy className="size-3.5" />
                <span>クイズに挑戦</span>
              </Button>
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-2 min-w-0">
            {/* 要復習リスト（クイズで間違えた国） */}
            <div className="rounded-2xl border border-border bg-secondary/25 p-4 flex flex-col justify-between min-w-0">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-bold text-amber-500 dark:text-amber-400 flex items-center gap-1.5 min-w-0">
                    <HelpCircle className="size-3.5 shrink-0" />
                    <span className="truncate">要復習リスト（クイズで間違えた国）</span>
                  </span>
                  <span className="text-[11px] text-muted-foreground font-medium shrink-0">
                    {reviewCountries.length} カ国
                  </span>
                </div>

                {reviewCountries.length > 0 ? (
                  <div className="space-y-2 mt-3 max-h-56 overflow-y-auto pr-1">
                    {reviewCountries.map((c) => (
                      <div
                        key={c.iso3}
                        className="flex items-center justify-between gap-2 rounded-xl border border-border/70 bg-card p-2.5 text-xs hover:border-amber-500/40 transition-colors shadow-xs min-w-0"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <FlagImage flag={c.flag} size="xs" />
                          <div className="min-w-0 flex-1">
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
            <div className="rounded-2xl border border-border bg-secondary/25 p-4 flex flex-col justify-between min-w-0">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2">
                  <span className="text-xs font-bold text-sky-500 dark:text-sky-400 flex items-center gap-1.5 min-w-0">
                    <Flame className="size-3.5 shrink-0" />
                    <span className="truncate">次の一歩：未開拓フロンティア</span>
                  </span>
                  {lowestContinent && (
                    <span className="text-[11px] font-semibold text-muted-foreground shrink-0">
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
                          className="flex items-center justify-between gap-2 rounded-xl border border-border/70 bg-card p-2.5 text-xs hover:border-sky-500/40 transition-colors shadow-xs min-w-0"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <FlagImage flag={c.flag} size="xs" />
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-foreground truncate">{c.nameJa}</p>
                              <p
                                className="text-[10px] text-muted-foreground truncate"
                                title={`首都: ${c.basic.capital} · 面積: ${c.basic.area.toLocaleString()} km²`}
                              >
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
        <section className="relative overflow-hidden rounded-3xl border-2 border-amber-900/20 dark:border-amber-500/20 bg-gradient-to-br from-[#FAF7F0] via-[#F4EFE6] to-[#EFE8DC] dark:from-[#171B26] dark:via-[#12151F] dark:to-[#0D1017] p-4 sm:p-5 shadow-md">
          {/* パスポート風装飾ヘッダー */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2.5 border-b border-amber-900/15 dark:border-amber-500/20 pb-3 mb-4">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-amber-800/80 dark:text-amber-400 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider font-mono">
                <span>PASSPORT OF EARTH TRAVELER</span>
                <span>★</span>
                <span>ENTRY STAMPS</span>
              </div>
              <h2 className="font-display text-lg sm:text-xl font-bold tracking-tight text-amber-950 dark:text-white mt-0.5">
                デジタル・パスポート入国スタンプ帳
              </h2>
              <p className="text-xs text-amber-900/70 dark:text-slate-300 mt-0.5">
                学習を達成した国が公式入国スタンプとしてパスポートに記録されます。
              </p>
            </div>

            {/* 大陸フィルタータブ（横スクロール可能で角丸ピルが崩れない堅牢なUI） */}
            <div className="flex items-center gap-1 overflow-x-auto max-w-full p-1 rounded-xl bg-amber-900/10 dark:bg-black/40 border border-amber-900/15 dark:border-white/10 shrink-0 scrollbar-none">
              <button
                type="button"
                onClick={() => setPassportFilter("all")}
                className={cn(
                  "rounded-lg px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer shrink-0",
                  passportFilter === "all"
                    ? "bg-amber-800 text-white dark:bg-amber-400 dark:text-slate-950 shadow-xs"
                    : "text-amber-900/70 hover:text-amber-950 dark:text-slate-300 dark:hover:text-white",
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
                      "rounded-lg px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer shrink-0",
                      passportFilter === c.id
                        ? "bg-amber-800 text-white dark:bg-amber-400 dark:text-slate-950 shadow-xs"
                        : "text-amber-900/70 hover:text-amber-950 dark:text-slate-300 dark:hover:text-white",
                    )}
                  >
                    {c.label} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* スタンプグリッド（円形消印スタンプコレクション） */}
          {passportCountries.length > 0 ? (
            <div
              className={cn(
                "relative transition-[max-height] duration-500 ease-in-out",
                hasStampThirdRow && !isStampOpen ? "max-h-[440px] overflow-hidden" : "max-h-[8000px]"
              )}
              onMouseEnter={() => setIsStampHovered(true)}
              onMouseLeave={() => setIsStampHovered(false)}
            >
              <div
                ref={stampGridRef}
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
              >
                {passportCountries.map((c) => {
                  if (!c) return null;
                  const stampDate = learnedAt?.[c.iso3];
                  return (
                    <Link
                      key={c.iso3}
                      to="/country/$iso3"
                      params={{ iso3: c.iso3.toLowerCase() }}
                      className="group relative rounded-3xl border border-amber-900/20 dark:border-amber-400/20 bg-amber-50/60 dark:bg-slate-900/70 p-3 text-center transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-amber-900/15 hover:border-amber-600 dark:hover:border-amber-400 hover:bg-white dark:hover:bg-slate-900 block overflow-hidden"
                    >
                      {/* パスポート査証ページの透かし模様装飾 */}
                      <div className="absolute inset-0 bg-[radial-gradient(#92400e_0.75px,transparent_0.75px)] opacity-[0.08] dark:opacity-[0.12] [background-size:12px_12px] pointer-events-none" />

                      {/* 円形出入国スタンプ（参考画像右側を再現：二重円・円弧テキスト・飛行機✈・入国区分・入国日付・空港コード） */}
                      <div className="my-1.5 flex justify-center">
                        <PassportStamp
                          country={c}
                          learnedAt={stampDate}
                          size="md"
                        />
                      </div>

                      {/* 国情報フッター */}
                      <div className="mt-2.5 pt-2 border-t border-amber-900/15 dark:border-white/10 flex items-center justify-between gap-1.5 text-left">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <FlagImage flag={c.flag} size="xs" className="rounded-xs shrink-0 shadow-2xs" />
                          <span className="text-[11px] font-bold text-amber-950 dark:text-slate-100 truncate group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                            {c.nameJa}
                          </span>
                        </div>
                        <span className="text-[9px] font-mono text-amber-900/70 dark:text-slate-400 uppercase shrink-0">
                          {c.iso3}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>

              {/* 3行目以降がある場合の「もっと見る」（ホバーで自動展開、背景無し） */}
              {hasStampThirdRow && !isStampOpen && (
                <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#EFE8DC] via-[#EFE8DC]/85 to-transparent dark:from-[#0D1017] dark:via-[#0D1017]/85 flex items-end justify-center pb-2.5 pointer-events-none transition-opacity duration-300">
                  <button
                    type="button"
                    onClick={() => setIsStampClickedOpen(true)}
                    className="pointer-events-auto inline-flex items-center gap-1 text-xs font-bold text-amber-900/90 dark:text-amber-200/90 hover:text-amber-950 dark:hover:text-white transition-all cursor-pointer bg-transparent border-0 shadow-none p-1 group"
                  >
                    <span>もっと見る（全{passportCountries.length}スタンプを表示）</span>
                    <ChevronDown className="size-3.5 transition-transform group-hover:translate-y-0.5 animate-bounce" />
                  </button>
                </div>
              )}

              {/* 展開中の折りたたみボタン（背景無し） */}
              {hasStampThirdRow && isStampOpen && (
                <div className="mt-4 flex justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      setIsStampClickedOpen(false);
                      setIsStampHovered(false);
                    }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-amber-900/80 dark:text-amber-300/80 hover:text-amber-950 dark:hover:text-white transition-colors cursor-pointer bg-transparent border-0 shadow-none p-1"
                  >
                    <span>閉じる</span>
                    <ChevronUp className="size-3.5" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="py-12 text-center text-amber-900/70 dark:text-slate-300">
              <div className="mx-auto size-14 rounded-full border-2 border-dashed border-amber-800/30 dark:border-amber-400/40 flex items-center justify-center text-2xl mb-3">
                🛂
              </div>
              <p className="text-sm font-bold text-amber-950 dark:text-white">まだパスポートスタンプがありません</p>
              <p className="text-xs text-amber-900/70 dark:text-slate-300 mt-1 max-w-sm mx-auto">
                世界地図や国リストから国を選び、「学習済みにする」を押すと、ここにあなただけの公式スタンプが押されます！
              </p>
              <Button size="sm" variant="default" className="mt-4 text-xs bg-amber-800 hover:bg-amber-900 text-white dark:bg-amber-400 dark:text-slate-950" asChild>
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
              const design = BADGE_DESIGNS[b.id] ?? {
                gemName: "ジュエル",
                icon: EmeraldGem,
                gemRing: "ring-amber-400/40 shadow-amber-500/25",
                cardBorder: "border-amber-500/30",
                cardBg: "bg-amber-500/5",
                textColor: "text-amber-700 dark:text-amber-400",
              };
              const GemIcon = design.icon;

              return (
                <div
                  key={b.id}
                  onClick={() => {
                    window.dispatchEvent(
                      new CustomEvent("earthscope-achievement-preview", {
                        detail: {
                          id: b.id,
                          title: `バッジ獲得: ${b.label}`,
                          badge: b.icon,
                          desc: b.desc,
                          type: "badge",
                        },
                      })
                    );
                  }}
                  title={got ? "クリックして達成演出を表示" : `あと ${b.need - learned.length} カ国でアンロック`}
                  className={cn(
                    "flex items-center gap-3.5 rounded-2xl border p-3.5 transition-all group cursor-pointer hover:shadow-md",
                    got
                      ? cn(design.cardBorder, design.cardBg, "shadow-xs")
                      : "border-border/60 bg-muted/30 opacity-60 hover:opacity-80"
                  )}
                >
                  <div
                    className={cn(
                      "size-12 shrink-0 rounded-2xl flex items-center justify-center transition-all duration-300 relative",
                      got
                        ? cn("bg-background/90 dark:bg-slate-900/90 shadow-md ring-1 group-hover:scale-110", design.gemRing)
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {got ? (
                      <GemIcon className="size-8 drop-shadow-sm" />
                    ) : (
                      <div className="flex flex-col items-center justify-center">
                        <Lock className="size-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-xs font-bold text-foreground truncate">{b.label}</p>
                      {got && (
                        <span className={cn("text-[9px] font-bold px-1.5 py-0 rounded-full bg-background/80 border border-border/60 shrink-0", design.textColor)}>
                          💎 {design.gemName}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">{b.desc}</p>
                    <span className="text-[10px] font-semibold text-muted-foreground/80 mt-1 block">
                      {got ? "獲得済み ✓" : `必要: ${b.need}カ国`}
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
              type="button"
              size="sm"
              variant="ghost"
              className="text-xs text-destructive hover:bg-destructive/10 cursor-pointer gap-1.5"
              onClick={() => setIsResetDialogOpen(true)}
            >
              <Trash2 className="size-3.5" />
              <span>学習データをリセット</span>
            </Button>
          </div>

          {/* リセット確認モーダル */}
          <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
            <DialogContent className="sm:max-w-md rounded-3xl border-destructive/30 bg-card p-6 shadow-2xl">
              <div className="flex items-start gap-3.5 mb-2">
                <div className="size-11 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center shrink-0 ring-1 ring-destructive/20 shadow-xs">
                  <AlertTriangle className="size-5" />
                </div>
                <DialogHeader className="text-left space-y-1 min-w-0">
                  <DialogTitle className="text-lg font-bold text-foreground">
                    学習データをリセットしますか？
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
                    この操作を行うと、これまでのすべての学習データが初期化されます。
                  </DialogDescription>
                </DialogHeader>
              </div>

              <div className="rounded-2xl bg-destructive/5 border border-destructive/15 p-4 my-2 text-xs space-y-2 text-muted-foreground">
                <div className="flex items-center gap-2 text-foreground font-medium">
                  <span className="text-destructive font-bold">•</span>
                  <span>学習達成した国（全 {learned.length} カ国）</span>
                </div>
                <div className="flex items-center gap-2 text-foreground font-medium">
                  <span className="text-destructive font-bold">•</span>
                  <span>デジタル・パスポート入国スタンプ帳</span>
                </div>
                <div className="flex items-center gap-2 text-foreground font-medium">
                  <span className="text-destructive font-bold">•</span>
                  <span>獲得したアチーブメント・バッジ（{badgeList.filter((b) => learned.length >= b.need).length}個）</span>
                </div>
                <div className="flex items-center gap-2 text-foreground font-medium">
                  <span className="text-destructive font-bold">•</span>
                  <span>総学習時間・連続学習記録・日々の学習推移</span>
                </div>
                <div className="flex items-center gap-2 text-foreground font-medium">
                  <span className="text-destructive font-bold">•</span>
                  <span>クイズ挑戦履歴とお気に入り登録国</span>
                </div>
                <p className="pt-2 border-t border-destructive/15 text-[11px] font-bold text-destructive">
                  ※この操作は取り消すことができません。
                </p>
              </div>

              <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 mt-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 rounded-xl cursor-pointer"
                  onClick={() => setIsResetDialogOpen(false)}
                >
                  キャンセル
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  className="flex-1 rounded-xl font-bold bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-md gap-1.5 cursor-pointer"
                  onClick={handleResetData}
                >
                  <Trash2 className="size-4" />
                  <span>完全にリセットする</span>
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </section>
      </main>
    </div>
  );
}
