import { mastra } from "../mastra";
import { executeComplianceCheck } from "../mastra/workflows/compliance-workflow";

export interface ComplianceCheckRequest {
  targetName: string;
  entityType?: "individual" | "entity" | "both";
  country?: string;
  industry?: string;
  requestedBy?: string;
  purpose?: string;
  additionalInfo?: string;
  urgency?: "low" | "medium" | "high" | "critical";
}

export interface ComplianceCheckResponse {
  workflowId: string;
  status: string;
  targetName: string;
  overallResult: {
    riskLevel: string;
    requiresApproval: boolean;
    blockTransaction: boolean;
    recommendedActions: string[];
  };
  sanctionsCheckResult?: any;
  amlCheckResult?: any;
  finalReport?: any;
  processingTime: string;
  timestamp: string;
}

// APIクラス
export class ComplianceAPI {
  static async performComplianceCheck(
    request: ComplianceCheckRequest
  ): Promise<ComplianceCheckResponse> {
    try {
      console.log("コンプライアンスチェック開始:", request);

      // ワークフローを実行
      const result = await executeComplianceCheck({
        targetName: request.targetName,
        entityType: request.entityType,
        country: request.country,
        industry: request.industry,
        requestedBy: request.requestedBy,
        purpose: request.purpose,
        additionalInfo: request.additionalInfo,
        urgency: request.urgency,
      });

      console.log("コンプライアンスチェック完了:", result);
      return result as ComplianceCheckResponse;
    } catch (error) {
      console.error("コンプライアンスチェックエラー:", error);
      throw new Error(
        `チェック実行中にエラーが発生しました: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  static async getComplianceAgent() {
    return mastra.agents.complianceAgent;
  }

  static async chatWithAgent(message: string) {
    try {
      const agent = await this.getComplianceAgent();
      const response = await agent.generate({
        messages: [
          {
            role: "user",
            content: message,
          },
        ],
      });

      return response;
    } catch (error) {
      console.error("エージェントチャットエラー:", error);
      throw new Error(
        `エージェントとの通信中にエラーが発生しました: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
}
