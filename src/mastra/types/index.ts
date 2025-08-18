// Kintoneデータアクセスガイドの必須項目に基づく型定義

// ========== 基本情報（メインレコード）==========
export interface BasicInfo {
  顧客番号: string;
  入金日: string;
  会社_屋号名: string;
  代表者名: string;
  生年月日: string;
  携帯番号_ハイフンなし: string;
}

// ========== 取引先のデータ ==========
// 買取情報テーブル
export interface PurchaseInfo {
  会社名_第三債務者_買取: string;
  買取債権額: number;
  買取額: number;
  掛目: string;
  買取債権支払日: string;
  状態_0: string;
}

// 担保情報テーブル
export interface CollateralInfo {
  会社名_第三債務者_担保: string;
  請求額: number;
  入金予定日: string;
  過去の入金_先々月: number;
  過去の入金_先月: number;
  過去の入金_今月: number;
  平均: number;
}

// 謄本情報テーブル
export interface RegistryInfo {
  会社名_第三債務者_0: string;
  資本金の額: string;
  会社成立: string;
  債権の種類: string;
}

// 回収情報テーブル
export interface CollectionInfo {
  回収予定日: string;
  回収金額: number;
}

// ========== 資金の使い道・理由 ==========
export interface FundUsageInfo {
  所感_条件_担当者: string;
  所感_条件_決裁者: string;
}

// 財務・リスク情報
export interface FinancialRiskInfo {
  売上: number;
  業種: string;
  資金使途: string;
  ファクタリング利用: string;
  納付状況_税金: string;
  税金滞納額_0: number;
  納付状況_税金_0: string; // 保険料の納付状況
  保険料滞納額: number;
}

// ========== 入出金履歴（添付ファイル）==========
export interface AttachedFiles {
  買取情報_成因証書_謄本類_名刺等_添付ファイル: FileInfo[];
  通帳_メイン_添付ファイル: FileInfo[];
  通帳_その他_添付ファイル: FileInfo[];
  顧客情報_添付ファイル: FileInfo[];
  他社資料_添付ファイル: FileInfo[];
  担保情報_成因証書_謄本類_名刺等_添付ファイル: FileInfo[];
  その他_添付ファイル: FileInfo[];
}

export interface FileInfo {
  name: string;
  fileKey: string;
  size: number;
  contentType: string;
  content?: Buffer; // ダウンロード後のコンテンツ
}

// ========== 統合されたレコードデータ ==========
export interface KintoneRecord {
  recordId: string;
  basic: BasicInfo;
  purchases: PurchaseInfo[];
  collaterals: CollateralInfo[];
  registries: RegistryInfo[];
  collections: CollectionInfo[];
  fundUsage: FundUsageInfo;
  financialRisk: FinancialRiskInfo;
  attachments: AttachedFiles;
}

// ========== AI分析結果 ==========
export interface ComplianceAnalysisResult {
  recordId: string;
  timestamp: string;
  overallScore: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  
  // カテゴリ別分析
  categories: {
    company: CategoryAnalysis;      // 取引先データ分析
    fundUsage: CategoryAnalysis;    // 資金使途分析
    transaction: CategoryAnalysis;   // 入出金履歴分析
  };
  
  // リスク要因
  redFlags: RedFlag[];
  
  // 推奨アクション
  recommendations: string[];
  
  // 画像分析結果
  documentAnalysis?: DocumentAnalysis;
}

export interface CategoryAnalysis {
  score: number; // 0-100
  status: 'passed' | 'warning' | 'failed';
  findings: string[];
  details: Record<string, any>;
}

export interface RedFlag {
  category: 'company' | 'financial' | 'transaction' | 'document';
  severity: 'low' | 'medium' | 'high';
  description: string;
  evidence: string;
  affectedField?: string;
}

export interface DocumentAnalysis {
  bankStatements: {
    extracted: boolean;
    monthlyAverage?: number;
    transactionCount?: number;
    anomalies?: string[];
  };
  invoices: {
    extracted: boolean;
    totalAmount?: number;
    companies?: string[];
  };
  contracts: {
    extracted: boolean;
    keyTerms?: string[];
  };
}

// ========== エラー型 ==========
export interface AnalysisError {
  code: string;
  message: string;
  field?: string;
  details?: any;
}