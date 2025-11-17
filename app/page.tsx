'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  Mail,
  TrendingUp,
  Shield,
  Zap,
  CheckCircle2,
  ArrowRight,
  BarChart3,
  Users,
  Globe,
  Star,
  Brain,
  Target,
  Clock,
  Sparkles,
  Lock,
  Activity,
  Award,
  Rocket,
  Eye,
  MessageSquare,
  DollarSign,
  Timer,
  Gauge,
  Verified,
  Menu,
  X
} from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        router.push('/dashboard');
      }
    };

    checkUser();
  }, [router, supabase]);

  const features = [
    {
      icon: <Brain className="h-8 w-8 text-blue-600" />,
      title: 'Smart Email Warmup',
      description: 'AI-powered email sequences that gradually build your sender reputation with intelligent conversation patterns',
      benefit: 'Increase inbox placement by 94%'
    },
    {
      icon: <Sparkles className="h-8 w-8 text-purple-600" />,
      title: 'AI-Powered Outreach',
      description: 'Send personalized emails to your prospect lists with AI-generated content that adapts to each recipient',
      benefit: '10x your outreach efficiency'
    },
    {
      icon: <Users className="h-8 w-8 text-indigo-600" />,
      title: 'Prospect Management',
      description: 'Import prospects from CSV or Google Sheets, segment lists, and track engagement across your campaigns',
      benefit: 'Organize unlimited prospects'
    },
    {
      icon: <Target className="h-8 w-8 text-orange-600" />,
      title: 'Outreach Analytics',
      description: 'Track opens, replies, and conversions for every outreach campaign with detailed prospect-level insights',
      benefit: 'Optimize conversion rates'
    },
    {
      icon: <BarChart3 className="h-8 w-8 text-green-600" />,
      title: 'Real-time Analytics',
      description: 'Track open rates, reply rates, and deliverability metrics in real-time with advanced reporting dashboard',
      benefit: 'Monitor performance instantly'
    },
    {
      icon: <Lock className="h-8 w-8 text-teal-600" />,
      title: 'Secure & Compliant',
      description: 'Bank-level security with encrypted OAuth connections and GDPR-compliant data handling',
      benefit: 'Enterprise-grade security'
    },
    {
      icon: <Zap className="h-8 w-8 text-yellow-600" />,
      title: 'Automated Campaigns',
      description: 'Set it and forget it - our AI handles warmup and outreach with intelligent scheduling',
      benefit: 'Save 10+ hours per week'
    },
    {
      icon: <Globe className="h-8 w-8 text-cyan-600" />,
      title: 'Multi-Provider Support',
      description: 'Works with Gmail, Outlook, and custom SMTP servers with provider-specific optimizations',
      benefit: 'Universal compatibility'
    }
  ];

  const howItWorks = [
    {
      step: 1,
      title: 'Connect Your Emails',
      description: 'Securely connect your Gmail, Outlook, or custom SMTP accounts with OAuth2 authentication',
      icon: <Mail className="h-10 w-10 text-blue-600" />,
      result: '2 minutes setup'
    },
    {
      step: 2,
      title: 'AI Analyzes & Plans',
      description: 'Our AI analyzes your sender reputation and creates personalized warmup sequences',
      icon: <Brain className="h-10 w-10 text-purple-600" />,
      result: 'Personalized strategy'
    },
    {
      step: 3,
      title: 'Automated Warmup',
      description: 'Smart algorithms send natural conversations to our warmup pool, gradually building trust',
      icon: <Zap className="h-10 w-10 text-orange-600" />,
      result: '24/7 automation'
    },
    {
      step: 4,
      title: 'Monitor & Optimize',
      description: 'Track deliverability improvements in real-time and optimize based on performance data',
      icon: <TrendingUp className="h-10 w-10 text-green-600" />,
      result: '94% inbox rate'
    }
  ];

  const testimonials = [
    {
      name: 'Sarah Johnson',
      role: 'Marketing Director',
      company: 'TechCorp',
      content: 'WarmupPro increased our email deliverability by 40% in just 2 weeks. The AI-generated content is incredibly natural.',
      rating: 5,
      avatar: 'SJ',
      result: '40% increase in deliverability'
    },
    {
      name: 'Michael Chen',
      role: 'Sales Manager',
      company: 'GrowthCo',
      content: 'The analytics dashboard gives us insights we never had before. Our cold email campaigns are now consistently hitting the inbox.',
      rating: 5,
      avatar: 'MC',
      result: '3x more inbox placement'
    },
    {
      name: 'Emily Rodriguez',
      role: 'Founder',
      company: 'StartupXYZ',
      content: 'Simple setup, powerful results. Our sender reputation went from poor to excellent in under a month.',
      rating: 5,
      avatar: 'ER',
      result: 'Poor to excellent in 30 days'
    }
  ];

  const stats = [
    { value: '94%', label: 'Average Inbox Rate', icon: <Eye className="h-6 w-6 text-green-600" /> },
    { value: '2.3x', label: 'Open Rate Increase', icon: <MessageSquare className="h-6 w-6 text-blue-600" /> },
    { value: '15 Days', label: 'Average Warmup Time', icon: <Timer className="h-6 w-6 text-purple-600" /> },
    { value: '$2.4M', label: 'Revenue Protected', icon: <DollarSign className="h-6 w-6 text-orange-600" /> }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Navigation */}
      <nav className="bg-white/95 backdrop-blur-md border-b border-gray-200/50 dark:bg-gray-900/95 dark:border-gray-700/50 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="w-10 h-10 min-w-[2.5rem] bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <Mail className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                WarmupPro
              </span>
              <Badge className="hidden sm:inline-flex bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 text-xs px-2 py-1">
                AI-Powered
              </Badge>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-4">
              <Link
                href="/auth/login"
                className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors font-medium min-h-[44px] flex items-center px-3"
              >
                Sign In
              </Link>
              <Link href="/auth/signup">
                <Button className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 hover:from-blue-700 hover:via-purple-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-200 min-h-[44px] min-w-[44px]">
                  Start Free Trial
                </Button>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px]">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                <div className="flex flex-col space-y-6 mt-8">
                  <div className="flex items-center space-x-3 pb-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                      <Mail className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                      WarmupPro
                    </span>
                  </div>
                  <Link
                    href="/auth/login"
                    className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors font-medium text-lg min-h-[44px] flex items-center"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Sign In
                  </Link>
                  <Link href="/auth/signup" onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 hover:from-blue-700 hover:via-purple-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-200 min-h-[44px]">
                      Start Free Trial
                    </Button>
                  </Link>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-purple-600/5 to-indigo-600/5"></div>
        <div className="max-w-7xl mx-auto text-center relative">
          <div className="mb-8">
            <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-full text-blue-800 dark:text-blue-300 text-sm font-semibold mb-8 shadow-lg">
              <Sparkles className="h-5 w-5 mr-2" />
              #1 AI-Powered Email Warmup Platform
              <Award className="h-5 w-5 ml-2" />
            </div>
            <h1 className="text-6xl md:text-7xl font-bold text-gray-900 dark:text-white mb-8 leading-tight">
              Warm Up Your Emails,
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent block mt-2">
                Then Close More Deals
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-10 max-w-4xl mx-auto leading-relaxed">
              AI-powered email warmup + personalized outreach campaigns.
              <strong className="text-gray-900 dark:text-white"> Build reputation, reach prospects, and track results</strong>—all in one platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center mb-8">
              <Link href="/auth/signup" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 hover:from-blue-700 hover:via-purple-700 hover:to-indigo-700 text-base sm:text-lg px-8 sm:px-10 min-h-[44px] py-3 sm:py-4 shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105">
                  Start Free Trial
                  <ArrowRight className="ml-2 sm:ml-3 h-5 w-5 sm:h-6 sm:w-6" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="w-full sm:w-auto text-base sm:text-lg px-8 sm:px-10 min-h-[44px] py-3 sm:py-4 border-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200">
                <Eye className="mr-2 sm:mr-3 h-5 w-5 sm:h-6 sm:w-6" />
                Watch Demo
              </Button>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-8 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0" />
                <span>10-day free trial (up to 5 emails)</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0" />
                <span>Cancel anytime</span>
              </div>
            </div>
          </div>

          {/* Results Showcase */}
          <div className="mt-20 relative">
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-3xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 p-8 max-w-6xl mx-auto">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 md:gap-8 mb-12">
                {stats.map((stat, index) => (
                  <Card key={index} className="border-0 shadow-lg bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
                    <CardContent className="p-4 sm:p-6 text-center">
                      <div className="flex justify-center mb-2 sm:mb-3">{stat.icon}</div>
                      <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1 sm:mb-2">{stat.value}</div>
                      <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">{stat.label}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Process Flow Visualization */}
              <div className="relative">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 text-center">
                  How WarmupPro Transforms Your Email Deliverability
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
                  {howItWorks.map((step, index) => (
                    <div key={step.step} className="relative">
                      <div className="text-center">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r rounded-2xl flex items-center justify-center mb-4 sm:mb-6 mx-auto shadow-xl relative">
                          {step.icon}
                          <div className="absolute -top-2 -right-2 sm:-top-3 sm:-right-3 w-7 h-7 sm:w-8 sm:h-8 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold text-blue-600 shadow-lg border-2 border-blue-200">
                            {step.step}
                          </div>
                        </div>
                        <h4 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-2 sm:mb-3">
                          {step.title}
                        </h4>
                        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mb-3 sm:mb-4 leading-relaxed">
                          {step.description}
                        </p>
                        <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 text-xs sm:text-sm">
                          {step.result}
                        </Badge>
                      </div>
                      {index < howItWorks.length - 1 && (
                        <div className="hidden md:block absolute top-10 left-full w-full">
                          <ArrowRight className="h-6 w-6 text-gray-400 mx-auto" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-white dark:bg-gray-800 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-50/30 to-transparent dark:via-blue-900/10"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-20">
            <Badge className="bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0 px-4 py-2 mb-6">
              Complete Solution
            </Badge>
            <h2 className="text-5xl font-bold text-gray-900 dark:text-white mb-6">
              Everything You Need for Email Success
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              From warming up new accounts to sending personalized outreach campaigns—our all-in-one platform handles it all
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300 bg-white/90 backdrop-blur-sm dark:bg-gray-700/90 group hover:scale-105">
                <CardContent className="p-8">
                  <div className="flex items-center space-x-4 mb-6">
                    <div className="w-16 h-16 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-600 dark:to-gray-700 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                      {feature.icon}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        {feature.title}
                      </h3>
                      <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 text-xs mt-1">
                        {feature.benefit}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24 bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 dark:from-gray-900 dark:via-blue-950/20 dark:to-purple-950/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 px-4 py-2 mb-6">
              Simple & Transparent
            </Badge>
            <h2 className="text-5xl font-bold text-gray-900 dark:text-white mb-6">
              All-Inclusive Pricing
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Start with a 10-day free trial. Then pay per email account—warmup, outreach, and all features included. No hidden fees, no per-email charges.
            </p>
          </div>

                 <div className="max-w-6xl mx-auto">
                    {/* Bundle Pricing Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
                       {/* Starter Bundle */}
                       <Card className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300 bg-white dark:bg-gray-800">
                          <CardContent className="p-6 text-center">
                             <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                Starter
                             </h3>
                             <div className="mb-4">
                                <span className="text-4xl font-bold text-gray-900 dark:text-white">
                                   $5
                                </span>
                                <span className="text-gray-600 dark:text-gray-300 text-sm">/month</span>
                             </div>
                             <div className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                                $5.00 per email
                             </div>
                             <Badge className="bg-blue-100 text-blue-800 border-0 mb-4">
                                1 Email Account
                             </Badge>
                             <ul className="space-y-2 mb-6 text-left text-sm">
                                <li className="flex items-center space-x-2">
                                   <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                                   <span className="text-gray-700 dark:text-gray-300">Unlimited warmup</span>
                                </li>
                                <li className="flex items-center space-x-2">
                                   <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                                   <span className="text-gray-700 dark:text-gray-300">Unlimited outreach</span>
                                </li>
                                <li className="flex items-center space-x-2">
                                   <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                                   <span className="text-gray-700 dark:text-gray-300">AI personalization</span>
                                </li>
                                <li className="flex items-center space-x-2">
                                   <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                                   <span className="text-gray-700 dark:text-gray-300">10-day free trial</span>
                                </li>
                             </ul>
                          </CardContent>
                       </Card>

                       {/* Growth Bundle - Popular */}
                       <Card className="border-0 shadow-2xl hover:shadow-3xl transition-all duration-300 relative transform scale-105 bg-gradient-to-b from-blue-50 via-purple-50/50 to-indigo-50 dark:from-blue-950/30 dark:via-purple-950/20 dark:to-indigo-950/30 ring-4 ring-blue-500/50">
                          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                             <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 px-4 py-1">
                                Most Popular
                             </Badge>
                          </div>
                          <CardContent className="p-6 text-center">
                             <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                Growth
                             </h3>
                             <div className="mb-2">
                                <span className="text-4xl font-bold text-gray-900 dark:text-white">
                                   $10
                                </span>
                                <span className="text-gray-600 dark:text-gray-300 text-sm">/month</span>
                             </div>
                             <div className="text-sm text-gray-500 dark:text-gray-400 line-through mb-1">
                                Regular: $15
                             </div>
                             <div className="text-sm text-green-600 font-semibold mb-4">
                                $3.33 per email • Save 33%
                             </div>
                             <Badge className="bg-blue-100 text-blue-800 border-0 mb-4">
                                3 Email Accounts
                             </Badge>
                             <ul className="space-y-2 mb-6 text-left text-sm">
                                <li className="flex items-center space-x-2">
                                   <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                                   <span className="text-gray-700 dark:text-gray-300">Unlimited warmup</span>
                                </li>
                                <li className="flex items-center space-x-2">
                                   <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                                   <span className="text-gray-700 dark:text-gray-300">Unlimited outreach</span>
                                </li>
                                <li className="flex items-center space-x-2">
                                   <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                                   <span className="text-gray-700 dark:text-gray-300">AI personalization</span>
                                </li>
                                <li className="flex items-center space-x-2">
                                   <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                                   <span className="text-gray-700 dark:text-gray-300">10-day free trial</span>
                                </li>
                                <li className="flex items-center space-x-2">
                                   <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                                   <span className="text-gray-700 dark:text-gray-300 font-semibold">Save $5/month</span>
                                </li>
                             </ul>
                          </CardContent>
                       </Card>

                       {/* Professional Bundle */}
                       <Card className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300 bg-white dark:bg-gray-800">
                          <CardContent className="p-6 text-center">
                             <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                Professional
                             </h3>
                             <div className="mb-2">
                                <span className="text-4xl font-bold text-gray-900 dark:text-white">
                                   $15
                                </span>
                                <span className="text-gray-600 dark:text-gray-300 text-sm">/month</span>
                             </div>
                             <div className="text-sm text-gray-500 dark:text-gray-400 line-through mb-1">
                                Regular: $25
                             </div>
                             <div className="text-sm text-green-600 font-semibold mb-4">
                                $3.00 per email • Save 40%
                             </div>
                             <Badge className="bg-blue-100 text-blue-800 border-0 mb-4">
                                5 Email Accounts
                             </Badge>
                             <ul className="space-y-2 mb-6 text-left text-sm">
                                <li className="flex items-center space-x-2">
                                   <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                                   <span className="text-gray-700 dark:text-gray-300">Unlimited warmup</span>
                                </li>
                                <li className="flex items-center space-x-2">
                                   <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                                   <span className="text-gray-700 dark:text-gray-300">Unlimited outreach</span>
                                </li>
                                <li className="flex items-center space-x-2">
                                   <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                                   <span className="text-gray-700 dark:text-gray-300">AI personalization</span>
                                </li>
                                <li className="flex items-center space-x-2">
                                   <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                                   <span className="text-gray-700 dark:text-gray-300">10-day free trial</span>
                                </li>
                                <li className="flex items-center space-x-2">
                                   <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                                   <span className="text-gray-700 dark:text-gray-300 font-semibold">Save $10/month</span>
                                </li>
                             </ul>
                          </CardContent>
                       </Card>

                       {/* Business Bundle */}
                       <Card className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300 bg-white dark:bg-gray-800">
                          <CardContent className="p-6 text-center">
                             <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                Business
                             </h3>
                             <div className="mb-2">
                                <span className="text-4xl font-bold text-gray-900 dark:text-white">
                                   $25
                                </span>
                                <span className="text-gray-600 dark:text-gray-300 text-sm">/month</span>
                             </div>
                             <div className="text-sm text-gray-500 dark:text-gray-400 line-through mb-1">
                                Regular: $50
                             </div>
                             <div className="text-sm text-green-600 font-semibold mb-4">
                                $2.50 per email • Save 50%
                             </div>
                             <Badge className="bg-blue-100 text-blue-800 border-0 mb-4">
                                10 Email Accounts
                             </Badge>
                             <ul className="space-y-2 mb-6 text-left text-sm">
                                <li className="flex items-center space-x-2">
                                   <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                                   <span className="text-gray-700 dark:text-gray-300">Unlimited warmup</span>
                                </li>
                                <li className="flex items-center space-x-2">
                                   <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                                   <span className="text-gray-700 dark:text-gray-300">Unlimited outreach</span>
                                </li>
                                <li className="flex items-center space-x-2">
                                   <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                                   <span className="text-gray-700 dark:text-gray-300">AI personalization</span>
                                </li>
                                <li className="flex items-center space-x-2">
                                   <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                                   <span className="text-gray-700 dark:text-gray-300">10-day free trial</span>
                                </li>
                                <li className="flex items-center space-x-2">
                                   <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                                   <span className="text-gray-700 dark:text-gray-300 font-semibold">Save $25/month</span>
                                </li>
                             </ul>
                          </CardContent>
                       </Card>
                    </div>

                    {/* CTA Button */}
                    <div className="text-center">
                       <Link href="/auth/signup" className="inline-block w-full sm:w-auto">
                          <Button
                             className="w-full sm:w-auto min-h-[44px] py-3 sm:py-4 px-8 sm:px-12 text-base sm:text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 hover:from-blue-700 hover:via-purple-700 hover:to-indigo-700"
                          >
                             Start Your Free Trial
                             <Rocket className="ml-2 h-5 w-5" />
                          </Button>
                       </Link>
                       <p className="text-gray-600 dark:text-gray-300 mt-4 text-xs sm:text-sm px-4">
                          Need a custom quantity? No problem! Choose any number of emails after signup.
                       </p>
                    </div>
          </div>

          <div className="text-center mt-12 sm:mt-16">
            <p className="text-gray-600 dark:text-gray-300 mb-6 text-sm sm:text-base lg:text-lg px-4">
                       All subscriptions include: Enterprise security, 99.9% uptime SLA, and 24/7 priority support
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center space-x-2">
                <Shield className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                <span>Bank-Level Security</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                <span>24/7 Support</span>
              </div>
              <div className="flex items-center space-x-2">
                <Verified className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                <span>99.9% Uptime SLA</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="py-24 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold mb-6">
            Trusted by 10,000+ Businesses Worldwide
          </h2>
          <p className="text-xl text-blue-100 mb-12">
            Join the companies already dominating their email deliverability
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="border-0 shadow-2xl bg-white/95 backdrop-blur-sm text-gray-900">
                <CardContent className="p-6 sm:p-8">
                  <div className="flex items-center mb-4 sm:mb-6">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-gray-600 mb-4 sm:mb-6 italic text-base sm:text-lg leading-relaxed">
                    "{testimonial.content}"
                  </p>
                  <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 mb-4 text-xs sm:text-sm">
                    {testimonial.result}
                  </Badge>
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-500 rounded-full flex items-center justify-center shadow-lg">
                      <span className="text-white font-bold">{testimonial.avatar}</span>
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-gray-900">
                        {testimonial.name}
                      </p>
                      <p className="text-sm text-gray-600">
                        {testimonial.role} at {testimonial.company}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-indigo-600/20"></div>
        <div className="max-w-5xl mx-auto text-center px-4 sm:px-6 lg:px-8 relative">
          <h2 className="text-5xl font-bold mb-6">
            Ready to Dominate Your Email Deliverability?
          </h2>
          <p className="text-2xl text-blue-100 mb-10 leading-relaxed">
            Join 10,000+ businesses already using WarmupPro to achieve 94% inbox rates
          </p>
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center mb-8">
            <Link href="/auth/signup" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto bg-white text-gray-900 hover:bg-gray-100 text-base sm:text-xl px-8 sm:px-12 min-h-[44px] py-3 sm:py-5 shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105">
                Start Your Free Trial
                <ArrowRight className="ml-2 sm:ml-3 h-5 w-5 sm:h-6 sm:w-6" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="w-full sm:w-auto text-white border-white hover:bg-white/10 text-base sm:text-xl px-8 sm:px-12 min-h-[44px] py-3 sm:py-5 transition-all duration-200">
              <Eye className="mr-2 sm:mr-3 h-5 w-5 sm:h-6 sm:w-6" />
              Schedule Demo
            </Button>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-8 text-blue-100 text-xs sm:text-sm">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
              <span>10-day free trial</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
            <div className="sm:col-span-2 md:col-span-1">
              <div className="flex items-center space-x-3 mb-4 sm:mb-6">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-xl flex items-center justify-center">
                  <Mail className="h-6 w-6 text-white" />
                </div>
                <span className="text-xl sm:text-2xl font-bold">WarmupPro</span>
              </div>
              <p className="text-gray-400 leading-relaxed text-sm sm:text-base">
                The most advanced AI-powered email warmup platform for businesses of all sizes.
              </p>
            </div>
            <div>
              <h3 className="font-bold mb-4 sm:mb-6 text-base sm:text-lg">Product</h3>
              <ul className="space-y-2 sm:space-y-3 text-gray-400 text-sm sm:text-base">
                <li><a href="#features" className="hover:text-white transition-colors min-h-[44px] inline-flex items-center">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors min-h-[44px] inline-flex items-center">Pricing</a></li>
                <li><a href="/docs" className="hover:text-white transition-colors min-h-[44px] inline-flex items-center">API Docs</a></li>
                <li><a href="/integrations" className="hover:text-white transition-colors min-h-[44px] inline-flex items-center">Integrations</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-4 sm:mb-6 text-base sm:text-lg">Company</h3>
              <ul className="space-y-2 sm:space-y-3 text-gray-400 text-sm sm:text-base">
                <li><a href="/about" className="hover:text-white transition-colors min-h-[44px] inline-flex items-center">About</a></li>
                <li><a href="/blog" className="hover:text-white transition-colors min-h-[44px] inline-flex items-center">Blog</a></li>
                <li><a href="/careers" className="hover:text-white transition-colors min-h-[44px] inline-flex items-center">Careers</a></li>
                <li><a href="/contact" className="hover:text-white transition-colors min-h-[44px] inline-flex items-center">Contact</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-4 sm:mb-6 text-base sm:text-lg">Legal</h3>
              <ul className="space-y-2 sm:space-y-3 text-gray-400 text-sm sm:text-base">
                <li><Link href="/terms" className="hover:text-white transition-colors min-h-[44px] inline-flex items-center">Terms of Service</Link></li>
                <li><Link href="/privacy" className="hover:text-white transition-colors min-h-[44px] inline-flex items-center">Privacy Policy</Link></li>
                <li><Link href="/unsubscribe" className="hover:text-white transition-colors min-h-[44px] inline-flex items-center">Unsubscribe</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 sm:mt-12 pt-6 sm:pt-8 text-center text-gray-400 text-xs sm:text-sm">
            <p>&copy; 2025 WarmupPro. All rights reserved. Built with ❤️ for email marketers.</p>
          </div>
        </div>
      </footer>
    </div>
     </div>
  );
}
