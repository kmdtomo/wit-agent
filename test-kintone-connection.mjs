import https from 'https';

// 環境変数から設定を読み込み
const KINTONE_DOMAIN = 'witservice.cybozu.com';
const KINTONE_APP_ID = '37';
const KINTONE_API_TOKEN = 'Na12yYPO7tmEmB4WD68dS9L9ms2r5f0GoddklNK2';

// 1. アプリのフィールド情報を取得（読み取り専用）
async function getAppFields() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: KINTONE_DOMAIN,
      path: `/k/v1/app/form/fields.json?app=${KINTONE_APP_ID}`,
      method: 'GET',
      headers: {
        'X-Cybozu-API-Token': KINTONE_API_TOKEN
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      console.log(`  HTTPステータス: ${res.statusCode}`);
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.message) {
            console.log(`  エラーメッセージ: ${parsed.message}`);
          }
          resolve(parsed);
        } catch (e) {
          console.log(`  レスポンス: ${data}`);
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// 2. レコードを取得（読み取り専用、最大5件）
async function getRecords() {
  return new Promise((resolve, reject) => {
    const query = encodeURIComponent('limit 5');
    const options = {
      hostname: KINTONE_DOMAIN,
      path: `/k/v1/records.json?app=${KINTONE_APP_ID}&query=${query}`,
      method: 'GET',
      headers: {
        'X-Cybozu-API-Token': KINTONE_API_TOKEN
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      console.log(`  HTTPステータス: ${res.statusCode}`);
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.message) {
            console.log(`  エラーメッセージ: ${parsed.message}`);
          }
          resolve(parsed);
        } catch (e) {
          console.log(`  レスポンス: ${data}`);
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// メイン実行
async function main() {
  console.log('=== Kintone接続テスト（読み取り専用） ===\n');
  console.log('ドメイン:', KINTONE_DOMAIN);
  console.log('アプリID:', KINTONE_APP_ID);
  console.log('\n');

  try {
    // フィールド情報の取得
    console.log('1. アプリのフィールド情報を取得中...');
    const fields = await getAppFields();
    
    if (fields.properties) {
      console.log('\n✅ フィールド情報の取得成功！');
      console.log('\nフィールド一覧:');
      console.log('----------------------------------------');
      
      Object.entries(fields.properties).forEach(([key, field]) => {
        console.log(`- ${field.label || key}`);
        console.log(`  フィールドコード: ${key}`);
        console.log(`  タイプ: ${field.type}`);
        if (field.options) {
          console.log(`  選択肢: ${Object.keys(field.options).join(', ')}`);
        }
        console.log('');
      });
    }

    // レコードの取得
    console.log('\n2. レコードデータを取得中（最大5件）...');
    const records = await getRecords();
    
    if (records.records) {
      console.log(`\n✅ レコード取得成功！ (${records.records.length}件取得)`);
      
      if (records.records.length > 0) {
        console.log('\n最初のレコードのサンプル:');
        console.log('----------------------------------------');
        const firstRecord = records.records[0];
        
        Object.entries(firstRecord).forEach(([key, value]) => {
          if (key !== '$id' && key !== '$revision') {
            console.log(`${key}: ${JSON.stringify(value.value).substring(0, 100)}`);
          }
        });
        
        console.log('\n取得したレコードID一覧:');
        records.records.forEach((record, index) => {
          console.log(`  ${index + 1}. レコードID: ${record.$id.value || record.レコード番号?.value || 'N/A'}`);
        });
      }
    }

    console.log('\n=== テスト完了 ===');
    console.log('⚠️  読み取り専用のテストです。データの削除や更新は行っていません。');

  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error.message);
    if (error.message && error.message.includes('ENOTFOUND')) {
      console.error('ドメインが見つかりません。設定を確認してください。');
    } else if (error.message && error.message.includes('520')) {
      console.error('認証エラーの可能性があります。APIトークンを確認してください。');
    }
  }
}

main();