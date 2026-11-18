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
  Check,
  Clock,
  Compass,
  Eye,
  EyeOff,
  Flame,
  HelpCircle,
  Lightbulb,
  MapPin,
  Puzzle,
  RotateCcw,
  Sparkles,
  Star,
  Target,
  Trophy,
  Volume2,
  VolumeX,
  Zap,
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
const SNAP_BASE_RADIUS = 44;

type StageId = ContinentId | "world";
type Difficulty = "standard" | "master";

type StageConfig = {
  id: StageId;
  label: string;
  sublabel: string;
  icon: string;
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
    id: "asia",
    label: "アジア州",
    sublabel: "東アジア・東南アジア・南アジア・西アジア",
    icon: "🏯",
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
    icon: "🏰",
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
    icon: "🦁",
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
    icon: "🗽",
    accentColor: "text-emerald-500",
    pieceFill: "#10b981",
    pieceStroke: "#6ee7b7",
    bbox: [-162, 7, -54, 70],
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
    icon: "⛰️",
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
    icon: "🦘",
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
  {
    id: "world",
    label: "世界主要国",
    sublabel: "世界6大陸の代表的国家オールスター",
    icon: "🌍",
    accentColor: "text-indigo-500",
    pieceFill: "#6366f1",
    pieceStroke: "#a5b4fc",
    bbox: [-165, -54, 175, 72],
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
  targetX: number;
  targetY: number;
  bounds: [[number, number], [number, number]];
  width: number;
  height: number;
  viewBox: string;
};

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
  const initialList = createShuffledList("europe", "standard");
  const fresh: SavedPuzzleSession = {
    stageId: "europe",
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

  // ドラッグ中の状態
  const [dragging, setDragging] = useState<{
    iso3: string;
    clientX: number;
    clientY: number;
    isNearTarget: boolean;
  } | null>(null);

  const boardSvgRef = useRef<SVGSVGElement | null>(null);
  const startTimeRef = useRef<number>(Date.now() - initialSession.elapsedMs);

  const { markLearned, puzzleRecords = {}, recordPuzzleClear } = useProgress();

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

    const projection = geoNaturalEarth1().fitExtent(
      [
        [32, 28],
        [BOARD_WIDTH - 32, BOARD_HEIGHT - 28],
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
      isTarget: boolean;
    }[] = [];

    const generatedPieces: PuzzlePieceData[] = [];
    const mapByIso3 = new Map<string, PuzzlePieceData>();

    for (const f of ALL_FEATURES) {
      const mapId = getFeatureMapId(f);
      if (!mapId || mapId === "010") continue; // 南極は除外
      const d = pathGen(f as never) ?? "";
      if (!d) continue;

      const country = byMapId(mapId);
      const isTarget = !!country && targetIso3Set.has(country.iso3);

      bgPaths.push({
        mapId,
        iso3: country?.iso3,
        nameJa: country?.nameJa,
        d,
        isTarget,
      });

      if (country && isTarget) {
        const { pieceFeature, mainCenterLonLat } = getPieceFeatureAndCenter(f);
        const piecePathD = pathGen(pieceFeature as never) ?? d;
        const rawBounds = pathGen.bounds(pieceFeature as never);
        const projectedCenter = projection(mainCenterLonLat);

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
  const checkIsSnapMatch = (piece: PuzzlePieceData, svgX: number, svgY: number): boolean => {
    const dist = Math.hypot(svgX - piece.targetX, svgY - piece.targetY);
    if (dist <= SNAP_BASE_RADIUS) return true;

    // 面積が大きい国（ロシア・中国・カナダ・アメリカ・ブラジル・オーストラリアなど）はバウンディングボックス内でも許容
    const [[x0, y0], [x1, y1]] = piece.bounds;
    const pad = 14;
    if (svgX >= x0 - pad && svgX <= x1 + pad && svgY >= y0 - pad && svgY <= y1 + pad) {
      const maxAllowedDist = Math.max(SNAP_BASE_RADIUS, Math.max(piece.width, piece.height) * 0.52);
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

    // 学習済みに自動登録
    markLearned(iso3);

    // 全ピース完了チェック
    if (nextPlaced.size >= pieces.length && pieces.length > 0) {
      const finalMs = Date.now() - startTimeRef.current;
      const finalSec = Math.round(finalMs / 100) / 10;
      setElapsedMs(finalMs);
      setIsCleared(true);
      setIsRunning(false);
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

  // ドラッグ操作イベント（windowレベルで追跡）
  useEffect(() => {
    if (!dragging) return;

    const handlePointerMove = (e: PointerEvent) => {
      const piece = pieceByIso3.get(dragging.iso3);
      let isNear = false;
      if (piece) {
        const svgPt = clientToSvgPoint(e.clientX, e.clientY);
        if (svgPt) {
          isNear = checkIsSnapMatch(piece, svgPt.x, svgPt.y);
        }
      }
      setDragging({
        iso3: dragging.iso3,
        clientX: e.clientX,
        clientY: e.clientY,
        isNearTarget: isNear,
      });
    };

    const handlePointerUp = (e: PointerEvent) => {
      const piece = pieceByIso3.get(dragging.iso3);
      if (piece) {
        const svgPt = clientToSvgPoint(e.clientX, e.clientY);
        if (svgPt && checkIsSnapMatch(piece, svgPt.x, svgPt.y)) {
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
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging, pieceByIso3, placedIso3s, soundEnabled]);

  // 地図上のソケットをクリック／タップして配置（スマホ・タブレット・クリック操作サポート）
  const handleSocketClick = (targetIso3: string | undefined, e: React.MouseEvent<SVGPathElement>) => {
    if (!activePiece || isCleared) return;
    e.stopPropagation();

    if (targetIso3 === activePiece.country.iso3) {
      confirmPiecePlacement(activePiece);
      return;
    }

    // クリックした座標がactivePieceの許容範囲内かもチェック
    const svgPt = clientToSvgPoint(e.clientX, e.clientY);
    if (svgPt && checkIsSnapMatch(activePiece, svgPt.x, svgPt.y)) {
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

  // ヒントボタン押下
  const handleTriggerHint = () => {
    if (!activePiece || isCleared) return;
    const nextLevel = hintLevel === 0 ? 1 : 2;
    setHintLevel(nextLevel);
    setHintsUsedCount((h) => h + 1);
    playPuzzleSound("hint", soundEnabled);
  };

  const progressPct = pieces.length > 0 ? Math.round((placedIso3s.size / pieces.length) * 100) : 0;
  const draggingPieceData = dragging ? pieceByIso3.get(dragging.iso3) : null;

  return (
    <div className="min-h-screen pb-20 sm:pb-12 select-none overflow-x-hidden">
      <SiteHeader />

      <main className="mx-auto max-w-[1600px] px-3 sm:px-6 lg:px-8 pt-3 sm:pt-5 space-y-4">
        {/* 1. ステージ＆難易度セレクターバー */}
        <section className="surface-card p-3 sm:p-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* 大陸ステージタブ */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 no-scrollbar">
              {STAGE_CONFIGS.map((s) => {
                const active = s.id === stageId;
                const recStd = puzzleRecords[`${s.id}-standard`];
                const recMst = puzzleRecords[`${s.id}-master`];
                const hasClear = !!recStd || !!recMst;
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
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer border",
                      active
                        ? "bg-primary text-primary-foreground border-primary shadow-sm scale-[1.02]"
                        : "bg-secondary/50 text-muted-foreground border-border/60 hover:bg-secondary hover:text-foreground",
                    )}
                  >
                    <span className="text-sm">{s.icon}</span>
                    <span>{s.label}</span>
                    {hasClear && (
                      <span
                        className={cn(
                          "ml-0.5 text-[10px] px-1 rounded-full font-black",
                          active ? "bg-white/20 text-white" : "bg-amber-500/15 text-amber-500",
                        )}
                      >
                        ★
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* 難易度・達人モード・サウンド・リセット */}
            <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2">
              <div className="inline-flex rounded-xl bg-secondary/70 p-0.5 border border-border/60">
                <button
                  type="button"
                  onClick={() => {
                    if (difficulty !== "standard") {
                      startNewGame(stageId, "standard");
                    }
                  }}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                    difficulty === "standard"
                      ? "bg-background text-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  標準 ({stageConfig.standardIso3s.length}ヵ国)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (difficulty !== "master") {
                      startNewGame(stageId, "master");
                    }
                  }}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                    difficulty === "master"
                      ? "bg-background text-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  上級 ({stageConfig.masterIso3s.length}ヵ国)
                </button>
              </div>

              <button
                type="button"
                onClick={() => setBlindMode((b) => !b)}
                title="シルエットのみ表示（国名と国旗を隠す達人モード）"
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer",
                  blindMode
                    ? "bg-purple-500/15 text-purple-400 border-purple-500/40"
                    : "bg-secondary/50 text-muted-foreground border-border/60 hover:text-foreground",
                )}
              >
                {blindMode ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                <span>{blindMode ? "シルエット達人" : "国名・国旗あり"}</span>
              </button>

              <button
                type="button"
                onClick={() => setSoundEnabled((s) => !s)}
                title="効果音のON/OFF"
                className="p-1.5 rounded-xl border border-border/60 bg-secondary/50 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                {soundEnabled ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
              </button>

              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => startNewGame(stageId, difficulty)}
                className="h-8 rounded-xl text-xs gap-1 cursor-pointer"
              >
                <RotateCcw className="size-3.5" />
                <span>やり直す</span>
              </Button>
            </div>
          </div>
        </section>

        {/* 2. ステータス＆ヒントバー */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
          {/* 左：進行度・タイマー・ベストタイム */}
          <div className="lg:col-span-5 surface-card px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="size-10 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-500 shrink-0">
                <Puzzle className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-foreground truncate">
                    {stageConfig.label} パズル進捗
                  </span>
                  <span className="font-black tabular-nums text-sky-500">
                    {placedIso3s.size} / {pieces.length} ピース ({progressPct}%)
                  </span>
                </div>
                <Progress value={progressPct} className="h-2" />
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 border-l border-border/60 pl-3">
              <div className="text-right">
                <div className="flex items-center justify-end gap-1 text-[10px] font-bold text-muted-foreground">
                  <Clock className="size-3 text-sky-400" />
                  <span>タイム</span>
                </div>
                <p className="font-mono text-base sm:text-lg font-black tabular-nums text-foreground leading-tight">
                  {formatStopwatch(elapsedMs)}
                </p>
                {currentBestRecord && (
                  <p className="text-[10px] font-bold text-amber-500 tabular-nums">
                    自己ベスト: {formatBestTime(currentBestRecord.bestTimeSec)}
                  </p>
                )}
              </div>

              {combo >= 2 && (
                <div className="px-2 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-500 flex flex-col items-center animate-bounce">
                  <Flame className="size-3.5" />
                  <span className="text-[10px] font-black">{combo}連続!</span>
                </div>
              )}
            </div>
          </div>

          {/* 右：現在選択中のピース＆2段階ヒントパネル */}
          <div className="lg:col-span-7 surface-card px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            {activePiece ? (
              <>
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="size-11 rounded-2xl bg-secondary/80 border border-border/60 flex items-center justify-center p-1.5 shrink-0">
                    <svg viewBox={activePiece.viewBox} className="size-full overflow-visible">
                      <path
                        d={activePiece.piecePathD}
                        fill={stageConfig.pieceFill}
                        stroke={stageConfig.pieceStroke}
                        strokeWidth={1.5}
                         vectorEffect="non-scaling-stroke"
                      />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/30">
                        選択中のピース
                      </span>
                      {(!blindMode || hintLevel >= 1) ? (
                        <div className="flex items-center gap-1.5">
                          <FlagImage flag={activePiece.country.flag} size="sm" />
                          <span className="text-sm font-black text-foreground">
                            {activePiece.country.nameJa}
                          </span>
                          <span className="text-xs text-muted-foreground hidden md:inline">
                            ({activePiece.country.nameEn})
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm font-bold text-purple-400">
                          ？？？国（シルエット達人モード）
                        </span>
                      )}
                    </div>

                    {/* ヒント表示エリア */}
                    {hintLevel >= 1 ? (
                      <div className="mt-1 text-xs text-amber-400 font-medium flex flex-wrap items-center gap-x-3 gap-y-0.5">
                        <span>🏛️ 首都: <strong>{activePiece.country.basic.capital}</strong></span>
                        <span className="text-muted-foreground truncate max-w-md">
                          📍 {activePiece.country.geography.borders}
                        </span>
                        {hintLevel >= 2 && (
                          <span className="text-sky-400 font-bold">
                            ✨ 地図上のターゲット位置が点滅しています！
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        下のトレイからピースを地図へドラッグするか、地図上の正しい位置をタップして配置しましょう
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={handleTriggerHint}
                    disabled={hintLevel >= 2}
                    className={cn(
                      "h-8 rounded-xl text-xs font-bold gap-1.5 cursor-pointer border",
                      hintLevel === 0
                        ? "border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                        : hintLevel === 1
                          ? "border-sky-500/40 bg-sky-500/15 text-sky-400 hover:bg-sky-500/25"
                          : "opacity-50",
                    )}
                  >
                    <Lightbulb className="size-3.5" />
                    <span>
                      {hintLevel === 0
                        ? "ヒント① (首都・特徴)"
                        : hintLevel === 1
                          ? "ヒント② (場所を点滅)"
                          : "場所ハイライト中"}
                    </span>
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <Trophy className="size-5" />
                  <span>ステージ完全制覇！すべてのピースが美しい世界地図に収まりました！</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 3. メイン領域：左/上に白地図パズルボード、右/下にジグソーピース・トレイ */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
          {/* 白地図パズルボード */}
          <div className="xl:col-span-8 surface-card p-2 sm:p-3 relative overflow-hidden">
            <div className="relative w-full aspect-[900/520] rounded-2xl overflow-hidden bg-slate-950 border border-slate-800/80 shadow-inner">
              <svg
                ref={boardSvgRef}
                viewBox={`0 0 ${BOARD_WIDTH} ${BOARD_HEIGHT}`}
                className="w-full h-full block touch-none"
              >
                <defs>
                  <radialGradient id="puzzleOceanGrad" cx="50%" cy="45%" r="65%">
                    <stop offset="0%" stopColor="#0f172a" />
                    <stop offset="100%" stopColor="#020617" />
                  </radialGradient>
                  <filter id="snapGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#38bdf8" floodOpacity="0.85" />
                  </filter>
                </defs>

                {/* 海背景 & 経緯線 */}
                <rect width={BOARD_WIDTH} height={BOARD_HEIGHT} fill="url(#puzzleOceanGrad)" />
                <path
                  d={graticuleD}
                  fill="none"
                  stroke="rgba(148, 163, 184, 0.08)"
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
                      // パズル対象外の周辺国（大陸の文脈がわかるよう控えめに描画）
                      return (
                        <path
                          key={item.mapId}
                          d={item.d}
                          fill="rgba(30, 41, 59, 0.45)"
                          stroke="rgba(71, 85, 105, 0.35)"
                          strokeWidth={0.6}
                        />
                      );
                    }

                    if (isPlaced) {
                      // 配置完了したパズルピース
                      return (
                        <path
                          key={item.mapId}
                          d={item.d}
                          fill={stageConfig.pieceFill}
                          fillOpacity={0.85}
                          stroke="#ffffff"
                          strokeWidth={1.2}
                          className="transition-all duration-300 cursor-pointer hover:brightness-110"
                          onClick={() => {
                            if (item.iso3) {
                              const c = byIso3(item.iso3);
                              if (c) setLastPlacedCountry(c);
                            }
                          }}
                        />
                      );
                    }

                    // 未配置のパズルソケット（くぼみ枠）
                    return (
                      <path
                        key={item.mapId}
                        d={item.d}
                        fill={
                          isDragNearThis
                            ? "rgba(56, 189, 248, 0.45)"
                            : isHintRadar
                              ? "rgba(251, 191, 36, 0.32)"
                              : "rgba(15, 23, 42, 0.88)"
                        }
                        stroke={
                          isDragNearThis
                            ? "#38bdf8"
                            : isHintRadar
                              ? "#fbbf24"
                              : "rgba(148, 163, 184, 0.48)"
                        }
                        strokeWidth={isDragNearThis || isHintRadar ? 2.2 : 1.0}
                        strokeDasharray={isDragNearThis ? undefined : "3 2"}
                        filter={isDragNearThis ? "url(#snapGlow)" : undefined}
                        className="cursor-pointer transition-colors duration-150 hover:fill-slate-800/90"
                        onClick={(e) => handleSocketClick(item.iso3, e)}
                      />
                    );
                  })}
                </g>

                {/* 小さい国でもタップしやすい補助ターゲットリング（未配置ピース） */}
                <g>
                  {pieces.map((p) => {
                    if (placedIso3s.has(p.country.iso3)) return null;
                    const isSmall = p.width < 22 && p.height < 22;
                    const isHintRadar =
                      activePiece?.country.iso3 === p.country.iso3 && hintLevel >= 2;
                    const isDragNearThis =
                      dragging?.iso3 === p.country.iso3 && dragging.isNearTarget;

                    if (!isSmall && !isHintRadar && !isDragNearThis) return null;

                    return (
                      <g
                        key={`target-ring-${p.country.iso3}`}
                        transform={`translate(${p.targetX}, ${p.targetY})`}
                        className="cursor-pointer"
                        onClick={(e) =>
                          handleSocketClick(
                            p.country.iso3,
                            e as unknown as React.MouseEvent<SVGPathElement>,
                          )
                        }
                      >
                        {isHintRadar && (
                          <>
                            <circle
                              r={26}
                              fill="rgba(251, 191, 36, 0.2)"
                              stroke="#fbbf24"
                              strokeWidth={2}
                              className="animate-ping"
                            />
                            <circle
                              r={16}
                              fill="rgba(251, 191, 36, 0.35)"
                              stroke="#fde68a"
                              strokeWidth={2}
                            />
                          </>
                        )}
                        {isDragNearThis && (
                          <circle
                            r={22}
                            fill="rgba(56, 189, 248, 0.3)"
                            stroke="#38bdf8"
                            strokeWidth={2.5}
                          />
                        )}
                        {isSmall && !isHintRadar && (
                          <circle
                            r={9}
                            fill="rgba(30, 41, 59, 0.75)"
                            stroke="rgba(148, 163, 184, 0.65)"
                            strokeWidth={1}
                            strokeDasharray="2 2"
                          />
                        )}
                      </g>
                    );
                  })}
                </g>

                {/* 配置完了した国の国名ラベル */}
                <g className="pointer-events-none">
                  {pieces.map((p) => {
                    if (!placedIso3s.has(p.country.iso3)) return null;
                    return (
                      <g
                        key={`label-${p.country.iso3}`}
                        transform={`translate(${p.targetX}, ${p.targetY})`}
                      >
                        <rect
                          x={-28}
                          y={-9}
                          width={56}
                          height={18}
                          rx={6}
                          fill="rgba(2, 6, 23, 0.82)"
                          stroke="rgba(255, 255, 255, 0.35)"
                          strokeWidth={0.7}
                        />
                        <text
                          textAnchor="middle"
                          dominantBaseline="central"
                          fill="#f8fafc"
                          fontSize={8.5}
                          fontWeight="bold"
                        >
                          {p.country.nameJa.slice(0, 6)}
                        </text>
                      </g>
                    );
                  })}
                </g>
              </svg>

              {/* 直近に配置した国のミニ学習バナー（ボード左下に表示） */}
              {lastPlacedCountry && !isCleared && (
                <div className="absolute bottom-2.5 left-2.5 right-2.5 sm:right-auto sm:max-w-sm rounded-2xl bg-slate-900/92 backdrop-blur-md border border-white/15 px-3.5 py-2.5 text-white shadow-xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FlagImage flag={lastPlacedCountry.flag} size="sm" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-emerald-400">ナイス配置！</span>
                        <span className="text-xs font-bold truncate">{lastPlacedCountry.nameJa}</span>
                      </div>
                      <p className="text-[11px] text-slate-300 truncate">
                        首都: {lastPlacedCountry.basic.capital} ／{" "}
                        {lastPlacedCountry.examPoints[0]?.a ?? lastPlacedCountry.geography.climate}
                      </p>
                    </div>
                  </div>
                  <Link
                    to="/country/$iso3"
                    params={{ iso3: lastPlacedCountry.iso3 }}
                    search={{ from: "puzzle" }}
                    onClick={() => {
                      try {
                        sessionStorage.setItem(
                          "earthscope-puzzle-session",
                          JSON.stringify({
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
                          }),
                        );
                      } catch {
                        // ignore
                      }
                    }}
                    className="text-[10px] font-bold px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-sky-300 shrink-0"
                  >
                    詳細 ↗
                  </Link>
                </div>
              )}

              {/* クリア祝福オーバーレイ */}
              {isCleared && (
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-20 animate-in fade-in duration-300">
                  <div className="max-w-md w-full rounded-3xl bg-card border border-border p-6 text-center shadow-2xl space-y-4">
                    <div className="mx-auto size-16 rounded-3xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg">
                      <Trophy className="size-9" />
                    </div>

                    <div>
                      {isNewRecord && (
                        <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-black bg-amber-500 text-slate-950 mb-1.5">
                          <Sparkles className="size-3.5" /> NEW RECORD! 自己ベスト更新
                        </span>
                      )}
                      <h2 className="font-display text-2xl font-black text-foreground">
                        {stageConfig.label} パズル制覇！
                      </h2>
                      <p className="text-xs text-muted-foreground mt-1">
                        全 {pieces.length} ヵ国のピースをすべて正しい位置に収めました！
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-2 rounded-2xl bg-secondary/60 p-3 border border-border/60">
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground">クリアタイム</p>
                        <p className="font-mono text-base font-black text-sky-400">
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
                        <p className="text-base font-black text-amber-400">
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
                          <Zap className="size-4 text-amber-400" />
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

          {/* 右／下：ジグソーピース・トレイ */}
          <div className="xl:col-span-4 surface-card p-3 sm:p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="size-4 text-sky-400" />
                <h2 className="font-display text-sm font-bold text-foreground">
                  パズルピース・トレイ
                </h2>
              </div>
              <span className="text-xs font-bold text-muted-foreground">
                残り {unplacedPieces.length} ピース
              </span>
            </div>

            {unplacedPieces.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <Check className="size-8 text-emerald-400 mx-auto" />
                <p className="text-sm font-bold text-foreground">すべてのピースを配置しました！</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 xl:grid-cols-3 gap-2 max-h-[380px] xl:max-h-[460px] overflow-y-auto pr-1">
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
                        setDragging({
                          iso3,
                          clientX: e.clientX,
                          clientY: e.clientY,
                          isNearTarget: false,
                        });
                      }}
                      onClick={() => {
                        setSelectedIso3(iso3);
                        setHintLevel(0);
                      }}
                      className={cn(
                        "group relative flex flex-col items-center justify-between rounded-2xl border p-2.5 transition-all cursor-grab active:cursor-grabbing touch-none select-none",
                        isBeingDragged && "opacity-35 scale-95",
                        isWrong && "border-destructive bg-destructive/15 animate-bounce",
                        isSelected && !isWrong
                          ? "border-sky-400 bg-sky-500/12 ring-2 ring-sky-400/30 shadow-md"
                          : "border-border/70 bg-secondary/40 hover:bg-secondary/80 hover:border-border",
                      )}
                    >
                      {/* 国のシルエットSVG */}
                      <div className="w-full h-14 sm:h-16 flex items-center justify-center p-1">
                        <svg
                          viewBox={piece.viewBox}
                          className="w-full h-full overflow-visible drop-shadow-md transition-transform group-hover:scale-105"
                        >
                          <path
                            d={piece.piecePathD}
                            fill={stageConfig.pieceFill}
                            stroke={stageConfig.pieceStroke}
                            strokeWidth={1.5}
                            vectorEffect="non-scaling-stroke"
                          />
                        </svg>
                      </div>

                      {/* 国旗＆国名（達人モード時は隠す） */}
                      <div className="w-full mt-1.5 pt-1.5 border-t border-border/50 flex items-center justify-center gap-1 min-w-0">
                        {!blindMode ? (
                          <>
                            <FlagImage flag={piece.country.flag} size="sm" className="shrink-0" />
                            <span className="text-[11px] font-bold text-foreground truncate">
                              {piece.country.nameJa}
                            </span>
                          </>
                        ) : (
                          <span className="text-[10px] font-bold text-muted-foreground">
                            ドラッグして配置
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 操作ガイド */}
            <div className="rounded-xl bg-secondary/40 border border-border/50 p-2.5 text-[11px] text-muted-foreground space-y-1">
              <p className="font-bold text-foreground flex items-center gap-1">
                <Compass className="size-3.5 text-sky-400" />
                <span>パズルの遊び方（2通り対応）</span>
              </p>
              <p>① ピースを直接地図の枠へ<strong>ドラッグ＆ドロップ</strong>してピタッと吸着</p>
              <p>② トレイのピースをタップして選択後、<strong>地図上の枠をタップ</strong>して配置</p>
            </div>
          </div>
        </div>
      </main>

      {/* ドラッグ中にポインターに追従するフローティング・シルエットピース */}
      {dragging && draggingPieceData && (
        <div
          className="fixed pointer-events-none z-50 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
          style={{
            left: dragging.clientX,
            top: dragging.clientY,
          }}
        >
          <div
            className={cn(
              "size-24 sm:size-28 flex items-center justify-center transition-transform duration-100",
              dragging.isNearTarget ? "scale-115 drop-shadow-[0_0_16px_rgba(56,189,248,0.95)]" : "drop-shadow-2xl",
            )}
          >
            <svg viewBox={draggingPieceData.viewBox} className="w-full h-full overflow-visible">
              <path
                d={draggingPieceData.piecePathD}
                fill={dragging.isNearTarget ? "#38bdf8" : stageConfig.pieceFill}
                fillOpacity={0.92}
                stroke="#ffffff"
                strokeWidth={2}
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          </div>
          {!blindMode && (
            <div className="mt-1 px-2.5 py-0.5 rounded-full bg-slate-950/90 border border-white/20 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg">
              <FlagImage flag={draggingPieceData.country.flag} size="sm" />
              <span>{draggingPieceData.country.nameJa}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

