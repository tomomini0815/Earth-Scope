import React, { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * 絵文字国旗（Regional Indicator Symbols）から ISO 3166-1 alpha-2 コード（小文字）を算出
 */
export function flagToIso2(flag: string): string {
  if (!flag) return "";
  const codePoints = [...flag].map((c) => c.codePointAt(0) || 0);
  const cp0 = codePoints[0];
  const cp1 = codePoints[1];
  if (cp0 !== undefined && cp1 !== undefined && cp0 >= 0x1F1E6 && cp0 <= 0x1F1FF) {
    return String.fromCharCode(
      cp0 - 0x1F1E6 + 65,
      cp1 - 0x1F1E6 + 65
    ).toLowerCase();
  }
  return "";
}

export interface FlagImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  flag?: string | undefined; // 絵文字（例: 🇯🇵）
  iso2?: string | undefined; // 例: jp
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | undefined;
  className?: string | undefined;
  alt?: string | undefined;
}

const SIZE_CLASSES = {
  xs: "w-4 h-3 text-xs",
  sm: "w-6 h-4 text-sm",
  md: "w-8 h-5.5 text-base",
  lg: "w-12 h-8 text-xl",
  xl: "w-20 h-14 text-3xl",
  "2xl": "w-32 h-22 text-5xl",
};

/**
 * Windows環境等で絵文字国旗が表示されない（文字化け・二文字表示）問題を解決する
 * 高精細SVG/PNG国旗画像コンポーネント
 */
export function FlagImage({
  flag,
  iso2: propIso2,
  size = "md",
  className,
  alt = "国旗",
  loading,
  ...props
}: FlagImageProps) {
  const iso2 = (propIso2 || (flag ? flagToIso2(flag) : "")).toLowerCase();
  const [error, setError] = useState(false);
  const [prevIso2, setPrevIso2] = useState(iso2);

  // iso2が変わった時はerrorフラグをリセット
  if (prevIso2 !== iso2) {
    setPrevIso2(iso2);
    setError(false);
  }

  // iso2が取得できない、あるいは読み込み失敗時は絵文字フォールバック
  if (!iso2 || error) {
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center font-emoji leading-none select-none",
          className
        )}
        role="img"
        aria-label={alt}
      >
        {flag || "🏳️"}
      </span>
    );
  }

  return (
    <img
      key={iso2}
      src={`https://flagcdn.com/${iso2}.svg`}
      alt={alt}
      loading={loading || "lazy"}
      onError={() => setError(true)}
      className={cn(
        "inline-block shrink-0 rounded-[3px] border border-black/10 object-cover shadow-sm align-middle transition-transform",
        SIZE_CLASSES[size || "md"] || SIZE_CLASSES.md,
        className
      )}
      {...props}
    />
  );
}
