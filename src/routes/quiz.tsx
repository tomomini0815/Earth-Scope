import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Check, RefreshCw, X } from "lucide-react";

import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { countries } from "@/data/countries";
import type { Country } from "@/data/types";
import { useProgress } from "@/stores/progress";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/quiz")({
  head: () => ({
    meta: [
      { title: "世界地理クイズ — 国名・首都・国旗 | GeoQuest" },
      {
        name: "description",
        content: "国名・首都・国旗・歴史年表の並べ替えクイズで、世界地理の知識を定着させましょう。全5問・即時採点。",
      },
      { property: "og:title", content: "世界地理クイズ | GeoQuest" },
      { property: "og:description", content: "国名・首都・国旗・年表並べ替えの4モードで実力チェック。" },
    ],
  }),
  component: QuizPage,
});

type Mode = "capital" | "flag" | "timeline";
const MODES: { id: Mode; label: string; desc: string }[] = [
  { id: "capital", label: "首都あて", desc: "国名から首都を選ぶ" },
  { id: "flag", label: "国旗あて", desc: "国旗からその国を選ぶ" },
  { id: "timeline", label: "年表並べ替え", desc: "出来事を古い順に並べる" },
];
const QUESTION_COUNT = 5;

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
};

type Question = {
  prompt: string;
  hint?: string;
  choices: string[];
  answer: string;
  explanation: string;
};

function buildQuestions(mode: Mode): Question[] {
  const pool = shuffle(countries);
  if (mode === "timeline") {
    return pool
      .filter((c) => c.history.timeline.length >= 3)
      .slice(0, QUESTION_COUNT)
      .map((c) => {
        const picked = shuffle(c.history.timeline).slice(0, 3);
        const sorted = [...picked].sort((a, b) => Number(a.year) - Number(b.year));
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
        return {
          prompt: `${c.flag} ${c.nameJa}の出来事を古い順に並べたものはどれ？`,
          choices: shuffle([answer, ...wrongs]),
          answer,
          explanation: sorted.map((t) => `${t.year} ${t.event}`).join(" / "),
        };
      });
  }
  const label = (c: Country) => (mode === "capital" ? c.basic.capital : c.nameJa);
  return pool.slice(0, QUESTION_COUNT).map((c) => {
    const wrongs = shuffle(pool.filter((o) => o.iso3 !== c.iso3))
      .slice(0, 3)
      .map(label);
    return {
      prompt: mode === "capital" ? `${c.nameJa}の首都はどこ？` : `この国旗はどの国？`,
      hint: mode === "flag" ? c.flag : undefined,
      choices: shuffle([label(c), ...wrongs]),
      answer: label(c),
      explanation:
        mode === "capital"
          ? `${c.nameJa}（${c.nameEn}）の首都は${c.basic.capital}です。`
          : `${c.flag} は${c.nameJa}（${c.nameEn}）の国旗です。首都は${c.basic.capital}。`,
    };
  });
}

function QuizPage() {
  const [mode, setMode] = useState<Mode>("capital");
  const [seed, setSeed] = useState(0);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [correct, setCorrect] = useState(0);
  const [done, setDone] = useState(false);
  const addResult = useProgress((s) => s.addResult);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const questions = useMemo(() => buildQuestions(mode), [mode, seed]);
  const q = questions[index];

  const restart = (nextMode: Mode = mode) => {
    setMode(nextMode);
    setSeed((s) => s + 1);
    setIndex(0);
    setPicked(null);
    setCorrect(0);
    setDone(false);
  };

  const answer = (choice: string) => {
    if (picked) return;
    setPicked(choice);
    if (choice === q?.answer) setCorrect((c) => c + 1);
  };

  const next = () => {
    if (index + 1 >= questions.length) {
      const finalScore = correct;
      addResult({ mode: MODES.find((m) => m.id === mode)!.label, correct: finalScore, total: questions.length });
      setDone(true);
      return;
    }
    setIndex((i) => i + 1);
    setPicked(null);
  };

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-6">
        <h1 className="font-display text-2xl font-bold">クイズモード</h1>
        <p className="mt-1 text-sm text-muted-foreground">全{QUESTION_COUNT}問。答えを選ぶとすぐに解説が出ます。</p>

        <div className="mt-4 flex flex-wrap gap-2">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => restart(m.id)}
              className={cn(
                "rounded-full border border-border px-3 py-1.5 text-xs font-medium",
                mode === m.id ? "bg-foreground text-background" : "bg-card hover:bg-secondary",
              )}
              title={m.desc}
            >
              {m.label}
            </button>
          ))}
        </div>

        {done ? (
          <div className="surface-card mt-6 animate-pop p-6 text-center">
            <p className="text-sm text-muted-foreground">結果</p>
            <p className="font-display text-4xl font-bold text-primary">
              {correct} / {questions.length}
            </p>
            <p className="mt-2 text-sm">
              正答率 {Math.round((correct / questions.length) * 100)}%（{MODES.find((m) => m.id === mode)!.label}）
            </p>
            <Button className="mt-5" onClick={() => restart()}>
              <RefreshCw className="size-4" /> もう一度挑戦
            </Button>
          </div>
        ) : (
          q && (
            <div className="surface-card mt-6 p-5">
              <div className="flex items-center gap-3">
                <Progress value={((index + (picked ? 1 : 0)) / questions.length) * 100} className="h-2" />
                <span className="whitespace-nowrap text-xs text-muted-foreground">
                  第{index + 1}問 / {questions.length}
                </span>
              </div>

              {q.hint && <p className="mt-5 text-center text-7xl leading-none">{q.hint}</p>}
              <h2 className="mt-4 font-display text-lg font-bold">{q.prompt}</h2>

              <div className="mt-4 grid gap-2">
                {q.choices.map((choice) => {
                  const isAnswer = choice === q.answer;
                  const state = !picked ? "idle" : isAnswer ? "correct" : choice === picked ? "wrong" : "idle";
                  return (
                    <button
                      key={choice}
                      onClick={() => answer(choice)}
                      disabled={!!picked}
                      className={cn(
                        "flex items-center justify-between gap-2 rounded-lg border px-4 py-3 text-left text-sm transition-colors",
                        state === "idle" && "border-border bg-card hover:bg-secondary",
                        state === "correct" && "border-success bg-success/15 font-semibold",
                        state === "wrong" && "border-destructive bg-destructive/10",
                      )}
                    >
                      <span>{choice}</span>
                      {state === "correct" && <Check className="size-4 shrink-0 text-success" />}
                      {state === "wrong" && <X className="size-4 shrink-0 text-destructive" />}
                    </button>
                  );
                })}
              </div>

              {picked && (
                <div className="mt-4 animate-pop rounded-lg bg-muted p-3 text-sm">
                  <p className="font-bold">{picked === q.answer ? "正解！" : "残念…"}</p>
                  <p className="mt-1 text-muted-foreground">{q.explanation}</p>
                  <Button className="mt-3 w-full" onClick={next}>
                    {index + 1 >= questions.length ? "結果を見る" : "次の問題へ"}
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
