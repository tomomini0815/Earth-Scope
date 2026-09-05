import { useEffect, useMemo, useRef, useState } from "react";
import { geoDistance, geoGraticule10, geoNaturalEarth1, geoOrthographic, geoPath } from "d3-geo";
import type { FeatureCollection, Geometry } from "geojson";
import { Globe, Map, Minus, Pause, Play, Plus, RotateCcw } from "lucide-react";

import world from "@/data/world.geo.json";
import { byMapId } from "@/data/lookup";
import { CONTINENTS, type ContinentId } from "@/data/types";
import { MICROSTATES, microstateById } from "@/data/microstates";
import { FlagImage } from "@/components/FlagImage";
import { getCountryPhoto } from "@/data/countryPhotos";
import { cn } from "@/lib/utils";

const WIDTH = 960;
const HEIGHT_2D = 500;
const HEIGHT_3D = 620; // 3D時はより大きく迫力ある正方形に近い高さ
const MIN_ZOOM_2D = 1;
const MAX_ZOOM_2D = 8;
const GLOBE_DEFAULT_RADIUS = 265; // 半径265（直径530pxの大迫力）

// 地図データ上に存在する独立198ヵ国外の自治領・海外領土のマッピング
const SPECIAL_TERRITORIES: Record<
  string,
  {
    nameJa: string;
    nameEn: string;
    flag: string;
    iso3: string;
    continent: ContinentId;
    parentMapId?: string;
    parentNameJa?: string;
  }
> = {
  "304": {
    nameJa: "グリーンランド（デンマーク自治領）",
    nameEn: "Greenland (Denmark)",
    flag: "🇬🇱",
    iso3: "GRL",
    continent: "north-america",
    parentMapId: "208",
    parentNameJa: "デンマーク",
  },
  "630": {
    nameJa: "プエルトリコ（米国自治連邦区）",
    nameEn: "Puerto Rico (USA)",
    flag: "🇵🇷",
    iso3: "PRI",
    continent: "north-america",
    parentMapId: "840",
    parentNameJa: "アメリカ",
  },
  "254": {
    nameJa: "仏領ギアナ（フランス海外県）",
    nameEn: "French Guiana (France)",
    flag: "🇬🇫",
    iso3: "GUF",
    continent: "south-america",
    parentMapId: "250",
    parentNameJa: "フランス",
  },
  "732": {
    nameJa: "西サハラ",
    nameEn: "Western Sahara",
    flag: "🇪🇭",
    iso3: "ESH",
    continent: "africa",
  },
  "010": {
    nameJa: "南極大陸",
    nameEn: "Antarctica",
    flag: "🇦🇶",
    iso3: "ATA",
    continent: "oceania",
  },
  "540": {
    nameJa: "ニューカレドニア（仏特別自治体）",
    nameEn: "New Caledonia (France)",
    flag: "🇳🇨",
    iso3: "NCL",
    continent: "oceania",
    parentMapId: "250",
    parentNameJa: "フランス",
  },
};

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
  // 初期表示を3D地球儀に設定
  const [viewMode, setViewMode] = useState<"2d" | "3d">("3d");

  // --- 2D 平面地図ステート ---
  const [zoom2d, setZoom2d] = useState(1);
  const [offset2d, setOffset2d] = useState({ x: 0, y: 0 });

  // --- 3D 地球儀ステート ---
  // 初期角度: 日本周辺（東経138, 北緯36）が正面
  const [rotation, setRotation] = useState<[number, number, number]>([-138, -36, 0]);
  const [zoom3d, setZoom3d] = useState(1);
  const [autoRotate, setAutoRotate] = useState(false);

  const [hover, setHover] = useState<{
    mapId?: string | undefined;
    name: string;
    subname?: string | undefined;
    flag?: string | undefined;
    iso3?: string | undefined;
    continent?: string | undefined;
    parentNameJa?: string | undefined;
    capital?: string | undefined;
    population?: number | undefined;
  } | null>(null);

  // ドラッグ操作用の参照
  const dragRef = useRef<{
    startX: number;
    startY: number;
    startOffset: { x: number; y: number };
    startRotation: [number, number, number];
    isDragging: boolean;
  } | null>(null);

  // 2D用 projection & paths & microstates
  const { paths2D, microstates2D } = useMemo(() => {
    const projection = geoNaturalEarth1().fitSize([WIDTH, HEIGHT_2D], collection);
    const path = geoPath(projection);
    const featurePaths = (collection.features as unknown as Feature[]).map((f) => ({
      mapId: String(f.id ?? ""),
      name: f.properties?.name ?? "",
      d: path(f as never) ?? "",
    }));

    const msPoints = MICROSTATES.map((m) => {
      const pt = projection(m.coordinates);
      return {
        ...m,
        x: pt ? pt[0] : null,
        y: pt ? pt[1] : null,
      };
    }).filter((m): m is typeof m & { x: number; y: number } => m.x !== null && m.y !== null);

    return { paths2D: featurePaths, microstates2D: msPoints };
  }, []);

  // 3D地球儀用 projection & paths & microstates
  const { paths3D, graticulePath3D, equatorPath3D, microstates3D } = useMemo(() => {
    const radius = GLOBE_DEFAULT_RADIUS * zoom3d;
    const projection = geoOrthographic()
      .scale(radius)
      .translate([WIDTH / 2, HEIGHT_3D / 2])
      .rotate(rotation)
      .clipAngle(90);

    const path = geoPath(projection);
    const graticule = geoGraticule10();

    // 赤道ライン（特別なハイライト）
    const equatorLine = {
      type: "LineString" as const,
      coordinates: Array.from({ length: 361 }, (_, i) => [i - 180, 0]),
    };

    const featurePaths = (collection.features as unknown as Feature[]).map((f) => ({
      mapId: String(f.id ?? ""),
      name: f.properties?.name ?? "",
      d: path(f as never) ?? "",
    }));

    // 3D地球儀の正面中心座標（経度・緯度）
    const center: [number, number] = [-rotation[0], -rotation[1]];

    // 3D地球儀表面の小国マーカー（正面半球・可視側のみ）
    const msPoints = MICROSTATES.map((m) => {
      // 球面上の大円距離が90°（Math.PI / 2）以上の裏側にある国は除外
      const dist = geoDistance(center, m.coordinates);
      if (dist >= Math.PI / 2 - 0.02) return null;

      const pt = projection(m.coordinates);
      if (!pt || isNaN(pt[0]) || isNaN(pt[1])) return null;
      const [x, y] = pt;
      const distFromCenter = Math.hypot(x - WIDTH / 2, y - HEIGHT_3D / 2);
      if (distFromCenter > radius - 2) return null;
      return {
        ...m,
        x,
        y,
      };
    }).filter((m): m is NonNullable<typeof m> => m !== null);

    return {
      paths3D: featurePaths,
      graticulePath3D: path(graticule) ?? "",
      equatorPath3D: path(equatorLine) ?? "",
      microstates3D: msPoints,
    };
  }, [rotation, zoom3d]);

  // 選択された国が小国の場合は、3D地球儀をその座標へ自動フォーカス
  useEffect(() => {
    if (!selectedId || viewMode !== "3d") return;
    const ms = microstateById.get(selectedId);
    if (ms) {
      setRotation([-ms.coordinates[0], -ms.coordinates[1], 0]);
      setAutoRotate(false);
    }
  }, [selectedId, viewMode]);

  // 3D自転（Auto-rotation）アニメーションループ
  useEffect(() => {
    if (viewMode !== "3d" || !autoRotate) return;

    let frameId: number;
    const step = () => {
      // ドラッグ中は自転を一時停止
      if (!dragRef.current?.isDragging) {
        setRotation(([yaw, pitch, roll]) => [yaw + 0.35, pitch, roll]);
      }
      frameId = requestAnimationFrame(step);
    };

    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [viewMode, autoRotate]);

  // 2D ズーム処理
  const zoomAt2D = (nextZoom: number, px: number, py: number) => {
    setZoom2d((z) => {
      const clamped = Math.min(MAX_ZOOM_2D, Math.max(MIN_ZOOM_2D, nextZoom));
      const k = clamped / z;
      setOffset2d((o) => ({ x: px - (px - o.x) * k, y: py - (py - o.y) * k }));
      return clamped;
    });
  };

  // 3D ズーム処理
  const zoomAt3D = (factor: number) => {
    setZoom3d((z) => Math.min(3.0, Math.max(0.75, z * factor)));
  };

  // マウスホイールイベント
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
      const factor = Math.exp(-dy * 0.0018);

      if (viewMode === "2d") {
        zoomAt2D(zoom2d * factor, e.clientX - rect.left, e.clientY - rect.top);
      } else {
        zoomAt3D(factor);
      }
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [viewMode, zoom2d, zoom3d]);

  const resetView = () => {
    if (viewMode === "2d") {
      setZoom2d(1);
      setOffset2d({ x: 0, y: 0 });
    } else {
      setZoom3d(1);
      setRotation([-138, -36, 0]);
      setAutoRotate(false);
    }
  };

  const buttonZoom = (factor: number) => {
    if (viewMode === "2d") {
      const el = containerRef.current;
      const rect = el?.getBoundingClientRect();
      zoomAt2D(zoom2d * factor, (rect?.width ?? WIDTH) / 2, (rect?.height ?? HEIGHT_2D) / 2);
    } else {
      zoomAt3D(factor);
    }
  };

  const continentColor = (id: ContinentId) =>
    CONTINENTS.find((c) => c.id === id)?.colorVar ?? "var(--land)";

  // ポインタードラッグ操作（2D: パン移動 / 3D: 地球回転）
  const handlePointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setHover(null);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startOffset: { ...offset2d },
      startRotation: [...rotation],
      isDragging: true,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current || !dragRef.current.isDragging) return;

    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;

    if (viewMode === "2d") {
      setOffset2d({
        x: dragRef.current.startOffset.x + dx,
        y: dragRef.current.startOffset.y + dy,
      });
    } else {
      // 3D地球儀の回転（操作性を高める快適な感度）
      const sensitivity = 0.38 / zoom3d;
      const [yaw0, pitch0, roll0] = dragRef.current.startRotation;
      const nextYaw = yaw0 + dx * sensitivity;
      const nextPitch = Math.max(-85, Math.min(85, pitch0 - dy * sensitivity));
      setRotation([nextYaw, nextPitch, roll0]);
    }
  };

  const handlePointerUp = () => {
    if (dragRef.current) {
      dragRef.current.isDragging = false;
    }
    dragRef.current = null;
  };

  const currentPaths = viewMode === "2d" ? paths2D : paths3D;
  const currentMicrostates = viewMode === "2d" ? microstates2D : microstates3D;
  const currentHeight = viewMode === "2d" ? HEIGHT_2D : HEIGHT_3D;
  const globeRadius = GLOBE_DEFAULT_RADIUS * zoom3d;

  return (
    <div className="relative overflow-hidden rounded-[var(--radius-xl)] border border-border bg-[var(--ocean)] shadow-[var(--shadow-panel)] transition-all">
      {/* 上部コントロールバー：表示モード切替（3D地球儀 ⇄ 2D平面） */}
      <div className="absolute left-3 top-3 z-20 flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 rounded-full border border-border/80 bg-card/90 p-1 shadow-md backdrop-blur-md">
          <button
            type="button"
            onClick={() => {
              setViewMode("3d");
              setHover(null);
            }}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all",
              viewMode === "3d"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            <Globe className="size-3.5" />
            <span>3D地球儀</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setViewMode("2d");
              setHover(null);
            }}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all",
              viewMode === "2d"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            <Map className="size-3.5" />
            <span>平面地図</span>
          </button>
        </div>

        {/* 小国・島国サポートバッジ */}
        <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-950/40 px-3 py-1 text-xs font-semibold text-sky-400 shadow-sm backdrop-blur-md">
          <span>🏝️</span>
          <span>小国・島国 (32ヵ国) 表示対応</span>
        </div>
      </div>

      {/* 3Dモード時：下部操作ガイドバー */}
      {viewMode === "3d" && (
        <div className="absolute left-3 bottom-3 z-20 flex items-center gap-3 rounded-full border border-border/60 bg-background/85 px-3.5 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-md shadow-sm">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-sky-500 animate-pulse" />
            <span>ドラッグで360°回転</span>
          </span>
          <span className="text-border">|</span>
          <span>クリックで国データ表示</span>
          <span className="hidden sm:inline text-border">|</span>
          <span className="hidden sm:inline">ホイールで拡大縮小</span>
        </div>
      )}

      {/* メイン地図 / 地球儀キャンバス */}
      <div
        ref={containerRef}
        className="relative w-full cursor-grab touch-none active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={() => {
          handlePointerUp();
          setHover(null);
        }}
      >
        <svg
          viewBox={`0 0 ${WIDTH} ${currentHeight}`}
          className="block h-auto w-full select-none"
          role="img"
          aria-label={viewMode === "2d" ? "インタラクティブ世界地図" : "3Dインタラクティブ地球儀"}
        >
          <defs>
            {/* 3D地球儀用：薄めで爽やかなオーシャングラデーション */}
            <radialGradient id="oceanGlow" cx="40%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
              <stop offset="45%" stopColor="#0ea5e9" stopOpacity="0.85" />
              <stop offset="80%" stopColor="#0284c7" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#0369a1" stopOpacity="0.95" />
            </radialGradient>

            {/* 3D地球儀用：大気グロー（柔らかい光彩） */}
            <radialGradient id="atmosphereGlow" cx="38%" cy="32%" r="68%">
              <stop offset="72%" stopColor="#38bdf8" stopOpacity="0" />
              <stop offset="92%" stopColor="#38bdf8" stopOpacity="0.25" />
              <stop offset="98%" stopColor="#0ea5e9" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0.7" />
            </radialGradient>

            {/* 地球の立体影（薄めで自然な陰影） */}
            <radialGradient id="sphereShade" cx="35%" cy="35%" r="65%">
              <stop offset="60%" stopColor="#000000" stopOpacity="0" />
              <stop offset="90%" stopColor="#000000" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0.32" />
            </radialGradient>

            {/* 選択中の国のパルスグロー */}
            <filter id="selectedGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#ffffff" floodOpacity="0.8" />
            </filter>
          </defs>

          {/* 3D地球儀の海洋球体ベース */}
          {viewMode === "3d" && (
            <g pointerEvents="none">
              {/* 海洋の球体（薄めカラーの爽やかベース） */}
              <circle
                cx={WIDTH / 2}
                cy={HEIGHT_3D / 2}
                r={globeRadius}
                fill="url(#oceanGlow)"
              />
              {/* 緯線・経線グリッド（Graticule） */}
              {graticulePath3D && (
                <path
                  d={graticulePath3D}
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="0.8"
                  strokeOpacity="0.25"
                />
              )}
              {/* 赤道ライン（金色でハイライト） */}
              {equatorPath3D && (
                <path
                  d={equatorPath3D}
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="1.3"
                  strokeOpacity="0.4"
                  strokeDasharray="4 3"
                />
              )}
            </g>
          )}

          {/* 国のポリゴン描画レイヤー */}
          <g
            transform={
              viewMode === "2d"
                ? `translate(${offset2d.x} ${offset2d.y}) scale(${zoom2d})`
                : undefined
            }
          >
            {currentPaths.map((p) => {
              // 3Dで裏側に隠れて空パスになった国はスキップ
              if (viewMode === "3d" && !p.d) return null;

              const country = byMapId(p.mapId);
              const special =
                SPECIAL_TERRITORIES[p.mapId] ??
                (p.name === "Greenland" ? SPECIAL_TERRITORIES["304"] : undefined);
              const effectiveContinent = country?.continent ?? special?.continent;

              const isLearned = learnedMapIds.has(p.mapId);
              const dimmed =
                activeContinent !== "all" && effectiveContinent !== activeContinent;
              const selected = selectedId === p.mapId || (special?.parentMapId && selectedId === special.parentMapId);
              const fill = !effectiveContinent
                ? "var(--land)"
                : isLearned
                  ? "var(--land-learned)"
                  : continentColor(effectiveContinent);

              const isClickable = !!country || !!special?.parentMapId;
              const targetMapId = country ? p.mapId : special?.parentMapId;

              const isHovered = hover?.mapId === targetMapId;

              const handleHover = () => {
                setHover({
                  mapId: targetMapId,
                  name: country ? country.nameJa : (special ? special.nameJa : p.name),
                  subname: country ? country.nameEn : (special ? special.nameEn : undefined),
                  flag: country?.flag ?? special?.flag,
                  iso3: country?.iso3 ?? special?.iso3,
                  continent: effectiveContinent,
                  parentNameJa: special?.parentNameJa,
                  capital: country?.basic.capital,
                  population: country?.society.population,
                });
              };

              return (
                <path
                  key={p.mapId + p.name + viewMode}
                  d={p.d}
                  fill={fill}
                  fillOpacity={
                    country
                      ? dimmed
                        ? 0.22
                        : selected || isHovered
                        ? 1
                        : 0.88
                      : special
                        ? dimmed
                          ? 0.22
                          : 0.7
                        : 0.55
                  }
                  stroke={selected ? "#ffffff" : isHovered ? "#38bdf8" : "#1e293b"}
                  strokeWidth={
                    viewMode === "2d"
                      ? (selected ? 2.0 : isHovered ? 1.8 : 0.6) / zoom2d
                      : selected
                      ? 2.4
                      : isHovered
                      ? 2.0
                      : 0.75
                  }
                  filter={selected || isHovered ? "url(#selectedGlow)" : undefined}
                  className={cn(
                    "transition-[fill-opacity,stroke,stroke-width] duration-150",
                    isClickable && "cursor-pointer hover:stroke-[#38bdf8]",
                    (selected || isHovered) && "drop-shadow-md"
                  )}
                  onPointerMove={() => {
                    if (dragRef.current?.isDragging) return;
                    handleHover();
                  }}
                  onMouseMove={() => {
                    if (dragRef.current?.isDragging) return;
                    handleHover();
                  }}
                  onClick={() => targetMapId && onSelect(targetMapId)}
                />
              );
            })}
          </g>

          {/* 小国・島国インタラクティブ・ピンレイヤー（全32ヵ国） */}
          <g
            transform={
              viewMode === "2d"
                ? `translate(${offset2d.x} ${offset2d.y}) scale(${zoom2d})`
                : undefined
            }
          >
            {currentMicrostates.map((m) => {
              const country = byMapId(m.id);
              if (!country) return null;

              const isLearned = learnedMapIds.has(m.id);
              const dimmed =
                activeContinent !== "all" && country.continent !== activeContinent;
              const selected = selectedId === m.id;
              const color = isLearned
                ? "var(--land-learned)"
                : continentColor(country.continent);

              // ズームに応じた視認性の良い半径（2Dではズーム逆数を乗じて一定の大きさを維持）
              const baseR = viewMode === "2d" ? 4.2 / Math.sqrt(zoom2d) : 4.8;
              const r = selected ? baseR * 1.6 : baseR;

              const handleHover = () => {
                setHover({
                  mapId: m.id,
                  name: country.nameJa,
                  subname: country.nameEn,
                  flag: country.flag,
                  iso3: country.iso3,
                  continent: country.continent,
                  capital: country.basic.capital,
                  population: country.society.population,
                });
              };

              return (
                <g
                  key={`microstate-${m.id}-${viewMode}`}
                  className="cursor-pointer group"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(m.id);
                  }}
                  onPointerMove={() => {
                    if (dragRef.current?.isDragging) return;
                    handleHover();
                  }}
                  onMouseMove={() => {
                    if (dragRef.current?.isDragging) return;
                    handleHover();
                  }}
                >
                  {/* タッチ・クリック判定用の透明ヒットエリア（快適操作） */}
                  <circle
                    cx={m.x}
                    cy={m.y}
                    r={viewMode === "2d" ? 14 / Math.sqrt(zoom2d) : 14}
                    fill="transparent"
                    pointerEvents="all"
                  />
                  {/* 外側の光彩/パルスリング */}
                  <circle
                    cx={m.x}
                    cy={m.y}
                    r={r * 1.9}
                    fill={color}
                    fillOpacity={selected ? 0.6 : dimmed ? 0.12 : 0.35}
                    className={selected ? "animate-ping" : undefined}
                  />
                  {/* メインのピン（大陸カラー・学習済みカラー） */}
                  <circle
                    cx={m.x}
                    cy={m.y}
                    r={r}
                    fill={color}
                    fillOpacity={dimmed ? 0.35 : 1}
                    stroke={selected ? "#ffffff" : "#0f172a"}
                    strokeWidth={
                      viewMode === "2d"
                        ? (selected ? 2.0 : 1.2) / Math.sqrt(zoom2d)
                        : selected
                        ? 2.2
                        : 1.4
                    }
                    filter={selected ? "url(#selectedGlow)" : undefined}
                    className="drop-shadow-sm"
                  />
                  {/* 中心ホワイトドット（さらに見やすく） */}
                  <circle
                    cx={m.x}
                    cy={m.y}
                    r={r * 0.38}
                    fill="#ffffff"
                    fillOpacity={dimmed ? 0.4 : 0.95}
                    pointerEvents="none"
                  />
                </g>
              );
            })}
          </g>

          {/* 3D地球儀の表面シャドウ & 大気グローオーバーレイ */}
          {viewMode === "3d" && (
            <g pointerEvents="none">
              {/* 球体外枠ライン（ソフトなエッジ） */}
              <circle
                cx={WIDTH / 2}
                cy={HEIGHT_3D / 2}
                r={globeRadius}
                fill="none"
                stroke="#38bdf8"
                strokeWidth="1.5"
                strokeOpacity="0.4"
              />
              {/* 薄めの立体陰影 */}
              <circle
                cx={WIDTH / 2}
                cy={HEIGHT_3D / 2}
                r={globeRadius}
                fill="url(#sphereShade)"
              />
              {/* 大気の光彩（Atmosphere Glow） */}
              <circle
                cx={WIDTH / 2}
                cy={HEIGHT_3D / 2}
                r={globeRadius}
                fill="url(#atmosphereGlow)"
              />
            </g>
          )}
        </svg>

        {/* 地図右下の固定インフォパネル（国の形を一切隠さず、写真と詳細情報をクリアに表示） */}
        {hover && (() => {
          const photo = getCountryPhoto(hover.iso3, hover.continent);

          return (
            <div
              onClick={() => hover.mapId && onSelect(hover.mapId)}
              className={cn(
                "absolute right-3 bottom-3 z-30 w-64 sm:w-72 rounded-2xl bg-card/95 p-3 text-xs text-foreground shadow-2xl backdrop-blur-md border border-border/80 transition-all duration-150 animate-pop overflow-hidden",
                hover.mapId ? "cursor-pointer hover:border-primary/60 hover:shadow-lg" : ""
              )}
            >
              {/* ヘッダー: 国旗＋国名＋大陸 */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  {hover.flag && (
                    <div className="shrink-0 drop-shadow-xs">
                      <FlagImage flag={hover.flag} size="sm" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="font-bold text-sm leading-tight text-foreground truncate">{hover.name}</div>
                    {hover.subname && (
                      <div className="text-[10px] text-muted-foreground leading-tight truncate">{hover.subname}</div>
                    )}
                  </div>
                </div>
                {hover.continent && (
                  <span
                    className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-border/60"
                    style={{
                      backgroundColor: `color-mix(in srgb, ${continentColor(hover.continent as ContinentId)} 18%, transparent)`,
                      color: continentColor(hover.continent as ContinentId),
                    }}
                  >
                    {CONTINENTS.find((c) => c.id === hover.continent)?.label}
                  </span>
                )}
              </div>

              {/* 首都・人口ミニステータス */}
              {(hover.capital || hover.population) && (
                <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-2 px-0.5 font-medium">
                  {hover.capital && (
                    <span className="truncate">首都: <strong className="text-foreground">{hover.capital}</strong></span>
                  )}
                  {hover.population && (
                    <span className="shrink-0 ml-2">人口: <strong className="text-foreground">{hover.population >= 100000000 ? (hover.population / 100000000).toFixed(1) + "億人" : (hover.population / 10000).toFixed(0) + "万人"}</strong></span>
                  )}
                </div>
              )}

              {/* 各国を象徴する高画質写真 */}
              <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl bg-slate-800 shadow-inner mb-2 group">
                {/* ブラー背景レイヤー */}
                <img
                  src={photo.url}
                  aria-hidden
                  className="absolute inset-0 size-full object-cover scale-110 blur-md brightness-50 saturate-150"
                  loading="eager"
                  referrerPolicy="no-referrer"
                />
                {/* メイン写真 */}
                <img
                  src={photo.url}
                  alt={photo.caption}
                  className="relative size-full object-contain drop-shadow-lg"
                  loading="eager"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    const img = e.currentTarget;
                    if (!img.dataset["fallback"]) {
                      img.dataset["fallback"] = "true";
                      img.src = "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=400&h=220&q=80";
                    }
                  }}
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent px-2.5 py-1 text-[10px] text-white font-medium truncate">
                  {photo.caption}
                </div>
              </div>

              {/* フッター: クリックして詳細を表示 */}
              <div className="text-[10px] text-sky-500 dark:text-sky-400 font-semibold border-t border-border/40 pt-1.5 text-center flex items-center justify-center gap-1">
                {hover.parentNameJa ? (
                  <span>本国（{hover.parentNameJa}）の詳細を表示 ➜</span>
                ) : hover.iso3 ? (
                  <>
                    <span>クリックして詳細を表示</span>
                    <span>➜</span>
                  </>
                ) : (
                  <span className="text-muted-foreground font-normal">地域データ</span>
                )}
              </div>
            </div>
          );
        })()}
      </div>

      {/* 右上のコントロールボタン群（平面地図と同一の統一デザイン） */}
      <div className="absolute right-3 top-3 flex flex-col gap-1 z-20">
        {/* 3D地球儀モード時：自動自転 ON/OFF ボタン */}
        {viewMode === "3d" && (
          <button
            type="button"
            aria-label={autoRotate ? "自転を一時停止" : "自動で自転させる"}
            title={autoRotate ? "自転を一時停止" : "自動で自転させる"}
            onClick={() => setAutoRotate(!autoRotate)}
            className={cn(
              "rounded-md border border-border bg-card p-2 text-foreground shadow-[var(--shadow-pop)] hover:bg-secondary transition-colors",
              autoRotate && "bg-sky-500 text-white border-sky-500 hover:bg-sky-600 shadow-sky-500/20"
            )}
          >
            {autoRotate ? <Pause className="size-4" /> : <Play className="size-4" />}
          </button>
        )}

        <button
          type="button"
          aria-label="拡大"
          title="拡大"
          onClick={() => buttonZoom(1.35)}
          className="rounded-md border border-border bg-card p-2 text-foreground shadow-[var(--shadow-pop)] hover:bg-secondary transition-colors"
        >
          <Plus className="size-4" />
        </button>
        <button
          type="button"
          aria-label="縮小"
          title="縮小"
          onClick={() => buttonZoom(1 / 1.35)}
          className="rounded-md border border-border bg-card p-2 text-foreground shadow-[var(--shadow-pop)] hover:bg-secondary transition-colors"
        >
          <Minus className="size-4" />
        </button>
        <button
          type="button"
          aria-label="表示をリセット"
          title="表示をリセット"
          onClick={resetView}
          className="rounded-md border border-border bg-card p-2 text-foreground shadow-[var(--shadow-pop)] hover:bg-secondary transition-colors"
        >
          <RotateCcw className="size-4" />
        </button>
      </div>
    </div>
  );
}
