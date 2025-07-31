#!/usr/bin/env node

/**
 * 日本詐欺・犯罪歴チェック機能のテストスクリプト
 *
 * 使用方法:
 * node test-japanese-fraud-check.js [氏名]
 *
 * 例:
 * node test-japanese-fraud-check.js "へずまりゅう"
 * node test-japanese-fraud-check.js "田中太郎"
 */

import { japaneseFraudCheckTool } from "./src/mastra/tools/japanese-fraud-check-tool.js";

async function testJapaneseFraudCheck() {
  const testName = process.argv[2] || "へずまりゅう";

  console.log(`🇯🇵 日本詐欺・犯罪歴チェック テスト開始`);
  console.log(`対象者: ${testName}`);
  console.log("=".repeat(60));

  try {
    // テストケース1: 基本チェック
    console.log(`\n🔍 テスト1: 基本チェック (${testName})`);
    const result1 = await japaneseFraudCheckTool.execute({
      context: {
        name: testName,
        checkLevel: "standard",
      },
    });

    displayResults(result1, "基本チェック");

    // テストケース2: 徹底チェック
    console.log(`\n🔍 テスト2: 徹底チェック (${testName})`);
    const result2 = await japaneseFraudCheckTool.execute({
      context: {
        name: testName,
        aliases: ["原田将大"],
        additionalInfo: "YouTuber",
        checkLevel: "thorough",
      },
    });

    displayResults(result2, "徹底チェック");

    // テストケース3: 複数の別名テスト
    console.log(`\n🔍 テスト3: 複数別名チェック`);
    const result3 = await japaneseFraudCheckTool.execute({
      context: {
        name: "田中太郎",
        aliases: ["田中一郎", "TANAKA"],
        additionalInfo: "会社員",
        checkLevel: "standard",
      },
    });

    displayResults(result3, "複数別名チェック");

    console.log("\n✅ すべてのテストが完了しました");
  } catch (error) {
    console.error("❌ テスト実行エラー:", error);
    process.exit(1);
  }
}

function displayResults(result, testType) {
  console.log(`\n📊 ${testType} 結果:`);
  console.log("-".repeat(40));

  // サマリー表示
  const summary = result.summary;
  console.log(
    `🎯 総合リスクレベル: ${summary.riskLevel} (スコア: ${summary.overallRiskScore.toFixed(2)})`
  );
  console.log(`📝 総発見数: ${summary.totalFindings}件`);
  console.log(`⏱️  処理時間: ${result.processingTime}ms`);

  // 各検索結果の表示
  console.log("\n🔍 検索結果詳細:");

  // 基本検索
  if (result.results.basicSearch.foundCount > 0) {
    console.log(`\n  📋 基本検索: ${result.results.basicSearch.foundCount}件`);
    result.results.basicSearch.results.slice(0, 3).forEach((item, index) => {
      console.log(
        `    ${index + 1}. ${item.title} (リスク: ${item.riskScore.toFixed(2)})`
      );
      console.log(`       ${item.snippet.substring(0, 100)}...`);
    });
  }

  // 詐欺検索
  if (result.results.fraudSearch.foundCount > 0) {
    console.log(
      `\n  🚨 詐欺関連検索: ${result.results.fraudSearch.foundCount}件`
    );
    result.results.fraudSearch.results.slice(0, 3).forEach((item, index) => {
      console.log(
        `    ${index + 1}. ${item.title} (リスク: ${item.riskScore.toFixed(2)})`
      );
      console.log(`       ${item.snippet.substring(0, 100)}...`);
    });
  }

  // 逮捕歴検索
  if (result.results.arrestSearch.foundCount > 0) {
    console.log(
      `\n  🚔 逮捕歴検索: ${result.results.arrestSearch.foundCount}件`
    );
    result.results.arrestSearch.results.slice(0, 3).forEach((item, index) => {
      console.log(
        `    ${index + 1}. ${item.title} (リスク: ${item.riskScore.toFixed(2)})`
      );
      console.log(`       ${item.snippet.substring(0, 100)}...`);
    });
  }

  // 詐欺サイトチェック
  console.log("\n🌐 詐欺情報サイトチェック:");
  console.log(
    `  • やまがたまさかげ: ${result.results.fraudSiteCheck.yamagatamasakage.found ? "⚠️ 該当あり" : "✅ 該当なし"}`
  );
  console.log(`    ${result.results.fraudSiteCheck.yamagatamasakage.details}`);
  console.log(
    `  • ブラックマネー詐欺師撲滅: ${result.results.fraudSiteCheck.blackmoneyScammers.found ? "⚠️ 該当あり" : "✅ 該当なし"}`
  );
  console.log(
    `    ${result.results.fraudSiteCheck.blackmoneyScammers.details}`
  );

  // 推奨アクション
  if (summary.recommendations.length > 0) {
    console.log("\n💡 推奨アクション:");
    summary.recommendations.forEach((rec, index) => {
      console.log(`  ${index + 1}. ${rec}`);
    });
  }

  // 緊急対応
  if (summary.urgentActions.length > 0) {
    console.log("\n🚨 緊急対応:");
    summary.urgentActions.forEach((action, index) => {
      console.log(`  ${index + 1}. ${action}`);
    });
  }
}

// 追加のテスト関数
async function runComprehensiveTests() {
  console.log("\n🧪 包括的テストケース実行中...\n");

  const testCases = [
    {
      name: "へずまりゅう",
      aliases: ["原田将大", "hezuma"],
      info: "迷惑系YouTuber",
      expectedRisk: "HIGH",
    },
    {
      name: "田中太郎",
      aliases: ["田中一郎"],
      info: "一般会社員",
      expectedRisk: "LOW",
    },
    {
      name: "シバター",
      aliases: ["斎藤光"],
      info: "YouTuber",
      expectedRisk: "MEDIUM",
    },
  ];

  for (const testCase of testCases) {
    console.log(
      `\n🎯 テストケース: ${testCase.name} (期待リスク: ${testCase.expectedRisk})`
    );

    try {
      const result = await japaneseFraudCheckTool.execute({
        context: {
          name: testCase.name,
          aliases: testCase.aliases,
          additionalInfo: testCase.info,
          checkLevel: "thorough",
        },
      });

      const actualRisk = result.summary.riskLevel;
      const passed =
        actualRisk === testCase.expectedRisk ||
        (testCase.expectedRisk === "LOW" &&
          ["LOW", "MEDIUM"].includes(actualRisk)) ||
        (testCase.expectedRisk === "HIGH" &&
          ["HIGH", "CRITICAL"].includes(actualRisk));

      console.log(`  結果: ${actualRisk} ${passed ? "✅ PASS" : "❌ FAIL"}`);
      console.log(`  発見数: ${result.summary.totalFindings}件`);
      console.log(`  処理時間: ${result.processingTime}ms`);
    } catch (error) {
      console.error(`  ❌ エラー: ${error.message}`);
    }
  }
}

// スクリプトの実行
if (process.argv.includes("--comprehensive")) {
  runComprehensiveTests();
} else {
  testJapaneseFraudCheck();
}
