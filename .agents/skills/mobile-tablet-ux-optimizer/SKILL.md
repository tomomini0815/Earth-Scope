---
name: mobile-tablet-ux-optimizer
description: >-
  Audits, refactors, and perfects mobile (smartphone) and tablet (iPad) responsive UI/UX for web applications.
  Use this skill whenever the user asks to optimize, fix, or improve mobile, iPhone, Android, tablet, or iPad screens, touch interactions, safe-areas, dynamic viewports, drawer/sheets, or responsive typography and spacing.
---

# Mobile & Tablet UI/UX Optimizer Skill

Webアプリケーションにおけるモバイル端末（iOS / Androidスマートフォン）およびタブレット（iPad / Androidタブレット）のUI/UXを最高品質に最適化・洗練するための実践的プロトコルです。

---

## 1. 最重要タッチ・インタラクション原則

1. **タップ前提の文言設計 (Copywriting for Touch)**:
   - 「クリック」→「タップ」
   - 「マウスを合わせる / ホバー」→「タップ」または「長押し」
   - 画面幅やデバイス検知（`isMobile` / CSS）に応じた動的切り替え、またはタッチファーストな共通文言を採用。

2. **タッチターゲットの基準 (Touch Targets)**:
   - すべてのタップ可能要素（ボタン、リンク、チップ、アイコン、閉じるボタン）は**最低 44×44px**（または十分な透明パディング）を確保。
   - 近接するボタン間には最低 8px の隙間を確保し、誤タップを防止。
   - タップフィードバックとして `active:scale-95` や `active:bg-muted`、`-webkit-tap-highlight-color: transparent` を適用。

3. **ホバー依存の完全排除 (No Hover-Only UX)**:
   - デスクトップの `:hover` ツールチップやメニュー表示のみに依存した機能を禁止。
   - モバイルでは「タップ」でモーダル・ドロワー・シート・アコーディオンが確実に開閉できるようにする。

---

## 2. ビューポート・セーフエリア・CSS設計

1. **セーフエリア (Safe Area Insets)**:
   - iPhoneのホームインジケーター（下部バー）やノッチ（Dynamic Island）と被らないよう、固定ヘッダー・フッターにセーフエリアを確保：
     ```css
     padding-bottom: calc(0.75rem + env(safe-area-inset-bottom, 0px));
     padding-top: calc(0.5rem + env(safe-area-inset-top, 0px));
     ```
   - 画面下部の固定ナビ（`MobileBottomNav` 等）がある場合、メインコンテンツ末尾に必ず `pb-24 md:pb-8` を付与して要素の隠れを防止。

2. **ダイナミック・ビューポート高 (Dynamic Viewport Height)**:
   - モバイルブラウザのアドレスバー開閉によるガタツキを防ぐため、`100vh` ではなく `100dvh` または `min-h-dvh` を使用。

3. **iOS自動ズーム防止 (Prevent iOS Zoom on Input)**:
   - フォームの `<input>`, `<select>`, `<textarea>` はフォントサイズ `text-base`（16px）以上にする（`text-xs` / `text-sm` だとiOS Safariが自動フォーカスズームしてUIが崩れるため）。
   - デスクトップでは `sm:text-sm` で引き締める。

4. **横スクロールはみ出し防止 (No Unintended Horizontal Overflow)**:
   - `overflow-x-hidden` を全体に適用しつつ、チップやタブフィルターのみ `-mx-4 px-4 overflow-x-auto scrollbar-none` で端まで美しくフリック可能にする。

---

## 3. 地図・キャンバス・SVGのモバイル/iPad操作性

1. **スクロールとドラッグの競合回避**:
   - 地図操作エリアには `touch-action: pan-x pan-y` またはコントロールボタンを活用。
   - 地図上の操作（拡大・縮小・リセット）ボタンは、親指が届きやすい位置に大きめ（最低 36〜40px）に配置。

2. **微小要素のタップ判定拡大**:
   - 地図上のピンや小島には、目に見える円の背後に透明な `pointerEvents: "all"` の大きめなサークル（半径 14〜16px 以上）を配置。

---

## 4. iPad・タブレット固有の最適化

1. **タブレット縦向き（768px〜834px）**:
   - 1カラムにするか、地図とパネルを上下で美しく分割（`h-[420px]` 程度）。
2. **タブレット横向き（1024px〜1180px）**:
   - `lg:grid-cols-[1.2fr_1fr]` 等の2カラムで地図と詳細を同時に見渡せるように最適化。

---

## 5. モバイル・iPad UI 改善プロトコル（手順）

1. **診断 (Audit)**:
   - テキストの「クリック」表現を抽出・置換。
   - モバイルビューポート（375px / 390px / 430px）および iPad（768px / 820px）でのレイアウト崩れ・重なりを特定。
2. **実装 (Apply Fixes)**:
   - 見出し・リード文の文言最適化。
   - タッチターゲット、パディング、セーフエリアの適用。
   - 下部ナビゲーションと重なる箇所の余白確保。
   - ドロワー（Drawer）のスムーズな開閉と閉じるボタンの操作性。
3. **検証 (Verify)**:
   - `npx tsc --noEmit` & `npm run build` のエラー0件確認。
   - レスポンシブ確認。
