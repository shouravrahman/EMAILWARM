# WarmupPro Production Deployment Guide

This guide covers deploying WarmupPro to production with all necessary configurations.

## 🎯 Pre-Deployment Checklist

### Required Services
- [ ] Supabase project created and configured
- [ ] Google Cloud project with Gemini AI API enabled
- [ ] Aurinko developer account with OAuth app
- [ ] LemonSqueezy store with products configured
- [ ] Domain name registered
- [ ] SMTP service configured

### Environment Variables
- [ ] All environment variables from `.env.example` configured
- [ ] Encryption keys generated (32 characters)
- [ ] OAuth redirect URIs updated for production
- [ ] Webhook URLs configured

## 🚀 Deployment Steps

### 1. Prepare Database

```bash
# Set up environment variables
cp .env.example .env.local
# Fill in all required values

# Run database migrations
npm run migrate

# Set up admin user
npm run setup-admin
```

### 2. Deploy to Vercel (Recommended)

```bash
# Install Vercel CLI
npm install -g vercel

# Build and test locally
npm run build

# Deploy to production
vercel --prod
```

### 3. Configure Environment Variables

In Vercel Dashboard, add all environment variables from `.env.example`:

**Critical Variables:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ENCRYPTION_KEY` (32 characters)
- `LEMONSQUEEZY_API_KEY`
- `GEMINI_API_KEY`
- `AURINKO_CLIENT_ID`
- `AURINKO_CLIENT_SECRET`

### 4. Configure Webhooks

#### LemonSqueezy Webhooks
1. Go to LemonSqueezy Dashboard > Settings > Webhooks
2. Add webhook URL: `https://yourdomain.com/api/payments/webhook`
3. Enable events:
   - `subscription_created`
   - `subscription_updated`
   - `subscription_cancelled`
   - `subscription_resumed`
   - `subscription_expired`

#### Aurinko Webhooks
1. Go to Aurinko Dashboard > Webhooks
2. Add webhook URL: `https://yourdomain.com/api/webhooks/aurinko`
3. Enable events:
   - `email.delivered`
   - `email.opened`
   - `email.replied`
   - `email.bounced`
   - `email.clicked`

### 5. Configure OAuth Redirects

#### Aurinko OAuth
1. Update redirect URI: `https://yourdomain.com/api/auth/oauth`
2. Add production domain to allowed origins

#### Supabase Auth
1. Go to Supabase Dashboard > Authentication > Settings
2. Add site URL: `https://yourdomain.com`
3. Add redirect URLs: `https://yourdomain.com/auth/confirm`

## 🔧 Production Configuration

### Supabase Configuration

```sql
-- Enable email confirmations
UPDATE auth.config SET enable_signup = true;
UPDATE auth.config SET enable_confirmations = true;

-- Set site URL
UPDATE auth.config SET site_url = 'https://yourdomain.com';

-- Configure email templates
UPDATE auth.email_templates 
SET confirmation_url = '{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email'
WHERE template_name = 'confirmation';
```

### Security Hardening

```bash
# Generate secure encryption key
openssl rand -hex 32

# Generate secure NextAuth secret
openssl rand -base64 32
```

### Performance Optimization

1. **Database Indexes**: All critical indexes included in migrations
2. **Connection Pooling**: Configured via Supabase
3. **Caching**: Next.js automatic caching with proper revalidation
4. **CDN**: Vercel Edge Network for global distribution

## 📊 Monitoring Setup

### Health Checks

Create monitoring for:
- Database connectivity
- AI service availability
- Email service status
- Payment processing
- Webhook delivery

### Alerts

Set up alerts for:
- High error rates
- Payment failures
- Email delivery issues
- System downtime

## 🔒 Security Checklist

### Data Protection
- [ ] All sensitive data encrypted at rest
- [ ] OAuth tokens encrypted with AES-256-GCM
- [ ] HTTPS enforced for all connections
- [ ] Webhook signatures verified

### Access Control
- [ ] RLS policies enabled on all tables
- [ ] Admin access properly restricted
- [ ] API rate limiting configured
- [ ] Input validation on all endpoints

### Compliance
- [ ] GDPR compliance for EU users
- [ ] Data retention policies configured
- [ ] Privacy policy updated
- [ ] Terms of service updated

## 🚨 Incident Response

### Common Issues

#### High Bounce Rate
```sql
-- Check recent bounces
SELECT recipient, bounce_reason, COUNT(*) 
FROM email_logs 
WHERE status = 'bounced' 
AND sent_at > NOW() - INTERVAL '24 hours'
GROUP BY recipient, bounce_reason;
```

#### Payment Processing Issues
1. Check LemonSqueezy webhook logs
2. Verify webhook signatures
3. Monitor subscription status updates

#### AI Service Outage
1. System automatically falls back to templates
2. Monitor AI service health endpoint
3. Check API quota and billing

## 📈 Scaling Guidelines

### Performance Monitoring
- Monitor response times
- Track error rates
- Monitor database performance
- Track user engagement

### Capacity Planning
- Monitor subscription growth
- Plan for email volume increases
- Scale infrastructure as needed
- Optimize database queries

## 🔄 Backup & Recovery

### Database Backups
Supabase provides automatic backups. For additional security:

```bash
# Manual backup
pg_dump "postgresql://..." > backup_$(date +%Y%m%d).sql
```

### Application Backups
- Code repository
- Environment variables
- Configuration files
- SSL certificates

## 📞 Support

For production issues:
- **Technical**: tech@warmuppro.com
- **Billing**: billing@warmuppro.com
- **Security**: security@warmuppro.com

---

**Production Deployment Complete** ✅

Your WarmupPro platform is now ready for production with enterprise-grade security, monitoring, and scalability.