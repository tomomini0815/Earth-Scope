import React from "react";

// 1. エメラルド（エメラルドカット / 八角形翠玉）
export function EmeraldGem({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className}>
      <defs>
        <linearGradient id="em-grad-main" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="50%" stopColor="#059669" />
          <stop offset="100%" stopColor="#064e3b" />
        </linearGradient>
        <linearGradient id="em-grad-top" x1="10" y1="10" x2="30" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#a7f3d0" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
      </defs>
      <polygon points="12,4 28,4 36,12 36,28 28,36 12,36 4,28 4,12" fill="url(#em-grad-main)" stroke="#065f46" strokeWidth="1.2" strokeLinejoin="round" />
      <polygon points="14,10 26,10 30,14 30,26 26,30 14,30 10,26 10,14" fill="url(#em-grad-top)" stroke="#047857" strokeWidth="1" strokeLinejoin="round" />
      <line x1="12" y1="4" x2="14" y2="10" stroke="#d1fae5" strokeWidth="1" />
      <line x1="28" y1="4" x2="26" y2="10" stroke="#047857" strokeWidth="1" />
      <line x1="36" y1="12" x2="30" y2="14" stroke="#065f46" strokeWidth="1" />
      <line x1="36" y1="28" x2="30" y2="26" stroke="#065f46" strokeWidth="1" />
      <line x1="28" y1="36" x2="26" y2="30" stroke="#047857" strokeWidth="1" />
      <line x1="12" y1="36" x2="14" y2="30" stroke="#047857" strokeWidth="1" />
      <line x1="4" y1="28" x2="10" y2="26" stroke="#34d399" strokeWidth="1" />
      <line x1="4" y1="12" x2="10" y2="14" stroke="#a7f3d0" strokeWidth="1" />
      <polygon points="16,12 24,12 22,18 14,18" fill="#ffffff" fillOpacity="0.5" />
    </svg>
  );
}

// 2. サファイア（ラウンドブリリアントカット）
export function SapphireGem({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className}>
      <defs>
        <linearGradient id="sap-main" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="50%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#1e3a8a" />
        </linearGradient>
      </defs>
      <circle cx="20" cy="20" r="16" fill="url(#sap-main)" stroke="#1e40af" strokeWidth="1.2" />
      <polygon points="20,7 29,13 32,23 26,31 14,31 8,23 11,13" fill="#1d4ed8" fillOpacity="0.5" stroke="#60a5fa" strokeWidth="0.8" />
      <polygon points="20,11 25,14 27,20 24,25 16,25 13,20 15,14" fill="#60a5fa" fillOpacity="0.75" stroke="#bfdbfe" strokeWidth="0.8" />
      <polygon points="17,13 22,13 20,19 15,17" fill="#ffffff" fillOpacity="0.6" />
      <line x1="20" y1="4" x2="20" y2="11" stroke="#93c5fd" strokeWidth="0.8" />
      <line x1="31" y1="9" x2="25" y2="14" stroke="#93c5fd" strokeWidth="0.8" />
      <line x1="36" y1="20" x2="27" y2="20" stroke="#60a5fa" strokeWidth="0.8" />
      <line x1="9" y1="9" x2="15" y2="14" stroke="#dbeafe" strokeWidth="0.8" />
      <line x1="4" y1="20" x2="13" y2="20" stroke="#93c5fd" strokeWidth="0.8" />
    </svg>
  );
}

// 3. アメジスト（プリンセスカット / 菱形クリスタル）
export function AmethystGem({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className}>
      <defs>
        <linearGradient id="am-main" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#e879f9" />
          <stop offset="50%" stopColor="#9333ea" />
          <stop offset="100%" stopColor="#4c1d95" />
        </linearGradient>
      </defs>
      <polygon points="20,4 36,20 20,36 4,20" fill="url(#am-main)" stroke="#581c87" strokeWidth="1.2" strokeLinejoin="round" />
      <polygon points="20,10 30,20 20,30 10,20" fill="#a855f7" fillOpacity="0.8" stroke="#d8b4fe" strokeWidth="0.9" strokeLinejoin="round" />
      <line x1="20" y1="4" x2="20" y2="10" stroke="#f5d0fe" strokeWidth="1" />
      <line x1="36" y1="20" x2="30" y2="20" stroke="#581c87" strokeWidth="1" />
      <line x1="20" y1="36" x2="20" y2="30" stroke="#581c87" strokeWidth="1" />
      <line x1="4" y1="20" x2="10" y2="20" stroke="#f5d0fe" strokeWidth="1" />
      <line x1="10" y1="20" x2="30" y2="20" stroke="#c084fc" strokeWidth="0.7" strokeDasharray="1 1" />
      <polygon points="16,14 20,10 23,15 18,17" fill="#ffffff" fillOpacity="0.65" />
    </svg>
  );
}

// 4. ルビー（ペアシェイプ / 滴型ファセット）
export function RubyGem({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className}>
      <defs>
        <linearGradient id="rb-main" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fb7185" />
          <stop offset="50%" stopColor="#e11d48" />
          <stop offset="100%" stopColor="#881337" />
        </linearGradient>
      </defs>
      <path
        d="M20,4 C24,10 34,22 34,27 C34,32.5 27.7,36 20,36 C12.3,36 6,32.5 6,27 C6,22 16,10 20,4 Z"
        fill="url(#rb-main)"
        stroke="#4c0519"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d="M20,11 C23,16 28,23 28,26 C28,29.5 24.5,31 20,31 C15.5,31 12,29.5 12,26 C12,23 17,16 20,11 Z"
        fill="#f43f5e"
        fillOpacity="0.75"
        stroke="#fecdd3"
        strokeWidth="0.9"
      />
      <line x1="20" y1="4" x2="20" y2="11" stroke="#ffe4e6" strokeWidth="1" />
      <line x1="6" y1="27" x2="12" y2="26" stroke="#fda4af" strokeWidth="0.8" />
      <line x1="34" y1="27" x2="28" y2="26" stroke="#9f1239" strokeWidth="0.8" />
      <path d="M18,14 C19,17 21,21 21,23 C20,23 16,21 16,18 Z" fill="#ffffff" fillOpacity="0.6" />
    </svg>
  );
}

// 5. トパーズ（マーキスカット / 舟型ファセット）
export function TopazGem({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className}>
      <defs>
        <linearGradient id="tp-main" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fde047" />
          <stop offset="50%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#9a3412" />
        </linearGradient>
      </defs>
      <path
        d="M20,4 C33,12 36,28 20,36 C4,28 7,12 20,4 Z"
        fill="url(#tp-main)"
        stroke="#7c2d12"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d="M20,10 C29,15 30,25 20,30 C10,25 11,15 20,10 Z"
        fill="#fbbf24"
        fillOpacity="0.8"
        stroke="#fef08a"
        strokeWidth="0.9"
      />
      <line x1="20" y1="4" x2="20" y2="10" stroke="#fef9c3" strokeWidth="1" />
      <line x1="20" y1="36" x2="20" y2="30" stroke="#78350f" strokeWidth="1" />
      <line x1="7" y1="20" x2="11" y2="20" stroke="#fef08a" strokeWidth="0.8" />
      <line x1="33" y1="20" x2="29" y2="20" stroke="#78350f" strokeWidth="0.8" />
      <path d="M18,12 C23,16 23,21 17,21 C15,18 16,14 18,12 Z" fill="#ffffff" fillOpacity="0.55" />
    </svg>
  );
}

// 6. アレキサンドライト（ラディアントヘキサゴン / 変色多面カット）
export function AlexandriteGem({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className}>
      <defs>
        <linearGradient id="al-main" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2dd4bf" />
          <stop offset="35%" stopColor="#3b82f6" />
          <stop offset="70%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
      </defs>
      <polygon points="20,4 34,12 34,28 20,36 6,28 6,12" fill="url(#al-main)" stroke="#312e81" strokeWidth="1.2" strokeLinejoin="round" />
      <polygon points="20,10 29,15 29,25 20,30 11,25 11,15" fill="#6366f1" fillOpacity="0.65" stroke="#c7d2fe" strokeWidth="0.9" strokeLinejoin="round" />
      <line x1="20" y1="4" x2="20" y2="10" stroke="#99f6e4" strokeWidth="1" />
      <line x1="34" y1="12" x2="29" y2="15" stroke="#a5b4fc" strokeWidth="0.8" />
      <line x1="34" y1="28" x2="29" y2="25" stroke="#f472b6" strokeWidth="0.8" />
      <line x1="20" y1="36" x2="20" y2="30" stroke="#f472b6" strokeWidth="1" />
      <line x1="6" y1="28" x2="11" y2="25" stroke="#a5b4fc" strokeWidth="0.8" />
      <line x1="6" y1="12" x2="11" y2="15" stroke="#99f6e4" strokeWidth="0.8" />
      <polygon points="16,13 24,13 21,20 14,18" fill="#ffffff" fillOpacity="0.6" />
    </svg>
  );
}

// 7. ダイヤモンド（クラウンブリリアントカット / 至高のプリズム金剛石）
export function DiamondGem({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className}>
      <defs>
        <linearGradient id="dm-main" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="30%" stopColor="#bae6fd" />
          <stop offset="65%" stopColor="#e0e7ff" />
          <stop offset="100%" stopColor="#fef08a" />
        </linearGradient>
      </defs>
      <polygon points="11,7 29,7 36,15 20,35 4,15" fill="url(#dm-main)" stroke="#0284c7" strokeWidth="1.2" strokeLinejoin="round" />
      <polygon points="11,7 29,7 25,15 15,15" fill="#ffffff" fillOpacity="0.85" stroke="#38bdf8" strokeWidth="0.8" />
      <polygon points="4,15 11,7 15,15" fill="#7dd3fc" fillOpacity="0.7" stroke="#38bdf8" strokeWidth="0.8" />
      <polygon points="29,7 36,15 25,15" fill="#bae6fd" fillOpacity="0.7" stroke="#38bdf8" strokeWidth="0.8" />
      <polygon points="15,15 25,15 20,35" fill="#e0f2fe" fillOpacity="0.9" stroke="#0284c7" strokeWidth="0.8" />
      <polygon points="4,15 15,15 20,35" fill="#38bdf8" fillOpacity="0.6" stroke="#0284c7" strokeWidth="0.8" />
      <polygon points="25,15 36,15 20,35" fill="#67e8f9" fillOpacity="0.5" stroke="#0284c7" strokeWidth="0.8" />
      <path d="M13,11 L14,7 L15,11 L19,12 L15,13 L14,17 L13,13 L9,12 Z" fill="#ffffff" />
      <path d="M26,20 L27,17 L28,20 L31,21 L28,22 L27,25 L26,22 L23,21 Z" fill="#ffffff" fillOpacity="0.9" />
    </svg>
  );
}

// バッジごとの宝石情報
export type GemBadgeMeta = {
  gemName: string;
  icon: React.ComponentType<{ className?: string }>;
  gemRing: string;
  cardBorder: string;
  cardBg: string;
  textColor: string;
  accentBg: string;
};

export const BADGE_DESIGNS: Record<string, GemBadgeMeta> = {
  "first-step": {
    gemName: "エメラルド",
    icon: EmeraldGem,
    gemRing: "ring-emerald-400/40 shadow-emerald-500/25",
    cardBorder: "border-emerald-500/30 hover:border-emerald-500/50",
    cardBg: "bg-emerald-500/5 dark:bg-emerald-950/20",
    textColor: "text-emerald-700 dark:text-emerald-400",
    accentBg: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  },
  explorer: {
    gemName: "サファイア",
    icon: SapphireGem,
    gemRing: "ring-blue-400/40 shadow-blue-500/25",
    cardBorder: "border-blue-500/30 hover:border-blue-500/50",
    cardBg: "bg-blue-500/5 dark:bg-blue-950/20",
    textColor: "text-blue-700 dark:text-blue-400",
    accentBg: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
  },
  navigator: {
    gemName: "アメジスト",
    icon: AmethystGem,
    gemRing: "ring-purple-400/40 shadow-purple-500/25",
    cardBorder: "border-purple-500/30 hover:border-purple-500/50",
    cardBg: "bg-purple-500/5 dark:bg-purple-950/20",
    textColor: "text-purple-700 dark:text-purple-400",
    accentBg: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30",
  },
  master: {
    gemName: "ルビー",
    icon: RubyGem,
    gemRing: "ring-rose-400/40 shadow-rose-500/25",
    cardBorder: "border-rose-500/30 hover:border-rose-500/50",
    cardBg: "bg-rose-500/5 dark:bg-rose-950/20",
    textColor: "text-rose-700 dark:text-rose-400",
    accentBg: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
  },
  "globe-trotter": {
    gemName: "トパーズ",
    icon: TopazGem,
    gemRing: "ring-amber-400/40 shadow-amber-500/25",
    cardBorder: "border-amber-500/30 hover:border-amber-500/50",
    cardBg: "bg-amber-500/5 dark:bg-amber-950/20",
    textColor: "text-amber-700 dark:text-amber-400",
    accentBg: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  },
  centurion: {
    gemName: "アレキサンドライト",
    icon: AlexandriteGem,
    gemRing: "ring-teal-400/40 shadow-teal-500/25",
    cardBorder: "border-teal-500/30 hover:border-teal-500/50",
    cardBg: "bg-teal-500/5 dark:bg-teal-950/20",
    textColor: "text-teal-700 dark:text-teal-400",
    accentBg: "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30",
  },
  "world-conqueror": {
    gemName: "ダイヤモンド",
    icon: DiamondGem,
    gemRing: "ring-sky-400/40 shadow-sky-500/25",
    cardBorder: "border-sky-500/30 hover:border-sky-500/50",
    cardBg: "bg-sky-500/5 dark:bg-sky-950/20",
    textColor: "text-sky-700 dark:text-sky-400",
    accentBg: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
  },
};
