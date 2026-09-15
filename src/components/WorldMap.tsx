import { useEffect, useMemo, useRef, useState } from "react";
import { geoCentroid, geoDistance, geoGraticule10, geoNaturalEarth1, geoOrthographic, geoPath } from "d3-geo";
import type { FeatureCollection, Geometry } from "geojson";
import { Globe, Map as MapIcon, Minus, Pause, Play, Plus, RotateCcw } from "lucide-react";

import world from "@/data/world.geo.json";
import { byMapId } from "@/data/lookup";
import { CONTINENTS, type ContinentId } from "@/data/types";
import { MICROSTATES, microstateById } from "@/data/microstates";
import { FlagImage } from "@/components/FlagImage";
import { cn } from "@/lib/utils";

const WIDTH_2D = 960;
const HEIGHT_2D = 500;
const WIDTH_3D = 660; // 3D時は正方形寄りのアスペクト比で、モバイルでも大迫力で大きく表示
const HEIGHT_3D = 600;
const CX_3D = WIDTH_3D / 2; // 330
const CY_3D = HEIGHT_3D / 2; // 300
const MIN_ZOOM_2D = 0.8;
const MAX_ZOOM_2D = 24;
const MIN_ZOOM_3D = 0.6;
const MAX_ZOOM_3D = 8.0;
const GLOBE_DEFAULT_RADIUS = 270; // 半径270（直径540pxの特大迫力）

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
    continent: "north-america", // 地理的大陸は北アメリカ（所属: デンマーク）
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
  // フランス海外県（仏領ギアナ）
  "254": {
    nameJa: "仏領ギアナ（フランス海外県）",
    nameEn: "French Guiana (France)",
    flag: "🇬🇫",
    iso3: "GUF",
    continent: "south-america",
    parentMapId: "250",
    parentNameJa: "フランス",
  },
  // フランス特別自治体（ニューカレドニア）
  "540": {
    nameJa: "ニューカレドニア（仏特別自治体）",
    nameEn: "New Caledonia (France)",
    flag: "🇳🇨",
    iso3: "NCL",
    continent: "oceania",
    parentMapId: "250",
    parentNameJa: "フランス",
  },
  // フランス領南方・南極地域
  "260": {
    nameJa: "フランス領南方・南極地域（仏海外領土）",
    nameEn: "French Southern Territories (France)",
    flag: "🇹🇫",
    iso3: "ATF",
    continent: "oceania",
    parentMapId: "250",
    parentNameJa: "フランス",
  },
  // イギリス領フォークランド諸島
  "238": {
    nameJa: "フォークランド諸島（英領）",
    nameEn: "Falkland Islands (UK)",
    flag: "🇫🇰",
    iso3: "FLK",
    continent: "south-america",
    parentMapId: "826",
    parentNameJa: "イギリス",
  },
  // 台湾（中国に連動）
  "158": {
    nameJa: "台湾",
    nameEn: "Taiwan",
    flag: "🇹🇼",
    iso3: "TWN",
    continent: "asia",
    parentMapId: "156",
    parentNameJa: "中国",
  },
  // 西サハラ（モロッコに連動）
  "732": {
    nameJa: "西サハラ",
    nameEn: "Western Sahara",
    flag: "🇪🇭",
    iso3: "ESH",
    continent: "africa",
    parentMapId: "504",
    parentNameJa: "モロッコ",
  },
  // 南極大陸
  "010": {
    nameJa: "南極大陸",
    nameEn: "Antarctica",
    flag: "🇦🇶",
    iso3: "ATA",
    continent: "oceania",
  },
  // ソマリランド
  SOMALILAND: {
    nameJa: "ソマリランド",
    nameEn: "Somaliland",
    flag: "🇸🇴",
    iso3: "SOM",
    continent: "africa",
    parentMapId: "706",
    parentNameJa: "ソマリア",
  },
  // 北キプロス
  NCYPRUS: {
    nameJa: "北キプロス（トルコ系未承認地域）",
    nameEn: "Northern Cyprus",
    flag: "🇨🇾",
    iso3: "CYP",
    continent: "asia",
    parentMapId: "196",
    parentNameJa: "キプロス",
  },
};

type Feature = { id?: string | number; properties: { name?: string }; geometry: Geometry };

// GeoJSONフィーチャーから対応するmapIdを正規化して取得するヘルパー
function getFeatureMapId(f: Feature): string {
  if (f.id !== undefined && f.id !== null && String(f.id) !== "undefined") {
    return String(f.id);
  }
  const name = f.properties?.name;
  if (name === "French Guiana") return "254";
  if (name === "Kosovo") return "383"; // コソボ
  if (name === "Somaliland") return "SOMALILAND";
  if (name === "N. Cyprus") return "NCYPRUS";
  if (name === "Greenland") return "304";
  return "";
}

// フランス（250）のMultiPolygonから南米に位置する仏領ギアナ（part 0）を分離し、
// 独立したフィーチャー（id: "254", South America）として正しく地域色・大陸名を描画する正規化コレクション
function getNormalizedCollection(): FeatureCollection {
  const rawFeatures = (world as unknown as FeatureCollection).features as Feature[];
  const normalized: Feature[] = [];

  for (const f of rawFeatures) {
    if (
      String(f.id) === "250" &&
      f.geometry?.type === "MultiPolygon" &&
      Array.isArray((f.geometry as any).coordinates) &&
      (f.geometry as any).coordinates.length >= 3
    ) {
      const coords = (f.geometry as any).coordinates;
      // part 0 は南アメリカの仏領ギアナ（南米色・紫色で独立描画）
      normalized.push({
        type: "Feature",
        id: "254",
        properties: { name: "French Guiana" },
        geometry: {
          type: "Polygon",
          coordinates: coords[0],
        },
      } as unknown as Feature);
      // part 1 & 2 はヨーロッパのフランス本土およびコルシカ島（ヨーロッパ色・青色）
      normalized.push({
        type: "Feature",
        id: "250",
        properties: { name: f.properties?.name ?? "France" },
        geometry: {
          type: "MultiPolygon",
          coordinates: coords.slice(1),
        },
      } as unknown as Feature);
    } else {
      normalized.push(f);
    }
  }

  return {
    type: "FeatureCollection",
    features: normalized as any,
  };
}

const collection = getNormalizedCollection();

// 全国の中心座標（経度・緯度 [lon, lat]）マップ
const COUNTRY_CENTERS: Map<string, [number, number]> = (() => {
  const map = new Map<string, [number, number]>();
  // 1. 小国の精密座標
  for (const ms of MICROSTATES) {
    map.set(ms.id, ms.coordinates);
  }
  // 2. GeoJSONフィーチャーの重心
  for (const f of collection.features as Feature[]) {
    const mapId = getFeatureMapId(f);
    if (mapId && !map.has(mapId)) {
      try {
        const c = geoCentroid(f as never);
        if (!isNaN(c[0]) && !isNaN(c[1])) {
          map.set(mapId, c);
        }
      } catch {
        // ignore
      }
    }
  }
  return map;
})();

export type WorldMapProps = {
  learnedMapIds: Set<string>;
  visitedMapIds?: Set<string> | undefined;
  activeContinent: ContinentId | "all" | "microstates";
  isVisitedFilter?: boolean | undefined;
  selectedId?: string | undefined;
  onSelect: (mapId: string) => void;
  onHover?: (mapId: string | undefined) => void;
};

export function WorldMap({
  learnedMapIds,
  visitedMapIds,
  activeContinent,
  isVisitedFilter,
  selectedId,
  onSelect,
  onHover,
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
    x: number;
    y: number;
  } | null>(null);

  // ドラッグ操作用の参照
  const dragRef = useRef<{
    startX: number;
    startY: number;
    startOffset: { x: number; y: number };
    startRotation: [number, number, number];
    isDragging: boolean;
  } | null>(null);

  // マルチタッチ（ピンチイン・ピンチアウト）用のポインター座標追跡
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchRef = useRef<{
    lastDistance: number;
    lastCenter: { x: number; y: number };
  } | null>(null);

  // 2D用 projection & paths & microstates
  const { paths2D, microstates2D } = useMemo(() => {
    const projection = geoNaturalEarth1().fitSize([WIDTH_2D, HEIGHT_2D], collection);
    const path = geoPath(projection);
    const featurePaths = (collection.features as unknown as Feature[]).map((f) => ({
      mapId: getFeatureMapId(f),
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
      .translate([CX_3D, CY_3D])
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
      mapId: getFeatureMapId(f),
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
      const distFromCenter = Math.hypot(x - CX_3D, y - CY_3D);
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

  // 選択された国への自動フォーカス ＆ ズームイン拡大（3D地球儀 & 2D平面地図）
  useEffect(() => {
    if (!selectedId) return;
    const coords = COUNTRY_CENTERS.get(selectedId);
    if (!coords) return;

    const [lon, lat] = coords;
    const isMicro = microstateById.has(selectedId);

    if (viewMode === "3d") {
      // 3D地球儀：その国を正面に向け、ズームイン拡大
      setRotation([-lon, -lat, 0]);
      setAutoRotate(false);
      setZoom3d((z) => Math.max(z, isMicro ? 3.0 : 2.2));
    } else {
      // 2D平面地図：その国の座標を中心にズームイン拡大
      const projection = geoNaturalEarth1().fitSize([WIDTH_2D, HEIGHT_2D], collection);
      const pt = projection([lon, lat]);
      if (pt) {
        const targetZoom = Math.max(zoom2d, isMicro ? 5.0 : 3.0);
        const [px, py] = pt;
        // キャンバス中心 (WIDTH_2D / 2, HEIGHT_2D / 2) に pt が来るオフセット
        const nextOffsetX = (WIDTH_2D / 2) - (px * targetZoom);
        const nextOffsetY = (HEIGHT_2D / 2) - (py * targetZoom);
        setZoom2d(targetZoom);
        setOffset2d({ x: nextOffsetX, y: nextOffsetY });
      }
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
    setZoom3d((z) => Math.min(MAX_ZOOM_3D, Math.max(MIN_ZOOM_3D, z * factor)));
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

    // iOS Safariでのgesturestart/gesturechange（ページ拡大ピンチ）を防止し、地図内ピンチを優先
    const preventGesture = (e: Event) => {
      e.preventDefault();
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("gesturestart", preventGesture, { passive: false });
    el.addEventListener("gesturechange", preventGesture, { passive: false });

    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("gesturestart", preventGesture);
      el.removeEventListener("gesturechange", preventGesture);
    };
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
      zoomAt2D(zoom2d * factor, (rect?.width ?? WIDTH_2D) / 2, (rect?.height ?? HEIGHT_2D) / 2);
    } else {
      zoomAt3D(factor);
    }
  };

  const continentColor = (id: ContinentId) =>
    CONTINENTS.find((c) => c.id === id)?.colorVar ?? "var(--land)";

  // ポインタードラッグ & マルチタッチピンチ操作
  const handlePointerDown = (e: React.PointerEvent) => {
    try {
      (e.target as Element).setPointerCapture?.(e.pointerId);
    } catch {
      // ignore
    }
    setHover(null);
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    const pointers = Array.from(activePointersRef.current.values());

    if (pointers.length === 1) {
      // 1本指での操作開始（パンまたは3D回転）
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startOffset: { ...offset2d },
        startRotation: [...rotation],
        isDragging: true,
      };
      pinchRef.current = null;
    } else if (pointers.length >= 2) {
      // 2本指によるピンチイン・ピンチアウト操作開始
      dragRef.current = null;
      const p1 = pointers[0];
      const p2 = pointers[1];
      if (p1 && p2) {
        const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
        const center = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
        pinchRef.current = {
          lastDistance: dist,
          lastCenter: center,
        };
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!activePointersRef.current.has(e.pointerId)) return;
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    const pointers = Array.from(activePointersRef.current.values());

    // 2本指以上：ピンチイン・ピンチアウト（拡大・縮小）
    if (pointers.length >= 2) {
      const p1 = pointers[0];
      const p2 = pointers[1];
      if (!p1 || !p2) return;

      const currentDist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
      const currentCenter = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };

      if (pinchRef.current && pinchRef.current.lastDistance > 0 && currentDist > 0) {
        const factor = currentDist / pinchRef.current.lastDistance;
        const dx = currentCenter.x - pinchRef.current.lastCenter.x;
        const dy = currentCenter.y - pinchRef.current.lastCenter.y;

        const el = containerRef.current;
        const rect = el?.getBoundingClientRect();

        if (viewMode === "2d") {
          // 2本指の中心位置を基準にズーム
          const px = currentCenter.x - (rect?.left ?? 0);
          const py = currentCenter.y - (rect?.top ?? 0);
          zoomAt2D(zoom2d * factor, px, py);

          // ピンチ操作中の自然なパン移動
          if (Math.abs(dx) > 0 || Math.abs(dy) > 0) {
            setOffset2d((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
          }
        } else {
          // 3D地球儀のピンチズーム
          zoomAt3D(factor);

          // 2本指移動での地球回転
          const sensitivity = 0.28 / zoom3d;
          setRotation(([yaw, pitch, roll]) => [
            yaw + dx * sensitivity,
            Math.max(-85, Math.min(85, pitch - dy * sensitivity)),
            roll,
          ]);
        }
      }

      pinchRef.current = {
        lastDistance: currentDist,
        lastCenter: currentCenter,
      };
      return;
    }

    // 1本指での通常ドラッグ操作
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

  const handlePointerUp = (e?: React.PointerEvent) => {
    if (e) {
      try {
        (e.target as Element).releasePointerCapture?.(e.pointerId);
      } catch {
        // ignore
      }
      activePointersRef.current.delete(e.pointerId);
    } else {
      activePointersRef.current.clear();
    }

    const pointers = Array.from(activePointersRef.current.values());

    if (pointers.length === 1) {
      // 2本指から1本指に戻った場合：急激な位置ジャンプ（ワープ）を防止し、残った指でドラッグを再開
      const p = pointers[0];
      if (p) {
        dragRef.current = {
          startX: p.x,
          startY: p.y,
          startOffset: { ...offset2d },
          startRotation: [...rotation],
          isDragging: true,
        };
      }
      pinchRef.current = null;
    } else if (pointers.length === 0) {
      if (dragRef.current) {
        dragRef.current.isDragging = false;
      }
      dragRef.current = null;
      pinchRef.current = null;
    }
  };

  const currentPaths = viewMode === "2d" ? paths2D : paths3D;
  const currentMicrostates = viewMode === "2d" ? microstates2D : microstates3D;
  const currentWidth = viewMode === "2d" ? WIDTH_2D : WIDTH_3D;
  const currentHeight = viewMode === "2d" ? HEIGHT_2D : HEIGHT_3D;
  const globeRadius = GLOBE_DEFAULT_RADIUS * zoom3d;
  const currentZoomScale = viewMode === "2d" ? zoom2d : zoom3d;
  const isDefaultZoom = Math.abs(currentZoomScale - 1) < 0.05;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-panel)] transition-all flex flex-col h-full isolate">
      {/* 上部コントロールヘッダー：タブと操作ボタンを独立配置し、モバイルでも一切改行・はみ出しが起きない最適レイアウト */}
      <div className="flex items-center justify-between gap-1 sm:gap-2 px-2 py-1.5 sm:px-4 sm:py-2.5 bg-card/95 backdrop-blur-md border-b border-border/60 z-20 shrink-0 select-none rounded-t-[inherit]">
        {/* 表示モード切替（3D ⇄ 平面） - モバイルでも押しやすいタップ領域を確保しつつUIはそのまま */}
        <div className="flex items-center gap-0.5 sm:gap-1 rounded-full border border-border/80 bg-background/90 p-0.5 shadow-2xs shrink-0">
          <button
            type="button"
            onClick={() => {
              setViewMode("3d");
              setHover(null);
            }}
            className={cn(
              "relative flex items-center justify-center gap-1 sm:gap-1.5 rounded-full px-2.5 py-1 sm:px-3.5 sm:py-1.5 h-8 sm:h-8.5 text-xs font-bold transition-all cursor-pointer whitespace-nowrap touch-manipulation select-none shrink-0",
              viewMode === "3d"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground active:bg-secondary/80"
            )}
          >
            <Globe className="size-3.5 shrink-0" />
            <span>3D<span className="hidden md:inline">地球儀</span></span>
          </button>
          <button
            type="button"
            onClick={() => {
              setViewMode("2d");
              setHover(null);
            }}
            className={cn(
              "relative flex items-center justify-center gap-1 sm:gap-1.5 rounded-full px-2.5 py-1 sm:px-3.5 sm:py-1.5 h-8 sm:h-8.5 text-xs font-bold transition-all cursor-pointer whitespace-nowrap touch-manipulation select-none shrink-0",
              viewMode === "2d"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground active:bg-secondary/80"
            )}
          >
            <MapIcon className="size-3.5 shrink-0" />
            <span>平面<span className="hidden md:inline">地図</span></span>
          </button>
        </div>

        {/* コントロールボタン群（自転、一体型ズームステッパー、リセット） */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {viewMode === "3d" && (
            <button
              type="button"
              aria-label={autoRotate ? "自転を一時停止" : "自動で自転させる"}
              title={autoRotate ? "自転を一時停止" : "自動で自転させる"}
              onClick={() => setAutoRotate(!autoRotate)}
              className={cn(
                "size-8 sm:size-9 rounded-full border border-border/80 bg-background/95 backdrop-blur-xs text-foreground hover:bg-secondary active:scale-95 transition-all flex items-center justify-center cursor-pointer shadow-xs touch-manipulation shrink-0 relative",
                autoRotate && "bg-sky-500 text-white border-sky-500 hover:bg-sky-600 shadow-sky-500/20"
              )}
            >
              {autoRotate ? <Pause className="size-3.5 sm:size-4" /> : <Play className="size-3.5 sm:size-4" />}
            </button>
          )}

          {/* 一体型ズームステッパー（縮小・倍率・拡大をワンピルに集約し、劇的に省スペース化） */}
          <div className="flex items-center rounded-full border border-border/80 bg-background/95 backdrop-blur-xs shadow-xs p-0.5 shrink-0">
            <button
              type="button"
              aria-label="縮小"
              title="縮小"
              onClick={() => buttonZoom(1 / 1.35)}
              className="size-7 sm:size-8 rounded-full hover:bg-secondary active:scale-90 transition-all flex items-center justify-center cursor-pointer text-muted-foreground hover:text-foreground touch-manipulation shrink-0"
            >
              <Minus className="size-3" />
            </button>

            <button
              type="button"
              onClick={resetView}
              aria-label="倍率を等倍にリセット"
              title="クリック/タップで等倍（1.0×）にリセット"
              className={cn(
                "h-7 sm:h-8 px-1.5 sm:px-2 rounded-full text-[11px] font-mono font-bold transition-all flex items-center gap-0.5 cursor-pointer touch-manipulation active:scale-95 shrink-0",
                isDefaultZoom
                  ? "text-muted-foreground hover:bg-secondary"
                  : "bg-primary/15 text-primary hover:bg-primary/25"
              )}
            >
              <span className="tabular-nums">{currentZoomScale.toFixed(1)}×</span>
              {!isDefaultZoom && (
                <RotateCcw className="size-2.5 opacity-70" />
              )}
            </button>

            <button
              type="button"
              aria-label="拡大"
              title="拡大"
              onClick={() => buttonZoom(1.35)}
              className="size-7 sm:size-8 rounded-full hover:bg-secondary active:scale-90 transition-all flex items-center justify-center cursor-pointer text-muted-foreground hover:text-foreground touch-manipulation shrink-0"
            >
              <Plus className="size-3" />
            </button>
          </div>

          {/* 全体視点リセットボタン */}
          <button
            type="button"
            aria-label="表示をリセット"
            title="表示をリセット"
            onClick={resetView}
            className="size-7.5 sm:size-8.5 rounded-full border border-border/80 bg-background/95 backdrop-blur-xs text-foreground hover:bg-secondary active:scale-90 transition-all flex items-center justify-center cursor-pointer shadow-xs touch-manipulation shrink-0"
          >
            <RotateCcw className="size-3.5 sm:size-4" />
          </button>
        </div>
      </div>

      {/* 操作ガイド（モバイル・タブレットのピンチ操作対応を明示） */}
      <div className="pointer-events-none absolute left-3 bottom-2.5 z-20 flex items-center gap-1.5 sm:gap-2 text-[11px] font-normal text-muted-foreground/80 select-none drop-shadow-xs">
        {viewMode === "3d" ? (
          <span className="flex items-center gap-1">
            <span className="text-sky-500 font-bold text-xs">↻</span>
            <span className="hidden sm:inline">ドラッグで360°回転</span>
            <span className="sm:hidden">回転</span>
          </span>
        ) : (
          <span className="flex items-center gap-1">
            <span className="text-sky-500 font-bold text-xs">✥</span>
            <span className="hidden sm:inline">ドラッグで移動</span>
            <span className="sm:hidden">移動</span>
          </span>
        )}
        <span className="text-border/80">•</span>
        <span>
          <span className="md:hidden">タップで国データ</span>
          <span className="hidden md:inline">クリックで国データ</span>
        </span>
        <span className="text-border/80">•</span>
        <span className="text-sky-600 dark:text-sky-400 font-medium">
          <span className="md:hidden">2本指ピンチで拡大縮小</span>
          <span className="hidden md:inline">ピンチ / ホイールで拡大縮小</span>
        </span>
      </div>

      {/* メイン地図 / 地球儀キャンバス */}
      <div
        ref={containerRef}
        className="relative w-full flex-1 min-h-0 flex items-center justify-center cursor-grab touch-none active:cursor-grabbing overflow-hidden select-none bg-[var(--ocean)] rounded-b-[inherit]"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={() => {
          handlePointerUp();
          setHover(null);
          onHover?.(undefined);
        }}
      >
        <svg
          viewBox={`0 0 ${currentWidth} ${currentHeight}`}
          className="block h-full max-h-full w-full object-contain select-none"
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
                cx={CX_3D}
                cy={CY_3D}
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
              const parentCountry = special?.parentMapId ? byMapId(special.parentMapId) : undefined;
              // その地域の実際の地理的大陸（領土・主権は親国でも、仏領ギアナは南アメリカ、ニューカレドニアはオセアニア、グリーンランドは北アメリカ）
              const geographicContinent = special?.continent ?? country?.continent;
              const effectiveContinent = geographicContinent ?? parentCountry?.continent;

              const isLearned =
                learnedMapIds.has(p.mapId) ||
                (!!special?.parentMapId && learnedMapIds.has(special.parentMapId));
              const isVisited =
                (visitedMapIds?.has(p.mapId) ?? false) ||
                (!!special?.parentMapId && (visitedMapIds?.has(special.parentMapId) ?? false));

              // 大陸・訪問フィルター判定
              const matchesContinent = isVisitedFilter
                ? isVisited
                : activeContinent === "all" ||
                  geographicContinent === activeContinent ||
                  parentCountry?.continent === activeContinent;
              const dimmed =
                activeContinent === "microstates"
                  ? true
                  : !matchesContinent;
              const selected = selectedId === p.mapId || (special?.parentMapId && selectedId === special.parentMapId);
              const fill = !geographicContinent
                ? "var(--land)"
                : isVisitedFilter && isVisited
                  ? "#ea580c"
                  : isLearned
                    ? "var(--land-learned)"
                    : continentColor(geographicContinent);

              const isClickable = !!country || !!special?.parentMapId;
              const targetMapId = country ? p.mapId : special?.parentMapId;

              const isHovered = hover?.mapId === targetMapId;

              const handleHover = (clientX: number, clientY: number) => {
                const rect = containerRef.current?.getBoundingClientRect();
                setHover({
                  mapId: targetMapId,
                  name: country ? country.nameJa : (special ? special.nameJa : p.name),
                  subname: country ? country.nameEn : (special ? special.nameEn : undefined),
                  flag: country?.flag ?? special?.flag,
                  iso3: country?.iso3 ?? special?.iso3,
                  continent: geographicContinent ?? effectiveContinent,
                  parentNameJa: special?.parentNameJa,
                  capital: country?.basic.capital,
                  population: country?.society.population,
                  x: clientX - (rect?.left ?? 0),
                  y: clientY - (rect?.top ?? 0),
                });
                onHover?.(targetMapId);
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
                  onPointerMove={(e) => {
                    if (dragRef.current?.isDragging) return;
                    handleHover(e.clientX, e.clientY);
                  }}
                  onMouseMove={(e) => {
                    if (dragRef.current?.isDragging) return;
                    handleHover(e.clientX, e.clientY);
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

              const isMicrostateActive = activeContinent === "microstates";
              const isLearned = learnedMapIds.has(m.id);
              const isVisited = visitedMapIds?.has(m.id) ?? false;
              const dimmed = isVisitedFilter
                ? !isVisited
                : !isMicrostateActive &&
                  activeContinent !== "all" &&
                  country.continent !== activeContinent;
              const selected = selectedId === m.id;
              const color = isVisitedFilter && isVisited
                ? "#ea580c"
                : isLearned
                  ? "var(--land-learned)"
                  : continentColor(country.continent);

              // ズームに応じた視認性の良い半径（2Dではズーム逆数を乗じて一定の大きさを維持）
              // 小国・島国フィルターON時はピンを1.35倍に拡大して存在感を際立たせる
              const baseScale = isMicrostateActive ? 1.35 : 1.0;
              const baseR = (viewMode === "2d" ? 4.2 / Math.sqrt(zoom2d) : 4.8) * baseScale;
              const r = selected ? baseR * 1.5 : baseR;

              const handleHover = (clientX: number, clientY: number) => {
                const rect = containerRef.current?.getBoundingClientRect();
                setHover({
                  mapId: m.id,
                  name: country.nameJa,
                  subname: country.nameEn,
                  flag: country.flag,
                  iso3: country.iso3,
                  continent: country.continent,
                  capital: country.basic.capital,
                  population: country.society.population,
                  x: clientX - (rect?.left ?? 0),
                  y: clientY - (rect?.top ?? 0),
                });
                onHover?.(m.id);
              };

              return (
                <g
                  key={`microstate-${m.id}-${viewMode}`}
                  className="cursor-pointer group"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(m.id);
                  }}
                  onPointerMove={(e) => {
                    if (dragRef.current?.isDragging) return;
                    handleHover(e.clientX, e.clientY);
                  }}
                  onMouseMove={(e) => {
                    if (dragRef.current?.isDragging) return;
                    handleHover(e.clientX, e.clientY);
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
                  {/* 選択時の外側フォーカスリング */}
                  {selected && (
                    <circle
                      cx={m.x}
                      cy={m.y}
                      r={r * 2.2}
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth={viewMode === "2d" ? 2 / Math.sqrt(zoom2d) : 2.2}
                      strokeOpacity="0.9"
                      filter="url(#selectedGlow)"
                    />
                  )}
                  {/* 小国・島国フィルター時のハイライトリング（全32小国の位置を鮮やかに強調） */}
                  {isMicrostateActive && !selected && (
                    <circle
                      cx={m.x}
                      cy={m.y}
                      r={r * 2.0}
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth={viewMode === "2d" ? 1.4 / Math.sqrt(zoom2d) : 1.5}
                      strokeOpacity="0.8"
                      strokeDasharray={viewMode === "2d" ? `${3 / Math.sqrt(zoom2d)}, ${2 / Math.sqrt(zoom2d)}` : "3, 2"}
                    />
                  )}
                  {/* 外側のソフト光彩リング */}
                  <circle
                    cx={m.x}
                    cy={m.y}
                    r={r * 1.6}
                    fill={color}
                    fillOpacity={selected ? 0.35 : isMicrostateActive ? 0.4 : dimmed ? 0.1 : 0.25}
                  />
                  {/* メインのピン（大陸カラー・学習済みカラー） */}
                  <circle
                    cx={m.x}
                    cy={m.y}
                    r={r}
                    fill={color}
                    fillOpacity={dimmed ? 0.35 : 1}
                    stroke={selected ? "#ffffff" : isMicrostateActive ? "#38bdf8" : "#0f172a"}
                    strokeWidth={
                      viewMode === "2d"
                        ? (selected ? 2.0 : isMicrostateActive ? 1.6 : 1.2) / Math.sqrt(zoom2d)
                        : selected
                        ? 2.2
                        : isMicrostateActive
                        ? 1.8
                        : 1.4
                    }
                    filter={selected || isMicrostateActive ? "url(#selectedGlow)" : undefined}
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
                cx={CX_3D}
                cy={CY_3D}
                r={globeRadius}
                fill="none"
                stroke="#38bdf8"
                strokeWidth="1.5"
                strokeOpacity="0.4"
              />
              {/* 薄めの立体陰影 */}
              <circle
                cx={CX_3D}
                cy={CY_3D}
                r={globeRadius}
                fill="url(#sphereShade)"
              />
              {/* 大気の光彩（Atmosphere Glow） */}
              <circle
                cx={CX_3D}
                cy={CY_3D}
                r={globeRadius}
                fill="url(#atmosphereGlow)"
              />
            </g>
          )}
        </svg>

        {/* 極薄・超軽量フローティング・スマートピル（カーソル直上に浮かび、国の形を100%見通せる設計） */}
        {hover && (
          <div
            style={{
              left: `${Math.max(80, Math.min(hover.x, (containerRef.current?.clientWidth ?? 800) - 80))}px`,
              top: `${Math.max(36, hover.y - 14)}px`,
              transform: "translate(-50%, -100%)",
            }}
            className="pointer-events-none absolute z-30 transition-transform duration-75 ease-out select-none whitespace-nowrap"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-slate-950/85 px-3 py-1 text-xs text-white shadow-xl backdrop-blur-md dark:border-white/15 dark:bg-black/90 whitespace-nowrap">
              {hover.flag && (
                <div className="shrink-0 drop-shadow-xs">
                  <FlagImage flag={hover.flag} size="xs" />
                </div>
              )}
              <div className="inline-flex items-center gap-1.5 whitespace-nowrap">
                <span className="font-bold text-[13px] leading-none text-white tracking-tight">
                  {hover.name}
                </span>
                {hover.parentNameJa && (
                  <span className="text-[10px] bg-white/20 text-white px-1.5 py-0.5 rounded-sm font-semibold">
                    所属: {hover.parentNameJa}
                  </span>
                )}
                {hover.subname && (
                  <span className="text-[11px] text-slate-300 dark:text-slate-400 font-normal">
                    ({hover.subname})
                  </span>
                )}
              </div>
              {hover.continent && (
                <span
                  className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wide border border-white/20 whitespace-nowrap"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${continentColor(hover.continent as ContinentId)} 40%, transparent)`,
                    color: "#ffffff",
                  }}
                >
                  {CONTINENTS.find((c) => c.id === hover.continent)?.label}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
