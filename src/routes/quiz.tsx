import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, useEffect, useRef } from "react";
import {
  Check,
  RefreshCw,
  Award,
  Globe,
  BookOpen,
  Search,
  Target,
  X,
  Sparkles,
  ChevronRight,
  GraduationCap,
  Lightbulb,
} from "lucide-react";

import { SiteHeader } from "@/components/SiteHeader";
import { FlagImage } from "@/components/FlagImage";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { countries } from "@/data/countries";
import { byIso3, sortedCountries } from "@/data/lookup";
import { continentLabel, type Country } from "@/data/types";
import { useProgress } from "@/stores/progress";
import { cn } from "@/lib/utils";

type Mode = "flag" | "flag_choice" | "capital" | "exam" | "timeline" | "country_master";

type QuizSearch = {
  country?: string | undefined;
  mode?: Mode | undefined;
};

export const Route = createFileRoute("/quiz")({
  validateSearch: (search: Record<string, unknown>): QuizSearch => {
    return {
      country: typeof search["country"] === "string" ? search["country"] : undefined,
      mode: typeof search["mode"] === "string" ? (search["mode"] as Mode) : undefined,
    };
  },
  head: () => ({
    meta: [
      { title: "世界地理クイズ — 国名・首都・国旗・入試ポイント | EarthScope (ES)" },
      {
        name: "description",
        content: "全世界198ヵ国の国旗・首都・入試受験ポイント・歴史年表クイズ。全10問・即時採点と詳しい解説付き。",
      },
      { property: "og:title", content: "世界地理クイズ | EarthScope (ES)" },
      { property: "og:description", content: "国旗・国名・首都・受験ポイント・年表並べ替えの5モードで実力チェック。" },
    ],
  }),
  component: QuizPage,
});

const GLOBAL_MODES: { id: Mode; label: string; desc: string; icon: string }[] = [
  { id: "flag", label: "国旗あて", desc: "表示された国旗から国名を選ぶ", icon: "🚩" },
  { id: "flag_choice", label: "国旗えらび", desc: "国名から正しい国旗を選ぶ", icon: "🌐" },
  { id: "capital", label: "首都あて", desc: "国旗と国名から首都を選ぶ", icon: "🏛️" },
  { id: "exam", label: "受験ポイント", desc: "中学・高校入試頻出の地理・歴史問題（10問）", icon: "📝" },
  { id: "timeline", label: "年表並べ替え", desc: "出来事を古い順に並べ替える", icon: "⏳" },
];

const COUNTRY_MODES: { id: Mode; label: string; desc: string; icon: string }[] = [
  { id: "exam", label: "受験ポイント（10問）", desc: "この国の入試頻出ポイントを全問マスター", icon: "📝" },
  { id: "country_master", label: "国まるごと総合（10問）", desc: "国旗・首都・言語・産業・歴史を総合出題", icon: "🎯" },
  { id: "timeline", label: "歴史年表並べ替え", desc: "この国の出来事を古い順に並べ替える", icon: "⏳" },
];

// クイック選択におすすめの主要国
const POPULAR_COUNTRIES = [
  "JPN", "USA", "CHN", "CAN", "GBR", "FRA", "DEU", "KOR", "IND", "AUS", "EGY", "BRA"
];

const QUESTION_COUNT = 10;

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
};

type Question = {
  country: Country;
  prompt: string;
  flagHint?: string | undefined; // 国旗あて用の国旗
  textHint?: string | undefined; // 受験問題のQなど
  choices: { id: string; label: string; flag?: string }[];
  answerId: string;
  explanation: string;
  mnemonic?: string | undefined; // 次から間違えない覚え方・暗記のコツ
  isFlagGrid?: boolean;
};

function parseYear(yearStr: string): number {
  const isBCE = yearStr.includes("前") || yearStr.includes("BC") || yearStr.includes("B.C.");
  const cleaned = yearStr.replace(/[^0-9]/g, "");
  const num = parseInt(cleaned, 10);
  if (isNaN(num)) return 0;
  if (yearStr.includes("世紀") && num < 30) {
    const centuryYear = (num - 1) * 100;
    return isBCE ? -centuryYear : centuryYear;
  }
  return isBCE ? -num : num;
}

interface TopicKnowledge {
  keywords: string[];
  explanation: string;
  mnemonic: string;
}

const TOPIC_KNOWLEDGE: TopicKnowledge[] = [
  {
    keywords: ["森林", "森林率", "森林面積"],
    explanation: "国土面積に占める森林の割合は約67%（約3分の2）に達し、フィンランドやスウェーデンと並ぶ世界トップクラスの森林国です。急峻な山岳地形と豊富な降水量が背景にありますが、国産木材の採算性や林業の後継者不足により、木材需要の多くを輸入木材に依存している点も重要な入試頻出論点です。",
    mnemonic: "「日本の約3分の2（約67%）は森林、農用地はわずか約12%」と対比で覚えるのが鉄則です！",
  },
  {
    keywords: ["造山帯", "新期造山帯", "環太平洋"],
    explanation: "日本列島は「環太平洋造山帯（新期造山帯）」に位置し、プレートの沈み込み帯であるため地震や火山活動が活発で、山地・山脈が国土の約7割を占めます。豊かな温泉や景観をもたらす一方、自然災害への備えが不可欠です。",
    mnemonic: "世界の2大新期造山帯は「アルプス・ヒマラヤ」と「環太平洋」。日本は太平洋をぐるりと囲む環太平洋側だと覚えましょう。",
  },
  {
    keywords: ["フォッサマグナ", "大地溝帯", "糸魚川"],
    explanation: "ナウマン博士が命名した、東北日本と西南日本を分断する巨大な地溝帯です。西側の境界は「糸魚川・静岡構造線（新潟県糸魚川市〜静岡市）」で、この溝の中に富士山などの火山が帯状に噴出して連なっています。",
    mnemonic: "「西の端は糸魚川・静岡構造線」。西南日本を内帯・外帯に二分する「中央構造線」との混同に注意しましょう。",
  },
  {
    keywords: ["加工貿易", "原材料", "製品輸出"],
    explanation: "石油や鉄鉱石などの天然資源・エネルギー原料に乏しい国が、海外から安価な原料・燃料を大量に輸入し、国内の高い工業技術力で付加価値の高い工業製品（自動車・精密機械等）に加工して輸出する貿易形態です。",
    mnemonic: "「原料を輸入して製品を輸出」。オーストラリア等の資源輸出国や、巨大市場（アメリカ・中国）との関係とセットで整理しましょう。",
  },
  {
    keywords: ["排他的経済水域", "EEZ", "200海里"],
    explanation: "沿岸から200海里（約370km）までの水域で、水産資源や海底鉱物資源の探査・開発・保存・管理などの独占的な主権的権利が認められています。日本は周囲が海に囲まれた島国であるため、国土面積の約12倍（世界第6位）もの広大なEEZを有します。",
    mnemonic: "「領海＝12海里」「EEZ＝200海里」の数字比較が必須。EEZ内でも他国船の自由航行は保障される点も重要です。",
  },
  {
    keywords: ["潮目", "潮境", "親潮", "黒潮"],
    explanation: "暖流（日本海流／黒潮・対馬海流）と寒流（千島海流／親潮・リマン海流）が衝突・合流する海域です。深層の海水が湧き上がりプランクトンが爆発的に繁殖するため、多様な魚が集まる世界屈指の好漁場（三陸沖など）を形成します。",
    mnemonic: "「北から冷たい親潮、南から暖かい黒潮」。「親（親潮）から子へ栄養（プランクトン）を与える」とイメージすると混同しません。",
  },
  {
    keywords: ["促成栽培", "宮崎", "高知"],
    explanation: "温暖な冬の気候やビニールハウス設備を活用し、普通よりも収穫・出荷時期を早める栽培法です（高知平野のナスやピーマン、宮崎平野のきゅうりなど）。他産地の品薄な端境期に出荷することで高値での取引を狙います。",
    mnemonic: "「促成＝成長を促す＝南の暖かい地域（高知・宮崎）」「抑制＝成長を抑える＝高原・冷涼地（長野・群馬）」と対比で記憶！",
  },
  {
    keywords: ["抑制栽培", "高冷地", "嬬恋", "野辺山"],
    explanation: "標高が高く夏でも冷涼な気候条件を利用して、平地よりも生育・出荷時期を遅らせる栽培法です（群馬県嬬恋村や長野県野辺山原の高原キャベツ・レタスなど）。真夏の市場に新鮮な葉物野菜を安定供給できます。",
    mnemonic: "「促成＝南国で前倒し出荷」「抑制＝高原の涼しさで後ろ倒し出荷」と対比で整理しましょう。",
  },
  {
    keywords: ["過疎", "過密", "限界集落"],
    explanation: "都市部への急激な人口集中で住環境の悪化や交通渋滞が生じる「過密」に対し、農山村や地方では若年層の流出と少子高齢化で地域コミュニティの維持が困難になる「過疎」が発生しました。医療・公共交通の確保が深刻な課題です。",
    mnemonic: "「太平洋ベルト（大都市圏）への人口集中＝過密」「地方・山間部の人口激減＝過疎」という二面性で捉えましょう。",
  },
  {
    keywords: ["エネルギー革命", "石炭", "石油"],
    explanation: "1960年代に産業や家庭の主要熱源・エネルギー源が石炭から安価で扱いやすい石油へと一気にシフトした歴史的現象です。国内の炭鉱（筑豊・三池・夕張等）が相次いで閉山し、太平洋沿岸部に石油化学コンビナートが建設されました。",
    mnemonic: "「石炭から石油へ」。重化学工業の拠点が炭鉱地帯から太平洋ベルトの臨海コンビナートへ移った地理的要因と直結します。",
  },
  {
    keywords: ["憲法", "第9条", "平和主義", "戦争の放棄"],
    explanation: "第二次世界大戦の反省から、国家主権としての戦争の放棄、陸海空軍その他の戦力の不保持、国の交戦権の否認を定めています。日本国憲法の三大原理（国民主権・基本的人権の尊重・平和主義）の根幹をなす条文です。",
    mnemonic: "「戦争放棄」「戦力不保持」「交戦権否認」の3要素が第9条の柱。三大原理との階層関係を整理しておきましょう。",
  },
  {
    keywords: ["リアス海岸", "沈水", "沈降"],
    explanation: "起伏の多い山地が地盤沈降や海面上昇によって海に沈み、谷が入り江となってできたノコギリ状の複雑な海岸地形です。波が穏やかなためカキや真珠などの養殖に適する一方、津波の際には波が湾奥に集中して巨大化しやすい特徴があります。",
    mnemonic: "三陸海岸南部や志摩半島、若狭湾が代表例。「養殖に適するが津波被害を受けやすい」という両面を押さえましょう。",
  },
  {
    keywords: ["扇状地", "三角州", "水はけ"],
    explanation: "川が山地から平野に出る谷口に土砂が堆積してできるのが「扇状地」（砂利が多く水はけが良いため果樹園・畑に利用）、川が海や湖に注ぐ河口部にできるのが「三角州」（水持ちが良く低平なため水田や都市部に利用）です。",
    mnemonic: "「山から出たところ＝扇状地（果樹園・水はけ◎）」「海に入る手前＝三角州（水田・都市）」と川の流れ順で区別！",
  },
  {
    keywords: ["季節風", "モンスーン"],
    explanation: "大陸と海洋の比熱の違いによって夏と冬で風向きが逆転する風です。夏は海洋から湿った南東風が吹き込んで多雨をもたらし、冬はユーラシア大陸のシベリア高気圧から冷たく乾燥した北西風が吹き出します。",
    mnemonic: "「夏は海から（高温多雨）」「冬は大陸から（日本海側に豪雪、太平洋側に乾燥）」。日本海側と太平洋側の気候差の源です。",
  },
  {
    keywords: ["シリコンバレー", "サンベルト", "IT"],
    explanation: "北緯37度以南の温暖な地域（サンベルト）に位置し、スタンフォード大学などの研究機関や潤沢なベンチャーキャピタルを背景に半導体・IT・バイオ等の最先端ハイテク産業が集積した世界屈指のイノベーション拠点です。",
    mnemonic: "「北緯37度以南＝サンベルト（先端産業・人口増加）」「北東部＝スノーベルト／ラストベルト（旧来の鉄鋼・自動車産業衰退）」の対比。",
  },
  {
    keywords: ["EU", "欧州連合", "ユーロ", "シェンゲン"],
    explanation: "ヨーロッパの持続的な平和と経済統合を目的に、EC（欧州共同体）から発展して結成されました。人・物・資本・サービスの移動の自由、共通通貨ユーロの導入、国境検査の撤廃（シェンゲン協定）など国境を越えた高度な統合を実現しています。",
    mnemonic: "本部はベルギーのブリュッセル。加盟国間の関税撤廃や統一通貨による経済圏の拡大を意識しましょう。",
  },
  {
    keywords: ["ASEAN", "東南アジア諸国連合"],
    explanation: "1967年にバンコク宣言で発足した東南アジアの地域協力機構です（原加盟国はタイ、インドネシア、マレーシア、フィリピン、シンガポールの5カ国、現在は10カ国）。地域の平和維持と経済成長の加速を目的としています。",
    mnemonic: "「最初の5カ国＋後に加入したベトナム・ミャンマー等で合計10カ国」。急速な工業化と人口ボーナスが特徴です。",
  },
  {
    keywords: ["アパルトヘイト", "人種隔離", "マンデラ"],
    explanation: "南アフリカ共和国で白人政権によって敷かれていた極端な人種隔離政策です。黒人をはじめとする非白人の居住地制限や参政権剥奪などが行われましたが、国際的な経済制裁とネルソン・マンデラ氏らの闘争により1990年代前半に撤廃されました。",
    mnemonic: "「アパルトヘイト撤廃＝ネルソン・マンデラ（初の黒人大統領・ノーベル平和賞）」とセットで記憶しましょう。",
  },
  {
    keywords: ["白夜", "極夜", "白夜現象", "フィヨルド"],
    explanation: "地軸が約23.4度傾いているため、極圏（北極圏・南極圏）の夏季に太陽が一日中地平線下に沈まない現象を白夜と呼びます。北欧では氷河の侵食で形成された細長く深いU字谷「フィヨルド」などの壮大な自然景観も見られます。",
    mnemonic: "「夏は沈まない白夜、冬は太陽が昇らない極夜」。高緯度地域ならではの現象です。",
  },
  {
    keywords: ["プランテーション", "モノカルチャー"],
    explanation: "熱帯・亜熱帯の旧植民地などで、欧米の資本と現地の低賃金労働力を利用して特定の換金作物（天然ゴム、コーヒー、パーム油、カカオ、茶など）を大規模に単一栽培する大農園です。単一作物への依存（モノカルチャー経済）は価格変動リスクを伴います。",
    mnemonic: "「大規模単一栽培＝プランテーション」「特定資源・作物依存＝モノカルチャー経済」。国際市況の影響を受けやすい点が出題されます。",
  },
  {
    keywords: ["OPEC", "石油輸出国機構"],
    explanation: "国際石油資本（メジャーズ）に対抗し、産油国の主権と石油利権の確保・価格維持を目的に結成された組織です。1970年代の石油危機（オイルショック）では価格引き上げや供給制限を行い、世界経済に大きな影響を与えました。",
    mnemonic: "本部はオーストリアのウィーン（非産油国の中立地）。中東の主要産油国が中心となって結束しました。",
  },
  {
    keywords: ["パナマ運河", "スエズ運河"],
    explanation: "パナマ運河は閘門（水門）式で太平洋と大西洋を結ぶ中米の要衝、スエズ運河は水平式で地中海と紅海（インド洋）を結ぶエジプトの要衝です。どちらも世界の海上輸送距離と日数を劇的に短縮させた最重要航路です。",
    mnemonic: "「閘門式＝高低差を調節するパナマ運河」「水平式＝砂漠を掘削したスエズ運河」の構造の違いが頻出です。",
  },
  {
    keywords: ["地中海性気候", "Cs", "オリーブ"],
    explanation: "夏は亜熱帯高圧帯に覆われて高温乾燥し、冬は偏西風の影響で温暖湿潤（雨が降る）となる温帯気候です。乾燥に強いオリーブや柑橘類、ぶどうの栽培、冬小麦の栽培を組み合わせた「地中海式農業」が発達しています。",
    mnemonic: "「夏にカラカラ乾燥、冬に雨」。雨温図で夏の降水量が谷底のように凹んでいるグラフを見たら即判定しましょう。",
  },
  {
    keywords: ["西岸海洋性気候", "Cfb", "偏西風"],
    explanation: "北大西洋海流などの暖流と、年間を通じて吹く偏西風の影響により、高緯度の割に冬も温暖で年間を通して降水量が均等に得られる気候です。ロンドンやパリなどヨーロッパ西部に典型的に見られます。",
    mnemonic: "「偏西風＋暖流＝緯度が高いのに冬も凍らない」。年間の気温較差が小さいのが特徴です。",
  },
];

function generateExamExplanation(
  country: Country,
  q: string,
  a: string
): { explanation: string; mnemonic: string } {
  // 1. 専門辞書マッチ
  const query = `${q} ${a}`.toLowerCase();
  for (const topic of TOPIC_KNOWLEDGE) {
    if (topic.keywords.some((kw) => query.includes(kw.toLowerCase()))) {
      return {
        explanation: topic.explanation,
        mnemonic: topic.mnemonic,
      };
    }
  }

  // 2. 地理・自然・気候
  if (
    q.includes("気候") ||
    q.includes("山") ||
    q.includes("川") ||
    q.includes("海") ||
    q.includes("平野") ||
    q.includes("面積") ||
    q.includes("島") ||
    q.includes("湖")
  ) {
    const geoInfo = country.geography.climate || country.geography.terrain || `${continentLabel(country.continent)}に位置する地域`;
    return {
      explanation: `${country.nameJa}の自然地理・環境に関する重要知識です。${country.nameJa}は「${geoInfo}」という地理的特徴を持ち、この自然環境や地形が地域社会の産業や生活文化を形成する基盤となっています。`,
      mnemonic: `「${country.nameJa}」の大陸・位置関係と自然環境（気候・地形）を地図上でイメージしながら因果関係で覚えましょう。`,
    };
  }

  // 3. 産業・経済・貿易
  if (
    q.includes("産業") ||
    q.includes("輸出") ||
    q.includes("輸入") ||
    q.includes("生産") ||
    q.includes("資源") ||
    q.includes("工業") ||
    q.includes("農業") ||
    q.includes("貿易")
  ) {
    const econInfo = country.economy.industries || country.economy.trade || "基幹産業の発展";
    return {
      explanation: `${country.nameJa}の経済構造・貿易に関する頻出ポイントです。同国では「${econInfo}」が大きな役割を果たしており、世界市場における主要輸出品目や国内産業の特色が入試で繰り返し問われます。`,
      mnemonic: `その国の天然資源の有無と主要輸出品（農産物・鉱物・工業製品）の結びつきを意識するのが得点への近道です。`,
    };
  }

  // 4. 歴史・条約・政治制度
  if (
    q.includes("年") ||
    q.includes("世紀") ||
    q.includes("大統領") ||
    q.includes("戦争") ||
    q.includes("革命") ||
    q.includes("独立") ||
    q.includes("条約") ||
    q.includes("国王") ||
    q.includes("憲法")
  ) {
    const histInfo = country.history.founding || country.society.note || "近代以降の変遷";
    return {
      explanation: `${country.nameJa}の歩みにおける歴史的転換点・制度に関する重要事項です（背景：${histInfo}）。当時の国際情勢や隣国との関係、社会情勢の変遷と連動して理解しておく必要があります。`,
      mnemonic: `単独の年号や単語として丸暗記するのではなく、「なぜその出来事や制度が必要とされたのか」という前後の因果関係でインプットしましょう。`,
    };
  }

  // 5. 汎用インテリジェント解説（オウム返しを完全排除）
  return {
    explanation: `${country.nameJa}（${continentLabel(country.continent)}、首都：${country.basic.capital}）の社会・地理・文化に関する核心的教養知識です。各種試験で正誤判定や選択問題として出題されやすい最重要論点です。`,
    mnemonic: `問題文中のキーワードを手がかりに、「${country.nameJa}」の際立った特徴として整理して記憶に定着させましょう。`,
  };
}

function buildQuestions(
  mode: Mode,
  usedCodes: Set<string> = new Set(),
  targetCountry?: Country | undefined
): Question[] {
  // === 特定の国が選択されている場合 ===
  if (targetCountry) {
    // 1. その国の受験ポイント特化（全10問）
    if (mode === "exam") {
      const allExams = countries
        .filter((c) => c.iso3 !== targetCountry.iso3)
        .flatMap((c) => c.examPoints.map((ep) => ep.a));

      return targetCountry.examPoints.slice(0, QUESTION_COUNT).map((item, idx) => {
        const wrongPool = shuffle(allExams.filter((a) => a !== item.a)).slice(0, 3);
        const choices = shuffle([
          { id: item.a, label: item.a },
          ...wrongPool.map((w) => ({ id: w, label: w })),
        ]);
        const { explanation, mnemonic } = generateExamExplanation(targetCountry, item.q, item.a);
        return {
          country: targetCountry,
          prompt: `【${targetCountry.nameJa}】重要入試ポイント 第${idx + 1}問`,
          textHint: `Q. ${item.q}`,
          choices,
          answerId: item.a,
          explanation,
          mnemonic,
        };
      });
    }

    // 2. その国の歴史年表並べ替え
    if (mode === "timeline") {
      const timeline = targetCountry.history.timeline;
      if (timeline.length >= 3) {
        const questions: Question[] = [];
        for (let i = 0; i < Math.min(QUESTION_COUNT, 5); i++) {
          const picked = shuffle(timeline).slice(0, 3);
          const sorted = [...picked].sort((a, b) => parseYear(a.year) - parseYear(b.year));
          const answer = sorted.map((t) => t.event).join(" → ");
          const wrongs = shuffle([
            [sorted[2], sorted[0], sorted[1]],
            [sorted[1], sorted[0], sorted[2]],
            [sorted[2], sorted[1], sorted[0]],
          ])
            .slice(0, 3)
            .map((set) => set.map((t) => t!.event).join(" → "))
            .filter((s) => s !== answer)
            .slice(0, 3);

          questions.push({
            country: targetCountry,
            prompt: `【${targetCountry.nameJa}】の歴史的出来事を古い順に並べ替えると？`,
            choices: shuffle([answer, ...wrongs]).map((s) => ({ id: s, label: s })),
            answerId: answer,
            explanation: `歴史の年代順・背景：\n${sorted.map((t, i) => `${i + 1}. 【${t.year}年】${t.event}`).join("\n")}\n\n前の出来事が次の出来事を引き起こす因果関係を意識すると記憶が定着します。`,
            mnemonic: `起点となる最初の出来事「${sorted[0]?.year}年」を基準点にして、その後の歴史のストーリー展開で覚えましょう。`,
          });
        }
        // もし年表だけで10問に満たない場合は受験ポイントで補完
        const remaining = QUESTION_COUNT - questions.length;
        const examPool = targetCountry.examPoints.slice(0, remaining);
        const allExams = countries.filter((c) => c.iso3 !== targetCountry.iso3).flatMap((c) => c.examPoints.map((ep) => ep.a));
        examPool.forEach((ep, idx) => {
          const wrongPool = shuffle(allExams.filter((a) => a !== ep.a)).slice(0, 3);
          const { explanation, mnemonic } = generateExamExplanation(targetCountry, ep.q, ep.a);
          questions.push({
            country: targetCountry,
            prompt: `【${targetCountry.nameJa}】重要入試ポイント`,
            textHint: `Q. ${ep.q}`,
            choices: shuffle([{ id: ep.a, label: ep.a }, ...wrongPool.map((w) => ({ id: w, label: w }))]),
            answerId: ep.a,
            explanation,
            mnemonic,
          });
        });
        return questions;
      }
    }

    // 3. 国まるごと総合マスターモード（国旗・首都・公用語・地理・産業・受験ポイント）
    const qList: Question[] = [];
    const otherCountries = countries.filter((c) => c.iso3 !== targetCountry.iso3);

    // Q1: 国旗えらび
    const wrongFlags = shuffle(otherCountries).slice(0, 3);
    qList.push({
      country: targetCountry,
      prompt: `${targetCountry.nameJa}（${targetCountry.nameEn}）の国旗はどれ？`,
      choices: shuffle([
        { id: targetCountry.iso3, label: targetCountry.nameJa, flag: targetCountry.flag },
        ...wrongFlags.map((o) => ({ id: o.iso3, label: o.nameJa, flag: o.flag })),
      ]),
      answerId: targetCountry.iso3,
      explanation: `${targetCountry.nameJa}（${continentLabel(targetCountry.continent)}、首都：${targetCountry.basic.capital}）の正式な国旗です。国旗の配色や紋章には、その国の自然環境や独立の歴史、国民の結束の願いが込められています。`,
      mnemonic: `デザインの特徴（ストライプの向きや星・紋章などのシンボルマーク）と国名「${targetCountry.nameJa}」を視覚的にリンクさせましょう。`,
      isFlagGrid: true,
    });

    // Q2: 首都あて
    const wrongCapitals = shuffle(otherCountries.filter((o) => o.basic.capital !== targetCountry.basic.capital)).slice(0, 3);
    qList.push({
      country: targetCountry,
      prompt: `${targetCountry.nameJa}の首都はどこ？`,
      choices: shuffle([
        { id: targetCountry.basic.capital, label: targetCountry.basic.capital },
        ...wrongCapitals.map((o) => ({ id: o.basic.capital, label: o.basic.capital })),
      ]),
      answerId: targetCountry.basic.capital,
      explanation: `${targetCountry.nameJa}の政治・行政の中枢が置かれた首都です。最大の商業・経済都市と首都が異なる国は特にテストで狙われやすいため区別が重要です。`,
      mnemonic: `「${targetCountry.nameJa}の首都＝${targetCountry.basic.capital}」と声に出してリズムで覚えるのが最も効果的です。`,
    });

    // Q3: 公用語
    const wrongLangs = shuffle(otherCountries.filter((o) => o.basic.languages !== targetCountry.basic.languages)).slice(0, 3);
    qList.push({
      country: targetCountry,
      prompt: `${targetCountry.nameJa}の公用語・主な言語は？`,
      choices: shuffle([
        { id: targetCountry.basic.languages, label: targetCountry.basic.languages },
        ...wrongLangs.map((o) => ({ id: o.basic.languages, label: o.basic.languages })),
      ]),
      answerId: targetCountry.basic.languages,
      explanation: `${targetCountry.nameJa}（${continentLabel(targetCountry.continent)}）で公的に用いられている言語です。地理的な位置関係や過去の交易・歴史的歩みが言語の分布に反映されています。`,
      mnemonic: `周辺国や地域の歴史的ルーツ（文化圏や歴史的つながり）と連動させて納得して覚えると記憶に残りやすくなります。`,
    });

    // Q4: 政治体制
    const wrongGovs = shuffle(otherCountries.filter((o) => o.basic.government !== targetCountry.basic.government)).slice(0, 3);
    qList.push({
      country: targetCountry,
      prompt: `${targetCountry.nameJa}の国家体制・政治制度は？`,
      choices: shuffle([
        { id: targetCountry.basic.government, label: targetCountry.basic.government },
        ...wrongGovs.map((o) => ({ id: o.basic.government, label: o.basic.government })),
      ]),
      answerId: targetCountry.basic.government,
      explanation: `${targetCountry.nameJa}の統治機構の骨格です。国家元首（大統領か君主か）と議院内閣制の有無などの組み合わせが国の統治方針を決定づけています。`,
      mnemonic: `国家元首が大統領制か立憲君主制（国王）かを整理しておくと、社会科の正誤判定問題で迷いません。`,
    });

    // Q5: 年表並べ替え（もし年表があれば）または主要産業
    if (targetCountry.history.timeline.length >= 3) {
      const picked = shuffle(targetCountry.history.timeline).slice(0, 3);
      const sorted = [...picked].sort((a, b) => parseYear(a.year) - parseYear(b.year));
      const answer = sorted.map((t) => t.event).join(" → ");
      const wrongs = shuffle([
        [sorted[2], sorted[0], sorted[1]],
        [sorted[1], sorted[0], sorted[2]],
        [sorted[2], sorted[1], sorted[0]],
      ])
        .slice(0, 3)
        .map((set) => set.map((t) => t!.event).join(" → "))
        .filter((s) => s !== answer)
        .slice(0, 3);

      qList.push({
        country: targetCountry,
        prompt: `【${targetCountry.nameJa}】歴史出来事を古い順に並べたものは？`,
        choices: shuffle([answer, ...wrongs]).map((s) => ({ id: s, label: s })),
        answerId: answer,
        explanation: `出来事の年代順：\n${sorted.map((t, i) => `${i + 1}. 【${t.year}年】${t.event}`).join("\n")}`,
        mnemonic: `一番古い出来事「${sorted[0]?.year}年」を時代のアンカー（基準）にして因果関係を追っていきましょう。`,
      });
    }

    // 残りのスロットを targetCountry の examPoints で埋める（最大10問）
    const needed = QUESTION_COUNT - qList.length;
    const examPool = targetCountry.examPoints.slice(0, needed);
    const allOtherExams = countries.filter((c) => c.iso3 !== targetCountry.iso3).flatMap((c) => c.examPoints.map((ep) => ep.a));
    examPool.forEach((ep) => {
      const wrongPool = shuffle(allOtherExams.filter((a) => a !== ep.a)).slice(0, 3);
      const { explanation, mnemonic } = generateExamExplanation(targetCountry, ep.q, ep.a);
      qList.push({
        country: targetCountry,
        prompt: `【${targetCountry.nameJa}】入試頻出ポイント`,
        textHint: `Q. ${ep.q}`,
        choices: shuffle([{ id: ep.a, label: ep.a }, ...wrongPool.map((w) => ({ id: w, label: w }))]),
        answerId: ep.a,
        explanation,
        mnemonic,
      });
    });

    return qList.slice(0, QUESTION_COUNT);
  }

  // === 全世界モードの場合 ===
  const unusedPool = shuffle(countries.filter((c) => !usedCodes.has(c.iso3)));
  const pool = unusedPool.length >= QUESTION_COUNT
    ? unusedPool
    : [...unusedPool, ...shuffle(countries.filter((c) => usedCodes.has(c.iso3)))];

  // 1. 国旗あて
  if (mode === "flag") {
    const selected = pool.slice(0, QUESTION_COUNT);
    return selected.map((c, qIdx) => {
      const wrongPool = countries.filter((o) => o.iso3 !== c.iso3);
      const wrongCountries = shuffle(wrongPool).slice(0, 3);
      const answerChoice = { id: c.iso3, label: c.nameJa };
      const wrongChoices = wrongCountries.map((o) => ({ id: o.iso3, label: o.nameJa }));
      const choices = shuffle([answerChoice, ...wrongChoices]);
      return {
        country: c,
        prompt: `第${qIdx + 1}問：この国旗の国はどこ？`,
        flagHint: c.flag,
        choices,
        answerId: c.iso3,
        explanation: `${c.nameJa}（${continentLabel(c.continent)}、首都：${c.basic.capital}）の正式な国旗です。使用されている色彩やシンボル（太陽・月・星・動物・紋章など）は、その国の風土や独立運動の理念を表現しています。`,
        mnemonic: `国旗のデザイン（色使いや象徴シンボル）と国名「${c.nameJa}」をセットで視覚的に焼き付けましょう。`,
      };
    });
  }

  // 2. 国旗えらび
  if (mode === "flag_choice") {
    const selected = pool.slice(0, QUESTION_COUNT);
    return selected.map((c) => {
      const wrongPool = countries.filter((o) => o.iso3 !== c.iso3);
      const wrongCountries = shuffle(wrongPool).slice(0, 3);
      const answerChoice = { id: c.iso3, label: c.nameJa, flag: c.flag };
      const wrongChoices = wrongCountries.map((o) => ({ id: o.iso3, label: o.nameJa, flag: o.flag }));
      const choices = shuffle([answerChoice, ...wrongChoices]);
      return {
        country: c,
        prompt: `${c.nameJa}（${c.nameEn}）の国旗はどれ？`,
        choices,
        answerId: c.iso3,
        explanation: `${c.nameJa}（${continentLabel(c.continent)}、首都：${c.basic.capital}）の国旗です。国土面積は約${c.basic.area.toLocaleString()} km²。`,
        mnemonic: `似ている配色の国旗と混同しやすいので、中央の紋章やストライプの向き・星の配置に注目するのがポイントです。`,
        isFlagGrid: true,
      };
    });
  }

  // 3. 首都あて
  if (mode === "capital") {
    const selected = pool.slice(0, QUESTION_COUNT);
    return selected.map((c) => {
      const wrongCapitals = shuffle(
        countries.filter((o) => o.iso3 !== c.iso3 && o.basic.capital !== c.basic.capital)
      )
        .slice(0, 3)
        .map((o) => ({ id: o.basic.capital, label: o.basic.capital }));
      const answerChoice = { id: c.basic.capital, label: c.basic.capital };
      const choices = shuffle([answerChoice, ...wrongCapitals]);
      return {
        country: c,
        prompt: `${c.nameJa}（${c.nameEn}）の首都はどこ？`,
        choices,
        answerId: c.basic.capital,
        explanation: `${c.nameJa}（${continentLabel(c.continent)}）の政治・行政機能が置かれた中心都市です（公用語：${c.basic.languages}）。経済的な最大都市と首都が異なる国は特にテストで混同しやすいため注意が必要です。`,
        mnemonic: `「${c.nameJa}の首都は${c.basic.capital}」と音読のリズムで覚えるのが効果的です。最大都市ではなく政治の中心都市として暗記しましょう。`,
      };
    });
  }

  // 4. 受験ポイント
  if (mode === "exam") {
    const allExamItems: { country: Country; q: string; a: string }[] = [];
    for (const country of pool) {
      for (const ep of country.examPoints) {
        allExamItems.push({ country, q: ep.q, a: ep.a });
      }
    }
    const shuffledExams = shuffle(allExamItems).slice(0, QUESTION_COUNT);
    return shuffledExams.map((item) => {
      const wrongAnswers = shuffle(
        allExamItems.filter((o) => o.a !== item.a && o.country.iso3 !== item.country.iso3)
      )
        .slice(0, 3)
        .map((o) => ({ id: o.a, label: o.a }));
      const answerChoice = { id: item.a, label: item.a };
      const choices = shuffle([answerChoice, ...wrongAnswers]);
      const { explanation, mnemonic } = generateExamExplanation(item.country, item.q, item.a);
      return {
        country: item.country,
        prompt: `【${item.country.nameJa}】重要入試ポイント`,
        textHint: `Q. ${item.q}`,
        choices,
        answerId: item.a,
        explanation,
        mnemonic,
      };
    });
  }

  // 5. 年表並べ替え
  return pool
    .filter((c) => c.history.timeline.length >= 3)
    .slice(0, QUESTION_COUNT)
    .map((c) => {
      const picked = shuffle(c.history.timeline).slice(0, 3);
      const sorted = [...picked].sort((a, b) => parseYear(a.year) - parseYear(b.year));
      const answer = sorted.map((t) => t.event).join(" → ");
      const wrongs = shuffle([
        [sorted[2], sorted[0], sorted[1]],
        [sorted[1], sorted[0], sorted[2]],
        [sorted[2], sorted[1], sorted[0]],
      ])
        .slice(0, 3)
        .map((set) => set.map((t) => t!.event).join(" → "))
        .filter((s) => s !== answer)
        .slice(0, 3);

      const allChoices = shuffle([answer, ...wrongs]).map((str) => ({ id: str, label: str }));
      return {
        country: c,
        prompt: `${c.nameJa}の歴史的出来事を古い順に並べたものはどれ？`,
        choices: allChoices,
        answerId: answer,
        explanation: `歴史の歩み・年代順：\n${sorted.map((t, i) => `${i + 1}. 【${t.year}年】${t.event}`).join("\n")}`,
        mnemonic: `最初の出来事「${sorted[0]?.year}年」を基準に、時代の流れ（因果関係）を意識すると並べ替えを間違えません。`,
      };
    });
}

function QuizPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  // 選択された特定の国（URLパラメータまたはローカルステート）
  const [selectedIso3, setSelectedIso3] = useState<string | null>(
    search.country ? search.country.toUpperCase() : null
  );

  const selectedCountry = useMemo(() => {
    return selectedIso3 ? byIso3(selectedIso3) : undefined;
  }, [selectedIso3]);

  // モード：国選択時はデフォルトで "exam"（受験ポイント）
  const [mode, setMode] = useState<Mode>(() => {
    if (search.mode) return search.mode;
    return search.country ? "exam" : "flag";
  });

  const [seed, setSeed] = useState(0);
  const [usedCountryCodes, setUsedCountryCodes] = useState<Set<string>>(new Set());
  const [index, setIndex] = useState(0);
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [correct, setCorrect] = useState(0);
  const [done, setDone] = useState(false);

  // 自動スクロール用Ref（全デバイス対応）
  const nextButtonRef = useRef<HTMLButtonElement | null>(null);
  const questionCardRef = useRef<HTMLDivElement | null>(null);

  // 答えを選択したとき、次へボタンへ自動スクロール（スマホ・タブレット・PC全対応）
  useEffect(() => {
    if (!pickedId) return;
    const timer = setTimeout(() => {
      if (nextButtonRef.current) {
        nextButtonRef.current.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "nearest",
        });
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [pickedId]);

  // 国検索用
  const [searchQuery, setSearchQuery] = useState("");
  const [isCountryPickerOpen, setIsCountryPickerOpen] = useState(false);

  const addResult = useProgress((s) => s.addResult);
  const recordWrong = useProgress((s) => s.recordWrong);

  // URLパラメータの同期
  useEffect(() => {
    if (search.country && search.country.toUpperCase() !== selectedIso3) {
      setSelectedIso3(search.country.toUpperCase());
      setMode(search.mode ?? "exam");
      setIndex(0);
      setPickedId(null);
      setCorrect(0);
      setDone(false);
      setSeed((s) => s + 1);
    }
  }, [search.country, search.mode, selectedIso3]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const questions = useMemo(
    () => buildQuestions(mode, usedCountryCodes, selectedCountry),
    [mode, seed, selectedCountry]
  );
  const q = questions[index];

  // プリロード
  useMemo(() => {
    if (typeof window !== "undefined" && questions) {
      const nextQ = questions[index + 1];
      if (nextQ?.flagHint) {
        const iso2 = nextQ.flagHint
          ? String.fromCharCode(
              (nextQ.flagHint.codePointAt(0) || 0) - 0x1f1e6 + 65,
              (nextQ.flagHint.codePointAt(2) || 0) - 0x1f1e6 + 65
            ).toLowerCase()
          : "";
        if (iso2) {
          const img = new Image();
          img.src = `https://flagcdn.com/${iso2}.svg`;
        }
      }
    }
  }, [questions, index]);

  const restart = (nextMode: Mode = mode, nextCountry?: Country | null) => {
    if (nextCountry !== undefined) {
      setSelectedIso3(nextCountry ? nextCountry.iso3 : null);
      navigate({
        search: {
          country: nextCountry ? nextCountry.iso3.toLowerCase() : undefined,
          mode: nextMode,
        },
      });
    }
    setMode(nextMode);
    setSeed((s) => s + 1);
    setIndex(0);
    setPickedId(null);
    setCorrect(0);
    setDone(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSelectCountry = (c: Country | null) => {
    setIsCountryPickerOpen(false);
    setSearchQuery("");
    if (c) {
      setSelectedIso3(c.iso3);
      setMode("exam");
      restart("exam", c);
    } else {
      setSelectedIso3(null);
      setMode("flag");
      restart("flag", null);
    }
  };

  const handleSwitchToCountryMode = () => {
    if (selectedCountry) {
      setIsCountryPickerOpen((prev) => !prev);
    } else {
      // まだ国が未選択の場合、日本を初期選択して即時国特訓モードを開始
      const defaultCountry = byIso3("JPN") ?? countries[0];
      if (defaultCountry) {
        handleSelectCountry(defaultCountry);
        setIsCountryPickerOpen(true);
      }
    }
  };

  const answer = (choiceId: string) => {
    if (pickedId) return;
    setPickedId(choiceId);
    if (choiceId === q?.answerId) {
      setCorrect((c) => c + 1);
    } else if (q?.country?.iso3) {
      recordWrong(q.country.iso3);
    }
  };

  const next = () => {
    if (index + 1 >= questions.length) {
      const finalScore = correct;
      const modeObj = (selectedCountry ? COUNTRY_MODES : GLOBAL_MODES).find((m) => m.id === mode);
      const title = selectedCountry
        ? `${selectedCountry.nameJa}（${modeObj?.label ?? "特化"}）`
        : modeObj?.label ?? "総合";
      addResult({ mode: title, correct: finalScore, total: questions.length });
      setDone(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setIndex((i) => i + 1);
    setPickedId(null);
    setTimeout(() => {
      questionCardRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 60);
  };

  // 検索フィルタされた国一覧
  const filteredCountries = useMemo(() => {
    if (!searchQuery.trim()) return sortedCountries;
    const q = searchQuery.toLowerCase().trim();
    return sortedCountries.filter(
      (c) =>
        c.nameJa.toLowerCase().includes(q) ||
        c.nameEn.toLowerCase().includes(q) ||
        c.basic.capital.toLowerCase().includes(q) ||
        c.iso3.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  return (
    <div className="min-h-screen pb-16">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold flex items-center gap-2.5 text-foreground tracking-tight">
              <span>世界地理・歴史マスタークイズ</span>
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-xl">
              国旗・首都・入試頻出ポイント・歴史年表。全198ヵ国のランダム出題や、選択した国の集中特訓に対応。
            </p>
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-xl border border-sky-500/25 bg-sky-500/10 px-3 py-1.5 text-xs font-semibold text-sky-700 dark:text-sky-300 shadow-2xs whitespace-nowrap self-start sm:self-auto shrink-0">
            <GraduationCap className="size-3.5 text-sky-500 shrink-0" />
            <span>入試頻出 1,980問</span>
          </div>
        </div>

        {/* 1. 出題スコープ切り替え（全世界 or 特定の国） */}
        <div className="mt-5 rounded-2xl border border-border/80 bg-card p-3 sm:p-4 shadow-xs">
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
              <Target className="size-4 text-sky-500" />
              <span>クイズの出題対象</span>
            </span>
            {selectedCountry && (
              <button
                type="button"
                onClick={() => handleSelectCountry(null)}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                <X className="size-3.5" />
                <span>全世界ランダムに戻す</span>
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleSelectCountry(null)}
              className={cn(
                "flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all shadow-xs cursor-pointer",
                !selectedCountry
                  ? "border-sky-500 bg-sky-500 text-white shadow-sky-500/20"
                  : "border-border bg-card hover:bg-secondary text-foreground"
              )}
            >
              <span>🌍 全世界から出題</span>
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.2 text-[10px]",
                  !selectedCountry ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                )}
              >
                198ヵ国
              </span>
            </button>

            <button
              type="button"
              onClick={handleSwitchToCountryMode}
              className={cn(
                "flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all shadow-xs cursor-pointer",
                selectedCountry
                  ? "border-sky-500 bg-sky-500 text-white shadow-sky-500/20"
                  : "border-border bg-card hover:bg-secondary text-foreground"
              )}
            >
              <Target className="size-3.5" />
              <span>{selectedCountry ? `特訓中: ${selectedCountry.nameJa}` : "🎯 国を選んで集中特訓"}</span>
              {selectedCountry && <FlagImage flag={selectedCountry.flag} size="xs" />}
            </button>
          </div>

          {/* 国特化モード選択中：プレビュー ＆ クイック変更ピル */}
          {selectedCountry && (
            <div className="mt-3 space-y-2 animate-fadeIn">
              <div className="flex items-center justify-between gap-3 rounded-xl border border-sky-500/30 bg-sky-500/10 p-2.5 sm:p-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <FlagImage flag={selectedCountry.flag} size="md" className="rounded shadow-xs shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-display font-bold text-foreground text-sm sm:text-base truncate">
                        {selectedCountry.nameJa}
                      </span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {continentLabel(selectedCountry.continent)}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">
                      首都: {selectedCountry.basic.capital} · 受験頻出問題: {selectedCountry.examPoints.length}問完備
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsCountryPickerOpen((prev) => !prev)}
                  className="h-7 px-2.5 text-xs shrink-0 gap-1"
                >
                  <Search className="size-3" />
                  <span>{isCountryPickerOpen ? "閉じる" : "全198ヵ国から探す"}</span>
                </Button>
              </div>

              {/* 主要国のクイック切り替えピル */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] font-semibold text-muted-foreground mr-1">
                  主要国クイック選択:
                </span>
                {POPULAR_COUNTRIES.map((iso3) => {
                  const c = byIso3(iso3);
                  if (!c) return null;
                  const isCur = selectedIso3 === c.iso3;
                  return (
                    <button
                      key={iso3}
                      type="button"
                      onClick={() => handleSelectCountry(c)}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors shadow-2xs cursor-pointer",
                        isCur
                          ? "border-sky-500 bg-sky-500 text-white"
                          : "border-border bg-card hover:bg-secondary hover:border-sky-500/40 text-foreground"
                      )}
                    >
                      <FlagImage flag={c.flag} size="xs" />
                      <span>{c.nameJa}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 国選択ピッカー（検索ボックス ＋ 198ヵ国一覧） */}
          {selectedCountry && isCountryPickerOpen && (
            <div className="mt-3 rounded-xl border border-border bg-background p-3 shadow-md animate-fadeIn space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="国名、首都、英名で検索（例: カナダ、オタワ、Canada）..."
                  className="w-full rounded-xl border border-border bg-card pl-9 pr-8 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>

              <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
                {filteredCountries.length > 0 ? (
                  filteredCountries.map((c) => (
                    <button
                      key={c.iso3}
                      type="button"
                      onClick={() => handleSelectCountry(c)}
                      className={cn(
                        "w-full flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-xs text-left hover:bg-secondary transition-colors",
                        selectedIso3 === c.iso3 ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold" : "text-foreground"
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FlagImage flag={c.flag} size="xs" />
                        <span className="truncate">{c.nameJa}</span>
                        <span className="text-[10px] text-muted-foreground truncate">（首都: {c.basic.capital}）</span>
                      </div>
                      <Badge variant="outline" className="text-[9px] shrink-0">
                        {continentLabel(c.continent)}
                      </Badge>
                    </button>
                  ))
                ) : (
                  <p className="py-4 text-center text-xs text-muted-foreground">
                    該当する国が見つかりません。
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 2. クイズモード選択タブ */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-muted-foreground">
              {selectedCountry ? `【${selectedCountry.nameJa}】のクイズ種別` : "クイズの種別"}
            </span>
            <span className="text-[11px] text-muted-foreground">全{questions.length}問</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {(selectedCountry ? COUNTRY_MODES : GLOBAL_MODES).map((m) => (
              <button
                key={m.id}
                onClick={() => restart(m.id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all shadow-xs",
                  mode === m.id
                    ? "border-sky-500 bg-sky-500 text-white shadow-sky-500/20"
                    : "border-border bg-card text-foreground hover:bg-secondary"
                )}
                title={m.desc}
              >
                <span>{m.icon}</span>
                <span>{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 3. クイズ結果画面 */}
        {done ? (
          <div className="surface-card mt-6 animate-pop p-6 text-center">
            <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-sky-500/10 text-sky-500">
              <Award className="size-7" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">チャレンジ結果</p>
            <p className="font-display text-4xl font-extrabold text-sky-500 my-1">
              {correct} / {questions.length}
            </p>
            <p className="text-sm font-medium">
              正答率 {Math.round((correct / questions.length) * 100)}%
              （{selectedCountry ? `${selectedCountry.nameJa}・` : ""}
              {(selectedCountry ? COUNTRY_MODES : GLOBAL_MODES).find((m) => m.id === mode)?.label}）
            </p>

            {/* 今回出題された問題の振り返り */}
            <div className="mt-6 rounded-2xl border border-border bg-muted/40 p-4 text-left">
              <p className="text-xs font-bold text-muted-foreground flex items-center gap-1.5 mb-3">
                <BookOpen className="size-3.5" /> 今回出題された内容の振り返り：
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {questions.map((item, idx) => (
                  <div
                    key={`${item.country.iso3}-${idx}`}
                    className="flex items-start gap-2.5 rounded-xl border border-border/60 bg-card p-2.5 text-xs shadow-2xs"
                  >
                    <FlagImage flag={item.country.flag} size="xs" className="shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-foreground leading-snug">{item.prompt}</p>
                      <p className="text-[11px] text-sky-600 dark:text-sky-400 font-medium mt-1 leading-snug break-words">
                        正解: {item.answerId}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button className="font-semibold gap-1.5 shadow-sm" onClick={() => restart()}>
                <RefreshCw className="size-4" /> もう一度挑戦する
              </Button>
              {selectedCountry && (
                <Button
                  variant="outline"
                  className="font-semibold"
                  onClick={() => handleSelectCountry(null)}
                >
                  🌍 全世界クイズに切り替え
                </Button>
              )}
            </div>
          </div>
        ) : (
          q && (
            <div ref={questionCardRef} className="surface-card mt-6 p-5 sm:p-6 shadow-sm scroll-mt-20">
              <div className="flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 flex-1">
                  <Progress
                    value={((index + (pickedId ? 1 : 0)) / questions.length) * 100}
                    className="h-2 flex-1"
                  />
                </div>
                <span className="whitespace-nowrap font-bold text-muted-foreground">
                  第{index + 1}問 / 全{questions.length}問
                </span>
              </div>

              {/* 国旗ヒントの画像表示（国旗あてモード用・高精細SVG） */}
              {q.flagHint && (
                <div className="mt-6 flex flex-col items-center justify-center">
                  <div className="overflow-hidden rounded-xl border border-border/80 shadow-md bg-card p-2">
                    <FlagImage
                      key={`flag-hint-${q.country.iso3}`}
                      flag={q.flagHint}
                      loading="eager"
                      size="2xl"
                      className="w-44 h-28 sm:w-56 sm:h-36 object-cover rounded-lg"
                    />
                  </div>
                </div>
              )}

              {/* テキストヒント（受験問題用など） */}
              {q.textHint && (
                <div className="mt-5 rounded-2xl border border-sky-500/25 bg-sky-500/5 p-4 text-left font-medium text-foreground text-sm sm:text-base leading-relaxed">
                  {q.textHint}
                </div>
              )}

              {/* 問題文 */}
              <h2 className="mt-5 font-display text-lg font-bold leading-snug flex items-center gap-2">
                {!q.flagHint && mode !== "flag_choice" && !q.isFlagGrid && (
                  <FlagImage flag={q.country.flag} size="md" className="rounded shadow-xs shrink-0" />
                )}
                <span>{q.prompt}</span>
              </h2>

              {/* 選択肢一覧 */}
              <div className={cn("mt-5 grid gap-2.5", q.isFlagGrid ? "grid-cols-2 gap-3.5" : "grid-cols-1")}>
                {q.choices.map((choice) => {
                  const isAnswer = choice.id === q.answerId;
                  const state = !pickedId ? "idle" : isAnswer ? "correct" : choice.id === pickedId ? "wrong" : "idle";
                  return (
                    <button
                      key={choice.id}
                      onClick={() => answer(choice.id)}
                      disabled={!!pickedId}
                      className={cn(
                        "flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-all shadow-xs cursor-pointer",
                        state === "idle" && "border-border bg-card hover:border-sky-500/50 hover:bg-secondary/40",
                        state === "correct" && "border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold",
                        state === "wrong" && "border-destructive bg-destructive/15 text-destructive font-bold"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {choice.flag && (
                          <FlagImage
                            flag={choice.flag}
                            size="lg"
                            className="rounded shadow-xs shrink-0 object-cover w-14 h-9 sm:w-16 sm:h-10"
                          />
                        )}
                        <span className="text-xs sm:text-sm leading-relaxed break-words">{choice.label}</span>
                      </div>
                      {state === "correct" && <Check className="size-5 shrink-0 text-emerald-500" />}
                      {state === "wrong" && <X className="size-5 shrink-0 text-destructive" />}
                    </button>
                  );
                })}
              </div>

              {/* 解答後の解説 & 次へボタン */}
              {pickedId && (
                <div className="mt-5 rounded-2xl border border-border bg-card p-4 sm:p-5 animate-fadeIn shadow-xs space-y-4">
                  {pickedId === q.answerId ? (
                    /* 正解時：説明不要！祝福メッセージと次へボタンのみでテンポ良く */
                    <div className="flex items-center justify-between gap-2 py-1">
                      <div className="flex items-center gap-2 font-bold text-sm sm:text-base text-emerald-600 dark:text-emerald-400">
                        <Check className="size-5 shrink-0" />
                        <span>正解！素晴らしい！</span>
                      </div>
                      <span className="text-xs text-muted-foreground hidden sm:inline font-medium">
                        ナイス正解！次の問題へ進みましょう ➜
                      </span>
                    </div>
                  ) : (
                    /* 不正解時：色数を抑えた洗練されたレイアウトで解説を表示 */
                    <div className="space-y-4">
                      {/* 正しい正解 ＆ 要復習ステータス（1つのすっきりしたヘッダーに整理） */}
                      <div className="rounded-xl border border-border/70 bg-muted/40 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div className="space-y-1">
                          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                            正しい正解
                          </span>
                          <div className="flex items-center gap-2.5 font-bold text-sm sm:text-base text-foreground">
                            {q.choices.find((c) => c.id === q.answerId)?.flag && (
                              <FlagImage
                                flag={q.choices.find((c) => c.id === q.answerId)!.flag!}
                                size="sm"
                                className="rounded shadow-2xs shrink-0 object-cover"
                              />
                            )}
                            <span className="break-words">
                              {q.choices.find((c) => c.id === q.answerId)?.label ?? q.answerId}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground self-start sm:self-center shrink-0">
                          <X className="size-3.5 text-destructive shrink-0" />
                          <span>要復習リストに追加</span>
                        </div>
                      </div>

                      {/* 背景知識 & 暗記のコツ（過剰な色分けを廃止し、統一感あるニュートラルトーンへ） */}
                      <div className="space-y-3 pt-1">
                        <div className="flex items-center gap-2 font-semibold text-xs sm:text-sm text-foreground">
                          <BookOpen className="size-4 shrink-0 text-muted-foreground" />
                          <span>背景知識・ポイント解説</span>
                        </div>
                        <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed whitespace-pre-line pl-6">
                          {q.explanation}
                        </p>

                        {q.mnemonic && (
                          <div className="ml-6 mt-3 rounded-lg border-l-2 border-primary/70 bg-muted/30 px-3.5 py-2.5 text-xs sm:text-sm">
                            <div className="font-semibold text-foreground mb-1 flex items-center gap-1.5">
                              <Lightbulb className="size-3.5 shrink-0 text-primary" />
                              <span>暗記のコツ・試験対策</span>
                            </div>
                            <p className="leading-relaxed text-muted-foreground">{q.mnemonic}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <Button
                    ref={nextButtonRef}
                    className="mt-2 w-full font-semibold gap-1.5 shadow-xs scroll-my-8 cursor-pointer"
                    onClick={next}
                  >
                    <span>{index + 1 >= questions.length ? "結果を見る" : "次の問題へ"}</span>
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              )}
            </div>
          )
        )}
      </main>
    </div>
  );
}
