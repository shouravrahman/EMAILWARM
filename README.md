# WarmupPro - AI-Powered Email Warmup Platform

WarmupPro is a production-ready email warmup platform that uses AI to improve email deliverability through intelligent conversation sequences. Built with Next.js 14, Supabase, and integrated with LemonSqueezy for payments.

## 🚀 Features

### Core Features
- **Smart Email Warmup**: AI-powered email sequences that gradually build sender reputation
- **Real-time Analytics**: Track open rates, reply rates, and deliverability metrics in real-time
- **Secure OAuth**: Bank-level security with encrypted OAuth connections (AES-256-GCM)
- **Automated Campaigns**: Set-and-forget AI-driven warmup process
- **Advanced Reporting**: Comprehensive insights and optimization recommendations
- **Multi-Provider Support**: Gmail, Outlook, and custom SMTP integration

### AI-Powered Features
- **Contextual Email Generation**: AI creates natural, human-like emails
- **Conversation Awareness**: AI considers previous email history
- **Content Analysis**: Spam risk, deliverability, and engagement scoring
- **Sequence Optimization**: AI optimizes email timing and content flow

### Business Features
- **Subscription Management**: LemonSqueezy integration with multiple plans
- **Usage Limits**: Plan-based restrictions and monitoring
- **Admin Dashboard**: Complete system administration
- **Real-time Tracking**: Live email performance monitoring

## 💰 Pricing

- **Starter**: $15/month (3 accounts, 150 emails/day)
- **Professional**: $39/month (10 accounts, 1,000 emails/day) - Most Popular
- **Enterprise**: $99/month (50 accounts, 5,000 emails/day)

All plans include 14-day free trial and yearly discounts.

## 🛠 Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **AI**: Google Gemini 1.5 Flash
- **Email**: Aurinko API + Nodemailer
- **Payments**: LemonSqueezy
- **Security**: AES-256-GCM encryption, OAuth2, RLS

## 📋 Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- Google Cloud account (for Gemini AI)
- Aurinko account (for email API)
- LemonSqueezy account (for payments)

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd warmuppro
npm install
```

### 2. Environment Setup

Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
cp .env.example .env.local
```

### 3. Database Setup

Run database migrations:

```bash
npm run migrate
```

### 4. Setup Admin User

Create your first admin user:

```bash
npm run setup-admin
```

### 5. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` to see the application.

## 🏗 Production Deployment

### Environment Variables

Ensure all environment variables are set in your production environment:

- **Supabase**: Project URL, Anon Key, Service Role Key
- **Aurinko**: Client ID, Client Secret, Webhook Secret
- **Gemini AI**: API Key
- **LemonSqueezy**: API Key, Store ID, Webhook Secret, Variant IDs
- **SMTP**: Host, Port, User, Password
- **Security**: Encryption Key (32 characters), NextAuth Secret

### Deployment Steps

1. **Deploy to Vercel** (Recommended):
```bash
npm install -g vercel
vercel --prod
```

2. **Configure Environment Variables** in Vercel dashboard

3. **Set up Webhooks**:
   - LemonSqueezy: `https://yourdomain.com/api/payments/webhook`
   - Aurinko: `https://yourdomain.com/api/webhooks/aurinko`

4. **Configure OAuth Redirects**:
   - Aurinko: `https://yourdomain.com/api/auth/oauth`

## 🔧 Configuration

### Supabase Setup

1. Create a new Supabase project
2. Run migrations: `npm run migrate`
3. Set up RLS policies (included in migrations)
4. Configure Auth settings in Supabase dashboard

### LemonSqueezy Setup

1. Create products and variants for each plan
2. Set up webhook endpoint
3. Configure variant IDs in environment variables

### Aurinko Setup

1. Create Aurinko developer account
2. Set up OAuth application
3. Configure webhook endpoint

## 🔒 Security Features

### Data Protection
- **Encryption at Rest**: All sensitive data encrypted
- **Encryption in Transit**: HTTPS/TLS for all communications
- **Token Security**: OAuth tokens encrypted with AES-256-GCM
- **Input Validation**: Comprehensive input sanitization

### Access Control
- **Row Level Security**: Database-level access control
- **Role-Based Access**: Admin and user roles
- **API Authentication**: JWT-based API security
- **Rate Limiting**: Per-user API rate limits

## 📊 API Documentation

### Authentication
All API endpoints require authentication via Supabase Auth.

### Rate Limits
- **Email Generation**: 50 requests/minute per user
- **Email Sending**: Based on subscription plan
- **Analytics**: 100 requests/minute per user

### Webhooks
- **LemonSqueezy**: `/api/payments/webhook`
- **Aurinko**: `/api/webhooks/aurinko`
- **Email Tracking**: `/api/track/open`

## 🧪 Testing

### Run Tests
```bash
npm test
```

### Test Coverage
- Authentication flows
- Payment processing
- Email sending and tracking
- AI content generation
- Subscription management

## 📈 Monitoring

### Health Checks
- Database connectivity
- AI service availability
- Email service status
- Payment processing

### Analytics
- User engagement metrics
- Email performance tracking
- Subscription analytics
- System performance monitoring

## 🐛 Troubleshooting

### Common Issues

1. **OAuth Connection Fails**:
   - Verify redirect URIs match exactly
   - Check OAuth credentials
   - Ensure HTTPS in production

2. **Email Sending Issues**:
   - Verify SMTP credentials
   - Check rate limits
   - Monitor bounce rates

3. **Payment Issues**:
   - Verify LemonSqueezy webhook signatures
   - Check variant IDs
   - Monitor webhook delivery

## 📞 Support

- **Documentation**: [docs.warmuppro.com](https://docs.warmuppro.com)
- **Support Email**: support@warmuppro.com
- **Status Page**: [status.warmuppro.com](https://status.warmuppro.com)

## 📄 License

This project is proprietary software. All rights reserved.

---

**WarmupPro** - Boost Your Email Deliverability with AI