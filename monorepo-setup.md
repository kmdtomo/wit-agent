# WIT Agent - モノレポ構成

## 推奨ディレクトリ構造

```
wit-agent/
├── packages/
│   ├── core/              # 現在のMastraロジック
│   │   ├── src/
│   │   │   └── mastra/    # 既存のコード
│   │   └── package.json
│   │
│   ├── web/               # Next.js UI
│   │   ├── app/
│   │   │   ├── page.tsx
│   │   │   ├── analyze/
│   │   │   └── api/
│   │   └── package.json
│   │
│   └── shared/            # 共有型定義
│       ├── types/
│       └── package.json
│
├── pnpm-workspace.yaml    # pnpmワークスペース設定
├── package.json           # ルートpackage.json
└── turbo.json            # Turborepo設定（オプション）
```

## セットアップ手順

### 1. pnpmワークスペース設定

```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'
```

### 2. ルートpackage.json

```json
{
  "name": "wit-agent",
  "private": true,
  "scripts": {
    "dev": "pnpm --parallel dev",
    "build": "pnpm -r build",
    "dev:core": "pnpm --filter @wit/core dev",
    "dev:web": "pnpm --filter @wit/web dev",
    "analyze": "pnpm --filter @wit/core analyze"
  }
}
```

### 3. パッケージ分割

#### packages/core/package.json
```json
{
  "name": "@wit/core",
  "version": "1.0.0",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "analyze": "tsx src/cli.ts"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.60.0",
    "@wit/shared": "workspace:*"
  }
}
```

#### packages/web/package.json
```json
{
  "name": "@wit/web",
  "version": "1.0.0",
  "scripts": {
    "dev": "next dev --port 3000",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "^14.0.0",
    "@wit/core": "workspace:*",
    "@wit/shared": "workspace:*"
  }
}
```

#### packages/shared/package.json
```json
{
  "name": "@wit/shared",
  "version": "1.0.0",
  "main": "index.js",
  "types": "index.d.ts"
}
```

## UI実装例

### packages/web/app/page.tsx
```tsx
'use client';

import { useState } from 'react';
import { analyzeRecord } from '@wit/core';

export default function HomePage() {
  const [recordId, setRecordId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordId }),
      });
      const data = await response.json();
      setResult(data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">
        WIT Agent - ファクタリング審査システム
      </h1>
      
      <div className="bg-white rounded-lg shadow p-6">
        <input
          type="text"
          value={recordId}
          onChange={(e) => setRecordId(e.target.value)}
          placeholder="レコードID (例: 9559)"
          className="w-full p-3 border rounded"
        />
        
        <button
          onClick={handleAnalyze}
          disabled={loading || !recordId}
          className="mt-4 w-full bg-blue-500 text-white p-3 rounded"
        >
          {loading ? '審査中...' : '審査開始'}
        </button>
      </div>

      {result && (
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-4">審査結果</h2>
          <div className="grid grid-cols-3 gap-4">
            <ScoreCard 
              title="総合スコア"
              score={result.overallScore}
              level={result.riskLevel}
            />
            {/* 他のコンポーネント */}
          </div>
        </div>
      )}
    </div>
  );
}
```

### packages/web/app/api/analyze/route.ts
```typescript
import { analyzeFactoringApplication } from '@wit/core';

export async function POST(request: Request) {
  const { recordId } = await request.json();
  
  try {
    const result = await analyzeFactoringApplication(recordId);
    return Response.json(result);
  } catch (error) {
    return Response.json(
      { error: 'Analysis failed' },
      { status: 500 }
    );
  }
}
```

## 移行手順

### 現在の構造から移行

```bash
# 1. ディレクトリ作成
mkdir -p packages/core packages/web packages/shared

# 2. 既存コードを移動
mv src packages/core/
mv package.json packages/core/
mv tsconfig.json packages/core/

# 3. ワークスペース設定
echo "packages:\n  - 'packages/*'" > pnpm-workspace.yaml

# 4. Web UIを作成
cd packages/web
npx create-next-app@latest . --typescript --tailwind --app

# 5. 依存関係を再インストール
cd ../..
pnpm install
```

## メリット

1. **型の共有** - `@wit/shared`で型定義を共有
2. **独立したビルド** - 各パッケージが独立してビルド可能
3. **開発効率** - `pnpm dev`で全体を起動
4. **デプロイ柔軟性** - CoreはLambda、WebはVercelなど別々にデプロイ可能

## デプロイ戦略

### Vercel (UIのみ)
```json
{
  "buildCommand": "cd ../.. && pnpm --filter @wit/web build",
  "outputDirectory": "packages/web/.next",
  "installCommand": "pnpm install --frozen-lockfile"
}
```

### Docker (フルスタック)
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN corepack enable && pnpm install
RUN pnpm build
EXPOSE 3000
CMD ["pnpm", "--filter", "@wit/web", "start"]
```