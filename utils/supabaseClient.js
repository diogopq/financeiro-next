import { createClient } from "@supabase/supabase-js";

// Estas variáveis serão lidas do ambiente (Vercel ou .env.local)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

