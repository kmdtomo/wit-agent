# WIT Agent - Compliance Monitoring System

## プロジェクト概要
WIT (Web3 Intelligence Tool) は、暗号資産取引のコンプライアンス監視とリスク評価を自動化するシステムです。

## アーキテクチャ

### 主要コンポーネント
- **Mastra Framework**: エージェントとワークフローの基盤
- **Kintone Integration**: データ管理とレポーティング
- **Compliance Tools**: AML/制裁チェックツール群

### ディレクトリ構造
```
wit-agent/
├── src/
│   ├── mastra/          # Mastraフレームワーク関連
│   │   ├── agents/      # AIエージェント定義
│   │   ├── tools/       # 各種チェックツール
│   │   └── workflows/   # ワークフロー定義
│   └── kintone/         # Kintone連携
├── .docs/               # ドキュメント
└── tests/               # テストコード
```

## 技術スタック
- **言語**: TypeScript
- **フレームワーク**: Mastra
- **AI**: OpenAI GPT-4
- **データベース**: Kintone
- **パッケージマネージャー**: pnpm

## 開発規約

### コーディング標準
- TypeScript strict mode を使用
- 関数型プログラミングを優先
- 非同期処理には async/await を使用
- エラーハンドリングは明示的に実装

### 命名規則
- ファイル名: kebab-case
- クラス名: PascalCase
- 関数名: camelCase
- 定数: UPPER_SNAKE_CASE

### インポート順序
1. Node.js組み込みモジュール
2. 外部パッケージ
3. 内部モジュール（相対パス）

## よく使うコマンド

### 開発環境
```bash
# 依存関係のインストール
pnpm install

# 開発サーバー起動
pnpm dev

# ビルド
pnpm build

# テスト実行
pnpm test

# 型チェック
pnpm typecheck

# リント
pnpm lint

# フォーマット
pnpm format
```

### Git操作
```bash
# ブランチ作成
git checkout -b feature/branch-name

# コミット（Conventional Commits形式）
# feat: 新機能
# fix: バグ修正
# docs: ドキュメント
# refactor: リファクタリング
# test: テスト追加/修正
```

## 環境変数
```env
# .env.local
OPENAI_API_KEY=your-api-key
KINTONE_API_TOKEN=your-token
KINTONE_SUBDOMAIN=your-subdomain
KINTONE_APP_ID=your-app-id
```

## 主要機能

### 1. コンプライアンスチェック
- AML（アンチマネーロンダリング）チェック
- 制裁リストチェック
- 日本特有の詐欺パターン検出
- ユーザー詐欺データベース照合

### 2. レポート生成
- コンプライアンスレポートの自動生成
- リスクスコアリング
- 推奨アクションの提示

### 3. Kintone連携
- チェック結果の自動保存
- レポートの管理
- 監査証跡の記録

## トラブルシューティング

### よくある問題
1. **依存関係エラー**: `pnpm install` を再実行
2. **型エラー**: `pnpm typecheck` で詳細確認
3. **API接続エラー**: 環境変数の設定を確認

## 重要な注意事項

1. **APIキーの管理**: 絶対にコミットしない
2. **テスト実行**: 機能追加時は必ずテストを書く
3. **ドキュメント**: 大きな変更時は必ず更新

## 関連ドキュメント
- [Kintoneデータ構造](.docs/kintone-data-structure.md)
- [Mastraフレームワーク公式ドキュメント](https://mastra.dev)

## チーム規約
- PRレビューは必須
- main ブランチへの直接プッシュは禁止
- コミットメッセージは日本語可