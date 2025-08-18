import https from 'https';

// 環境変数から設定を読み込み
const KINTONE_DOMAIN = 'witservice.cybozu.com';
const KINTONE_APP_ID = '37';
const KINTONE_API_TOKEN = 'Na12yYPO7tmEmB4WD68dS9L9ms2r5f0GoddklNK2';

// 特定のレコードを取得（レコード番号指定）
async function getRecordById(recordId) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: KINTONE_DOMAIN,
      path: `/k/v1/record.json?app=${KINTONE_APP_ID}&id=${recordId}`,
      method: 'GET',
      headers: {
        'X-Cybozu-API-Token': KINTONE_API_TOKEN
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// 顧客番号で検索
async function getRecordByCustomerNumber(customerNumber) {
  return new Promise((resolve, reject) => {
    const query = encodeURIComponent(`顧客番号 = "${customerNumber}"`);
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
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// AI審査用データを整形
function extractAIData(record) {
  return {
    // 基本情報
    基本情報: {
      レコード番号: record.レコード番号?.value,
      顧客番号: record.顧客番号?.value,
      会社名: record.屋号?.value,
      代表者名: record.代表者名?.value,
      種別: record.種別?.value,
      住所: record.住所?.value,
      電話番号: record.電話番号_ハイフンなし?.value,
      生年月日: record.生年月日?.value,
      年齢: record.年齢?.value
    },
    
    // 契約情報
    契約情報: {
      契約番号: record.契約番号?.value,
      契約種別: record.契約種別?.value,
      基本契約日: record.基本契約日?.value,
      契約回数: record.回数?.value,
      買取日: record.買取日?.value,
      買取予定日: record.買取予定日?.value
    },
    
    // 買取情報（サブテーブル）
    買取情報: record.買取情報?.value || [],
    
    // 担保情報（サブテーブル）
    担保情報: record.担保情報?.value || [],
    
    // 回収情報（サブテーブル）
    回収情報: record.回収情報?.value || [],
    
    // 謄本情報（サブテーブル）
    謄本情報: record.謄本情報_営業?.value || [],
    
    // 審査関連
    審査情報: {
      ステータス: record.ステータス?.value,
      結果: record.結果?.value,
      資金使途: record.資金使途?.value,
      ファクタリング利用: record.ファクタリング利用?.value,
      所感_担当者: record.所感_条件_担当者?.value,
      所感_決裁者: record.所感_条件_決裁者?.value
    },
    
    // 財務情報
    財務情報: {
      売上: record.売上?.value,
      年商: record.年商?.value,
      純資産: record.純資産?.value,
      設立年: record.設立年?.value,
      買取債権額合計: record.買取債権額_合計?.value,
      買取額合計: record.買取額_合計?.value
    },
    
    // リスク情報
    リスク情報: {
      納付状況_税金: record.納付状況＿税金?.value,
      税金滞納額: record.税金滞納額_0?.value,
      保険料滞納額: record.保険料滞納額?.value,
      NG理由: record.NG理由?.value,
      否決内容: record.否決内容?.value
    },
    
    // 添付ファイル情報（ファイルキーのみ）
    添付ファイル: {
      成因証書: record.成因証書＿添付ファイル?.value?.length || 0,
      メイン通帳: record.メイン通帳＿添付ファイル?.value?.length || 0,
      その他通帳: record.その他通帳＿添付ファイル?.value?.length || 0,
      顧客情報: record.顧客情報＿添付ファイル?.value?.length || 0,
      担保情報: record.担保情報＿添付ファイル?.value?.length || 0,
      他社資料: record.他社資料＿添付ファイル?.value?.length || 0
    }
  };
}

// メイン実行
async function main() {
  console.log('=== Kintone顧客データ取得 ===\n');

  try {
    // 例1: レコード番号で取得
    console.log('1. レコード番号9562のデータを取得中...');
    const recordById = await getRecordById(9562);
    
    if (recordById.record) {
      const aiData = extractAIData(recordById.record);
      console.log('\n✅ レコード取得成功！');
      console.log('\nAI審査用データ:');
      console.log(JSON.stringify(aiData, null, 2));
    }
    
    // 例2: 顧客番号で検索
    console.log('\n\n2. 顧客番号C-00005843で検索中...');
    const recordByCustomer = await getRecordByCustomerNumber('C-00005843');
    
    if (recordByCustomer.records && recordByCustomer.records.length > 0) {
      console.log(`\n✅ ${recordByCustomer.records.length}件のレコードが見つかりました`);
      
      // 最新のレコードを取得
      const latestRecord = recordByCustomer.records[0];
      const aiData = extractAIData(latestRecord);
      
      console.log('\n最新レコードのAI審査用データ（抜粋）:');
      console.log({
        基本情報: aiData.基本情報,
        契約情報: aiData.契約情報,
        財務情報: aiData.財務情報
      });
    }
    
    console.log('\n=== データ取得完了 ===');
    console.log('\n💡 このデータをAIエージェントに渡すことで審査が可能です');

  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error.message);
  }
}

// 個別関数をエクスポート（他のモジュールから使用可能）
export { getRecordById, getRecordByCustomerNumber, extractAIData };

// 直接実行時のみmainを実行
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}