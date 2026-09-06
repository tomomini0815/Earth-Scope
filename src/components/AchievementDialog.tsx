import { Link } from "@tanstack/react-router";
import { Award, Sparkles, Trophy, X, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useProgress } from "@/stores/progress";

export function AchievementDialog() {
  const pendingAchievement = useProgress((s) => s.pendingAchievement);
  const dismissAchievement = useProgress((s) => s.dismissAchievement);

  const isOpen = !!pendingAchievement;

  if (!pendingAchievement) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && dismissAchievement()}>
      <DialogContent className="sm:max-w-md overflow-hidden border-2 border-amber-400/40 bg-gradient-to-b from-card via-card to-amber-500/5 p-0 text-center shadow-2xl">
        {/* 背景の光・装飾 */}
        <div className="absolute inset-x-0 -top-24 h-48 bg-gradient-to-b from-amber-400/20 via-yellow-500/10 to-transparent blur-2xl pointer-events-none" />

        {/* 閉じるボタン */}
        <button
          type="button"
          onClick={dismissAchievement}
          className="absolute right-3.5 top-3.5 z-10 rounded-full p-1.5 text-muted-foreground hover:bg-muted transition-colors"
          aria-label="閉じる"
        >
          <X className="size-4" />
        </button>

        <div className="relative px-6 pt-8 pb-6 flex flex-col items-center">
          {/* 上部タグ */}
          <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 px-3 py-1 text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest animate-bounce">
            <Sparkles className="size-3.5" />
            <span>ACHIEVEMENT UNLOCKED</span>
            <Sparkles className="size-3.5" />
          </div>

          {/* バッジ大型アイコン */}
          <div className="relative mt-5 mb-4">
            <div className="size-24 rounded-3xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-300 p-0.5 shadow-xl shadow-amber-500/25 rotate-3 hover:rotate-0 transition-transform duration-300">
              <div className="size-full rounded-[22px] bg-background/95 dark:bg-slate-900 flex items-center justify-center text-5xl select-none">
                {pendingAchievement.badge}
              </div>
            </div>
            <div className="absolute -bottom-2 -right-2 size-8 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-md">
              <Trophy className="size-4" />
            </div>
          </div>

          <DialogHeader className="space-y-1.5 text-center">
            <DialogTitle className="text-xl sm:text-2xl font-black font-display tracking-tight text-foreground">
              {pendingAchievement.title}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
              {pendingAchievement.desc}
            </DialogDescription>
          </DialogHeader>

          {/* 祝福メッセージ */}
          <div className="mt-4 w-full rounded-xl bg-amber-500/10 border border-amber-500/20 p-2.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
            🎉 おめでとうございます！探検の記録が更新されました！
          </div>

          {/* アクションボタン */}
          <div className="mt-6 flex w-full flex-col sm:flex-row gap-2.5">
            <Button
              asChild
              className="flex-1 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white font-bold shadow-md shadow-amber-500/20 gap-1.5"
              onClick={dismissAchievement}
            >
              <Link to="/mypage">
                <span>マイページで確認</span>
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={dismissAchievement}
            >
              学習を続ける
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
