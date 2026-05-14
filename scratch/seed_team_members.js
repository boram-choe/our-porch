// scratch/seed_team_members.js
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pgqpttycdzbeidyfsniq.supabase.co';
const supabaseKey = 'sb_publishable_cqIWlwKAk46diZeW-PnJxg_Jy4en7yd';
const supabase = createClient(supabaseUrl, supabaseKey);

const teamMembers = [
  { id: "ceo", password: "ceo!", real_name: "최보람", role: "CEO", city: "서울시", gu: "서대문구", dong: "본사", phone: "010-1234-5678", hire_date: "2024-01-01", base_salary: 1000 },
  { id: "ops01", password: "ops!", real_name: "김팀장", role: "OPS", city: "서울시", gu: "서대문구", dong: "운영본부", phone: "010-9876-5432", hire_date: "2024-02-01", base_salary: 800 },
  { id: "11010101", password: "s01!", real_name: "박주민", role: "SURVEYOR", city: "서울시", gu: "서대문구", dong: "남가좌동", phone: "010-1111-0001", hire_date: "2024-03-01", base_salary: 200 }
];

async function seed() {
  console.log("Seeding team members...");
  try {
    // Try to delete existing ones first
    await supabase.from('team_members').delete().in('id', teamMembers.map(m => m.id));

    const { data, error } = await supabase.from('team_members').insert(teamMembers).select();
    
    if (error) {
      console.error("Error seeding team members:", error.message);
      console.log("TIP: Make sure you ran the SQL in team_schema.sql first!");
    } else {
      console.log("Successfully seeded team members:", data.length);
    }
  } catch (err) {
    console.error("Critical error:", err.message);
  }
}

seed();
