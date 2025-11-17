#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function updatePoolReputation() {
  try {
    console.log('📈 Starting warmup pool reputation update...');

    const { data: pools, error: poolsError } = await supabase
      .from('warmup_pools')
      .select('*');

    if (poolsError) throw poolsError;

    for (const pool of pools) {
      const { data: emails, error: emailsError } = await supabase
        .from('warmup_email_pool')
        .select('email_address')
        .in('email_address', pool.emails);
      
      if (emailsError) {
        console.error(`Error fetching emails for pool ${pool.name}:`, emailsError);
        continue;
      }

      const emailAddresses = emails.map(e => e.email_address);
      if (emailAddresses.length === 0) {
        continue;
      }

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const { data: logs, error: logsError } = await supabase
        .from('email_logs')
        .select('status, open_count, reply_count')
        .in('recipient', emailAddresses)
        .gte('sent_at', thirtyDaysAgo);

      if (logsError) {
        console.error(`Error fetching email logs for pool ${pool.name}:`, logsError);
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
        .from('warmup_pools')
        .update({ reputation_score: newReputationScore })
        .eq('id', pool.id);

      if (updateError) {
        console.error(`Error updating reputation for pool ${pool.name}:`, updateError);
      } else {
        console.log(`Updated reputation for pool ${pool.name} to ${newReputationScore.toFixed(2)}`);
      }
    }

    console.log('✅ Warmup pool reputation update complete!');
  } catch (error) {
    console.error('❌ Error updating warmup pool reputation:', error);
    process.exit(1);
  }
}

updatePoolReputation();
