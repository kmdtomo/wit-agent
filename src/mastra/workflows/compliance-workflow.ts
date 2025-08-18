import { ComprehensiveComplianceAgent } from '../agents/compliance-agent';
import type { KintoneRecord, ComplianceAnalysisResult } from '../types';

// Kintoneからデータを取得する関数（既存実装を使用）
async function fetchKintoneRecord(recordId: string): Promise<KintoneRecord> {
  // この部分は既存のKintone読み取り実装を使用
  // test-kintone-connection.mjsの実装を参考に
  const https = require('https');
  
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
      res.on('data', (chunk: any) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          // KintoneのレスポンスをKintoneRecord型に変換
          transformKintoneResponse(parsed.record).then(record => {
            resolve(record);
          });
        } catch (error) {
          reject(error);
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

// Kintoneレスポンスを内部型に変換
async function transformKintoneResponse(kintoneData: any): Promise<KintoneRecord> {
  return {
    recordId: kintoneData.$id?.value || '',
    basic: {
      顧客番号: kintoneData.顧客番号?.value || '',
      入金日: kintoneData.入金日?.value || '',
      会社_屋号名: kintoneData.会社_屋号名?.value || '',
      代表者名: kintoneData.代表者名?.value || '',
      生年月日: kintoneData.生年月日?.value || '',
      携帯番号_ハイフンなし: kintoneData.携帯番号_ハイフンなし?.value || '',
    },
    purchases: (kintoneData.買取情報?.value || []).map((item: any) => ({
      会社名_第三債務者_買取: item.value.会社名_第三債務者_買取?.value || '',
      買取債権額: Number(item.value.買取債権額?.value || 0),
      買取額: Number(item.value.買取額?.value || 0),
      掛目: item.value.掛目?.value || '',
      買取債権支払日: item.value.買取債権支払日?.value || '',
      状態_0: item.value.状態_0?.value || '',
    })),
    collaterals: (kintoneData.担保情報?.value || []).map((item: any) => ({
      会社名_第三債務者_担保: item.value.会社名_第三債務者_担保?.value || '',
      請求額: Number(item.value.請求額?.value || 0),
      入金予定日: item.value.入金予定日?.value || '',
      過去の入金_先々月: Number(item.value.過去の入金_先々月?.value || 0),
      過去の入金_先月: Number(item.value.過去の入金_先月?.value || 0),
      過去の入金_今月: Number(item.value.過去の入金_今月?.value || 0),
      平均: Number(item.value.平均?.value || 0),
    })),
    registries: (kintoneData.謄本情報?.value || []).map((item: any) => ({
      会社名_第三債務者_0: item.value.会社名_第三債務者_0?.value || '',
      資本金の額: item.value.資本金の額?.value || '',
      会社成立: item.value.会社成立?.value || '',
      債権の種類: item.value.債権の種類?.value || '',
    })),
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
        await processAttachments(kintoneData.買取情報_成因証書_謄本類_名刺等_添付ファイル?.value || []),
      通帳_メイン_添付ファイル: 
        await processAttachments(kintoneData.通帳_メイン_添付ファイル?.value || []),
      通帳_その他_添付ファイル: 
        await processAttachments(kintoneData.通帳_その他_添付ファイル?.value || []),
      顧客情報_添付ファイル: 
        await processAttachments(kintoneData.顧客情報_添付ファイル?.value || []),
      他社資料_添付ファイル: 
        await processAttachments(kintoneData.他社資料_添付ファイル?.value || []),
      担保情報_成因証書_謄本類_名刺等_添付ファイル: 
        await processAttachments(kintoneData.担保情報_成因証書_謄本類_名刺等_添付ファイル?.value || []),
      その他_添付ファイル: 
        await processAttachments(kintoneData.その他_添付ファイル?.value || []),
    },
  };
}

// 添付ファイルの処理（画像ダウンロード含む）
async function processAttachments(files: any[]): Promise<any[]> {
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
      try {
        fileInfo.content = await downloadFile(file.fileKey);
      } catch (error) {
        console.error(`Failed to download file ${file.name}:`, error);
      }
    }

    processed.push(fileInfo);
  }

  return processed;
}

// ファイルダウンロード関数
async function downloadFile(fileKey: string): Promise<Buffer> {
  const https = require('https');
  
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

// プランA: 包括的コンプライアンス審査ワークフロー
export class ComplianceWorkflow {
  private agent: ComprehensiveComplianceAgent;

  constructor() {
    this.agent = new ComprehensiveComplianceAgent();
  }

  async execute(recordId: string): Promise<ComplianceAnalysisResult> {
    try {
      // ステップ1: Kintoneからデータ取得
      console.log(`[Step 1/3] Fetching record ${recordId} from Kintone...`);
      const record = await fetchKintoneRecord(recordId);
      
      // ステップ2: AI審査実行
      console.log(`[Step 2/3] Running AI compliance analysis...`);
      const analysisResult = await this.agent.analyzeRecord(record);
      
      // ステップ3: 結果の後処理
      console.log(`[Step 3/3] Finalizing results...`);
      const finalResult = this.postProcessResult(analysisResult);
      
      console.log(`✅ Analysis completed for record ${recordId}`);
      console.log(`   Overall Score: ${finalResult.overallScore}`);
      console.log(`   Risk Level: ${finalResult.riskLevel}`);
      console.log(`   Red Flags: ${finalResult.redFlags.length}`);
      
      return finalResult;
    } catch (error) {
      console.error(`❌ Workflow failed for record ${recordId}:`, error);
      throw new Error(`ワークフロー実行エラー: ${error}`);
    }
  }

  private postProcessResult(result: ComplianceAnalysisResult): ComplianceAnalysisResult {
    // 結果の最終調整
    // 例: スコアの正規化、推奨事項の優先順位付けなど
    
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
    // 高リスクフラグに関連する推奨事項を優先
    const prioritized: string[] = [];
    const highRiskKeywords = ['見送る', '大幅な', '早急', '必須'];
    
    // 高優先度の推奨事項
    recommendations.forEach(rec => {
      if (highRiskKeywords.some(keyword => rec.includes(keyword))) {
        prioritized.unshift(rec);
      } else {
        prioritized.push(rec);
      }
    });

    return prioritized;
  }

  // 進捗状況のストリーミング（UIでリアルタイム表示用）
  async *executeWithProgress(recordId: string): AsyncGenerator<any> {
    yield { step: 1, message: 'Kintoneからデータを取得中...' };
    const record = await fetchKintoneRecord(recordId);
    
    yield { step: 2, message: '企業信用情報を分析中...' };
    // ... 各ステップの進捗を yield
    
    yield { step: 3, message: '資金使途を評価中...' };
    
    yield { step: 4, message: '財務健全性をチェック中...' };
    
    yield { step: 5, message: '添付書類を分析中...' };
    
    const result = await this.agent.analyzeRecord(record);
    
    yield { step: 6, message: '完了', result };
  }
}

// エクスポート用のインスタンス
export const complianceWorkflow = new ComplianceWorkflow();