import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { CountryDetail } from "@/components/CountryDetail";
import { SiteHeader } from "@/components/SiteHeader";
import { byIso3 } from "@/data/lookup";

export const Route = createFileRoute("/country/$iso3")({
  loader: ({ params }) => {
    const country = byIso3(params.iso3);
    if (!country) throw notFound();
    return { country };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "国が見つかりません — EarthScope (ES)" }, { name: "robots", content: "noindex" }] };
    }
    const { country } = loaderData;
    const title = `${country.nameJa}の基本データ・歴史・文化 — EarthScope (ES)`;
    const description = `${country.nameJa}（${country.nameEn}）の首都・人口・経済・地理・歴史年表と受験ポイントをまとめて学べます。`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: CountryPage,
  notFoundComponent: CountryNotFound,
});

function CountryPage() {
  const { country } = Route.useLoaderData();
  return (
    <div className="min-h-screen pb-16">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-4 sm:py-6 space-y-4">
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-4" /> 地図に戻る
          </Link>
          <div className="flex items-center gap-3 text-xs">
            <Link to="/compare" className="text-sky-500 hover:underline">
              他の国と比較する ➜
            </Link>
            <span className="text-border">|</span>
            <Link
              to="/quiz"
              search={{ country: country.iso3.toLowerCase(), mode: "exam" }}
              className="text-sky-500 hover:underline font-medium"
            >
              この国のクイズで腕試し ➜
            </Link>
          </div>
        </div>
        <div className="surface-card overflow-hidden shadow-sm">
          <CountryDetail country={country} />
        </div>
      </main>
    </div>
  );
}

function CountryNotFound() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold">この国のデータはまだありません</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          収録国を順次追加中です。地図から他の国を選んでみてください。
        </p>
        <Link to="/" className="mt-6 inline-block rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">
          地図に戻る
        </Link>
      </main>
    </div>
  );
}
