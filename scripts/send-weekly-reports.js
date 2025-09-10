#!/usr/bin/env node

const { sendWeeklyReports } = require('../lib/email-notifications');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

async function runWeeklyReports() {
  try {
    console.log('📧 Starting weekly report generation...');
    
    await sendWeeklyReports();
    
    console.log('✅ Weekly reports sent successfully!');
  } catch (error) {
    console.error('❌ Error sending weekly reports:', error);
    process.exit(1);
  }
}

runWeeklyReports();