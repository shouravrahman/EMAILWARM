// Re-export the client functions for backward compatibility
export { createClient } from '@/utils/supabase/client'

// Database types for TypeScript
export type Database = {
  public: {
    Tables: {
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
      warmup_pools: {
        Row: {
          id: string
          name: string
          emails: any[]
          domains: any[]
          reputation_score: number
          last_activity: string
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          emails?: any[]
          domains?: any[]
          reputation_score?: number
          last_activity?: string
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          emails?: any[]
          domains?: any[]
          reputation_score?: number
          last_activity?: string
          status?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}