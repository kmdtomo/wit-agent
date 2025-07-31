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
        console.log(`🇯🇵 日本詐欺情報・犯罪者データベース検索: ${name}`);

        try {
          // AI詐欺情報解析を直接使用（runtimeContext不要）
          const { analyzeFraudInformationWithAI } = await import(
            "./japanese-fraud-check-tool.js"
          );

          // 1. 重大犯罪者データベースをチェック（最優先）
          const majorCriminalResult = await analyzeFraudInformationWithAI(
            name,
            "major_criminals_japan"
          );

          // 2. 詐欺情報サイトをチェック
          const blackmoneyResult = await analyzeFraudInformationWithAI(
            name,
            "eradicationofblackmoneyscammers.com"
          );
          const yamagataResult = await analyzeFraudInformationWithAI(
            name,
            "yamagatamasakage.com"
          );
          const moneylineResult = await analyzeFraudInformationWithAI(
            name,
            "moneyline.jp"
          );

          // 重大犯罪者として検出された場合（最高リスク）
          if (majorCriminalResult.found) {
            fraudSiteStatus = true;
            riskScore = 10; // 最高リスクスコア
            riskLevel = "Critical";
            details = `🚨 重大犯罪者検出: ${majorCriminalResult.details}`;

            recommendations = [
              "🚨 即座の取引拒否・停止",
              "📞 緊急：上級管理者・経営陣への即時報告",
              "📋 警察・監督当局への報告検討",
              "🔒 全ての関連取引・口座の凍結",
              "📄 詳細記録の作成・法的保全",
            ];
          }
          // 詐欺情報サイトで検出された場合
          else if (
            blackmoneyResult.found ||
            yamagataResult.found ||
            moneylineResult.found
          ) {
            fraudSiteStatus = true;
            riskScore = 8;
            riskLevel = "High";

            const detectedResult = blackmoneyResult.found
              ? blackmoneyResult
              : yamagataResult.found
                ? yamagataResult
                : moneylineResult;
            details = `詐欺情報検出: ${detectedResult.details}`;

            recommendations = [
              "❌ 取引停止推奨",
              "🔍 詳細な背景調査実施",
              "📞 上級管理者への報告",
              "📋 詳細記録の作成・保管",
            ];
          } else {
            details =
              "重大犯罪者データベース・日本語詐欺情報サイト（yamagatamasakage.com、eradicationofblackmoneyscammers.com、moneyline.jp）：該当なし";
          }
        } catch (error) {
          console.warn(
            `犯罪者・詐欺チェックエラー: ${error instanceof Error ? error.message : String(error)}`
          );
          details = "犯罪者・詐欺情報データベース検索でエラーが発生しました";
        }
      } else {
        details = "海外名のため日本犯罪者・詐欺情報データベース検索対象外";
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
