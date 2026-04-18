// Generated types live here. Run `supabase gen types typescript` once the
// CLI is wired up and replace this stub. The shape below covers only what
// the consumer home page reads from `businesses` so the SSR client compiles.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      businesses: {
        Row: {
          id: string;
          name: string;
          slug: string;
          category: string | null;
          primary_colour: string | null;
          logo_url: string | null;
          is_live: boolean;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['businesses']['Row']>;
        Update: Partial<Database['public']['Tables']['businesses']['Row']>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
