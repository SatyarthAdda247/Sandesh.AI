# Supabase CLI Setup & Deploy Guide

✅ **Supabase CLI is installed!** (v2.58.5)

## Step 1: Get Access Token

1. Go to: https://supabase.com/dashboard/account/tokens
2. Click **"Generate new token"**
3. Give it a name like "CLI Access"
4. Copy the token

## Step 2: Login to Supabase CLI

Open your terminal and run:

```bash
cd "/Users/adda247/Downloads/MarCom Automation/sheet-spark-63"

# Login using your token
supabase login --token YOUR_TOKEN_HERE
```

Or set it as an environment variable:

```bash
export SUPABASE_ACCESS_TOKEN=YOUR_TOKEN_HERE
supabase login
```

## Step 3: Link to Your Project

```bash
# Link to your existing project
supabase link --project-ref whbwtomonvwqybbmmcli
```

When prompted, you'll need your database password. If you don't remember it, you can reset it in the Supabase dashboard.

## Step 4: Deploy the Edge Function

```bash
# Deploy the generate-comms function with CORS fixes
supabase functions deploy generate-comms --no-verify-jwt
```

## Alternative: Deploy via Dashboard (No CLI Needed)

If you prefer not to use CLI:

1. Go to: https://supabase.com/dashboard/project/whbwtomonvwqybbmmcli/functions
2. Click on **"generate-comms"** function
3. Click **"Deploy new version"**
4. Copy the entire contents from: `supabase/functions/generate-comms/index.ts`
5. Paste into the editor
6. Click **"Deploy"**

This will fix the CORS error.

## Verify It Works

After deployment:
1. Refresh your app in the browser
2. Go to Data page
3. Try uploading CSV files
4. CORS error should be resolved ✅

---

## Quick Commands Reference

```bash
# Check version
supabase --version

# Login
supabase login

# Link project
supabase link --project-ref whbwtomonvwqybbmmcli

# Deploy function
supabase functions deploy generate-comms --no-verify-jwt

# List functions
supabase functions list

# View function logs
supabase functions logs generate-comms
```

