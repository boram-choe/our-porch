import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://pgqpttycdzbeidyfsniq.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_cqIWlwKAk46diZeW-PnJxg_Jy4en7yd";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
