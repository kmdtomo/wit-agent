import { 
  analyzeCompanyTool,
  analyzeFundUsageTool,
  analyzeArrearsRiskTool,
  analyzeCollectionTool,
} from '../tools/analysis-tools';
import { 
  analyzeAllDocumentsTool,
} from '../tools/document-tools';
import type { 
  KintoneRecord, 
  ComplianceAnalysisResult,
  CategoryAnalysis,
  RedFlag,
} from '../types';
import { anthropic } from '../mastra.config';

// プランA: 包括的コンプライアンス審査エージェント
export class ComprehensiveComplianceAgent {
  constructor() {
    // Claudeを直接使用するため、Mastra Agentは使わない
  }

  private systemPrompt = `
        あなたはファクタリング審査の専門家です。
        以下の観点から包括的かつ厳密に審査を行ってください：

        1. 企業信用評価
           - 資本金の規模と申請額のバランス
           - 設立年数と事業の安定性
           - 過去の取引実績

        2. 資金使途の妥当性
           - 具体性と透明性
           - 業種との整合性
           - 横領リスクの有無

        3. 回収可能性
           - 担保と債権のバランス
           - 過去の入金実績の安定性
           - 支払い能力の評価

        4. 財務健全性
           - 税金・保険料の滞納状況
           - 売上と申請額の比率
           - キャッシュフローの健全性

        5. ドキュメントの完全性
           - 必須書類の提出状況
           - 書類の信頼性
           - 異常な記載の有無

        各項目を0-100点で評価し、総合的なリスクレベルを判定してください。
        特に以下の場合は「critical」リスクと判定：
        - 税金/保険料の高額滞納（100万円以上）
        - 必須書類の3つ以上が未提出
        - 資金使途が不明確または不適切
        - 担保が債権額の50%未満
  `;

  async analyzeRecord(record: KintoneRecord): Promise<ComplianceAnalysisResult> {
    try {
      // 1. 企業信用分析
      const companyAnalysis = await analyzeCompanyTool.execute({
        registries: record.registries,
        purchases: record.purchases,
        collaterals: record.collaterals,
      });

      // 2. 資金使途分析
      const fundUsageAnalysis = await analyzeFundUsageTool.execute({
        fundUsage: {
          資金使途: record.financialRisk.資金使途,
          所感_条件_担当者: record.fundUsage.所感_条件_担当者,
          所感_条件_決裁者: record.fundUsage.所感_条件_決裁者,
        },
        financialInfo: {
          業種: record.financialRisk.業種,
          売上: record.financialRisk.売上,
        },
        requestAmount: record.purchases.reduce((sum, p) => sum + p.買取額, 0),
      });

      // 3. 滞納リスク分析
      const arrearsAnalysis = await analyzeArrearsRiskTool.execute({
        taxStatus: record.financialRisk.納付状況_税金,
        taxArrears: record.financialRisk.税金滞納額_0,
        insuranceStatus: record.financialRisk.納付状況_税金_0,
        insuranceArrears: record.financialRisk.保険料滞納額,
      });

      // 4. 回収可能性分析
      const collectionAnalysis = await analyzeCollectionTool.execute({
        collections: record.collections,
        collaterals: record.collaterals,
      });

      // 5. ドキュメント分析（画像処理含む）
      const documentAnalysis = await analyzeAllDocumentsTool.execute({
        attachments: record.attachments as any,
      });

      // 6. 統合評価
      const overallScore = this.calculateOverallScore({
        company: companyAnalysis.score,
        fundUsage: fundUsageAnalysis.score,
        arrears: arrearsAnalysis.score,
        collection: collectionAnalysis.score,
        documents: documentAnalysis.overallDocumentScore,
      });

      const riskLevel = this.determineRiskLevel(
        overallScore,
        arrearsAnalysis,
        documentAnalysis
      );

      const redFlags = this.identifyRedFlags(
        companyAnalysis,
        fundUsageAnalysis,
        arrearsAnalysis,
        collectionAnalysis,
        documentAnalysis
      );

      const recommendations = this.generateRecommendations(
        riskLevel,
        redFlags,
        {
          company: companyAnalysis,
          fundUsage: fundUsageAnalysis,
          arrears: arrearsAnalysis,
          collection: collectionAnalysis,
          documents: documentAnalysis,
        }
      );

      // カテゴリ別分析結果の整形
      const categories = {
        company: this.formatCategoryAnalysis('company', companyAnalysis),
        fundUsage: this.formatCategoryAnalysis('fundUsage', fundUsageAnalysis),
        transaction: this.formatTransactionAnalysis(
          collectionAnalysis,
          documentAnalysis
        ),
      };

      return {
        recordId: record.recordId,
        timestamp: new Date().toISOString(),
        overallScore,
        riskLevel,
        categories,
        redFlags,
        recommendations,
        documentAnalysis: documentAnalysis.bankStatements ? {
          bankStatements: {
            extracted: true,
            monthlyAverage: documentAnalysis.bankStatements.summary?.averageBalance,
            transactionCount: documentAnalysis.bankStatements.summary?.transactionCount,
            anomalies: documentAnalysis.bankStatements.riskIndicators,
          },
          invoices: {
            extracted: !!documentAnalysis.invoices,
            totalAmount: undefined,
            companies: [],
          },
          contracts: {
            extracted: !!documentAnalysis.contracts,
            keyTerms: [],
          },
        } : undefined,
      };
    } catch (error) {
      console.error('Analysis error:', error);
      throw new Error(`審査処理中にエラーが発生しました: ${error}`);
    }
  }

  private calculateOverallScore(scores: Record<string, number>): number {
    // 重み付け平均
    const weights = {
      company: 0.25,
      fundUsage: 0.20,
      arrears: 0.25,
      collection: 0.20,
      documents: 0.10,
    };

    let weightedSum = 0;
    let totalWeight = 0;

    for (const [category, score] of Object.entries(scores)) {
      const weight = weights[category as keyof typeof weights] || 0.1;
      weightedSum += score * weight;
      totalWeight += weight;
    }

    return Math.round(weightedSum / totalWeight);
  }

  private determineRiskLevel(
    overallScore: number,
    arrearsAnalysis: any,
    documentAnalysis: any
  ): 'low' | 'medium' | 'high' | 'critical' {
    // クリティカル条件
    if (
      arrearsAnalysis.totalArrears > 1000000 ||
      documentAnalysis.missingDocuments.length > 3 ||
      overallScore < 30
    ) {
      return 'critical';
    }

    // スコアベースの判定
    if (overallScore >= 70) return 'low';
    if (overallScore >= 50) return 'medium';
    if (overallScore >= 30) return 'high';
    return 'critical';
  }

  private identifyRedFlags(
    companyAnalysis: any,
    fundUsageAnalysis: any,
    arrearsAnalysis: any,
    collectionAnalysis: any,
    documentAnalysis: any
  ): RedFlag[] {
    const redFlags: RedFlag[] = [];

    // 企業リスク
    if (companyAnalysis.risks && companyAnalysis.risks.length > 0) {
      companyAnalysis.risks.forEach((risk: string) => {
        redFlags.push({
          category: 'company',
          severity: 'medium',
          description: risk,
          evidence: '企業分析結果',
        });
      });
    }

    // 資金使途リスク
    if (fundUsageAnalysis.concerns && fundUsageAnalysis.concerns.length > 0) {
      fundUsageAnalysis.concerns.forEach((concern: string) => {
        redFlags.push({
          category: 'financial',
          severity: concern.includes('横領') ? 'high' : 'medium',
          description: concern,
          evidence: '資金使途分析',
        });
      });
    }

    // 滞納リスク
    if (arrearsAnalysis.totalArrears > 0) {
      redFlags.push({
        category: 'financial',
        severity: arrearsAnalysis.totalArrears > 500000 ? 'high' : 'medium',
        description: `税金・保険料の滞納: ${arrearsAnalysis.totalArrears.toLocaleString()}円`,
        evidence: '滞納情報',
        affectedField: '納付状況',
      });
    }

    // 回収リスク
    if (collectionAnalysis.coverageRatio < 1.0) {
      redFlags.push({
        category: 'transaction',
        severity: collectionAnalysis.coverageRatio < 0.7 ? 'high' : 'medium',
        description: '担保不足による回収リスク',
        evidence: `カバー率: ${collectionAnalysis.coverageRatio}`,
      });
    }

    // ドキュメントリスク
    if (documentAnalysis.missingDocuments.length > 0) {
      redFlags.push({
        category: 'document',
        severity: documentAnalysis.missingDocuments.length > 2 ? 'high' : 'medium',
        description: `必須書類の不足: ${documentAnalysis.missingDocuments.length}件`,
        evidence: documentAnalysis.missingDocuments.join(', '),
      });
    }

    return redFlags;
  }

  private generateRecommendations(
    riskLevel: string,
    redFlags: RedFlag[],
    analyses: any
  ): string[] {
    const recommendations: string[] = [];

    // リスクレベル別の基本推奨
    if (riskLevel === 'critical') {
      recommendations.push('取引を見送るか、大幅な条件変更を検討してください');
    } else if (riskLevel === 'high') {
      recommendations.push('追加の担保設定または買取率の引き下げを推奨');
    } else if (riskLevel === 'medium') {
      recommendations.push('標準的な条件での取引が可能ですが、定期的なモニタリングを実施');
    } else {
      recommendations.push('低リスクのため、通常条件での取引を推奨');
    }

    // 個別リスクへの対応
    const highSeverityFlags = redFlags.filter(f => f.severity === 'high');
    if (highSeverityFlags.length > 0) {
      if (highSeverityFlags.some(f => f.category === 'financial')) {
        recommendations.push('滞納解消計画の提出を条件とする');
      }
      if (highSeverityFlags.some(f => f.category === 'document')) {
        recommendations.push('不足書類の早急な提出を要求');
      }
      if (highSeverityFlags.some(f => f.category === 'transaction')) {
        recommendations.push('追加担保の設定または保証人の追加を検討');
      }
    }

    // 具体的な改善提案
    if (analyses.collection.coverageRatio < 1.5) {
      recommendations.push(
        `担保を現在の${Math.round(analyses.collection.coverageRatio * 100)}%から150%以上に増額`
      );
    }

    if (analyses.arrears.totalArrears > 0) {
      recommendations.push('税金・保険料の分納計画書の提出と実行確認');
    }

    return recommendations;
  }

  private formatCategoryAnalysis(category: string, analysis: any): CategoryAnalysis {
    const score = analysis.score || 0;
    const status = score >= 70 ? 'passed' : score >= 40 ? 'warning' : 'failed';
    
    return {
      score,
      status,
      findings: [
        ...(analysis.findings || []),
        ...(analysis.positives || []),
      ],
      details: analysis,
    };
  }

  private formatTransactionAnalysis(
    collectionAnalysis: any,
    documentAnalysis: any
  ): CategoryAnalysis {
    const score = Math.round(
      (collectionAnalysis.score * 0.7 + 
       (100 - (documentAnalysis.bankStatements?.riskScore || 0)) * 0.3)
    );

    return {
      score,
      status: score >= 70 ? 'passed' : score >= 40 ? 'warning' : 'failed',
      findings: [
        collectionAnalysis.assessment,
        documentAnalysis.bankStatements?.recommendation || '',
      ].filter(Boolean),
      details: {
        collection: collectionAnalysis,
        bankStatements: documentAnalysis.bankStatements,
      },
    };
  }
}