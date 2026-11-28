import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  geoArea,
  geoCentroid,
  geoDistance,
  geoGraticule10,
  geoNaturalEarth1,
  geoOrthographic,
  geoPath,
} from "d3-geo";
import type { FeatureCollection, Geometry } from "geojson";
import {
  Award,
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Compass,
  Eye,
  EyeOff,
  Flame,
  Globe,
  Hand,
  HelpCircle,
  Landmark,
  LayoutGrid,
  Lightbulb,
  Map as MapIcon,
  MapPin,
  Mountain,
  Navigation,
  Puzzle,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  Sun,
  Sunrise,
  Target,
  Trophy,
  Volume2,
  VolumeX,
  Waves,
  X,
  Zap,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import world from "@/data/world.geo.json";
import { countries } from "@/data/countries";
import { byIso3, byMapId } from "@/data/lookup";
import { continentLabel, type ContinentId, type Country } from "@/data/types";
import { SiteHeader } from "@/components/SiteHeader";
import { FlagImage } from "@/components/FlagImage";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useProgress } from "@/stores/progress";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/puzzle")({
  head: () => ({
    meta: [
      { title: "世界地図ジグソーパズル - 国の形と位置を体感マスター | EarthScope" },
      {
        name: "description",
        content:
          "大陸別ステージで国のシルエットピースを白地図にはめる世界地図パズル。ヒント機能・クリアタイム計測・ベストタイム記録対応。",
      },
      { property: "og:title", content: "世界地図ジグソーパズル | EarthScope" },
      {
        property: "og:description",
        content: "国の形（シルエット）をドラッグ＆ドロップで白地図に配置して世界地理を楽しくマスターしよう。",
      },
    ],
  }),
  component: PuzzlePage,
});

const BOARD_WIDTH = 900;
const BOARD_HEIGHT = 520;
const BOARD_3D_WIDTH = 660;
const BOARD_3D_HEIGHT = 600;
const GLOBE_CX = BOARD_3D_WIDTH / 2;
const GLOBE_CY = BOARD_3D_HEIGHT / 2;
const GLOBE_BASE_RADIUS = 266;
const MAX_MAP_ZOOM = 16;
const SNAP_BASE_RADIUS = 48;
const SNAP_TOUCH_RADIUS = 64;
/** タッチ操作時、指でピースと地図が隠れないよう指の上方64pxに照準をオフセット */
const TOUCH_DRAG_OFFSET_Y = -64;

/** 画面上端付近でのドラッグ時にピースが見切れないようオフセットを動的調整 */
function getTouchDragOffsetY(clientY: number): number {
  if (clientY < 140) {
    return -Math.max(16, Math.round((clientY / 140) * Math.abs(TOUCH_DRAG_OFFSET_Y)));
  }
  return TOUCH_DRAG_OFFSET_Y;
}

type StageId = ContinentId | "world" | "world-all";

type StageConfig = {
  id: StageId;
  label: string;
  sublabel: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  pieceFill: string;
  pieceStroke: string;
  /** [minLon, minLat, maxLon, maxLat] for projection fitExtent */
  bbox: [number, number, number, number];
  iso3s: string[];
};

type RawFeature = {
  id?: string | number;
  properties: { name?: string };
  geometry: Geometry;
};

function getFeatureMapId(f: RawFeature): string {
  if (f.id !== undefined && f.id !== null && String(f.id) !== "undefined") {
    return String(f.id);
  }
  const name = f.properties?.name;
  if (name === "French Guiana") return "254";
  if (name === "Kosovo") return "383";
  if (name === "Greenland") return "304";
  return "";
}

/**
 * フランス(250)の仏領ギアナ分離＋各国の主要本土ポリゴン抽出ヘルパー
 */
function getNormalizedFeatures(): RawFeature[] {
  const rawFeatures = (world as unknown as FeatureCollection).features as RawFeature[];
  const normalized: RawFeature[] = [];

  for (const f of rawFeatures) {
    if (
      String(f.id) === "250" &&
      f.geometry?.type === "MultiPolygon" &&
      Array.isArray((f.geometry as unknown as { coordinates: unknown[] }).coordinates) &&
      (f.geometry as unknown as { coordinates: unknown[] }).coordinates.length >= 3
    ) {
      const coords = (f.geometry as unknown as { coordinates: unknown[] }).coordinates;
      normalized.push({
        type: "Feature",
        id: "254",
        properties: { name: "French Guiana" },
        geometry: {
          type: "Polygon",
          coordinates: coords[0],
        } as unknown as Geometry,
      } as unknown as RawFeature);
      normalized.push({
        type: "Feature",
        id: "250",
        properties: { name: f.properties?.name ?? "France" },
        geometry: {
          type: "MultiPolygon",
          coordinates: coords.slice(1),
        } as unknown as Geometry,
      } as unknown as RawFeature);
    } else {
      normalized.push(f);
    }
  }
  return normalized;
}

const ALL_FEATURES = getNormalizedFeatures();

// GeoJSON白地図上にポリゴンが存在する全世界の国（南極を除く全166ヵ国）
const ALL_MAP_POLYGON_ISO3S: string[] = (() => {
  const list: string[] = [];
  const seen = new Set<string>();
  for (const f of ALL_FEATURES) {
    const mapId = getFeatureMapId(f);
    if (!mapId || mapId === "010") continue;
    const country = byMapId(mapId);
    if (country && !seen.has(country.iso3)) {
      seen.add(country.iso3);
      list.push(country.iso3);
    }
  }
  return list;
})();

const STAGE_CONFIGS: StageConfig[] = [
  {
    id: "world-all",
    label: "全世界",
    sublabel: "世界地図の全ピースを制覇する完全チャレンジ",
    icon: Globe,
    accentColor: "text-sky-500",
    pieceFill: "#0284c7",
    pieceStroke: "#7dd3fc",
    bbox: [-168, -55, 180, 72],
    iso3s: ALL_MAP_POLYGON_ISO3S,
  },
  {
    id: "world",
    label: "世界主要国",
    sublabel: "世界6大陸の代表的国家オールスター",
    icon: Compass,
    accentColor: "text-indigo-500",
    pieceFill: "#6366f1",
    pieceStroke: "#a5b4fc",
    bbox: [-168, -55, 180, 72],
    iso3s: [
      "JPN", "CHN", "IND", "SAU", "TUR", "GBR", "FRA", "DEU", "ITA",
      "EGY", "NGA", "ZAF", "CAN", "USA", "MEX", "BRA", "ARG", "AUS",
    ],
  },
  {
    id: "asia",
    label: "アジア州",
    sublabel: "東アジア・東南アジア・南アジア・西アジア",
    icon: Sunrise,
    accentColor: "text-rose-500",
    pieceFill: "#f43f5e",
    pieceStroke: "#fda4af",
    bbox: [26, -11, 148, 54],
    iso3s: [
      "JPN", "CHN", "KOR", "PRK", "MNG", "IND", "PAK", "BGD", "LKA", "NPL",
      "IDN", "THA", "VNM", "PHL", "MYS", "MMR", "KHM", "LAO",
      "SAU", "TUR", "IRN", "IRQ", "SYR", "UZB", "KAZ", "AFG",
    ],
  },
  {
    id: "europe",
    label: "ヨーロッパ州",
    sublabel: "西欧・東欧・北欧・地中海諸国",
    icon: Landmark,
    accentColor: "text-sky-500",
    pieceFill: "#0ea5e9",
    pieceStroke: "#7dd3fc",
    bbox: [-24, 35, 42, 70],
    iso3s: [
      "GBR", "IRL", "FRA", "DEU", "ITA", "ESP", "PRT", "NLD", "BEL", "CHE", "AUT",
      "POL", "CZE", "HUN", "ROU", "BGR", "GRC", "UKR", "BLR",
      "SWE", "NOR", "FIN", "DNK", "ISL",
    ],
  },
  {
    id: "africa",
    label: "アフリカ州",
    sublabel: "北アフリカ・サハラ以南・南部アフリカ",
    icon: Sun,
    accentColor: "text-amber-500",
    pieceFill: "#f59e0b",
    pieceStroke: "#fcd34d",
    bbox: [-18, -35, 52, 37],
    iso3s: [
      "EGY", "LBY", "TUN", "DZA", "MAR", "SDN", "ETH", "SOM", "KEN", "TZA", "UGA",
      "NGA", "GHA", "CIV", "SEN", "MLI", "NER", "TCD", "CMR",
      "COD", "AGO", "ZMB", "ZWE", "NAM", "BWA", "MOZ", "ZAF", "MDG",
    ],
  },
  {
    id: "north-america",
    label: "北アメリカ州",
    sublabel: "北米大陸・中央アメリカ・カリブ海",
    icon: Building2,
    accentColor: "text-emerald-500",
    pieceFill: "#10b981",
    pieceStroke: "#6ee7b7",
    bbox: [-136, 7, -54, 66],
    iso3s: [
      "CAN", "USA", "MEX", "GTM", "BLZ", "HND", "SLV", "NIC", "CRI", "PAN",
      "CUB", "JAM", "HTI", "DOM", "BHS", "TTO",
    ],
  },
  {
    id: "south-america",
    label: "南アメリカ州",
    sublabel: "アンデス諸国・アマゾン・ラプラタ地域",
    icon: Mountain,
    accentColor: "text-purple-500",
    pieceFill: "#a855f7",
    pieceStroke: "#d8b4fe",
    bbox: [-82, -56, -34, 13],
    iso3s: [
      "BRA", "ARG", "CHL", "PER", "COL", "VEN", "BOL", "ECU", "PRY", "URY", "GUY", "SUR",
    ],
  },
  {
    id: "oceania",
    label: "オセアニア＆海洋",
    sublabel: "オセアニア諸国と環太平洋の島国",
    icon: Waves,
    accentColor: "text-teal-500",
    pieceFill: "#14b8a6",
    pieceStroke: "#5eead4",
    bbox: [95, -47, 180, 20],
    iso3s: [
      "AUS", "NZL", "PNG", "FJI", "SLB", "VUT", "IDN", "PHL", "MYS", "TLS",
    ],
  },
];

/**
 * MultiPolygonの国（アメリカ・ロシア・ノルウェーなど）で、遠く離れた小島によって
 * パズルピースのバウンディングボックスが巨大化するのを防ぐため、本土周辺のポリゴンのみを抽出
 */
function getPieceFeatureAndCenter(f: RawFeature): {
  pieceFeature: RawFeature;
  mainCenterLonLat: [number, number];
} {
  if (f.geometry.type === "MultiPolygon") {
    const coords = (f.geometry as unknown as { coordinates: number[][][][] }).coordinates;
    const parts = coords.map((c) => {
      const polyFeat = {
        type: "Feature",
        geometry: { type: "Polygon", coordinates: c },
      };
      return {
        coords: c,
        feat: polyFeat,
        area: geoArea(polyFeat as never),
        centroid: geoCentroid(polyFeat as never),
      };
    });
    parts.sort((a, b) => b.area - a.area);
    const largest = parts[0];
    if (largest) {
      const mainCenter = largest.centroid;
      // 本土の重心から0.24ラジアン（約1,500km）以内のポリゴン、またはロシア・カナダ等の広大国は日付変更線跨ぎを除外
      const maxRad = String(f.id) === "643" || String(f.id) === "124" ? 0.42 : 0.24;
      const keptCoords = parts
        .filter((p, idx) => {
          if (idx === 0) return true;
          // ロシア(643)のウランゲリ島やフィジー(242)の日付変更線跨ぎ（西経側）ポリゴンを除外
          if ((String(f.id) === "643" || String(f.id) === "242") && p.centroid[0] < 0) return false;
          return geoDistance(mainCenter, p.centroid) <= maxRad;
        })
        .map((p) => p.coords);

      return {
        pieceFeature: {
          ...f,
          geometry: {
            type: "MultiPolygon",
            coordinates: keptCoords.length > 0 ? keptCoords : [largest.coords],
          } as unknown as Geometry,
        },
        mainCenterLonLat: mainCenter,
      };
    }
  }

  return {
    pieceFeature: f,
    mainCenterLonLat: geoCentroid(f as never),
  };
}

function formatStopwatch(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  const tenths = Math.floor((ms % 1000) / 100);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}.${tenths}`;
}

function formatBestTime(sec: number): string {
  const mins = Math.floor(sec / 60);
  const rem = (sec % 60).toFixed(1);
  return mins > 0 ? `${mins}分${rem}秒` : `${rem}秒`;
}

// Web Audio API による心地よい効果音（外部ファイル不要）
function playPuzzleSound(type: "snap" | "wrong" | "clear" | "hint", enabled: boolean) {
  if (!enabled || typeof window === "undefined") return;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    if (type === "snap") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.11); // G5
      gain.gain.setValueAtTime(0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.18);
    } else if (type === "wrong") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.linearRampToValueAtTime(165, now + 0.15);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.18);
    } else if (type === "hint") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(659.25, now); // E5
      osc.frequency.setValueAtTime(880, now + 0.08); // A5
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.22);
    } else if (type === "clear") {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + i * 0.09);
        gain.gain.setValueAtTime(0.15, now + i * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.09 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.09);
        osc.stop(now + i * 0.09 + 0.35);
      });
    }
  } catch {
    // ignore audio errors
  }
}

type PuzzlePieceData = {
  country: Country;
  mapId: string;
  rawFeature: RawFeature;
  pieceFeature: RawFeature;
  mainCenterLonLat: [number, number];
  boardPathD: string;
  piecePathD: string;
  /** トレイ表示用：その国の中心経度を正面にして歪みゼロで投影したパスとviewBox */
  trayPathD: string;
  trayViewBox: string;
  targetX: number;
  targetY: number;
  bounds: [[number, number], [number, number]];
  width: number;
  height: number;
  viewBox: string;
};

/**
 * 大陸ごとに中心経度へ投影を回転した際、地球の裏側（反対半球）のポリゴンが
 * 日付変更線を跨いで画面を横切るのを防ぐためのクリッピングヘルパー
 */
function clipFeatureToMidLon(f: RawFeature, midLon: number): RawFeature | null {
  const isNearLon = (lon: number) => {
    let d = Math.abs(lon - midLon);
    if (d > 180) d = 360 - d;
    return d <= 105;
  };
  if (f.geometry.type === "Polygon") {
    const c = geoCentroid(f as never);
    return isNearLon(c[0]) ? f : null;
  }
  if (f.geometry.type === "MultiPolygon") {
    const coords = (f.geometry as unknown as { coordinates: number[][][][] }).coordinates;
    const kept = coords.filter((c) => {
      const pf = { type: "Feature", geometry: { type: "Polygon", coordinates: c } };
      const center = geoCentroid(pf as never);
      return isNearLon(center[0]);
    });
    if (kept.length === 0) return null;
    return {
      ...f,
      geometry: {
        type: "MultiPolygon",
        coordinates: kept,
      } as unknown as Geometry,
    };
  }
  return f;
}

type SavedPuzzleSession = {
  stageId: StageId;
  blindMode: boolean;
  shuffledIso3s: string[];
  placedIso3s: string[];
  selectedIso3: string | null;
  elapsedMs: number;
  mistakesCount: number;
  hintsUsedCount: number;
  combo: number;
  lastPlacedIso3: string | null;
  isCleared: boolean;
};

const PUZZLE_SESSION_STORAGE_KEY = "earthscope-puzzle-session";
let memoryPuzzleSession: SavedPuzzleSession | null = null;

function createShuffledList(stageId: StageId): string[] {
  const cfg = STAGE_CONFIGS.find((s) => s.id === stageId) ?? STAGE_CONFIGS[0]!;
  const list = [...cfg.iso3s];
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j]!, list[i]!];
  }
  return list;
}

function getInitialPuzzleSession(): SavedPuzzleSession {
  if (memoryPuzzleSession) {
    return memoryPuzzleSession;
  }
  if (typeof window !== "undefined") {
    try {
      const raw = sessionStorage.getItem(PUZZLE_SESSION_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as SavedPuzzleSession;
        if (
          parsed &&
          parsed.stageId &&
          Array.isArray(parsed.shuffledIso3s) &&
          parsed.shuffledIso3s.length > 0 &&
          (parsed.placedIso3s.length > 0 || parsed.elapsedMs > 0)
        ) {
          memoryPuzzleSession = parsed;
          return parsed;
        }
      }
    } catch {
      // ignore storage errors
    }
  }
  const initialList = createShuffledList("world-all");
  const fresh: SavedPuzzleSession = {
    stageId: "world-all",
    blindMode: false,
    shuffledIso3s: initialList,
    placedIso3s: [],
    selectedIso3: initialList[0] ?? null,
    elapsedMs: 0,
    mistakesCount: 0,
    hintsUsedCount: 0,
    combo: 0,
    lastPlacedIso3: null,
    isCleared: false,
  };
  memoryPuzzleSession = fresh;
  return fresh;
}

function persistPuzzleSession(session: SavedPuzzleSession) {
  memoryPuzzleSession = session;
  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem(PUZZLE_SESSION_STORAGE_KEY, JSON.stringify(session));
    } catch {
      // ignore storage errors
    }
  }
}

function PuzzlePage() {
  const initialSession = useMemo(() => getInitialPuzzleSession(), []);

  const [stageId, setStageId] = useState<StageId>(initialSession.stageId);
  const [blindMode, setBlindMode] = useState(initialSession.blindMode); // 達人モード（ピースの国名・国旗を隠す）
  const [soundEnabled, setSoundEnabled] = useState(true);

  // ゲーム進行ステート
  const [shuffledIso3s, setShuffledIso3s] = useState<string[]>(initialSession.shuffledIso3s);
  const [placedIso3s, setPlacedIso3s] = useState<Set<string>>(() => new Set(initialSession.placedIso3s));
  const [selectedIso3, setSelectedIso3] = useState<string | null>(initialSession.selectedIso3);
  const [hintLevel, setHintLevel] = useState<0 | 1 | 2>(0); // 0: なし, 1: 首都・特徴ヒント, 2: 地図上の場所ハイライト
  const [hintsUsedCount, setHintsUsedCount] = useState(initialSession.hintsUsedCount);
  const [mistakesCount, setMistakesCount] = useState(initialSession.mistakesCount);
  const [combo, setCombo] = useState(initialSession.combo);
  const [lastPlacedCountry, setLastPlacedCountry] = useState<Country | null>(() =>
    initialSession.lastPlacedIso3 ? (byIso3(initialSession.lastPlacedIso3) ?? null) : null,
  );
  const [wrongFeedbackIso3, setWrongFeedbackIso3] = useState<string | null>(null);

  // タイマー計測（初期状態では停止し、ピースを移動または地図に配置した瞬間にスタート）
  const [elapsedMs, setElapsedMs] = useState(initialSession.elapsedMs);
  const [isRunning, setIsRunning] = useState(
    !initialSession.isCleared &&
      (initialSession.elapsedMs > 0 || initialSession.placedIso3s.length > 0),
  );
  const [isCleared, setIsCleared] = useState(initialSession.isCleared);
  const [isNewRecord, setIsNewRecord] = useState(false);

  // ドラッグ中の状態（isTouch時は指の上方にオフセット表示）
  const [dragging, setDragging] = useState<{
    iso3: string;
    clientX: number;
    clientY: number;
    isTouch: boolean;
    isNearTarget: boolean;
  } | null>(null);

  // 地図表示モード（平面2D ⇄ 3D地球儀）＆ ズーム・パン・地球儀回転
  const [viewMode, setViewMode] = useState<"2d" | "3d">("2d");
  const [mapZoom, setMapZoom] = useState<number>(1);
  const [mapPan, setMapPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [globeRotation, setGlobeRotation] = useState<[number, number, number]>([-30, -20, 0]);
  const [isRegionZoomActive, setIsRegionZoomActive] = useState(false);
  // モバイル・タブレット用の一覧ボトムシート開閉＆国名検索＆設定メニュー
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pieceSearchQuery, setPieceSearchQuery] = useState("");
  const dockItemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const boardSvgRef = useRef<SVGSVGElement | null>(null);
  const startTimeRef = useRef<number>(Date.now() - initialSession.elapsedMs);
  const isRunningRef = useRef<boolean>(
    !initialSession.isCleared &&
      (initialSession.elapsedMs > 0 || initialSession.placedIso3s.length > 0),
  );

  const ensureTimerStarted = () => {
    if (!isRunningRef.current) {
      isRunningRef.current = true;
      startTimeRef.current = Date.now() - elapsedMs;
      setIsRunning(true);
    }
  };

  // タップ選択・スクロールとドラッグ開始を区別するための待機参照
  const pendingDragRef = useRef<{
    iso3: string;
    startX: number;
    startY: number;
    isTouch: boolean;
    fromDockHandle?: boolean;
    isGridLayout?: boolean;
    longPressTimer?: ReturnType<typeof setTimeout>;
  } | null>(null);

  const clearPendingDrag = () => {
    if (pendingDragRef.current?.longPressTimer) {
      clearTimeout(pendingDragRef.current.longPressTimer);
    }
    pendingDragRef.current = null;
  };

  // 地図拡大時のドラッグパン／3D地球儀の回転操作用の参照
  const boardPanRef = useRef<{
    startX: number;
    startY: number;
    startPanX: number;
    startPanY: number;
    startRotation: [number, number, number];
    isPanning: boolean;
  } | null>(null);
  // モバイル・タブレットでの2本指ピンチイン／ピンチアウト用の参照
  const boardPointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const boardPinchRef = useRef<{
    initialDistance: number;
    initialZoom: number;
    initialPan: { x: number; y: number };
    initialRotation: [number, number, number];
    initialCenter: { x: number; y: number };
  } | null>(null);
  const suppressNextSocketClickRef = useRef<boolean>(false);

  const { puzzleRecords = {}, recordPuzzleClear } = useProgress();

  const stageConfig = useMemo(
    () => STAGE_CONFIGS.find((s) => s.id === stageId) ?? STAGE_CONFIGS[0]!,
    [stageId],
  );

  // D3 Projection & 地図パス・パズルピース生成
  const { backgroundPaths, graticuleD, pieces, pieceByIso3 } = useMemo(() => {
    const [minLon, minLat, maxLon, maxLat] = stageConfig.bbox;
    const midLon = (minLon + maxLon) / 2;
    const midLat = (minLat + maxLat) / 2;
    const isContinentStage = stageConfig.id !== "world" && stageConfig.id !== "world-all";

    // 境界周囲8点のMultiPointを作成してfitExtentで大陸に綺麗にズーム
    const bboxGeoJson = {
      type: "MultiPoint",
      coordinates: [
        [minLon, minLat],
        [midLon, minLat],
        [maxLon, minLat],
        [maxLon, midLat],
        [maxLon, maxLat],
        [midLon, maxLat],
        [minLon, maxLat],
        [minLon, midLat],
      ],
    };

    // 大陸別ステージでは中心経度(midLon)を正面に回転、世界ステージでは余白を最小化して程よく大きく表示
    const padX = isContinentStage ? 20 : 6;
    const padY = isContinentStage ? 18 : 8;
    const projection = geoNaturalEarth1()
      .rotate([isContinentStage ? -midLon : 0, 0])
      .fitExtent(
        [
          [padX, padY],
          [BOARD_WIDTH - padX, BOARD_HEIGHT - padY],
        ],
        bboxGeoJson as never,
      );
    const pathGen = geoPath(projection);
    const graticule = geoGraticule10();
    const gratD = pathGen(graticule as never) ?? "";

    const targetIso3Set = new Set(stageConfig.iso3s);

    const bgPaths: {
      mapId: string;
      iso3?: string | undefined;
      nameJa?: string | undefined;
      d: string;
      socketD: string;
      isTarget: boolean;
    }[] = [];

    const generatedPieces: PuzzlePieceData[] = [];
    const mapByIso3 = new Map<string, PuzzlePieceData>();

    for (const rawF of ALL_FEATURES) {
      const mapId = getFeatureMapId(rawF);
      if (!mapId || mapId === "010") continue; // 南極は除外

      const f = isContinentStage ? clipFeatureToMidLon(rawF, midLon) : rawF;
      if (!f) continue;

      const d = pathGen(f as never) ?? "";
      if (!d) continue;

      const country = byMapId(mapId);
      const isTarget = !!country && targetIso3Set.has(country.iso3);

      if (country && isTarget) {
        const { pieceFeature, mainCenterLonLat } = getPieceFeatureAndCenter(f);
        const piecePathD = pathGen(pieceFeature as never) ?? d;
        const rawBounds = pathGen.bounds(pieceFeature as never);
        const projectedCenter = projection(mainCenterLonLat);

        bgPaths.push({
          mapId,
          iso3: country.iso3,
          nameJa: country.nameJa,
          d,
          socketD: piecePathD,
          isTarget: true,
        });

        // トレイ内のピースカード用：その国の中心経度を真正面に向けた投影で歪みのない正確なシルエットを生成
        const localProj = geoNaturalEarth1()
          .rotate([-mainCenterLonLat[0], 0])
          .fitExtent(
            [
              [6, 6],
              [94, 94],
            ],
            pieceFeature as never,
          );
        const localPathGen = geoPath(localProj);
        const trayPathD = localPathGen(pieceFeature as never) ?? piecePathD;

        if (
          rawBounds &&
          isFinite(rawBounds[0][0]) &&
          isFinite(rawBounds[0][1]) &&
          isFinite(rawBounds[1][0]) &&
          isFinite(rawBounds[1][1])
        ) {
          const [[x0, y0], [x1, y1]] = rawBounds;
          const w = Math.max(8, x1 - x0);
          const h = Math.max(8, y1 - y0);
          const pad = Math.max(4, Math.max(w, h) * 0.12);
          const viewBox = `${(x0 - pad).toFixed(1)} ${(y0 - pad).toFixed(1)} ${(w + pad * 2).toFixed(1)} ${(h + pad * 2).toFixed(1)}`;

          const targetX = projectedCenter ? projectedCenter[0] : (x0 + x1) / 2;
          const targetY = projectedCenter ? projectedCenter[1] : (y0 + y1) / 2;

          const pieceData: PuzzlePieceData = {
            country,
            mapId,
            rawFeature: rawF,
            pieceFeature,
            mainCenterLonLat,
            boardPathD: d,
            piecePathD,
            trayPathD,
            trayViewBox: "0 0 100 100",
            targetX,
            targetY,
            bounds: rawBounds,
            width: w,
            height: h,
            viewBox,
          };
          generatedPieces.push(pieceData);
          mapByIso3.set(country.iso3, pieceData);
        }
      } else {
        bgPaths.push({
          mapId,
          iso3: country?.iso3,
          nameJa: country?.nameJa,
          d,
          socketD: d,
          isTarget: false,
        });
      }
    }

    return {
      backgroundPaths: bgPaths,
      graticuleD: gratD,
      pieces: generatedPieces,
      pieceByIso3: mapByIso3,
    };
  }, [stageConfig]);

  // 3D地球儀モード時の投影・パス・ターゲット座標（viewMode === "3d" のときのみ計算）
  const globeRenderData = useMemo(() => {
    if (viewMode !== "3d") return null;
    const radius = GLOBE_BASE_RADIUS * mapZoom;
    const projection = geoOrthographic()
      .scale(radius)
      .translate([GLOBE_CX, GLOBE_CY])
      .rotate(globeRotation)
      .clipAngle(90);
    const pathGen = geoPath(projection);
    const gratD = pathGen(geoGraticule10() as never) ?? "";
    const targetIso3Set = new Set(stageConfig.iso3s);
    const centerLonLat: [number, number] = [-globeRotation[0], -globeRotation[1]];

    const paths3D: {
      mapId: string;
      iso3?: string | undefined;
      nameJa?: string | undefined;
      d: string;
      socketD: string;
      isTarget: boolean;
    }[] = [];

    const piecePos3D = new Map<string, { x: number; y: number; visible: boolean }>();

    for (const rawF of ALL_FEATURES) {
      const mapId = getFeatureMapId(rawF);
      if (!mapId || mapId === "010") continue;
      const d = pathGen(rawF as never) ?? "";
      const country = byMapId(mapId);
      const isTarget = !!country && targetIso3Set.has(country.iso3);

      if (country && isTarget) {
        const piece = pieceByIso3.get(country.iso3);
        const socketD = piece ? (pathGen(piece.pieceFeature as never) ?? d) : d;
        if (d || socketD) {
          paths3D.push({
            mapId,
            iso3: country.iso3,
            nameJa: country.nameJa,
            d,
            socketD,
            isTarget: true,
          });
        }
        if (piece) {
          const isFront = geoDistance(centerLonLat, piece.mainCenterLonLat) < Math.PI / 2 - 0.03;
          const pt = projection(piece.mainCenterLonLat);
          if (pt && isFront) {
            piecePos3D.set(country.iso3, { x: pt[0], y: pt[1], visible: true });
          } else {
            piecePos3D.set(country.iso3, { x: GLOBE_CX, y: GLOBE_CY, visible: false });
          }
        }
      } else if (d) {
        paths3D.push({
          mapId,
          iso3: country?.iso3,
          nameJa: country?.nameJa,
          d,
          socketD: d,
          isTarget: false,
        });
      }
    }

    return {
      radius,
      projection,
      graticuleD: gratD,
      paths3D,
      piecePos3D,
    };
  }, [viewMode, mapZoom, globeRotation, stageConfig, pieceByIso3]);

  const getDefaultGlobeRotationForStage = (sid: StageId): [number, number, number] => {
    const cfg = STAGE_CONFIGS.find((s) => s.id === sid) ?? STAGE_CONFIGS[0]!;
    if (cfg.id === "world" || cfg.id === "world-all") {
      return [-30, -20, 0];
    }
    const [minLon, minLat, maxLon, maxLat] = cfg.bbox;
    return [-(minLon + maxLon) / 2, -(minLat + maxLat) / 2, 0];
  };

  const startNewGame = (nextStageId = stageId) => {
    const list = createShuffledList(nextStageId);
    setStageId(nextStageId);
    setShuffledIso3s(list);
    setPlacedIso3s(new Set());
    setSelectedIso3(list[0] ?? null);
    setHintLevel(0);
    setHintsUsedCount(0);
    setMistakesCount(0);
    setCombo(0);
    setLastPlacedCountry(null);
    setWrongFeedbackIso3(null);
    setElapsedMs(0);
    setIsCleared(false);
    setIsNewRecord(false);
    setIsRunning(false);
    isRunningRef.current = false;
    setMapZoom(1);
    setMapPan({ x: 0, y: 0 });
    setGlobeRotation(getDefaultGlobeRotationForStage(nextStageId));
    setIsRegionZoomActive(false);
    setMobileSheetOpen(false);
    setMobileMenuOpen(false);
    setPieceSearchQuery("");
    startTimeRef.current = Date.now();
    persistPuzzleSession({
      stageId: nextStageId,
      blindMode,
      shuffledIso3s: list,
      placedIso3s: [],
      selectedIso3: list[0] ?? null,
      elapsedMs: 0,
      mistakesCount: 0,
      hintsUsedCount: 0,
      combo: 0,
      lastPlacedIso3: null,
      isCleared: false,
    });
  };

  // パズル進行状態が変化するたびにメモリ＆sessionStorageへ自動保存
  useEffect(() => {
    persistPuzzleSession({
      stageId,
      blindMode,
      shuffledIso3s,
      placedIso3s: Array.from(placedIso3s),
      selectedIso3,
      elapsedMs,
      mistakesCount,
      hintsUsedCount,
      combo,
      lastPlacedIso3: lastPlacedCountry?.iso3 ?? null,
      isCleared,
    });
  }, [
    stageId,
    blindMode,
    shuffledIso3s,
    placedIso3s,
    selectedIso3,
    elapsedMs,
    mistakesCount,
    hintsUsedCount,
    combo,
    lastPlacedCountry,
    isCleared,
  ]);

  // ストップウォッチ更新
  useEffect(() => {
    if (!isRunning || isCleared) return;
    const timer = setInterval(() => {
      setElapsedMs(Date.now() - startTimeRef.current);
    }, 100);
    return () => clearInterval(timer);
  }, [isRunning, isCleared]);

  // 未配置のピース一覧
  const unplacedPieces = useMemo(() => {
    const ordered: PuzzlePieceData[] = [];
    for (const iso3 of shuffledIso3s) {
      if (!placedIso3s.has(iso3)) {
        const p = pieceByIso3.get(iso3);
        if (p) ordered.push(p);
      }
    }
    // 万一shuffledIso3sに含まれないピースがあれば補完
    for (const p of pieces) {
      if (!placedIso3s.has(p.country.iso3) && !ordered.some((o) => o.country.iso3 === p.country.iso3)) {
        ordered.push(p);
      }
    }
    return ordered;
  }, [shuffledIso3s, placedIso3s, pieceByIso3, pieces]);

  // 現在選択されているピース
  const activePiece = useMemo(() => {
    if (selectedIso3 && !placedIso3s.has(selectedIso3)) {
      return pieceByIso3.get(selectedIso3) ?? unplacedPieces[0] ?? null;
    }
    return unplacedPieces[0] ?? null;
  }, [selectedIso3, placedIso3s, pieceByIso3, unplacedPieces]);

  // モバイルボトムシート用の国名検索フィルタ済み未配置ピース
  const filteredSheetPieces = useMemo(() => {
    const q = pieceSearchQuery.trim().toLowerCase();
    if (!q || blindMode) return unplacedPieces;
    return unplacedPieces.filter(
      (p) =>
        p.country.nameJa.toLowerCase().includes(q) ||
        p.country.nameEn.toLowerCase().includes(q) ||
        p.country.basic.capital.toLowerCase().includes(q),
    );
  }, [unplacedPieces, pieceSearchQuery, blindMode]);

  // 選択中のピースが変わったら、横並びドック内の該当カードを中央付近へ自動スクロール
  useEffect(() => {
    if (!activePiece) return;
    const el = dockItemRefs.current.get(activePiece.country.iso3);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [activePiece?.country.iso3]);

  // ボトムシートが開いている間は背景の縦スクロールを抑止
  useEffect(() => {
    if (!mobileSheetOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [mobileSheetOpen]);

  // 前後のピースへ切り替え（モバイル・タブレットの親指操作用）
  const handleCyclePiece = (dir: -1 | 1) => {
    if (unplacedPieces.length <= 1) return;
    const currentIdx = activePiece
      ? unplacedPieces.findIndex((p) => p.country.iso3 === activePiece.country.iso3)
      : 0;
    const nextIdx = (currentIdx + dir + unplacedPieces.length) % unplacedPieces.length;
    const nextPiece = unplacedPieces[nextIdx];
    if (nextPiece) {
      setSelectedIso3(nextPiece.country.iso3);
      setHintLevel(0);
    }
  };

  // ズーム＆パンに応じた動的SVG viewBox計算
  const boardViewBox = useMemo(() => {
    const vbW = BOARD_WIDTH / mapZoom;
    const vbH = BOARD_HEIGHT / mapZoom;
    const maxPanX = Math.max(0, (BOARD_WIDTH - vbW) / 2);
    const maxPanY = Math.max(0, (BOARD_HEIGHT - vbH) / 2);
    const clampedPanX = Math.max(-maxPanX, Math.min(maxPanX, mapPan.x));
    const clampedPanY = Math.max(-maxPanY, Math.min(maxPanY, mapPan.y));
    const vbX = (BOARD_WIDTH - vbW) / 2 - clampedPanX;
    const vbY = (BOARD_HEIGHT - vbH) / 2 - clampedPanY;
    return `${vbX.toFixed(1)} ${vbY.toFixed(1)} ${vbW.toFixed(1)} ${vbH.toFixed(1)}`;
  }, [mapZoom, mapPan]);

  // 2D平面 ⇄ 3D地球儀 切替
  const handleToggleViewMode = (nextMode?: "2d" | "3d") => {
    const target = nextMode ?? (viewMode === "2d" ? "3d" : "2d");
    if (target === viewMode) return;
    setViewMode(target);
    setMapZoom(1);
    setMapPan({ x: 0, y: 0 });
    setIsRegionZoomActive(false);
    if (target === "3d") {
      setGlobeRotation(getDefaultGlobeRotationForStage(stageId));
    }
  };

  // 選択中のピースの周辺エリアへ拡大フォーカス（トグル式：ONで拡大＆塗り、もう一度押すと全体表示へ解除）
  const handleToggleRegionZoom = () => {
    if (isRegionZoomActive) {
      setMapZoom(1);
      setMapPan({ x: 0, y: 0 });
      setIsRegionZoomActive(false);
      return;
    }
    if (!activePiece) return;
    const isTinyPiece = activePiece.width < 12 || activePiece.height < 12;
    const isSmallPiece = activePiece.width < 28 || activePiece.height < 28;
    const targetZoom = isTinyPiece ? 6.0 : isSmallPiece ? 3.5 : 2.2;
    if (viewMode === "3d") {
      const [lon, lat] = activePiece.mainCenterLonLat;
      const offsetLon = hintLevel >= 2 ? 0 : ((activePiece.country.id.charCodeAt(0) % 5) - 2) * 8;
      const offsetLat = hintLevel >= 2 ? 0 : ((activePiece.country.iso3.charCodeAt(0) % 5) - 2) * 6;
      setGlobeRotation([-(lon + offsetLon), Math.max(-85, Math.min(85, -(lat + offsetLat))), 0]);
      setMapZoom(targetZoom);
      setIsRegionZoomActive(true);
      return;
    }
    const offsetX = hintLevel >= 2 ? 0 : ((activePiece.country.id.charCodeAt(0) % 5) - 2) * 24;
    const offsetY = hintLevel >= 2 ? 0 : ((activePiece.country.iso3.charCodeAt(0) % 5) - 2) * 18;
    const panX = BOARD_WIDTH / 2 - (activePiece.targetX + offsetX);
    const panY = BOARD_HEIGHT / 2 - (activePiece.targetY + offsetY);
    setMapZoom(targetZoom);
    setMapPan({ x: panX, y: panY });
    setIsRegionZoomActive(true);
  };

  // 段階拡大（乗算ステップで低倍率は細かく・高倍率は小国まで素早く拡大、最大倍率で停止）
  const handleStepZoomIn = () => {
    setIsRegionZoomActive(false);
    if (mapZoom >= MAX_MAP_ZOOM) return;
    const nextZ = Math.min(MAX_MAP_ZOOM, Math.round(mapZoom * 1.5 * 10) / 10);
    setMapZoom(nextZ <= mapZoom ? Math.min(MAX_MAP_ZOOM, mapZoom + 0.5) : nextZ);
  };

  // 段階縮小（1倍に戻ると全体表示へ解除）
  const handleStepZoomOut = () => {
    const rawNext = Math.round((mapZoom / 1.5) * 10) / 10;
    const nextZ = rawNext <= 1.15 ? 1 : rawNext;
    setMapZoom(nextZ);
    if (nextZ <= 1) {
      setMapPan({ x: 0, y: 0 });
      setIsRegionZoomActive(false);
    }
  };

  // スクリーン座標 (clientX, clientY) を SVG 座標 (svgX, svgY) に変換
  const clientToSvgPoint = (clientX: number, clientY: number): { x: number; y: number } | null => {
    const svgEl = boardSvgRef.current;
    if (!svgEl) return null;
    try {
      const ctm = svgEl.getScreenCTM();
      if (!ctm) return null;
      const pt = svgEl.createSVGPoint();
      pt.x = clientX;
      pt.y = clientY;
      const transformed = pt.matrixTransform(ctm.inverse());
      return { x: transformed.x, y: transformed.y };
    } catch {
      return null;
    }
  };

  // 指定したSVG座標が対象ピースの正解位置にスナップするか判定（2D/3D両対応）
  const checkIsSnapMatch = (piece: PuzzlePieceData, svgX: number, svgY: number, isTouch = false): boolean => {
    const baseRadius = isTouch ? SNAP_TOUCH_RADIUS : SNAP_BASE_RADIUS;
    if (viewMode === "3d") {
      if (!globeRenderData) return false;
      const pos3D = globeRenderData.piecePos3D.get(piece.country.iso3);
      if (!pos3D || !pos3D.visible) return false;
      const effectiveRadius = (baseRadius * 0.9) * Math.pow(mapZoom, 0.35);
      const dist = Math.hypot(svgX - pos3D.x, svgY - pos3D.y);
      return dist <= effectiveRadius;
    }

    // ズーム中は画面上の見た目に合わせつつ十分な吸着半径を維持
    const effectiveRadius = baseRadius / Math.pow(mapZoom, 0.35);
    const dist = Math.hypot(svgX - piece.targetX, svgY - piece.targetY);
    if (dist <= effectiveRadius) return true;

    // 面積が大きい国（ロシア・中国・カナダ・アメリカ・ブラジル・オーストラリアなど）はバウンディングボックス内でも許容
    const [[x0, y0], [x1, y1]] = piece.bounds;
    const pad = isTouch ? 22 : 14;
    if (svgX >= x0 - pad && svgX <= x1 + pad && svgY >= y0 - pad && svgY <= y1 + pad) {
      const maxAllowedDist = Math.max(effectiveRadius, Math.max(piece.width, piece.height) * 0.55);
      if (dist <= maxAllowedDist) return true;
    }
    return false;
  };

  // ピース正解配置処理
  const confirmPiecePlacement = (piece: PuzzlePieceData) => {
    const iso3 = piece.country.iso3;
    if (placedIso3s.has(iso3)) return;

    ensureTimerStarted();

    const nextPlaced = new Set(placedIso3s);
    nextPlaced.add(iso3);
    setPlacedIso3s(nextPlaced);
    setCombo((c) => c + 1);
    setLastPlacedCountry(piece.country);
    setHintLevel(0);
    setWrongFeedbackIso3(null);
    setIsRegionZoomActive(false);

    // 全ピース完了チェック
    if (nextPlaced.size >= pieces.length && pieces.length > 0) {
      const finalMs = Date.now() - startTimeRef.current;
      const finalSec = Math.round(finalMs / 100) / 10;
      setElapsedMs(finalMs);
      setIsCleared(true);
      setIsRunning(false);
      isRunningRef.current = false;
      setMapZoom(1);
      setMapPan({ x: 0, y: 0 });
      setIsRegionZoomActive(false);
      playPuzzleSound("clear", soundEnabled);

      const stars =
        mistakesCount === 0 && hintsUsedCount === 0
          ? 3
          : mistakesCount <= 3 && hintsUsedCount <= 2
            ? 2
            : 1;

      const isNew = recordPuzzleClear({
        stageKey: stageId,
        stageLabel: stageConfig.label,
        timeSec: finalSec,
        stars,
        pieceCount: pieces.length,
      });
      setIsNewRecord(isNew);
    } else {
      playPuzzleSound("snap", soundEnabled);
      // 次の未配置ピースを自動選択
      const nextRemaining = unplacedPieces.find((p) => p.country.iso3 !== iso3);
      setSelectedIso3(nextRemaining ? nextRemaining.country.iso3 : null);
    }
  };

  // ドラッグ操作イベント（タップ・スクロールとの判別 ＆ windowレベルでの追跡）
  useEffect(() => {
    const startDragFromPending = (pending: NonNullable<typeof pendingDragRef.current>, clientX: number, clientY: number) => {
      if (pending.longPressTimer) {
        clearTimeout(pending.longPressTimer);
      }
      ensureTimerStarted();

      const piece = pieceByIso3.get(pending.iso3);
      const aimY = clientY + (pending.isTouch ? getTouchDragOffsetY(clientY) : 0);
      let isNear = false;
      if (piece) {
        const svgPt = clientToSvgPoint(clientX, aimY);
        if (svgPt) {
          isNear = checkIsSnapMatch(piece, svgPt.x, svgPt.y, pending.isTouch);
        }
      }
      setDragging({
        iso3: pending.iso3,
        clientX,
        clientY,
        isTouch: pending.isTouch,
        isNearTarget: isNear,
      });
      pendingDragRef.current = null;
    };

    const handlePointerMove = (e: PointerEvent) => {
      // 1. ドラッグ待機状態から本ドラッグへの移行判定
      if (pendingDragRef.current && !dragging) {
        const pending = pendingDragRef.current;
        const dx = e.clientX - pending.startX;
        const dy = e.clientY - pending.startY;
        const dist = Math.hypot(dx, dy);

        // タッチ操作時（専用ハンドル以外）：一覧のスクロール方向ならキャンセルし、地図方向なら即ドラッグ開始
        if (pending.isTouch && !pending.fromDockHandle) {
          if (pending.isGridLayout) {
            // タブレット横（右側縦スクロール一覧）：上下移動はスクロール優先、左方向（地図側）へ引いたらドラッグ開始
            if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx) * 1.1) {
              clearPendingDrag();
              return;
            }
            if (dx < -10 && Math.abs(dx) > Math.abs(dy) * 1.05) {
              startDragFromPending(pending, e.clientX, e.clientY);
              return;
            }
          } else {
            // スマホ・タブレット縦（下部横スクロール一覧）：左右移動はスクロール優先、上方向（地図側）へ引いたらドラッグ開始
            if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.1) {
              clearPendingDrag();
              return;
            }
            if (dy < -10 && Math.abs(dy) > Math.abs(dx) * 1.05) {
              startDragFromPending(pending, e.clientX, e.clientY);
              return;
            }
          }
          return;
        }

        if (dist >= 7) {
          startDragFromPending(pending, e.clientX, e.clientY);
        }
        return;
      }

      // 2. 本ドラッグ中の追従とターゲット吸着判定
      if (dragging) {
        const piece = pieceByIso3.get(dragging.iso3);
        const aimY = e.clientY + (dragging.isTouch ? getTouchDragOffsetY(e.clientY) : 0);
        let isNear = false;
        if (piece) {
          const svgPt = clientToSvgPoint(e.clientX, aimY);
          if (svgPt) {
            isNear = checkIsSnapMatch(piece, svgPt.x, svgPt.y, dragging.isTouch);
          }
        }
        setDragging({
          iso3: dragging.iso3,
          clientX: e.clientX,
          clientY: e.clientY,
          isTouch: dragging.isTouch,
          isNearTarget: isNear,
        });
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      clearPendingDrag();
      if (!dragging) return;

      const piece = pieceByIso3.get(dragging.iso3);
      if (piece) {
        const aimY = e.clientY + (dragging.isTouch ? getTouchDragOffsetY(e.clientY) : 0);
        const svgPt = clientToSvgPoint(e.clientX, aimY);
        const boardW = viewMode === "3d" ? BOARD_3D_WIDTH : BOARD_WIDTH;
        const boardH = viewMode === "3d" ? BOARD_3D_HEIGHT : BOARD_HEIGHT;
        if (svgPt && checkIsSnapMatch(piece, svgPt.x, svgPt.y, dragging.isTouch)) {
          confirmPiecePlacement(piece);
        } else if (svgPt && svgPt.x >= 0 && svgPt.x <= boardW && svgPt.y >= 0 && svgPt.y <= boardH) {
          // ボード上の誤った場所にドロップした場合
          setMistakesCount((m) => m + 1);
          setCombo(0);
          setWrongFeedbackIso3(piece.country.iso3);
          playPuzzleSound("wrong", soundEnabled);
          setTimeout(() => setWrongFeedbackIso3(null), 700);
        }
      }
      setDragging(null);
    };

    // タッチドラッグ中はブラウザのスクロールを完全にロック（iPad Safari / Android Chrome対応）
    const handleTouchMovePrevent = (e: TouchEvent) => {
      if (dragging) {
        e.preventDefault();
      }
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
    window.addEventListener("touchmove", handleTouchMovePrevent, { passive: false });
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
      window.removeEventListener("touchmove", handleTouchMovePrevent);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging, pieceByIso3, placedIso3s, soundEnabled, mapZoom, viewMode, globeRenderData]);

  // 地図上のソケットをクリック／タップして配置（スマホ・タブレット・クリック操作サポート）
  const handleSocketClick = (targetIso3: string | undefined, e: React.MouseEvent<SVGElement>) => {
    if (suppressNextSocketClickRef.current) {
      suppressNextSocketClickRef.current = false;
      return;
    }
    if (!activePiece || isCleared) return;
    e.stopPropagation();

    ensureTimerStarted();

    if (targetIso3 === activePiece.country.iso3) {
      confirmPiecePlacement(activePiece);
      return;
    }

    // クリック／タップした座標がactivePieceの許容範囲内かもチェック
    const svgPt = clientToSvgPoint(e.clientX, e.clientY);
    if (svgPt && checkIsSnapMatch(activePiece, svgPt.x, svgPt.y, true)) {
      confirmPiecePlacement(activePiece);
      return;
    }

    // 不正解タップ
    setMistakesCount((m) => m + 1);
    setCombo(0);
    setWrongFeedbackIso3(activePiece.country.iso3);
    playPuzzleSound("wrong", soundEnabled);
    setTimeout(() => setWrongFeedbackIso3(null), 700);
  };

  // ヒントボタン押下（3D時は裏側の国なら自動で正面へ回転、ヒント2ではズーム＆点滅フォーカス）
  const handleTriggerHint = () => {
    if (!activePiece || isCleared) return;
    const nextLevel = hintLevel === 0 ? 1 : 2;
    setHintLevel(nextLevel);
    setHintsUsedCount((h) => h + 1);
    playPuzzleSound("hint", soundEnabled);
    if (viewMode === "3d") {
      const [lon, lat] = activePiece.mainCenterLonLat;
      if (nextLevel === 1) {
        const offsetLon = ((activePiece.country.id.charCodeAt(0) % 5) - 2) * 10;
        const offsetLat = ((activePiece.country.iso3.charCodeAt(0) % 5) - 2) * 8;
        setGlobeRotation([-(lon + offsetLon), Math.max(-85, Math.min(85, -(lat + offsetLat))), 0]);
      } else {
        const nextZoom = Math.max(mapZoom, activePiece.width < 36 || activePiece.height < 36 ? 2.4 : 1.6);
        setGlobeRotation([-lon, Math.max(-85, Math.min(85, -lat)), 0]);
        setMapZoom(nextZoom);
      }
      return;
    }
    if (nextLevel === 2) {
      // 小さい国でもすぐ見つけられるようターゲットを中心にフォーカス
      const nextZoom = Math.max(mapZoom, activePiece.width < 36 || activePiece.height < 36 ? 2.2 : 1.5);
      setMapZoom(nextZoom);
      setMapPan({
        x: BOARD_WIDTH / 2 - activePiece.targetX,
        y: BOARD_HEIGHT / 2 - activePiece.targetY,
      });
    }
  };

  const progressPct = pieces.length > 0 ? Math.round((placedIso3s.size / pieces.length) * 100) : 0;
  const draggingPieceData = dragging ? pieceByIso3.get(dragging.iso3) : null;

  return (
    <div className="h-dvh flex flex-col overflow-hidden pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))] sm:pb-0 lg:h-auto lg:min-h-dvh lg:overflow-visible lg:pb-6 select-none overflow-x-hidden">
      <SiteHeader />

      <main className="flex-1 min-h-0 flex flex-col lg:block mx-auto w-full max-w-[1600px] px-2 sm:px-4 lg:px-6 pt-1.5 sm:pt-2.5 pb-1.5 lg:pb-0 gap-1.5 lg:gap-0 lg:space-y-2.5">
        {/* 1. ステージ選択バー（モバイルは1行スリム、PCは右に進捗＆タイマーを統合） */}
        <section className="shrink-0 surface-card px-2 py-1 sm:px-3.5 sm:py-2">
          <div className="flex items-center justify-between gap-2">
            {/* 大陸ステージタブ（スクロールバー非表示で端までスッキリ横フリック） */}
            <div className="flex items-center gap-1 overflow-x-auto touch-pan-x [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {STAGE_CONFIGS.map((s) => {
                const active = s.id === stageId;
                const recStd = puzzleRecords[`${s.id}-standard`];
                const recMst = puzzleRecords[`${s.id}-master`];
                const recAll = puzzleRecords[s.id];
                const hasClear = !!recStd || !!recMst || !!recAll;
                const StageIcon = s.icon;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      if (s.id !== stageId) {
                        startNewGame(s.id);
                      }
                    }}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 h-7 sm:h-8 rounded-lg text-[11px] sm:text-xs font-bold transition-all shrink-0 cursor-pointer border active:scale-95",
                      active
                        ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                        : "bg-secondary/50 text-muted-foreground border-border/60 hover:bg-secondary hover:text-foreground",
                    )}
                  >
                    <StageIcon className="size-3.5 shrink-0" />
                    <span>{s.label}</span>
                    {hasClear && (
                      <Star
                        className={cn(
                          "size-3 shrink-0 fill-current",
                          active ? "text-white" : "text-amber-500",
                        )}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* PC用：進捗＆タイマー＆効果音（モバイルは地図上HUDへ集約して縦空間を最大化） */}
            <div className="hidden lg:flex items-center justify-end gap-1.5 shrink-0">
              <div className="flex items-center gap-1.5 bg-secondary/50 border border-border/60 rounded-lg px-2.5 h-8">
                <span className="text-xs font-black text-sky-600 dark:text-sky-400 tabular-nums">
                  {placedIso3s.size}/{pieces.length}
                </span>
                <span className="text-border">|</span>
                <Clock className="size-3.5 text-sky-500" />
                <span className="font-mono text-xs font-black tabular-nums text-foreground">
                  {formatStopwatch(elapsedMs)}
                </span>
                {combo >= 2 && (
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-black flex items-center gap-0.5">
                    <Flame className="size-2.5" />
                    {combo}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => setSoundEnabled((s) => !s)}
                title="効果音のON/OFF"
                className="size-8 rounded-lg border border-border/60 bg-secondary/50 text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer active:scale-95 shrink-0"
              >
                {soundEnabled ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
              </button>
            </div>
          </div>
        </section>

        {/* 2. メイン領域：モバイルは縦スクロールなしの1画面完結アプリ型レイアウト */}
        <div className="flex-1 min-h-0 flex flex-col lg:grid lg:grid-cols-12 gap-1.5 sm:gap-2.5 lg:gap-3 lg:items-start">
          {/* 左／上：大型白地図パズルボード */}
          <div className="flex-1 min-h-[210px] lg:flex-none lg:col-span-8 surface-card p-1 sm:p-2 relative overflow-hidden flex flex-col">
            <div className="relative w-full flex-1 min-h-0 lg:flex-none lg:h-[620px] rounded-xl overflow-hidden bg-[var(--ocean)] border border-border shadow-inner">
              {/* 地図上部オーバーレイ：モバイルはHUD（進捗・タイマー／音・リセット）、PCは従来配置 */}
              <div className="pointer-events-none absolute inset-x-1.5 sm:inset-x-2.5 top-1.5 sm:top-2.5 z-10 flex items-center justify-between gap-1.5">
                {/* 左上：モバイル＝進捗＆タイマーHUD、PC＝やり直す */}
                <div className="pointer-events-auto flex items-center gap-1.5 bg-background/88 backdrop-blur-md border border-border/75 px-2 py-1 lg:p-1 rounded-xl shadow-sm shrink-0">
                  <div className="flex lg:hidden items-center gap-1.5">
                    <span className="text-[11px] font-black text-sky-600 dark:text-sky-400 tabular-nums">
                      {placedIso3s.size}/{pieces.length}
                    </span>
                    <span className="text-border/80 text-[10px]">|</span>
                    <Clock className="size-3 text-sky-500 shrink-0" />
                    <span className="font-mono text-[11px] font-black tabular-nums text-foreground">
                      {formatStopwatch(elapsedMs)}
                    </span>
                    {combo >= 2 && (
                      <span className="px-1 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-black flex items-center gap-0.5">
                        <Flame className="size-2.5" />
                        {combo}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => startNewGame(stageId)}
                    title="パズルを最初からやり直す"
                    className="hidden lg:flex items-center justify-center gap-1 px-2.5 h-8 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground text-xs font-bold cursor-pointer active:scale-95 transition-all"
                  >
                    <RotateCcw className="size-4 shrink-0" />
                    <span>やり直す</span>
                  </button>

                  {/* PC用：平面地図 ⇄ 3D地球儀 切替 */}
                  <div className="hidden lg:flex items-center gap-0.5 pl-1 border-l border-border/70">
                    <button
                      type="button"
                      onClick={() => handleToggleViewMode("2d")}
                      className={cn(
                        "flex items-center gap-1 px-2 h-8 rounded-lg text-xs font-bold cursor-pointer transition-all",
                        viewMode === "2d"
                          ? "bg-primary text-primary-foreground shadow-2xs"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                      )}
                    >
                      <MapIcon className="size-3.5 shrink-0" />
                      <span>平面</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleViewMode("3d")}
                      className={cn(
                        "flex items-center gap-1 px-2 h-8 rounded-lg text-xs font-bold cursor-pointer transition-all",
                        viewMode === "3d"
                          ? "bg-primary text-primary-foreground shadow-2xs"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                      )}
                    >
                      <Globe className="size-3.5 shrink-0" />
                      <span>地球儀</span>
                    </button>
                  </div>
                </div>

                {/* 右上：モバイル＝ヒント＆地球儀切替＆設定メニュー、PC＝ズーム操作群 */}
                <div className="pointer-events-auto relative flex items-center gap-1 bg-background/88 backdrop-blur-md border border-border/75 p-0.5 sm:p-1 rounded-xl shadow-sm shrink-0">
                  {activePiece && !isCleared && (
                    <button
                      type="button"
                      onClick={handleTriggerHint}
                      disabled={hintLevel >= 2}
                      title={hintLevel === 0 ? "ヒント①（エリア＆隣接国）" : hintLevel === 1 ? "ヒント②（場所を表示）" : "場所を点滅中"}
                      className={cn(
                        "lg:hidden h-8 px-2 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer active:scale-95 transition-all shrink-0",
                        hintLevel === 0
                          ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                          : hintLevel === 1
                            ? "bg-sky-500 text-white"
                            : "bg-secondary/60 text-muted-foreground opacity-55",
                      )}
                    >
                      <Lightbulb className="size-3.5 shrink-0" />
                      <span>
                        {hintLevel === 0 ? "ヒント" : hintLevel === 1 ? "場所" : "点滅"}
                      </span>
                    </button>
                  )}

                  {/* モバイル用：平面 ⇄ 3D地球儀 ワンタップ切替 */}
                  <button
                    type="button"
                    onClick={() => handleToggleViewMode()}
                    aria-label={viewMode === "3d" ? "平面地図に切り替え" : "3D地球儀に切り替え"}
                    title={viewMode === "3d" ? "平面地図に切り替え" : "3D地球儀に切り替え"}
                    className={cn(
                      "lg:hidden size-8 rounded-lg flex items-center justify-center cursor-pointer active:scale-95 transition-all shrink-0",
                      viewMode === "3d"
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "hover:bg-secondary text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {viewMode === "3d" ? <MapIcon className="size-4" /> : <Globe className="size-4" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen((o) => !o)}
                    aria-label="パズル設定メニュー"
                    title="設定・やり直す"
                    className={cn(
                      "lg:hidden size-8 rounded-lg flex items-center justify-center cursor-pointer active:scale-95 transition-colors",
                      mobileMenuOpen || blindMode
                        ? "bg-primary/15 text-primary"
                        : "hover:bg-secondary text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <SlidersHorizontal className="size-4" />
                  </button>

                  {/* モバイル設定ポップオーバー */}
                  {mobileMenuOpen && (
                    <>
                      <div
                        className="lg:hidden fixed inset-0 z-20"
                        onClick={() => setMobileMenuOpen(false)}
                      />
                      <div className="lg:hidden absolute right-0 top-10 z-30 w-44 rounded-2xl bg-card/98 backdrop-blur-md border border-border shadow-xl p-1.5 space-y-0.5 animate-in fade-in zoom-in-95 duration-150">
                        <button
                          type="button"
                          onClick={() => {
                            setBlindMode((b) => !b);
                            setMobileMenuOpen(false);
                          }}
                          className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl hover:bg-secondary text-xs font-bold text-foreground cursor-pointer"
                        >
                          <span className="flex items-center gap-2">
                            {blindMode ? <EyeOff className="size-4 text-primary" /> : <Eye className="size-4 text-muted-foreground" />}
                            <span>達人モード</span>
                          </span>
                          <span
                            className={cn(
                              "text-[10px] px-1.5 py-0.5 rounded-md font-bold",
                              blindMode ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground",
                            )}
                          >
                            {blindMode ? "ON" : "OFF"}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSoundEnabled((s) => !s);
                            setMobileMenuOpen(false);
                          }}
                          className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl hover:bg-secondary text-xs font-bold text-foreground cursor-pointer"
                        >
                          <span className="flex items-center gap-2">
                            {soundEnabled ? <Volume2 className="size-4 text-sky-500" /> : <VolumeX className="size-4 text-muted-foreground" />}
                            <span>効果音</span>
                          </span>
                          <span className="text-[10px] text-muted-foreground font-bold">
                            {soundEnabled ? "ON" : "OFF"}
                          </span>
                        </button>

                        <div className="my-1 border-t border-border/60" />

                        <button
                          type="button"
                          onClick={() => {
                            startNewGame(stageId);
                            setMobileMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-destructive/10 text-xs font-bold text-destructive cursor-pointer"
                        >
                          <RotateCcw className="size-4" />
                          <span>最初からやり直す</span>
                        </button>
                      </div>
                    </>
                  )}

                  {/* PC用ズームコントロール（周辺拡大トグル・縮小・拡大のみ、矢印2つアイコンなし） */}
                  <div className="hidden lg:flex items-center gap-1.5">
                    {activePiece && (
                      <button
                        type="button"
                        onClick={handleToggleRegionZoom}
                        title={isRegionZoomActive ? "周辺拡大を解除して全体表示に戻す" : "選択中の国の周辺エリアを拡大"}
                        className={cn(
                          "flex items-center gap-1 px-2.5 h-9 rounded-xl border text-xs font-bold cursor-pointer active:scale-95 transition-all whitespace-nowrap",
                          isRegionZoomActive
                            ? "bg-sky-500 border-sky-500 text-white shadow-xs"
                            : "bg-sky-500/12 hover:bg-sky-500/20 border-sky-500/35 text-sky-600 dark:text-sky-300",
                        )}
                      >
                        <Navigation className={cn("size-3.5 shrink-0", isRegionZoomActive && "fill-current")} />
                        <span>周辺拡大</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleStepZoomOut}
                      disabled={mapZoom <= 1}
                      title="地図を縮小"
                      className={cn(
                        "size-9 rounded-xl flex items-center justify-center cursor-pointer active:scale-95 transition-all shrink-0 disabled:opacity-35",
                        mapZoom > 1 && !isRegionZoomActive
                          ? "bg-sky-500/15 text-sky-600 dark:text-sky-300 hover:bg-sky-500/25"
                          : "bg-secondary/80 hover:bg-secondary text-foreground",
                      )}
                    >
                      <ZoomOut className="size-5 stroke-[2.2]" />
                    </button>
                    <button
                      type="button"
                      onClick={handleStepZoomIn}
                      disabled={mapZoom >= MAX_MAP_ZOOM}
                      title="地図を拡大"
                      className={cn(
                        "size-9 rounded-xl flex items-center justify-center cursor-pointer active:scale-95 transition-all shrink-0 disabled:opacity-45",
                        mapZoom > 1 && !isRegionZoomActive
                          ? "bg-sky-500 text-white shadow-xs hover:bg-sky-600"
                          : "bg-secondary/80 hover:bg-secondary text-foreground",
                      )}
                    >
                      <ZoomIn className="size-5 stroke-[2.2]" />
                    </button>
                  </div>
                </div>
              </div>

              {/* モバイル用：地図右下のバランス重視ズームバー（周辺拡大トグル → 縮小 → 拡大） */}
              <div className="lg:hidden pointer-events-auto absolute right-1.5 bottom-1.5 z-10 flex items-center gap-1.5 bg-background/92 backdrop-blur-md border border-border/80 p-1 rounded-xl shadow-sm">
                {activePiece && !isCleared && (
                  <button
                    type="button"
                    onClick={handleToggleRegionZoom}
                    aria-label={isRegionZoomActive ? "周辺拡大を解除" : "周辺エリアを拡大"}
                    title={isRegionZoomActive ? "周辺拡大を解除" : "周辺エリアを拡大"}
                    className={cn(
                      "size-9 rounded-lg flex items-center justify-center cursor-pointer active:scale-95 transition-all",
                      isRegionZoomActive
                        ? "bg-sky-500 text-white shadow-xs"
                        : "hover:bg-sky-500/15 text-sky-600 dark:text-sky-300",
                    )}
                  >
                    <Navigation className={cn("size-[18px] stroke-[2.2]", isRegionZoomActive && "fill-current")} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleStepZoomOut}
                  disabled={mapZoom <= 1}
                  aria-label="地図を縮小"
                  className={cn(
                    "size-9 rounded-lg disabled:opacity-35 flex items-center justify-center cursor-pointer active:scale-95 transition-all",
                    mapZoom > 1 && !isRegionZoomActive
                      ? "bg-sky-500/15 text-sky-600 dark:text-sky-300"
                      : "hover:bg-secondary text-foreground",
                  )}
                >
                  <ZoomOut className="size-[18px] stroke-[2.2]" />
                </button>
                <button
                  type="button"
                  onClick={handleStepZoomIn}
                  disabled={mapZoom >= MAX_MAP_ZOOM}
                  aria-label="地図を拡大"
                  className={cn(
                    "size-9 rounded-lg disabled:opacity-45 flex items-center justify-center cursor-pointer active:scale-95 transition-all",
                    mapZoom > 1 && !isRegionZoomActive
                      ? "bg-sky-500 text-white shadow-xs"
                      : "hover:bg-secondary text-foreground",
                  )}
                >
                  <ZoomIn className="size-[18px] stroke-[2.2]" />
                </button>
              </div>

              <svg
                ref={boardSvgRef}
                viewBox={viewMode === "3d" ? `0 0 ${BOARD_3D_WIDTH} ${BOARD_3D_HEIGHT}` : boardViewBox}
                preserveAspectRatio="xMidYMid meet"
                className={cn(
                  "w-full h-full block touch-none",
                  viewMode === "3d" || mapZoom > 1 ? "cursor-grab active:cursor-grabbing" : "",
                )}
                onPointerDown={(e) => {
                  if (dragging) return;
                  // タッチ・ペン・マウス共通でアクティブポインターを登録（2本指ピンチズーム対応）
                  boardPointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

                  if (boardPointersRef.current.size === 2) {
                    const pts = Array.from(boardPointersRef.current.values());
                    const dist = Math.hypot(pts[1]!.x - pts[0]!.x, pts[1]!.y - pts[0]!.y);
                    const center = {
                      x: (pts[0]!.x + pts[1]!.x) / 2,
                      y: (pts[0]!.y + pts[1]!.y) / 2,
                    };
                    boardPinchRef.current = {
                      initialDistance: Math.max(1, dist),
                      initialZoom: mapZoom,
                      initialPan: { ...mapPan },
                      initialRotation: [...globeRotation],
                      initialCenter: center,
                    };
                    boardPanRef.current = null;
                    suppressNextSocketClickRef.current = true;
                    return;
                  }

                  if (viewMode === "2d" && mapZoom <= 1) return;
                  boardPanRef.current = {
                    startX: e.clientX,
                    startY: e.clientY,
                    startPanX: mapPan.x,
                    startPanY: mapPan.y,
                    startRotation: [...globeRotation],
                    isPanning: false,
                  };
                }}
                onPointerMove={(e) => {
                  if (dragging) return;
                  if (boardPointersRef.current.has(e.pointerId)) {
                    boardPointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
                  }

                  // 2本指ピンチイン／ピンチアウトによる拡大縮小＆パン・回転移動
                  if (boardPointersRef.current.size === 2 && boardPinchRef.current && boardSvgRef.current) {
                    const pts = Array.from(boardPointersRef.current.values());
                    const dist = Math.hypot(pts[1]!.x - pts[0]!.x, pts[1]!.y - pts[0]!.y);
                    const center = {
                      x: (pts[0]!.x + pts[1]!.x) / 2,
                      y: (pts[0]!.y + pts[1]!.y) / 2,
                    };
                    const pinch = boardPinchRef.current;
                    const ratio = dist / pinch.initialDistance;
                    const nextZoom = Math.max(1, Math.min(MAX_MAP_ZOOM, Math.round(pinch.initialZoom * ratio * 100) / 100));

                    const dx = center.x - pinch.initialCenter.x;
                    const dy = center.y - pinch.initialCenter.y;

                    setMapZoom(nextZoom);
                    if (viewMode === "3d") {
                      setIsRegionZoomActive(false);
                      const sens = 0.28 / nextZoom;
                      const [yaw0, pitch0, roll0] = pinch.initialRotation;
                      setGlobeRotation([
                        yaw0 + dx * sens,
                        Math.max(-85, Math.min(85, pitch0 - dy * sens)),
                        roll0,
                      ]);
                    } else {
                      const rect = boardSvgRef.current.getBoundingClientRect();
                      const scaleX = (BOARD_WIDTH / nextZoom) / Math.max(1, rect.width);
                      const scaleY = (BOARD_HEIGHT / nextZoom) / Math.max(1, rect.height);
                      if (nextZoom <= 1.02) {
                        setMapPan({ x: 0, y: 0 });
                        setIsRegionZoomActive(false);
                      } else {
                        setIsRegionZoomActive(false);
                        setMapPan({
                          x: pinch.initialPan.x + dx * scaleX,
                          y: pinch.initialPan.y + dy * scaleY,
                        });
                      }
                    }
                    suppressNextSocketClickRef.current = true;
                    return;
                  }

                  if (!boardPanRef.current) return;
                  const dx = e.clientX - boardPanRef.current.startX;
                  const dy = e.clientY - boardPanRef.current.startY;
                  if (!boardPanRef.current.isPanning && Math.hypot(dx, dy) > 6) {
                    boardPanRef.current.isPanning = true;
                    suppressNextSocketClickRef.current = true;
                  }
                  if (boardPanRef.current.isPanning && boardSvgRef.current) {
                    if (viewMode === "3d") {
                      const sens = 0.36 / mapZoom;
                      const [yaw0, pitch0, roll0] = boardPanRef.current.startRotation;
                      setGlobeRotation([
                        yaw0 + dx * sens,
                        Math.max(-85, Math.min(85, pitch0 - dy * sens)),
                        roll0,
                      ]);
                    } else {
                      const rect = boardSvgRef.current.getBoundingClientRect();
                      const scaleX = (BOARD_WIDTH / mapZoom) / Math.max(1, rect.width);
                      const scaleY = (BOARD_HEIGHT / mapZoom) / Math.max(1, rect.height);
                      setMapPan({
                        x: boardPanRef.current.startPanX + dx * scaleX,
                        y: boardPanRef.current.startPanY + dy * scaleY,
                      });
                    }
                  }
                }}
                onPointerUp={(e) => {
                  boardPointersRef.current.delete(e.pointerId);
                  if (boardPointersRef.current.size < 2) {
                    boardPinchRef.current = null;
                  }
                  if (boardPointersRef.current.size === 0) {
                    boardPanRef.current = null;
                  }
                }}
                onPointerCancel={(e) => {
                  boardPointersRef.current.delete(e.pointerId);
                  if (boardPointersRef.current.size < 2) {
                    boardPinchRef.current = null;
                  }
                  if (boardPointersRef.current.size === 0) {
                    boardPanRef.current = null;
                  }
                }}
              >
                <defs>
                  <filter id="snapGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="0" stdDeviation="3.5" floodColor="#0284c7" floodOpacity="0.85" />
                  </filter>
                  <radialGradient id="puzzleOceanGlow" cx="40%" cy="35%" r="65%">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.88" />
                    <stop offset="48%" stopColor="#0ea5e9" stopOpacity="0.9" />
                    <stop offset="82%" stopColor="#0284c7" stopOpacity="0.95" />
                    <stop offset="100%" stopColor="#0369a1" stopOpacity="1" />
                  </radialGradient>
                </defs>

                {/* 海背景（2D平面は var(--ocean)、3D地球儀は球体オーシャン＆経緯線） */}
                {viewMode === "3d" && globeRenderData ? (
                  <>
                    <circle
                      cx={GLOBE_CX}
                      cy={GLOBE_CY}
                      r={globeRenderData.radius}
                      fill="url(#puzzleOceanGlow)"
                      stroke="rgba(125, 211, 252, 0.55)"
                      strokeWidth={1.6}
                    />
                    <path
                      d={globeRenderData.graticuleD}
                      fill="none"
                      stroke="rgba(255, 255, 255, 0.16)"
                      strokeWidth={0.75}
                    />
                  </>
                ) : (
                  <>
                    <rect width={BOARD_WIDTH} height={BOARD_HEIGHT} fill="var(--ocean)" />
                    <path
                      d={graticuleD}
                      fill="none"
                      stroke="rgba(15, 23, 42, 0.08)"
                      strokeWidth={0.7}
                    />
                  </>
                )}

                {/* 背景の国ポリゴン & パズルソケット */}
                <g>
                  {(viewMode === "3d" && globeRenderData ? globeRenderData.paths3D : backgroundPaths).map((item) => {
                    const isPlaced = !!item.iso3 && placedIso3s.has(item.iso3);
                    const isCurrentActive =
                      !!item.iso3 && activePiece?.country.iso3 === item.iso3;
                    const isHintRadar = isCurrentActive && hintLevel >= 2;
                    const isDragNearThis =
                      !!item.iso3 &&
                      dragging?.iso3 === item.iso3 &&
                      dragging.isNearTarget;

                    if (!item.isTarget) {
                      return (
                        <path
                          key={item.mapId}
                          d={item.d}
                          fill="var(--land)"
                          stroke="rgba(255, 255, 255, 0.85)"
                          strokeWidth={0.75}
                          vectorEffect="non-scaling-stroke"
                        />
                      );
                    }

                    if (isPlaced) {
                      return (
                        <path
                          key={item.mapId}
                          d={item.d}
                          fill={stageConfig.pieceFill}
                          fillOpacity={0.92}
                          stroke="#ffffff"
                          strokeWidth={1.2}
                          vectorEffect="non-scaling-stroke"
                          className="transition-all duration-300 cursor-pointer hover:brightness-105"
                          onClick={() => {
                            if (item.iso3) {
                              const c = byIso3(item.iso3);
                              if (c) setLastPlacedCountry(c);
                            }
                          }}
                        />
                      );
                    }

                    // 未配置のパズルソケット（飛び地は背景陸地として描き、本土のみ白抜きのくぼみ枠にしてトレイのピース形と完全一致させる）
                    return (
                      <g key={item.mapId}>
                        {item.socketD !== item.d && (
                          <path
                            d={item.d}
                            fill="var(--land)"
                            stroke="rgba(255, 255, 255, 0.85)"
                            strokeWidth={0.75}
                            vectorEffect="non-scaling-stroke"
                          />
                        )}
                        <path
                          d={item.socketD}
                          fill={
                            isDragNearThis
                              ? "rgba(56, 189, 248, 0.55)"
                              : isHintRadar
                                ? "rgba(251, 191, 36, 0.55)"
                                : "rgba(255, 255, 255, 0.88)"
                          }
                          stroke={
                            isDragNearThis
                              ? "#0284c7"
                              : isHintRadar
                                ? "#d97706"
                                : "#64748b"
                          }
                          strokeWidth={isDragNearThis || isHintRadar ? 2.2 : 0.85}
                          strokeDasharray={isDragNearThis ? undefined : "1.8 1.4"}
                          vectorEffect="non-scaling-stroke"
                          filter={isDragNearThis ? "url(#snapGlow)" : undefined}
                          className="cursor-pointer transition-colors duration-150 hover:fill-sky-100"
                          onClick={(e) => handleSocketClick(item.iso3, e)}
                        />
                      </g>
                    );
                  })}
                </g>

                {/* ヒント①：大まかなエリア絞り込みサークル（正解の周辺一帯をふわっと光らせる・2D/3D両対応） */}
                {activePiece && hintLevel === 1 && !isCleared && (() => {
                  if (viewMode === "3d") {
                    const pos3D = globeRenderData?.piecePos3D.get(activePiece.country.iso3);
                    if (!pos3D || !pos3D.visible) return null;
                    const zoneR = 54 * Math.pow(mapZoom, 0.4);
                    return (
                      <g
                        className="pointer-events-none"
                        transform={`translate(${pos3D.x}, ${pos3D.y})`}
                      >
                        <circle
                          r={zoneR}
                          fill="rgba(245, 158, 11, 0.2)"
                          stroke="#f59e0b"
                          strokeWidth={2.2}
                          strokeDasharray="6 4"
                        />
                      </g>
                    );
                  }
                  const zoneOffsetX = ((activePiece.country.id.charCodeAt(0) % 5) - 2) * 14;
                  const zoneOffsetY = ((activePiece.country.iso3.charCodeAt(0) % 5) - 2) * 12;
                  const zoneR = Math.max(58, Math.min(92, Math.max(activePiece.width, activePiece.height) * 0.95 + 42)) / Math.pow(mapZoom, 0.35);
                  return (
                    <g
                      className="pointer-events-none"
                      transform={`translate(${activePiece.targetX + zoneOffsetX}, ${activePiece.targetY + zoneOffsetY})`}
                    >
                      <circle
                        r={zoneR}
                        fill="rgba(245, 158, 11, 0.16)"
                        stroke="#f59e0b"
                        strokeWidth={2 / Math.pow(mapZoom, 0.35)}
                        strokeDasharray="6 4"
                      />
                    </g>
                  );
                })()}

                {/* 選択中ピースの透明タップ判定アシスト ＆ ヒント・吸着時のエフェクトリング */}
                <g>
                  {pieces.map((p) => {
                    if (placedIso3s.has(p.country.iso3)) return null;
                    const isCurrentActive = activePiece?.country.iso3 === p.country.iso3;
                    const isHintRadar = isCurrentActive && hintLevel >= 2;
                    const isDragNearThis =
                      dragging?.iso3 === p.country.iso3 && dragging.isNearTarget;

                    if (!isCurrentActive && !isHintRadar && !isDragNearThis) return null;

                    let tx = p.targetX;
                    let ty = p.targetY;
                    if (viewMode === "3d") {
                      const pos3D = globeRenderData?.piecePos3D.get(p.country.iso3);
                      if (!pos3D || !pos3D.visible) return null;
                      tx = pos3D.x;
                      ty = pos3D.y;
                    }

                    const ringScale = viewMode === "3d" ? 1 : 1 / Math.sqrt(mapZoom);

                    return (
                      <g
                        key={`target-ring-${p.country.iso3}`}
                        transform={`translate(${tx}, ${ty})`}
                        className="cursor-pointer"
                        onClick={(e) => handleSocketClick(p.country.iso3, e)}
                      >
                        {/* 選択中のピースのみ、小国でも指でタップしやすい透明ヒット領域を付与 */}
                        <circle
                          r={Math.max(14, 22 * ringScale)}
                          fill="transparent"
                          style={{ pointerEvents: "all" }}
                        />

                        {isHintRadar && (
                          <>
                            <circle
                              r={26 * ringScale}
                              fill="rgba(245, 158, 11, 0.28)"
                              stroke="#d97706"
                              strokeWidth={2.2}
                              className="animate-ping"
                            />
                            <circle
                              r={15 * ringScale}
                              fill="rgba(251, 191, 36, 0.48)"
                              stroke="#b45309"
                              strokeWidth={2}
                            />
                          </>
                        )}
                        {isDragNearThis && (
                          <circle
                            r={22 * ringScale}
                            fill="rgba(14, 165, 233, 0.32)"
                            stroke="#0284c7"
                            strokeWidth={2.2}
                          />
                        )}
                      </g>
                    );
                  })}
                </g>

                {/* 配置完了した国の国名ラベル（2D/3D両対応・白フチ文字で描画） */}
                <g className="pointer-events-none">
                  {pieces.map((p) => {
                    if (!placedIso3s.has(p.country.iso3)) return null;
                    let lx = p.targetX;
                    let ly = p.targetY;
                    if (viewMode === "3d") {
                      const pos3D = globeRenderData?.piecePos3D.get(p.country.iso3);
                      if (!pos3D || !pos3D.visible) return null;
                      lx = pos3D.x;
                      ly = pos3D.y;
                    }
                    const minDim = Math.min(p.width, p.height);
                    const baseFontSize = minDim < 22 ? 6.2 : minDim < 36 ? 7.2 : 8.5;
                    const scaledFontSize = viewMode === "3d" ? Math.max(8, baseFontSize * 1.15) : baseFontSize / Math.pow(mapZoom, 0.45);
                    const scaledStroke = viewMode === "3d" ? 2.6 : 2.4 / Math.pow(mapZoom, 0.45);
                    return (
                      <g
                        key={`label-${p.country.iso3}`}
                        transform={`translate(${lx}, ${ly})`}
                      >
                        <text
                          textAnchor="middle"
                          dominantBaseline="central"
                          fill="#0f172a"
                          fontSize={scaledFontSize}
                          fontWeight="900"
                          stroke="rgba(255, 255, 255, 0.94)"
                          strokeWidth={scaledStroke}
                          strokeLinejoin="round"
                          style={{ paintOrder: "stroke" }}
                        >
                          {p.country.nameJa.slice(0, 6)}
                        </text>
                      </g>
                    );
                  })}
                </g>
              </svg>

              {/* PC用の初回ガイド（モバイルは画面を極限までクリーンに保つため非表示） */}
              {!isRunning && placedIso3s.size === 0 && !isCleared && (
                <div className="hidden lg:block pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 z-10">
                  <div className="rounded-xl bg-background/90 backdrop-blur-md border border-sky-500/30 px-3 py-1 text-foreground shadow-sm text-xs font-bold">
                    ピースをドラッグ、または選んで白枠をクリックで配置
                  </div>
                </div>
              )}

              {/* 直近に配置した国のスリム通知ピル（地図左下、右下のズームバーと重ならない位置） */}
              {lastPlacedCountry && !isCleared && (
                <div className="absolute bottom-1.5 lg:bottom-2 left-1.5 lg:left-2 max-w-[calc(100%-10.25rem)] lg:max-w-md z-10 rounded-xl bg-background/92 backdrop-blur-md border border-border px-2 py-1 text-foreground shadow-md flex items-center justify-between gap-1.5 animate-in fade-in slide-in-from-bottom-1 duration-200">
                  <div className="flex items-center gap-1 min-w-0">
                    <FlagImage flag={lastPlacedCountry.flag} size="sm" className="shrink-0" />
                    <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 shrink-0">✓</span>
                    <span className="text-[11px] sm:text-xs font-bold truncate">{lastPlacedCountry.nameJa}</span>
                  </div>
                  <Link
                    to="/country/$iso3"
                    params={{ iso3: lastPlacedCountry.iso3 }}
                    search={{ from: "puzzle" }}
                    onClick={() => {
                      persistPuzzleSession({
                        stageId,
                        blindMode,
                        shuffledIso3s,
                        placedIso3s: Array.from(placedIso3s),
                        selectedIso3,
                        elapsedMs: isRunning ? Date.now() - startTimeRef.current : elapsedMs,
                        mistakesCount,
                        hintsUsedCount,
                        combo,
                        lastPlacedIso3: lastPlacedCountry.iso3,
                        isCleared,
                      });
                    }}
                    className="text-[10px] sm:text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-sky-500/15 hover:bg-sky-500/25 text-sky-600 dark:text-sky-300 shrink-0 active:scale-95"
                  >
                    詳細↗
                  </Link>
                </div>
              )}

              {/* クリア祝福オーバーレイ */}
              {isCleared && (
                <div className="absolute inset-0 bg-background/80 backdrop-blur-md flex items-center justify-center p-4 z-20 animate-in fade-in duration-300">
                  <div className="max-w-md w-full rounded-3xl bg-card border border-border p-5 sm:p-6 text-center shadow-2xl space-y-4">
                    <div className="mx-auto size-14 sm:size-16 rounded-3xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-lg">
                      <Trophy className="size-8 sm:size-9" />
                    </div>

                    <div>
                      {isNewRecord && (
                        <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-black bg-amber-500 text-slate-950 mb-1.5">
                          <Sparkles className="size-3.5" /> NEW RECORD! 自己ベスト更新
                        </span>
                      )}
                      <h2 className="font-display text-xl sm:text-2xl font-black text-foreground">
                        {stageConfig.label} パズル制覇！
                      </h2>
                      <p className="text-xs text-muted-foreground mt-1">
                        全 {pieces.length} ヵ国のピースをすべて正しい位置に収めました！
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-2 rounded-2xl bg-secondary/60 p-3 border border-border/60">
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground">クリアタイム</p>
                        <p className="font-mono text-base font-black text-sky-500">
                          {formatStopwatch(elapsedMs)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground">ミス回数</p>
                        <p className="font-mono text-base font-black text-foreground">
                          {mistakesCount}回
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground">評価ランク</p>
                        <p className="text-base font-black text-amber-500">
                          {mistakesCount === 0 && hintsUsedCount === 0
                            ? "★★★"
                            : mistakesCount <= 3 && hintsUsedCount <= 2
                              ? "★★☆"
                              : "★☆☆"}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 pt-1">
                      <Button
                        type="button"
                        onClick={() => startNewGame(stageId)}
                        className="flex-1 rounded-xl font-bold gap-1.5 cursor-pointer"
                      >
                        <RotateCcw className="size-4" />
                        <span>もう一度挑戦</span>
                      </Button>
                      <Link
                        to="/mypage"
                        className="flex-1 inline-flex items-center justify-center rounded-xl bg-secondary px-4 py-2 text-xs font-bold text-foreground hover:bg-secondary/80"
                      >
                        マイページで記録を見る ➜
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 右／下：超シンプル2段コマンドデッキ（モバイルは選択バー＋横並び一覧のみ） */}
          <div className="shrink-0 lg:col-span-4 surface-card p-2 sm:p-3 flex flex-col gap-2">
            {/* モバイル・タブレット向け：ヒーロー選択バー（◀ / シルエット＋フル国名 / ▶ / 一覧検索アイコン） */}
            {activePiece && !isCleared && (
              <div
                className={cn(
                  "lg:hidden rounded-2xl border transition-colors overflow-hidden",
                  wrongFeedbackIso3 === activePiece.country.iso3
                    ? "border-destructive bg-destructive/15 animate-bounce"
                    : "border-sky-500/35 bg-sky-500/8",
                )}
              >
                <div className="flex items-center gap-1 p-1.5">
                  <button
                    type="button"
                    onClick={() => handleCyclePiece(-1)}
                    disabled={unplacedPieces.length <= 1}
                    aria-label="前のピース"
                    className="size-9 shrink-0 rounded-xl bg-background/90 hover:bg-background border border-border/70 flex items-center justify-center text-foreground disabled:opacity-35 cursor-pointer active:scale-95 transition-all"
                  >
                    <ChevronLeft className="size-4.5" />
                  </button>

                  {/* 中央：大きく見やすいドラッグ可能なシルエットハンドル ＋ コンパクトにまとめた国旗＆国名 */}
                  <div className="flex-1 min-w-0 flex items-center gap-2 px-0.5">
                    <div
                      title="ドラッグして地図に配置"
                      onPointerDown={(e) => {
                        e.currentTarget.releasePointerCapture(e.pointerId);
                        pendingDragRef.current = {
                          iso3: activePiece.country.iso3,
                          startX: e.clientX,
                          startY: e.clientY,
                          isTouch: e.pointerType === "touch",
                          fromDockHandle: true,
                        };
                      }}
                      className="size-13 shrink-0 rounded-xl bg-background border border-sky-500/40 p-0.5 flex items-center justify-center touch-none cursor-grab active:cursor-grabbing shadow-xs"
                    >
                      <svg viewBox={activePiece.trayViewBox} className="w-full h-full overflow-visible">
                        <path
                          d={activePiece.trayPathD}
                          fill={stageConfig.pieceFill}
                          stroke={stageConfig.pieceStroke}
                          strokeWidth={1.6}
                          vectorEffect="non-scaling-stroke"
                        />
                      </svg>
                    </div>

                    <div className="min-w-0 flex-1">
                      {!blindMode || hintLevel >= 1 ? (
                        <div className="inline-flex items-center gap-1 max-w-full rounded-lg bg-background/75 border border-border/50 px-2 py-1">
                          <FlagImage
                            flag={activePiece.country.flag}
                            size="xs"
                            className="shrink-0"
                          />
                          <span className="text-xs font-extrabold text-foreground leading-tight line-clamp-2 break-words">
                            {activePiece.country.nameJa}
                          </span>
                        </div>
                      ) : (
                        <div className="text-xs font-extrabold text-foreground leading-tight">
                          シルエットで挑戦中
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCyclePiece(1)}
                    disabled={unplacedPieces.length <= 1}
                    aria-label="次のピース"
                    className="size-9 shrink-0 rounded-xl bg-background/90 hover:bg-background border border-border/70 flex items-center justify-center text-foreground disabled:opacity-35 cursor-pointer active:scale-95 transition-all"
                  >
                    <ChevronRight className="size-4.5" />
                  </button>

                  {unplacedPieces.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setMobileSheetOpen(true)}
                      aria-label="一覧・検索を開く"
                      title="一覧・検索"
                      className="size-9 shrink-0 rounded-xl bg-primary/12 active:bg-primary/20 border border-primary/35 text-primary flex items-center justify-center cursor-pointer active:scale-95 transition-all ml-0.5"
                    >
                      <Search className="size-4" />
                    </button>
                  )}
                </div>

                {/* ヒント発動時はヒーローカード下部に一体化して表示（大陸＋隣接国） */}
                {hintLevel >= 1 && (
                  <div className="border-t border-amber-500/25 bg-amber-500/12 px-2.5 py-1 text-[11px] text-amber-800 dark:text-amber-300 font-medium flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    <span className="shrink-0 font-bold">
                      🗺️ {continentLabel(activePiece.country.continent)}
                    </span>
                    <span className="text-amber-900/80 dark:text-amber-200/90 whitespace-nowrap">
                      📍 {activePiece.country.geography.borders}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* PC・タブレット横用トレイヘッダー：ピース一覧の行の右端にヒント＆国名ありを配置 */}
            <div className="hidden lg:block space-y-2">
              <div className="flex items-center justify-between gap-2 min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Target className="size-4 text-sky-500 shrink-0" />
                  <h2 className="font-display text-sm font-bold text-foreground shrink-0">
                    ピース一覧
                  </h2>
                  <span className="text-[11px] font-bold text-muted-foreground shrink-0">
                    (残り{unplacedPieces.length})
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {activePiece && !isCleared && (
                    <button
                      type="button"
                      onClick={handleTriggerHint}
                      disabled={hintLevel >= 2}
                      title={hintLevel === 0 ? "ヒント①（エリア＆隣接国）" : hintLevel === 1 ? "ヒント②（場所を表示）" : "場所を点滅中"}
                      className={cn(
                        "h-7.5 px-2.5 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer border active:scale-95 transition-all shrink-0",
                        hintLevel === 0
                          ? "border-amber-500/40 bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25"
                          : hintLevel === 1
                            ? "border-sky-500/40 bg-sky-500/20 text-sky-600 dark:text-sky-300 hover:bg-sky-500/30"
                            : "opacity-50 border-border bg-secondary text-muted-foreground",
                      )}
                    >
                      <Lightbulb className="size-3.5 shrink-0" />
                      <span>
                        {hintLevel === 0 ? "ヒント" : hintLevel === 1 ? "場所" : "点滅"}
                      </span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setBlindMode((b) => !b)}
                    title="シルエットのみ表示（国名と国旗を隠す達人モード）"
                    className={cn(
                      "h-7.5 px-2.5 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer border active:scale-95 transition-all shrink-0",
                      blindMode
                        ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                        : "bg-secondary/50 text-muted-foreground border-border/60 hover:bg-secondary hover:text-foreground",
                    )}
                  >
                    {blindMode ? <EyeOff className="size-3.5 shrink-0" /> : <Eye className="size-3.5 shrink-0" />}
                    <span>{blindMode ? "達人" : "国名あり"}</span>
                  </button>
                </div>
              </div>

              {activePiece && hintLevel >= 1 && (
                <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 px-2.5 py-1.5 text-xs text-amber-700 dark:text-amber-300 font-medium flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
                  <span className="shrink-0 font-bold">
                    🗺️ {continentLabel(activePiece.country.continent)}
                  </span>
                  <span className="text-muted-foreground text-[11px]">
                    📍 {activePiece.country.geography.borders}
                  </span>
                </div>
              )}
            </div>

            {unplacedPieces.length === 0 ? (
              <div className="py-4 text-center space-y-1">
                <Check className="size-6 text-emerald-500 mx-auto" />
                <p className="text-xs font-bold text-foreground">すべてのピースを配置しました！</p>
              </div>
            ) : (
              <div className="flex lg:grid lg:grid-cols-2 xl:grid-cols-3 gap-1.5 lg:gap-2 overflow-x-auto lg:overflow-x-visible lg:max-h-[540px] lg:overflow-y-auto pb-0.5 lg:pb-0 lg:pr-1 touch-pan-x lg:touch-pan-y [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                {unplacedPieces.map((piece) => {
                  const iso3 = piece.country.iso3;
                  const isSelected = activePiece?.country.iso3 === iso3;
                  const isWrong = wrongFeedbackIso3 === iso3;
                  const isBeingDragged = dragging?.iso3 === iso3;

                  return (
                    <div
                      key={iso3}
                      ref={(el) => {
                        if (el) {
                          dockItemRefs.current.set(iso3, el);
                        } else {
                          dockItemRefs.current.delete(iso3);
                        }
                      }}
                      onPointerDown={(e) => {
                        try {
                          e.currentTarget.releasePointerCapture(e.pointerId);
                        } catch {
                          // ignore if not captured
                        }
                        clearPendingDrag();
                        setSelectedIso3(iso3);
                        setHintLevel(0);

                        const isTouch = e.pointerType === "touch";
                        const isGridLayout = typeof window !== "undefined" && window.innerWidth >= 1024;
                        const startX = e.clientX;
                        const startY = e.clientY;

                        // タッチ操作時は長押し（180ms）でも確実にピースを持ち上げてドラッグ開始できる
                        const longPressTimer = isTouch
                          ? setTimeout(() => {
                              if (pendingDragRef.current?.iso3 === iso3) {
                                ensureTimerStarted();
                                const aimY = startY + getTouchDragOffsetY(startY);
                                const svgPt = clientToSvgPoint(startX, aimY);
                                const isNear = svgPt ? checkIsSnapMatch(piece, svgPt.x, svgPt.y, true) : false;
                                setDragging({
                                  iso3,
                                  clientX: startX,
                                  clientY: startY,
                                  isTouch: true,
                                  isNearTarget: isNear,
                                });
                                pendingDragRef.current = null;
                              }
                            }, 180)
                          : undefined;

                        pendingDragRef.current = {
                          iso3,
                          startX,
                          startY,
                          isTouch,
                          fromDockHandle: false,
                          isGridLayout,
                          ...(longPressTimer ? { longPressTimer } : {}),
                        };
                      }}
                      onClick={() => {
                        setSelectedIso3(iso3);
                        setHintLevel(0);
                      }}
                      className={cn(
                        "group relative flex flex-col items-center justify-between rounded-xl border p-1.5 transition-all cursor-grab active:cursor-grabbing select-none touch-pan-x lg:touch-pan-y w-[112px] sm:w-[124px] lg:w-auto shrink-0 active:scale-[0.98]",
                        isBeingDragged && "opacity-35 scale-95",
                        isWrong && "border-destructive bg-destructive/15 animate-bounce",
                        isSelected && !isWrong
                          ? "border-sky-500 bg-sky-500/15 ring-2 ring-sky-400/35 shadow-xs"
                          : "border-border/70 bg-secondary/40 hover:bg-secondary/80 hover:border-border",
                      )}
                    >
                      {/* 国のシルエットSVGを大きく主役表示 */}
                      <div className="w-full h-14 sm:h-15 lg:h-16 flex items-center justify-center">
                        <svg
                          viewBox={piece.trayViewBox}
                          className="w-full h-full overflow-visible drop-shadow-xs transition-transform group-hover:scale-105"
                        >
                          <path
                            d={piece.trayPathD}
                            fill={stageConfig.pieceFill}
                            stroke={stageConfig.pieceStroke}
                            strokeWidth={1.5}
                            vectorEffect="non-scaling-stroke"
                          />
                        </svg>
                      </div>

                      {/* 国旗＋国名を小さくコンパクトに1つにまとめる */}
                      <div className="w-full mt-0.5 pt-1 border-t border-border/50 flex items-center justify-center gap-1 min-h-[1.65rem]">
                        {!blindMode ? (
                          <>
                            <FlagImage flag={piece.country.flag} size="xs" className="shrink-0" />
                            <span className="text-[10px] font-bold text-foreground leading-[1.15] line-clamp-2 break-words text-left">
                              {piece.country.nameJa}
                            </span>
                          </>
                        ) : (
                          <span className="text-[10px] font-bold text-muted-foreground">
                            {isSelected ? "選択中" : "タップ"}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* モバイル・タブレット向け：ピース一覧＆検索ボトムシート */}
      {mobileSheetOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end bg-slate-950/55 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setMobileSheetOpen(false)}
        >
          <div
            className="w-full max-h-[82dvh] rounded-t-3xl bg-card border-t border-border shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-200"
            style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* ハンドルバー */}
            <div className="flex justify-center pt-2.5 pb-1">
              <div className="w-10 h-1.5 rounded-full bg-muted-foreground/30" />
            </div>

            {/* シートヘッダー */}
            <div className="flex items-center justify-between px-4 pb-2.5 border-b border-border/70">
              <div className="flex items-center gap-2">
                <Target className="size-4 text-sky-500" />
                <h3 className="font-display text-sm font-bold text-foreground">
                  ピース一覧（残り{unplacedPieces.length}ヵ国）
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setMobileSheetOpen(false)}
                aria-label="閉じる"
                className="size-10 rounded-xl bg-secondary/80 hover:bg-secondary text-foreground flex items-center justify-center cursor-pointer active:scale-95"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* 国名検索バー（達人モード時は非表示、iOS自動ズーム防止のため text-base） */}
            {!blindMode && (
              <div className="px-4 py-2.5 border-b border-border/60 bg-secondary/20 space-y-1">
                <div className="relative flex items-center">
                  <Search className="size-4 text-muted-foreground absolute left-3 pointer-events-none" />
                  <input
                    type="search"
                    value={pieceSearchQuery}
                    onChange={(e) => setPieceSearchQuery(e.target.value)}
                    placeholder="国名・首都で絞り込み..."
                    className="w-full h-10 pl-9 pr-9 rounded-xl bg-background border border-border text-base sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                  />
                  {pieceSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setPieceSearchQuery("")}
                      aria-label="検索をクリア"
                      className="size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground absolute right-1"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </div>
                {pieceSearchQuery && (
                  <p className="text-[11px] text-muted-foreground px-1">
                    {filteredSheetPieces.length} 件ヒット
                  </p>
                )}
              </div>
            )}

            {/* スクロール可能な2〜3列グリッド一覧 */}
            <div className="flex-1 overflow-y-auto overscroll-contain touch-pan-y p-3">
              {filteredSheetPieces.length === 0 ? (
                <div className="py-10 text-center text-xs text-muted-foreground">
                  「{pieceSearchQuery}」に一致する未配置の国が見つかりません
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {filteredSheetPieces.map((piece) => {
                    const iso3 = piece.country.iso3;
                    const isSelected = activePiece?.country.iso3 === iso3;
                    return (
                      <button
                        key={`sheet-${iso3}`}
                        type="button"
                        onClick={() => {
                          setSelectedIso3(iso3);
                          setHintLevel(0);
                          setMobileSheetOpen(false);
                        }}
                        className={cn(
                          "relative flex flex-col items-center justify-between rounded-xl border p-2 text-center transition-all cursor-pointer active:scale-95",
                          isSelected
                            ? "border-sky-500 bg-sky-500/15 ring-2 ring-sky-400/35"
                            : "border-border/70 bg-secondary/40 hover:bg-secondary/70",
                        )}
                      >
                        <div className="w-full h-16 flex items-center justify-center">
                          <svg viewBox={piece.trayViewBox} className="w-full h-full overflow-visible">
                            <path
                              d={piece.trayPathD}
                              fill={stageConfig.pieceFill}
                              stroke={stageConfig.pieceStroke}
                              strokeWidth={1.5}
                              vectorEffect="non-scaling-stroke"
                            />
                          </svg>
                        </div>

                        <div className="w-full mt-1 pt-1 border-t border-border/50 min-h-[1.8rem] flex items-center justify-center gap-1">
                          {!blindMode ? (
                            <>
                              <FlagImage flag={piece.country.flag} size="xs" className="shrink-0" />
                              <span className="text-[11px] font-bold text-foreground leading-tight line-clamp-2 break-words text-left">
                                {piece.country.nameJa}
                              </span>
                            </>
                          ) : (
                            <span className="text-[11px] font-bold text-muted-foreground">
                              {isSelected ? "選択中" : "この国を選ぶ"}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              <p className="mt-3 pb-1 text-center text-[10px] text-muted-foreground/80">
                ※ 地図の縮尺上、一部の極小国は含まれません
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ドラッグ中にポインターに追従するフローティング・シルエットピース（タッチ時は指の上方に照準表示） */}
      {dragging && draggingPieceData && (
        <div
          className="fixed pointer-events-none z-50 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
          style={{
            left: dragging.clientX,
            top: dragging.clientY + (dragging.isTouch ? getTouchDragOffsetY(dragging.clientY) : 0),
          }}
        >
          {/* 中心のターゲット照準レティクル（＋） */}
          <div className="relative size-24 sm:size-28 flex items-center justify-center">
            <svg
              viewBox={draggingPieceData.viewBox}
              className={cn(
                "w-full h-full overflow-visible transition-transform duration-100",
                dragging.isNearTarget
                  ? "scale-115 drop-shadow-[0_0_16px_rgba(56,189,248,0.95)]"
                  : "drop-shadow-2xl",
              )}
            >
              <path
                d={draggingPieceData.piecePathD}
                fill={dragging.isNearTarget ? "#38bdf8" : stageConfig.pieceFill}
                fillOpacity={0.92}
                stroke="#ffffff"
                strokeWidth={2}
                vectorEffect="non-scaling-stroke"
              />
            </svg>

            {/* 照準マーク */}
            <div
              className={cn(
                "absolute size-6 rounded-full border-2 flex items-center justify-center transition-all",
                dragging.isNearTarget
                  ? "border-emerald-300 bg-emerald-400/35 scale-125"
                  : "border-white/80 bg-slate-950/40",
              )}
            >
              <div className="size-1.5 rounded-full bg-white" />
            </div>
          </div>

          {!blindMode && (
            <div className="mt-1 px-2.5 py-0.5 rounded-full bg-slate-950/92 border border-white/25 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg">
              <FlagImage flag={draggingPieceData.country.flag} size="sm" />
              <span>{draggingPieceData.country.nameJa}</span>
            </div>
          )}

          {/* タッチ操作時、指の位置からピースへのガイドライン */}
          {dragging.isTouch && (
            <div className="w-0.5 h-8 bg-gradient-to-b from-sky-400/80 to-transparent mt-0.5" />
          )}
        </div>
      )}
    </div>
  );
}

