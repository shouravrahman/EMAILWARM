export type Database = {
  public: {
    Tables: {
      email_queue: {
        Row: {
          id: string
          campaign_id: string
          email_account_id: string
          recipient: string
          subject: string
          body: string
          html_body: string | null
          priority: number
          attempts: number
          max_attempts: number
          scheduled_for: string
          status: 'pending' | 'processing' | 'sent' | 'failed'
          error_message: string | null
          metadata: any
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          campaign_id: string
          email_account_id: string
          recipient: string
          subject: string
          body: string
          html_body?: string | null
          priority?: number
          attempts?: number
          max_attempts?: number
          scheduled_for?: string
          status?: 'pending' | 'processing' | 'sent' | 'failed'
          error_message?: string | null
          metadata?: any
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          campaign_id?: string
          email_account_id?: string
          recipient?: string
          subject?: string
          body?: string
          html_body?: string | null
          priority?: number
          attempts?: number
          max_attempts?: number
          scheduled_for?: string
          status?: 'pending' | 'processing' | 'sent' | 'failed'
          error_message?: string | null
          metadata?: any
          created_at?: string
          updated_at?: string
        }
      }
      suppression_list: {
        Row: {
          id: string
          email: string
          reason: string | null
          source: 'unsubscribe' | 'bounce' | 'spam_complaint' | 'manual'
          metadata: any
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          reason?: string | null
          source: 'unsubscribe' | 'bounce' | 'spam_complaint' | 'manual'
          metadata?: any
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          reason?: string | null
          source?: 'unsubscribe' | 'bounce' | 'spam_complaint' | 'manual'
          metadata?: any
          created_at?: string
        }
      }
      prospect_lists: {
        Row: {
          id: string
          user_id: string
          name: string
          source: 'csv' | 'google_sheets'
          google_sheet_id: string | null
          google_sheet_url: string | null
          total_prospects: number
          active_prospects: number
          metadata: any
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          source: 'csv' | 'google_sheets'
          google_sheet_id?: string | null
          google_sheet_url?: string | null
          total_prospects?: number
          active_prospects?: number
          metadata?: any
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          source?: 'csv' | 'google_sheets'
          google_sheet_id?: string | null
          google_sheet_url?: string | null
          total_prospects?: number
          active_prospects?: number
          metadata?: any
          created_at?: string
          updated_at?: string
        }
      }
      prospects: {
        Row: {
          id: string
          user_id: string
          list_id: string
          email: string
          first_name: string | null
          last_name: string | null
          company: string | null
          title: string | null
          custom_field_1: string | null
          custom_field_2: string | null
          custom_field_3: string | null
          status: 'active' | 'contacted' | 'engaged' | 'replied' | 'bounced' | 'unsubscribed'
          last_contacted_at: string | null
          engagement_score: number
          metadata: any
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          list_id: string
          email: string
          first_name?: string | null
          last_name?: string | null
          company?: string | null
          title?: string | null
          custom_field_1?: string | null
          custom_field_2?: string | null
          custom_field_3?: string | null
          status?: 'active' | 'contacted' | 'engaged' | 'replied' | 'bounced' | 'unsubscribed'
          last_contacted_at?: string | null
          engagement_score?: number
          metadata?: any
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          list_id?: string
          email?: string
          first_name?: string | null
          last_name?: string | null
          company?: string | null
          title?: string | null
          custom_field_1?: string | null
          custom_field_2?: string | null
          custom_field_3?: string | null
          status?: 'active' | 'contacted' | 'engaged' | 'replied' | 'bounced' | 'unsubscribed'
          last_contacted_at?: string | null
          engagement_score?: number
          metadata?: any
          created_at?: string
          updated_at?: string
        }
      }
      warmup_email_pool: {
        Row: {
          id: string
          email_address: string
          provider: string | null
          status: string
          mx_verified: boolean
          mx_records: any
          usage_count: number
          bounce_count: number
          bounce_rate: number
          last_used_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email_address: string
          provider?: string | null
          status?: string
          mx_verified?: boolean
          mx_records?: any
          usage_count?: number
          bounce_count?: number
          bounce_rate?: number
          last_used_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email_address?: string
          provider?: string | null
          status?: string
          mx_verified?: boolean
          mx_records?: any
          usage_count?: number
          bounce_count?: number
          bounce_rate?: number
          last_used_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      connected_emails: {
        Row: {
          id: string
          user_id: string
          email_address: string
          provider: string
          oauth_tokens: any
          status: 'active' | 'inactive' | 'error'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          email_address: string
          provider: string
          oauth_tokens: any
          status?: 'active' | 'inactive' | 'error'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          email_address?: string
          provider?: string
          oauth_tokens?: any
          status?: 'active' | 'inactive' | 'error'
          created_at?: string
          updated_at?: string
        }
      }
      warmup_campaigns: {
        Row: {
          id: string
          user_id: string
          email_id: string
          name: string
          status: 'draft' | 'active' | 'paused' | 'completed'
          start_date: string
          end_date: string
          daily_volume: number
          settings: any
          campaign_type: 'warmup' | 'outreach'
          prospect_list_id: string | null
          outreach_mode: 'automated' | 'manual' | null
          personalization_template: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          email_id: string
          name: string
          status?: 'draft' | 'active' | 'paused' | 'completed'
          start_date: string
          end_date: string
          daily_volume?: number
          settings?: any
          campaign_type?: 'warmup' | 'outreach'
          prospect_list_id?: string | null
          outreach_mode?: 'automated' | 'manual' | null
          personalization_template?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          email_id?: string
          name?: string
          status?: 'draft' | 'active' | 'paused' | 'completed'
          start_date?: string
          end_date?: string
          daily_volume?: number
          settings?: any
          campaign_type?: 'warmup' | 'outreach'
          prospect_list_id?: string | null
          outreach_mode?: 'automated' | 'manual' | null
          personalization_template?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      email_logs: {
        Row: {
          id: string
          campaign_id: string
          email_id: string
          message_id: string
          subject: string
          recipient: string
          status: 'sent' | 'delivered' | 'opened' | 'replied' | 'bounced' | 'spam' | 'unsubscribed'
          open_count: number
          reply_count: number
          click_count: number
          sent_at: string
          opened_at: string | null
          replied_at: string | null
          bounced_at: string | null
          spam_at: string | null
          unsubscribed_at: string | null
          last_activity_at: string | null
          metadata: any
          bounce_reason: string | null
          click_data: any[]
          prospect_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          campaign_id: string
          email_id: string
          message_id: string
          subject: string
          recipient: string
          status?: 'sent' | 'delivered' | 'opened' | 'replied' | 'bounced' | 'spam' | 'unsubscribed'
          open_count?: number
          reply_count?: number
          click_count?: number
          sent_at?: string
          opened_at?: string | null
          replied_at?: string | null
          bounced_at?: string | null
          spam_at?: string | null
          unsubscribed_at?: string | null
          last_activity_at?: string | null
          metadata?: any
          bounce_reason?: string | null
          click_data?: any[]
          prospect_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          campaign_id?: string
          email_id?: string
          message_id?: string
          subject?: string
          recipient?: string
          status?: 'sent' | 'delivered' | 'opened' | 'replied' | 'bounced' | 'spam' | 'unsubscribed'
          open_count?: number
          reply_count?: number
          click_count?: number
          sent_at?: string
          opened_at?: string | null
          replied_at?: string | null
          bounced_at?: string | null
          spam_at?: string | null
          unsubscribed_at?: string | null
          last_activity_at?: string | null
          metadata?: any
          bounce_reason?: string | null
          click_data?: any[]
          prospect_id?: string | null
          created_at?: string
        }
      }
      user_subscriptions: {
        Row: {
          id: string
          user_id: string
          lemonsqueezy_subscription_id: string | null
          lemonsqueezy_customer_id: string | null
          plan_id: string
          status: string
          current_period_start: string
          current_period_end: string
          cancel_at_period_end: boolean
          trial_ends_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          lemonsqueezy_subscription_id?: string | null
          lemonsqueezy_customer_id?: string | null
          plan_id?: string
          status?: string
          current_period_start?: string
          current_period_end?: string
          cancel_at_period_end?: boolean
          trial_ends_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          lemonsqueezy_subscription_id?: string | null
          lemonsqueezy_customer_id?: string | null
          plan_id?: string
          status?: string
          current_period_start?: string
          current_period_end?: string
          cancel_at_period_end?: boolean
          trial_ends_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}