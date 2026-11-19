import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  geoArea,
  geoCentroid,
  geoDistance,
  geoGraticule10,
  geoNaturalEarth1,
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
  Crosshair,
  Eye,
  EyeOff,
  Flame,
  Globe,
  Hand,
  HelpCircle,
  Landmark,
  LayoutGrid,
  Lightbulb,
  MapPin,
  Maximize2,
  Mountain,
  Puzzle,
  RotateCcw,
  Sparkles,
  Star,
  Sun,
  Sunrise,
  Target,
  Trophy,
  Volume2,
  VolumeX,
  Waves,
  Zap,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import world from "@/data/world.geo.json";
import { countries } from "@/data/countries";
import { byIso3, byMapId } from "@/data/lookup";
import { type ContinentId, type Country } from "@/data/types";
import { SiteHeader } from "@/components/SiteHeader";
import { FlagImage } from "@/components/FlagImage";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useProgress } from "@/stores/progress";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/puzzle")({
  head: () => ({
    meta: [
      { title: "世界地図ジグソーパズル — 国の形と位置を体感マスター | EarthScope (ES)" },
      {
        name: "description",
        content:
          "大陸別ステージで国のシルエットピースを白地図にはめるインタラクティブ世界地図パズル。ヒント機能・クリアタイム計測・ベストタイム記録対応。",
      },
      { property: "og:title", content: "世界地図ジグソーパズル | EarthScope (ES)" },
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
const SNAP_BASE_RADIUS = 48;
const SNAP_TOUCH_RADIUS = 64;
/** タッチ操作時、指でピースと地図が隠れないよう指の上方64pxに照準をオフセット */
const TOUCH_DRAG_OFFSET_Y = -64;

type StageId = ContinentId | "world";
type Difficulty = "standard" | "master";

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
  standardIso3s: string[];
  masterIso3s: string[];
};

const STAGE_CONFIGS: StageConfig[] = [
  {
    id: "world",
    label: "世界主要国",
    sublabel: "世界6大陸の代表的国家オールスター",
    icon: Globe,
    accentColor: "text-indigo-500",
    pieceFill: "#6366f1",
    pieceStroke: "#a5b4fc",
    bbox: [-120, -43, 162, 59],
    standardIso3s: [
      "JPN", "CHN", "IND", "SAU", "TUR", "GBR", "FRA", "DEU", "ITA",
      "EGY", "NGA", "ZAF", "CAN", "USA", "MEX", "BRA", "ARG", "AUS",
    ],
    masterIso3s: [
      "JPN", "CHN", "KOR", "IND", "IDN", "THA", "SAU", "TUR", "IRN", "KAZ",
      "GBR", "FRA", "DEU", "ITA", "ESP", "POL", "UKR", "SWE", "NOR",
      "EGY", "DZA", "NGA", "ETH", "KEN", "COD", "ZAF", "MDG",
      "CAN", "USA", "MEX", "BRA", "ARG", "CHL", "PER", "COL", "AUS", "NZL",
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
    standardIso3s: [
      "JPN", "CHN", "KOR", "IND", "IDN", "THA", "VNM", "PHL", "MYS", "SAU", "TUR", "IRN",
    ],
    masterIso3s: [
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
    standardIso3s: [
      "GBR", "FRA", "DEU", "ITA", "ESP", "PRT", "POL", "UKR", "SWE", "NOR", "FIN", "GRC",
    ],
    masterIso3s: [
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
    standardIso3s: [
      "EGY", "MAR", "DZA", "NGA", "ETH", "KEN", "TZA", "COD", "ZAF", "MDG", "GHA", "AGO",
    ],
    masterIso3s: [
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
    standardIso3s: [
      "CAN", "USA", "MEX", "CUB", "GTM", "HND", "NIC", "CRI", "PAN", "DOM",
    ],
    masterIso3s: [
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
    standardIso3s: [
      "BRA", "ARG", "CHL", "PER", "COL", "VEN", "BOL", "ECU",
    ],
    masterIso3s: [
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
    standardIso3s: [
      "AUS", "NZL", "PNG", "FJI", "SLB", "VUT",
    ],
    masterIso3s: [
      "AUS", "NZL", "PNG", "FJI", "SLB", "VUT", "IDN", "PHL", "MYS", "TLS",
    ],
  },
];

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
          // ロシアのウランゲリ島（西経側）を除外
          if (String(f.id) === "643" && p.centroid[0] < 0) return false;
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
  difficulty: Difficulty;
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

function createShuffledList(stageId: StageId, difficulty: Difficulty): string[] {
  const cfg = STAGE_CONFIGS.find((s) => s.id === stageId) ?? STAGE_CONFIGS[0]!;
  const list = [...(difficulty === "standard" ? cfg.standardIso3s : cfg.masterIso3s)];
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
        if (parsed && parsed.stageId && Array.isArray(parsed.shuffledIso3s) && parsed.shuffledIso3s.length > 0) {
          memoryPuzzleSession = parsed;
          return parsed;
        }
      }
    } catch {
      // ignore storage errors
    }
  }
  const initialList = createShuffledList("world", "standard");
  const fresh: SavedPuzzleSession = {
    stageId: "world",
    difficulty: "standard",
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
  const [difficulty, setDifficulty] = useState<Difficulty>(initialSession.difficulty);
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

  // タイマー計測
  const [elapsedMs, setElapsedMs] = useState(initialSession.elapsedMs);
  const [isRunning, setIsRunning] = useState(!initialSession.isCleared);
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

  // 地図ズーム＆パン状態（モバイル・タブレットで小さい国を拡大して配置しやすくする）
  const [mapZoom, setMapZoom] = useState<number>(1);
  const [mapPan, setMapPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  // モバイル・タブレット用のトレイ表示モード（横スワイプドック or 一覧グリッド）
  const [mobileTrayView, setMobileTrayView] = useState<"dock" | "grid">("dock");

  const boardSvgRef = useRef<SVGSVGElement | null>(null);
  const startTimeRef = useRef<number>(Date.now() - initialSession.elapsedMs);

  // タップ選択・横スクロールとドラッグ開始を区別するための待機参照
  const pendingDragRef = useRef<{
    iso3: string;
    startX: number;
    startY: number;
    isTouch: boolean;
    fromDockHandle?: boolean;
  } | null>(null);

  // 地図拡大時のドラッグパン操作用の参照
  const boardPanRef = useRef<{
    startX: number;
    startY: number;
    startPanX: number;
    startPanY: number;
    isPanning: boolean;
  } | null>(null);
  const suppressNextSocketClickRef = useRef<boolean>(false);

  const { puzzleRecords = {}, recordPuzzleClear } = useProgress();

  const stageConfig = useMemo(
    () => STAGE_CONFIGS.find((s) => s.id === stageId) ?? STAGE_CONFIGS[0]!,
    [stageId],
  );

  const stageKey = `${stageId}-${difficulty}`;
  const currentBestRecord = puzzleRecords[stageKey];

  // D3 Projection & 地図パス・パズルピース生成
  const { backgroundPaths, graticuleD, pieces, pieceByIso3 } = useMemo(() => {
    const [minLon, minLat, maxLon, maxLat] = stageConfig.bbox;
    const midLon = (minLon + maxLon) / 2;
    const midLat = (minLat + maxLat) / 2;
    const isContinentStage = stageConfig.id !== "world";

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

    // 大陸別ステージでは中心経度(midLon)を正面に回転、世界主要国ステージでは余白を最小化して程よく大きく表示
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

    const targetIso3List =
      difficulty === "standard" ? stageConfig.standardIso3s : stageConfig.masterIso3s;
    const targetIso3Set = new Set(targetIso3List);

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
  }, [stageConfig, difficulty]);

  const startNewGame = (nextStageId = stageId, nextDiff = difficulty) => {
    const list = createShuffledList(nextStageId, nextDiff);
    setStageId(nextStageId);
    setDifficulty(nextDiff);
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
    setIsRunning(true);
    setMapZoom(1);
    setMapPan({ x: 0, y: 0 });
    startTimeRef.current = Date.now();
    persistPuzzleSession({
      stageId: nextStageId,
      difficulty: nextDiff,
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
      difficulty,
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
    difficulty,
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

  // 選択中のピースの周辺エリアへ地図を拡大フォーカス（モバイル・タブレットで小さい国を配置しやすくする）
  const handleZoomToActiveRegion = (exactCenter = false) => {
    if (!activePiece) return;
    const targetZoom = Math.max(2.2, mapZoom < 2 ? 2.2 : Math.min(3.5, mapZoom + 0.6));
    // ヒント2（場所点滅）時やexact指定時は正確な中心へ、それ以外は周辺エリア（少しオフセット）へフォーカス
    const offsetX = exactCenter || hintLevel >= 2 ? 0 : ((activePiece.country.id.charCodeAt(0) % 5) - 2) * 28;
    const offsetY = exactCenter || hintLevel >= 2 ? 0 : ((activePiece.country.iso3.charCodeAt(0) % 5) - 2) * 20;
    const panX = BOARD_WIDTH / 2 - (activePiece.targetX + offsetX);
    const panY = BOARD_HEIGHT / 2 - (activePiece.targetY + offsetY);
    setMapZoom(targetZoom);
    setMapPan({ x: panX, y: panY });
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

  // 指定したSVG座標が対象ピースの正解位置にスナップするか判定
  const checkIsSnapMatch = (piece: PuzzlePieceData, svgX: number, svgY: number, isTouch = false): boolean => {
    const baseRadius = isTouch ? SNAP_TOUCH_RADIUS : SNAP_BASE_RADIUS;
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

    const nextPlaced = new Set(placedIso3s);
    nextPlaced.add(iso3);
    setPlacedIso3s(nextPlaced);
    setCombo((c) => c + 1);
    setLastPlacedCountry(piece.country);
    setHintLevel(0);
    setWrongFeedbackIso3(null);

    // 全ピース完了チェック
    if (nextPlaced.size >= pieces.length && pieces.length > 0) {
      const finalMs = Date.now() - startTimeRef.current;
      const finalSec = Math.round(finalMs / 100) / 10;
      setElapsedMs(finalMs);
      setIsCleared(true);
      setIsRunning(false);
      setMapZoom(1);
      setMapPan({ x: 0, y: 0 });
      playPuzzleSound("clear", soundEnabled);

      const stars =
        mistakesCount === 0 && hintsUsedCount === 0
          ? 3
          : mistakesCount <= 3 && hintsUsedCount <= 2
            ? 2
            : 1;

      const diffLabel = difficulty === "standard" ? "標準" : "上級";
      const isNew = recordPuzzleClear({
        stageKey,
        stageLabel: `${stageConfig.label}（${diffLabel}）`,
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

  // ドラッグ操作イベント（タップ・横スワイプとの判別 ＆ windowレベルでの追跡）
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      // 1. ドラッグ待機状態から本ドラッグへの移行判定
      if (pendingDragRef.current && !dragging) {
        const pending = pendingDragRef.current;
        const dx = e.clientX - pending.startX;
        const dy = e.clientY - pending.startY;
        const dist = Math.hypot(dx, dy);

        // モバイル横スクロールドック上で横にスワイプした場合はドラッグをキャンセルしてスクロールを優先
        if (
          pending.isTouch &&
          !pending.fromDockHandle &&
          mobileTrayView === "dock" &&
          Math.abs(dx) > 10 &&
          Math.abs(dx) > Math.abs(dy) * 1.25 &&
          dy > -12
        ) {
          pendingDragRef.current = null;
          return;
        }

        if (dist >= 7) {
          const piece = pieceByIso3.get(pending.iso3);
          const aimY = e.clientY + (pending.isTouch ? TOUCH_DRAG_OFFSET_Y : 0);
          let isNear = false;
          if (piece) {
            const svgPt = clientToSvgPoint(e.clientX, aimY);
            if (svgPt) {
              isNear = checkIsSnapMatch(piece, svgPt.x, svgPt.y, pending.isTouch);
            }
          }
          setDragging({
            iso3: pending.iso3,
            clientX: e.clientX,
            clientY: e.clientY,
            isTouch: pending.isTouch,
            isNearTarget: isNear,
          });
          pendingDragRef.current = null;
        }
        return;
      }

      // 2. 本ドラッグ中の追従とターゲット吸着判定
      if (dragging) {
        const piece = pieceByIso3.get(dragging.iso3);
        const aimY = e.clientY + (dragging.isTouch ? TOUCH_DRAG_OFFSET_Y : 0);
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
      pendingDragRef.current = null;
      if (!dragging) return;

      const piece = pieceByIso3.get(dragging.iso3);
      if (piece) {
        const aimY = e.clientY + (dragging.isTouch ? TOUCH_DRAG_OFFSET_Y : 0);
        const svgPt = clientToSvgPoint(e.clientX, aimY);
        if (svgPt && checkIsSnapMatch(piece, svgPt.x, svgPt.y, dragging.isTouch)) {
          confirmPiecePlacement(piece);
        } else if (svgPt && svgPt.x >= 0 && svgPt.x <= BOARD_WIDTH && svgPt.y >= 0 && svgPt.y <= BOARD_HEIGHT) {
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

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging, pieceByIso3, placedIso3s, soundEnabled, mapZoom, mobileTrayView]);

  // 地図上のソケットをクリック／タップして配置（スマホ・タブレット・クリック操作サポート）
  const handleSocketClick = (targetIso3: string | undefined, e: React.MouseEvent<SVGElement>) => {
    if (suppressNextSocketClickRef.current) {
      suppressNextSocketClickRef.current = false;
      return;
    }
    if (!activePiece || isCleared) return;
    e.stopPropagation();

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

  // ヒントボタン押下（ヒント2では自動的にターゲット位置へズーム＆フォーカス）
  const handleTriggerHint = () => {
    if (!activePiece || isCleared) return;
    const nextLevel = hintLevel === 0 ? 1 : 2;
    setHintLevel(nextLevel);
    setHintsUsedCount((h) => h + 1);
    playPuzzleSound("hint", soundEnabled);
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
    <div className="min-h-dvh pb-16 sm:pb-6 select-none overflow-x-hidden">
      <SiteHeader />

      <main className="mx-auto max-w-[1600px] px-2 sm:px-4 lg:px-6 pt-1.5 sm:pt-3 space-y-1.5 sm:space-y-2.5">
        {/* 1. 超スリム統合ヘッダー（余白・改行の無駄を排除し、ステージタブ＋1行コントロールに凝縮） */}
        <section className="surface-card px-2.5 py-1.5 sm:px-3.5 sm:py-2 space-y-1.5">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-1.5">
            {/* 大陸ステージタブ（スクロールバー非表示で端までスッキリ横フリック） */}
            <div className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {STAGE_CONFIGS.map((s) => {
                const active = s.id === stageId;
                const recStd = puzzleRecords[`${s.id}-standard`];
                const recMst = puzzleRecords[`${s.id}-master`];
                const hasClear = !!recStd || !!recMst;
                const StageIcon = s.icon;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      if (s.id !== stageId) {
                        startNewGame(s.id, difficulty);
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

            {/* 難易度・達人モード・進捗・タイマー・リセット（改行せず1行にスリム集約） */}
            <div className="flex items-center justify-between gap-1.5 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex items-center gap-1 shrink-0">
                <div className="inline-flex rounded-lg bg-secondary/70 p-0.5 border border-border/60">
                  <button
                    type="button"
                    onClick={() => {
                      if (difficulty !== "standard") {
                        startNewGame(stageId, "standard");
                      }
                    }}
                    className={cn(
                      "px-2 py-0.5 h-6 sm:h-7 rounded-md text-[11px] font-bold transition-all cursor-pointer active:scale-95",
                      difficulty === "standard"
                        ? "bg-background text-foreground shadow-2xs"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    標準({stageConfig.standardIso3s.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (difficulty !== "master") {
                        startNewGame(stageId, "master");
                      }
                    }}
                    className={cn(
                      "px-2 py-0.5 h-6 sm:h-7 rounded-md text-[11px] font-bold transition-all cursor-pointer active:scale-95",
                      difficulty === "master"
                        ? "bg-background text-foreground shadow-2xs"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    上級({stageConfig.masterIso3s.length})
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setBlindMode((b) => !b)}
                  title="シルエットのみ表示（国名と国旗を隠す達人モード）"
                  className={cn(
                    "flex items-center gap-1 px-2 h-7 sm:h-8 rounded-lg text-[11px] font-bold border transition-all cursor-pointer active:scale-95 shrink-0",
                    blindMode
                      ? "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/40"
                      : "bg-secondary/50 text-muted-foreground border-border/60 hover:text-foreground",
                  )}
                >
                  {blindMode ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                  <span>{blindMode ? "達人" : "国名あり"}</span>
                </button>
              </div>

              {/* 進捗＆タイマー＆操作ボタン */}
              <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                <div className="flex items-center gap-1.5 bg-secondary/50 border border-border/60 rounded-lg px-2 h-7 sm:h-8">
                  <span className="text-[11px] font-black text-sky-600 dark:text-sky-400 tabular-nums">
                    {placedIso3s.size}/{pieces.length}
                  </span>
                  <span className="text-border">|</span>
                  <Clock className="size-3 text-sky-500" />
                  <span className="font-mono text-[11px] sm:text-xs font-black tabular-nums text-foreground">
                    {formatStopwatch(elapsedMs)}
                  </span>
                  {combo >= 2 && (
                    <span className="px-1 py-0.2 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-black flex items-center gap-0.5">
                      <Flame className="size-2.5" />
                      {combo}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setSoundEnabled((s) => !s)}
                  title="効果音のON/OFF"
                  className="size-7 sm:size-8 rounded-lg border border-border/60 bg-secondary/50 text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer active:scale-95 shrink-0"
                >
                  {soundEnabled ? <Volume2 className="size-3.5" /> : <VolumeX className="size-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 2. メイン領域：地図を大きく表示し、そのすぐ下にピース一覧を配置して1画面に完全収容 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 sm:gap-3 items-start">
          {/* 左／上：大型白地図パズルボード */}
          <div className="lg:col-span-8 surface-card p-1 sm:p-2 relative overflow-hidden">
            {/* モバイルで画面高の約50%（最低340px〜）、タブレット・PCでも大画面で地図を表示 */}
            <div className="relative w-full h-[50dvh] min-h-[340px] max-h-[520px] sm:h-[55dvh] sm:min-h-[420px] lg:h-[620px] lg:max-h-none rounded-xl overflow-hidden bg-[var(--ocean)] border border-border shadow-inner">
              {/* 地図上部コントロールバー（左にやり直す、右にズーム操作を配置し、モバイル画面でも絶対に重ならないよう最適化） */}
              <div className="pointer-events-none absolute inset-x-1.5 sm:inset-x-2.5 top-1.5 sm:top-2.5 z-10 flex items-center justify-between gap-1.5">
                {/* 左上：やり直す（モバイルでは拡大中コンパクト化・通常時も見やすく配置） */}
                <div className="pointer-events-auto flex items-center bg-background/92 backdrop-blur-md border border-border/80 p-0.5 sm:p-1 rounded-xl sm:rounded-2xl shadow-md shrink-0">
                  <button
                    type="button"
                    onClick={() => startNewGame(stageId, difficulty)}
                    title="パズルを最初からやり直す"
                    className="flex items-center justify-center gap-1 px-2 sm:px-2.5 h-8 sm:h-9 rounded-lg sm:rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground text-[11px] sm:text-xs font-bold cursor-pointer active:scale-95 transition-all"
                  >
                    <RotateCcw className="size-4 shrink-0" />
                    <span className={cn(mapZoom > 1 ? "hidden sm:inline" : "inline")}>やり直す</span>
                  </button>
                </div>

                {/* 右上：周辺を拡大 → 解除 → 縮小 → 拡大（一番右） */}
                <div className="pointer-events-auto flex items-center gap-1 sm:gap-1.5 bg-background/92 backdrop-blur-md border border-border/80 p-0.5 sm:p-1 rounded-xl sm:rounded-2xl shadow-md shrink-0">
                  {activePiece && (
                    <button
                      type="button"
                      onClick={() => handleZoomToActiveRegion(false)}
                      title="選択中の国の周辺エリアを拡大"
                      className="flex items-center gap-1 px-2 sm:px-2.5 h-8 sm:h-9 rounded-lg sm:rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/40 text-sky-600 dark:text-sky-300 text-[11px] sm:text-xs font-bold cursor-pointer active:scale-95 transition-all whitespace-nowrap"
                    >
                      <Crosshair className="size-3.5 shrink-0" />
                      <span>周辺を拡大</span>
                    </button>
                  )}
                  {mapZoom > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        setMapZoom(1);
                        setMapPan({ x: 0, y: 0 });
                      }}
                      title="全体表示に戻す"
                      className="px-2 sm:px-2.5 h-8 sm:h-9 rounded-lg sm:rounded-xl bg-primary text-primary-foreground text-[11px] sm:text-xs font-bold flex items-center gap-1 cursor-pointer active:scale-95 transition-all whitespace-nowrap"
                    >
                      <Maximize2 className="size-3.5 shrink-0" />
                      <span>
                        <span className="hidden sm:inline">{Math.round(mapZoom * 100)}% </span>解除
                      </span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      const nextZ = Math.max(1, Math.round((mapZoom - 0.6) * 10) / 10);
                      setMapZoom(nextZ);
                      if (nextZ <= 1) setMapPan({ x: 0, y: 0 });
                    }}
                    disabled={mapZoom <= 1}
                    title="地図を縮小"
                    className="size-8 sm:size-9.5 rounded-lg sm:rounded-xl bg-secondary/80 hover:bg-secondary disabled:opacity-35 text-foreground flex items-center justify-center cursor-pointer active:scale-95 transition-all shrink-0"
                  >
                    <ZoomOut className="size-5 sm:size-5.5 stroke-[2.2]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setMapZoom((z) => Math.min(3.5, Math.round((z + 0.6) * 10) / 10))}
                    title="地図を拡大"
                    className="size-8 sm:size-9.5 rounded-lg sm:rounded-xl bg-secondary/80 hover:bg-secondary text-foreground flex items-center justify-center cursor-pointer active:scale-95 transition-all shrink-0"
                  >
                    <ZoomIn className="size-5 sm:size-5.5 stroke-[2.2]" />
                  </button>
                </div>
              </div>

              <svg
                ref={boardSvgRef}
                viewBox={boardViewBox}
                preserveAspectRatio="xMidYMid meet"
                className={cn(
                  "w-full h-full block touch-none",
                  mapZoom > 1 ? "cursor-grab active:cursor-grabbing" : "",
                )}
                onPointerDown={(e) => {
                  if (mapZoom <= 1 || dragging) return;
                  boardPanRef.current = {
                    startX: e.clientX,
                    startY: e.clientY,
                    startPanX: mapPan.x,
                    startPanY: mapPan.y,
                    isPanning: false,
                  };
                }}
                onPointerMove={(e) => {
                  if (!boardPanRef.current || dragging) return;
                  const dx = e.clientX - boardPanRef.current.startX;
                  const dy = e.clientY - boardPanRef.current.startY;
                  if (!boardPanRef.current.isPanning && Math.hypot(dx, dy) > 6) {
                    boardPanRef.current.isPanning = true;
                    suppressNextSocketClickRef.current = true;
                  }
                  if (boardPanRef.current.isPanning && boardSvgRef.current) {
                    const rect = boardSvgRef.current.getBoundingClientRect();
                    const scaleX = (BOARD_WIDTH / mapZoom) / Math.max(1, rect.width);
                    const scaleY = (BOARD_HEIGHT / mapZoom) / Math.max(1, rect.height);
                    setMapPan({
                      x: boardPanRef.current.startPanX + dx * scaleX,
                      y: boardPanRef.current.startPanY + dy * scaleY,
                    });
                  }
                }}
                onPointerUp={() => {
                  boardPanRef.current = null;
                }}
                onPointerCancel={() => {
                  boardPanRef.current = null;
                }}
              >
                <defs>
                  <filter id="snapGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="0" stdDeviation="3.5" floodColor="#0284c7" floodOpacity="0.85" />
                  </filter>
                </defs>

                {/* 海背景（既存の平面地図と同じ var(--ocean)） & 経緯線 */}
                <rect width={BOARD_WIDTH} height={BOARD_HEIGHT} fill="var(--ocean)" />
                <path
                  d={graticuleD}
                  fill="none"
                  stroke="rgba(15, 23, 42, 0.08)"
                  strokeWidth={0.7}
                />

                {/* 背景の国ポリゴン & パズルソケット */}
                <g>
                  {backgroundPaths.map((item) => {
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
                          strokeWidth={1.3}
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
                          strokeWidth={isDragNearThis || isHintRadar ? 2.4 : 1.15}
                          strokeDasharray={isDragNearThis ? undefined : "3.5 2"}
                          filter={isDragNearThis ? "url(#snapGlow)" : undefined}
                          className="cursor-pointer transition-colors duration-150 hover:fill-sky-100"
                          onClick={(e) => handleSocketClick(item.iso3, e)}
                        />
                      </g>
                    );
                  })}
                </g>

                {/* 選択中ピースの透明タップ判定アシスト ＆ ヒント・吸着時のエフェクトリング */}
                <g>
                  {pieces.map((p) => {
                    if (placedIso3s.has(p.country.iso3)) return null;
                    const isCurrentActive = activePiece?.country.iso3 === p.country.iso3;
                    const isHintRadar = isCurrentActive && hintLevel >= 2;
                    const isDragNearThis =
                      dragging?.iso3 === p.country.iso3 && dragging.isNearTarget;

                    if (!isCurrentActive && !isHintRadar && !isDragNearThis) return null;

                    return (
                      <g
                        key={`target-ring-${p.country.iso3}`}
                        transform={`translate(${p.targetX}, ${p.targetY})`}
                        className="cursor-pointer"
                        onClick={(e) => handleSocketClick(p.country.iso3, e)}
                      >
                        {/* 選択中のピースのみ、小国でも指でタップしやすい透明ヒット領域を付与 */}
                        <circle
                          r={Math.max(14, 22 / Math.sqrt(mapZoom))}
                          fill="transparent"
                          style={{ pointerEvents: "all" }}
                        />

                        {isHintRadar && (
                          <>
                            <circle
                              r={26 / Math.sqrt(mapZoom)}
                              fill="rgba(245, 158, 11, 0.28)"
                              stroke="#d97706"
                              strokeWidth={2.2}
                              className="animate-ping"
                            />
                            <circle
                              r={15 / Math.sqrt(mapZoom)}
                              fill="rgba(251, 191, 36, 0.48)"
                              stroke="#b45309"
                              strokeWidth={2}
                            />
                          </>
                        )}
                        {isDragNearThis && (
                          <circle
                            r={22 / Math.sqrt(mapZoom)}
                            fill="rgba(14, 165, 233, 0.32)"
                            stroke="#0284c7"
                            strokeWidth={2.2}
                          />
                        )}
                      </g>
                    );
                  })}
                </g>

                {/* 配置完了した国の国名ラベル（国の形を隠さないよう黒い背景ボックスを廃止し、地図帳方式の白フチ文字で描画） */}
                <g className="pointer-events-none">
                  {pieces.map((p) => {
                    if (!placedIso3s.has(p.country.iso3)) return null;
                    const minDim = Math.min(p.width, p.height);
                    const baseFontSize = minDim < 22 ? 6.2 : minDim < 36 ? 7.2 : 8.5;
                    const scaledFontSize = baseFontSize / Math.pow(mapZoom, 0.45);
                    const scaledStroke = 2.4 / Math.pow(mapZoom, 0.45);
                    return (
                      <g
                        key={`label-${p.country.iso3}`}
                        transform={`translate(${p.targetX}, ${p.targetY})`}
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

              {/* 直近に配置した国のスリム通知ピル（地図を隠さないよう1行コンパクト表示） */}
              {lastPlacedCountry && !isCleared && (
                <div className="absolute bottom-1.5 left-1.5 right-1.5 sm:right-auto sm:max-w-md rounded-xl bg-background/95 backdrop-blur-md border border-border px-2.5 py-1.5 text-foreground shadow-md flex items-center justify-between gap-2 animate-in fade-in slide-in-from-bottom-1 duration-200">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <FlagImage flag={lastPlacedCountry.flag} size="sm" />
                    <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 shrink-0">✓</span>
                    <span className="text-xs font-bold truncate">{lastPlacedCountry.nameJa}</span>
                    <span className="text-[11px] text-muted-foreground truncate">
                      （首都: {lastPlacedCountry.basic.capital}）
                    </span>
                  </div>
                  <Link
                    to="/country/$iso3"
                    params={{ iso3: lastPlacedCountry.iso3 }}
                    search={{ from: "puzzle" }}
                    onClick={() => {
                      persistPuzzleSession({
                        stageId,
                        difficulty,
                        blindMode,
                        shuffledIso3s,
                        placedIso3s: Array.from(placedIso3s),
                        selectedIso3,
                        elapsedMs: Date.now() - startTimeRef.current,
                        mistakesCount,
                        hintsUsedCount,
                        combo,
                        lastPlacedIso3: lastPlacedCountry.iso3,
                        isCleared,
                      });
                    }}
                    className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-600 dark:text-sky-300 shrink-0 active:scale-95"
                  >
                    詳細 ↗
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
                        onClick={() => startNewGame(stageId, difficulty)}
                        className="flex-1 rounded-xl font-bold gap-1.5 cursor-pointer"
                      >
                        <RotateCcw className="size-4" />
                        <span>もう一度挑戦</span>
                      </Button>
                      {difficulty === "standard" ? (
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => startNewGame(stageId, "master")}
                          className="flex-1 rounded-xl font-bold gap-1.5 cursor-pointer"
                        >
                          <Zap className="size-4 text-amber-500" />
                          <span>上級 ({stageConfig.masterIso3s.length}ヵ国) へ</span>
                        </Button>
                      ) : (
                        <Link
                          to="/mypage"
                          className="flex-1 inline-flex items-center justify-center rounded-xl bg-secondary px-4 py-2 text-xs font-bold text-foreground hover:bg-secondary/80"
                        >
                          マイページで記録を見る ➜
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 右／下：パズルピース一覧（単独ドックを廃止し、地図と一覧が1画面に収まるスリム設計） */}
          <div className="lg:col-span-4 surface-card p-2.5 sm:p-3.5 flex flex-col gap-2">
            {/* トレイヘッダー（選択中の国情報・ヒントボタン・表示切替を1行に集約） */}
            <div className="flex items-center justify-between gap-1.5 flex-wrap">
              <div className="flex items-center gap-1.5 min-w-0">
                <Target className="size-4 text-sky-500 shrink-0" />
                <h2 className="font-display text-xs sm:text-sm font-bold text-foreground shrink-0">
                  ピース一覧
                </h2>
                <span className="text-[11px] font-bold text-muted-foreground shrink-0">
                  (残り{unplacedPieces.length})
                </span>
                {activePiece && (!blindMode || hintLevel >= 1) && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-500/12 border border-sky-500/30 text-xs font-bold text-foreground truncate">
                    <FlagImage flag={activePiece.country.flag} size="sm" />
                    <span className="truncate">{activePiece.country.nameJa}</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 ml-auto shrink-0">
                {activePiece && (
                  <button
                    type="button"
                    onClick={handleTriggerHint}
                    disabled={hintLevel >= 2}
                    className={cn(
                      "h-7 px-2.5 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer border active:scale-95 transition-all",
                      hintLevel === 0
                        ? "border-amber-500/40 bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25"
                        : hintLevel === 1
                          ? "border-sky-500/40 bg-sky-500/20 text-sky-600 dark:text-sky-300 hover:bg-sky-500/30"
                          : "opacity-50 border-border bg-secondary text-muted-foreground",
                    )}
                  >
                    <Lightbulb className="size-3" />
                    <span>
                      {hintLevel === 0
                        ? "ヒント①(首都)"
                        : hintLevel === 1
                          ? "ヒント②(場所)"
                          : "点滅中"}
                    </span>
                  </button>
                )}

                {/* モバイル・タブレット縦での表示切替ボタン */}
                <div className="flex lg:hidden items-center bg-secondary/60 p-0.5 rounded-lg border border-border/60">
                  <button
                    type="button"
                    onClick={() => setMobileTrayView("dock")}
                    className={cn(
                      "px-2 py-0.5 rounded-md text-[11px] font-bold cursor-pointer transition-all",
                      mobileTrayView === "dock"
                        ? "bg-background text-foreground shadow-2xs"
                        : "text-muted-foreground",
                    )}
                  >
                    横並び
                  </button>
                  <button
                    type="button"
                    onClick={() => setMobileTrayView("grid")}
                    className={cn(
                      "px-2 py-0.5 rounded-md text-[11px] font-bold flex items-center gap-0.5 cursor-pointer transition-all",
                      mobileTrayView === "grid"
                        ? "bg-background text-foreground shadow-2xs"
                        : "text-muted-foreground",
                    )}
                  >
                    <LayoutGrid className="size-3" />
                    <span>一覧</span>
                  </button>
                </div>
              </div>
            </div>

            {/* ヒント発動時の1行コンパクト情報バー */}
            {activePiece && hintLevel >= 1 && (
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 text-[11px] text-amber-700 dark:text-amber-300 font-medium flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <span className="shrink-0">
                  🏛️ 首都: <strong>{activePiece.country.basic.capital}</strong>
                </span>
                <span className="text-muted-foreground truncate">
                  📍 {activePiece.country.geography.borders}
                </span>
              </div>
            )}

            {unplacedPieces.length === 0 ? (
              <div className="py-6 text-center space-y-1.5">
                <Check className="size-7 text-emerald-500 mx-auto" />
                <p className="text-xs font-bold text-foreground">すべてのピースを配置しました！</p>
              </div>
            ) : (
              <div
                className={cn(
                  mobileTrayView === "dock"
                    ? "flex lg:grid lg:grid-cols-3 gap-2 overflow-x-auto lg:overflow-x-visible lg:max-h-[540px] lg:overflow-y-auto pb-1 lg:pb-0 lg:pr-1 snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                    : "grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-3 gap-1.5 max-h-[220px] lg:max-h-[540px] overflow-y-auto pr-1",
                )}
              >
                {unplacedPieces.map((piece) => {
                  const iso3 = piece.country.iso3;
                  const isSelected = activePiece?.country.iso3 === iso3;
                  const isWrong = wrongFeedbackIso3 === iso3;
                  const isBeingDragged = dragging?.iso3 === iso3;

                  return (
                    <div
                      key={iso3}
                      onPointerDown={(e) => {
                        e.currentTarget.releasePointerCapture(e.pointerId);
                        setSelectedIso3(iso3);
                        setHintLevel(0);
                        pendingDragRef.current = {
                          iso3,
                          startX: e.clientX,
                          startY: e.clientY,
                          isTouch: e.pointerType === "touch",
                          fromDockHandle: false,
                        };
                      }}
                      onClick={() => {
                        setSelectedIso3(iso3);
                        setHintLevel(0);
                      }}
                      className={cn(
                        "group relative flex flex-col items-center justify-between rounded-xl border p-1.5 sm:p-2 transition-all cursor-grab active:cursor-grabbing select-none",
                        mobileTrayView === "dock"
                          ? "w-[88px] sm:w-[104px] lg:w-auto shrink-0 snap-start touch-pan-x lg:touch-none"
                          : "touch-none",
                        isBeingDragged && "opacity-35 scale-95",
                        isWrong && "border-destructive bg-destructive/15 animate-bounce",
                        isSelected && !isWrong
                          ? "border-sky-500 bg-sky-500/15 ring-2 ring-sky-400/35 shadow-xs"
                          : "border-border/70 bg-secondary/40 hover:bg-secondary/80 hover:border-border",
                      )}
                    >
                      {/* 国のシルエットSVG（各国の中心経度を真正面に向けた歪みゼロ投影） */}
                      <div className="w-full h-11 sm:h-13 flex items-center justify-center p-0.5">
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

                      {/* 国旗＆国名（達人モード時は隠す） */}
                      <div className="w-full mt-1 pt-1 border-t border-border/50 flex items-center justify-center gap-1 min-w-0">
                        {!blindMode ? (
                          <>
                            <FlagImage flag={piece.country.flag} size="sm" className="shrink-0" />
                            <span className="text-[10px] sm:text-[11px] font-bold text-foreground truncate">
                              {piece.country.nameJa}
                            </span>
                          </>
                        ) : (
                          <span className="text-[10px] font-bold text-muted-foreground">
                            {isSelected ? "地図をタップ" : "選択"}
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

      {/* ドラッグ中にポインターに追従するフローティング・シルエットピース（タッチ時は指の上方に照準表示） */}
      {dragging && draggingPieceData && (
        <div
          className="fixed pointer-events-none z-50 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
          style={{
            left: dragging.clientX,
            top: dragging.clientY + (dragging.isTouch ? TOUCH_DRAG_OFFSET_Y : 0),
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

