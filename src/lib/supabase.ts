import { createClient } from "@supabase/supabase-js";

// 環境変数のバリデーション
const supabaseUrl =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn(
    "Supabase環境変数が設定されていません。ユーザーDBからの詐欺情報参照は無効です。"
  );
}

// サービスロールキーを使用したSupabaseクライアント（RLS を bypass）
export const supabaseAdmin =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : null;

// データベース型定義
export interface UserFraudReport {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  fraud_person_name: string;
  fraud_person_alias: string[] | null;
  fraud_type: string;
  description: string;
  evidence_urls: string[] | null;
  phone_number: string | null;
  email: string | null;
  address: string | null;
  company_name: string | null;
  incident_date: string | null;
  amount_involved: number | null;
  verification_status: "pending" | "verified" | "rejected";
  is_public: boolean;
  tags: string[] | null;
}

/**
 * ユーザーDBから詐欺情報を検索
 */
export async function searchUserFraudReports(
  searchName: string,
  searchAliases: string[] = []
): Promise<{
  found: boolean;
  reports: UserFraudReport[];
  details: string;
  riskScore: number;
  confidence: number;
}> {
  if (!supabaseAdmin) {
    console.warn("Supabaseクライアントが利用できません");
    return {
      found: false,
      reports: [],
      details: "ユーザーDBからの検索は利用できません",
      riskScore: 0,
      confidence: 0,
    };
  }

  try {
    console.log(`🔍 ユーザーDB検索開始: ${searchName}`);

    const searchNames = [searchName, ...searchAliases].filter(
      (name) => name.trim() !== ""
    );
    const matchedReports: UserFraudReport[] = [];

    for (const name of searchNames) {
      // 名前での直接一致検索
      const { data: exactMatches, error: exactError } = await supabaseAdmin
        .from("fraud_reports")
        .select("*")
        .eq("verification_status", "verified")
        .eq("is_public", true)
        .ilike("fraud_person_name", `%${name}%`);

      if (exactError) {
        console.error("ユーザーDB検索エラー (exact):", exactError);
      } else if (exactMatches && exactMatches.length > 0) {
        matchedReports.push(...exactMatches);
      }

      // 別名での検索
      const { data: aliasMatches, error: aliasError } = await supabaseAdmin
        .from("fraud_reports")
        .select("*")
        .eq("verification_status", "verified")
        .eq("is_public", true)
        .contains("fraud_person_alias", [name]);

      if (aliasError) {
        console.error("ユーザーDB検索エラー (alias):", aliasError);
      } else if (aliasMatches && aliasMatches.length > 0) {
        matchedReports.push(...aliasMatches);
      }

      // PostgreSQLの全文検索
      const { data: fulltextMatches, error: fulltextError } =
        await supabaseAdmin
          .from("fraud_reports")
          .select("*")
          .eq("verification_status", "verified")
          .eq("is_public", true)
          .textSearch("fraud_person_name", name, {
            type: "websearch",
            config: "japanese",
          });

      if (fulltextError) {
        console.error("ユーザーDB検索エラー (fulltext):", fulltextError);
      } else if (fulltextMatches && fulltextMatches.length > 0) {
        matchedReports.push(...fulltextMatches);
      }
    }

    // 重複を除去
    const uniqueReports = matchedReports.filter(
      (report, index, self) =>
        index === self.findIndex((r) => r.id === report.id)
    );

    if (uniqueReports.length > 0) {
      console.log(
        `🚨 ユーザーDB検索：詐欺情報検出 - ${uniqueReports.length}件の報告`
      );

      // リスクスコアを計算
      let riskScore = 0.8; // ユーザー報告の基本スコア
      let totalAmount = 0;
      let criticalTypes = 0;

      uniqueReports.forEach((report) => {
        // 被害金額による加算
        if (report.amount_involved && report.amount_involved > 1000000) {
          riskScore += 0.1; // 100万円以上の場合
        }

        // 詐欺タイプによる加算
        const criticalFraudTypes = [
          "ファクタリング詐欺",
          "キャバクラ詐欺",
          "投資詐欺",
        ];
        if (criticalFraudTypes.includes(report.fraud_type)) {
          criticalTypes++;
        }

        totalAmount += report.amount_involved || 0;
      });

      // 複数の重大詐欺タイプがある場合
      if (criticalTypes >= 2) {
        riskScore += 0.15;
      }

      // 複数報告がある場合
      if (uniqueReports.length >= 3) {
        riskScore += 0.1;
      }

      riskScore = Math.min(riskScore, 1.0);

      const details =
        `ユーザーDBで${uniqueReports.length}件の詐欺報告を発見: ` +
        uniqueReports
          .map(
            (report) =>
              `${report.fraud_type}(${report.created_at.split("T")[0]})`
          )
          .join(", ") +
        (totalAmount > 0 ? ` 総被害額: ${totalAmount.toLocaleString()}円` : "");

      return {
        found: true,
        reports: uniqueReports,
        details,
        riskScore,
        confidence: 0.9, // ユーザー検証済み報告は高信頼度
      };
    }

    console.log(`✅ ユーザーDB検索：該当なし - ${searchName}`);
    return {
      found: false,
      reports: [],
      details: "ユーザーDBで該当なし",
      riskScore: 0,
      confidence: 0.95,
    };
  } catch (error) {
    console.error(`❌ ユーザーDB検索エラー: ${error}`);
    return {
      found: false,
      reports: [],
      details: `ユーザーDB検索エラー: ${error}`,
      riskScore: 0,
      confidence: 0,
    };
  }
}

/**
 * 統計情報の取得
 */
export async function getUserFraudStatistics(): Promise<{
  totalReports: number;
  verifiedReports: number;
  topFraudTypes: Array<{ type: string; count: number }>;
  totalDamageAmount: number;
}> {
  if (!supabaseAdmin) {
    return {
      totalReports: 0,
      verifiedReports: 0,
      topFraudTypes: [],
      totalDamageAmount: 0,
    };
  }

  try {
    // 総報告数
    const { count: totalReports } = await supabaseAdmin
      .from("fraud_reports")
      .select("*", { count: "exact", head: true });

    // 検証済み報告数
    const { count: verifiedReports } = await supabaseAdmin
      .from("fraud_reports")
      .select("*", { count: "exact", head: true })
      .eq("verification_status", "verified");

    // 詐欺タイプ別統計
    const { data: fraudTypeData } = await supabaseAdmin
      .from("fraud_reports")
      .select("fraud_type")
      .eq("verification_status", "verified");

    const fraudTypeCounts: Record<string, number> = {};
    fraudTypeData?.forEach((item) => {
      fraudTypeCounts[item.fraud_type] =
        (fraudTypeCounts[item.fraud_type] || 0) + 1;
    });

    const topFraudTypes = Object.entries(fraudTypeCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([type, count]) => ({ type, count }));

    // 総被害額
    const { data: damageData } = await supabaseAdmin
      .from("fraud_reports")
      .select("amount_involved")
      .eq("verification_status", "verified")
      .not("amount_involved", "is", null);

    const totalDamageAmount =
      damageData?.reduce((sum, item) => sum + (item.amount_involved || 0), 0) ||
      0;

    return {
      totalReports: totalReports || 0,
      verifiedReports: verifiedReports || 0,
      topFraudTypes,
      totalDamageAmount,
    };
  } catch (error) {
    console.error("統計情報取得エラー:", error);
    return {
      totalReports: 0,
      verifiedReports: 0,
      topFraudTypes: [],
      totalDamageAmount: 0,
    };
  }
}
