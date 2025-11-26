# Setup New Supabase Project

✅ **Credentials Updated!** Your app is now configured to use the new project.

Project Details:
- **URL:** https://xvwtxobrztdepzxveyrs.supabase.co
- **Project ID:** xvwtxobrztdepzxveyrs

---

## Step 1: Set Up Database Tables

Go to your Supabase SQL Editor:
👉 https://supabase.com/dashboard/project/xvwtxobrztdepzxveyrs/sql/new

Copy and paste the entire migration file content from:
`supabase/migrations/20251112123414_eb39ca39-aa29-4a4b-a483-00cc9d897498.sql`

Then click **"Run"** to create all tables, policies, and indexes.

**OR** use CLI:

```bash
cd "/Users/adda247/Downloads/MarCom Automation/sheet-spark-63"

# Link to new project
supabase link --project-ref xvwtxobrztdepzxveyrs

# Push migration
supabase db push
```

---

## Step 2: Create Additional Tables

The migration creates most tables, but we also need:

```sql
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

-- Create index
CREATE INDEX idx_revenue_data_date ON public.revenue_data(record_date);
CREATE INDEX idx_revenue_data_vertical ON public.revenue_data(vertical);

-- Add columns to suggestions table for additional metadata
ALTER TABLE public.suggestions
ADD COLUMN IF NOT EXISTS promo_code TEXT,
ADD COLUMN IF NOT EXISTS discount TEXT,
ADD COLUMN IF NOT EXISTS scheduled_time TEXT,
ADD COLUMN IF NOT EXISTS contact_number TEXT,
ADD COLUMN IF NOT EXISTS personalization_tokens TEXT[],
ADD COLUMN IF NOT EXISTS user_count INTEGER;
```

Run this SQL in the SQL Editor too.

---

## Step 3: Deploy Edge Function with CORS Fix

```bash
cd "/Users/adda247/Downloads/MarCom Automation/sheet-spark-63"

# Login to Supabase (get token from https://supabase.com/dashboard/account/tokens)
export SUPABASE_ACCESS_TOKEN=your_token_here
supabase login

# Link project (if not already done)
supabase link --project-ref xvwtxobrztdepzxveyrs

# Deploy function
supabase functions deploy generate-comms --no-verify-jwt
```

**OR** deploy via Dashboard:
1. Go to: https://supabase.com/dashboard/project/xvwtxobrztdepzxveyrs/functions
2. Click **"New function"** 
3. Name: `generate-comms`
4. Copy content from `supabase/functions/generate-comms/index.ts`
5. Click **"Deploy"**

Also deploy the dependencies:
- Copy `supabase/functions/generate-comms/analyzer.ts`
- Copy `supabase/functions/generate-comms/s3.ts`

---

## Step 4: Restart Your App

```bash
cd "/Users/adda247/Downloads/MarCom Automation/sheet-spark-63"

# Stop current dev server (Ctrl+C)
# Then restart
npm run dev
```

---

## Step 5: Load Your Data

1. **Go to the app:** http://localhost:5173
2. **Sign up** for a new account (first user is automatically admin)
3. **Go to Data page**
4. Click **"Load Pre-Analyzed Data"** button
5. Wait for data to load

This will populate:
- ✅ Verticals
- ✅ Revenue data
- ✅ Campaign suggestions with all metadata

---

## Verify Everything Works

- Dashboard should show revenue charts
- Suggestions page should display campaigns
- You can delete, edit, and view details
- No more CORS errors! 🎉

---

## Quick Commands

```bash
# Check CLI version
supabase --version

# View project status
supabase projects list

# View function logs
supabase functions logs generate-comms

# Reset database (DANGER - deletes all data)
supabase db reset
```

