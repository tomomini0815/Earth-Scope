import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search, X } from "lucide-react";

import { FlagImage } from "@/components/FlagImage";
import { countries } from "@/data/countries";
import { continentLabel, type Country } from "@/data/types";
import { cn } from "@/lib/utils";

const MAX_RESULTS = 8;

function searchCountries(query: string): Country[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const scored: { country: Country; score: number }[] = [];
  for (const c of countries) {
    const ja = c.nameJa.toLowerCase();
    const en = c.nameEn.toLowerCase();
    const cap = c.basic.capital.toLowerCase();
    const iso = c.iso3.toLowerCase();

    let score = 0;
    if (ja === q || en === q || iso === q) score = 100;
    else if (ja.startsWith(q)) score = 80;
    else if (en.startsWith(q) || cap.startsWith(q)) score = 60;
    else if (ja.includes(q)) score = 40;
    else if (cap.includes(q) || en.includes(q) || iso.includes(q)) score = 20;

    if (score > 0) {
      scored.push({ country: c, score });
    }
  }

  return scored
    .sort((a, b) => b.score - a.score || b.country.society.population - a.country.society.population)
    .slice(0, MAX_RESULTS)
    .map((x) => x.country);
}

export function HeaderQuickSearch() {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const results = useMemo(() => searchCountries(query), [query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // 展開時に自動で入力欄へフォーカス
  useEffect(() => {
    if (!expanded) return;
    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 60);
    return () => window.clearTimeout(timer);
  }, [expanded]);

  // 外側クリックで閉じる & "/" キーでクイック展開
  useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement) &&
        !(e.target instanceof HTMLElement && e.target.isContentEditable)
      ) {
        e.preventDefault();
        setExpanded(true);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const closeSearch = () => {
    setExpanded(false);
    setQuery("");
    inputRef.current?.blur();
  };

  const selectCountry = (c: Country) => {
    closeSearch();
    void navigate({
      to: "/country/$iso3",
      params: { iso3: c.iso3.toLowerCase() },
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      closeSearch();
      return;
    }
    if (results.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = results[activeIndex] ?? results[0];
      if (target) selectCountry(target);
    }
  };

  const showDropdown = expanded && query.trim().length > 0;

  return (
    <div ref={wrapperRef} className="relative flex items-center justify-end">
      {/* サーチアイコンを押すと左方向へ滑らかに伸びるピル型コンテナ */}
      <div
        className={cn(
          "relative flex items-center h-9 rounded-full border transition-all duration-300 ease-out overflow-hidden",
          expanded
            ? "w-[calc(100vw-9.5rem)] max-w-[260px] sm:w-48 md:w-60 lg:w-72 border-sky-500/60 bg-card shadow-sm ring-2 ring-sky-500/15"
            : "w-9 border-border/70 bg-muted/50 hover:bg-secondary hover:border-border",
        )}
      >
        <button
          type="button"
          onClick={() => {
            if (!expanded) {
              setExpanded(true);
            } else {
              inputRef.current?.focus();
            }
          }}
          aria-label="国名・首都で検索"
          title="国を検索（/ キー）"
          className="flex size-9 shrink-0 items-center justify-center text-foreground/85 hover:text-foreground transition-colors cursor-pointer touch-manipulation"
        >
          <Search className="size-4.5 stroke-[2.5]" />
        </button>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="国名・首都で検索..."
          aria-label="国名・首都で検索"
          tabIndex={expanded ? 0 : -1}
          className={cn(
            "h-full w-full min-w-0 bg-transparent pr-8 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none transition-opacity duration-200",
            expanded ? "opacity-100" : "opacity-0 pointer-events-none",
          )}
        />

        {expanded && (
          <button
            type="button"
            onClick={() => {
              if (query) {
                setQuery("");
                inputRef.current?.focus();
              } else {
                closeSearch();
              }
            }}
            aria-label={query ? "検索をクリア" : "検索を閉じる"}
            className="absolute right-2 top-1/2 -translate-y-1/2 flex size-6 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {/* 検索候補ドロップダウン */}
      {showDropdown && (
        <div
          role="listbox"
          className="absolute right-0 top-full mt-1.5 z-50 w-[min(90vw,320px)] overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-xl"
        >
          {results.length > 0 ? (
            <ul className="max-h-80 overflow-y-auto py-1">
              {results.map((c, idx) => {
                const isActive = idx === activeIndex;
                return (
                  <li key={c.iso3}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={() => selectCountry(c)}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs transition-colors cursor-pointer",
                        isActive ? "bg-secondary text-foreground" : "hover:bg-secondary/60",
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FlagImage flag={c.flag} size="xs" className="rounded-xs shrink-0 shadow-2xs" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-foreground truncate">{c.nameJa}</span>
                            <span className="text-[10px] text-muted-foreground truncate hidden sm:inline">
                              {c.nameEn}
                            </span>
                          </div>
                          <p className="text-[10px] text-muted-foreground truncate">
                            首都: {c.basic.capital}
                          </p>
                        </div>
                      </div>
                      <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {continentLabel(c.continent)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="px-3 py-4 text-center text-xs text-muted-foreground">
              「{query}」に一致する国が見つかりませんでした
            </div>
          )}
        </div>
      )}
    </div>
  );
}
