import { Link } from "@tanstack/react-router";
import { Globe2, HelpCircle, BarChart3, UserCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "地図", icon: Globe2 },
  { to: "/quiz", label: "クイズ", icon: HelpCircle },
  { to: "/compare", label: "比較", icon: BarChart3 },
  { to: "/mypage", label: "マイページ", icon: UserCircle2 },
] as const;

export function MobileBottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 sm:hidden border-t border-border/60 bg-background/95 backdrop-blur-xl"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="grid grid-cols-4 h-14">
        {nav.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact: to === "/" }}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium",
              "text-muted-foreground/60 transition-all duration-150 active:scale-95",
            )}
            activeProps={{
              className: cn(
                "flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-bold",
                "text-sky-500 dark:text-sky-400 transition-all duration-150 active:scale-95",
              ),
            }}
          >
            <Icon className="size-[22px] stroke-[1.6]" />
            <span>{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
