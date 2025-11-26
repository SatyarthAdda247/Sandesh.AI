# Supabase CLI Setup Guide for Sandesh.ai

## Quick Setup (2 Commands)

### Step 1: Get Your Access Token

1. Go to: https://supabase.com/dashboard/account/tokens
2. Click **"Generate new token"**
3. Give it a name (e.g., "Sandesh.ai CLI")
4. Copy the token

### Step 2: Run Setup Script

```bash
cd "/Users/adda247/Downloads/MarCom Automation/sheet-spark-63"

# Set your token (paste your actual token)
export SUPABASE_ACCESS_TOKEN=paste_your_token_here

# Run automated setup
./supabase-cli-setup.sh
```

**That's it!** The script will:
- ✅ Login to Supabase CLI
- ✅ Link to your project (xvwtxobrztdepzxveyrs)
- ✅ Deploy Edge Function with CORS fixes
- ✅ Verify everything is working

---

## Manual Setup (if you prefer)

### 1. Login

```bash
# Get token from: https://supabase.com/dashboard/account/tokens
supabase login --token YOUR_TOKEN_HERE
```

### 2. Link Project

```bash
cd "/Users/adda247/Downloads/MarCom Automation/sheet-spark-63"
supabase link --project-ref xvwtxobrztdepzxveyrs
```

When prompted for database password:
- If you don't remember it, you can reset it in Supabase Dashboard → Settings → Database

### 3. Deploy Edge Function

```bash
supabase functions deploy generate-comms --no-verify-jwt
```

This deploys the `generate-comms` function with CORS headers to fix the CORS error.

---

## Verify It's Working

### Check Function Status
```bash
supabase functions list
```

### View Function Logs
```bash
supabase functions logs generate-comms
```

### Check Project Status
```bash
supabase status
```

---

## What Gets Configured

✅ **Edge Function Deployed:**
- `generate-comms` with CORS support
- Analyzes campaign sheets
- Generates AI-powered suggestions
- Stores results in database

✅ **Project Linked:**
- CLI connected to: `xvwtxobrztdepzxveyrs`
- Can now deploy, view logs, manage database

---

## After Setup

1. **Refresh your app:** http://localhost:4546
2. **Sign up** for an account (first user is admin)
3. **Go to Data page**
4. **Click "Load Pre-Analyzed Data"**
5. ✅ **Start using Sandesh.ai!**

---

## Troubleshooting

### "Not logged in" error
```bash
# Check if you have a token set
echo $SUPABASE_ACCESS_TOKEN

# If empty, get token from: https://supabase.com/dashboard/account/tokens
export SUPABASE_ACCESS_TOKEN=your_token_here
```

### "Database password required" error
- Go to: https://supabase.com/dashboard/project/xvwtxobrztdepzxveyrs/settings/database
- Click "Reset database password"
- Use the new password when prompted

### "Function deployment failed" error
- Check you have the correct files:
  - `supabase/functions/generate-comms/index.ts`
  - `supabase/functions/generate-comms/analyzer.ts`
  - `supabase/functions/generate-comms/s3.ts`
- Try deploying manually via Dashboard

---

## Useful CLI Commands

```bash
# View project info
supabase projects list

# View function logs (real-time)
supabase functions logs generate-comms --follow

# Check database migrations
supabase db diff

# Reset database (DANGER - deletes all data!)
supabase db reset

# Generate TypeScript types from database
supabase gen types typescript --local > src/types/database.ts
```

---

## Alternative: Deploy via Dashboard

If CLI gives issues, deploy manually:

1. Go to: https://supabase.com/dashboard/project/xvwtxobrztdepzxveyrs/functions
2. Click **"New Edge Function"** or select existing `generate-comms`
3. Copy content from `supabase/functions/generate-comms/index.ts`
4. Paste and click **"Deploy"**

This achieves the same result as CLI deployment.

