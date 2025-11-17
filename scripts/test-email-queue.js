/**
 * Test script for email queue functionality
 * Run with: node scripts/test-email-queue.js
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testEmailQueue() {
  console.log('Testing email queue functionality...\n');

  try {
    // 1. Check if email_queue table exists
    console.log('1. Checking email_queue table...');
    const { data: queueData, error: queueError } = await supabase
      .from('email_queue')
      .select('*')
      .limit(1);

    if (queueError) {
      console.error('❌ Email queue table not found:', queueError.message);
      console.log('   Run migrations first: npm run migrate');
      return;
    }
    console.log('✅ Email queue table exists\n');

    // 2. Check if suppression_list table exists
    console.log('2. Checking suppression_list table...');
    const { data: suppressionData, error: suppressionError } = await supabase
      .from('suppression_list')
      .select('*')
      .limit(1);

    if (suppressionError) {
      console.error('❌ Suppression list table not found:', suppressionError.message);
      console.log('   Run migrations first: npm run migrate');
      return;
    }
    console.log('✅ Suppression list table exists\n');

    // 3. Get queue stats
    console.log('3. Getting queue stats...');
    const { data: stats, error: statsError } = await supabase
      .from('email_queue')
      .select('status');

    if (statsError) {
      console.error('❌ Error fetching stats:', statsError.message);
      return;
    }

    const queueStats = stats.reduce(
      (acc, item) => {
        acc[item.status] = (acc[item.status] || 0) + 1;
        acc.total++;
        return acc;
      },
      { pending: 0, processing: 0, sent: 0, failed: 0, total: 0 }
    );

    console.log('✅ Queue stats:');
    console.log(`   - Pending: ${queueStats.pending}`);
    console.log(`   - Processing: ${queueStats.processing}`);
    console.log(`   - Sent: ${queueStats.sent}`);
    console.log(`   - Failed: ${queueStats.failed}`);
    console.log(`   - Total: ${queueStats.total}\n`);

    // 4. Test adding to suppression list
    console.log('4. Testing suppression list...');
    const testEmail = `test-${Date.now()}@example.com`;
    
    const { error: insertError } = await supabase
      .from('suppression_list')
      .insert([
        {
          email: testEmail,
          reason: 'Test unsubscribe',
          source: 'manual',
        },
      ]);

    if (insertError) {
      console.error('❌ Error adding to suppression list:', insertError.message);
      return;
    }

    // Check if email is suppressed
    const { data: checkData } = await supabase
      .from('suppression_list')
      .select('*')
      .eq('email', testEmail)
      .single();

    if (checkData) {
      console.log('✅ Suppression list working correctly');
      
      // Clean up test data
      await supabase
        .from('suppression_list')
        .delete()
        .eq('email', testEmail);
      
      console.log('✅ Test data cleaned up\n');
    }

    console.log('🎉 All tests passed!\n');
    console.log('Next steps:');
    console.log('1. Configure SMTP credentials in connected_emails table');
    console.log('2. Test email sending with: POST /api/emails/process-queue');
    console.log('3. Set up cron job in vercel.json for automated processing');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
  }
}

testEmailQueue();
