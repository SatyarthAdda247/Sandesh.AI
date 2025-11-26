-- Additional tables and columns for MarCom Automation
-- Run this AFTER running the main migration

-- Create revenue_data table (used by the app)
CREATE TABLE IF NOT EXISTS public.revenue_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_date DATE NOT NULL,
  vertical TEXT NOT NULL,
  product_name TEXT,
  orders INTEGER DEFAULT 0,
  revenue DECIMAL(12,2) DEFAULT 0,
  course_type TEXT,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.revenue_data ENABLE ROW LEVEL SECURITY;

-- Add policy
CREATE POLICY "Revenue data viewable by authenticated"
  ON public.revenue_data FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage revenue data"
  ON public.revenue_data FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_revenue_data_date ON public.revenue_data(record_date);
CREATE INDEX IF NOT EXISTS idx_revenue_data_vertical ON public.revenue_data(vertical);

-- Add columns to suggestions table for additional metadata
ALTER TABLE public.suggestions
ADD COLUMN IF NOT EXISTS promo_code TEXT,
ADD COLUMN IF NOT EXISTS discount TEXT,
ADD COLUMN IF NOT EXISTS scheduled_time TEXT,
ADD COLUMN IF NOT EXISTS contact_number TEXT,
ADD COLUMN IF NOT EXISTS personalization_tokens TEXT[],
ADD COLUMN IF NOT EXISTS user_count INTEGER;

-- Grant permissions (important for anon key access with RLS)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Allow anon to insert into certain tables (needed for signup)
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated;

