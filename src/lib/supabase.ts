import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://aaylsgpirxtuqmgcpgog.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_yU23VxHcBTyixNMwK-fB_A_vD_D0Ew8';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
