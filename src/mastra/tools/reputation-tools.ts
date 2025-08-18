import { anthropic } from '../mastra.config';

// ========== エゴサーチツール ==========
export const searchReputationTool = {
  name: 'searchReputation',
  description: '代表者名をWeb検索して評判を調査',
  execute: async ({ 
    name,
    companyName 
  }: {
    name: string;
    companyName?: string;
  }) => {
    const searchResults = {
      normalSearch: { count: 0, findings: [] as string[] },
      fraudSearch: { count: 0, findings: [] as string[] },
      arrestSearch: { count: 0, findings: [] as string[] },
      riskScore: 0,
      recommendation: '',
    };

    try {
      // 3パターンの検索クエリ
      const queries = [
        { type: 'normal', query: name },
        { type: 'fraud', query: `${name} 詐欺` },
        { type: 'arrest', query: `${name} 逮捕` },
      ];

      // Google Custom Search APIまたはSerp APIを使用
      // 今は仮実装（実際のAPI統合が必要）
      for (const searchQuery of queries) {
        const results = await performWebSearch(searchQuery.query);
        
        if (searchQuery.type === 'normal') {
          searchResults.normalSearch.count = results.count;
          searchResults.normalSearch.findings = results.snippets;
        } else if (searchQuery.type === 'fraud') {
          searchResults.fraudSearch.count = results.count;
          searchResults.fraudSearch.findings = results.snippets;
          if (results.count > 0) {
            searchResults.riskScore += 40;
          }
        } else if (searchQuery.type === 'arrest') {
          searchResults.arrestSearch.count = results.count;
          searchResults.arrestSearch.findings = results.snippets;
          if (results.count > 0) {
            searchResults.riskScore += 50;
          }
        }
      }

      // リスク評価
      if (searchResults.riskScore >= 70) {
        searchResults.recommendation = '高リスク：詳細な調査が必要';
      } else if (searchResults.riskScore >= 40) {
        searchResults.recommendation = '中リスク：追加確認を推奨';
      } else {
        searchResults.recommendation = '低リスク：問題なし';
      }

      return searchResults;
    } catch (error) {
      console.error('Reputation search error:', error);
      return {
        ...searchResults,
        error: 'エゴサーチ中にエラーが発生しました',
      };
    }
  },
};

// ========== 詐欺データベースチェックツール ==========
export const checkFraudDatabaseTool = {
  name: 'checkFraudDatabase',
  description: '詐欺情報サイトで名前をチェック',
  execute: async ({ 
    name,
    companyName 
  }: {
    name: string;
    companyName?: string;
  }) => {
    const databases = [
      {
        name: 'ヤマガタ詐欺情報',
        url: 'https://yamagatamasakage.com/givemebackmoney/',
        found: false,
        details: null as string | null,
      },
      {
        name: '詐欺師撲滅',
        url: 'https://eradicationofblackmoneyscammers.com/',
        found: false,
        details: null as string | null,
      },
    ];

    let totalRiskScore = 0;

    for (const db of databases) {
      try {
        // Puppeteerまたは外部APIでスクレイピング
        // 今は仮実装
        const result = await checkSpecificDatabase(db.url, name, companyName);
        
        if (result.found) {
          db.found = true;
          db.details = result.details;
          totalRiskScore += 60;
        }
      } catch (error) {
        console.error(`Failed to check ${db.name}:`, error);
      }
    }

    return {
      databases,
      isListed: databases.some(db => db.found),
      riskScore: Math.min(totalRiskScore, 100),
      recommendation: totalRiskScore > 0 
        ? '詐欺DBに掲載あり：取引中止を強く推奨'
        : '詐欺DBに掲載なし',
    };
  },
};

// ========== 統合評判チェックツール ==========
export const comprehensiveReputationCheckTool = {
  name: 'comprehensiveReputationCheck',
  description: 'Web検索と詐欺DBを統合してチェック',
  execute: async ({ 
    name,
    companyName 
  }: {
    name: string;
    companyName?: string;
  }) => {
    // Web検索
    const webSearch = await searchReputationTool.execute({ name, companyName });
    
    // 詐欺DB確認
    const fraudDb = await checkFraudDatabaseTool.execute({ name, companyName });
    
    // 統合スコア計算
    const totalRiskScore = Math.min(
      webSearch.riskScore + fraudDb.riskScore,
      100
    );

    // AIによる総合判断
    const aiAnalysis = await analyzeReputationWithAI({
      name,
      companyName,
      webSearchResults: webSearch,
      fraudDbResults: fraudDb,
    });

    return {
      overallRiskScore: totalRiskScore,
      webSearch,
      fraudDatabase: fraudDb,
      aiAnalysis,
      finalRecommendation: determineFinalRecommendation(totalRiskScore),
    };
  },
};

// ========== ヘルパー関数 ==========

async function performWebSearch(query: string): Promise<any> {
  // TODO: 実際のGoogle Custom Search APIまたはSerp API実装
  // 現在は仮のレスポンス
  console.log(`Searching for: ${query}`);
  
  // 仮実装
  if (query.includes('詐欺') || query.includes('逮捕')) {
    return {
      count: 0,
      snippets: [],
    };
  }
  
  return {
    count: 10,
    snippets: ['通常の検索結果'],
  };
}

async function checkSpecificDatabase(
  url: string,
  name: string,
  companyName?: string
): Promise<any> {
  // TODO: Puppeteerでスクレイピング実装
  console.log(`Checking ${url} for ${name}`);
  
  // 仮実装
  return {
    found: false,
    details: null,
  };
}

async function analyzeReputationWithAI(data: any): Promise<any> {
  const prompt = `
    以下の評判調査結果を分析して、リスク評価を行ってください：
    
    対象者: ${data.name}
    会社名: ${data.companyName || 'なし'}
    
    Web検索結果:
    - 通常検索: ${data.webSearchResults.normalSearch.count}件
    - 詐欺キーワード: ${data.webSearchResults.fraudSearch.count}件
    - 逮捕キーワード: ${data.webSearchResults.arrestSearch.count}件
    
    詐欺DB掲載: ${data.fraudDbResults.isListed ? 'あり' : 'なし'}
    
    総合的なリスク評価と推奨事項を提供してください。
  `;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: prompt,
      }],
    });

    return response.content[0].type === 'text' 
      ? response.content[0].text 
      : 'AI分析失敗';
  } catch (error) {
    console.error('AI analysis error:', error);
    return 'AI分析中にエラーが発生しました';
  }
}

function determineFinalRecommendation(riskScore: number): string {
  if (riskScore >= 80) {
    return '🚫 極めて高リスク：取引を中止してください';
  } else if (riskScore >= 60) {
    return '⚠️ 高リスク：追加の担保や保証人を必須とする';
  } else if (riskScore >= 40) {
    return '⚡ 中リスク：慎重な審査と条件付き承認を推奨';
  } else if (riskScore >= 20) {
    return '👀 低リスク：通常審査で問題なし';
  } else {
    return '✅ リスクなし：安全な取引先';
  }
}