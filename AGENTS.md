# EarthScope (ES) — Development Guidelines

全世界198ヵ国の地理・歴史・統計・国旗を学ぶインタラクティブWebアプリケーション。

## 開発ルール & アーキテクチャ
- **フレームワーク**: React 19 + TanStack Start (SSR) + TanStack Router + Vite
- **スタイリング**: Tailwind CSS v4 + Lucide React + Recharts
- **国データ**: `src/data/countries/` に大陸別にモジュール分割（全198ヵ国、実測統計・歴史年表・受験ポイント10問完備）
- **国旗描画**: Windows環境等の絵文字非対応を防ぐため、高精細SVGを描画する `<FlagImage />` コンポーネントを使用
- **品質管理**: `npx tsc --noEmit` および `npm run build` のエラー0件を常に維持すること
