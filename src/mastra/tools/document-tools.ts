import type { FileInfo } from '../types';
import { anthropic } from '../mastra.config';

// ========== 画像・PDF分析ツール ==========
export const analyzeDocumentTool = {
  name: 'analyzeDocument',
  description: '添付ファイル（画像・PDF）をAIで分析',
  execute: async ({ 
    files, 
    documentType 
  }: {
    files: FileInfo[];
    documentType: 'bankStatement' | 'invoice' | 'contract' | 'registry' | 'other';
  }) => {
    const results = {
      extracted: false,
      summary: '',
      keyData: {} as Record<string, any>,
      anomalies: [] as string[],
      confidence: 0,
    };

    try {
      for (const file of files) {
        if (!file.content) continue;

        // 画像またはPDFをBase64エンコード
        const base64Content = file.content.toString('base64');
        const imageUrl = `data:${file.contentType};base64,${base64Content}`;

        // Claude Vision APIで分析
        const response = await anthropic.messages.create({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 4096,
          system: getSystemPromptForDocumentType(documentType),
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: getAnalysisPromptForDocumentType(documentType),
                },
                {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: (file.contentType?.includes('png') ? 'image/png' : 
                                 file.contentType?.includes('gif') ? 'image/gif' : 
                                 file.contentType?.includes('webp') ? 'image/webp' : 
                                 'image/jpeg') as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
                    data: base64Content,
                  },
                },
              ],
            },
          ],
        });

        const analysis = response.content[0].type === 'text' ? response.content[0].text : '';
        if (analysis) {
          const parsed = parseAnalysisResult(analysis, documentType);
          results.extracted = true;
          results.summary = parsed.summary;
          results.keyData = { ...results.keyData, ...parsed.keyData };
          results.anomalies.push(...(parsed.anomalies || []));
          results.confidence = parsed.confidence || 80;
        }
      }

      return results;
    } catch (error) {
      console.error('Document analysis error:', error);
      return {
        ...results,
        error: 'ドキュメント分析中にエラーが発生しました',
      };
    }
  },
};

// ========== 通帳分析ツール ==========
export const analyzeBankStatementTool = {
  name: 'analyzeBankStatement',
  description: '通帳画像から入出金履歴を分析',
  execute: async ({ 
    mainBankFiles, 
    otherBankFiles 
  }: {
    mainBankFiles: FileInfo[];
    otherBankFiles: FileInfo[];
  }) => {
    const allFiles = [...mainBankFiles, ...otherBankFiles];
    
    if (allFiles.length === 0) {
      return {
        analyzed: false,
        message: '分析する通帳ファイルがありません',
      };
    }

    const analysisResults = {
      monthlyTransactions: [] as any[],
      averageBalance: 0,
      largestDeposit: 0,
      largestWithdrawal: 0,
      recurringTransactions: [] as any[],
      riskIndicators: [] as string[],
    };

    for (const file of allFiles) {
      if (!file.content) continue;

      const base64Content = file.content.toString('base64');
      const imageUrl = `data:${file.contentType};base64,${base64Content}`;

      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 4096,
        system: "あなたは銀行通帳の画像を分析する専門家です。",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `
                この通帳画像を分析して、以下の情報を抽出してください：
                1. 月別の入出金サマリー
                2. 定期的な取引の有無とその金額
                3. 異常な取引パターン
                4. 平均残高
                5. 主要な取引先

                JSON形式で結果を返してください：
                {
                  "transactions": [],
                  "averageBalance": 0,
                  "recurringPatterns": [],
                  "anomalies": [],
                  "majorCounterparties": []
                }
                `,
              },
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: (file.contentType?.includes('png') ? 'image/png' : 
                               file.contentType?.includes('gif') ? 'image/gif' : 
                               file.contentType?.includes('webp') ? 'image/webp' : 
                               'image/jpeg') as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
                  data: base64Content,
                },
              },
            ],
          },
        ],
      });

      const result = response.content[0].type === 'text' ? response.content[0].text : '';
      if (result) {
        try {
          const parsed = JSON.parse(result);
          
          // 結果を統合
          if (parsed.transactions) {
            analysisResults.monthlyTransactions.push(...parsed.transactions);
          }
          if (parsed.averageBalance) {
            analysisResults.averageBalance = Math.max(
              analysisResults.averageBalance,
              parsed.averageBalance
            );
          }
          if (parsed.anomalies && parsed.anomalies.length > 0) {
            analysisResults.riskIndicators.push(...parsed.anomalies);
          }
          if (parsed.recurringPatterns) {
            analysisResults.recurringTransactions.push(...parsed.recurringPatterns);
          }
        } catch (e) {
          console.error('Failed to parse bank statement analysis:', e);
        }
      }
    }

    // リスク評価
    const riskScore = calculateBankStatementRisk(analysisResults);

    return {
      analyzed: true,
      summary: {
        fileCount: allFiles.length,
        averageBalance: analysisResults.averageBalance,
        transactionCount: analysisResults.monthlyTransactions.length,
        hasRecurringIncome: analysisResults.recurringTransactions.length > 0,
      },
      riskScore,
      riskIndicators: analysisResults.riskIndicators,
      recommendation: riskScore < 40 ? 
        '通帳の取引履歴は健全です' : 
        '取引パターンに注意が必要です',
    };
  },
};

// ========== ヘルパー関数 ==========

function getSystemPromptForDocumentType(type: string): string {
  const prompts: Record<string, string> = {
    bankStatement: "あなたは銀行通帳を分析する金融専門家です。",
    invoice: "あなたは請求書を分析する会計専門家です。",
    contract: "あなたは契約書を分析する法務専門家です。",
    registry: "あなたは登記簿謄本を分析する専門家です。",
    other: "あなたは各種ビジネス文書を分析する専門家です。",
  };
  return prompts[type] || prompts.other;
}

function getAnalysisPromptForDocumentType(type: string): string {
  const prompts: Record<string, string> = {
    bankStatement: `
      この通帳画像から以下を抽出してください：
      - 口座残高
      - 主要な入出金記録
      - 取引先名
      - 異常な取引の有無
    `,
    invoice: `
      この請求書画像から以下を抽出してください：
      - 請求金額
      - 請求先企業名
      - 請求日/支払期日
      - 商品/サービス内容
    `,
    contract: `
      この契約書画像から以下を抽出してください：
      - 契約当事者
      - 契約金額
      - 契約期間
      - 重要な条項
    `,
    registry: `
      この登記簿謄本から以下を抽出してください：
      - 会社名
      - 資本金
      - 設立日
      - 代表者名
      - 所在地
    `,
    other: `
      この文書から重要な情報を抽出してください。
    `,
  };
  return prompts[type] || prompts.other;
}

function parseAnalysisResult(analysis: string, documentType: string): any {
  try {
    // AIの応答からJSON部分を抽出
    const jsonMatch = analysis.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error('Failed to parse analysis result:', e);
  }

  // フォールバック
  return {
    summary: analysis.substring(0, 200),
    keyData: {},
    anomalies: [],
    confidence: 60,
  };
}

function calculateBankStatementRisk(analysis: any): number {
  let risk = 0;

  // 残高が少ない場合
  if (analysis.averageBalance < 100000) {
    risk += 30;
  }

  // 異常な取引がある場合
  if (analysis.riskIndicators.length > 0) {
    risk += analysis.riskIndicators.length * 10;
  }

  // 定期収入がない場合
  if (analysis.recurringTransactions.length === 0) {
    risk += 20;
  }

  return Math.min(risk, 100);
}

// ========== 複合ドキュメント分析 ==========
export const analyzeAllDocumentsTool = {
  name: 'analyzeAllDocuments',
  description: 'すべての必須添付ファイルを包括的に分析',
  execute: async ({ 
    attachments 
  }: {
    attachments: Record<string, FileInfo[]>;
  }) => {
    const results = {
      bankStatements: null as any,
      invoices: null as any,
      contracts: null as any,
      overallDocumentScore: 0,
      missingDocuments: [] as string[],
      documentRisks: [] as string[],
    };

    // 必須書類のチェック
    const requiredDocs = [
      '買取情報_成因証書_謄本類_名刺等_添付ファイル',
      '通帳_メイン_添付ファイル',
      '通帳_その他_添付ファイル',
      '顧客情報_添付ファイル',
      '他社資料_添付ファイル',
      '担保情報_成因証書_謄本類_名刺等_添付ファイル',
      'その他_添付ファイル',
    ];

    for (const docType of requiredDocs) {
      if (!attachments[docType] || attachments[docType].length === 0) {
        results.missingDocuments.push(docType);
      }
    }

    // 通帳分析
    if (attachments['通帳_メイン_添付ファイル']) {
      results.bankStatements = await analyzeBankStatementTool.execute({
        mainBankFiles: attachments['通帳_メイン_添付ファイル'],
        otherBankFiles: attachments['通帳_その他_添付ファイル'] || [],
      });
    }

    // 成因証書（請求書等）分析
    if (attachments['買取情報_成因証書_謄本類_名刺等_添付ファイル']) {
      const invoiceAnalysis = await analyzeDocumentTool.execute({
        files: attachments['買取情報_成因証書_謄本類_名刺等_添付ファイル'],
        documentType: 'invoice',
      });
      results.invoices = invoiceAnalysis;
    }

    // ドキュメントスコア計算
    const docCompleteness = 
      ((requiredDocs.length - results.missingDocuments.length) / requiredDocs.length) * 100;
    
    results.overallDocumentScore = docCompleteness;

    // リスク評価
    if (results.missingDocuments.length > 3) {
      results.documentRisks.push('必須書類の不足が多い');
    }
    if (results.bankStatements?.riskScore > 60) {
      results.documentRisks.push('通帳に異常な取引パターンあり');
    }

    return results;
  },
};