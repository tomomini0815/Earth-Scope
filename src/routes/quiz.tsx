import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Check, RefreshCw, X, Award, Globe, BookOpen } from "lucide-react";

import { SiteHeader } from "@/components/SiteHeader";
import { FlagImage } from "@/components/FlagImage";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { countries } from "@/data/countries";
import type { Country } from "@/data/types";
import { useProgress } from "@/stores/progress";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/quiz")({
  head: () => ({
    meta: [
      { title: "世界地理クイズ — 国名・首都・国旗・入試ポイント | EarthScope (ES)" },
      {
        name: "description",
        content: "全世界198ヵ国の国旗・首都・入試受験ポイント・歴史年表クイズ。全10問・即時採点と詳しい解説付き。",
      },
      { property: "og:title", content: "世界地理クイズ | EarthScope (ES)" },
      { property: "og:description", content: "国旗・国名・首都・受験ポイント・年表並べ替えの5モードで実力チェック。" },
    ],
  }),
  component: QuizPage,
});

type Mode = "flag" | "flag_choice" | "capital" | "exam" | "timeline";

const MODES: { id: Mode; label: string; desc: string; icon: string }[] = [
  { id: "flag", label: "国旗あて", desc: "表示された国旗から国名を選ぶ", icon: "🚩" },
  { id: "flag_choice", label: "国旗えらび", desc: "国名から正しい国旗を選ぶ", icon: "🌐" },
  { id: "capital", label: "首都あて", desc: "国旗と国名から首都を選ぶ", icon: "🏛️" },
  { id: "exam", label: "受験ポイント", desc: "中学・高校入試頻出の地理・歴史問題（10問）", icon: "📝" },
  { id: "timeline", label: "年表並べ替え", desc: "出来事を古い順に並べ替える", icon: "⏳" },
];

const QUESTION_COUNT = 10;

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
};

type Question = {
  country: Country;
  prompt: string;
  flagHint?: string | undefined; // 国旗あて用の国旗
  textHint?: string | undefined; // 受験問題のQなど
  choices: { id: string; label: string; flag?: string }[];
  answerId: string;
  explanation: string;
  isFlagGrid?: boolean;
};

function parseYear(yearStr: string): number {
  const isBCE = yearStr.includes("前") || yearStr.includes("BC") || yearStr.includes("B.C.");
  const cleaned = yearStr.replace(/[^0-9]/g, "");
  const num = parseInt(cleaned, 10);
  if (isNaN(num)) return 0;
  // 「16世紀」などは 1500年頃として扱う
  if (yearStr.includes("世紀") && num < 30) {
    const centuryYear = (num - 1) * 100;
    return isBCE ? -centuryYear : centuryYear;
  }
  return isBCE ? -num : num;
}

function buildQuestions(mode: Mode, usedCodes: Set<string> = new Set()): Question[] {
  // まだ出題されていない国を優先し、足りなければ全プールから選出（全198ヵ国ローテーション）
  const unusedPool = shuffle(countries.filter((c) => !usedCodes.has(c.iso3)));
  const pool = unusedPool.length >= QUESTION_COUNT
    ? unusedPool
    : [...unusedPool, ...shuffle(countries.filter((c) => usedCodes.has(c.iso3)))];

  // 1. 国旗あて（大きな国旗画像を見て国名を選ぶ）
  if (mode === "flag") {
    const selected = pool.slice(0, QUESTION_COUNT);
    return selected.map((c, qIdx) => {
      // 直前・同一セット内で極力同じ誤答が連続しないようにシャッフル
      const wrongPool = countries.filter((o) => o.iso3 !== c.iso3);
      const wrongCountries = shuffle(wrongPool).slice(0, 3);
      const answerChoice = { id: c.iso3, label: c.nameJa };
      const wrongChoices = wrongCountries.map((o) => ({ id: o.iso3, label: o.nameJa }));
      const choices = shuffle([answerChoice, ...wrongChoices]);
      return {
        country: c,
        prompt: `第${qIdx + 1}問：この国旗の国はどこ？`,
        flagHint: c.flag,
        choices,
        answerId: c.iso3,
        explanation: `${c.nameJa}（${c.nameEn}）の国旗です。首都：${c.basic.capital}、地域：${c.continent}。`,
      };
    });
  }

  // 2. 国旗えらび（国名を見て4つの大きな国旗画像から選ぶ）
  if (mode === "flag_choice") {
    const selected = pool.slice(0, QUESTION_COUNT);
    return selected.map((c) => {
      const wrongPool = countries.filter((o) => o.iso3 !== c.iso3);
      const wrongCountries = shuffle(wrongPool).slice(0, 3);
      const answerChoice = { id: c.iso3, label: c.nameJa, flag: c.flag };
      const wrongChoices = wrongCountries.map((o) => ({ id: o.iso3, label: o.nameJa, flag: o.flag }));
      const choices = shuffle([answerChoice, ...wrongChoices]);
      return {
        country: c,
        prompt: `${c.nameJa}（${c.nameEn}）の国旗はどれ？`,
        choices,
        answerId: c.iso3,
        explanation: `${c.nameJa}の国旗です。首都は「${c.basic.capital}」、面積は約${c.basic.area.toLocaleString()} km²。`,
        isFlagGrid: true,
      };
    });
  }

  // 3. 首都あて（国旗と国名から首都を答える）
  if (mode === "capital") {
    const selected = pool.slice(0, QUESTION_COUNT);
    return selected.map((c) => {
      const wrongCapitals = shuffle(
        countries.filter((o) => o.iso3 !== c.iso3 && o.basic.capital !== c.basic.capital)
      )
        .slice(0, 3)
        .map((o) => ({ id: o.basic.capital, label: o.basic.capital }));
      const answerChoice = { id: c.basic.capital, label: c.basic.capital };
      const choices = shuffle([answerChoice, ...wrongCapitals]);
      return {
        country: c,
        prompt: `${c.nameJa}（${c.nameEn}）の首都はどこ？`,
        choices,
        answerId: c.basic.capital,
        explanation: `${c.nameJa}の首都は「${c.basic.capital}」です。公用語：${c.basic.languages}。`,
      };
    });
  }

  // 4. 受験ポイント（入試頻出問題から10問出題）
  if (mode === "exam") {
    const allExamItems: { country: Country; q: string; a: string }[] = [];
    for (const country of pool) {
      for (const ep of country.examPoints) {
        allExamItems.push({ country, q: ep.q, a: ep.a });
      }
    }
    const shuffledExams = shuffle(allExamItems).slice(0, QUESTION_COUNT);
    return shuffledExams.map((item) => {
      const wrongAnswers = shuffle(
        allExamItems.filter((o) => o.a !== item.a && o.country.iso3 !== item.country.iso3)
      )
        .slice(0, 3)
        .map((o) => ({ id: o.a, label: o.a }));
      const answerChoice = { id: item.a, label: item.a };
      const choices = shuffle([answerChoice, ...wrongAnswers]);
      return {
        country: item.country,
        prompt: `【${item.country.nameJa}】の重要入試ポイント`,
        textHint: `Q. ${item.q}`,
        choices,
        answerId: item.a,
        explanation: `${item.country.nameJa}に関する入試問題：${item.q} → 正解は「${item.a}」です。`,
      };
    });
  }

  // 5. 年表並べ替え（10問出題）
  return pool
    .filter((c) => c.history.timeline.length >= 3)
    .slice(0, QUESTION_COUNT)
    .map((c) => {
      const picked = shuffle(c.history.timeline).slice(0, 3);
      const sorted = [...picked].sort((a, b) => parseYear(a.year) - parseYear(b.year));
      const answer = sorted.map((t) => t.event).join(" → ");
      const wrongs = shuffle([
        [sorted[2], sorted[0], sorted[1]],
        [sorted[1], sorted[0], sorted[2]],
        [sorted[2], sorted[1], sorted[0]],
      ])
        .slice(0, 3)
        .map((set) => set.map((t) => t!.event).join(" → "))
        .filter((s) => s !== answer)
        .slice(0, 3);

      const allChoices = shuffle([answer, ...wrongs]).map((str) => ({ id: str, label: str }));
      return {
        country: c,
        prompt: `${c.nameJa}の歴史的出来事を古い順に並べたものはどれ？`,
        choices: allChoices,
        answerId: answer,
        explanation: sorted.map((t) => `${t.year}年: ${t.event}`).join(" / "),
      };
    });
}

function QuizPage() {
  const [mode, setMode] = useState<Mode>("flag");
  const [seed, setSeed] = useState(0);
  const [usedCountryCodes, setUsedCountryCodes] = useState<Set<string>>(new Set());
  const [index, setIndex] = useState(0);
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [correct, setCorrect] = useState(0);
  const [done, setDone] = useState(false);
  const addResult = useProgress((s) => s.addResult);
  const recordWrong = useProgress((s) => s.recordWrong);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const questions = useMemo(() => buildQuestions(mode, usedCountryCodes), [mode, seed]);
  const q = questions[index];

  // 次の問題の国旗画像をプリロードして切り替え遅延・前画像残りを完全防止
  useMemo(() => {
    if (typeof window !== "undefined" && questions) {
      const nextQ = questions[index + 1];
      if (nextQ?.flagHint) {
        const iso2 = nextQ.flagHint ? String.fromCharCode(
          (nextQ.flagHint.codePointAt(0) || 0) - 0x1F1E6 + 65,
          (nextQ.flagHint.codePointAt(2) || 0) - 0x1F1E6 + 65
        ).toLowerCase() : "";
        if (iso2) {
          const img = new Image();
          img.src = `https://flagcdn.com/${iso2}.svg`;
        }
      }
    }
  }, [questions, index]);

  const restart = (nextMode: Mode = mode) => {
    // 今回解いた10問の国コードを記録（198ヵ国に達したらリセット）
    setUsedCountryCodes((prev) => {
      const next = new Set(prev);
      questions.forEach((qu) => next.add(qu.country.iso3));
      if (next.size >= countries.length - QUESTION_COUNT) {
        return new Set();
      }
      return next;
    });
    setMode(nextMode);
    setSeed((s) => s + 1);
    setIndex(0);
    setPickedId(null);
    setCorrect(0);
    setDone(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const answer = (choiceId: string) => {
    if (pickedId) return;
    setPickedId(choiceId);
    if (choiceId === q?.answerId) {
      setCorrect((c) => c + 1);
    } else if (q?.country?.iso3) {
      recordWrong(q.country.iso3);
    }
  };

  const next = () => {
    if (index + 1 >= questions.length) {
      const finalScore = correct;
      addResult({ mode: MODES.find((m) => m.id === mode)!.label, correct: finalScore, total: questions.length });
      setDone(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setIndex((i) => i + 1);
    setPickedId(null);
  };

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold flex items-center gap-2">
              <span>🌍</span> 世界地理クイズ
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              全{QUESTION_COUNT}問・即時採点。Windowsでも鮮明なSVG国旗でしっかり学べます！
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground">
            <Globe className="size-3.5 text-primary" />
            <span>197ヵ国対応</span>
          </div>
        </div>

        {/* クイズモード選択タブ */}
        <div className="mt-5 flex flex-wrap gap-2">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => restart(m.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all shadow-sm",
                mode === m.id
                  ? "border-primary bg-primary text-primary-foreground shadow"
                  : "border-border bg-card text-foreground hover:bg-secondary"
              )}
              title={m.desc}
            >
              <span>{m.icon}</span>
              <span>{m.label}</span>
            </button>
          ))}
        </div>

        {done ? (
          <div className="surface-card mt-6 animate-pop p-6 text-center">
            <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Award className="size-7" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">チャレンジ結果</p>
            <p className="font-display text-4xl font-extrabold text-primary my-1">
              {correct} / {questions.length}
            </p>
            <p className="text-sm font-medium">
              正答率 {Math.round((correct / questions.length) * 100)}%（{MODES.find((m) => m.id === mode)!.label}・全{questions.length}問）
            </p>

            {/* 今回出題された国々の国旗一覧 */}
            <div className="mt-6 rounded-xl border border-border bg-muted/40 p-4 text-left">
              <p className="text-xs font-bold text-muted-foreground flex items-center gap-1.5 mb-3">
                <BookOpen className="size-3.5" /> 今回出題された10ヵ国の国旗と国名：
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {questions.map((item, idx) => (
                  <div
                    key={`${item.country.iso3}-${idx}`}
                    className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/90 px-2.5 py-2 text-xs font-medium shadow-sm hover:border-primary/40 transition-colors"
                  >
                    <FlagImage flag={item.country.flag} size="sm" />
                    <span className="truncate">{item.country.nameJa}</span>
                  </div>
                ))}
              </div>
            </div>

            <Button className="mt-6 font-semibold" onClick={() => restart()}>
              <RefreshCw className="size-4 mr-1.5" /> 次の10問に挑戦する
            </Button>
          </div>
        ) : (
          q && (
            <div className="surface-card mt-6 p-5 sm:p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 flex-1">
                  <Progress value={((index + (pickedId ? 1 : 0)) / questions.length) * 100} className="h-2 flex-1" />
                </div>
                <span className="whitespace-nowrap font-bold text-muted-foreground">
                  第{index + 1}問 / 全{questions.length}問
                </span>
              </div>

              {/* 国旗ヒントの画像表示（国旗あてモード用・高精細SVG） */}
              {q.flagHint && (
                <div className="mt-6 flex flex-col items-center justify-center">
                  <div className="overflow-hidden rounded-xl border border-border/80 shadow-md bg-card p-2">
                    <FlagImage
                      key={`flag-hint-${q.country.iso3}`}
                      flag={q.flagHint}
                      loading="eager"
                      size="2xl"
                      className="w-44 h-28 sm:w-56 sm:h-36 object-cover rounded-lg"
                    />
                  </div>
                </div>
              )}

              {/* テキストヒント（受験問題用など） */}
              {q.textHint && (
                <div className="mt-5 rounded-xl border border-primary/20 bg-primary/5 p-4 text-left font-medium text-foreground text-sm sm:text-base leading-relaxed">
                  {q.textHint}
                </div>
              )}

              {/* 問題文（国旗あてモードや国旗えらびモードでは問題文の横に国旗を表示しない） */}
              <h2 className="mt-5 font-display text-lg font-bold leading-snug flex items-center gap-2">
                {!q.flagHint && mode !== "flag_choice" && !q.isFlagGrid && (
                  <FlagImage flag={q.country.flag} size="md" />
                )}
                <span>{q.prompt}</span>
              </h2>

              {/* 選択肢一覧 */}
              <div className={cn("mt-5 grid gap-2.5", q.isFlagGrid ? "grid-cols-2 gap-3.5" : "grid-cols-1")}>
                {q.choices.map((choice) => {
                  const isAnswer = choice.id === q.answerId;
                  const state = !pickedId ? "idle" : isAnswer ? "correct" : choice.id === pickedId ? "wrong" : "idle";
                  return (
                    <button
                      key={choice.id}
                      onClick={() => answer(choice.id)}
                      disabled={!!pickedId}
                      className={cn(
                        "flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-all shadow-sm",
                        q.isFlagGrid
                          ? "flex-col justify-center py-5 text-center gap-2.5 hover:scale-[1.02]"
                          : "text-sm font-medium",
                        state === "idle" && "border-border bg-card hover:border-primary/40 hover:bg-secondary/60 hover:shadow",
                        state === "correct" && "border-success bg-success/15 font-bold shadow-sm ring-2 ring-success",
                        state === "wrong" && "border-destructive bg-destructive/10 ring-2 ring-destructive",
                      )}
                    >
                      {q.isFlagGrid ? (
                        <div className="flex flex-col items-center gap-2">
                          <FlagImage flag={choice.flag} size="xl" className="w-28 h-18 rounded-md shadow" />
                          {/* 回答後のみどの国の国旗かを表示 */}
                          {pickedId && (
                            <span className="text-xs font-semibold animate-pop text-muted-foreground">{choice.label}</span>
                          )}
                        </div>
                      ) : (
                        <span className="leading-snug">{choice.label}</span>
                      )}
                      {!q.isFlagGrid && (
                        <>
                          {state === "correct" && <Check className="size-4 shrink-0 text-success" />}
                          {state === "wrong" && <X className="size-4 shrink-0 text-destructive" />}
                        </>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* 回答後の即時解説フィードバック */}
              {pickedId && (
                <div className="mt-5 animate-pop rounded-xl border border-border bg-muted/70 p-4 text-sm">
                  <div className="flex items-center gap-2 font-bold">
                    {pickedId === q.answerId ? (
                      <>
                        <span className="flex size-6 items-center justify-center rounded-full bg-success text-white">
                          <Check className="size-4" />
                        </span>
                        <span className="text-success font-extrabold text-base">正解！</span>
                      </>
                    ) : (
                      <>
                        <span className="flex size-6 items-center justify-center rounded-full bg-destructive text-white">
                          <X className="size-4" />
                        </span>
                        <span className="text-destructive font-extrabold text-base">不正解…</span>
                      </>
                    )}
                  </div>
                  <div className="mt-2.5 flex items-start gap-2 text-foreground/90 font-medium leading-relaxed">
                    <FlagImage flag={q.country.flag} size="sm" className="mt-0.5 shrink-0" />
                    <span>{q.explanation}</span>
                  </div>
                  <Button type="button" className="mt-4 w-full font-bold shadow" onClick={next}>
                    {index + 1 >= questions.length ? "結果を見る" : "次の問題へ（第" + (index + 2) + "問）"}
                  </Button>
                </div>
              )}
            </div>
          )
        )}
      </main>
    </div>
  );
}
