import { createStep, Workflow } from "@mastra/core/workflows";
import { z } from "zod";
import {
  sanctionsCheckTool,
  amlCheckTool,
  reportGeneratorTool,
} from "../tools";

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
  sanctionsCheckResult: z.any().optional(),
  amlCheckResult: z.any().optional(),
  finalReport: z.any().optional(),
  processingTime: z.string(),
  timestamp: z.string(),
});

// ステップ1: 制裁リストチェック
const sanctionsCheckStep = createStep({
  id: "sanctions-check-step",
  inputSchema: z.object({
    targetName: z.string(),
    entityType: z.enum(["individual", "entity", "both"]).optional(),
  }),
  outputSchema: z.object({
    sanctionsResult: z.any(),
    proceedToAML: z.boolean(),
    emergencyStop: z.boolean(),
  }),
  execute: async (params) => {
    const { targetName, entityType } = params.inputData;
    console.log(`ステップ1: 制裁リストチェック開始 - ${targetName}`);

    const sanctionsResult = await sanctionsCheckTool.execute({
      context: {
        name: targetName,
        entityType: entityType || "both",
      },
      runtimeContext: params.runtimeContext,
    });

    // 緊急停止判定
    const emergencyStop =
      sanctionsResult.riskAssessment === "Critical Risk" &&
      sanctionsResult.matches.some((m: any) => m.matchScore >= 0.95);

    // AMLチェック継続判定
    const proceedToAML = !emergencyStop;

    console.log(
      `制裁リストチェック完了 - リスクレベル: ${sanctionsResult.riskAssessment}`
    );

    return {
      sanctionsResult,
      proceedToAML,
      emergencyStop,
    };
  },
});

// ステップ2: AMLチェック
const amlCheckStep = createStep({
  id: "aml-check-step",
  inputSchema: z.object({
    targetName: z.string(),
    country: z.string().optional(),
    industry: z.string().optional(),
    additionalInfo: z.string().optional(),
    sanctionsResult: z.any(),
  }),
  outputSchema: z.object({
    amlResult: z.any(),
    combinedRiskLevel: z.string(),
    requiresManualReview: z.boolean(),
  }),
  execute: async (params) => {
    const { targetName, country, industry, additionalInfo, sanctionsResult } =
      params.inputData;
    console.log(`ステップ2: AMLチェック開始 - ${targetName}`);

    const amlResult = await amlCheckTool.execute({
      context: {
        name: targetName,
        country: country || "Unknown",
        industry: industry || "Unknown",
        additionalInfo: additionalInfo || "",
      },
      runtimeContext: params.runtimeContext,
    });

    // 統合リスクレベル判定
    const sanctionsRisk = sanctionsResult.riskAssessment;
    const amlRisk = amlResult.riskAnalysis.riskLevel;

    let combinedRiskLevel = "Low";
    if (sanctionsRisk === "Critical Risk" || amlRisk === "Critical") {
      combinedRiskLevel = "Critical";
    } else if (sanctionsRisk === "High Risk" || amlRisk === "High") {
      combinedRiskLevel = "High";
    } else if (sanctionsRisk === "Medium Risk" || amlRisk === "Medium") {
      combinedRiskLevel = "Medium";
    }

    const requiresManualReview =
      combinedRiskLevel === "Critical" ||
      combinedRiskLevel === "High" ||
      amlResult.riskAnalysis.pepStatus ||
      amlResult.riskAnalysis.criminalRecord;

    console.log(`AMLチェック完了 - 統合リスクレベル: ${combinedRiskLevel}`);

    return {
      amlResult,
      combinedRiskLevel,
      requiresManualReview,
    };
  },
});

// ステップ3: 最終レポート生成
const reportGenerationStep = createStep({
  id: "report-generation-step",
  inputSchema: z.object({
    targetName: z.string(),
    sanctionsResult: z.any(),
    amlResult: z.any(),
    requestedBy: z.string().optional(),
    purpose: z.string().optional(),
    combinedRiskLevel: z.string(),
  }),
  outputSchema: z.object({
    finalReport: z.any(),
    overallResult: z.object({
      riskLevel: z.string(),
      requiresApproval: z.boolean(),
      blockTransaction: z.boolean(),
      recommendedActions: z.array(z.string()),
    }),
  }),
  execute: async (params) => {
    const {
      targetName,
      sanctionsResult,
      amlResult,
      requestedBy,
      purpose,
      combinedRiskLevel,
    } = params.inputData;
    console.log(`ステップ3: 最終レポート生成開始 - ${targetName}`);

    const finalReport = await reportGeneratorTool.execute({
      context: {
        targetName,
        sanctionsResult,
        amlResult,
        requestedBy: requestedBy || "System",
        purpose: purpose || "Standard compliance check",
      },
      runtimeContext: params.runtimeContext,
    });

    // 総合判定
    const riskLevel = combinedRiskLevel;
    const requiresApproval = ["High", "Critical"].includes(riskLevel);
    const blockTransaction = riskLevel === "Critical";

    const recommendedActions = [];
    if (blockTransaction) {
      recommendedActions.push("取引を即座に停止");
      recommendedActions.push("上級管理者に緊急報告");
      recommendedActions.push("法務部門に連絡");
    } else if (requiresApproval) {
      recommendedActions.push("上級管理者の承認を取得");
      recommendedActions.push("追加のデューデリジェンスを実施");
    } else {
      recommendedActions.push("標準的なKYC手続きを継続");
    }

    console.log(`最終レポート生成完了 - 総合リスクレベル: ${riskLevel}`);

    return {
      finalReport,
      overallResult: {
        riskLevel,
        requiresApproval,
        blockTransaction,
        recommendedActions,
      },
    };
  },
});

// メインワークフロー定義
export const complianceWorkflow = new Workflow({
  id: "compliance-check-workflow",
  inputSchema: complianceWorkflowInputSchema,
  outputSchema: complianceWorkflowOutputSchema,
  steps: [sanctionsCheckStep, amlCheckStep, reportGenerationStep],
});

// ワークフロー実行ヘルパー関数
export async function executeComplianceCheck({
  targetName,
  entityType = "both",
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
    const result = await complianceWorkflow.execute({
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

    const processingTime = `${Date.now() - startTime}ms`;

    return {
      workflowId,
      status: "completed",
      targetName,
      overallResult: result.overallResult || {},
      sanctionsCheckResult: result.sanctionsCheckResult,
      amlCheckResult: result.amlCheckResult,
      finalReport: result.finalReport,
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
