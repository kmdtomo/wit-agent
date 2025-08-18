import https from 'https';
import fs from 'fs';

// 環境変数から設定を読み込み
const KINTONE_DOMAIN = 'witservice.cybozu.com';
const KINTONE_APP_ID = '37';
const KINTONE_API_TOKEN = 'Na12yYPO7tmEmB4WD68dS9L9ms2r5f0GoddklNK2';

// 特定のレコードを取得
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

// サブテーブルのフル情報を整形
function formatSubtableData(subtableData) {
  if (!subtableData || !subtableData.value || subtableData.value.length === 0) {
    return [];
  }
  
  return subtableData.value.map(row => {
    const formattedRow = {};
    Object.keys(row.value).forEach(key => {
      formattedRow[key] = row.value[key].value;
    });
    return formattedRow;
  });
}

// 添付ファイル情報を整形
function formatFileData(fileField) {
  if (!fileField || !fileField.value || fileField.value.length === 0) {
    return [];
  }
  
  return fileField.value.map(file => ({
    fileKey: file.fileKey,
    name: file.name,
    contentType: file.contentType,
    size: file.size,
    // ダウンロードURL（APIトークンが必要）
    downloadUrl: `https://${KINTONE_DOMAIN}/k/v1/file.json?fileKey=${file.fileKey}`
  }));
}

// メイン実行
async function main() {
  console.log('=== レコード9559の完全データ取得 ===\n');

  try {
    const result = await getRecordById(9559);
    
    if (result.record) {
      console.log('✅ データ取得成功！\n');
      
      const record = result.record;
      
      // 全生データをJSONファイルとして保存
      fs.writeFileSync(
        '.docs/record-9559-complete-raw.json', 
        JSON.stringify(result.record, null, 2)
      );
      
      // サブテーブルデータの完全取得
      const buyingInfo = formatSubtableData(record.買取情報);
      const collateralInfo = formatSubtableData(record.担保情報);
      const collectionInfo = formatSubtableData(record.回収情報);
      const registryInfo = formatSubtableData(record.謄本情報_営業);
      
      // 添付ファイル情報の取得
      const attachedFiles = {
        成因証書: formatFileData(record.成因証書＿添付ファイル),
        メイン通帳: formatFileData(record.メイン通帳＿添付ファイル),
        その他通帳: formatFileData(record.その他通帳＿添付ファイル),
        顧客情報: formatFileData(record.顧客情報＿添付ファイル),
        担保情報: formatFileData(record.担保情報＿添付ファイル),
        他社資料: formatFileData(record.他社資料＿添付ファイル),
        その他: formatFileData(record.その他＿添付ファイル),
        クラウド契約書類: formatFileData(record.クラウド契約書類),
        稟議書: formatFileData(record.稟議書),
        印刷用: formatFileData(record.印刷用)
      };
      
      // 完全な構造化データを作成
      const completeData = {
        基本情報: {
          レコード番号: record.レコード番号?.value,
          顧客番号: record.顧客番号?.value,
          会社名: record.屋号?.value,
          代表者名: record.代表者名?.value,
          種別: record.種別?.value,
          法人番号: record.法人番号?.value,
          住所: record.住所?.value,
          電話番号: record.電話番号_ハイフンなし?.value,
          携帯番号: record.携帯番号_ハイフンなし?.value,
          メールアドレス: record.メールアドレス?.value,
          生年月日: record.生年月日?.value,
          年齢: record.年齢?.value
        },
        
        買取情報_完全版: buyingInfo,
        担保情報_完全版: collateralInfo,
        回収情報_完全版: collectionInfo,
        謄本情報_完全版: registryInfo,
        
        添付ファイル情報: attachedFiles,
        
        審査メモ: {
          所感_担当者: record.所感_条件_担当者?.value,
          所感_決裁者: record.所感_条件_決裁者?.value,
          留意事項_営業: record.留意事項_営業?.value,
          留意事項_審査: record.留意事項_審査?.value,
          その他_留意事項_営業: record.その他_留意事項_営業?.value,
          その他_留意事項_審査: record.その他_留意事項_審査?.value
        }
      };
      
      // 構造化データをJSONとして保存
      fs.writeFileSync(
        '.docs/record-9559-structured.json',
        JSON.stringify(completeData, null, 2)
      );
      
      // MDファイルの作成
      let mdContent = `# レコード番号9559 完全データ

**取得日時**: ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}  
**アプリID**: 37  
**ドメイン**: witservice.cybozu.com

## 1. 基本情報

| 項目 | 値 |
|------|-----|
| レコード番号 | ${record.レコード番号?.value || '-'} |
| 顧客番号 | ${record.顧客番号?.value || '-'} |
| 会社・屋号名 | ${record.屋号?.value || '-'} |
| 代表者名 | ${record.代表者名?.value || '-'} |
| 種別 | ${record.種別?.value || '-'} |
| 法人番号 | ${record.法人番号?.value || '-'} |
| 住所 | ${record.住所?.value || '-'} |
| 電話番号 | ${record.電話番号_ハイフンなし?.value || '-'} |
| 携帯番号 | ${record.携帯番号_ハイフンなし?.value || '-'} |
| メールアドレス | ${record.メールアドレス?.value || '-'} |

## 2. 買取情報（完全版）

`;
      if (buyingInfo.length > 0) {
        mdContent += '### 全カラム一覧\n\n';
        buyingInfo.forEach((item, index) => {
          mdContent += `#### 買取情報 ${index + 1}\n\n`;
          mdContent += '| フィールド名 | 値 |\n';
          mdContent += '|------------|-----|\n';
          Object.keys(item).forEach(key => {
            const value = item[key] || '-';
            mdContent += `| ${key} | ${String(value).substring(0, 100)} |\n`;
          });
          mdContent += '\n';
        });
      } else {
        mdContent += '（データなし）\n\n';
      }

      mdContent += `## 3. 担保情報（完全版）

`;
      if (collateralInfo.length > 0) {
        mdContent += '### 全カラム一覧\n\n';
        collateralInfo.forEach((item, index) => {
          mdContent += `#### 担保情報 ${index + 1}\n\n`;
          mdContent += '| フィールド名 | 値 |\n';
          mdContent += '|------------|-----|\n';
          Object.keys(item).forEach(key => {
            const value = item[key] || '-';
            mdContent += `| ${key} | ${String(value).substring(0, 100)} |\n`;
          });
          mdContent += '\n';
        });
      } else {
        mdContent += '（データなし）\n\n';
      }

      mdContent += `## 4. 謄本情報（完全版）

`;
      if (registryInfo.length > 0) {
        mdContent += '### 全カラム一覧\n\n';
        registryInfo.forEach((item, index) => {
          mdContent += `#### 謄本情報 ${index + 1}\n\n`;
          mdContent += '| フィールド名 | 値 |\n';
          mdContent += '|------------|-----|\n';
          Object.keys(item).forEach(key => {
            const value = item[key] || '-';
            mdContent += `| ${key} | ${String(value).substring(0, 100)} |\n`;
          });
          mdContent += '\n';
        });
      } else {
        mdContent += '（データなし）\n\n';
      }

      mdContent += `## 5. 回収情報（完全版）

`;
      if (collectionInfo.length > 0) {
        mdContent += '### 全カラム一覧\n\n';
        collectionInfo.forEach((item, index) => {
          mdContent += `#### 回収情報 ${index + 1}\n\n`;
          mdContent += '| フィールド名 | 値 |\n';
          mdContent += '|------------|-----|\n';
          Object.keys(item).forEach(key => {
            const value = item[key] || '-';
            mdContent += `| ${key} | ${String(value).substring(0, 100)} |\n`;
          });
          mdContent += '\n';
        });
      } else {
        mdContent += '（データなし）\n\n';
      }

      mdContent += `## 6. 添付ファイル詳細

### 6.1 ファイル一覧と詳細情報

`;
      Object.keys(attachedFiles).forEach(category => {
        const files = attachedFiles[category];
        if (files.length > 0) {
          mdContent += `#### ${category} (${files.length}ファイル)\n\n`;
          files.forEach((file, index) => {
            mdContent += `**ファイル${index + 1}:**\n`;
            mdContent += `- ファイル名: ${file.name}\n`;
            mdContent += `- タイプ: ${file.contentType}\n`;
            mdContent += `- サイズ: ${(file.size / 1024).toFixed(2)} KB\n`;
            mdContent += `- ファイルキー: ${file.fileKey}\n`;
            mdContent += `- ダウンロード: APIトークンを使用してダウンロード可能\n\n`;
          });
        }
      });

      mdContent += `### 6.2 ファイル取得方法

添付ファイルは以下のAPIエンドポイントからダウンロード可能です：

\`\`\`javascript
// ファイルダウンロード例
const downloadFile = async (fileKey) => {
  const options = {
    hostname: '${KINTONE_DOMAIN}',
    path: '/k/v1/file.json?fileKey=' + fileKey,
    method: 'GET',
    headers: {
      'X-Cybozu-API-Token': '${KINTONE_API_TOKEN}'
    }
  };
  // HTTPSリクエストを実行してファイルをダウンロード
};
\`\`\`

## 7. 審査関連メモ

### 所感／条件（担当者）
\`\`\`
${record.所感_条件_担当者?.value || '（記載なし）'}
\`\`\`

### 備考（決裁者）
\`\`\`
${record.所感_条件_決裁者?.value || '（記載なし）'}
\`\`\`

### 留意事項（営業）
${record.留意事項_営業?.value?.join('、') || '（なし）'}

### 留意事項（審査）
${record.留意事項_審査?.value?.join('、') || '（なし）'}

---

**注意**: 
1. このデータは読み取り専用で取得したものです
2. 添付ファイルのダウンロードにはAPIトークンが必要です
3. 画像ファイル（通帳等）はOCR処理することで内容を解析可能です
`;

      // MDファイルを保存
      fs.writeFileSync('.docs/record-9559-complete.md', mdContent);
      
      // サブテーブルのカラム一覧を出力
      console.log('📊 サブテーブルのカラム情報:\n');
      
      if (buyingInfo.length > 0) {
        console.log('【買取情報のカラム】');
        console.log(Object.keys(buyingInfo[0]).join(', '));
        console.log(`→ 合計 ${Object.keys(buyingInfo[0]).length} カラム\n`);
      }
      
      if (collateralInfo.length > 0) {
        console.log('【担保情報のカラム】');
        console.log(Object.keys(collateralInfo[0]).join(', '));
        console.log(`→ 合計 ${Object.keys(collateralInfo[0]).length} カラム\n`);
      }
      
      if (registryInfo.length > 0) {
        console.log('【謄本情報のカラム】');
        console.log(Object.keys(registryInfo[0]).join(', '));
        console.log(`→ 合計 ${Object.keys(registryInfo[0]).length} カラム\n`);
      }
      
      // 添付ファイル情報を出力
      console.log('📎 添付ファイル情報:\n');
      Object.keys(attachedFiles).forEach(category => {
        const count = attachedFiles[category].length;
        if (count > 0) {
          console.log(`  ${category}: ${count}ファイル`);
          attachedFiles[category].forEach(file => {
            console.log(`    - ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);
          });
        }
      });
      
      console.log('\n📁 作成したファイル:');
      console.log('  - .docs/record-9559-complete.md (完全版レポート)');
      console.log('  - .docs/record-9559-structured.json (構造化データ)');
      console.log('  - .docs/record-9559-complete-raw.json (生データ)');
      
      console.log('\n💡 添付ファイルはAPIトークンを使用してダウンロード可能です');
      
    } else {
      console.error('❌ レコードが見つかりませんでした');
    }

  } catch (error) {
    console.error('❌ エラーが発生しました:', error.message);
  }
}

main();