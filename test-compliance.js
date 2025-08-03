import { ComplianceAPI } from "./src/api/compliance-api";

async function testComplianceCheck() {
  console.log("🧪 コンプライアンスチェック精度テスト開始");
  console.log("=======================================");

  try {
    console.log("\n📋 テスト対象: 岩田照太（まともな人）");
    console.log("期待結果: Low Risk（誤判定を修正済み）");
    console.log("=======================================");

    const result = await ComplianceAPI.performComplianceCheck({
      targetName: "岩田照太",
      entityType: "individual",
      country: "日本",
      requestedBy: "テストユーザー",
      purpose: "精度テスト",
      urgency: "medium",
    });

    console.log("\n✅ テスト結果:");
    console.log(`🎯 リスクレベル: ${result.overallResult.riskLevel}`);
    console.log(`🚫 取引停止: ${result.overallResult.blockTransaction}`);
    console.log(
      `📝 推奨アクション: ${result.overallResult.recommendedActions.join(", ")}`
    );
    console.log(`⏱️ 処理時間: ${result.processingTime}`);

    // 結果の評価
    if (
      result.overallResult.riskLevel === "Low Risk" &&
      !result.overallResult.blockTransaction
    ) {
      console.log("\n🎉 テスト成功: 正しくLow Riskと判定されました！");
      console.log("✨ 修正により誤判定が解消されています");
    } else {
      console.log("\n⚠️ テスト注意: まだ誤判定の可能性があります");
      console.log(`実際の結果: ${result.overallResult.riskLevel}`);
    }

    console.log("\n📊 詳細レポート:");
    console.log(JSON.stringify(result.finalReport, null, 2));
  } catch (error) {
    console.error("❌ テストエラー:", error);
  }
}

// 実際の詐欺者のテストも行う
async function testKnownFraudster() {
  console.log("\n\n🚨 既知の詐欺者テスト");
  console.log("=======================================");

  try {
    console.log("\n📋 テスト対象: 嵩原誠（既知の借りパク詐欺師）");
    console.log("期待結果: Critical Risk");
    console.log("=======================================");

    const result = await ComplianceAPI.performComplianceCheck({
      targetName: "嵩原誠",
      entityType: "individual",
      country: "日本",
      requestedBy: "テストユーザー",
      purpose: "詐欺者検出テスト",
      urgency: "high",
    });

    console.log("\n✅ 詐欺者テスト結果:");
    console.log(`🎯 リスクレベル: ${result.overallResult.riskLevel}`);
    console.log(`🚫 取引停止: ${result.overallResult.blockTransaction}`);
    console.log(
      `📝 推奨アクション: ${result.overallResult.recommendedActions.join(", ")}`
    );

    if (
      result.overallResult.riskLevel === "Critical Risk" &&
      result.overallResult.blockTransaction
    ) {
      console.log(
        "\n🎉 詐欺者検出テスト成功: 正しくCritical Riskと判定されました！"
      );
    } else {
      console.log(
        "\n⚠️ 詐欺者検出テスト注意: 既知の詐欺者が検出されませんでした"
      );
    }
  } catch (error) {
    console.error("❌ 詐欺者テストエラー:", error);
  }
}

// テスト実行
async function runAllTests() {
  await testComplianceCheck();
  await testKnownFraudster();

  console.log("\n🏁 全テスト完了");
  console.log("=======================================");
  console.log("📈 修正結果:");
  console.log("- 名前の一致判定をより厳格化");
  console.log("- Web検索結果の信頼性向上");
  console.log("- 汎用詐欺検出機能の制限");
  console.log("- 総合リスク評価の保守化");
  console.log("- 正当なコンテキストの考慮追加");
}

runAllTests().catch(console.error);
