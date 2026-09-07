import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight, Sparkles, X, Trophy } from "lucide-react";
import { useProgress } from "@/stores/progress";
import { BADGE_DESIGNS } from "@/components/GemIcons";

export function AchievementDialog() {
  const pendingAchievement = useProgress((s) => s.pendingAchievement);
  const dismissAchievement = useProgress((s) => s.dismissAchievement);
  const [isVisible, setIsVisible] = useState(false);

  const [previewAchievement, setPreviewAchievement] = useState<typeof pendingAchievement>(null);

  useEffect(() => {
    // プレビュー用カスタムイベントリスナー
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<any>;
      if (customEvent.detail) {
        setPreviewAchievement(customEvent.detail);
      }
    };
    window.addEventListener("earthscope-achievement-preview", handler);
    return () => window.removeEventListener("earthscope-achievement-preview", handler);
  }, []);

  const currentAchievement = pendingAchievement || previewAchievement;

  useEffect(() => {
    if (!currentAchievement) {
      setIsVisible(false);
      return;
    }

    // 表示開始アニメーション
    setIsVisible(true);

    // 5秒間だけ表示して自動で閉じる
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        if (pendingAchievement) {
          dismissAchievement();
        }
        setPreviewAchievement(null);
      }, 250);
    }, 5000);

    return () => clearTimeout(timer);
  }, [currentAchievement, pendingAchievement, dismissAchievement]);

  if (!currentAchievement) return null;

  const gemMeta = BADGE_DESIGNS[currentAchievement.id];
  const GemIcon = gemMeta?.icon;
  // タイトルから「バッジ獲得: 」プレフィックスがあれば除外してバッジ名を取得
  const badgeName = currentAchievement.title.replace(/^バッジ獲得:\s*/, "");

  return (
    <aside
      aria-live="polite"
      className={`fixed top-4 right-4 z-50 max-w-[calc(100vw-2rem)] sm:max-w-md transition-all duration-300 ease-out transform ${
        isVisible
          ? "translate-y-0 opacity-100 scale-100"
          : "-translate-y-3 opacity-0 scale-95 pointer-events-none"
      }`}
    >
      <div className="relative overflow-hidden rounded-2xl border border-amber-400/30 bg-card/95 dark:bg-slate-900/95 p-3.5 shadow-2xl shadow-amber-500/10 backdrop-blur-md">
        {/* 背景の淡いグラデーション */}
        <div className="pointer-events-none absolute -right-6 -top-6 size-24 rounded-full bg-amber-400/15 blur-xl" />

        <div className="relative flex items-center gap-3">
          {/* 左：宝石/トロフィー アイコン */}
          <div className="relative shrink-0">
            <div className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500/20 via-yellow-400/20 to-amber-300/10 p-1 ring-1 ring-amber-400/40 shadow-inner">
              {GemIcon ? (
                <GemIcon className="size-8 drop-shadow-sm" />
              ) : (
                <span className="text-2xl select-none">{currentAchievement.badge || "💎"}</span>
              )}
            </div>
            <span className="absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full bg-amber-500 text-[10px] text-white shadow">
              <Trophy className="size-2.5" />
            </span>
          </div>

          {/* 中央：パンくず表示 */}
          <div className="min-w-0 flex-1">
            <nav aria-label="実績獲得パンくずリスト" className="overflow-hidden">
              <ol className="flex flex-wrap items-center gap-1 text-[11px] font-medium leading-none text-muted-foreground">
                <li className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold">
                  <Sparkles className="size-3 shrink-0 text-amber-500 animate-pulse" />
                  <span>アチーブメント</span>
                </li>

                <li aria-hidden="true" className="shrink-0 text-muted-foreground/40">
                  <ChevronRight className="size-3" />
                </li>

                {gemMeta ? (
                  <>
                    <li className="shrink-0 font-semibold text-foreground/85">
                      💎 {gemMeta.gemName}
                    </li>
                    <li aria-hidden="true" className="shrink-0 text-muted-foreground/40">
                      <ChevronRight className="size-3" />
                    </li>
                  </>
                ) : null}

                <li className="truncate font-bold text-foreground">
                  {badgeName}
                </li>
              </ol>
            </nav>

            {/* サブテキスト＆マイページ誘導リンク */}
            <div className="mt-1.5 flex items-center justify-between gap-2">
              <p className="truncate text-xs text-muted-foreground">
                {currentAchievement.desc}
              </p>
              <Link
                to="/mypage"
                onClick={dismissAchievement}
                className="shrink-0 text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline inline-flex items-center gap-0.5"
              >
                <span>確認</span>
                <ChevronRight className="size-3" />
              </Link>
            </div>
          </div>

          {/* 右端：閉じるボタン */}
          <button
            type="button"
            onClick={dismissAchievement}
            className="shrink-0 rounded-full p-1 text-muted-foreground/70 hover:bg-muted hover:text-foreground transition-colors"
            aria-label="通知を閉じる"
          >
            <X className="size-3.5" />
          </button>
        </div>

        {/* 最下部：5秒タイマーのプログレスバー */}
        <div className="absolute inset-x-0 bottom-0 h-0.5 bg-amber-500/20 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 origin-left"
            style={{
              animation: isVisible ? "achievementTimerBar 5000ms linear forwards" : "none",
            }}
          />
        </div>
        <style>{`
          @keyframes achievementTimerBar {
            from { width: 100%; }
            to { width: 0%; }
          }
        `}</style>
      </div>
    </aside>
  );
}
