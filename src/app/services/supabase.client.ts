import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environtment';

const url = environment.supabaseUrl;
const key = (environment as any).anonKey ?? environment.serviceRoleKey;

export const supabase: SupabaseClient = createClient(url, key);
