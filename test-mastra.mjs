#!/usr/bin/env node

import dotenv from 'dotenv';
dotenv.config();

// テスト用のモックデータ
const mockRecord = {
  recordId: '9559',
  basic: {
    顧客番号: 'C-00011653',
    入金日: '2025-08-15',
    会社_屋号名: '小林建設',
    代表者名: '小林亮介',
    生年月日: '1983-10-25',
    携帯番号_ハイフンなし: '09051615644',
  },
  purchases: [{
    会社名_第三債務者_買取: 'キングアソシエイト株式会社',
    買取債権額: 480000,
    買取額: 410000,
    掛目: '86.58%',
    買取債権支払日: '2025-09-16',
    状態_0: '確定債権',
  }],
  collaterals: [{
    会社名_第三債務者_担保: 'キングアソシエイト株式会社',
    請求額: 700000,
    入金予定日: '2025-10-15',
    過去の入金_先々月: 627000,
    過去の入金_先月: 1840300,
    過去の入金_今月: 585200,
    平均: 1017500,
  }],
  registries: [{
    会社名_第三債務者_0: 'キングアソシエイト株式会社',
    資本金の額: '500万',
    会社成立: '令和6年',
    債権の種類: '買取・担保',
  }],
  collections: [{
    回収予定日: '2025-09-16',
    回収金額: 480000,
  }],
  fundUsage: {
    所感_条件_担当者: '希望金額：90万、資金使途：外注70万、材料20万',
    所感_条件_決裁者: 'ペイトナーを使用せず一本化しようとしています。',
  },
  financialRisk: {
    売上: 20479100,
    業種: '建設業',
    資金使途: '外注費',
    ファクタリング利用: '',
    納付状況_税金: '税金滞納なし',
    税金滞納額_0: 0,
    納付状況_税金_0: '国保滞納なし',
    保険料滞納額: 0,
  },
  attachments: {
    買取情報_成因証書_謄本類_名刺等_添付ファイル: [],
    通帳_メイン_添付ファイル: [],
    通帳_その他_添付ファイル: [],
    顧客情報_添付ファイル: [],
    他社資料_添付ファイル: [],
    担保情報_成因証書_謄本類_名刺等_添付ファイル: [],
    その他_添付ファイル: [],
  },
};

async function testAnalysisTools() {
  try {
    console.log('🧪 Mastraツールのテストを開始...\n');
    
    // 動的インポート
    const { 
      analyzeCompanyTool,
      analyzeFundUsageTool,
      analyzeArrearsRiskTool,
      analyzeCollectionTool
    } = await import('./src/mastra/tools/analysis-tools.js');
    
    // 1. 企業信用評価テスト
    console.log('📊 企業信用評価を実行中...');
    const companyResult = await analyzeCompanyTool.execute({
      registries: mockRecord.registries,
      purchases: mockRecord.purchases,
      collaterals: mockRecord.collaterals,
    });
    console.log('企業信用スコア:', companyResult.score);
    console.log('所見:', companyResult.findings);
    console.log('');
    
    // 2. 資金使途評価テスト
    console.log('💰 資金使途評価を実行中...');
    const fundResult = await analyzeFundUsageTool.execute({
      fundUsage: {
        資金使途: mockRecord.financialRisk.資金使途,
        所感_条件_担当者: mockRecord.fundUsage.所感_条件_担当者,
        所感_条件_決裁者: mockRecord.fundUsage.所感_条件_決裁者,
      },
      financialInfo: {
        業種: mockRecord.financialRisk.業種,
        売上: mockRecord.financialRisk.売上,
      },
      requestAmount: mockRecord.purchases[0].買取額,
    });
    console.log('資金使途スコア:', fundResult.score);
    console.log('妥当性:', fundResult.legitimacy);
    console.log('');
    
    // 3. 滞納リスク評価テスト
    console.log('⚠️  滞納リスク評価を実行中...');
    const arrearsResult = await analyzeArrearsRiskTool.execute({
      taxStatus: mockRecord.financialRisk.納付状況_税金,
      taxArrears: mockRecord.financialRisk.税金滞納額_0,
      insuranceStatus: mockRecord.financialRisk.納付状況_税金_0,
      insuranceArrears: mockRecord.financialRisk.保険料滞納額,
    });
    console.log('滞納リスクスコア:', arrearsResult.score);
    console.log('リスクレベル:', arrearsResult.riskLevel);
    console.log('');
    
    // 4. 回収可能性評価テスト
    console.log('🔄 回収可能性評価を実行中...');
    const collectionResult = await analyzeCollectionTool.execute({
      collections: mockRecord.collections,
      collaterals: mockRecord.collaterals,
    });
    console.log('回収可能性スコア:', collectionResult.score);
    console.log('評価:', collectionResult.assessment);
    console.log('カバー率:', collectionResult.coverageRatio);
    console.log('');
    
    // 総合評価
    const totalScore = Math.round(
      (companyResult.score + fundResult.score + arrearsResult.score + collectionResult.score) / 4
    );
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ 総合評価スコア:', totalScore);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
  }
}

// テスト実行
testAnalysisTools();