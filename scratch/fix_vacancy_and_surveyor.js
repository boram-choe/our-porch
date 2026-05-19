// scratch/fix_vacancy_and_surveyor.js
// 이 스크립트는 Node.js로 직접 실행하세요:
// node scratch/fix_vacancy_and_surveyor.js

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../.env.local');
let supabaseUrl = "";
let supabaseAnonKey = "";

if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const parts = trimmed.split('=');
    const key = parts[0].trim();
    const val = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
    if (key === 'NEXT_PUBLIC_SUPABASE_URL') supabaseUrl = val;
    else if (key === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') supabaseAnonKey = val;
  });
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  console.log("=== 1. 공실 1113990004 → neighborhood 수정 ===");
  
  // display_id가 1113990004인 공실의 neighborhood를 남가좌동으로 수정
  const { data: vac, error: vacErr } = await supabase
    .from('vacancies')
    .update({ 
      neighborhood: '남가좌동',
      display_id: '1113110004'  // 남가좌동 = 코드 11 (남가좌1동 기준)
    })
    .eq('display_id', '1113990004')
    .select('id, display_id, neighborhood, landmark');

  if (vacErr) {
    console.error("공실 수정 실패:", vacErr.message);
  } else {
    console.log("공실 수정 성공:", vac);
  }

  console.log("\n=== 2. 박주민 조사원 dong → 남가좌동 ===");
  
  const { data: mem, error: memErr } = await supabase
    .from('team_members')
    .update({ dong: '남가좌동' })
    .eq('real_name', '박주민')
    .select('id, real_name, dong');
  
  if (memErr) {
    console.error("조사원 수정 실패:", memErr.message);
  } else {
    console.log("조사원 수정 성공:", mem);
  }

  console.log("\n=== 완료 ===");
}

main();
