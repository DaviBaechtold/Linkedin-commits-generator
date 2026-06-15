export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface VisualAsset {
  url: string;
  mime_type: string;
}

// ---- Row types ----

export type NotificationType =
  | "auto_post_generated"
  | "auto_post_published"
  | "auto_post_failed";

export interface NotificationRow {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  draft_id: string | null;
  read: boolean;
  created_at: string;
}

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
  status: "pending" | "posted" | "discarded" | "regenerating" | "scheduled";
  linkedin_post_id: string | null;
  repos_used: string[] | null;
  model_used: string | null;
  hashtags: string[] | null;
  scheduled_for: string | null;
  auto_generated: boolean | null;
  likes_count: number | null;
  comments_count: number | null;
  engagement_synced_at: string | null;
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
  auto_post_enabled: boolean | null;
  auto_post_frequency: string | null;
  auto_post_hour: number | null;
  auto_post_grace_hours: number | null;
  auto_post_last_generated_at: string | null;
  image_provider: string | null;
  tone_style: string | null;
  nda_custom_rules: string | null;
  onboarding_completed: boolean | null;
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
      notifications: {
        Row: NotificationRow;
        Insert: Omit<NotificationRow, "id" | "created_at" | "read"> & { read?: boolean };
        Update: Partial<Omit<NotificationRow, "id" | "created_at" | "user_id">>;
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
export type Notification = NotificationRow;
