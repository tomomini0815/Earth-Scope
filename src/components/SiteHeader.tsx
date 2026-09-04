import { Link } from "@tanstack/react-router";
import { Search } from "lucide-react";

const nav = [
  { to: "/", label: "地図" },
  { to: "/quiz", label: "クイズ" },
  { to: "/compare", label: "比較" },
  { to: "/mypage", label: "マイページ" },
] as const;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link to="/" className="flex items-center gap-3 font-display group">
          <div className="relative flex size-9 shrink-0 items-center justify-center transition-transform group-hover:scale-105">
            <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="EarthScope" className="size-full drop-shadow-md" />
          </div>
          <div className="flex flex-col justify-center leading-none">
            <span className="text-xl font-bold tracking-tight text-foreground leading-none">
              <span className="font-black text-2xl text-sky-500 dark:text-sky-400">E</span>arth<span className="font-black text-2xl text-teal-500 dark:text-teal-400">S</span>cope
            </span>
            <span className="text-[11px] font-bold text-muted-foreground tracking-wide -mt-0.5 flex items-center gap-1">
              <span>地球まるごと大探検</span>
              <Search className="size-3.5 stroke-[2.5] text-muted-foreground transition-transform group-hover:scale-110 group-hover:-rotate-12" />
            </span>
          </div>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
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
