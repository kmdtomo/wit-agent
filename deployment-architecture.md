# WIT Agent - デプロイメントアーキテクチャ

## 現在の構成

### 1. Mastra Backend (デプロイ済み)
- **URL**: https://echoing-brown-ad.mastra.cloud/
- **API URL**: https://echoing-brown-ad-de147c74-bba4-42c3-9865-b6dfb446c08e.mastra.cloud/
- **内容**: 審査エンジン、Kintone連携、Claude AI

### 2. UI Frontend (これから作成)
- **リポジトリ**: 新規作成 `wit-agent-ui`
- **技術**: Next.js 14 + TypeScript + Tailwind
- **デプロイ先**: Vercel

## アーキテクチャ図

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│   UI (Vercel)   │────▶│ Mastra (Cloud)  │────▶│    Kintone     │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                        │                        
        │                        ▼                        
        │               ┌─────────────────┐              
        │               │                 │              
        └──────────────▶│   Claude API    │              
                        │                 │              
                        └─────────────────┘              
```

## UI リポジトリのセットアップ

### 1. 新規リポジトリ作成

```bash
# 新しいディレクトリで
mkdir wit-agent-ui
cd wit-agent-ui

# Next.jsプロジェクト作成
npx create-next-app@latest . --typescript --tailwind --app

# Git初期化
git init
git remote add origin https://github.com/Techno-Chain-Inc/wit-agent-ui.git
```

### 2. 必要な依存関係

```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "@tanstack/react-query": "^5.0.0",
    "axios": "^1.6.0",
    "recharts": "^2.10.0",
    "react-hot-toast": "^2.4.0",
    "zod": "^3.22.0"
  }
}
```

### 3. 環境変数設定

```env
# .env.local
NEXT_PUBLIC_MASTRA_API_URL=https://echoing-brown-ad-de147c74-bba4-42c3-9865-b6dfb446c08e.mastra.cloud
NEXT_PUBLIC_MASTRA_API_KEY=your-api-key-if-needed
```

## API連携の実装

### lib/api/mastra-client.ts
```typescript
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_MASTRA_API_URL;

export interface AnalysisRequest {
  recordId: string;
  options?: {
    includeEgoSearch?: boolean;
    includeDocumentAnalysis?: boolean;
  };
}

export interface AnalysisResult {
  recordId: string;
  overallScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  categories: {
    company: CategoryResult;
    fundUsage: CategoryResult;
    transaction: CategoryResult;
  };
  redFlags: RedFlag[];
  recommendations: string[];
}

class MastraClient {
  private client = axios.create({
    baseURL: API_URL,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  async analyzeRecord(request: AnalysisRequest): Promise<AnalysisResult> {
    const response = await this.client.post('/api/analyze', request);
    return response.data;
  }

  async getAnalysisStatus(recordId: string): Promise<any> {
    const response = await this.client.get(`/api/analyze/${recordId}/status`);
    return response.data;
  }

  async getAnalysisHistory(): Promise<any[]> {
    const response = await this.client.get('/api/analyze/history');
    return response.data;
  }
}

export const mastraClient = new MastraClient();
```

### app/page.tsx
```typescript
'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { mastraClient } from '@/lib/api/mastra-client';
import toast from 'react-hot-toast';

export default function HomePage() {
  const [recordId, setRecordId] = useState('');

  const analyzeMutation = useMutation({
    mutationFn: (recordId: string) => 
      mastraClient.analyzeRecord({ recordId }),
    onSuccess: (data) => {
      toast.success('審査が完了しました');
      // 結果画面へ遷移
      window.location.href = `/results/${data.recordId}`;
    },
    onError: (error) => {
      toast.error('審査中にエラーが発生しました');
    },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          {/* ヘッダー */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              WIT Agent
            </h1>
            <p className="text-lg text-gray-600">
              AI駆動型ファクタリング審査システム
            </p>
          </div>

          {/* 入力フォーム */}
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  レコードID
                </label>
                <input
                  type="text"
                  value={recordId}
                  onChange={(e) => setRecordId(e.target.value)}
                  placeholder="例: 9559"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <button
                onClick={() => analyzeMutation.mutate(recordId)}
                disabled={!recordId || analyzeMutation.isPending}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {analyzeMutation.isPending ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    審査中...
                  </span>
                ) : (
                  '審査開始'
                )}
              </button>
            </div>
          </div>

          {/* 機能説明 */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <FeatureCard
              icon="🔍"
              title="企業信用評価"
              description="資本金、取引実績、財務状況を総合評価"
            />
            <FeatureCard
              icon="💰"
              title="資金使途分析"
              description="資金使途の妥当性と横領リスクを判定"
            />
            <FeatureCard
              icon="📊"
              title="リスクスコアリング"
              description="AIによる包括的なリスク評価"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description }) {
  return (
    <div className="bg-white rounded-lg p-6 text-center">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  );
}
```

### app/results/[id]/page.tsx
```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import { mastraClient } from '@/lib/api/mastra-client';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

export default function ResultsPage({ params }: { params: { id: string } }) {
  const { data: result, isLoading } = useQuery({
    queryKey: ['analysis', params.id],
    queryFn: () => mastraClient.getAnalysisResult(params.id),
  });

  if (isLoading) return <LoadingScreen />;
  if (!result) return <NotFound />;

  const chartData = [
    { category: '企業信用', score: result.categories.company.score },
    { category: '資金使途', score: result.categories.fundUsage.score },
    { category: '取引履歴', score: result.categories.transaction.score },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        {/* スコアサマリー */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <ScoreCard
              label="総合スコア"
              score={result.overallScore}
              maxScore={100}
              color={getScoreColor(result.overallScore)}
            />
            <RiskLevelCard level={result.riskLevel} />
            <RecommendationCard count={result.recommendations.length} />
          </div>
        </div>

        {/* レーダーチャート */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold mb-6">カテゴリ別評価</h2>
          <div className="flex justify-center">
            <RadarChart width={400} height={400} data={chartData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="category" />
              <PolarRadiusAxis angle={90} domain={[0, 100]} />
              <Radar name="Score" dataKey="score" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.6} />
            </RadarChart>
          </div>
        </div>

        {/* リスクフラグ */}
        {result.redFlags.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-bold mb-6">検出されたリスク</h2>
            <div className="space-y-4">
              {result.redFlags.map((flag, index) => (
                <RiskFlag key={index} flag={flag} />
              ))}
            </div>
          </div>
        )}

        {/* 推奨アクション */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-bold mb-6">推奨アクション</h2>
          <ol className="space-y-3">
            {result.recommendations.map((rec, index) => (
              <li key={index} className="flex">
                <span className="font-semibold text-blue-600 mr-3">{index + 1}.</span>
                <span className="text-gray-700">{rec}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
```

## Mastra側のAPI実装

### Mastra Cloud上に追加するエンドポイント

```typescript
// api/analyze.ts
export async function POST(request: Request) {
  const { recordId, options } = await request.json();
  
  // 既存のワークフローを呼び出し
  const workflow = new ComplianceWorkflow();
  const result = await workflow.execute(recordId);
  
  // エゴサーチを追加（オプション）
  if (options?.includeEgoSearch) {
    const reputationCheck = await comprehensiveReputationCheckTool.execute({
      name: result.representativeName,
      companyName: result.companyName,
    });
    result.reputationCheck = reputationCheck;
  }
  
  return Response.json(result);
}
```

## デプロイ手順

### 1. UIリポジトリをVercelにデプロイ

```bash
# UIリポジトリで
vercel --prod
```

### 2. 環境変数設定
Vercelダッシュボードで：
- `NEXT_PUBLIC_MASTRA_API_URL` = Mastra CloudのURL

### 3. CORS設定
Mastra Cloud側でCORSを許可：
```typescript
headers: {
  'Access-Control-Allow-Origin': 'https://your-ui.vercel.app',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}
```

## 完成後の構成

```
1. https://wit-agent-ui.vercel.app/ (UI)
   ↓
2. https://echoing-brown-ad.mastra.cloud/api/analyze (API)
   ↓
3. Kintone + Claude AI
```

これで別リポジトリでUIを作成し、デプロイ済みのMastraと連携できます！