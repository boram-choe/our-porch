const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pgqpttycdzbeidyfsniq.supabase.co';
const supabaseAnonKey = 'sb_publishable_cqIWlwKAk46diZeW-PnJxg_Jy4en7yd';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const regions = require('../src/data/regions.json');

function generateSpaceId(city, gu, dong, serial) {
  let cityCode = "99";
  for (const [code, data] of Object.entries(regions)) {
    if (data.name.includes(city)) {
      cityCode = code;
      let guCode = "99";
      for (const [gCode, gData] of Object.entries(data.gus)) {
        if (gData.name.includes(gu)) {
          guCode = gCode;
          let dongCode = "99";
          
          // 동 이름 정규화 (숫자 제거 등)
          const normDong = dong.replace(/[0-9]/g, '');
          
          for (const [dCode, dName] of Object.entries(gData.dongs)) {
            const normDName = dName.replace(/[0-9]/g, '');
            if (normDName === normDong || dName.includes(normDong) || normDong.includes(normDName)) {
              dongCode = dCode;
              break;
            }
          }
          return `${cityCode}${guCode}${dongCode}${String(serial).padStart(4, '0')}`;
        }
      }
      return `${cityCode}9999${String(serial).padStart(4, '0')}`;
    }
  }
  return `999999${String(serial).padStart(4, '0')}`;
}

async function fixDisplayIds() {
  console.log("Fetching all vacancies...");
  const { data: vacancies, error } = await supabase.from('vacancies').select('*').order('created_at', { ascending: true });
  
  if (error) {
    console.error(error);
    return;
  }

  const neighborhoodSerial = {}; 

  for (const v of vacancies) {
    const neighborhood = v.neighborhood || "Unknown";
    const addrParts = (v.address || "").split(' ');
    const city = addrParts[0] || "서울";
    const gu = addrParts[1] || "서대문구";
    
    // 겹치지 않게 하기 위해 city+gu+dong 조합으로 시리얼 관리
    const key = `${city}-${gu}-${neighborhood}`;
    if (!neighborhoodSerial[key]) {
      neighborhoodSerial[key] = 1;
    }

    const newId = generateSpaceId(city, gu, neighborhood, neighborhoodSerial[key]);
    neighborhoodSerial[key]++;

    console.log(`Updating ${v.landmark} (${v.id}): ${v.display_id} -> ${newId}`);
    await supabase.from('vacancies').update({ display_id: newId }).eq('id', v.id);
  }
  console.log("Fix complete!");
}

fixDisplayIds();
