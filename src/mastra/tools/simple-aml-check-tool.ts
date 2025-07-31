import { createTool } from "@mastra/core/tools";
import { z } from "zod";

// 簡素化されたAMLチェックツール（精度重視）
export const simpleAmlCheckTool = createTool({
  id: "simple-aml-check",
  description:
    "簡素化されたAMLチェック - 詐欺情報サイト検索をベースとした高精度チェック",
  inputSchema: z.object({
    name: z.string().describe("チェック対象の名前"),
    country: z.string().optional().describe("関連国・地域"),
    industry: z.string().optional().describe("業界・業種"),
  }),
  outputSchema: z.object({
    checkId: z.string(),
    searchName: z.string(),
    riskAnalysis: z.object({
      overallRiskScore: z.number(),
      riskLevel: z.string(),
      fraudSiteStatus: z.boolean(),
      details: z.string(),
      processingTimeMs: z.number(),
    }),
    recommendations: z.array(z.string()),
    checkTimestamp: z.string(),
    error: z.string().optional(),
  }),

  execute: async ({ context }) => {
    const { name, country = "Unknown", industry = "Unknown" } = context;
    const checkId = `SIMPLE-AML-${Date.now()}`;
    const checkTimestamp = new Date().toISOString();
    const startTime = Date.now();

    console.log(`🔍 簡易AMLチェック開始: ${name}`);

    try {
      // 日本人名の判定
      const hasJapaneseCharacters =
        /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(name);

      let fraudSiteStatus = false;
      let details = "該当なし";
      let riskScore = 0;
      let riskLevel = "Low";
      let recommendations = ["標準的なモニタリング継続"];

      if (hasJapaneseCharacters || country === "Japan" || country === "JP") {
        console.log(`🇯🇵 日本詐欺情報サイト検索: ${name}`);

        try {
          // AI詐欺情報解析を直接使用（runtimeContext不要）
          const { analyzeFraudInformationWithAI } = await import(
            "./japanese-fraud-check-tool.js"
          );

          const blackmoneyResult = await analyzeFraudInformationWithAI(
            name,
            "eradicationofblackmoneyscammers.com"
          );
          const yamagataResult = await analyzeFraudInformationWithAI(
            name,
            "yamagatamasakage.com"
          );

          if (blackmoneyResult.found || yamagataResult.found) {
            fraudSiteStatus = true;
            riskScore = 8;
            riskLevel = "High";

            const detectedResult = blackmoneyResult.found
              ? blackmoneyResult
              : yamagataResult;
            details = `詐欺情報検出: ${detectedResult.details}`;

            recommendations = [
              "❌ 取引停止推奨",
              "🔍 詳細な背景調査実施",
              "📞 上級管理者への報告",
              "📋 詳細記録の作成・保管",
            ];
          } else {
            details =
              "日本語詐欺情報サイト（yamagatamasakage.com、eradicationofblackmoneyscammers.com）：該当なし";
          }
        } catch (error) {
          console.warn(
            `詐欺チェックエラー: ${error instanceof Error ? error.message : String(error)}`
          );
          details = "詐欺情報サイト検索でエラーが発生しました";
        }
      } else {
        details = "海外名のため日本詐欺情報サイト検索対象外";
      }

      const processingTime = Date.now() - startTime;
      console.log(
        `✅ 簡易AMLチェック完了: ${processingTime}ms (リスク: ${riskLevel})`
      );

      return {
        checkId,
        searchName: name,
        riskAnalysis: {
          overallRiskScore: riskScore,
          riskLevel,
          fraudSiteStatus,
          details,
          processingTimeMs: processingTime,
        },
        recommendations,
        checkTimestamp,
      };
    } catch (error) {
      console.error(`❌ 簡易AMLチェックエラー: ${error}`);

      return {
        checkId,
        searchName: name,
        riskAnalysis: {
          overallRiskScore: 0,
          riskLevel: "Error",
          fraudSiteStatus: false,
          details: "システムエラーが発生しました",
          processingTimeMs: Date.now() - startTime,
        },
        recommendations: ["手動確認が必要です"],
        checkTimestamp,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});
