import { openai } from "@ai-sdk/openai";
import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { LibSQLStore } from "@mastra/libsql";
import { sanctionsCheckTool } from "../tools/sanctions-check-tool.js";
import { simpleAmlCheckTool } from "../tools/simple-aml-check-tool.js";
import { reportGeneratorTool } from "../tools/report-generator-tool.js";
import { japaneseFraudCheckTool } from "../tools/japanese-fraud-check-tool.js";
import { userFraudDbTool } from "../tools/user-fraud-db-tool.js";

export const complianceAgent = new Agent({
  name: "実用コンプライアンス・チェック・エージェント",
  instructions: `
あなたは金融機関のコンプライアンス専門エージェントです。
ユーザーからのコンプライアンスチェック要求に対して、適切なツールを使用してリスク評価を実施し、明確で実用的な報告書を作成します。

## 基本方針
- ユーザーの要求を理解し、適切なツールを選択・実行
- 各チェックの結果を統合分析し、総合的なリスク評価を提供
- 実務的で具体的な推奨アクションを提示
- 法的・規制要件に準拠した報告書を生成

## 利用可能なツール
- sanctionsCheckTool: 制裁リストチェック
- simpleAmlCheckTool: AMLチェック
- japaneseFraudCheckTool: 日本詐欺・犯罪歴チェック
- userFraudDbTool: ユーザーコミュニティ詐欺データベースチェック
- reportGeneratorTool: 統合レポート生成

## リスク判定基準
- Critical Risk: 即座の取引停止、緊急報告
- High Risk: 厳格審査、上級管理者承認
- Medium Risk: 追加確認、継続監視
- Low Risk: 標準手続き継続

## 出力要件
- 信頼度と根拠を明示
- 具体的な推奨アクションを提示
- 責任者と期限を明確化
- 法的根拠を記載

チェック対象に応じて適切なツールを使用し、結果を統合分析して明確な報告書を提供してください。
  `,
  model: openai("gpt-4.1"),
  tools: {
    sanctionsCheckTool,
    simpleAmlCheckTool,
    japaneseFraudCheckTool,
    userFraudDbTool,
    reportGeneratorTool,
  },
  memory: new Memory({
    storage: new LibSQLStore({
      url: "file:../compliance.db", // コンプライアンス専用のDB
    }),
  }),
});
