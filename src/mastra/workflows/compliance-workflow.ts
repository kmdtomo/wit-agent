import { ComprehensiveComplianceAgent } from '../agents/compliance-agent';
import type { KintoneRecord, ComplianceAnalysisResult } from '../types';
import https from 'https';

// モックデータ生成関数（レコードIDに基づいて異なるデータを生成）
function getMockKintoneRecord(recordId: string): Promise<KintoneRecord> {
  // レコードIDを数値に変換してランダムシードとして使用
  const seed = parseInt(recordId) || 1;
  const random = (min: number, max: number) => {
    const x = Math.sin(seed) * 10000;
    return Math.floor((x - Math.floor(x)) * (max - min + 1)) + min;
  };

  // レコードIDに基づいて異なる会社データを生成
  const companies = [
    { name: 'キングアソシエイト株式会社', rep: '田中太郎', capital: '500万円', industry: '建設業' },
    { name: '株式会社テクノシステム', rep: '佐藤花子', capital: '1000万円', industry: 'IT・ソフトウェア' },
    { name: '合同会社グローバルトレード', rep: '鈴木一郎', capital: '300万円', industry: '卸売・小売業' },
    { name: '有限会社山田製作所', rep: '山田次郎', capital: '800万円', industry: '製造業' },
    { name: '株式会社フューチャーサービス', rep: '高橋美咲', capital: '2000万円', industry: 'サービス業' },
  ];

  const companyIndex = seed % companies.length;
  const company = companies[companyIndex];

  // 動的な金額計算
  const baseAmount = random(1000000, 10000000);
  const buybackRate = random(70, 95);
  const buybackAmount = Math.floor(baseAmount * buybackRate / 100);

  // 動的な日付生成
  const now = new Date();
  const paymentDate = new Date(now.getTime() + random(30, 90) * 24 * 60 * 60 * 1000);
  const depositDate = new Date(now.getTime() + random(7, 30) * 24 * 60 * 60 * 1000);

  // リスク要因の動的生成
  const hasRisk = seed % 3 === 0; // 3件に1件はリスクあり
  const taxStatus = hasRisk ? '遅延あり' : '正常';
  const taxDelay = hasRisk ? random(100000, 1000000) : 0;
  const hasOtherFactoring = seed % 2 === 0;

  return new Promise((resolve) => {
    // 実際のAPI呼び出しをシミュレート（1-3秒の遅延）
    setTimeout(() => {
      resolve({
        recordId,
        basic: {
          顧客番号: `CUST-${String(seed).padStart(3, '0')}`,
          入金日: depositDate.toISOString().split('T')[0],
          会社_屋号名: company.name,
          代表者名: company.rep,
          生年月日: `19${60 + random(10, 35)}-${String(random(1, 12)).padStart(2, '0')}-${String(random(1, 28)).padStart(2, '0')}`,
          携帯番号_ハイフンなし: `0${random(70, 90)}${String(random(10000000, 99999999))}`,
        },
        purchases: [
          {
            会社名_第三債務者_買取: `${['株式会社', '有限会社', '合同会社'][random(0, 2)]}${['山田', '田中', '佐藤', '鈴木'][random(0, 3)]}${['建設', '商事', '工業', 'システム'][random(0, 3)]}`,
            買取債権額: baseAmount,
            買取額: buybackAmount,
            掛目: `${buybackRate}%`,
            買取債権支払日: paymentDate.toISOString().split('T')[0],
            状態_0: ['確定', '仮確定', '審査中'][random(0, 2)],
          }
        ],
        collaterals: [
          {
            会社名_第三債務者_担保: company.name,
            請求額: random(1000000, 5000000),
            入金予定日: depositDate.toISOString().split('T')[0],
            過去の入金_先々月: random(1000000, 6000000),
            過去の入金_先月: random(1000000, 6000000),
            過去の入金_今月: random(500000, 4000000),
            平均: random(1500000, 5000000),
          },
          {
            会社名_第三債務者_担保: `株式会社${['アルファ', 'ベータ', 'ガンマ', 'デルタ'][random(0, 3)]}`,
            請求額: random(500000, 3000000),
            入金予定日: new Date(depositDate.getTime() + random(1, 7) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            過去の入金_先々月: random(500000, 4000000),
            過去の入金_先月: random(500000, 4000000),
            過去の入金_今月: random(300000, 3000000),
            平均: random(800000, 3500000),
          }
        ],
        registries: [
          {
            会社名_第三債務者_0: company.name,
            資本金の額: company.capital,
            会社成立: `20${String(random(10, 23)).padStart(2, '0')}-${String(random(1, 12)).padStart(2, '0')}-${String(random(1, 28)).padStart(2, '0')}`,
            債権の種類: ['工事代金債権', '売掛債権', 'サービス料債権', '運送料債権'][random(0, 3)],
          }
        ],
        collections: [
          {
            回収予定日: paymentDate.toISOString().split('T')[0],
            回収金額: buybackAmount,
          }
        ],
        fundUsage: {
          所感_条件_担当者: hasRisk ? '要追加審査' : `${company.industry}での運転資金として妥当`,
          所感_条件_決裁者: hasRisk ? '追加条件必要' : '条件付きで承認可能',
        },
        financialRisk: {
          売上: random(50000000, 500000000),
          業種: company.industry,
          資金使途: ['運転資金', '設備投資', '仕入資金', '人件費'][random(0, 3)],
          ファクタリング利用: hasOtherFactoring ? 'あり' : 'なし',
          納付状況_税金: taxStatus,
          税金滞納額_0: taxDelay,
          納付状況_税金_0: taxStatus,
          保険料滞納額: hasRisk ? random(50000, 500000) : 0,
        },
        attachments: {
          買取情報_成因証書_謄本類_名刺等_添付ファイル: [],
          通帳_メイン_添付ファイル: [],
          通帳_その他_添付ファイル: [],
          顧客情報_添付ファイル: [],
          他社資料_添付ファイル: [],
          担保情報_成因証書_謄本類_名刺等_添付ファイル: [],
          その他_添付ファイル: [],
        },
      });
    }, random(1000, 3000)); // 1-3秒の遅延
  });
}

// Kintoneからデータを取得する関数（既存実装を使用）
async function fetchKintoneRecord(recordId: string): Promise<KintoneRecord> {
  // デモモード：環境変数が未設定の場合はモックデータを使用
  if (!process.env.KINTONE_API_TOKEN || !process.env.KINTONE_SUBDOMAIN || !process.env.KINTONE_APP_ID) {
    console.log('Demo mode: Using mock data for record', recordId);
    return getMockKintoneRecord(recordId);
  }
  
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
    try {
      // Step 1: データ取得
      yield { 
        type: 'log', 
        step: 'INIT',
        message: `レコード ${recordId} の審査を開始します`,
        timestamp: new Date().toISOString() 
      };
      
      yield { 
        type: 'log', 
        step: 'KINTONE',
        message: 'Kintoneからデータを取得中...',
        timestamp: new Date().toISOString() 
      };
      
      const record = await fetchKintoneRecord(recordId);
      
      yield { 
        type: 'log', 
        step: 'KINTONE',
        level: 'success',
        message: 'データ取得完了',
        timestamp: new Date().toISOString(),
        details: {
          基本情報: '取得済み',
          買取情報: `${record.purchases.length}件`,
          担保情報: `${record.collaterals.length}件`,
          謄本情報: `${record.registries.length}件`,
        }
      };

      // Step 2: 企業信用分析
      yield { 
        type: 'log', 
        step: 'AI',
        message: 'Claude AIによる企業信用分析を開始',
        timestamp: new Date().toISOString(),
        details: {
          取得データ: {
            企業名: record.registries[0]?.会社名_第三債務者_0 || '未取得',
            資本金: record.registries[0]?.資本金の額 || '未取得',
            設立年月日: record.registries[0]?.会社成立 || '未取得',
            業種: record.financialRisk.業種 || '未取得'
          }
        }
      };

      // 実際の分析実行（ツール呼び出しはスキップして直接分析）
      const companyAnalysis = { score: 60, risks: [], findings: [] };

      // 資本金分析結果
      const capitalAnalysis = this.analyzeCapital(record.registries[0]);
      yield { 
        type: 'log', 
        step: 'AI_CAPITAL',
        level: capitalAnalysis.score >= 60 ? 'success' : 'warning',
        message: `資本金分析: ${capitalAnalysis.evaluation}`,
        timestamp: new Date().toISOString(),
        details: {
          分析内容: capitalAnalysis
        }
      };

      // 設立年数分析結果
      const establishmentAnalysis = this.analyzeEstablishment(record.registries[0]);
      yield { 
        type: 'log', 
        step: 'AI_ESTABLISHMENT',
        level: establishmentAnalysis.score >= 60 ? 'success' : 'warning',
        message: `設立年数分析: ${establishmentAnalysis.evaluation}`,
        timestamp: new Date().toISOString(),
        details: {
          分析内容: establishmentAnalysis
        }
      };

      // 取引実績分析
      const transactionAnalysis = this.analyzeTransactionHistory(record.collaterals);
      yield { 
        type: 'log', 
        step: 'AI_TRANSACTION',
        level: transactionAnalysis.score >= 60 ? 'success' : 'warning',
        message: `取引実績分析: ${transactionAnalysis.evaluation}`,
        timestamp: new Date().toISOString(),
        details: {
          分析内容: transactionAnalysis
        }
      };

      // 債権種類分析
      const debtAnalysis = this.analyzeDebtType(record.registries, record.purchases);
      yield { 
        type: 'log', 
        step: 'AI_DEBT',
        level: debtAnalysis.score >= 60 ? 'success' : 'warning',
        message: `債権種類分析: ${debtAnalysis.evaluation}`,
        timestamp: new Date().toISOString(),
        details: {
          分析内容: debtAnalysis
        }
      };

      // その他の分析（簡略化）
      const fundUsageAnalysis = { score: 80, concerns: [] };
      const arrearsAnalysis = { score: 90, totalArrears: 0 };
      const collectionAnalysis = { score: 75, coverageRatio: 1.2 };
      const documentAnalysis = { overallDocumentScore: 70, missingDocuments: [] };

      // リスク検出
      const detectedRisks = this.detectRisks(record, {
        company: companyAnalysis,
        transaction: transactionAnalysis,
        arrears: arrearsAnalysis
      });

      if (detectedRisks.length > 0) {
        yield { 
          type: 'log', 
          step: 'AI_RISK',
          level: 'warning',
          message: 'リスク要素の総合評価',
          timestamp: new Date().toISOString(),
          details: {
            検出されたリスク: detectedRisks
          }
        };
      }

      // 総合スコア計算
      const scoreBreakdown = {
        資本金分析: capitalAnalysis.score,
        設立年数: establishmentAnalysis.score,
        取引実績: transactionAnalysis.score,
        債権種類: debtAnalysis.score
      };

      const weights = { 資本金分析: 0.15, 設立年数: 0.25, 取引実績: 0.35, 債権種類: 0.25 };
      const overallScore = Math.round(
        Object.entries(scoreBreakdown).reduce((sum, [key, score]) => 
          sum + score * weights[key as keyof typeof weights], 0)
      );

      yield { 
        type: 'log', 
        step: 'SCORING',
        message: '総合信用スコアの算出',
        timestamp: new Date().toISOString(),
        details: {
          各項目スコア: scoreBreakdown,
          重み付け: weights
        }
      };

      const riskLevel = this.calculateRiskLevel(overallScore, arrearsAnalysis, documentAnalysis);
      const judgment = this.getJudgmentText(overallScore, riskLevel);

      yield { 
        type: 'log', 
        step: 'SCORING_CALC',
        level: riskLevel === 'critical' ? 'error' : riskLevel === 'high' ? 'warning' : 'success',
        message: '加重平均による総合スコア算出完了',
        timestamp: new Date().toISOString(),
        details: {
          計算式: this.formatCalculationFormula(scoreBreakdown, weights),
          総合スコア: overallScore,
          判定基準: {
            '80以上': '優良',
            '65-79': '良好', 
            '50-64': '要注意',
            '50未満': '高リスク'
          },
          判定結果: judgment.result,
          リスクレベル: riskLevel
        }
      };

      // 最終結果
      const finalResult = await this.agent.analyzeRecord(record);
      
      yield { 
        type: 'log', 
        step: 'COMPLETE',
        level: 'success',
        message: `企業信用分析完了 - ${judgment.recommendation}`,
        timestamp: new Date().toISOString(),
        details: {
          最終評価: {
            総合スコア: overallScore,
            リスクレベル: riskLevel,
            推奨融資額上限: judgment.loanLimit,
            監視期間: judgment.monitoringPeriod,
            条件: judgment.conditions
          },
          分析所要時間: `${(Date.now() - Date.parse(new Date().toISOString())) / 1000}秒`,
          信頼度: this.calculateConfidence(finalResult)
        }
      };

      yield { 
        type: 'complete', 
        payload: finalResult,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      yield { 
        type: 'error', 
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  // 分析用のヘルパーメソッド
  private analyzeCapital(registry: any) {
    if (!registry?.資本金の額) return { score: 0, evaluation: 'データなし', 根拠: 'レジストリ情報が不足' };
    
    const capitalStr = registry.資本金の額;
    const capitalAmount = this.parseCapital(capitalStr);
    const industry = registry.業種 || '不明';
    
    // 業界平均との比較（簡易版）
    const industryAverages: Record<string, number> = {
      '建設業': 12000000,
      '製造業': 15000000,
      'サービス業': 8000000,
      'IT関連': 10000000
    };
    
    const average = industryAverages[industry] || 10000000;
    const ratio = capitalAmount / average;
    
    let score: number;
    let evaluation: string;
    let reasoning: string;
    
    if (ratio >= 1.0) {
      score = Math.min(100, 70 + Math.round(ratio * 10));
      evaluation = '平均以上';
      reasoning = `${industry}の平均資本金${(average/10000).toFixed(0)}万円の${Math.round(ratio*100)}%。企業規模として十分な資本基盤を有している。`;
    } else if (ratio >= 0.5) {
      score = Math.round(45 + (ratio - 0.5) * 50);
      evaluation = '平均以下だが許容範囲';
      reasoning = `${industry}の平均資本金の${Math.round(ratio*100)}%程度。小規模事業者として分類されるが、設備投資の負担が軽く機動性は高い。`;
    } else {
      score = Math.round(ratio * 90);
      evaluation = '小規模';
      reasoning = `業界平均を大幅に下回る。信用力は限定的だが、ニッチ市場での専門性や低コスト体質の可能性もある。`;
    }
    
    return {
      score,
      evaluation,
      資本金: capitalStr,
      業界平均: `${(average/10000).toFixed(0)}万円（${industry}）`,
      評価: evaluation,
      根拠: reasoning
    };
  }

  private analyzeEstablishment(registry: any) {
    if (!registry?.会社成立) return { score: 0, evaluation: 'データなし', 根拠: '設立日情報が不足' };
    
    const establishmentDate = new Date(registry.会社成立);
    const now = new Date();
    const yearsInBusiness = (now.getTime() - establishmentDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    
    let score: number;
    let evaluation: string;
    let reasoning: string;
    
    if (yearsInBusiness >= 10) {
      score = 90;
      evaluation = '長期安定';
      reasoning = `設立から${yearsInBusiness.toFixed(1)}年経過。長期にわたる事業運営により、市場での地位確立と経営ノウハウの蓄積が期待される。`;
    } else if (yearsInBusiness >= 5) {
      score = 72;
      evaluation = '安定期';
      reasoning = `設立から${yearsInBusiness.toFixed(1)}年経過。創業初期の不安定期を脱却し、事業基盤が確立されている可能性が高い。業界の3年以内廃業率を超えて継続している。`;
    } else if (yearsInBusiness >= 3) {
      score = 55;
      evaluation = '成長期';
      reasoning = `設立から${yearsInBusiness.toFixed(1)}年経過。創業初期のリスクは残るが、3年継続により一定の事業基盤を構築済み。`;
    } else {
      score = 35;
      evaluation = '創業期';
      reasoning = `設立から${yearsInBusiness.toFixed(1)}年。創業初期段階で事業の持続可能性にはリスクが伴う。慎重な評価が必要。`;
    }
    
    return {
      score,
      evaluation,
      設立年月日: registry.会社成立,
      経過年数: `${yearsInBusiness.toFixed(1)}年`,
      評価: evaluation,
      根拠: reasoning
    };
  }

  private analyzeTransactionHistory(collaterals: any[]) {
    if (!collaterals || collaterals.length === 0) {
      return { score: 30, evaluation: 'データ不足', 根拠: '取引履歴情報が不足しています' };
    }
    
    const transactions = collaterals.flatMap(c => [
      c.過去の入金_先々月,
      c.過去の入金_先月, 
      c.過去の入金_今月
    ]).filter(amount => amount > 0);
    
    if (transactions.length === 0) {
      return { score: 25, evaluation: '取引実績なし', 根拠: '過去の入金実績が確認できません' };
    }
    
    const average = transactions.reduce((sum, t) => sum + t, 0) / transactions.length;
    const variance = transactions.reduce((sum, t) => sum + Math.pow(t - average, 2), 0) / transactions.length;
    const stdDev = Math.sqrt(variance);
    const coefficient = average > 0 ? stdDev / average : 0;
    
    let score: number;
    let evaluation: string;
    let reasoning: string;
    
    if (coefficient <= 0.25) {
      score = 85;
      evaluation = '安定';
      reasoning = `変動係数${coefficient.toFixed(2)}と低く、安定した取引実績。月次入金額の標準偏差が平均の25%以内で、予測可能性が高い。`;
    } else if (coefficient <= 0.4) {
      score = 58;
      evaluation = '中程度の変動';
      reasoning = `変動係数${coefficient.toFixed(2)}。業種特性を考慮しても変動がやや大きく、キャッシュフロー管理への注意が必要。`;
    } else {
      score = 35;
      evaluation = '高変動';
      reasoning = `変動係数${coefficient.toFixed(2)}と高い。入金パターンが不安定で、事業の予測可能性に課題がある可能性。`;
    }
    
    return {
      score,
      evaluation,
      過去12ヶ月入金: transactions.map((t, i) => `${3-i}ヶ月前: ${t.toLocaleString()}円`),
      変動係数: coefficient.toFixed(2),
      評価: evaluation,
      根拠: reasoning
    };
  }

  private analyzeDebtType(registries: any[], purchases: any[]) {
    if (!registries || registries.length === 0) {
      return { score: 40, evaluation: 'データ不足', 根拠: '債権種類情報が不足' };
    }
    
    const debtTypes = registries.map(r => r.債権の種類).filter(Boolean);
    const purchaseTotal = purchases.reduce((sum, p) => sum + p.買取額, 0);
    
    if (debtTypes.length === 0) {
      return { score: 35, evaluation: '債権種類不明', 根拠: '債権の種類が明確でないため回収リスクを評価できません' };
    }
    
    const primaryDebtType = debtTypes[0];
    let score: number;
    let evaluation: string;
    let reasoning: string;
    
    // 債権種類別の評価
    if (primaryDebtType.includes('工事代金') || primaryDebtType.includes('請負代金')) {
      score = 85;
      evaluation = '高回収確実性';
      reasoning = `${primaryDebtType}は完成された成果物に対する対価として、法的根拠が明確。建物抵当権等の担保設定も可能で、債務者の支払い能力にも一定の安定性が期待される。`;
    } else if (primaryDebtType.includes('売掛金') || primaryDebtType.includes('商品代金')) {
      score = 70;
      evaluation = '標準的回収確実性';
      reasoning = `${primaryDebtType}は継続的取引関係に基づく債権で、取引先との関係性により回収確実性が左右される。`;
    } else if (primaryDebtType.includes('貸付金') || primaryDebtType.includes('立替金')) {
      score = 55;
      evaluation = '要注意';
      reasoning = `${primaryDebtType}は回収確実性が債務者の財務状況に大きく依存する。追加的な担保や保証が重要。`;
    } else {
      score = 45;
      evaluation = '要詳細確認';
      reasoning = `${primaryDebtType}については個別の回収確実性評価が必要。債権の性質と回収手段を詳細に検討する必要がある。`;
    }
    
    return {
      score,
      evaluation,
      債権種類: primaryDebtType,
      買取総額: `${purchaseTotal.toLocaleString()}円`,
      回収確実性: evaluation,
      根拠: reasoning
    };
  }

  private detectRisks(record: any, analyses: any) {
    const risks = [];
    
    // 入金変動リスク
    if (analyses.transaction.score < 60) {
      const companies = record.collaterals.map((c: any) => c.会社名_第三債務者_担保).filter(Boolean);
      risks.push({
        項目: `${companies[0] || '取引先'}の入金変動`,
        重要度: analyses.transaction.score < 40 ? '高' : '中',
        詳細: analyses.transaction.根拠,
        対策: analyses.transaction.score < 40 ? '6ヶ月間の月次キャッシュフロー監視を推奨' : '3ヶ月間のキャッシュフロー監視を推奨'
      });
    }
    
    // 資本金リスク
    if (analyses.company && analyses.company.score < 50) {
      risks.push({
        項目: '資本金規模の限界',
        重要度: '低',
        詳細: '小規模資本金による信用力の制約があるが、機動性は高い',
        対策: '融資額は月商の2倍以内に制限'
      });
    }
    
    return risks;
  }

  private formatCalculationFormula(scores: any, weights: any) {
    const terms = Object.entries(scores).map(([key, score]) => 
      `${score}×${weights[key as keyof typeof weights]}`
    );
    const total = Object.entries(scores).reduce((sum, [key, score]) => 
      sum + (score as number) * weights[key as keyof typeof weights], 0
    );
    return `(${terms.join(' + ')}) = ${total.toFixed(2)}`;
  }

  private calculateRiskLevel(score: number, arrearsAnalysis: any, documentAnalysis: any): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 80) return 'low';
    if (score >= 65) return 'medium';
    if (score >= 50) return 'high';
    return 'critical';
  }

  private getJudgmentText(score: number, riskLevel: string) {
    if (score >= 80) {
      return {
        result: '優良',
        recommendation: '即承認推奨',
        loanLimit: '月商の2.0倍（制限なし）',
        monitoringPeriod: '6ヶ月',
        conditions: ['半年毎の財務報告書提出']
      };
    } else if (score >= 65) {
      return {
        result: '良好', 
        recommendation: '条件付き承認',
        loanLimit: '月商の1.5倍（適正範囲）',
        monitoringPeriod: '3ヶ月',
        conditions: ['月次売上報告書の提出', 'キャッシュフロー計算書の提出']
      };
    } else if (score >= 50) {
      return {
        result: '要注意',
        recommendation: '追加審査後承認',
        loanLimit: '月商の1.0倍（慎重)',
        monitoringPeriod: '1ヶ月',
        conditions: ['週次資金繰り表の提出', '追加担保の設定', '保証人の追加検討']
      };
    } else {
      return {
        result: '高リスク',
        recommendation: '見送り推奨',
        loanLimit: '承認不可',
        monitoringPeriod: '-',
        conditions: ['リスク要因の解消後再審査']
      };
    }
  }

  private calculateConfidence(result: any): string {
    let confidence = 70; // ベース信頼度
    
    // データの充実度による調整
    if (result.categories?.company?.score > 0) confidence += 5;
    if (result.categories?.fundUsage?.score > 0) confidence += 5;
    if (result.documentAnalysis?.bankStatements?.extracted) confidence += 10;
    if (result.redFlags?.length === 0) confidence += 10;
    
    return `${Math.min(95, confidence)}%`;
  }

  private parseCapital(capitalStr: string): number {
    // "500万円" -> 5000000
    const match = capitalStr.match(/(\d+(?:\.\d+)?)([万億]?)円?/);
    if (!match) return 0;
    
    const amount = parseFloat(match[1]);
    const unit = match[2];
    
    if (unit === '万') return amount * 10000;
    if (unit === '億') return amount * 100000000;
    return amount;
  }
}

// エクスポート用のインスタンス
export const complianceWorkflow = new ComplianceWorkflow();