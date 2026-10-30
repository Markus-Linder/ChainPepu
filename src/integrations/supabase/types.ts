export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface BusinessRow {
  id: string;
  user_id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string | null;
  street: string | null;
  plz: string | null;
  city: string | null;
  trades: string[];
  regions: string[];
  website: string | null;
  handwerksrolle_nr: string | null;
  verified: boolean;
  stripe_customer_id: string | null;
  subscription_status: string;
  subscription_current_period_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface MarketplaceLead {
  id: string;
  trade: string;
  region: string;
  city: string | null;
  title: string;
  summary: string;
  budget_min: number | null;
  budget_max: number | null;
  existing_quote_total: number | null;
  timeframe: string | null;
  buyers_count: number;
  max_buyers: number;
  created_at: string;
  purchased: boolean;
}

export interface PurchasedLead {
  id: string;
  trade: string;
  plz: string;
  city: string | null;
  title: string;
  summary: string;
  budget_min: number | null;
  budget_max: number | null;
  existing_quote_total: number | null;
  timeframe: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  preferred_contact: string | null;
  purchased_at: string;
  created_at: string;
}

export type Database = {
  public: {
    Tables: {
      businesses: {
        Row: BusinessRow;
        Insert: Omit<BusinessRow, "id" | "created_at" | "updated_at" | "verified" | "stripe_customer_id" | "subscription_status" | "subscription_current_period_end"> & Partial<Pick<BusinessRow, "id" | "verified">>;
        Update: Partial<BusinessRow>;
        Relationships: [];
      };
      price_benchmarks: {
        Row: { id: string; trade: string; position: string; unit: string; price_min: number; price_typ: number; price_max: number; note: string | null; source: string | null; created_at: string };
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_quote_report: { Args: { p_id: string; p_token: string }; Returns: Json };
      get_project: { Args: { p_id: string; p_token: string }; Returns: Json };
      get_comparison: { Args: { p_id: string; p_token: string }; Returns: Json };
      list_marketplace_leads: { Args: Record<string, never>; Returns: MarketplaceLead[] };
      get_purchased_leads: { Args: Record<string, never>; Returns: PurchasedLead[] };
      public_stats: { Args: Record<string, never>; Returns: Json };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
