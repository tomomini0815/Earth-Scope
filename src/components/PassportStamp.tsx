import { useId } from "react";
import type { Country } from "@/data/types";
import { FlagImage } from "@/components/FlagImage";

interface PassportStampProps {
  country: Country;
  learnedAt?: number | undefined;
  className?: string | undefined;
  size?: ("sm" | "md" | "lg") | undefined;
}

// 添付画像右側のような日付フォーマット（例: 2026 SEP 06）
export function formatStampDate(timestamp?: number | undefined): string {
  const d = timestamp ? new Date(timestamp) : new Date();
  const months = [
    "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
    "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"
  ];
  const year = d.getFullYear();
  const month = months[d.getMonth()] ?? "JAN";
  const day = String(d.getDate()).padStart(2, "0");
  return `${year} ${month} ${day}`;
}

// 国コードから手押しスタンプ特有のわずかな傾き角度（-3deg 〜 +3deg）を決定
function getStampRotation(iso3: string): number {
  let hash = 0;
  for (let i = 0; i < iso3.length; i++) {
    hash = (hash << 5) - hash + iso3.charCodeAt(i);
  }
  const angles = [-3.5, -2, -1, 1.5, 2.5, 3];
  return angles[Math.abs(hash) % angles.length] ?? 1.5;
}

// 大陸や国ごとにリアルなスタンプインク色（鮮明なシアンブルー、インディゴ、バイオレット、レッド等）
function getStampColor(continent: string): {
  stroke: string;
  text: string;
  lightBg: string;
} {
  switch (continent) {
    case "asia":
      // 画像右側の韓国スタンプ風シアンブルー
      return { stroke: "#0284c7", text: "#0369a1", lightBg: "rgba(2, 132, 199, 0.04)" };
    case "europe":
      // ロイヤルブルー
      return { stroke: "#2563eb", text: "#1d4ed8", lightBg: "rgba(37, 99, 235, 0.04)" };
    case "africa":
      // クリムゾンレッド
      return { stroke: "#e11d48", text: "#be123c", lightBg: "rgba(225, 29, 72, 0.04)" };
    case "americas":
      // バイオレット
      return { stroke: "#7c3aed", text: "#6d28d9", lightBg: "rgba(124, 58, 237, 0.04)" };
    case "oceania":
    default:
      // エメラルド・ティール
      return { stroke: "#0d9488", text: "#0f766e", lightBg: "rgba(13, 148, 136, 0.04)" };
  }
}

export function PassportStamp({
  country,
  learnedAt,
  className = "",
  size = "md",
}: PassportStampProps) {
  const pathIdTop = useId();
  const pathIdBottom = useId();

  const rotation = getStampRotation(country.iso3);
  const color = getStampColor(country.continent);
  const dateStr = formatStampDate(learnedAt);

  // 上部円弧テキスト
  const topText = `${country.nameEn.toUpperCase()} IMMIGRATION`;
  // 下部円弧テキスト
  const bottomText = `OFFICIAL ENTRY · ${country.iso3}`;

  const sizePx = size === "sm" ? 130 : size === "lg" ? 170 : 150;

  return (
    <div
      className={`relative inline-flex flex-col items-center justify-center select-none transition-transform duration-300 hover:scale-105 ${className}`}
      style={{
        transform: `rotate(${rotation}deg)`,
      }}
      title={`${country.nameJa} 入国スタンプ (${dateStr})`}
    >
      <svg
        width={sizePx}
        height={sizePx}
        viewBox="0 0 200 200"
        className="overflow-visible drop-shadow-xs"
        style={{ color: color.stroke }}
      >
        <defs>
          {/* 上部円弧パス (時計回り) */}
          <path
            id={pathIdTop}
            d="M 28 100 A 72 72 0 0 1 172 100"
            fill="none"
          />
          {/* 下部円弧パス (反時計回り または 左右反転で正読) */}
          <path
            id={pathIdBottom}
            d="M 172 100 A 72 72 0 0 1 28 100"
            fill="none"
          />
          {/* かすれ風インク用フィルター */}
          <filter id="inkFilter" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.5" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>

        {/* 背景のうっすらインク感 */}
        <circle cx="100" cy="100" r="92" fill={color.lightBg} />

        {/* 外側の円枠 */}
        <circle
          cx="100"
          cy="100"
          r="92"
          fill="none"
          stroke={color.stroke}
          strokeWidth="2.8"
          strokeDasharray="9 2.5 4 2.5"
          opacity="0.9"
        />

        {/* 内側の細い円枠 */}
        <circle
          cx="100"
          cy="100"
          r="83"
          fill="none"
          stroke={color.stroke}
          strokeWidth="1.2"
          opacity="0.85"
        />

        {/* 右上の飛行機アイコン（参考画像右側を再現） */}
        <g transform="translate(152, 38) rotate(32)">
          <path
            d="M 0 0 L 12 -2 L 15 4 L 4 6 L 5 12 L 1 11 L -1 7 L -7 8 L -6 4 L -1 4 Z"
            fill={color.stroke}
            opacity="0.9"
          />
        </g>

        {/* 上部円弧テキスト */}
        <text
          fill={color.stroke}
          fontSize="9.5"
          fontWeight="800"
          letterSpacing="2.5"
          fontFamily="monospace, sans-serif"
          opacity="0.95"
        >
          <textPath href={`#${pathIdTop}`} startOffset="50%" textAnchor="middle">
            {topText}
          </textPath>
        </text>

        {/* 中央コンテンツ */}
        <g transform="translate(100, 72)" textAnchor="middle">
          {/* 国名（日本語） */}
          <text
            y="0"
            fill={color.stroke}
            fontSize="14"
            fontWeight="900"
            fontFamily="'Noto Sans JP', 'M PLUS Rounded 1c', sans-serif"
            letterSpacing="1"
          >
            {country.nameJa}
          </text>

          {/* ADMITTED（入国許可） */}
          <text
            y="14"
            fill={color.stroke}
            fontSize="8.5"
            fontWeight="800"
            letterSpacing="3"
            fontFamily="monospace, sans-serif"
            opacity="0.85"
          >
            ADMITTED
          </text>
        </g>

        {/* 中央の日付スタンプ印（画像右側の中核部分: 太字等幅日付） */}
        <g transform="translate(100, 107)" textAnchor="middle">
          <rect
            x="-60"
            y="-12"
            width="120"
            height="18"
            fill={color.stroke}
            fillOpacity="0.08"
            rx="3"
          />
          <text
            y="1"
            fill={color.stroke}
            fontSize="13"
            fontWeight="900"
            fontFamily="'Courier New', Courier, monospace"
            letterSpacing="1.5"
          >
            {dateStr}
          </text>
        </g>

        {/* 中央下部: 空港 / ポート名 */}
        <g transform="translate(100, 127)" textAnchor="middle">
          <text
            y="0"
            fill={color.stroke}
            fontSize="8"
            fontWeight="700"
            letterSpacing="1.5"
            fontFamily="monospace, sans-serif"
            opacity="0.8"
          >
            {country.basic.capital.toUpperCase()} AIRPORT
          </text>
          <text
            y="9"
            fill={color.stroke}
            fontSize="7"
            fontWeight="700"
            letterSpacing="2"
            fontFamily="monospace, sans-serif"
            opacity="0.7"
          >
            PORT NO. {country.iso3}
          </text>
        </g>

        {/* 下部円弧テキスト */}
        <text
          fill={color.stroke}
          fontSize="8"
          fontWeight="700"
          letterSpacing="2.5"
          fontFamily="monospace, sans-serif"
          opacity="0.85"
        >
          <textPath href={`#${pathIdBottom}`} startOffset="50%" textAnchor="middle">
            {bottomText}
          </textPath>
        </text>
      </svg>
    </div>
  );
}
