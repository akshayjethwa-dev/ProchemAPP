// src/config/plans.ts
import { PlanDetails } from '../types';

export const SUBSCRIPTION_PLANS: Record<'basic' | 'premium_growth', PlanDetails> = {
  basic: {
    id: 'basic',
    title: 'Basic Plan',
    price: 1999,
    tier: 'BASIC',
    duration: '1 Month',
    description: 'Complete standard access to the Prochem B2B chemical marketplace.',
    highlights: [
      'Verified chemical catalog & search',
      'Send direct RFQ & quotation requests',
      'Real-time price negotiation with suppliers',
      'Integrated transport & logistics booking',
      'Order tracking & digital GST invoices',
      'Standard customer care support'
    ]
  },
  premium_growth: {
    id: 'premium_growth',
    title: 'Premium Growth Plan',
    price: 4999,
    tier: 'GROWTH_PACKAGE',
    duration: '1 Month',
    description: 'All marketplace features plus high-volume leads, priority tools & dedicated promotion.',
    highlights: [
      'Everything in Basic Plan included',
      'Exclusive Premium Hub (Buyer & Seller leads)',
      'Compare products with 5+ verified companies',
      'Priority market leads & direct bulk buyer matching',
      'Dedicated Prochem relationship & account manager',
      'Direct WhatsApp & Email marketing broadcasts',
      '100% secure upfront payment assurance',
      'Priority freight coordination & fast-track dispatch'
    ]
  }
};
