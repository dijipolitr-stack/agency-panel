/**
 * Hand-written database types — generate with `supabase gen types typescript`
 * once your project is linked, but these match the migration verbatim.
 */

export type ProjectStatus = "idea" | "production" | "review" | "scheduled" | "published" | "archived";
export type ContentType = "image" | "video";
export type ContentStatus = "pending" | "generating" | "ready" | "failed";
export type PostStatus = "draft" | "scheduled" | "publishing" | "published" | "failed";
export type SocialPlatform = "instagram" | "tiktok";
export type MemberRole = "owner" | "admin" | "editor";

export interface Database {
  public: {
    Tables: {
      agencies: {
        Row: {
          id: string;
          name: string;
          slug: string;
          owner_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          owner_id: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["agencies"]["Insert"]>;
        Relationships: [];
      };
      agency_members: {
        Row: {
          agency_id: string;
          user_id: string;
          role: MemberRole;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["agency_members"]["Row"], "created_at"> & {
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["agency_members"]["Insert"]>;
        Relationships: [];
      };
      clients: {
        Row: {
          id: string;
          agency_id: string;
          name: string;
          industry: string | null;
          logo_url: string | null;
          brand_voice: string | null;
          brand_colors: string[];
          brand_keywords: string[];
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          agency_id: string;
          name: string;
          industry?: string | null;
          logo_url?: string | null;
          brand_voice?: string | null;
          brand_colors?: string[];
          brand_keywords?: string[];
          notes?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["clients"]["Insert"]>;
        Relationships: [];
      };
      social_accounts: {
        Row: {
          id: string;
          client_id: string;
          platform: SocialPlatform;
          account_name: string;
          account_id: string;
          access_token: string;
          refresh_token: string | null;
          token_expires_at: string | null;
          metadata: Record<string, unknown>;
          connected_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["social_accounts"]["Row"],
          "id" | "connected_at" | "metadata"
        > & {
          id?: string;
          connected_at?: string;
          metadata?: Record<string, unknown>;
        };
        Update: Partial<Database["public"]["Tables"]["social_accounts"]["Insert"]>;
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          client_id: string;
          title: string;
          description: string | null;
          status: ProjectStatus;
          position: number;
          due_date: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          title: string;
          description?: string | null;
          status?: ProjectStatus;
          position?: number;
          due_date?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["projects"]["Insert"]>;
        Relationships: [];
      };
      content_items: {
        Row: {
          id: string;
          project_id: string;
          type: ContentType;
          prompt: string;
          model: string | null;
          generation_params: Record<string, unknown>;
          asset_url: string | null;
          thumbnail_url: string | null;
          status: ContentStatus;
          error_message: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          type: ContentType;
          prompt: string;
          model?: string | null;
          generation_params?: Record<string, unknown>;
          asset_url?: string | null;
          thumbnail_url?: string | null;
          status?: ContentStatus;
          error_message?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["content_items"]["Insert"]>;
        Relationships: [];
      };
      posts: {
        Row: {
          id: string;
          content_item_id: string;
          social_account_id: string;
          caption: string | null;
          hashtags: string[];
          scheduled_for: string | null;
          posted_at: string | null;
          status: PostStatus;
          platform_post_id: string | null;
          platform_post_url: string | null;
          error_message: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          content_item_id: string;
          social_account_id: string;
          caption?: string | null;
          hashtags?: string[];
          scheduled_for?: string | null;
          posted_at?: string | null;
          status?: PostStatus;
          platform_post_id?: string | null;
          platform_post_url?: string | null;
          error_message?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["posts"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      user_agency_ids: { Args: Record<string, never>; Returns: { agency_id: string }[] };
    };
    Enums: {
      project_status: ProjectStatus;
      content_type: ContentType;
      content_status: ContentStatus;
      post_status: PostStatus;
      social_platform: SocialPlatform;
      member_role: MemberRole;
    };
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
