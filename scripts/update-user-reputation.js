#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function updateUserReputation() {
  try {
    console.log('📈 Starting user reputation update...');

    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) throw usersError;

    for (const user of users.users) {
      const { data: campaigns, error: campaignsError } = await supabase
        .from('warmup_campaigns')
        .select('id')
        .eq('user_id', user.id);

      if (campaignsError) {
        console.error(`Error fetching campaigns for user ${user.id}:`, campaignsError);
        continue;
      }

      const campaignIds = campaigns.map(c => c.id);
      if (campaignIds.length === 0) {
        continue;
      }

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const { data: logs, error: logsError } = await supabase
        .from('email_logs')
        .select('status, open_count, reply_count')
        .in('campaign_id', campaignIds)
        .gte('sent_at', thirtyDaysAgo);

      if (logsError) {
        console.error(`Error fetching email logs for user ${user.id}:`, logsError);
        continue;
      }

      if (logs.length === 0) {
        continue;
      }

      const totalEmails = logs.length;
      const openedEmails = logs.filter(log => log.open_count > 0).length;
      const repliedEmails = logs.filter(log => log.reply_count > 0).length;
      const spamEmails = logs.filter(log => log.status === 'spam').length;

      const openRate = (openedEmails / totalEmails) * 100;
      const replyRate = (repliedEmails / totalEmails) * 100;
      const spamRate = (spamEmails / totalEmails) * 100;

      // Simple scoring algorithm
      const newReputationScore = Math.max(0, Math.min(100,
        (openRate * 0.5) +
        (replyRate * 1) +
        (100 - spamRate * 10)
      ));

      const { error: updateError } = await supabase
        .from('user_reputation')
        .upsert({ 
          user_id: user.id, 
          reputation_score: newReputationScore,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

      if (updateError) {
        console.error(`Error updating reputation for user ${user.id}:`, updateError);
      } else {
        console.log(`Updated reputation for user ${user.id} to ${newReputationScore.toFixed(2)}`);
      }
    }

    console.log('✅ User reputation update complete!');
  } catch (error) {
    console.error('❌ Error updating user reputation:', error);
    process.exit(1);
  }
}

updateUserReputation();
