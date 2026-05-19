// scratch/check_team_members.js
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pgqpttycdzbeidyfsniq.supabase.co';
const supabaseKey = 'sb_publishable_cqIWlwKAk46diZeW-PnJxg_Jy4en7yd';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('team_members').select('*');
  if (error) console.error(error);
  console.table(data);
}
check();
