const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pgqpttycdzbeidyfsniq.supabase.co';
const supabaseAnonKey = 'sb_publishable_cqIWlwKAk46diZeW-PnJxg_Jy4en7yd';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkMerge() {
  const { data: v1 } = await supabase.from('vacancies').select('*').eq('display_id', '1113990001').single();
  const { data: v3 } = await supabase.from('vacancies').select('*').eq('display_id', '1113990003').single();
  
  console.log("Vacancy 0001:", v1 ? { id: v1.id, status: v1.status, merged_into_id: v1.merged_into_id } : "Not found");
  console.log("Vacancy 0003:", v3 ? { id: v3.id, status: v3.status } : "Not found");
  
  if (v1 && v1.id) {
    const { count: votes1 } = await supabase.from('votes').select('*', { count: 'exact', head: true }).eq('vacancy_id', v1.id);
    const { count: comments1 } = await supabase.from('comments').select('*', { count: 'exact', head: true }).eq('vacancy_id', v1.id);
    console.log(`Vacancy 0001 has ${votes1} votes and ${comments1} comments.`);
  }

  if (v3 && v3.id) {
    const { count: votes3 } = await supabase.from('votes').select('*', { count: 'exact', head: true }).eq('vacancy_id', v3.id);
    const { count: comments3 } = await supabase.from('comments').select('*', { count: 'exact', head: true }).eq('vacancy_id', v3.id);
    console.log(`Vacancy 0003 has ${votes3} votes and ${comments3} comments.`);
  }
}

checkMerge();
