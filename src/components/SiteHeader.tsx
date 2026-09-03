import { Link } from "@tanstack/react-router";
import { Globe2 } from "lucide-react";

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
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold">
          <span className="grid size-8 place-items-center rounded-full bg-primary text-primary-foreground">
            <Globe2 className="size-5" />
          </span>
          GeoQuest
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
