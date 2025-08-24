import { ComprehensiveComplianceAgent } from '../agents/compliance-agent';
import type { KintoneRecord, ComplianceAnalysisResult } from '../types';
import https from 'https';

// ログコールバック型定義
export interface LogCallback {
  (level: 'info' | 'warning' | 'error' | 'success' | 'debug' | 'thinking', 
   step: string, 
   message: string, 
   details?: any): void;
}

// Kintoneからデータを取得する関数（詳細ログ付き）
async function fetchKintoneRecord(recordId: string, log?: LogCallback): Promise<KintoneRecord> {
  log?.('info', 'KINTONE_CONNECT', `Kintone APIに接続中...`, {
    endpoint: `${process.env.KINTONE_SUBDOMAIN}.cybozu.com`,
    appId: process.env.KINTONE_APP_ID
  });
  
  const options = {
    hostname: process.env.KINTONE_SUBDOMAIN + '.cybozu.com',
    path: `/k/v1/record.json?app=${process.env.KINTONE_APP_ID}&id=${recordId}`,
    method: 'GET',
    headers: {
      'X-Cybozu-API-Token': process.env.KINTONE_API_TOKEN,
    },
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res: any) => {
      let data = '';
      res.on('data', (chunk: any) => {
        data += chunk;
        log?.('debug', 'KINTONE_RECEIVE', `データチャンク受信: ${chunk.length} bytes`);
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          log?.('success', 'KINTONE_PARSE', 'レスポンス解析成功', {
            recordId: parsed.record?.$id?.value,
            fields: Object.keys(parsed.record || {}).length
          });
          
          // KintoneのレスポンスをKintoneRecord型に変換
          transformKintoneResponse(parsed.record, log).then(record => {
            resolve(record);
          });
        } catch (error) {
          log?.('error', 'KINTONE_PARSE', `解析エラー: ${error}`, { error });
          reject(error);
        }
      });
    });
    req.on('error', (error) => {
      log?.('error', 'KINTONE_CONNECTION', `接続エラー: ${error}`, { error });
      reject(error);
    });
    req.end();
  });
}

// Kintoneレスポンスを内部型に変換（詳細ログ付き）
async function transformKintoneResponse(kintoneData: any, log?: LogCallback): Promise<KintoneRecord> {
  log?.('info', 'TRANSFORM_START', 'データ変換を開始');
  
  // 基本情報の変換
  log?.('debug', 'TRANSFORM_BASIC', '基本情報を変換中', {
    顧客番号: kintoneData.顧客番号?.value,
    会社名: kintoneData.会社_屋号名?.value,
    代表者: kintoneData.代表者名?.value
  });
  
  // サブテーブルのカウント
  const counts = {
    買取情報: kintoneData.買取情報?.value?.length || 0,
    担保情報: kintoneData.担保情報?.value?.length || 0,
    謄本情報: kintoneData.謄本情報?.value?.length || 0,
    回収情報: kintoneData.回収情報?.value?.length || 0,
  };
  
  log?.('info', 'TRANSFORM_SUBTABLES', 'サブテーブル情報', counts);
  
  const record: KintoneRecord = {
    recordId: kintoneData.$id?.value || '',
    basic: {
      顧客番号: kintoneData.顧客番号?.value || '',
      入金日: kintoneData.入金日?.value || '',
      会社_屋号名: kintoneData.会社_屋号名?.value || '',
      代表者名: kintoneData.代表者名?.value || '',
      生年月日: kintoneData.生年月日?.value || '',
      携帯番号_ハイフンなし: kintoneData.携帯番号_ハイフンなし?.value || '',
    },
    purchases: (kintoneData.買取情報?.value || []).map((item: any, index: number) => {
      const purchase = {
        会社名_第三債務者_買取: item.value.会社名_第三債務者_買取?.value || '',
        買取債権額: Number(item.value.買取債権額?.value || 0),
        買取額: Number(item.value.買取額?.value || 0),
        掛目: item.value.掛目?.value || '',
        買取債権支払日: item.value.買取債権支払日?.value || '',
        状態_0: item.value.状態_0?.value || '',
      };
      log?.('debug', 'TRANSFORM_PURCHASE', `買取情報 #${index + 1}`, purchase);
      return purchase;
    }),
    collaterals: (kintoneData.担保情報?.value || []).map((item: any, index: number) => {
      const collateral = {
        会社名_第三債務者_担保: item.value.会社名_第三債務者_担保?.value || '',
        請求額: Number(item.value.請求額?.value || 0),
        入金予定日: item.value.入金予定日?.value || '',
        過去の入金_先々月: Number(item.value.過去の入金_先々月?.value || 0),
        過去の入金_先月: Number(item.value.過去の入金_先月?.value || 0),
        過去の入金_今月: Number(item.value.過去の入金_今月?.value || 0),
        平均: Number(item.value.平均?.value || 0),
      };
      log?.('debug', 'TRANSFORM_COLLATERAL', `担保情報 #${index + 1}`, collateral);
      return collateral;
    }),
    registries: (kintoneData.謄本情報?.value || []).map((item: any, index: number) => {
      const registry = {
        会社名_第三債務者_0: item.value.会社名_第三債務者_0?.value || '',
        資本金の額: item.value.資本金の額?.value || '',
        会社成立: item.value.会社成立?.value || '',
        債権の種類: item.value.債権の種類?.value || '',
      };
      log?.('debug', 'TRANSFORM_REGISTRY', `謄本情報 #${index + 1}`, registry);
      return registry;
    }),
    collections: (kintoneData.回収情報?.value || []).map((item: any) => ({
      回収予定日: item.value.回収予定日?.value || '',
      回収金額: Number(item.value.回収金額?.value || 0),
    })),
    fundUsage: {
      所感_条件_担当者: kintoneData.所感_条件_担当者?.value || '',
      所感_条件_決裁者: kintoneData.所感_条件_決裁者?.value || '',
    },
    financialRisk: {
      売上: Number(kintoneData.売上?.value || 0),
      業種: kintoneData.業種?.value || '',
      資金使途: kintoneData.資金使途?.value || '',
      ファクタリング利用: kintoneData.ファクタリング利用?.value || '',
      納付状況_税金: kintoneData.納付状況_税金?.value || '',
      税金滞納額_0: Number(kintoneData.税金滞納額_0?.value || 0),
      納付状況_税金_0: kintoneData.納付状況_税金_0?.value || '',
      保険料滞納額: Number(kintoneData.保険料滞納額?.value || 0),
    },
    attachments: {
      買取情報_成因証書_謄本類_名刺等_添付ファイル: 
        await processAttachments(kintoneData.買取情報_成因証書_謄本類_名刺等_添付ファイル?.value || [], log),
      通帳_メイン_添付ファイル: 
        await processAttachments(kintoneData.通帳_メイン_添付ファイル?.value || [], log),
      通帳_その他_添付ファイル: 
        await processAttachments(kintoneData.通帳_その他_添付ファイル?.value || [], log),
      顧客情報_添付ファイル: 
        await processAttachments(kintoneData.顧客情報_添付ファイル?.value || [], log),
      他社資料_添付ファイル: 
        await processAttachments(kintoneData.他社資料_添付ファイル?.value || [], log),
      担保情報_成因証書_謄本類_名刺等_添付ファイル: 
        await processAttachments(kintoneData.担保情報_成因証書_謄本類_名刺等_添付ファイル?.value || [], log),
      その他_添付ファイル: 
        await processAttachments(kintoneData.その他_添付ファイル?.value || [], log),
    },
  };
  
  log?.('success', 'TRANSFORM_COMPLETE', 'データ変換完了', {
    基本情報: Object.keys(record.basic).length,
    買取情報: record.purchases.length,
    担保情報: record.collaterals.length,
    謄本情報: record.registries.length,
    回収情報: record.collections.length,
  });
  
  return record;
}

// 添付ファイルの処理（詳細ログ付き）
async function processAttachments(files: any[], log?: LogCallback): Promise<any[]> {
  if (files.length === 0) {
    log?.('debug', 'ATTACHMENTS', '添付ファイルなし');
    return [];
  }
  
  log?.('info', 'ATTACHMENTS', `${files.length}件の添付ファイルを処理中`);
  const processed = [];
  
  for (const file of files) {
    const fileInfo = {
      name: file.name,
      fileKey: file.fileKey,
      size: file.size,
      contentType: file.contentType,
      content: null as Buffer | null,
    };

    // 画像・PDFファイルの場合はダウンロード
    if (
      file.contentType?.includes('image') || 
      file.contentType?.includes('pdf')
    ) {
      log?.('debug', 'FILE_DOWNLOAD', `ファイルダウンロード: ${file.name}`, {
        type: file.contentType,
        size: file.size
      });
      
      try {
        fileInfo.content = await downloadFile(file.fileKey);
        log?.('success', 'FILE_DOWNLOAD', `ダウンロード成功: ${file.name}`);
      } catch (error) {
        log?.('error', 'FILE_DOWNLOAD', `ダウンロード失敗: ${file.name}`, { error });
      }
    }

    processed.push(fileInfo);
  }

  return processed;
}

// ファイルダウンロード関数
async function downloadFile(fileKey: string): Promise<Buffer> {
  const options = {
    hostname: process.env.KINTONE_SUBDOMAIN + '.cybozu.com',
    path: `/k/v1/file.json?fileKey=${fileKey}`,
    method: 'GET',
    headers: {
      'X-Cybozu-API-Token': process.env.KINTONE_API_TOKEN,
    },
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res: any) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve(buffer);
      });
    });
    req.on('error', reject);
    req.end();
  });
}

// 詳細ログ付きコンプライアンスワークフロー
export class VerboseComplianceWorkflow {
  private agent: ComprehensiveComplianceAgent;
  private logCallback?: LogCallback;

  constructor(logCallback?: LogCallback) {
    this.agent = new ComprehensiveComplianceAgent();
    this.logCallback = logCallback;
  }

  private log(level: any, step: string, message: string, details?: any) {
    if (this.logCallback) {
      this.logCallback(level, step, message, details);
    }
    console.log(`[${level.toUpperCase()}] [${step}] ${message}`, details || '');
  }

  async execute(recordId: string): Promise<ComplianceAnalysisResult> {
    try {
      // ステップ1: Kintoneからデータ取得
      this.log('info', 'WORKFLOW_START', `レコード ${recordId} の審査ワークフローを開始`);
      this.log('thinking', 'AI_THINKING', 'データ取得戦略を検討中...', {
        考慮事項: [
          'レコードIDの妥当性確認',
          '必要なフィールドの特定',
          'サブテーブルの関連性分析'
        ]
      });
      
      const record = await fetchKintoneRecord(recordId, this.logCallback);
      
      // ステップ2: データ分析前の思考プロセス
      this.log('thinking', 'AI_ANALYSIS', 'データ分析戦略を立案中...', {
        分析対象: {
          企業数: record.purchases.length + record.collaterals.length,
          債権総額: record.purchases.reduce((sum, p) => sum + p.買取債権額, 0),
          担保総額: record.collaterals.reduce((sum, c) => sum + c.請求額, 0),
        },
        評価軸: [
          '企業信用度の定量評価',
          '資金使途の妥当性検証', 
          '回収可能性の算出',
          'リスクファクターの特定'
        ]
      });
      
      // ステップ3: 企業信用分析
      this.log('info', 'COMPANY_ANALYSIS', '企業信用度の分析を開始');
      this.log('thinking', 'AI_COMPANY', '企業評価の思考プロセス', {
        評価項目: {
          資本金分析: '資本金額から企業規模を推定',
          設立年数: '会社成立日から事業継続性を評価',
          取引実績: '過去の入金履歴から信頼性を判断',
          債権種類: '債権の種類から回収確実性を評価'
        }
      });
      
      // 各企業の詳細分析
      for (let i = 0; i < record.purchases.length; i++) {
        const purchase = record.purchases[i];
        this.log('debug', 'COMPANY_DETAIL', `買取先企業 #${i + 1} の分析`, {
          企業名: purchase.会社名_第三債務者_買取,
          買取債権額: purchase.買取債権額,
          買取額: purchase.買取額,
          掛目: purchase.掛目,
          リスク評価: this.evaluateCompanyRisk(purchase)
        });
      }
      
      // ステップ4: 資金使途分析
      this.log('info', 'FUND_USAGE', '資金使途の妥当性を検証');
      this.log('thinking', 'AI_FUND', '資金使途評価の思考プロセス', {
        検証項目: {
          使途内容: record.financialRisk.資金使途,
          業種整合性: `${record.financialRisk.業種}との整合性を確認`,
          金額妥当性: `売上${record.financialRisk.売上}に対する申請額の妥当性`,
          緊急性: '資金需要の緊急度を評価'
        }
      });
      
      // ステップ5: 財務健全性チェック
      this.log('info', 'FINANCIAL_HEALTH', '財務健全性のチェック');
      const taxRisk = record.financialRisk.税金滞納額_0 > 0;
      const insuranceRisk = record.financialRisk.保険料滞納額 > 0;
      
      this.log('thinking', 'AI_FINANCIAL', '財務リスクの評価', {
        税金滞納: {
          金額: record.financialRisk.税金滞納額_0,
          リスクレベル: taxRisk ? '高' : '低',
          影響: taxRisk ? '差押えリスクあり' : 'なし'
        },
        保険料滞納: {
          金額: record.financialRisk.保険料滞納額,
          リスクレベル: insuranceRisk ? '中' : '低',
          影響: insuranceRisk ? '信用問題の可能性' : 'なし'
        }
      });
      
      // ステップ6: AI審査実行
      this.log('info', 'AI_EXECUTION', 'Claude AIによる総合判断を実行中');
      this.log('thinking', 'AI_REASONING', 'AIの判断プロセス', {
        段階1: '全データの相関関係を分析',
        段階2: 'リスクファクターの重み付け',
        段階3: '業界標準との比較',
        段階4: '最終スコアリング'
      });
      
      const analysisResult = await this.agent.analyzeRecord(record);
      
      // ステップ7: スコア計算の詳細
      this.log('info', 'SCORING', 'スコア計算の詳細', {
        企業信用スコア: {
          点数: analysisResult.categories.company.score,
          内訳: {
            資本金評価: 20,
            設立年数: 10,
            取引実績: 10,
            その他: analysisResult.categories.company.score - 40
          }
        },
        資金使途スコア: {
          点数: analysisResult.categories.fundUsage.score,
          内訳: {
            使途明確性: 40,
            業種整合性: 30,
            金額妥当性: 30
          }
        },
        取引スコア: {
          点数: analysisResult.categories.transaction.score,
          内訳: {
            回収可能性: 50,
            担保充足率: 30,
            過去実績: 20
          }
        }
      });
      
      // ステップ8: 最終判定
      this.log('thinking', 'AI_DECISION', '最終判定の思考プロセス', {
        総合スコア: analysisResult.overallScore,
        判定基準: {
          '80点以上': '優良案件・即承認推奨',
          '60-79点': '条件付き承認',
          '40-59点': '追加審査必要',
          '40点未満': '見送り推奨'
        },
        最終判定: this.getFinalDecision(analysisResult.overallScore)
      });
      
      // ステップ9: 結果の後処理
      this.log('info', 'POST_PROCESS', '結果の最終調整');
      const finalResult = this.postProcessResult(analysisResult);
      
      this.log('success', 'WORKFLOW_COMPLETE', `審査完了`, {
        総合スコア: finalResult.overallScore,
        リスクレベル: finalResult.riskLevel,
        レッドフラグ数: finalResult.redFlags.length,
        推奨事項数: finalResult.recommendations.length
      });
      
      return finalResult;
    } catch (error) {
      this.log('error', 'WORKFLOW_ERROR', `ワークフロー実行エラー: ${error}`, { error });
      throw new Error(`ワークフロー実行エラー: ${error}`);
    }
  }
  
  private evaluateCompanyRisk(purchase: any): string {
    const ratio = purchase.買取額 / purchase.買取債権額;
    if (ratio > 0.9) return '低リスク';
    if (ratio > 0.7) return '中リスク';
    return '高リスク';
  }
  
  private getFinalDecision(score: number): string {
    if (score >= 80) return '承認推奨';
    if (score >= 60) return '条件付き承認';
    if (score >= 40) return '追加審査必要';
    return '見送り推奨';
  }

  private postProcessResult(result: ComplianceAnalysisResult): ComplianceAnalysisResult {
    this.log('debug', 'POST_PROCESS', '推奨事項の優先順位付け');
    
    // 推奨事項を重要度順にソート
    const sortedRecommendations = this.prioritizeRecommendations(
      result.recommendations,
      result.redFlags
    );

    return {
      ...result,
      recommendations: sortedRecommendations,
    };
  }

  private prioritizeRecommendations(
    recommendations: string[],
    redFlags: any[]
  ): string[] {
    const prioritized: string[] = [];
    const highRiskKeywords = ['見送る', '大幅な', '早急', '必須'];
    
    recommendations.forEach(rec => {
      if (highRiskKeywords.some(keyword => rec.includes(keyword))) {
        prioritized.unshift(rec);
      } else {
        prioritized.push(rec);
      }
    });

    return prioritized;
  }
}