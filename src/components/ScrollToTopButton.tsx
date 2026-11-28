import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * 一定量スクロールしたら画面右下にふわっと表示される「トップへ戻る」ボタン。
 * モバイル時はボトムナビ（MobileBottomNav）に重ならない位置へ自動調整する。
 */
export function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 320);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="ページの先頭へ戻る"
      title="トップへ戻る"
      className={cn(
        "fixed z-40 right-4 sm:right-6 bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] sm:bottom-6",
        "flex items-center gap-1.5 rounded-full border border-border/80 bg-card/95 backdrop-blur-md",
        "px-3.5 py-2.5 sm:px-4 sm:py-2.5 text-xs font-bold text-foreground shadow-lg",
        "hover:border-sky-500/50 hover:bg-card hover:text-sky-600 dark:hover:text-sky-400",
        "active:scale-95 transition-all duration-200 cursor-pointer touch-manipulation",
        visible
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 translate-y-3 pointer-events-none",
      )}
    >
      <ArrowUp className="size-4 text-sky-500 shrink-0" />
      <span className="hidden sm:inline">トップへ戻る</span>
    </button>
  );
}
