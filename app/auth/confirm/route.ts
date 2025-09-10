import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/dashboard'

  if (token_hash && type) {
    const supabase = await createClient()
    
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })
    
    if (!error) {
      // Create initial subscription record for new users
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from('user_subscriptions')
          .upsert({
            user_id: user.id,
            plan_id: 'trial',
            status: 'trialing',
            trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
          }, {
            onConflict: 'user_id'
          })
      }
      
      redirect(next)
    }
  }

  // redirect the user to an error page with instructions
  redirect('/auth/login?error=confirmation_failed')
}