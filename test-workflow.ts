#!/usr/bin/env tsx

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// __dirnameを定義
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// .env.localから環境変数を読み込み
dotenv.config({ path: path.join(__dirname, '.env.local') });

// 必要なモジュールをインポート
import { ComplianceWorkflow } from './src/mastra/workflows/compliance-workflow';

// 実行関数
async function testWorkflow() {
  const recordId = process.argv[2] || '9559';
  
  console.log('========================================');
  console.log('WIT Agent - Compliance Workflow Test');
  console.log('========================================');
  console.log(`Record ID: ${recordId}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('');
  
  try {
    const workflow = new ComplianceWorkflow();
    
    console.log('🚀 Starting compliance analysis...\n');
    const startTime = Date.now();
    
    const result = await workflow.execute(recordId);
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log('\n========================================');
    console.log('📊 Analysis Results');
    console.log('========================================');
    console.log(JSON.stringify(result, null, 2));
    
    console.log('\n========================================');
    console.log('📈 Summary');
    console.log('========================================');
    console.log(`⏱️  Duration: ${duration} seconds`);
    console.log(`📝 Total Score: ${result.overallScore}/100`);
    console.log(`⚠️  Risk Level: ${result.riskLevel}`);
    console.log(`🚩 Red Flags: ${result.redFlags.length}`);
    console.log(`✅ Recommendations: ${result.recommendations.length}`);
    
    if (result.redFlags.length > 0) {
      console.log('\n🚨 Critical Issues:');
      result.redFlags.forEach((flag, i) => {
        console.log(`   ${i + 1}. ${flag.description}`);
      });
    }
    
    if (result.recommendations.length > 0) {
      console.log('\n💡 Top Recommendations:');
      result.recommendations.slice(0, 3).forEach((rec, i) => {
        console.log(`   ${i + 1}. ${rec}`);
      });
    }
    
    console.log('\n✅ Test completed successfully!');
    
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  }
}

// メイン実行
testWorkflow().catch(console.error);