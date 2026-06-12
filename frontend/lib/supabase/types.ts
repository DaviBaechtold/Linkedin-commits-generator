export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface VisualAsset {
  url: string;
  mime_type: string;
}

// ---- Row types ----

export interface IntegrationRow {
  id: string;
  user_id: string;
  provider: "linkedin" | "github";
  access_token: string;
  refresh_token: string | null;
  expires_at: string | null;
  provider_user_id: string | null;
  provider_username: string | null;
  created_at: string;
  updated_at: string;
}

export interface RepoRow {
  id: string;
  user_id: string;
  github_full_name: string | null;
  display_name: string;
  alias: string;
  enabled: boolean;
  created_at: string;
}

export interface DraftRow {
  id: string;
  user_id: string;
  post_text: string;
  raw_log_summary: string | null;
  visual_assets: VisualAsset[];
  status: "pending" | "posted" | "discarded" | "regenerating";
  linkedin_post_id: string | null;
  repos_used: string[] | null;
  model_used: string | null;
  created_at: string;
  updated_at: string;
}

export interface UsageLogRow {
  id: string;
  user_id: string;
  action: "generate" | "publish" | "regen_text" | "regen_image";
  created_at: string;
}

export interface UserPreferencesRow {
  user_id: string;
  post_language: string | null;
  enable_images: boolean | null;
  image_style: string | null;
  commits_since_days: number | null;
  daily_limit: number | null;
  ai_provider: string | null;
  ai_model: string | null;
  profile_instructions: string | null;
  created_at: string | null;
  updated_at: string | null;
}

// ---- Database schema ----

export interface Database {
  public: {
    Tables: {
      integrations: {
        Row: IntegrationRow;
        Insert: Omit<IntegrationRow, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<IntegrationRow, "id" | "created_at">>;
      };
      repos: {
        Row: RepoRow;
        Insert: Omit<RepoRow, "id" | "created_at">;
        Update: Partial<Omit<RepoRow, "id" | "created_at">>;
      };
      drafts: {
        Row: DraftRow;
        Insert: Omit<DraftRow, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<DraftRow, "id" | "created_at">>;
      };
      usage_logs: {
        Row: UsageLogRow;
        Insert: Omit<UsageLogRow, "id" | "created_at">;
        Update: never;
      };
      user_preferences: {
        Row: UserPreferencesRow;
        Insert: Partial<UserPreferencesRow> & { user_id: string };
        Update: Partial<Omit<UserPreferencesRow, "user_id">>;
      };
    };
  };
}

// ---- Convenience aliases ----

export type Integration = IntegrationRow;
export type Repo = RepoRow;
export type Draft = DraftRow;
export type UsageLog = UsageLogRow;
export type UserPreferences = UserPreferencesRow;
