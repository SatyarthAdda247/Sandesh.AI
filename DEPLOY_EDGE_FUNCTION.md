# Deploy Edge Function to Fix CORS Error

The CORS error happens because the Edge Function needs to be redeployed with the updated CORS headers.

## Option 1: Deploy via Supabase Dashboard (Easiest)

1. Go to https://supabase.com/dashboard/project/whbwtomonvwqybbmmcli/functions
2. Click on the `generate-comms` function
3. Click **"Deploy new version"**
4. Copy the entire contents of `supabase/functions/generate-comms/index.ts`
5. Paste it in the editor
6. Click **"Deploy"**

## Option 2: Deploy via Supabase CLI

### Install CLI (if not already installed):
```bash
brew install supabase/tap/supabase
```

### Login and Deploy:
```bash
cd "/Users/adda247/Downloads/MarCom Automation/sheet-spark-63"

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref whbwtomonvwqybbmmcli

# Deploy the function
supabase functions deploy generate-comms --no-verify-jwt
```

## What Was Fixed?

The Edge Function now includes proper CORS headers:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type`
- Handles OPTIONS preflight requests
- All responses (success, error, method not allowed) include CORS headers

## After Deployment

1. Refresh your browser
2. Try uploading files again
3. The CORS error should be resolved

