import type { 
  PurchaseInfo, 
  CollateralInfo, 
  RegistryInfo,
  FinancialRiskInfo,
  FundUsageInfo,
  CollectionInfo
} from '../types';

// ========== 1. 企業信用評価ツール ==========
export const analyzeCompanyTool = {
  name: 'analyzeCompany',
  description: '企業の信用力を包括的に評価',
  execute: async ({ 
    registries, 
    purchases, 
    collaterals 
  }: {
    registries: RegistryInfo[];
    purchases: PurchaseInfo[];
    collaterals: CollateralInfo[];
  }) => {
    const analysis = {
      score: 0,
      findings: [] as string[],
      risks: [] as string[],
    };

    // 資本金チェック
    registries.forEach((registry: RegistryInfo) => {
      const capital = parseInt(registry.資本金の額.replace(/[^\d]/g, ''), 10);
      if (capital >= 10000000) {
        analysis.score += 20;
        analysis.findings.push(`資本金${registry.資本金の額}は十分な規模`);
      } else if (capital >= 5000000) {
        analysis.score += 10;
        analysis.findings.push(`資本金${registry.資本金の額}は中規模`);
      } else {
        analysis.risks.push('資本金が少額でリスクあり');
      }
    });

    // 買取債権と担保のバランス評価
    const totalPurchase = purchases.reduce((sum: number, p: PurchaseInfo) => 
      sum + p.買取債権額, 0);
    const avgCollateral = collaterals.reduce((sum: number, c: CollateralInfo) => 
      sum + c.平均, 0) / Math.max(collaterals.length, 1);
    
    const collateralRatio = avgCollateral / totalPurchase;
    if (collateralRatio >= 1.5) {
      analysis.score += 30;
      analysis.findings.push('担保が十分で回収リスクが低い');
    } else if (collateralRatio >= 1.0) {
      analysis.score += 20;
      analysis.findings.push('担保と買取額のバランスが適正');
    } else {
      analysis.risks.push('担保不足の可能性あり');
    }

    // 過去の入金実績評価
    collaterals.forEach((collateral: CollateralInfo) => {
      const trend = [
        collateral.過去の入金_先々月,
        collateral.過去の入金_先月,
        collateral.過去の入金_今月
      ];
      
      const isStable = trend.every(amount => 
        Math.abs(amount - collateral.平均) / collateral.平均 < 0.3
      );
      
      if (isStable) {
        analysis.score += 20;
        analysis.findings.push(`${collateral.会社名_第三債務者_担保}からの入金が安定`);
      } else {
        analysis.risks.push(`${collateral.会社名_第三債務者_担保}の入金が不安定`);
      }
    });

    // 支払日遵守チェック
    purchases.forEach((purchase: PurchaseInfo) => {
      if (purchase.状態_0 === '確定債権') {
        analysis.score += 10;
        analysis.findings.push('債権状態が確定で安定');
      }
    });

    return {
      score: Math.min(analysis.score, 100),
      findings: analysis.findings,
      risks: analysis.risks,
      recommendation: analysis.score >= 70 ? 
        '企業信用度は良好' : 
        '追加の担保または保証を検討'
    };
  }
};

// ========== 2. 資金使途妥当性評価ツール ==========
export const analyzeFundUsageTool = {
  name: 'analyzeFundUsage',
  description: '資金使途の妥当性と横領リスクを評価',
  execute: async ({ 
    fundUsage, 
    financialInfo, 
    requestAmount 
  }: {
    fundUsage: {
      資金使途: string;
      所感_条件_担当者: string;
      所感_条件_決裁者: string;
    };
    financialInfo: {
      業種: string;
      売上: number;
    };
    requestAmount: number;
  }) => {
    const analysis = {
      score: 100, // 減点方式
      legitimacy: 'high' as 'high' | 'medium' | 'low',
      concerns: [] as string[],
      positives: [] as string[],
    };

    // 資金使途の具体性チェック
    const usage = fundUsage.資金使途;
    const specificKeywords = ['外注費', '材料費', '仕入れ', '給料', '固定費'];
    const hasSpecificUsage = specificKeywords.some(keyword => 
      usage.includes(keyword)
    );

    if (hasSpecificUsage) {
      analysis.positives.push('資金使途が具体的で明確');
    } else {
      analysis.score -= 20;
      analysis.concerns.push('資金使途の具体性が不足');
    }

    // 業種との整合性チェック
    const industryUsageMap: Record<string, string[]> = {
      '建設業': ['外注費', '材料費', '重機', '工具'],
      '製造業': ['原材料', '部品', '設備'],
      'IT業': ['外注費', '機器', 'ライセンス'],
      '小売業': ['仕入れ', '在庫'],
    };

    const expectedUsages = industryUsageMap[financialInfo.業種] || [];
    const isAligned = expectedUsages.some(expected => 
      usage.includes(expected)
    );

    if (isAligned) {
      analysis.positives.push(`業種（${financialInfo.業種}）と資金使途が整合`);
    } else if (expectedUsages.length > 0) {
      analysis.score -= 15;
      analysis.concerns.push('業種と資金使途にミスマッチの可能性');
    }

    // 金額の妥当性チェック
    const revenueRatio = requestAmount / financialInfo.売上;
    if (revenueRatio > 0.5) {
      analysis.score -= 25;
      analysis.concerns.push('売上に対して申請額が過大');
      analysis.legitimacy = 'medium';
    } else if (revenueRatio > 0.3) {
      analysis.score -= 10;
      analysis.concerns.push('売上に対して申請額がやや大きい');
    } else {
      analysis.positives.push('売上に対する申請額が適正範囲');
    }

    // 担当者と決裁者の所感分析
    const hasDetailedNotes = 
      fundUsage.所感_条件_担当者.length > 50 &&
      fundUsage.所感_条件_決裁者.length > 30;

    if (hasDetailedNotes) {
      analysis.positives.push('審査記録が詳細で信頼性が高い');
    } else {
      analysis.score -= 10;
      analysis.concerns.push('審査記録の詳細度が不足');
    }

    // 横領リスク評価
    const riskKeywords = ['生活費', '個人', '借金返済', 'ギャンブル'];
    const hasRiskKeyword = riskKeywords.some(keyword => 
      usage.includes(keyword) || 
      fundUsage.所感_条件_担当者.includes(keyword)
    );

    if (hasRiskKeyword) {
      analysis.score -= 30;
      analysis.concerns.push('横領リスクの懸念あり');
      analysis.legitimacy = 'low';
    }

    return {
      score: Math.max(analysis.score, 0),
      legitimacy: analysis.legitimacy,
      concerns: analysis.concerns,
      positives: analysis.positives,
      recommendation: analysis.score >= 70 ? 
        '資金使途は妥当' : 
        '資金使途の詳細確認と使途制限を推奨'
    };
  }
};

// ========== 3. 滞納リスク評価ツール ==========
export const analyzeArrearsRiskTool = {
  name: 'analyzeArrearsRisk',
  description: '税金・保険料の滞納状況からリスクを評価',
  execute: async ({ 
    taxStatus, 
    taxArrears, 
    insuranceStatus, 
    insuranceArrears 
  }: {
    taxStatus: string;
    taxArrears: number;
    insuranceStatus: string;
    insuranceArrears: number;
  }) => {
    let riskScore = 100;
    const issues = [] as string[];
    const positives = [] as string[];

    // 税金滞納チェック
    if (taxArrears === 0 && taxStatus.includes('滞納なし')) {
      positives.push('税金の滞納なし');
    } else if (taxArrears > 0) {
      const severity = taxArrears > 1000000 ? 40 : 
                      taxArrears > 500000 ? 25 : 15;
      riskScore -= severity;
      issues.push(`税金滞納額: ${taxArrears.toLocaleString()}円`);
    }

    // 保険料滞納チェック
    if (insuranceArrears === 0 && insuranceStatus.includes('滞納なし')) {
      positives.push('保険料の滞納なし');
    } else if (insuranceArrears > 0) {
      const severity = insuranceArrears > 500000 ? 35 : 
                      insuranceArrears > 200000 ? 20 : 10;
      riskScore -= severity;
      issues.push(`保険料滞納額: ${insuranceArrears.toLocaleString()}円`);
    }

    // 総合評価
    const totalArrears = taxArrears + insuranceArrears;
    let riskLevel: 'low' | 'medium' | 'high';
    
    if (totalArrears === 0) {
      riskLevel = 'low';
    } else if (totalArrears < 300000) {
      riskLevel = 'medium';
    } else {
      riskLevel = 'high';
    }

    return {
      score: Math.max(riskScore, 0),
      riskLevel,
      totalArrears,
      issues,
      positives,
      recommendation: riskLevel === 'high' ? 
        '滞納解消計画の提出を必須とする' :
        riskLevel === 'medium' ?
        '滞納状況の改善を条件とする' :
        '滞納リスクなし'
    };
  }
};

// ========== 4. 回収可能性評価ツール ==========
export const analyzeCollectionTool = {
  name: 'analyzeCollection',
  description: '債権回収の可能性を評価',
  execute: async ({ 
    collections, 
    collaterals 
  }: {
    collections: CollectionInfo[];
    collaterals: CollateralInfo[];
  }) => {
    const totalCollection = collections.reduce((sum, c) => 
      sum + c.回収金額, 0
    );
    
    const totalCollateralAvg = collaterals.reduce((sum: number, c: CollateralInfo) => 
      sum + c.平均, 0
    );

    const coverageRatio = totalCollateralAvg / totalCollection;
    let score = 0;
    let assessment = '';

    if (coverageRatio >= 2.0) {
      score = 100;
      assessment = '回収可能性が非常に高い';
    } else if (coverageRatio >= 1.5) {
      score = 80;
      assessment = '回収可能性が高い';
    } else if (coverageRatio >= 1.0) {
      score = 60;
      assessment = '回収可能性は標準的';
    } else if (coverageRatio >= 0.7) {
      score = 40;
      assessment = '回収にリスクあり';
    } else {
      score = 20;
      assessment = '回収困難の可能性が高い';
    }

    // 回収予定日のチェック
    const today = new Date();
    const upcomingCollections = collections.filter(c => {
      const collectionDate = new Date(c.回収予定日);
      const daysUntil = (collectionDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
      return daysUntil >= 0 && daysUntil <= 90;
    });

    return {
      score,
      assessment,
      coverageRatio: Math.round(coverageRatio * 100) / 100,
      totalCollectionAmount: totalCollection,
      averageCollateral: Math.round(totalCollateralAvg),
      upcomingCollections: upcomingCollections.length,
      recommendation: score >= 60 ? 
        '回収計画は妥当' : 
        '追加担保の設定を強く推奨'
    };
  }
};