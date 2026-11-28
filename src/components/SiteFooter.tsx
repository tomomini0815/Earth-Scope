import { Link } from "@tanstack/react-router";
import {
  Award,
  BarChart3,
  BookOpen,
  Compass,
  Database,
  Globe2,
  GraduationCap,
  Map as MapIcon,
  Puzzle,
  UserCheck,
} from "lucide-react";

const APP_MENU_ITEMS = [
  { to: "/", label: "世界地図", desc: "198ヵ国のデータ探索", icon: MapIcon },
  { to: "/puzzle", label: "パズル", desc: "国の形と位置を学ぶ", icon: Puzzle },
  { to: "/quiz", label: "クイズ", desc: "国旗・首都・受験対策", icon: GraduationCap },
  { to: "/compare", label: "比較", desc: "最大10ヵ国をグラフ比較", icon: BarChart3 },
  { to: "/mypage", label: "マイページ", desc: "学習記録・パスポート", icon: Award },
] as const;

export function SiteFooter() {
  return (
    <footer className="mt-10 sm:mt-12 border-t border-border/80 bg-background/60">
      <div className="mx-auto max-w-[1600px] w-full px-4 pt-8 pb-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:gap-8 lg:grid-cols-[1.4fr_1fr_1fr] items-start">
          {/* ブランド & 説明 */}
          <div className="col-span-2 lg:col-span-1 space-y-2.5">
            <Link to="/" className="inline-flex items-center gap-2 font-display group">
              <Globe2 className="size-5 text-sky-500 shrink-0 transition-transform group-hover:scale-105" />
              <span className="text-base font-bold tracking-tight text-foreground">
                EarthScope
              </span>
              <span className="rounded-md bg-secondary px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                地球まるごと大探検
              </span>
            </Link>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-md">
              全世界198ヵ国の基本データ・歴史年表・文化・人口・経済成長率・地理・受験ポイントを一つの世界地図で学べるインタラクティブ学習プラットフォームです。
            </p>
            <div className="flex flex-wrap gap-3 pt-1 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <BookOpen className="size-3.5 text-sky-500" />
                全198ヵ国収録
              </span>
              <span className="inline-flex items-center gap-1">
                <UserCheck className="size-3.5 text-emerald-500" />
                中・高・大 受験問題完備
              </span>
            </div>
          </div>

          {/* アプリ内メニュー（モバイルでも出典と2カラム横並び） */}
          <div className="space-y-2.5 min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <Compass className="size-3.5 text-sky-500 shrink-0" />
              <span>メニュー</span>
            </div>
            <nav aria-label="フッターナビゲーション">
              <ul className="space-y-1.5">
                {APP_MENU_ITEMS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.to}>
                      <Link
                        to={item.to}
                        className="group flex items-center gap-1.5 sm:gap-2 rounded-lg px-2 py-1 -mx-2 text-xs text-muted-foreground transition-colors hover:bg-secondary/70 hover:text-foreground"
                      >
                        <Icon className="size-3.5 text-sky-500/80 group-hover:text-sky-500 shrink-0" />
                        <span className="font-semibold text-foreground/90 group-hover:text-sky-600 dark:group-hover:text-sky-400 truncate">
                          {item.label}
                        </span>
                        <span className="hidden sm:inline text-[11px] text-muted-foreground/80 truncate">
                          — {item.desc}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>

          {/* 主な統計・データ出典（モバイルでもメニューと2カラム横並び） */}
          <div className="space-y-2.5 min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <Database className="size-3.5 text-sky-500 shrink-0" />
              <span>主な統計・データ出典</span>
            </div>
            <ul className="space-y-1.5 text-[11px] text-muted-foreground leading-snug">
              <li>・IMF World Economic Outlook</li>
              <li>・World Bank Open Data</li>
              <li>・国連人口統計（UN）</li>
              <li>・外務省 基礎データ</li>
              <li>・SIPRI / IISS 公開推計</li>
              <li>・UNESCO 世界遺産一覧</li>
            </ul>
          </div>
        </div>

        <div className="mt-7 flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-4 text-[11px] text-muted-foreground">
          <span>
            © {new Date().getFullYear()} EarthScope — Interactive World Atlas & Learning Platform
          </span>
          <span>※ 統計数値は各国際機関の公開データおよび推計値に基づいています</span>
        </div>
      </div>
    </footer>
  );
}
