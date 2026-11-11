import dotenv from 'dotenv';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import ws from 'ws';

dotenv.config({ path: '../.env' });
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder-project.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'placeholder-anon-key';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;

export const isSupabaseConfigured =
  Boolean(process.env.SUPABASE_URL) &&
  !supabaseUrl.includes('placeholder-project') &&
  Boolean(process.env.SUPABASE_ANON_KEY);

export const supabaseAnon: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false },
  realtime: { transport: { WebSocket: ws } as any },
});

export const supabaseAdmin: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
  realtime: { transport: { WebSocket: ws } as any },
});

