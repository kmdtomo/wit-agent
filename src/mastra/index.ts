// Mastra プランA エントリーポイント

export * from './types';
export * from './tools/analysis-tools';
export * from './tools/document-tools';
export * from './agents/compliance-agent';
export * from './workflows/compliance-workflow';
export { mastra, anthropic } from './mastra.config';

// 簡単に使えるメイン関数
import { ComplianceWorkflow } from './workflows/compliance-workflow';

/**
 * レコードIDを指定してコンプライアンス審査を実行
 * @param recordId KintoneのレコードID
 * @returns 審査結果
 */
export async function analyzeFactoringApplication(recordId: string) {
  const workflow = new ComplianceWorkflow();
  return await workflow.execute(recordId);
}

/**
 * プログレス付きで審査を実行
 * @param recordId KintoneのレコードID
 * @param onProgress プログレスコールバック
 */
export async function analyzeWithProgress(
  recordId: string,
  onProgress?: (progress: any) => void
) {
  const workflow = new ComplianceWorkflow();
  
  for await (const progress of workflow.executeWithProgress(recordId)) {
    if (onProgress) {
      onProgress(progress);
    }
    if (progress.result) {
      return progress.result;
    }
  }
}