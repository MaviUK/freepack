import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  'https://ruauvpvzmsfinbkvxjrn.supabase.co'

const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_o5NOu10ES9yjH6Ub4-zqWQ_jIaYciYl'

export const supabase = createClient<Database>(
  supabaseUrl,
  supabasePublishableKey,
)
