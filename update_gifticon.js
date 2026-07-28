const fs = require('fs');
let content = fs.readFileSync('src/lib/gifticon.ts', 'utf8');

content = content.replace(
  /export interface GifticonRequest {([\s\S]*?)created_at: string;\n}/,
  `export interface GifticonRequest {$1phone_number?: string;\n  created_at: string;\n}`
);

content = content.replace(
  /export async function purchaseGifticon\(userId: string, itemId: string, itemName: string, price: number\)/,
  'export async function purchaseGifticon(userId: string, itemId: string, itemName: string, price: number, phoneNumber: string)'
);

// We'll just replace the whole insert block since we don't know the exact Korean characters due to encoding
content = content.replace(
  /.from\('gifticon_requests'\)\s*.insert\(\[\{\s*user_id: userId,\s*item_id: itemId,\s*item_name: itemName,\s*price: price,\s*status: 'completed'[\s\S]*?\}\]\);/,
  `.from('gifticon_requests')
      .insert([{
        user_id: userId,
        item_id: itemId,
        item_name: itemName,
        price: price,
        status: 'completed',
        phone_number: phoneNumber
      }]);`
);

fs.writeFileSync('src/lib/gifticon.ts', content);
console.log('Modified src/lib/gifticon.ts');
