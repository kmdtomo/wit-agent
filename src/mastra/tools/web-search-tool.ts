import { createTool } from "@mastra/core/tools";
import { z } from "zod";

// Web検索専用ツール
export const webSearchTool = createTool({
  id: "web-search",
  description:
    "インターネット上で最新情報を検索し、コンプライアンスチェックに必要な情報を取得します",
  inputSchema: z.object({
    query: z.string().describe("検索クエリ"),
    maxResults: z.number().optional().default(5).describe("最大検索結果数"),
    searchType: z
      .enum(["general", "sanctions", "aml", "news"])
      .optional()
      .default("general")
      .describe("検索タイプ"),
  }),
  outputSchema: z.object({
    results: z.array(
      z.object({
        title: z.string(),
        snippet: z.string(),
        url: z.string(),
        relevanceScore: z.number(),
      })
    ),
    totalResults: z.number(),
    searchTime: z.number(),
    query: z.string(),
  }),
  execute: async ({ context }) => {
    const { query, maxResults = 5, searchType = "general" } = context;
    const startTime = Date.now();

    console.log(`🔍 Web検索実行: "${query}" (タイプ: ${searchType})`);

    try {
      // 注意: 実際の実装では、適切なWeb検索APIを使用してください
      // 現在は開発目的の模擬実装です
      const searchResults = await performWebSearch(
        query,
        maxResults,
        searchType
      );

      const processingTime = Date.now() - startTime;

      console.log(
        `✅ Web検索完了: ${searchResults.length}件の結果 (${processingTime}ms)`
      );

      return {
        results: searchResults,
        totalResults: searchResults.length,
        searchTime: processingTime,
        query,
      };
    } catch (error) {
      console.error(`❌ Web検索エラー: ${error}`);

      return {
        results: [],
        totalResults: 0,
        searchTime: Date.now() - startTime,
        query,
      };
    }
  },
});

// Web検索の実行関数（実際のAPI統合ポイント）
async function performWebSearch(
  query: string,
  maxResults: number,
  searchType: string
): Promise<any[]> {
  // 実際の実装では、以下のようなAPIを使用できます：
  // - Google Custom Search API
  // - Bing Search API
  // - DuckDuckGo API
  // - 専門的なコンプライアンスデータベースAPI

  // 現在は高品質な模擬データを返します
  return generateHighQualityMockResults(query, maxResults, searchType);
}

// 高品質な模擬検索結果の生成
function generateHighQualityMockResults(
  query: string,
  maxResults: number,
  searchType: string
): any[] {
  const results = [];
  const queryLower = query.toLowerCase();

  // 制裁リスト関連の検索
  if (
    searchType === "sanctions" ||
    queryLower.includes("sanctions") ||
    queryLower.includes("制裁")
  ) {
    const sanctionsResults = generateSanctionsResults(query);
    results.push(...sanctionsResults);
  }

  // AML/PEP関連の検索
  if (
    searchType === "aml" ||
    queryLower.includes("pep") ||
    queryLower.includes("aml")
  ) {
    const amlResults = generateAMLResults(query);
    results.push(...amlResults);
  }

  // ニュース検索
  if (
    searchType === "news" ||
    queryLower.includes("news") ||
    queryLower.includes("scandal")
  ) {
    const newsResults = generateNewsResults(query);
    results.push(...newsResults);
  }

  // 一般検索（すべてのタイプを含む）
  if (searchType === "general") {
    results.push(...generateSanctionsResults(query));
    results.push(...generateAMLResults(query));
    results.push(...generateNewsResults(query));
  }

  // 関連度でソートし、最大結果数に制限
  return results
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, maxResults);
}

function generateSanctionsResults(query: string): any[] {
  const nameMatch = query.match(/["""]([^"""]+)["""]/);
  const searchName = nameMatch ? nameMatch[1] : query.split(" ")[0];

  const sanctionsTemplates = [
    {
      condition: (name: string) =>
        ["vladimir", "putin"].every((k) => name.toLowerCase().includes(k)),
      results: [
        {
          title: "OFAC Sanctions - Vladimir Putin",
          snippet:
            "Vladimir Putin, President of Russia, designated under Executive Order 14024 for actions that threaten Ukraine's sovereignty. Full blocking sanctions imposed.",
          url: "https://treasury.gov/ofac/sanctions/putin",
          relevanceScore: 0.95,
        },
        {
          title: "EU Sanctions List - Putin Entry",
          snippet:
            "European Union consolidated sanctions list includes Vladimir Putin with asset freeze and travel ban measures effective 2022.",
          url: "https://europa.eu/sanctions/putin",
          relevanceScore: 0.9,
        },
      ],
    },
    {
      condition: (name: string) =>
        ["john", "smith"].every((k) => name.toLowerCase().includes(k)),
      results: [
        {
          title: "OFAC SDN List - John Smith",
          snippet:
            "John Smith designated for narcotics trafficking under Kingpin Act. Multiple aliases: J. Smith, Johnny Smith. Blocking sanctions in effect.",
          url: "https://treasury.gov/ofac/sdn/john-smith",
          relevanceScore: 0.85,
        },
      ],
    },
    {
      condition: (name: string) =>
        ["田中", "太郎"].some((k) => name.includes(k)),
      results: [
        {
          title: "金融庁 - 監視対象者リスト",
          snippet:
            "田中太郎氏について複数の疑わしい取引報告が提出されています。AML/CFT監視対象として継続的な注意が必要です。",
          url: "https://jfsa.go.jp/aml/watch-list/tanaka",
          relevanceScore: 0.8,
        },
      ],
    },
  ];

  for (const template of sanctionsTemplates) {
    if (template.condition(searchName)) {
      return template.results;
    }
  }

  return [];
}

function generateAMLResults(query: string): any[] {
  const nameMatch = query.match(/["""]([^"""]+)["""]/);
  const searchName = nameMatch ? nameMatch[1] : query.split(" ")[0];

  const amlTemplates = [
    {
      condition: (name: string) =>
        ["vladimir", "putin"].every((k) => name.toLowerCase().includes(k)),
      results: [
        {
          title: "World Check - Vladimir Putin PEP Profile",
          snippet:
            "Vladimir Putin classified as highest-level PEP (Head of State). Multiple sanctions and restrictions. Enhanced due diligence required.",
          url: "https://worldcheck.com/pep/putin",
          relevanceScore: 0.92,
        },
      ],
    },
    {
      condition: (name: string) =>
        ["xi", "jinping"].some((k) => name.toLowerCase().includes(k)),
      results: [
        {
          title: "PEP Database - Xi Jinping",
          snippet:
            "Xi Jinping, General Secretary Communist Party China, President PRC. Highest PEP classification. Subject to various sanctions.",
          url: "https://pep-database.com/xi-jinping",
          relevanceScore: 0.91,
        },
      ],
    },
    {
      condition: (name: string) =>
        ["田中", "太郎"].some((k) => name.includes(k)),
      results: [
        {
          title: "日本PEPデータベース - 田中太郎",
          snippet:
            "田中太郎 - 元地方自治体首長（2015-2023年市長）。PEP分類対象。退任後も継続的な監視が必要。",
          url: "https://pep-japan.go.jp/tanaka-taro",
          relevanceScore: 0.75,
        },
      ],
    },
  ];

  for (const template of amlTemplates) {
    if (template.condition(searchName)) {
      return template.results;
    }
  }

  return [];
}

function generateNewsResults(query: string): any[] {
  const nameMatch = query.match(/["""]([^"""]+)["""]/);
  const searchName = nameMatch ? nameMatch[1] : query.split(" ")[0];

  const newsTemplates = [
    {
      condition: (name: string) =>
        ["john", "smith"].every((k) => name.toLowerCase().includes(k)),
      results: [
        {
          title: "Criminal Conviction: Money Laundering Case",
          snippet:
            "John Smith convicted of money laundering charges in federal court. Sentenced to 4 years prison, released 2022 with probation conditions.",
          url: "https://news.example.com/smith-conviction",
          relevanceScore: 0.88,
        },
      ],
    },
    {
      condition: (name: string) => name.toLowerCase().includes("scandal"),
      results: [
        {
          title: "Financial Scandal Investigation Ongoing",
          snippet:
            "Authorities investigating large-scale financial fraud scheme involving multiple entities. Investigation ongoing with several arrests made.",
          url: "https://news.example.com/financial-scandal",
          relevanceScore: 0.82,
        },
      ],
    },
  ];

  for (const template of newsTemplates) {
    if (template.condition(searchName)) {
      return template.results;
    }
  }

  return [];
}

// 実際のWeb検索APIとの統合用ヘルパー関数
export async function searchWithExternalAPI(query: string): Promise<any[]> {
  // 実際の実装例：
  /*
  try {
    // Google Custom Search API使用例
    const response = await fetch(`https://customsearch.googleapis.com/customsearch/v1?key=${API_KEY}&cx=${SEARCH_ENGINE_ID}&q=${encodeURIComponent(query)}`);
    const data = await response.json();

    return data.items?.map((item: any) => ({
      title: item.title,
      snippet: item.snippet,
      url: item.link,
      relevanceScore: calculateRelevance(item, query)
    })) || [];
  } catch (error) {
    console.error('External API search failed:', error);
    return [];
  }
  */

  // 現在は模擬実装を使用
  return [];
}

// 関連度計算のヘルパー関数
function calculateRelevance(item: any, query: string): number {
  let score = 0.5; // 基本スコア

  const queryTerms = query.toLowerCase().split(/\s+/);
  const titleLower = item.title?.toLowerCase() || "";
  const snippetLower = item.snippet?.toLowerCase() || "";

  // タイトルでの一致
  queryTerms.forEach((term) => {
    if (titleLower.includes(term)) score += 0.2;
    if (snippetLower.includes(term)) score += 0.1;
  });

  // 制裁・AML関連キーワードでのボーナス
  const complianceKeywords = [
    "sanctions",
    "ofac",
    "pep",
    "aml",
    "criminal",
    "制裁",
    "監視",
  ];
  complianceKeywords.forEach((keyword) => {
    if (titleLower.includes(keyword) || snippetLower.includes(keyword)) {
      score += 0.15;
    }
  });

  return Math.min(score, 1.0);
}
