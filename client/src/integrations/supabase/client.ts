import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://vvygrjjtvvlhahcbgcia.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2eWdyamp0dnZsaGFoY2JnY2lhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5Nzk2NjksImV4cCI6MjA4NzU1NTY2OX0.2aXvM1q4_jqN1mHshoISFm9wGtP2p09CdLEJ9E55eXk";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
