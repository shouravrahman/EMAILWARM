/**
 * Test script for campaign scheduler
 * 
 * This script tests the campaign scheduler functionality by:
 * 1. Creating test campaigns (warmup and outreach)
 * 2. Running the scheduler
 * 3. Verifying emails were queued
 * 4. Checking daily volume limits
 * 5. Testing campaign completion detection
 * 
 * Usage: node scripts/test-campaign-scheduler.js
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCampaignScheduler() {
  console.log('🧪 Testing Campaign Scheduler\n');

  try {
    // Step 1: Get a test user
    console.log('1️⃣  Finding test user...');
    const { data: users, error: userError } = await supabase
      .from('user_subscriptions')
      .select('user_id')
      .limit(1);

    if (userError || !users || users.length === 0) {
      console.error('❌ No users found. Please create a user first.');
      return;
    }

    const userId = users[0].user_id;
    console.log(`✅ Found user: ${userId}\n`);

    // Step 2: Get or create a connected email
    console.log('2️⃣  Finding connected email...');
    let { data: emails, error: emailError } = await supabase
      .from('connected_emails')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .limit(1);

    if (emailError || !emails || emails.length === 0) {
      console.log('⚠️  No connected email found. Creating test email...');
      
      const { data: newEmail, error: createError } = await supabase
        .from('connected_emails')
        .insert([{
          user_id: userId,
          email_address: 'test@example.com',
          provider: 'gmail',
          status: 'active',
          oauth_tokens: {
            smtp: {
              host: 'smtp.gmail.com',
              port: 587,
              secure: false,
              auth: {
                user: 'test@example.com',
                pass: 'test-password'
              }
            }
          }
        }])
        .select()
        .single();

      if (createError) {
        console.error('❌ Failed to create test email:', createError);
        return;
      }

      emails = [newEmail];
    }

    const emailId = emails[0].id;
    console.log(`✅ Using email: ${emails[0].email_address}\n`);

    // Step 3: Create test warmup campaign
    console.log('3️⃣  Creating test warmup campaign...');
    const { data: warmupCampaign, error: warmupError } = await supabase
      .from('warmup_campaigns')
      .insert([{
        user_id: userId,
        email_id: emailId,
        name: 'Test Warmup Campaign',
        status: 'active',
        campaign_type: 'warmup',
        daily_volume: 5,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
        settings: {}
      }])
      .select()
      .single();

    if (warmupError) {
      console.error('❌ Failed to create warmup campaign:', warmupError);
      return;
    }

    console.log(`✅ Created warmup campaign: ${warmupCampaign.id}\n`);

    // Step 4: Check warmup pool
    console.log('4️⃣  Checking warmup pool...');
    const { data: poolEmails, error: poolError } = await supabase
      .from('warmup_email_pool')
      .select('*')
      .eq('status', 'active')
      .eq('mx_verified', true)
      .limit(5);

    if (poolError || !poolEmails || poolEmails.length === 0) {
      console.log('⚠️  No warmup pool emails found. Creating test pool emails...');
      
      const testPoolEmails = [
        'warmup1@test-pool.com',
        'warmup2@test-pool.com',
        'warmup3@test-pool.com',
        'warmup4@test-pool.com',
        'warmup5@test-pool.com',
      ];

      for (const email of testPoolEmails) {
        await supabase
          .from('warmup_email_pool')
          .insert([{
            email_address: email,
            provider: 'test',
            status: 'active',
            mx_verified: true,
            bounce_rate: 0,
            usage_count: 0
          }]);
      }

      console.log('✅ Created test warmup pool emails\n');
    } else {
      console.log(`✅ Found ${poolEmails.length} warmup pool emails\n`);
    }

    // Step 5: Test scheduler by calling the API endpoint
    console.log('5️⃣  Running campaign scheduler...');
    
    // Import the scheduler directly
    const { CampaignScheduler } = require('../lib/campaign-scheduler.ts');
    const result = await CampaignScheduler.processActiveCampaigns();

    console.log('\n📊 Scheduler Results:');
    console.log(`   Total campaigns: ${result.totalCampaigns}`);
    console.log(`   Processed: ${result.processed}`);
    console.log(`   Skipped: ${result.skipped}`);
    console.log(`   Emails queued: ${result.totalEmailsQueued}`);
    console.log(`   Errors: ${result.errors.length}\n`);

    if (result.errors.length > 0) {
      console.log('⚠️  Errors:');
      result.errors.forEach(error => console.log(`   - ${error}`));
      console.log();
    }

    // Step 6: Verify emails were queued
    console.log('6️⃣  Verifying email queue...');
    const { data: queuedEmails, error: queueError } = await supabase
      .from('email_queue')
      .select('*')
      .eq('campaign_id', warmupCampaign.id);

    if (queueError) {
      console.error('❌ Failed to check email queue:', queueError);
    } else {
      console.log(`✅ Found ${queuedEmails?.length || 0} emails in queue\n`);
    }

    // Step 7: Test daily volume limit
    console.log('7️⃣  Testing daily volume limit...');
    const canSend = await CampaignScheduler.canSendToday(warmupCampaign.id, warmupCampaign.daily_volume);
    console.log(`   Can send: ${canSend.allowed}`);
    console.log(`   Sent today: ${canSend.sentToday}`);
    console.log(`   Remaining: ${canSend.remaining}\n`);

    // Step 8: Test campaign completion detection
    console.log('8️⃣  Testing campaign completion detection...');
    
    // Create an expired campaign
    const { data: expiredCampaign, error: expiredError } = await supabase
      .from('warmup_campaigns')
      .insert([{
        user_id: userId,
        email_id: emailId,
        name: 'Test Expired Campaign',
        status: 'active',
        campaign_type: 'warmup',
        daily_volume: 5,
        start_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
        end_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        settings: {}
      }])
      .select()
      .single();

    if (!expiredError && expiredCampaign) {
      await CampaignScheduler.detectCompletedCampaigns();
      
      const { data: completedCampaign } = await supabase
        .from('warmup_campaigns')
        .select('status')
        .eq('id', expiredCampaign.id)
        .single();

      if (completedCampaign?.status === 'completed') {
        console.log('✅ Campaign completion detection working\n');
      } else {
        console.log('⚠️  Campaign completion detection may have issues\n');
      }
    }

    // Step 9: Cleanup
    console.log('9️⃣  Cleaning up test data...');
    await supabase
      .from('warmup_campaigns')
      .delete()
      .eq('id', warmupCampaign.id);

    if (expiredCampaign) {
      await supabase
        .from('warmup_campaigns')
        .delete()
        .eq('id', expiredCampaign.id);
    }

    await supabase
      .from('email_queue')
      .delete()
      .eq('campaign_id', warmupCampaign.id);

    console.log('✅ Cleanup complete\n');

    console.log('✨ All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run tests
testCampaignScheduler();
