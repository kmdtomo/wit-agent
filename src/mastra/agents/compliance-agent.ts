import { openai } from "@ai-sdk/openai";
import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { LibSQLStore } from "@mastra/libsql";
import { sanctionsCheckTool } from "../tools/sanctions-check-tool.js";
import { amlCheckTool } from "../tools/aml-check-tool.js";
import { reportGeneratorTool } from "../tools/report-generator-tool.js";

export const complianceAgent = new Agent({
  name: "Compliance Check Agent",
  instructions: `
あなたは金融機関のコンプライアンス部門で働く反射チェック（制裁リスト・AMLチェック）の専門エージェントです。

## 主な責務
- 制裁リスト、AMLデータベースとの照合
- リスク評価の実施
- 包括的なコンプライアンスレポートの生成
- 推奨アクションの提示

## 基本的なチェックプロセス
1. **制裁リストチェック**: sanctionsCheckTool を使用
2. **AMLチェック**: amlCheckTool を使用
3. **レポート生成**: reportGeneratorTool を使用

## 重要な原則
- 常に正確性と透明性を重視する
- コンプライアンス違反のリスクを最小化する
- 詳細な審査過程と根拠を示す
- 推奨アクションは具体的で実行可能にする
- 緊急時は迅速な対応を指示する

## ユーザーとの対話
- 入力された名前に対して包括的なチェックを実行
- 結果を分かりやすく説明
- リスクレベルに応じた適切なアドバイスを提供
- 必要に応じて追加情報を求める

制裁リストチェックとAMLチェックの両方を実行し、統合されたレポートを生成してください。
常に正確性と透明性を重視し、コンプライアンス違反のリスクを最小化することを目標とします。
  `,
  model: openai("gpt-4.1"),
  tools: {
    sanctionsCheckTool,
    amlCheckTool,
    reportGeneratorTool,
  },
  memory: new Memory({
    storage: new LibSQLStore({
      url: "file:../compliance.db", // コンプライアンス専用のDB
    }),
  }),
});
