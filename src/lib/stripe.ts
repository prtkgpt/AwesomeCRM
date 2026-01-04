import Stripe from 'stripe';

// Make Stripe optional for development - only initialize if key is provided
export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
      typescript: true,
    })
  : null;

export const stripePublishableKey = process.env.STRIPE_PUBLISHABLE_KEY || '';
