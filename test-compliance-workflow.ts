/**
 * 統合コンプライアンスワークフローのテスト
 * 酒鬼薔薇聖斗で実際のコンプライアンスチェック処理をテスト
 */

import { simpleAmlCheckTool } from './src/mastra/tools/simple-aml-check-tool.ts';
import { sanctionsCheckTool } from './src/mastra/tools/sanctions-check-tool.ts';
import { japaneseFraudCheckTool } from './src/mastra/tools/japanese-fraud-check-tool.ts';

async function testComplianceWorkflow() {
  console.log('🏛️ 統合コンプライアンスワークフロー テスト開始');
  console.log('🚨 対象: 酒鬼薔薇聖斗（凶悪犯罪者）\n');

  const targetName = '酒鬼薔薇聗斗';

  try {
    // 1. Simple AML チェック
    console.log('📋 1. Simple AMLチェック実行中...');
    const amlResult = await simpleAmlCheckTool.execute({
      context: { name: targetName }
    });

    console.log(`   結果: ${amlResult.riskAnalysis.riskLevel} (スコア: ${amlResult.riskAnalysis.overallRiskScore})`);
    console.log(`   詳細: ${amlResult.riskAnalysis.details}`);
    console.log(`   推奨アクション:`);
    amlResult.recommendations.forEach(rec => console.log(`     - ${rec}`));
    console.log('');

    // 2. 制裁リストチェック
    console.log('📋 2. 制裁リストチェック実行中...');
    const sanctionsResult = await sanctionsCheckTool.execute({
      context: { name: targetName }
    });

    console.log(`   結果: ${sanctionsResult.riskAssessment} (一致数: ${sanctionsResult.totalMatches})`);
    if (sanctionsResult.matches.length > 0) {
      console.log(`   一致情報:`);
      sanctionsResult.matches.forEach(match => {
        console.log(`     - ${match.name} (${match.matchType}, スコア: ${(match.matchScore * 100).toFixed(1)}%)`);
        console.log(`       理由: ${match.reason}`);
      });
    }
    console.log(`   推奨アクション:`);
    sanctionsResult.recommendations.forEach(rec => console.log(`     - ${rec}`));
    console.log('');

    // 3. 日本詐欺・犯罪歴チェック
    console.log('📋 3. 日本詐欺・犯罪歴チェック実行中...');
    const fraudResult = await japaneseFraudCheckTool.execute({
      context: { name: targetName }
    });

    console.log(`   結果: ${fraudResult.summary.riskLevel} (スコア: ${fraudResult.summary.overallRiskScore})`);
    console.log(`   総発見数: ${fraudResult.summary.totalFindings}件`);
    
    if (fraudResult.results.fraudSiteCheck.yamagatamasakage.found || 
        fraudResult.results.fraudSiteCheck.blackmoneyScammers.found) {
      console.log(`   詐欺サイトチェック:`);
      if (fraudResult.results.fraudSiteCheck.yamagatamasakage.found) {
        console.log(`     - yamagatamasakage: ${fraudResult.results.fraudSiteCheck.yamagatamasakage.details}`);
      }
      if (fraudResult.results.fraudSiteCheck.blackmoneyScammers.found) {
        console.log(`     - blackmoneyScammers: ${fraudResult.results.fraudSiteCheck.blackmoneyScammers.details}`);
      }
    }

    console.log(`   推奨アクション:`);
    fraudResult.summary.recommendations.forEach(rec => console.log(`     - ${rec}`));
    
    if (fraudResult.summary.urgentActions.length > 0) {
      console.log(`   緊急対応:`);
      fraudResult.summary.urgentActions.forEach(action => console.log(`     🚨 ${action}`));
    }
    console.log('');

    // 4. 総合判定
    console.log('📊 総合判定結果');
    console.log('==========================================');

    const overallRisk = Math.max(
      amlResult.riskAnalysis.overallRiskScore,
      sanctionsResult.totalMatches > 0 ? 8 : 0,
      fraudResult.summary.overallRiskScore
    );

    let overallLevel = 'LOW';
    if (overallRisk >= 8) overallLevel = 'CRITICAL';
    else if (overallRisk >= 6) overallLevel = 'HIGH';
    else if (overallRisk >= 4) overallLevel = 'MEDIUM';

    console.log(`🎯 最終リスク判定: ${overallLevel}`);
    console.log(`📈 最高リスクスコア: ${overallRisk}/10`);
    console.log(`⏱️ 処理時間:`);
    console.log(`   - AMLチェック: ${amlResult.riskAnalysis.processingTimeMs}ms`);
    console.log(`   - 制裁リスト: ${sanctionsResult.processingTimeMs}ms`);
    console.log(`   - 詐欺・犯罪歴: ${fraudResult.processingTime}ms`);

    if (overallLevel === 'CRITICAL') {
      console.log(`\n🚨🚨🚨 CRITICAL ALERT 🚨🚨🚨`);
      console.log(`重大犯罪者として検出されました。`);
      console.log(`即座の取引拒否・関係当局への報告が必要です。`);
    }

  } catch (error) {
    console.error('❌ テスト実行エラー:', error);
  }
}

// テスト実行
testComplianceWorkflow().catch(console.error);