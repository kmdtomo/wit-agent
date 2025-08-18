# WIT Agent - 実装完了までのロードマップ

## 現在の状態
- ✅ バックエンド（Mastra + Claude）完成
- ✅ Kintone連携完了
- ✅ 画像処理機能実装済み
- ❌ UI未実装
- ❌ 本番環境未構築

## Phase 1: UI実装（優先度: 高）

### 1.1 Next.jsアプリケーション作成
```bash
npx create-next-app@latest wit-agent-ui --typescript --tailwind --app
```

### 1.2 必要な画面
- **入力画面** (`/analyze`)
  - レコードID入力フォーム
  - 審査開始ボタン
  
- **進捗画面** (`/analyze/[id]/progress`)
  - リアルタイム進捗バー
  - 各ステップの状態表示
  
- **結果画面** (`/analyze/[id]/result`)
  - 総合スコア（円グラフ）
  - カテゴリ別評価（レーダーチャート）
  - リスクフラグ一覧
  - 推奨アクション
  - PDFダウンロードボタン

## Phase 2: API統合（優先度: 高）

### 2.1 APIルート作成
```typescript
// app/api/analyze/route.ts
export async function POST(request: Request) {
  const { recordId } = await request.json();
  const result = await analyzeFactoringApplication(recordId);
  return Response.json(result);
}
```

### 2.2 WebSocket/SSE実装
- 審査進捗のリアルタイム配信
- Server-Sent Eventsで実装

## Phase 3: エゴサーチ機能（優先度: 中）

### 3.1 Web検索実装
```typescript
// Google Custom Search API
- APIキー取得
- 検索エンジンID設定
- 「氏名 詐欺」「氏名 逮捕」検索

// Puppeteerでスクレイピング
- https://yamagatamasakage.com/givemebackmoney/
- https://eradicationofblackmoneyscammers.com/
```

### 3.2 検索結果のAI分析
- Claudeで検索結果を評価
- リスクスコアに反映

## Phase 4: 本番環境構築（優先度: 中）

### 4.1 Docker化
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN pnpm install
RUN pnpm build
CMD ["pnpm", "start"]
```

### 4.2 デプロイ選択肢
- **Vercel** (UIのみ)
- **AWS ECS** (フルスタック)
- **Google Cloud Run** (サーバーレス)

### 4.3 監視・ログ
- Sentry (エラー監視)
- CloudWatch/Datadog (ログ)
- Prometheus (メトリクス)

## Phase 5: セキュリティ強化（優先度: 高）

### 5.1 認証・認可
- NextAuth.js実装
- ロールベースアクセス制御
- 監査ログ

### 5.2 データ保護
- APIレート制限
- 入力値検証
- SQLインジェクション対策
- XSS対策

## Phase 6: テスト・品質保証（優先度: 中）

### 6.1 単体テスト
```bash
pnpm add -D jest @testing-library/react
```

### 6.2 E2Eテスト
```bash
pnpm add -D playwright
```

### 6.3 負荷テスト
- k6 or Artillery使用
- 同時100件の審査に対応

## 実装スケジュール案

| 週 | タスク | 完了基準 |
|----|-------|---------|
| Week 1 | UI実装 + API統合 | レコードIDから審査結果表示まで動作 |
| Week 2 | エゴサーチ機能 + セキュリティ | Web検索と詐欺DB連携完了 |
| Week 3 | 本番環境構築 + テスト | AWS/GCPにデプロイ完了 |
| Week 4 | 改善・最適化 | パフォーマンス調整、バグ修正 |

## 必要なリソース

### 開発環境
- Node.js 20+
- pnpm
- Docker Desktop
- VSCode

### APIキー
- ✅ Anthropic API (Claude)
- ✅ Kintone API
- ❌ Google Custom Search API
- ❌ Vercel/AWS/GCP アカウント

### 推定コスト（月間）
- Claude API: $50-100
- Google Search API: $50
- ホスティング: $20-50
- 合計: $120-200/月

## 次のアクション

1. **即座に実行**
   ```bash
   # UI作成
   npx create-next-app@latest wit-agent-ui --typescript --tailwind --app
   ```

2. **今週中に完了**
   - 基本的なUI画面の実装
   - APIエンドポイントの作成
   - ローカル環境での動作確認

3. **来週以降**
   - エゴサーチ機能の追加
   - 本番環境へのデプロイ
   - セキュリティ強化

## プランBへの移行準備

現在のプランA（包括審査）が完成したら、プランB（段階的評価）への移行も容易：

1. エージェントを分割（既存ツールを再利用）
2. UIに段階表示を追加
3. ワークフローを変更

---

**質問**: どの部分から始めますか？
1. UI実装を開始
2. エゴサーチ機能を先に実装
3. 本番環境の準備を優先