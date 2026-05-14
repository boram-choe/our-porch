
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Manually parse .env.local
const envFile = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8')
const env = {}
envFile.split('\n').forEach(line => {
  const [key, value] = line.split('=')
  if (key && value) env[key.trim()] = value.trim()
})

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase env vars')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkIds() {
  const { data, error } = await supabase
    .from('vacancies')
    .select('id, neighborhood, display_id')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching vacancies:', error)
    return
  }

  console.log(`Total vacancies: ${data.length}`)
  console.log('Sample data (latest 10):')
  console.table(data.slice(0, 10))

  const withoutId = data.filter(v => !v.display_id)
  console.log(`Vacancies without display_id: ${withoutId.length}`)
}

checkIds()
