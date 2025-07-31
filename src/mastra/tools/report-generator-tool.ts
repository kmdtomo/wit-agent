import { createTool } from "@mastra/core/tools";
import { z } from "zod";

interface CheckResult {
  checkId: string;
  searchName: string;
  riskAssessment?: string;
  riskLevel?: string;
  totalMatches?: number;
  matches: any[];
  recommendations: string[];
  checkTimestamp: string;
}

function generateExecutiveSummary(
  sanctionsResult: any,
  amlResult: any
): string {
  const totalMatches =
    (sanctionsResult?.totalMatches || 0) + (amlResult?.matches?.length || 0);
  const highestRisk = determineHighestRisk(sanctionsResult, amlResult);

  if (totalMatches === 0) {
    return `対象者「${sanctionsResult?.searchName || amlResult?.searchName}」について、制裁リストおよびAMLデータベースとの照合を実施した結果、現時点では該当する記録は確認されませんでした。標準的なKYC手続きの継続を推奨します。`;
  }

  return `対象者「${sanctionsResult?.searchName || amlResult?.searchName}」について包括的な反射チェックを実施しました。${totalMatches}件の潜在的一致が確認され、総合リスクレベルは「${highestRisk}」と判定されました。詳細な追加調査および上級管理者による承認が必要です。`;
}

function determineHighestRisk(...results: any[]): string {
  const risks = results
    .filter((r) => r)
    .map((r) => r.riskAssessment || r.riskAnalysis?.riskLevel)
    .filter(Boolean);

  if (risks.includes("Critical") || risks.includes("Critical Risk"))
    return "Critical";
  if (risks.includes("High") || risks.includes("High Risk")) return "High";
  if (risks.includes("Medium") || risks.includes("Medium Risk"))
    return "Medium";
  return "Low";
}

function generateRecommendations(
  sanctionsResult: any,
  amlResult: any
): string[] {
  const recommendations = new Set<string>();

  // 制裁リストチェックの推奨事項
  if (sanctionsResult?.recommendations) {
    sanctionsResult.recommendations.forEach((rec: string) =>
      recommendations.add(rec)
    );
  }

  // AMLチェックの推奨事項
  if (amlResult?.recommendations) {
    amlResult.recommendations.forEach((rec: string) =>
      recommendations.add(rec)
    );
  }

  // 追加の包括的推奨事項
  const highestRisk = determineHighestRisk(sanctionsResult, amlResult);

  if (highestRisk === "Critical") {
    recommendations.add(
      "【緊急】取引を即座に停止し、24時間以内に上級管理者および法務部門に報告してください"
    );
    recommendations.add("監督当局への報告要否を検討してください");
  } else if (highestRisk === "High") {
    recommendations.add(
      "取引開始前に追加のデューデリジェンスを実施してください"
    );
    recommendations.add("継続取引の場合は強化モニタリングを実施してください");
  }

  if (amlResult?.riskAnalysis?.pepStatus) {
    recommendations.add(
      "PEP管理手続きに従い、定期的な再審査を実施してください"
    );
  }

  return Array.from(recommendations);
}

function formatDetailedFindings(sanctionsResult: any, amlResult: any) {
  const findings = {
    sanctionsCheck: null as any,
    amlCheck: null as any,
    summary: {
      totalMatches: 0,
      highRiskMatches: 0,
      exactMatches: 0,
    },
  };

  if (sanctionsResult && sanctionsResult.totalMatches > 0) {
    findings.sanctionsCheck = {
      totalMatches: sanctionsResult.totalMatches,
      riskLevel: sanctionsResult.riskAssessment,
      matches: sanctionsResult.matches.map((match: any) => ({
        name: match.name,
        listType: match.listType,
        country: match.country,
        riskLevel: match.riskLevel,
        reason: match.reason,
        matchType: match.matchType,
      })),
    };

    findings.summary.totalMatches += sanctionsResult.totalMatches;
    findings.summary.highRiskMatches += sanctionsResult.matches.filter(
      (m: any) => m.riskLevel === "High"
    ).length;
    findings.summary.exactMatches += sanctionsResult.matches.filter(
      (m: any) => m.matchScore >= 0.95
    ).length;
  }

  if (amlResult && amlResult.matches.length > 0) {
    findings.amlCheck = {
      totalMatches: amlResult.matches.length,
      riskScore: amlResult.riskAnalysis.overallRiskScore,
      riskLevel: amlResult.riskAnalysis.riskLevel,
      pepStatus: amlResult.riskAnalysis.pepStatus,
      criminalRecord: amlResult.riskAnalysis.criminalRecord,
      watchListStatus: amlResult.riskAnalysis.watchListStatus,
      matches: amlResult.matches.map((match: any) => ({
        name: match.name,
        category: match.category,
        position: match.position,
        country: match.country,
        riskLevel: match.riskLevel,
        matchScore: match.matchScore,
      })),
    };

    findings.summary.totalMatches += amlResult.matches.length;
    findings.summary.highRiskMatches += amlResult.matches.filter(
      (m: any) => m.riskLevel === "High"
    ).length;
    findings.summary.exactMatches += amlResult.matches.filter(
      (m: any) => m.matchScore >= 0.95
    ).length;
  }

  return findings;
}

export const reportGeneratorTool = createTool({
  id: "generate-compliance-report",
  description:
    "制裁リストおよびAMLチェックの結果を統合し、包括的なコンプライアンスレポートを生成します",
  inputSchema: z.object({
    targetName: z.string().describe("チェック対象の名前"),
    sanctionsResult: z.any().optional().describe("制裁リストチェックの結果"),
    amlResult: z.any().optional().describe("AMLチェックの結果"),
    requestedBy: z.string().optional().describe("チェック要求者"),
    purpose: z.string().optional().describe("チェック目的"),
    additionalNotes: z.string().optional().describe("追加の注記"),
  }),
  outputSchema: z.object({
    reportId: z.string(),
    targetName: z.string(),
    executiveSummary: z.string(),
    overallRiskLevel: z.string(),
    detailedFindings: z.any(),
    recommendations: z.array(z.string()),
    nextSteps: z.array(z.string()),
    reportMetadata: z.object({
      generatedAt: z.string(),
      requestedBy: z.string().optional(),
      purpose: z.string().optional(),
      checkIds: z.array(z.string()),
      processingTime: z.string(),
    }),
    disclaimer: z.string(),
  }),
  execute: async ({ context }) => {
    const {
      targetName,
      sanctionsResult,
      amlResult,
      requestedBy = "System",
      purpose = "Standard compliance check",
      additionalNotes = "",
    } = context;

    const reportId = `COMP-RPT-${Date.now()}`;
    const reportDate = new Date().toISOString();
    const startTime = Date.now();

    console.log(`包括的コンプライアンスレポート生成開始: ${targetName}`);

    // エグゼクティブサマリー生成
    const executiveSummary = generateExecutiveSummary(
      sanctionsResult,
      amlResult
    );

    // 総合リスクレベル判定
    const overallRiskLevel = determineHighestRisk(sanctionsResult, amlResult);

    // 詳細所見の整理
    const detailedFindings = formatDetailedFindings(sanctionsResult, amlResult);

    // 推奨事項の統合
    const recommendations = generateRecommendations(sanctionsResult, amlResult);

    // 次のステップ
    const nextSteps = [];
    if (overallRiskLevel === "Critical") {
      nextSteps.push("即座に上級管理者に報告し、取引を停止する");
      nextSteps.push("24時間以内に法務部門およびコンプライアンス責任者に連絡");
      nextSteps.push("監督当局への報告要否を確認");
    } else if (overallRiskLevel === "High") {
      nextSteps.push("追加のデューデリジェンスを実施");
      nextSteps.push("上級管理者の承認を取得");
      nextSteps.push("強化モニタリング体制を構築");
    } else if (overallRiskLevel === "Medium") {
      nextSteps.push("詳細な本人確認書類の取得");
      nextSteps.push("継続的なモニタリング体制を整備");
      nextSteps.push("定期的な再チェック（6ヶ月毎）を実施");
    } else {
      nextSteps.push("標準的なKYC手続きを継続");
      nextSteps.push("年次の定期チェックを実施");
    }

    // メタデータ
    const checkIds = [];
    if (sanctionsResult?.checkId) checkIds.push(sanctionsResult.checkId);
    if (amlResult?.checkId) checkIds.push(amlResult.checkId);

    const processingTime = `${Date.now() - startTime}ms`;

    // 免責事項
    const disclaimer = `
本レポートは自動化されたコンプライアンスチェックシステムにより生成されました。
- このレポートは参考情報として提供されており、最終的な判断は必ず人間の専門家による確認が必要です
- データベースの情報は定期的に更新されますが、常に最新の情報であることを保証するものではありません
- 偽陽性（誤検知）の可能性があるため、一致が検出された場合でも詳細な調査が必要です
- 本レポートの結果に基づく一切の判断および行動については、利用者が責任を負うものとします
- 監督当局の最新ガイドラインに従って適切な対応を取ってください
    `.trim();

    return {
      reportId,
      targetName,
      executiveSummary,
      overallRiskLevel,
      detailedFindings,
      recommendations,
      nextSteps,
      reportMetadata: {
        generatedAt: reportDate,
        requestedBy,
        purpose,
        checkIds,
        processingTime,
      },
      disclaimer,
    };
  },
});
