
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
const envFile = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) env[key.trim()] = value.trim();
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Load regions mapping
const regions = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src', 'data', 'regions.json'), 'utf8'));

function generateSpaceId(city, gu, dong, serial) {
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
      if (dongEntry) d = dongEntry[0];
    }
  }
  return `${c}${g}${d}${String(serial).padStart(4, '0')}`;
}

async function backfill() {
  console.log('Starting ID backfill...');
  
  const { data: vacancies, error } = await supabase
    .from('vacancies')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching vacancies:', error);
    return;
  }

  console.log(`Found ${vacancies.length} vacancies.`);

  const neighborhoodCounts = {};

  for (const v of vacancies) {
    const addrParts = (v.address || "").split(' ');
    const city = addrParts[0] || "서울";
    const gu = addrParts[1] || "서대문구";
    const dong = v.neighborhood || "";
    
    const key = `${city}-${gu}-${dong}`;
    neighborhoodCounts[key] = (neighborhoodCounts[key] || 0) + 1;
    
    const newId = generateSpaceId(city, gu, dong, neighborhoodCounts[key]);
    
    console.log(`Updating [${v.landmark || v.id}] -> ${newId}`);
    
    const { error: updateError } = await supabase
      .from('vacancies')
      .update({ display_id: newId })
      .eq('id', v.id);
      
    if (updateError) {
      console.error(`Failed to update ${v.id}:`, updateError);
    }
  }

  console.log('Backfill completed.');
}

backfill();
