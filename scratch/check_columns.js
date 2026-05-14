
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const envFile = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8')
const env = {}
envFile.split('\n').forEach(line => {
  const [key, value] = line.split('=')
  if (key && value) env[key.trim()] = value.trim()
})

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function getColumns() {
  const { data, error } = await supabase
    .from('vacancies')
    .select('*')
    .limit(1)

  if (error) {
    console.error('Error:', error)
    return
  }

  if (data && data.length > 0) {
    console.log('Columns in vacancies table:', Object.keys(data[0]))
  } else {
    console.log('No data in vacancies table to infer columns.')
  }
}

getColumns()
