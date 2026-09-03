import { useEffect, useMemo, useRef, useState } from "react";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import type { FeatureCollection, Geometry } from "geojson";
import { Minus, Plus, RotateCcw } from "lucide-react";

import world from "@/data/world.geo.json";
import { byMapId } from "@/data/lookup";
import { CONTINENTS, type ContinentId } from "@/data/types";
import { cn } from "@/lib/utils";

const WIDTH = 960;
const HEIGHT = 500;
const MIN_ZOOM = 1;
const MAX_ZOOM = 8;

type Feature = { id?: string | number; properties: { name?: string }; geometry: Geometry };

const collection = world as unknown as FeatureCollection;

export type WorldMapProps = {
  learnedMapIds: Set<string>;
  activeContinent: ContinentId | "all";
  selectedId?: string | undefined;
  onSelect: (mapId: string) => void;
};

export function WorldMap({
  learnedMapIds,
  activeContinent,
  selectedId,
  onSelect,
}: WorldMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [hover, setHover] = useState<{ name: string; x: number; y: number } | null>(null);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const paths = useMemo(() => {
    const projection = geoNaturalEarth1().fitSize([WIDTH, HEIGHT], collection);
    const path = geoPath(projection);
    return (collection.features as unknown as Feature[]).map((f) => ({
      mapId: String(f.id ?? ""),
      name: f.properties?.name ?? "",
      d: path(f as never) ?? "",
    }));
  }, []);

  const zoomAt = (nextZoom: number, px: number, py: number) => {
    setZoom((z) => {
      const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextZoom));
      const k = clamped / z;
      setOffset((o) => ({ x: px - (px - o.x) * k, y: py - (py - o.y) * k }));
      return clamped;
    });
  };

  const wheelRef = useRef<(e: WheelEvent) => void>(() => {});
  wheelRef.current = (e: WheelEvent) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
    zoomAt(zoom * Math.exp(-dy * 0.0018), e.clientX - rect.left, e.clientY - rect.top);
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      wheelRef.current(e);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const resetView = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  const buttonZoom = (factor: number) => {
    const el = containerRef.current;
    const rect = el?.getBoundingClientRect();
    zoomAt(zoom * factor, (rect?.width ?? WIDTH) / 2, (rect?.height ?? HEIGHT) / 2);
  };

  const continentColor = (id: ContinentId) =>
    CONTINENTS.find((c) => c.id === id)?.colorVar ?? "var(--land)";

  return (
    <div className="relative overflow-hidden rounded-[var(--radius-xl)] border border-border bg-[var(--ocean)] shadow-[var(--shadow-panel)]">
      <div
        ref={containerRef}
        className="relative w-full cursor-grab touch-none active:cursor-grabbing"
        onPointerDown={(e) => {
          (e.target as Element).setPointerCapture?.(e.pointerId);
          drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          setOffset({
            x: drag.current.ox + (e.clientX - drag.current.x),
            y: drag.current.oy + (e.clientY - drag.current.y),
          });
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerLeave={() => {
          drag.current = null;
          setHover(null);
        }}
      >
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="block h-auto w-full select-none"
          role="img"
          aria-label="インタラクティブ世界地図"
        >
          <g transform={`translate(${offset.x} ${offset.y}) scale(${zoom})`}>
            {paths.map((p) => {
              const country = byMapId(p.mapId);
              const isLearned = learnedMapIds.has(p.mapId);
              const dimmed =
                activeContinent !== "all" && country?.continent !== activeContinent;
              const selected = selectedId === p.mapId;
              const fill = !country
                ? "var(--land)"
                : isLearned
                  ? "var(--land-learned)"
                  : continentColor(country.continent);

              return (
                <path
                  key={p.mapId + p.name}
                  d={p.d}
                  fill={fill}
                  fillOpacity={country ? (dimmed ? 0.25 : selected ? 1 : 0.78) : 0.55}
                  stroke="var(--color-background)"
                  strokeWidth={selected ? 1.6 / zoom : 0.5 / zoom}
                  className={cn(
                    "transition-[fill-opacity,stroke-width] duration-150",
                    country && "cursor-pointer hover:fill-opacity-100",
                  )}
                  onPointerMove={(e) => {
                    const rect = containerRef.current?.getBoundingClientRect();
                    setHover({
                      name: country ? `${country.flag} ${country.nameJa}` : p.name,
                      x: e.clientX - (rect?.left ?? 0),
                      y: e.clientY - (rect?.top ?? 0),
                    });
                  }}
                  onClick={() => country && onSelect(p.mapId)}
                />
              );
            })}
          </g>
        </svg>

        {hover && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md bg-foreground/90 px-2 py-1 text-xs font-medium text-background"
            style={{ left: hover.x, top: hover.y - 8 }}
          >
            {hover.name}
          </div>
        )}
      </div>

      <div className="absolute right-3 top-3 flex flex-col gap-1">
        <button
          type="button"
          aria-label="拡大"
          onClick={() => buttonZoom(1.4)}
          className="rounded-md border border-border bg-card p-2 text-foreground shadow-[var(--shadow-pop)] hover:bg-secondary"
        >
          <Plus className="size-4" />
        </button>
        <button
          type="button"
          aria-label="縮小"
          onClick={() => buttonZoom(1 / 1.4)}
          className="rounded-md border border-border bg-card p-2 text-foreground shadow-[var(--shadow-pop)] hover:bg-secondary"
        >
          <Minus className="size-4" />
        </button>
        <button
          type="button"
          aria-label="表示をリセット"
          onClick={resetView}
          className="rounded-md border border-border bg-card p-2 text-foreground shadow-[var(--shadow-pop)] hover:bg-secondary"
        >
          <RotateCcw className="size-4" />
        </button>
      </div>
    </div>
  );
}
