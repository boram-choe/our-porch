const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually parse .env.local
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
    if (key === 'NEXT_PUBLIC_SUPABASE_URL') {
      supabaseUrl = val;
    } else if (key === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') {
      supabaseAnonKey = val;
    }
  });
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase environment variables missing in .env.local!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  const { data, error } = await supabase
    .from('vacancies')
    .select('id, landmark, address, lat, lng, neighborhood, display_id')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching vacancies:", error);
    return;
  }

  console.log("=== ALL VACANCIES IN DATABASE ===");
  data.forEach(v => {
    console.log(`[${v.display_id || 'NO_ID'}] Landmark: ${v.landmark}`);
    console.log(`  Address: ${v.address}`);
    console.log(`  Neighborhood: ${v.neighborhood}`);
    console.log(`  Coords: lat=${v.lat}, lng=${v.lng}`);
    console.log("-----------------------------------------");
  });
}

main();
