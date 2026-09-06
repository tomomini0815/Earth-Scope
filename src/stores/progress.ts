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

export type AchievementNotification = {
  id: string;
  title: string;
  badge: string;
  desc: string;
  type: "badge" | "rank";
};

export const badgeList = [
  { id: "first-step", label: "はじめの一歩", desc: "1か国を学習達成！世界への第一歩", need: 1, icon: "🚩" },
  { id: "explorer", label: "エクスプローラー", desc: "5か国を学習達成！視野が広がってきた", need: 5, icon: "🧭" },
  { id: "navigator", label: "ワールドナビゲーター", desc: "10か国を学習達成！地球を巡る冒険者", need: 10, icon: "🗺️" },
  { id: "master", label: "地理マスター", desc: "20か国を学習達成！各国の知識が定着", need: 20, icon: "🏛️" },
  { id: "globe-trotter", label: "グローブトロッター", desc: "50か国を学習達成！地球の4分の1を踏破", need: 50, icon: "🌍" },
  { id: "centurion", label: "世界の半分", desc: "100か国を学習達成！世界制覇まであと少し", need: 100, icon: "🪐" },
  { id: "world-conqueror", label: "地球制覇", desc: "全198か国を完全制覇！偉大なる地球の主", need: 198, icon: "👑" },
];

function getTodayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type ProgressState = {
  learned: string[]; // iso3
  learnedAt: Record<string, number>; // iso3 -> timestamp
  favorites: string[]; // iso3
  wrongAnswers: string[]; // iso3 (クイズで間違えた要復習国)
  results: QuizResult[];

  // 学習時間の追跡
  totalStudySeconds: number;
  todayStudySeconds: number;
  dailyStudyHistory: Record<string, number>; // YYYY-MM-DD -> seconds
  lastStudyDate: string;
  studyStreakDays: number;

  // アチーブメント達成通知
  notifiedBadgeIds: string[];
  pendingAchievement: AchievementNotification | null;

  markLearned: (iso3: string) => void;
  toggleLearned: (iso3: string) => void;
  toggleFavorite: (iso3: string) => void;
  recordWrong: (iso3: string) => void;
  removeWrong: (iso3: string) => void;
  addResult: (r: Omit<QuizResult, "id" | "at">) => void;
  addStudySeconds: (seconds: number) => void;
  dismissAchievement: () => void;
  reset: () => void;
};

export const useProgress = create<ProgressState>()(
  persist(
    (set, get) => {
      // 内部ヘルパー: アチーブメント達成チェック
      const checkAndTriggerAchievement = (
        newLearnedCount: number,
        currentNotified: string[],
      ): { newNotified: string[]; nextPending: AchievementNotification | null } => {
        let nextPending: AchievementNotification | null = null;
        const newNotified = [...currentNotified];

        // 未通知のバッジを探索
        for (const b of badgeList) {
          if (newLearnedCount >= b.need && !newNotified.includes(b.id)) {
            newNotified.push(b.id);
            if (!nextPending) {
              nextPending = {
                id: b.id,
                title: `バッジ獲得: ${b.label}`,
                badge: b.icon,
                desc: b.desc,
                type: "badge",
              };
            }
          }
        }

        // ランクアップチェック（ランク昇格バッジも通知）
        const rank = getRank(newLearnedCount);
        const rankKey = `rank-${rank.level}`;
        if (rank.level > 1 && !newNotified.includes(rankKey)) {
          newNotified.push(rankKey);
          if (!nextPending) {
            nextPending = {
              id: rankKey,
              title: `ランク昇格: ${rank.title} (Lv.${rank.level})`,
              badge: rank.badge,
              desc: rank.desc,
              type: "rank",
            };
          }
        }

        return { newNotified, nextPending };
      };

      return {
        learned: [],
        learnedAt: {},
        favorites: [],
        wrongAnswers: [],
        results: [],

        totalStudySeconds: 0,
        todayStudySeconds: 0,
        dailyStudyHistory: {},
        lastStudyDate: getTodayString(),
        studyStreakDays: 1,

        notifiedBadgeIds: [],
        pendingAchievement: null,

        markLearned: (iso3) => {
          const s = get();
          if (s.learned.includes(iso3)) return;
          const nextLearned = [...s.learned, iso3];
          const nextLearnedAt = { ...(s.learnedAt ?? {}), [iso3]: Date.now() };
          const { newNotified, nextPending } = checkAndTriggerAchievement(
            nextLearned.length,
            s.notifiedBadgeIds ?? [],
          );
          set({
            learned: nextLearned,
            learnedAt: nextLearnedAt,
            notifiedBadgeIds: newNotified,
            pendingAchievement: nextPending ?? s.pendingAchievement,
          });
          // 能動的アクションボーナス: 1カ国学習達成につき30秒加算
          get().addStudySeconds(30);
        },

        toggleLearned: (iso3) => {
          const s = get();
          const isCurrentlyLearned = s.learned.includes(iso3);
          const nextLearned = isCurrentlyLearned
            ? s.learned.filter((c) => c !== iso3)
            : [...s.learned, iso3];

          const nextLearnedAt = { ...(s.learnedAt ?? {}) };
          if (isCurrentlyLearned) {
            delete nextLearnedAt[iso3];
          } else {
            nextLearnedAt[iso3] = Date.now();
          }

          let newNotified = s.notifiedBadgeIds ?? [];
          let nextPending = s.pendingAchievement;

          if (!isCurrentlyLearned) {
            const check = checkAndTriggerAchievement(nextLearned.length, newNotified);
            newNotified = check.newNotified;
            if (check.nextPending) {
              nextPending = check.nextPending;
            }
          }

          set({
            learned: nextLearned,
            learnedAt: nextLearnedAt,
            // 学習済みにしたら要復習リストから自動削除
            wrongAnswers: s.wrongAnswers ? s.wrongAnswers.filter((c) => c !== iso3) : [],
            notifiedBadgeIds: newNotified,
            pendingAchievement: nextPending,
          });

          // 新規学習達成時に30秒ボーナス加算
          if (!isCurrentlyLearned) {
            get().addStudySeconds(30);
          }
        },

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

        addResult: (r) => {
          set((s) => ({
            results: [
              { ...r, id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, at: Date.now() },
              ...s.results,
            ].slice(0, 50),
          }));
          // クイズ完了アクションボーナス: 1問15秒（最低30秒）
          const quizBonusSec = Math.max(30, (r.total ?? 5) * 15);
          get().addStudySeconds(quizBonusSec);
        },

        addStudySeconds: (sec) => {
          if (sec <= 0) return;
          const s = get();
          const today = getTodayString();
          let todaySec = s.todayStudySeconds ?? 0;
          let streak = s.studyStreakDays ?? 1;

          if (s.lastStudyDate !== today) {
            // 前日からの連続判定
            const lastDate = s.lastStudyDate ? new Date(s.lastStudyDate) : null;
            const todayDate = new Date(today);
            if (lastDate) {
              const diffTime = Math.abs(todayDate.getTime() - lastDate.getTime());
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              if (diffDays === 1) {
                streak += 1;
              } else if (diffDays > 1) {
                streak = 1;
              }
            }
            todaySec = sec;
          } else {
            todaySec += sec;
          }

          const currentHistory = { ...(s.dailyStudyHistory ?? {}) };
          currentHistory[today] = (currentHistory[today] || 0) + sec;

          set({
            totalStudySeconds: (s.totalStudySeconds ?? 0) + sec,
            todayStudySeconds: todaySec,
            dailyStudyHistory: currentHistory,
            lastStudyDate: today,
            studyStreakDays: streak,
          });
        },

        dismissAchievement: () => set({ pendingAchievement: null }),

        reset: () =>
          set({
            learned: [],
            learnedAt: {},
            favorites: [],
            wrongAnswers: [],
            results: [],
            totalStudySeconds: 0,
            todayStudySeconds: 0,
            dailyStudyHistory: {},
            lastStudyDate: getTodayString(),
            studyStreakDays: 1,
            notifiedBadgeIds: [],
            pendingAchievement: null,
          }),
      };
    },
    { name: "geoquest-progress" },
  ),
);
