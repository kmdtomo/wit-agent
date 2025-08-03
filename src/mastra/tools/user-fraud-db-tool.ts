import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import {
  searchUserFraudReports,
  getUserFraudStatistics,
} from "../../lib/supabase.js";

// ユーザーデータベースから詐欺情報を検索するツール
export const userFraudDbTool = createTool({
  id: "user-fraud-db-check",
  description:
    "ユーザーコミュニティによって報告・検証された詐欺者情報をデータベースから検索します。実際の被害者による報告を基にした信頼性の高い詐欺情報データベースです。",
  inputSchema: z.object({
    name: z
      .string()
      .describe("検索対象者の氏名（漢字、ひらがな、カタカナ、英字対応）"),
    aliases: z
      .array(z.string())
      .optional()
      .describe("別名・通称・ニックネーム（任意）"),
    checkUserReports: z
      .boolean()
      .optional()
      .default(true)
      .describe("ユーザー報告データベースをチェックするかどうか"),
  }),
  outputSchema: z.object({
    userDbResult: z.object({
      found: z.boolean(),
      reportCount: z.number(),
      details: z.string(),
      riskScore: z.number(),
      confidence: z.number(),
      reports: z.array(
        z.object({
          id: z.string(),
          fraudType: z.string(),
          description: z.string(),
          reportDate: z.string(),
          amountInvolved: z.number().nullable(),
          phoneNumber: z.string().nullable(),
          email: z.string().nullable(),
          address: z.string().nullable(),
          companyName: z.string().nullable(),
          tags: z.array(z.string()).nullable(),
        })
      ),
    }),
    statistics: z.object({
      totalReports: z.number(),
      verifiedReports: z.number(),
      topFraudTypes: z.array(
        z.object({
          type: z.string(),
          count: z.number(),
        })
      ),
      totalDamageAmount: z.number(),
    }),
    summary: z.object({
      overallRiskScore: z.number(),
      riskLevel: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
      foundInUserDb: z.boolean(),
      recommendations: z.array(z.string()),
      urgentActions: z.array(z.string()),
    }),
    processingTime: z.number(),
  }),
  execute: async ({ context }) => {
    const { name, aliases = [], checkUserReports = true } = context;
    const startTime = Date.now();

    console.log(`🔍 ユーザーDB詐欺チェック開始: ${name}`);

    try {
      // ユーザーデータベースから詐欺情報を検索
      let userDbResult = {
        found: false,
        reportCount: 0,
        details: "チェックがスキップされました",
        riskScore: 0,
        confidence: 0,
        reports: [],
      };

      if (checkUserReports) {
        const searchResult = await searchUserFraudReports(name, aliases);

        userDbResult = {
          found: searchResult.found,
          reportCount: searchResult.reports.length,
          details: searchResult.details,
          riskScore: searchResult.riskScore,
          confidence: searchResult.confidence,
          reports: searchResult.reports.map((report) => ({
            id: report.id,
            fraudType: report.fraud_type,
            description: report.description,
            reportDate: report.created_at,
            amountInvolved: report.amount_involved,
            phoneNumber: report.phone_number,
            email: report.email,
            address: report.address,
            companyName: report.company_name,
            tags: report.tags,
          })),
        };
      }

      // 統計情報を取得
      const statistics = await getUserFraudStatistics();

      // 総合リスク評価
      const summary = calculateUserDbRisk(userDbResult);

      const processingTime = Date.now() - startTime;

      console.log(
        `✅ ユーザーDB詐欺チェック完了: ${userDbResult.found ? "検出" : "該当なし"} (${processingTime}ms)`
      );

      return {
        userDbResult,
        statistics,
        summary,
        processingTime,
      };
    } catch (error) {
      console.error(`❌ ユーザーDB詐欺チェックエラー: ${error}`);

      const processingTime = Date.now() - startTime;

      return {
        userDbResult: {
          found: false,
          reportCount: 0,
          details: `検索エラー: ${error}`,
          riskScore: 0,
          confidence: 0,
          reports: [],
        },
        statistics: {
          totalReports: 0,
          verifiedReports: 0,
          topFraudTypes: [],
          totalDamageAmount: 0,
        },
        summary: {
          overallRiskScore: 0,
          riskLevel: "LOW" as const,
          foundInUserDb: false,
          recommendations: [
            "ユーザーDBチェックでエラーが発生しました。再実行を推奨します。",
          ],
          urgentActions: [],
        },
        processingTime,
      };
    }
  },
});

// ユーザーDB結果に基づくリスク評価
function calculateUserDbRisk(userDbResult: any): any {
  const { found, reportCount, riskScore } = userDbResult;

  let overallRiskScore = riskScore;
  let riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  let recommendations: string[] = [];
  let urgentActions: string[] = [];

  if (!found) {
    riskLevel = "LOW";
    recommendations.push("ユーザーDBで該当なし - 標準KYC手続きで継続可能");
    recommendations.push("ユーザーコミュニティからの報告はありません");
  } else {
    // ユーザーDBで発見された場合は重要度を高く設定
    if (riskScore >= 0.9 || reportCount >= 3) {
      riskLevel = "CRITICAL";
      urgentActions.push(
        "ユーザーコミュニティから複数の詐欺報告あり - 即座の取引停止"
      );
      urgentActions.push("上級管理者への緊急報告");
      recommendations.push("詳細な身元調査の実施");
      recommendations.push("報告されている詐欺手口の詳細確認");
    } else if (riskScore >= 0.7 || reportCount >= 2) {
      riskLevel = "HIGH";
      urgentActions.push("Enhanced Due Diligence実施");
      recommendations.push("ユーザー報告の詳細確認");
      recommendations.push("追加の身元確認資料の取得");
      recommendations.push("上級管理者承認の必須化");
    } else if (riskScore >= 0.5 || reportCount >= 1) {
      riskLevel = "MEDIUM";
      recommendations.push("ユーザーコミュニティからの報告を詳細確認");
      recommendations.push("追加の確認手続きの実施");
      recommendations.push("取引限度額の設定を検討");
      recommendations.push("定期的な再評価（1ヶ月毎）");
    } else {
      riskLevel = "LOW";
      recommendations.push("軽微な報告のみ - 慎重な監視下で継続");
      recommendations.push("定期的な再評価（3ヶ月毎）");
    }
  }

  return {
    overallRiskScore,
    riskLevel,
    foundInUserDb: found,
    recommendations,
    urgentActions,
  };
}
