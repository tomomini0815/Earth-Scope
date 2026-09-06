import { useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useProgress } from "@/stores/progress";

/**
 * ユーザーが実際に「学習している状態」のときのみ学習時間を加算するスマート学習判定フック
 * - 単にページを開いて放置している時間や、マイページ（ダッシュボード確認）の閲覧時間は除外
 * - 単なるマウスカーソルの横切りのみ（mousemove）は排除し、スクロール・タップ・キー操作など学習の意思が明確なアクションを検知
 * - 最後の学習操作から30秒間のみを「アクティブ学習時間」としてカウント（30秒無操作で自動ストップ）
 * - 複数タブを同時に開いている場合でも二重加算されないマルチタブ排他制御
 */
export function useStudyTimer() {
  const addStudySeconds = useProgress((s) => s.addStudySeconds);
  const lastActiveRef = useRef<number>(0);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // 最後の学習アクションから30秒以内を「学習中」と判定（放置による水増しを完全防止）
  const ACTIVE_STUDY_WINDOW_MS = 30 * 1000;
  const TICK_INTERVAL_MS = 5000;
  const STORAGE_KEY = "earthscope_last_study_tick";

  useEffect(() => {
    // マイページ（成果確認画面）にいる間は学習時間計測から除外
    const isMypage = pathname.endsWith("/mypage") || pathname.endsWith("/mypage/");
    if (isMypage) {
      return;
    }

    // 学習アクションの検知:
    // ※mousemove（単なるマウスの揺れ）は除外し、意図的な操作のみをトリガーとする
    const recordLearningAction = () => {
      lastActiveRef.current = Date.now();
    };

    // 初期化時: ページ遷移直後は学習開始としてアクション時刻を記録
    lastActiveRef.current = Date.now();

    window.addEventListener("scroll", recordLearningAction, { passive: true });
    window.addEventListener("click", recordLearningAction, { passive: true });
    window.addEventListener("touchstart", recordLearningAction, { passive: true });
    window.addEventListener("keydown", recordLearningAction, { passive: true });

    const interval = setInterval(() => {
      // タブが非表示（別タブ作業中や最小化中）なら停止
      if (document.visibilityState !== "visible") {
        return;
      }

      const now = Date.now();
      // 直近30秒以内にスクロールやクリック等の学習操作があった場合のみ加算
      const isStudying = now - lastActiveRef.current < ACTIVE_STUDY_WINDOW_MS;
      if (!isStudying) {
        return;
      }

      // マルチタブ排他制御: 直近4秒以内に別タブで加算が行われていないか確認
      try {
        const lastTickStr = localStorage.getItem(STORAGE_KEY);
        const lastTickTime = lastTickStr ? parseInt(lastTickStr, 10) : 0;
        if (now - lastTickTime < TICK_INTERVAL_MS - 1000) {
          // 他のタブで加算済みのためスキップ
          return;
        }
        localStorage.setItem(STORAGE_KEY, String(now));
      } catch {
        // localStorage制限環境用フォールバック
      }

      // 5秒分の学習時間を進捗ストアに加算
      addStudySeconds(5);
    }, TICK_INTERVAL_MS);

    return () => {
      clearInterval(interval);
      window.removeEventListener("scroll", recordLearningAction);
      window.removeEventListener("click", recordLearningAction);
      window.removeEventListener("touchstart", recordLearningAction);
      window.removeEventListener("keydown", recordLearningAction);
    };
  }, [addStudySeconds, pathname]);
}

