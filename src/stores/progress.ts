import { create } from "zustand";
import { persist } from "zustand/middleware";

export type QuizResult = {
  id: string;
  mode: string;
  correct: number;
  total: number;
  at: number;
};

type ProgressState = {
  learned: string[]; // iso3
  favorites: string[]; // iso3
  results: QuizResult[];
  markLearned: (iso3: string) => void;
  toggleLearned: (iso3: string) => void;
  toggleFavorite: (iso3: string) => void;
  addResult: (r: Omit<QuizResult, "id" | "at">) => void;
  reset: () => void;
};

export const useProgress = create<ProgressState>()(
  persist(
    (set) => ({
      learned: [],
      favorites: [],
      results: [],
      markLearned: (iso3) =>
        set((s) => (s.learned.includes(iso3) ? s : { learned: [...s.learned, iso3] })),
      toggleLearned: (iso3) =>
        set((s) => ({
          learned: s.learned.includes(iso3)
            ? s.learned.filter((c) => c !== iso3)
            : [...s.learned, iso3],
        })),
      toggleFavorite: (iso3) =>
        set((s) => ({
          favorites: s.favorites.includes(iso3)
            ? s.favorites.filter((c) => c !== iso3)
            : [...s.favorites, iso3],
        })),
      addResult: (r) =>
        set((s) => ({
          results: [
            { ...r, id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, at: Date.now() },
            ...s.results,
          ].slice(0, 50),
        })),
      reset: () => set({ learned: [], favorites: [], results: [] }),
    }),
    { name: "geoquest-progress" },
  ),
);

export const badgeList = [
  { id: "first-step", label: "はじめの一歩", desc: "1か国を学習", need: 1 },
  { id: "explorer", label: "エクスプローラー", desc: "5か国を学習", need: 5 },
  { id: "navigator", label: "ワールドナビゲーター", desc: "10か国を学習", need: 10 },
  { id: "master", label: "地理マスター", desc: "20か国を学習", need: 20 },
];
