import { Link } from "@tanstack/react-router";

const nav = [
  { to: "/", label: "地図" },
  { to: "/quiz", label: "クイズ" },
  { to: "/compare", label: "比較" },
  { to: "/mypage", label: "マイページ" },
] as const;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1600px] w-full items-center justify-between gap-4 px-4 py-2.5 sm:px-6 sm:py-3 lg:px-8">
        {/* ロゴ — モバイルでは小さく、デスクトップで通常サイズ */}
        <Link to="/" className="flex items-center gap-2 sm:gap-3 font-display group min-w-0">
          <div className="relative flex size-8 sm:size-9 shrink-0 items-center justify-center transition-transform group-hover:scale-105">
            <img
              src={`${import.meta.env.BASE_URL}logo.svg`}
              alt="EarthScope"
              className="size-full drop-shadow-md"
            />
          </div>
          <div className="flex flex-col justify-center leading-none min-w-0">
            <span className="text-lg sm:text-xl font-bold tracking-tight text-foreground leading-none">
              <span className="font-black text-xl sm:text-2xl text-sky-500 dark:text-sky-400">E</span>
              arth
              <span className="font-black text-xl sm:text-2xl text-teal-500 dark:text-teal-400">S</span>
              cope
            </span>
            {/* サブタイトルはスマートフォンでは非表示 */}
            <span className="hidden sm:block text-[11px] font-bold text-muted-foreground tracking-wide -mt-0.5">
              地球まるごと大探検
            </span>
          </div>
        </Link>

        {/* デスクトップ専用ナビゲーション — モバイルは MobileBottomNav を使用 */}
        <nav className="hidden sm:flex items-center gap-1 text-sm">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              className="rounded-full px-3 py-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground"
              activeProps={{ className: "bg-primary text-primary-foreground font-semibold" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
