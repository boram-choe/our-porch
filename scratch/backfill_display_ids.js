const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// 환경변수 로드 대신 직접 입력 (또는 .env.local 파싱)
const supabaseUrl = 'https://pgqpttycdzbeidyfsniq.supabase.co';
const supabaseAnonKey = 'sb_publishable_cqIWlwKAk46diZeW-PnJxg_Jy4en7yd';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// regions 데이터 로드
const regions = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/data/regions.json'), 'utf8'));

const generateSpaceId = (city, gu, dong, serial) => {
  const cityEntry = Object.entries(regions).find(([_, data]) => 
    data.name.includes(city) || city.includes(data.name)
  );
  const c = cityEntry ? cityEntry[0] : "99";
  let g = "99";
  let d = "99";

  if (cityEntry) {
    const guEntry = Object.entries(cityEntry[1].gus).find(([_, data]) => 
      data.name.includes(gu) || gu.includes(data.name)
    );
    if (guEntry) {
      g = guEntry[0];
      const dongEntry = Object.entries(guEntry[1].dongs).find(([_, name]) => 
        name.includes(dong) || dong.includes(name)
      );
      if (dongEntry) {
        d = dongEntry[0];
      }
    }
  }
  const s = String(serial).padStart(4, '0');
  return `${c}${g}${d}${s}`;
};

async function backfill() {
  console.log("Fetching vacancies...");
  const { data: vacancies, error } = await supabase.from('vacancies').select('*').order('created_at', { ascending: true });
  
  if (error) {
    console.error("Error fetching vacancies:", error);
    return;
  }

  console.log(`Found ${vacancies.length} vacancies.`);
  
  // 동네별 시리얼 넘버 추적
  const neighborhoodCounts = {};

  for (const v of vacancies) {
    if (v.display_id) {
        console.log(`Skipping vacancy ${v.id} (already has display_id: ${v.display_id})`);
        continue;
    }

    // 주소에서 시/구 추출 (형식: "서울 서대문구 남가좌동 385")
    const addrParts = (v.address || "").split(' ');
    const city = addrParts[0] || "서울";
    const gu = addrParts[1] || "서대문구";
    const dong = v.neighborhood || addrParts[2] || "";

    const key = `${city}-${gu}-${dong}`;
    neighborhoodCounts[key] = (neighborhoodCounts[key] || 0) + 1;
    
    const newDisplayId = generateSpaceId(city, gu, dong, neighborhoodCounts[key]);
    
    console.log(`Updating vacancy ${v.id} (${v.landmark}): ${newDisplayId}`);
    
    const { error: updateError } = await supabase
      .from('vacancies')
      .update({ display_id: newDisplayId })
      .eq('id', v.id);
      
    if (updateError) {
      console.error(`Error updating vacancy ${v.id}:`, updateError);
    }
  }
  
  console.log("Backfill complete!");
}

backfill();
