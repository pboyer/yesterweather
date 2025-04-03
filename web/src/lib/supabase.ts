import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  if (typeof window !== "undefined") {
    // Only show this error in the browser, not during build
    console.error(
      "Supabase URL or anonymous key is missing. Check your environment variables."
    );
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
