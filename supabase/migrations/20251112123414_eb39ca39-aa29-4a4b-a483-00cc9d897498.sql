-- Create app_role enum for role-based access control
CREATE TYPE public.app_role AS ENUM ('admin', 'marketer', 'viewer');

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Create profiles table for additional user info
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create verticals table
CREATE TABLE public.verticals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create revenue_records table
CREATE TABLE public.revenue_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vertical_id UUID REFERENCES public.verticals(id) ON DELETE CASCADE NOT NULL,
  record_date DATE NOT NULL,
  product_name TEXT NOT NULL,
  orders INTEGER NOT NULL DEFAULT 0,
  revenue DECIMAL(12,2) NOT NULL DEFAULT 0,
  course_type TEXT,
  source TEXT,
  offer_discount TEXT,
  metadata JSONB,
  upload_batch TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create live_events table
CREATE TABLE public.live_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vertical_id UUID REFERENCES public.verticals(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  importance INTEGER DEFAULT 1,
  source_url TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create offers table
CREATE TABLE public.offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vertical_id UUID REFERENCES public.verticals(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  link TEXT NOT NULL,
  type TEXT,
  price DECIMAL(10,2),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create suggestions table
CREATE TABLE public.suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_date DATE NOT NULL,
  vertical_id UUID REFERENCES public.verticals(id) ON DELETE CASCADE NOT NULL,
  hook TEXT NOT NULL,
  offer_id UUID REFERENCES public.offers(id) ON DELETE SET NULL,
  push_copy TEXT NOT NULL,
  cta TEXT NOT NULL,
  channel TEXT NOT NULL,
  urgency TEXT NOT NULL,
  link TEXT,
  score DECIMAL(5,3) NOT NULL,
  status TEXT DEFAULT 'pending',
  created_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  publish_payload JSONB,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create audits table
CREATE TABLE public.audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  object_type TEXT NOT NULL,
  object_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verticals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for profiles
CREATE POLICY "Profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- RLS Policies for verticals (readable by all authenticated, manageable by admins)
CREATE POLICY "Verticals viewable by authenticated"
  ON public.verticals FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage verticals"
  ON public.verticals FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for revenue_records
CREATE POLICY "Revenue records viewable by authenticated"
  ON public.revenue_records FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage revenue records"
  ON public.revenue_records FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for live_events
CREATE POLICY "Live events viewable by authenticated"
  ON public.live_events FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage live events"
  ON public.live_events FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for offers
CREATE POLICY "Offers viewable by authenticated"
  ON public.offers FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage offers"
  ON public.offers FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for suggestions
CREATE POLICY "Suggestions viewable by authenticated"
  ON public.suggestions FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins and marketers can create suggestions"
  ON public.suggestions FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'marketer')
  );

CREATE POLICY "Admins and marketers can update suggestions"
  ON public.suggestions FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'marketer')
  );

CREATE POLICY "Admins can delete suggestions"
  ON public.suggestions FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for audits
CREATE POLICY "Audits viewable by admins"
  ON public.audits FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "All authenticated users can insert audits"
  ON public.audits FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_suggestions_updated_at
  BEFORE UPDATE ON public.suggestions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Create trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert default verticals
INSERT INTO public.verticals (name) VALUES
  ('Banking'),
  ('SSC'),
  ('Railway'),
  ('Teaching'),
  ('Defence');

-- Create indexes for performance
CREATE INDEX idx_revenue_records_date ON public.revenue_records(record_date);
CREATE INDEX idx_revenue_records_vertical ON public.revenue_records(vertical_id);
CREATE INDEX idx_suggestions_date ON public.suggestions(suggestion_date);
CREATE INDEX idx_suggestions_vertical ON public.suggestions(vertical_id);
CREATE INDEX idx_suggestions_status ON public.suggestions(status);
CREATE INDEX idx_live_events_dates ON public.live_events(start_date, end_date);