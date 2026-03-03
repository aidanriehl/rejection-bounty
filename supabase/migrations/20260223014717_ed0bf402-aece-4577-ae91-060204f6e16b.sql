
-- Create the update_updated_at_column function first
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Table to store Stripe Connect account info for users
CREATE TABLE public.stripe_connect_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  stripe_account_id TEXT NOT NULL,
  onboarding_complete BOOLEAN NOT NULL DEFAULT false,
  payouts_enabled BOOLEAN NOT NULL DEFAULT false,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.stripe_connect_accounts ENABLE ROW LEVEL SECURITY;

-- Users can view their own connect account
CREATE POLICY "Users can view their own connect account"
ON public.stripe_connect_accounts
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own connect account
CREATE POLICY "Users can insert their own connect account"
ON public.stripe_connect_accounts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own connect account
CREATE POLICY "Users can update their own connect account"
ON public.stripe_connect_accounts
FOR UPDATE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_stripe_connect_accounts_updated_at
BEFORE UPDATE ON public.stripe_connect_accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
