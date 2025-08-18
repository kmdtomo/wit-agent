#!/usr/bin/env node

import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

// .env.localを読み込み
dotenv.config({ path: '.env.local' });

async function testClaudeConnection() {
  console.log('🧪 Claude API接続テスト\n');
  
  // APIキーの確認
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('❌ ANTHROPIC_API_KEYが設定されていません');
    console.log('👉 .env.localファイルに以下を追加してください:');
    console.log('   ANTHROPIC_API_KEY=sk-ant-api03-...');
    process.exit(1);
  }
  
  console.log('✅ APIキーが検出されました:', apiKey.substring(0, 20) + '...');
  
  try {
    // Claude APIクライアント作成
    const anthropic = new Anthropic({
      apiKey: apiKey,
    });
    
    console.log('\n📤 Claudeにテストメッセージを送信中...');
    
    // シンプルなテスト
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 100,
      messages: [{
        role: 'user',
        content: 'ファクタリング審査システムの準備ができているか確認してください。「準備完了」と返答してください。'
      }]
    });
    
    console.log('\n📥 Claudeからの応答:');
    console.log(response.content[0].type === 'text' ? response.content[0].text : '応答なし');
    
    // 使用トークン数
    console.log('\n📊 使用状況:');
    console.log(`  入力トークン: ${response.usage.input_tokens}`);
    console.log(`  出力トークン: ${response.usage.output_tokens}`);
    console.log(`  推定コスト: $${((response.usage.input_tokens * 3 + response.usage.output_tokens * 15) / 1000000).toFixed(6)}`);
    
    console.log('\n✅ Claude API接続成功！');
    
  } catch (error) {
    console.error('\n❌ エラーが発生しました:');
    
    if (error.status === 401) {
      console.error('   認証エラー: APIキーが無効です');
      console.log('   👉 正しいAPIキーを.env.localに設定してください');
    } else if (error.status === 429) {
      console.error('   レート制限: APIの使用制限に達しました');
    } else if (error.status === 400) {
      console.error('   リクエストエラー:', error.message);
    } else {
      console.error('   ', error.message || error);
    }
    
    process.exit(1);
  }
}

// Kintone接続もテスト
async function testKintoneConnection() {
  console.log('\n\n🧪 Kintone API接続テスト\n');
  
  const token = process.env.KINTONE_API_TOKEN;
  const subdomain = process.env.KINTONE_SUBDOMAIN;
  const appId = process.env.KINTONE_APP_ID;
  
  if (!token || !subdomain || !appId) {
    console.error('❌ Kintone環境変数が不足しています');
    return;
  }
  
  console.log('✅ Kintone設定:');
  console.log(`  サブドメイン: ${subdomain}`);
  console.log(`  アプリID: ${appId}`);
  console.log(`  トークン: ${token.substring(0, 10)}...`);
  
  // 実際の接続テストは既存のtest-kintone-connection.mjsを使用
  console.log('\n👉 詳細なテストは test-kintone-connection.mjs を実行してください');
}

// メイン実行
async function main() {
  console.log('=' .repeat(50));
  console.log('   WIT Agent - API接続テスト');
  console.log('=' .repeat(50));
  
  await testClaudeConnection();
  await testKintoneConnection();
  
  console.log('\n' + '=' .repeat(50));
  console.log('✨ すべてのテストが完了しました');
  console.log('=' .repeat(50));
}

main().catch(console.error);