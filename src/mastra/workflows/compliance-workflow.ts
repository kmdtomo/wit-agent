import { createStep, Workflow } from "@mastra/core/workflows";
import { z } from "zod";
import { complianceAgent } from "../agents/compliance-agent";

// ワークフロー入力スキーマ
const complianceWorkflowInputSchema = z.object({
  targetName: z.string().describe("チェック対象の名前（個人名または会社名）"),
  entityType: z
    .enum(["individual", "entity", "both"])
    .optional()
    .describe("対象タイプ"),
  country: z.string().optional().describe("関連国・地域"),
  industry: z.string().optional().describe("業界・業種"),
  requestedBy: z.string().optional().describe("チェック要求者"),
  purpose: z.string().optional().describe("チェック目的"),
  additionalInfo: z.string().optional().describe("追加情報"),
  urgency: z
    .enum(["low", "medium", "high", "critical"])
    .optional()
    .describe("緊急度"),
});

// ワークフロー出力スキーマ
const complianceWorkflowOutputSchema = z.object({
  workflowId: z.string(),
  status: z.string(),
  targetName: z.string(),
  overallResult: z.object({
    riskLevel: z.string(),
    requiresApproval: z.boolean(),
    blockTransaction: z.boolean(),
    recommendedActions: z.array(z.string()),
  }),
  finalReport: z.any(),
  processingTime: z.string(),
  timestamp: z.string(),
});

// 単一ステップ: コンプライアンスエージェント実行
const complianceAgentStep = createStep({
  id: "compliance-agent-step",
  inputSchema: complianceWorkflowInputSchema,
  outputSchema: z.object({
    complianceResult: z.any(),
    riskLevel: z.string(),
    requiresApproval: z.boolean(),
    blockTransaction: z.boolean(),
    recommendedActions: z.array(z.string()),
  }),
  execute: async (params) => {
    const {
      targetName,
      entityType,
      country,
      industry,
      requestedBy,
      purpose,
      additionalInfo,
      urgency,
    } = params.inputData;

    console.log(`コンプライアンスエージェント実行開始 - ${targetName}`);

    // エージェントにコンプライアンスチェックを依頼
    const checkRequest = `
コンプライアンスチェックを実行してください。

対象者: ${targetName}
エンティティタイプ: ${entityType || "individual"}
${country ? `国: ${country}` : ""}
${industry ? `業界: ${industry}` : ""}
${requestedBy ? `要求者: ${requestedBy}` : ""}
${purpose ? `目的: ${purpose}` : ""}
${additionalInfo ? `追加情報: ${additionalInfo}` : ""}
緊急度: ${urgency || "medium"}

以下の項目について包括的なチェックを実行してください：
1. 制裁リストチェック
2. AMLチェック
3. 日本詐欺・犯罪歴チェック（日本人の場合）
4. 統合レポート生成

結果は明確で実用的な形式で提供してください。
`;

    try {
      const result = await complianceAgent.generate([
        {
          role: "user",
          content: checkRequest,
        },
      ]);

      console.log(`コンプライアンスエージェント実行完了 - ${targetName}`);

      // 結果を解析してリスクレベルを判定
      const resultText = result.text || "";
      let riskLevel = "Low Risk";
      let blockTransaction = false;
      let requiresApproval = false;
      let recommendedActions: string[] = [];

      if (
        resultText.includes("CRITICAL RISK") ||
        resultText.includes("Critical Risk")
      ) {
        riskLevel = "Critical Risk";
        blockTransaction = true;
        requiresApproval = true;
        recommendedActions = [
          "即座の取引停止",
          "15分以内の上級管理者報告",
          "緊急調査実施",
        ];
      } else if (
        resultText.includes("High Risk") ||
        resultText.includes("HIGH RISK")
      ) {
        riskLevel = "High Risk";
        requiresApproval = true;
        recommendedActions = ["厳格審査実施", "上級管理者承認", "追加確認"];
      } else if (
        resultText.includes("Medium Risk") ||
        resultText.includes("MEDIUM RISK")
      ) {
        riskLevel = "Medium Risk";
        requiresApproval = false;
        recommendedActions = ["追加書類取得", "3ヶ月以内の再評価"];
      } else {
        riskLevel = "Low Risk";
        recommendedActions = ["標準KYC継続", "年次チェック"];
      }

      return {
        complianceResult: result,
        riskLevel,
        requiresApproval,
        blockTransaction,
        recommendedActions,
      };
    } catch (error) {
      console.error(`エージェント実行エラー: ${error}`);
      throw error;
    }
  },
});

// メインワークフロー定義（シンプル化）
export const complianceWorkflow = new Workflow({
  id: "compliance-check-workflow",
  inputSchema: complianceWorkflowInputSchema,
  outputSchema: complianceWorkflowOutputSchema,
  steps: [complianceAgentStep],
});

// ワークフロー実行ヘルパー関数
export async function executeComplianceCheck({
  targetName,
  entityType = "individual",
  country,
  industry,
  requestedBy = "System",
  purpose = "Standard compliance check",
  additionalInfo,
  urgency = "medium",
}: {
  targetName: string;
  entityType?: "individual" | "entity" | "both";
  country?: string;
  industry?: string;
  requestedBy?: string;
  purpose?: string;
  additionalInfo?: string;
  urgency?: "low" | "medium" | "high" | "critical";
}) {
  const workflowId = `COMP-WF-${Date.now()}`;
  const startTime = Date.now();

  console.log(
    `コンプライアンスチェックワークフロー開始: ${targetName} (ID: ${workflowId})`
  );

  try {
    const workflowResult = await complianceWorkflow.execute({
      inputData: {
        targetName,
        entityType,
        country,
        industry,
        requestedBy,
        purpose,
        additionalInfo,
        urgency,
      },
    } as any);

    // ワークフローの結果から正しいデータを取得
    const stepResult = workflowResult as any;

    const processingTime = `${Date.now() - startTime}ms`;

    return {
      workflowId,
      status: "completed",
      targetName,
      overallResult: {
        riskLevel: stepResult.riskLevel || "Low Risk",
        requiresApproval: stepResult.requiresApproval || false,
        blockTransaction: stepResult.blockTransaction || false,
        recommendedActions: stepResult.recommendedActions || ["標準KYC継続"],
      },
      finalReport: stepResult.complianceResult || stepResult,
      processingTime,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`ワークフロー実行エラー: ${error}`);

    return {
      workflowId,
      status: "error",
      targetName,
      error: error instanceof Error ? error.message : "Unknown error",
      processingTime: `${Date.now() - startTime}ms`,
      timestamp: new Date().toISOString(),
    };
  }
}
