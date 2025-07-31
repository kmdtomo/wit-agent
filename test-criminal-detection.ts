/**
 * 重大犯罪者検出機能のテストスクリプト
 * 酒鬼薔薇聖斗のような凶悪犯罪者が適切に検出されるかをテスト
 */

import { analyzeFraudInformationWithAI } from './src/mastra/tools/japanese-fraud-check-tool.ts';

async function testCriminalDetection() {
  console.log('🧪 重大犯罪者検出機能テスト開始\n');

  const testCases = [
    {
      name: '酒鬼薔薇聖斗',
      description: '神戸連続児童殺傷事件の犯人（凶悪犯罪者）',
      expectedFound: true,
      expectedRiskScore: 1.0
    },
    {
      name: 'さかきばらせいと',
      description: '酒鬼薔薇聖斗のひらがな表記',
      expectedFound: true,
      expectedRiskScore: 1.0
    },
    {
      name: '元少年A',
      description: '酒鬼薔薇聖斗の別名',
      expectedFound: true,
      expectedRiskScore: 1.0
    },
    {
      name: '宅間守',
      description: '附属池田小事件の犯人（凶悪犯罪者）',
      expectedFound: true,
      expectedRiskScore: 1.0
    },
    {
      name: '田中太郎',
      description: '一般的な名前（犯罪者ではない）',
      expectedFound: false,
      expectedRiskScore: 0
    },
    {
      name: '山田花子',
      description: '一般的な名前（犯罪者ではない）',
      expectedFound: false,
      expectedRiskScore: 0
    }
  ];

  let passedTests = 0;
  const totalTests = testCases.length;

  for (const testCase of testCases) {
    console.log(`🔍 テスト: ${testCase.name} (${testCase.description})`);
    
    try {
      // 重大犯罪者データベースをチェック
      const result = await analyzeFraudInformationWithAI(
        testCase.name,
        'major_criminals_japan'
      );

      const passed = 
        result.found === testCase.expectedFound &&
        result.riskScore === testCase.expectedRiskScore;

      if (passed) {
        console.log(`✅ PASS: ${testCase.name}`);
        console.log(`   期待値: found=${testCase.expectedFound}, risk=${testCase.expectedRiskScore}`);
        console.log(`   実際値: found=${result.found}, risk=${result.riskScore}`);
        if (result.found) {
          console.log(`   詳細: ${result.details}`);
        }
        passedTests++;
      } else {
        console.log(`❌ FAIL: ${testCase.name}`);
        console.log(`   期待値: found=${testCase.expectedFound}, risk=${testCase.expectedRiskScore}`);
        console.log(`   実際値: found=${result.found}, risk=${result.riskScore}`);
        if (result.found) {
          console.log(`   詳細: ${result.details}`);
        }
      }
    } catch (error) {
      console.log(`❌ ERROR: ${testCase.name} - ${error.message}`);
    }
    
    console.log('');
  }

  console.log('📊 テスト結果サマリー');
  console.log(`✅ 成功: ${passedTests}/${totalTests}`);
  console.log(`❌ 失敗: ${totalTests - passedTests}/${totalTests}`);
  console.log(`📈 成功率: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

  if (passedTests === totalTests) {
    console.log('\n🎉 全てのテストが成功しました！');
    console.log('🚨 酒鬼薔薇聖斗のような凶悪犯罪者が正しく検出されます。');
  } else {
    console.log('\n⚠️ 一部のテストが失敗しました。修正が必要です。');
  }
}

// テスト実行
testCriminalDetection().catch(console.error);