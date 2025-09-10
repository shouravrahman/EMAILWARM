#!/usr/bin/env node

const { getEmailNotificationService } = require('../lib/email-notifications');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

async function testEmailConfiguration() {
  try {
    console.log('📧 Testing email configuration...');
    
    const emailService = getEmailNotificationService();
    
    // Test SMTP connection
    const isConnected = await emailService.testConnection();
    
    if (isConnected) {
      console.log('✅ SMTP connection successful!');
      
      // Send test email
      const testEmail = process.argv[2] || 'test@example.com';
      const success = await emailService.sendWelcomeEmail(testEmail, 'Test User');
      
      if (success) {
        console.log(`✅ Test email sent successfully to ${testEmail}`);
      } else {
        console.log('❌ Failed to send test email');
      }
    } else {
      console.log('❌ SMTP connection failed');
      console.log('Please check your SMTP configuration in .env.local');
    }
    
  } catch (error) {
    console.error('❌ Email test error:', error);
    process.exit(1);
  }
}

console.log('Usage: npm run test-email [email@example.com]');
testEmailConfiguration();