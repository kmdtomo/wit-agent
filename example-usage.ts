// プランA実装の使用例

import { analyzeFactoringApplication } from './src/mastra';

async function main() {
  try {
    // レコードIDを指定して審査を実行
    const recordId = '9559';
    
    console.log(`📋 レコード ${recordId} の審査を開始します...`);
    
    // 審査実行
    const result = await analyzeFactoringApplication(recordId);
    
    // 結果表示
    console.log('\n===== 審査結果 =====');
    console.log(`総合スコア: ${result.overallScore}/100`);
    console.log(`リスクレベル: ${result.riskLevel}`);
    
    // カテゴリ別結果
    console.log('\n📊 カテゴリ別評価:');
    console.log(`  企業信用: ${result.categories.company.score}/100 (${result.categories.company.status})`);
    console.log(`  資金使途: ${result.categories.fundUsage.score}/100 (${result.categories.fundUsage.status})`);
    console.log(`  取引履歴: ${result.categories.transaction.score}/100 (${result.categories.transaction.status})`);
    
    // レッドフラグ
    if (result.redFlags.length > 0) {
      console.log('\n⚠️  検出されたリスク:');
      result.redFlags.forEach(flag => {
        console.log(`  - [${flag.severity}] ${flag.description}`);
      });
    }
    
    // 推奨事項
    console.log('\n💡 推奨アクション:');
    result.recommendations.forEach((rec, index) => {
      console.log(`  ${index + 1}. ${rec}`);
    });
    
    // 画像分析結果（もし存在すれば）
    if (result.documentAnalysis) {
      console.log('\n📄 ドキュメント分析:');
      if (result.documentAnalysis.bankStatements?.extracted) {
        console.log(`  通帳分析: 完了`);
        console.log(`    - 月平均残高: ${result.documentAnalysis.bankStatements.monthlyAverage?.toLocaleString()}円`);
        console.log(`    - 取引数: ${result.documentAnalysis.bankStatements.transactionCount}`);
      }
    }
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
  }
}

// 実行
main();