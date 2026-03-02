import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mhdqwomfwsvfljwcesbs.supabase.co'
const supabaseAnonKey = 'sb_publishable_o9bq9KRWtZlN9XmknGVsBA_feAoPi0j'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)