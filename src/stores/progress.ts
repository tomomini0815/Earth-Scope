import { create } from "zustand";
import { persist } from "zustand/middleware";

export type QuizResult = {
  id: string;
  mode: string;
  correct: number;
  total: number;
  at: number;
};

export type RankInfo = {
  level: number;
  title: string;
  badge: string;
  color: string;
  minLearned: number;
  nextLearned: number | null;
  desc: string;
};

export const RANKS: RankInfo[] = [
  { level: 1, title: "見習いトラベラー", badge: "🧭", color: "#38bdf8", minLearned: 0, nextLearned: 5, desc: "世界への第一歩を踏み出した旅人" },
  { level: 2, title: "バックパッカー", badge: "🎒", color: "#34d399", minLearned: 5, nextLearned: 15, desc: "いくつかの国を巡り視野を広げた冒険者" },
  { level: 3, title: "ワールドエクスプローラー", badge: "🗺️", color: "#60a5fa", minLearned: 15, nextLearned: 30, desc: "大陸をまたにかけ世界を探検する旅人" },
  { level: 4, title: "地理マスター", badge: "🏛️", color: "#a78bfa", minLearned: 30, nextLearned: 60, desc: "多くの国の文化や地理を熟知した達人" },
  { level: 5, title: "大陸の覇者", badge: "👑", color: "#f59e0b", minLearned: 60, nextLearned: 100, desc: "世界を広く見渡し各地を制覇した猛者" },
  { level: 6, title: "地球儀の探検王", badge: "🪐", color: "#ec4899", minLearned: 100, nextLearned: 150, desc: "世界の大半を旅した伝説の探検家" },
  { level: 7, title: "世界大統領（地球の主）", badge: "🏆", color: "#eab308", minLearned: 150, nextLearned: null, desc: "全198ヵ国を極めし地球の完全制覇者" },
];

export function getRank(learnedCount: number): RankInfo {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (learnedCount >= RANKS[i]!.minLearned) {
      return RANKS[i]!;
    }
  }
  return RANKS[0]!;
}

type ProgressState = {
  learned: string[]; // iso3
  favorites: string[]; // iso3
  wrongAnswers: string[]; // iso3 (クイズで間違えた要復習国)
  results: QuizResult[];
  markLearned: (iso3: string) => void;
  toggleLearned: (iso3: string) => void;
  toggleFavorite: (iso3: string) => void;
  recordWrong: (iso3: string) => void;
  removeWrong: (iso3: string) => void;
  addResult: (r: Omit<QuizResult, "id" | "at">) => void;
  reset: () => void;
};

export const useProgress = create<ProgressState>()(
  persist(
    (set) => ({
      learned: [],
      favorites: [],
      wrongAnswers: [],
      results: [],
      markLearned: (iso3) =>
        set((s) => (s.learned.includes(iso3) ? s : { learned: [...s.learned, iso3] })),
      toggleLearned: (iso3) =>
        set((s) => ({
          learned: s.learned.includes(iso3)
            ? s.learned.filter((c) => c !== iso3)
            : [...s.learned, iso3],
          // 学習済みにしたら要復習リストから自動削除
          wrongAnswers: s.wrongAnswers ? s.wrongAnswers.filter((c) => c !== iso3) : [],
        })),
      toggleFavorite: (iso3) =>
        set((s) => ({
          favorites: s.favorites.includes(iso3)
            ? s.favorites.filter((c) => c !== iso3)
            : [...s.favorites, iso3],
        })),
      recordWrong: (iso3) =>
        set((s) => ({
          wrongAnswers: Array.from(new Set([iso3, ...(s.wrongAnswers ?? [])])).slice(0, 30),
        })),
      removeWrong: (iso3) =>
        set((s) => ({
          wrongAnswers: (s.wrongAnswers ?? []).filter((c) => c !== iso3),
        })),
      addResult: (r) =>
        set((s) => ({
          results: [
            { ...r, id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, at: Date.now() },
            ...s.results,
          ].slice(0, 50),
        })),
      reset: () => set({ learned: [], favorites: [], wrongAnswers: [], results: [] }),
    }),
    { name: "geoquest-progress" },
  ),
);

export const badgeList = [
  { id: "first-step", label: "はじめの一歩", desc: "1か国を学習", need: 1 },
  { id: "explorer", label: "エクスプローラー", desc: "5か国を学習", need: 5 },
  { id: "navigator", label: "ワールドナビゲーター", desc: "10か国を学習", need: 10 },
  { id: "master", label: "地理マスター", desc: "20か国を学習", need: 20 },
  { id: "globe-trotter", label: "グローブトロッター", desc: "50か国を学習", need: 50 },
  { id: "centurion", label: "世界の半分", desc: "100か国を学習", need: 100 },
  { id: "world-conqueror", label: "地球制覇", desc: "198か国全制覇", need: 198 },
];
