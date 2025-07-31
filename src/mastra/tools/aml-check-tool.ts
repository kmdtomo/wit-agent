import { createTool } from "@mastra/core/tools";
import { z } from "zod";

// 模擬AMLデータベース（PEPs、犯罪歴、注意人物リスト等）
const amlDatabase = [
  {
    id: "PEP-001",
    name: "政治的重要人物",
    aliases: ["Politically Exposed Person", "Important Official"],
    category: "PEP",
    position: "Former Minister",
    country: "Country A",
    riskLevel: "High",
    lastUpdated: "2023-11-15",
    sources: ["World Check", "Dow Jones"],
    details:
      "Former high-ranking government official with potential corruption links",
  },
  {
    id: "CRIM-002",
    name: "Criminal Record Person",
    aliases: ["Convicted Individual", "Former Convict"],
    category: "Criminal Record",
    position: "Business Owner",
    country: "Country B",
    riskLevel: "High",
    lastUpdated: "2023-10-20",
    sources: ["Criminal Records", "Media Reports"],
    details: "Convicted of money laundering in 2019, released in 2022",
  },
  {
    id: "WATCH-003",
    name: "高リスク企業",
    aliases: ["High Risk Company", "Suspicious Entity"],
    category: "Watch List",
    position: "Corporation",
    country: "Country C",
    riskLevel: "Medium",
    lastUpdated: "2023-12-01",
    sources: ["Financial Intelligence Unit", "Media"],
    details:
      "Multiple suspicious transaction reports filed against this entity",
  },
  {
    id: "PEP-004",
    name: "田中太郎",
    aliases: ["Taro Tanaka", "田中 太郎"],
    category: "PEP",
    position: "Former Mayor",
    country: "Japan",
    riskLevel: "Medium",
    lastUpdated: "2023-08-30",
    sources: ["Japanese PEP Database"],
    details: "Former local government official, served as mayor from 2015-2023",
  },
];

// 地理的リスク評価
const countryRiskLevels = {
  "Country A": "High",
  "Country B": "Medium",
  "Country C": "High",
  Japan: "Low",
  Unknown: "Medium",
};

// 業界別リスク評価
const industryRiskLevels = {
  Finance: "High",
  Technology: "Medium",
  "Real Estate": "High",
  Government: "High",
  Trading: "High",
  Unknown: "Medium",
};

function calculateAMLRiskScore(
  matches: any[],
  countryRisk: string,
  industryRisk: string
): number {
  let score = 0;

  // マッチに基づくスコア
  matches.forEach((match) => {
    switch (match.riskLevel) {
      case "High":
        score += 3;
        break;
      case "Medium":
        score += 2;
        break;
      case "Low":
        score += 1;
        break;
    }

    // カテゴリ別追加スコア
    switch (match.category) {
      case "PEP":
        score += 2;
        break;
      case "Criminal Record":
        score += 4;
        break;
      case "Watch List":
        score += 1;
        break;
    }
  });

  // 地理的リスク
  switch (countryRisk) {
    case "High":
      score += 2;
      break;
    case "Medium":
      score += 1;
      break;
  }

  // 業界リスク
  switch (industryRisk) {
    case "High":
      score += 2;
      break;
    case "Medium":
      score += 1;
      break;
  }

  return Math.min(score, 10); // 最大10点
}

export const amlCheckTool = createTool({
  id: "aml-check",
  description: "AMLデータベース（PEPs、犯罪歴、注意人物等）との照合を行います",
  inputSchema: z.object({
    name: z.string().describe("チェック対象の名前（個人名または会社名）"),
    country: z.string().optional().describe("関連国・地域"),
    industry: z.string().optional().describe("業界・業種"),
    additionalInfo: z
      .string()
      .optional()
      .describe("追加情報（役職、業務内容等）"),
  }),
  outputSchema: z.object({
    checkId: z.string(),
    searchName: z.string(),
    matches: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        aliases: z.array(z.string()),
        category: z.string(),
        position: z.string(),
        country: z.string(),
        riskLevel: z.string(),
        lastUpdated: z.string(),
        sources: z.array(z.string()),
        details: z.string(),
        matchScore: z.number(),
      })
    ),
    riskAnalysis: z.object({
      overallRiskScore: z.number(),
      riskLevel: z.string(),
      countryRisk: z.string(),
      industryRisk: z.string(),
      pepStatus: z.boolean(),
      criminalRecord: z.boolean(),
      watchListStatus: z.boolean(),
    }),
    checkTimestamp: z.string(),
    recommendations: z.array(z.string()),
    additionalChecks: z.array(z.string()),
  }),
  execute: async ({ context }) => {
    const {
      name,
      country = "Unknown",
      industry = "Unknown",
      additionalInfo = "",
    } = context;
    const checkId = `AML-${Date.now()}`;
    const checkTimestamp = new Date().toISOString();

    console.log(`AMLチェック開始: ${name}`);

    // 名前での検索
    const matches = amlDatabase
      .map((entry) => {
        const nameMatch =
          entry.name.toLowerCase().includes(name.toLowerCase()) ||
          name.toLowerCase().includes(entry.name.toLowerCase()) ||
          entry.aliases.some(
            (alias) =>
              alias.toLowerCase().includes(name.toLowerCase()) ||
              name.toLowerCase().includes(alias.toLowerCase())
          );

        if (nameMatch) {
          // マッチスコア計算
          let matchScore = 0.7; // 基本スコア
          if (entry.name.toLowerCase() === name.toLowerCase()) matchScore = 1.0;
          else if (
            entry.aliases.some(
              (alias) => alias.toLowerCase() === name.toLowerCase()
            )
          )
            matchScore = 0.95;

          return { ...entry, matchScore };
        }
        return null;
      })
      .filter((entry) => entry !== null)
      .sort((a, b) => b!.matchScore - a!.matchScore);

    // リスク分析
    const countryRisk =
      countryRiskLevels[country as keyof typeof countryRiskLevels] || "Medium";
    const industryRisk =
      industryRiskLevels[industry as keyof typeof industryRiskLevels] ||
      "Medium";

    const pepStatus = matches.some((m) => m.category === "PEP");
    const criminalRecord = matches.some(
      (m) => m.category === "Criminal Record"
    );
    const watchListStatus = matches.some((m) => m.category === "Watch List");

    const overallRiskScore = calculateAMLRiskScore(
      matches,
      countryRisk,
      industryRisk
    );

    let riskLevel = "Low";
    if (overallRiskScore >= 7) riskLevel = "Critical";
    else if (overallRiskScore >= 5) riskLevel = "High";
    else if (overallRiskScore >= 3) riskLevel = "Medium";

    // 推奨事項
    const recommendations: string[] = [];
    const additionalChecks: string[] = [];

    if (pepStatus) {
      recommendations.push(
        "PEP（政治的重要人物）として上級管理者の承認が必要です"
      );
      additionalChecks.push("Enhanced Due Diligence (EDD)の実施");
      additionalChecks.push("資金源の詳細確認");
    }

    if (criminalRecord) {
      recommendations.push(
        "犯罪歴が確認されました。取引を停止し、法務部門に相談してください"
      );
      additionalChecks.push("法的リスク評価");
    }

    if (watchListStatus) {
      recommendations.push(
        "注意人物リストに該当します。継続的モニタリングが必要です"
      );
      additionalChecks.push("取引パターンの監視");
    }

    if (countryRisk === "High") {
      recommendations.push(
        "高リスク国・地域です。追加の本人確認書類が必要です"
      );
      additionalChecks.push("制裁国チェック");
    }

    if (matches.length === 0) {
      recommendations.push(
        "現時点でAMLデータベースとの一致は確認されませんでした"
      );
      recommendations.push("標準的なKYC（顧客確認）手続きを継続してください");
    }

    return {
      checkId,
      searchName: name,
      matches,
      riskAnalysis: {
        overallRiskScore,
        riskLevel,
        countryRisk,
        industryRisk,
        pepStatus,
        criminalRecord,
        watchListStatus,
      },
      checkTimestamp,
      recommendations,
      additionalChecks,
    };
  },
});
