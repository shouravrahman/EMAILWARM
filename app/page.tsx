'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  Verified
} from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();
  const supabase = createClient();

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
      icon: <BarChart3 className="h-8 w-8 text-green-600" />,
      title: 'Real-time Analytics',
      description: 'Track open rates, reply rates, and deliverability metrics in real-time with advanced reporting dashboard',
      benefit: 'Monitor performance instantly'
    },
    {
      icon: <Lock className="h-8 w-8 text-purple-600" />,
      title: 'Secure OAuth',
      description: 'Bank-level security with encrypted OAuth connections to your email accounts using AES-256 encryption',
      benefit: 'Enterprise-grade security'
    },
    {
      icon: <Target className="h-8 w-8 text-orange-600" />,
      title: 'Automated Campaigns',
      description: 'Set it and forget it - our AI handles the entire warmup process with intelligent scheduling',
      benefit: 'Save 10+ hours per week'
    },
    {
      icon: <TrendingUp className="h-8 w-8 text-indigo-600" />,
      title: 'Advanced Reporting',
      description: 'Comprehensive reports and insights to optimize your email performance with actionable recommendations',
      benefit: 'Optimize for maximum ROI'
    },
    {
      icon: <Globe className="h-8 w-8 text-teal-600" />,
      title: 'Multi-Provider Support',
      description: 'Works with Gmail, Outlook, and custom SMTP servers with provider-specific optimizations',
      benefit: 'Universal compatibility'
    }
  ];

  const pricingPlans = [
    {
      name: 'Starter',
      price: 15,
      yearlyPrice: 150,
      description: 'Perfect for individuals and small teams',
      features: [
        '3 Email Accounts',
        '150 Emails/Day',
        'AI-Powered Content',
        'Real-time Analytics',
        'Email Support',
        'Gmail & Outlook Support'
      ],
      popular: false,
      cta: 'Start Free Trial',
      savings: 'Save $30/year'
    },
    {
      name: 'Professional',
      price: 39,
      yearlyPrice: 390,
      description: 'Ideal for growing businesses',
      features: [
        '10 Email Accounts',
        '1,000 Emails/Day',
        'Advanced AI Content',
        'Real-time Analytics',
        'Priority Support',
        'Custom Templates',
        'Advanced Reporting',
        'API Access'
      ],
      popular: true,
      cta: 'Start Free Trial',
      savings: 'Save $78/year'
    },
    {
      name: 'Enterprise',
      price: 99,
      yearlyPrice: 990,
      description: 'For large organizations',
      features: [
        '50 Email Accounts',
        '5,000 Emails/Day',
        'Premium AI Content',
        'White-label Option',
        'API Access',
        'Dedicated Support',
        'Custom Integrations',
        'SLA Guarantee'
      ],
      popular: false,
      cta: 'Contact Sales',
      savings: 'Save $198/year'
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
      {/* Navigation */}
      <nav className="bg-white/95 backdrop-blur-md border-b border-gray-200/50 dark:bg-gray-900/95 dark:border-gray-700/50 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <Mail className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                WarmupPro
              </span>
              <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 text-xs px-2 py-1">
                AI-Powered
              </Badge>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/auth/login"
                className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors font-medium"
              >
                Sign In
              </Link>
              <Link href="/auth/signup">
                <Button className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 hover:from-blue-700 hover:via-purple-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-200">
                  Start Free Trial
                </Button>
              </Link>
            </div>
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
              Land in the
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent block mt-2">
                Inbox, Not Spam
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-10 max-w-4xl mx-auto leading-relaxed">
              Automatically warm up your email accounts with AI-generated conversations. 
              <strong className="text-gray-900 dark:text-white"> Increase deliverability by 94%</strong> and 
              <strong className="text-gray-900 dark:text-white"> boost open rates by 2.3x</strong> in just 15 days.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center mb-8">
              <Link href="/auth/signup">
                <Button size="lg" className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 hover:from-blue-700 hover:via-purple-700 hover:to-indigo-700 text-lg px-10 py-4 shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105">
                  Start Free Trial
                  <ArrowRight className="ml-3 h-6 w-6" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="text-lg px-10 py-4 border-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200">
                <Eye className="mr-3 h-6 w-6" />
                Watch Demo
              </Button>
            </div>
            <div className="flex items-center justify-center space-x-8 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span>14-day free trial</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span>Cancel anytime</span>
              </div>
            </div>
          </div>
          
          {/* Results Showcase */}
          <div className="mt-20 relative">
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-3xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 p-8 max-w-6xl mx-auto">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
                {stats.map((stat, index) => (
                  <Card key={index} className="border-0 shadow-lg bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
                    <CardContent className="p-6 text-center">
                      <div className="flex justify-center mb-3">{stat.icon}</div>
                      <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{stat.value}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">{stat.label}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              {/* Process Flow Visualization */}
              <div className="relative">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 text-center">
                  How WarmupPro Transforms Your Email Deliverability
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                  {howItWorks.map((step, index) => (
                    <div key={step.step} className="relative">
                      <div className="text-center">
                        <div className="w-20 h-20 bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-500 rounded-2xl flex items-center justify-center mb-6 mx-auto shadow-xl relative">
                          {step.icon}
                          <div className="absolute -top-3 -right-3 w-8 h-8 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center text-sm font-bold text-blue-600 shadow-lg border-2 border-blue-200">
                            {step.step}
                          </div>
                        </div>
                        <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                          {step.title}
                        </h4>
                        <p className="text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
                          {step.description}
                        </p>
                        <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0">
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
              Proven Results
            </Badge>
            <h2 className="text-5xl font-bold text-gray-900 dark:text-white mb-6">
              Everything You Need to Dominate Email Deliverability
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Our comprehensive platform provides all the tools you need to achieve inbox placement rates that your competitors can only dream of
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
              Unbeatable Value
            </Badge>
            <h2 className="text-5xl font-bold text-gray-900 dark:text-white mb-6">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Choose the plan that fits your needs. <strong>Up to 50% cheaper</strong> than competitors with better results.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <Card key={index} className={`border-0 shadow-2xl hover:shadow-3xl transition-all duration-300 relative transform hover:scale-105 ${
                plan.popular 
                  ? 'bg-gradient-to-b from-blue-50 via-purple-50/50 to-indigo-50 dark:from-blue-950/30 dark:via-purple-950/20 dark:to-indigo-950/30 ring-4 ring-blue-500/20' 
                  : 'bg-white/90 backdrop-blur-sm dark:bg-gray-800/90'
              }`}>
                {plan.popular && (
                  <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 text-white px-6 py-2 text-sm font-semibold shadow-lg">
                      <Star className="h-4 w-4 mr-2" />
                      Most Popular
                    </Badge>
                  </div>
                )}
                <CardContent className="p-8">
                  <div className="text-center mb-8">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                      {plan.name}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-6">
                      {plan.description}
                    </p>
                    <div className="mb-6">
                      <span className="text-5xl font-bold text-gray-900 dark:text-white">
                        ${plan.price}
                      </span>
                      <span className="text-gray-600 dark:text-gray-300 text-lg">/month</span>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                        or ${plan.yearlyPrice}/year
                      </p>
                      <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 text-xs">
                        {plan.savings}
                      </Badge>
                    </div>
                  </div>
                  
                  <ul className="space-y-4 mb-8">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center space-x-3">
                        <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                        <span className="text-gray-700 dark:text-gray-300 font-medium">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Link href="/auth/signup">
                    <Button 
                      className={`w-full py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 ${
                        plan.popular 
                          ? 'bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 hover:from-blue-700 hover:via-purple-700 hover:to-indigo-700' 
                          : 'bg-gray-900 hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100'
                      }`}
                    >
                      {plan.cta}
                      <Rocket className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="text-center mt-16">
            <p className="text-gray-600 dark:text-gray-300 mb-6 text-lg">
              All plans include: Enterprise security, 99.9% uptime SLA, and 24/7 priority support
            </p>
            <div className="flex items-center justify-center space-x-8 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Bank-Level Security</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5" />
                <span>24/7 Support</span>
              </div>
              <div className="flex items-center space-x-2">
                <Verified className="h-5 w-5" />
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
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="border-0 shadow-2xl bg-white/95 backdrop-blur-sm text-gray-900">
                <CardContent className="p-8">
                  <div className="flex items-center mb-6">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-gray-600 mb-6 italic text-lg leading-relaxed">
                    "{testimonial.content}"
                  </p>
                  <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 mb-4">
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
          <div className="flex flex-col sm:flex-row gap-6 justify-center mb-8">
            <Link href="/auth/signup">
              <Button size="lg" className="bg-white text-gray-900 hover:bg-gray-100 text-xl px-12 py-5 shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105">
                Start Your Free Trial
                <ArrowRight className="ml-3 h-6 w-6" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white hover:text-gray-900 text-xl px-12 py-5 transition-all duration-200">
              <Eye className="mr-3 h-6 w-6" />
              Schedule Demo
            </Button>
          </div>
          <div className="flex items-center justify-center space-x-8 text-blue-100 text-sm">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-5 w-5" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-5 w-5" />
              <span>14-day free trial</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-5 w-5" />
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-xl flex items-center justify-center">
                  <Mail className="h-6 w-6 text-white" />
                </div>
                <span className="text-2xl font-bold">WarmupPro</span>
              </div>
              <p className="text-gray-400 leading-relaxed">
                The most advanced AI-powered email warmup platform for businesses of all sizes.
              </p>
            </div>
            <div>
              <h3 className="font-bold mb-6 text-lg">Product</h3>
              <ul className="space-y-3 text-gray-400">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="/docs" className="hover:text-white transition-colors">API Docs</a></li>
                <li><a href="/integrations" className="hover:text-white transition-colors">Integrations</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-6 text-lg">Company</h3>
              <ul className="space-y-3 text-gray-400">
                <li><a href="/about" className="hover:text-white transition-colors">About</a></li>
                <li><a href="/blog" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="/careers" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="/contact" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-6 text-lg">Support</h3>
              <ul className="space-y-3 text-gray-400">
                <li><a href="/help" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="/docs" className="hover:text-white transition-colors">Documentation</a></li>
                <li><a href="/status" className="hover:text-white transition-colors">Status</a></li>
                <li><a href="/privacy" className="hover:text-white transition-colors">Privacy</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>&copy; 2025 WarmupPro. All rights reserved. Built with ❤️ for email marketers.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}