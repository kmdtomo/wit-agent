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

// メイン実行
async function main() {
  console.log('=== レコード9559のデータ取得 ===\n');

  try {
    const result = await getRecordById(9559);
    
    if (result.record) {
      console.log('✅ データ取得成功！\n');
      
      // 全データをJSONファイルとして保存
      fs.writeFileSync(
        '.docs/record-9559-raw.json', 
        JSON.stringify(result.record, null, 2)
      );
      
      // MDファイル作成用のデータ整形
      const record = result.record;
      
      // MDファイルの内容を作成
      let mdContent = `# レコード番号9559 詳細データ

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
| 生年月日 | ${record.生年月日?.value || '-'} |
| 年齢 | ${record.年齢?.value || '-'} |

## 2. 契約情報

| 項目 | 値 |
|------|-----|
| 契約番号 | ${record.契約番号?.value || '-'} |
| 契約種別 | ${record.契約種別?.value || '-'} |
| 基本契約日 | ${record.基本契約日?.value || '-'} |
| 契約回数 | ${record.回数?.value || '-'} |
| 買取日 | ${record.買取日?.value || '-'} |
| 買取予定日 | ${record.買取予定日?.value || '-'} |
| 入金日 | ${record.入金日?.value || '-'} |
| ステータス | ${record.ステータス?.value || '-'} |
| 結果 | ${record.結果?.value || '-'} |

## 3. 財務・取引情報

| 項目 | 値 |
|------|-----|
| 売上 | ${record.売上?.value || '-'} |
| 年商 | ${record.年商?.value || '-'} |
| 純資産 | ${record.純資産?.value || '-'} |
| 設立年 | ${record.設立年?.value || '-'} |
| 従業員数 | ${record.従業員数?.value || '-'} |
| 業種 | ${record.業種?.value || '-'} |
| 業種詳細 | ${record.業種詳細?.value || '-'} |
| 買取債権額（合計） | ${record.買取債権額_合計?.value || '-'} |
| 買取額（合計） | ${record.買取額_合計?.value || '-'} |
| お振込み金額 | ${record.お振込み金額?.value || '-'} |

## 4. リスク・審査情報

| 項目 | 値 |
|------|-----|
| ファクタリング利用 | ${record.ファクタリング利用?.value || '-'} |
| 資金使途 | ${record.資金使途?.value?.join('、') || '-'} |
| 納付状況（税金） | ${record.納付状況＿税金?.value?.join('、') || '-'} |
| 税金滞納額 | ${record.税金滞納額_0?.value || '-'} |
| 納付状況（保険料） | ${record.納付状況＿税金_0?.value?.join('、') || '-'} |
| 保険料滞納額 | ${record.保険料滞納額?.value || '-'} |
| NG理由 | ${record.NG理由?.value?.join('、') || '-'} |

## 5. 所感・メモ

### 所感／条件（担当者）
\`\`\`
${record.所感_条件_担当者?.value || '（記載なし）'}
\`\`\`

### 備考（決裁者）
\`\`\`
${record.所感_条件_決裁者?.value || '（記載なし）'}
\`\`\`

## 6. サブテーブル情報

### 6.1 買取情報
`;

      // 買取情報サブテーブル
      if (record.買取情報?.value && record.買取情報.value.length > 0) {
        mdContent += `
| No. | 会社名（第三債務者） | 買取債権額 | 買取額 | 状態 | 備考 |
|-----|-------------------|-----------|--------|------|------|
`;
        record.買取情報.value.forEach((item, index) => {
          const v = item.value;
          mdContent += `| ${index + 1} | ${v.会社名_第三債務者_買取?.value || '-'} | ${v.買取債権額?.value || '-'} | ${v.買取額?.value || '-'} | ${v.状態_0?.value || '-'} | ${v.備考?.value || '-'} |\n`;
        });
      } else {
        mdContent += '\n（データなし）\n';
      }

      // 担保情報サブテーブル
      mdContent += '\n### 6.2 担保情報\n';
      if (record.担保情報?.value && record.担保情報.value.length > 0) {
        mdContent += `
| No. | 会社名（第三債務者） | 請求額 | 入金予定日 | 過去の入金（先月） | 過去の入金（今月） |
|-----|-------------------|--------|-----------|------------------|------------------|
`;
        record.担保情報.value.forEach((item, index) => {
          const v = item.value;
          mdContent += `| ${index + 1} | ${v.会社名_第三債務者_担保?.value || '-'} | ${v.請求額?.value || '-'} | ${v.入金予定日?.value || '-'} | ${v.過去の入金_先月?.value || '-'} | ${v.過去の入金_今月?.value || '-'} |\n`;
        });
      } else {
        mdContent += '\n（データなし）\n';
      }

      // 回収情報サブテーブル
      mdContent += '\n### 6.3 回収情報\n';
      if (record.回収情報?.value && record.回収情報.value.length > 0) {
        mdContent += `
| No. | 回収予定日 | 回収金額 | 月 | 日 |
|-----|-----------|---------|----|----|
`;
        record.回収情報.value.forEach((item, index) => {
          const v = item.value;
          mdContent += `| ${index + 1} | ${v.回収予定日?.value || '-'} | ${v.回収金額?.value || '-'} | ${v.月?.value || '-'} | ${v.日?.value || '-'} |\n`;
        });
      } else {
        mdContent += '\n（データなし）\n';
      }

      // 謄本情報サブテーブル
      mdContent += '\n### 6.4 謄本情報（第三債務者）\n';
      if (record.謄本情報_営業?.value && record.謄本情報_営業.value.length > 0) {
        mdContent += `
| No. | 会社名 | 資本金 | 設立年 | 電話番号 | 債権の種類 | 最終登記取得日 |
|-----|--------|--------|--------|----------|-----------|---------------|
`;
        record.謄本情報_営業.value.forEach((item, index) => {
          const v = item.value;
          mdContent += `| ${index + 1} | ${v.会社名_第三債務者_0?.value || '-'} | ${v.資本金の額?.value || '-'} | ${v.会社成立?.value || ''}${v.年?.value || '-'} | ${v.謄本情報_電話番号_ハイフンなし?.value || '-'} | ${v.債権の種類?.value?.join('・') || '-'} | ${v.最終登記取得日?.value || '-'} |\n`;
        });
      } else {
        mdContent += '\n（データなし）\n';
      }

      // 添付ファイル情報
      mdContent += `
## 7. 添付ファイル

| ファイル種別 | ファイル数 |
|------------|-----------|
| 成因証書 | ${record.成因証書＿添付ファイル?.value?.length || 0} |
| メイン通帳 | ${record.メイン通帳＿添付ファイル?.value?.length || 0} |
| その他通帳 | ${record.その他通帳＿添付ファイル?.value?.length || 0} |
| 顧客情報 | ${record.顧客情報＿添付ファイル?.value?.length || 0} |
| 担保情報 | ${record.担保情報＿添付ファイル?.value?.length || 0} |
| 他社資料 | ${record.他社資料＿添付ファイル?.value?.length || 0} |
| その他 | ${record.その他＿添付ファイル?.value?.length || 0} |
| クラウド契約書類 | ${record.クラウド契約書類?.value?.length || 0} |
| 稟議書 | ${record.稟議書?.value?.length || 0} |

## 8. 審査チェック項目

### 確認項目
`;

      // 確認項目の追加
      for (let i = 1; i <= 19; i++) {
        const fieldName = `確認項目${i}`;
        if (record[fieldName]?.value) {
          mdContent += `- **確認項目${i}**: ${record[fieldName].value}\n`;
        }
      }

      mdContent += `
## 9. システム情報

| 項目 | 値 |
|------|-----|
| 作成日時 | ${record.作成日時?.value || '-'} |
| 作成者 | ${record.作成者?.value?.name || '-'} |
| 更新日時 | ${record.更新日時?.value || '-'} |
| 更新者 | ${record.更新者?.value?.name || '-'} |
| 担当 | ${record.担当?.value?.map(u => u.name).join('、') || '-'} |
| 作業者 | ${record.作業者?.value?.map(u => u.name).join('、') || '-'} |

---

**注意**: このデータは読み取り専用で取得したものです。データの更新や削除は行っていません。
`;

      // MDファイルを保存
      fs.writeFileSync('.docs/record-9559-detail.md', mdContent);
      
      console.log('📁 以下のファイルを作成しました:');
      console.log('  - .docs/record-9559-detail.md (詳細レポート)');
      console.log('  - .docs/record-9559-raw.json (生データ)');
      
    } else {
      console.error('❌ レコードが見つかりませんでした');
    }

  } catch (error) {
    console.error('❌ エラーが発生しました:', error.message);
  }
}

main();