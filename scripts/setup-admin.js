#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function setupAdmin() {
  try {
    console.log('🔧 Setting up admin user...');
    
    const email = await question('Enter admin email: ');
    const password = await question('Enter admin password: ');
    const name = await question('Enter admin name: ');
    
    // Create admin user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: {
        name,
        role: 'admin'
      },
      email_confirm: true
    });
    
    if (authError) {
      console.error('❌ Failed to create admin user:', authError);
      process.exit(1);
    }
    
    console.log('✅ Admin user created successfully!');
    console.log(`📧 Email: ${email}`);
    console.log(`👤 Name: ${name}`);
    console.log(`🆔 User ID: ${authData.user.id}`);
    
    // Create subscription record
    const { error: subError } = await supabase
      .from('user_subscriptions')
      .insert({
        user_id: authData.user.id,
        plan_id: 'enterprise',
        status: 'active',
        current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      });
    
    if (subError) {
      console.warn('⚠️ Failed to create subscription record:', subError);
    } else {
      console.log('✅ Admin subscription created');
    }
    
  } catch (error) {
    console.error('❌ Setup error:', error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

setupAdmin();