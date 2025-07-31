import { createTool } from "@mastra/core/tools";
import { z } from "zod";

// 模擬制裁リストデータ（実際のシステムでは外部APIを使用）
const sanctionsDatabase = [
  {
    id: "OFAC-001",
    name: "John Smith",
    aliases: ["John S.", "J. Smith", "Johnny Smith"],
    type: "Individual",
    listType: "OFAC SDN",
    country: "Country A",
    dateAdded: "2023-01-15",
    reason: "Drug trafficking",
    riskLevel: "High",
  },
  {
    id: "EU-002",
    name: "ABC Trading Corporation",
    aliases: ["ABC Corp", "ABC Trading", "ABC International"],
    type: "Entity",
    listType: "EU Sanctions",
    country: "Country B",
    dateAdded: "2023-06-20",
    reason: "Money laundering",
    riskLevel: "High",
  },
  {
    id: "UN-003",
    name: "危険人物",
    aliases: ["Dangerous Person", "Risk Individual"],
    type: "Individual",
    listType: "UN Sanctions",
    country: "Country C",
    dateAdded: "2023-03-10",
    reason: "Terrorism financing",
    riskLevel: "High",
  },
  {
    id: "JFSA-004",
    name: "田中太郎",
    aliases: ["Taro Tanaka", "田中 太郎"],
    type: "Individual",
    listType: "JFSA Watch List",
    country: "Japan",
    dateAdded: "2023-09-05",
    reason: "Suspicious transactions",
    riskLevel: "Medium",
  },
];

// 名前の類似性チェック関数
function checkNameSimilarity(
  searchName: string,
  targetName: string,
  aliases: string[]
): number {
  const normalize = (name: string) =>
    name.toLowerCase().replace(/[.,\-\s]/g, "");
  const searchNorm = normalize(searchName);

  // 完全一致チェック
  if (normalize(targetName) === searchNorm) return 1.0;

  // エイリアスとの一致チェック
  for (const alias of aliases) {
    if (normalize(alias) === searchNorm) return 0.95;
  }

  // 部分一致チェック
  if (
    normalize(targetName).includes(searchNorm) ||
    searchNorm.includes(normalize(targetName))
  ) {
    return 0.7;
  }

  return 0.0;
}

export const sanctionsCheckTool = createTool({
  id: "sanctions-check",
  description: "制裁リスト（OFAC、EU、UN、各国金融庁等）との照合を行います",
  inputSchema: z.object({
    name: z.string().describe("チェック対象の名前（個人名または会社名）"),
    entityType: z
      .enum(["individual", "entity", "both"])
      .optional()
      .describe("検索対象タイプ"),
  }),
  outputSchema: z.object({
    checkId: z.string(),
    searchName: z.string(),
    matches: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        aliases: z.array(z.string()),
        type: z.string(),
        listType: z.string(),
        country: z.string(),
        dateAdded: z.string(),
        reason: z.string(),
        riskLevel: z.string(),
        matchScore: z.number(),
        matchType: z.string(),
      })
    ),
    totalMatches: z.number(),
    riskAssessment: z.string(),
    checkTimestamp: z.string(),
    recommendations: z.array(z.string()),
  }),
  execute: async ({ context }) => {
    const { name, entityType = "both" } = context;
    const checkId = `SANC-${Date.now()}`;
    const checkTimestamp = new Date().toISOString();

    console.log(`制裁リストチェック開始: ${name}`);

    // データベース検索シミュレーション
    const matches = sanctionsDatabase
      .filter((entry) => {
        if (entityType !== "both") {
          const type = entry.type.toLowerCase();
          if (entityType === "individual" && type !== "individual")
            return false;
          if (entityType === "entity" && type !== "entity") return false;
        }
        return true;
      })
      .map((entry) => {
        const matchScore = checkNameSimilarity(name, entry.name, entry.aliases);
        return { ...entry, matchScore };
      })
      .filter((entry) => entry.matchScore > 0.6) // 60%以上の一致度のみ
      .map((entry) => ({
        ...entry,
        matchType:
          entry.matchScore >= 0.95
            ? "Exact Match"
            : entry.matchScore >= 0.8
              ? "High Similarity"
              : "Partial Match",
      }))
      .sort((a, b) => b.matchScore - a.matchScore);

    // リスク評価
    let riskAssessment = "Low Risk";
    const recommendations: string[] = [];

    if (matches.length > 0) {
      const highRiskMatches = matches.filter((m) => m.riskLevel === "High");
      const exactMatches = matches.filter((m) => m.matchScore >= 0.95);

      if (exactMatches.length > 0) {
        riskAssessment = "Critical Risk";
        recommendations.push(
          "即座に取引を停止し、上級管理者に報告してください"
        );
        recommendations.push(
          "法務部門およびコンプライアンス部門に連絡してください"
        );
      } else if (highRiskMatches.length > 0) {
        riskAssessment = "High Risk";
        recommendations.push("追加調査が必要です");
        recommendations.push("取引承認前に上級管理者の確認を取ってください");
      } else {
        riskAssessment = "Medium Risk";
        recommendations.push("詳細な本人確認を実施してください");
        recommendations.push("継続的なモニタリングが推奨されます");
      }
    } else {
      recommendations.push("現時点で制裁リストとの一致は確認されませんでした");
      recommendations.push("定期的な再チェックを実施してください");
    }

    return {
      checkId,
      searchName: name,
      matches,
      totalMatches: matches.length,
      riskAssessment,
      checkTimestamp,
      recommendations,
    };
  },
});
