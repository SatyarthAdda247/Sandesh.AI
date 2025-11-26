#!/bin/bash
# Deploy Supabase Edge Function

echo "🚀 Deploying Supabase Edge Function with CORS Fix"
echo "=================================================="
echo ""

# Check if logged in
if ! supabase projects list &> /dev/null; then
    echo "❌ Not logged in to Supabase CLI"
    echo ""
    echo "Please run one of these:"
    echo "  1. Get token from: https://supabase.com/dashboard/account/tokens"
    echo "  2. Then run: supabase login --token YOUR_TOKEN"
    echo ""
    echo "Or set environment variable:"
    echo "  export SUPABASE_ACCESS_TOKEN=your_token_here"
    echo "  supabase login"
    exit 1
fi

echo "✅ Logged in to Supabase"
echo ""

# Link project if not already linked
if [ ! -f ".supabase/project-ref" ]; then
    echo "🔗 Linking to project..."
    supabase link --project-ref whbwtomonvwqybbmmcli
    echo ""
fi

echo "📤 Deploying generate-comms function..."
supabase functions deploy generate-comms --no-verify-jwt

if [ $? -eq 0 ]; then
    echo ""
    echo "=================================================="
    echo "✅ Function deployed successfully!"
    echo "=================================================="
    echo ""
    echo "The CORS error should now be fixed."
    echo "Refresh your app and try uploading files again."
else
    echo ""
    echo "❌ Deployment failed"
    echo ""
    echo "Try deploying manually via dashboard:"
    echo "https://supabase.com/dashboard/project/whbwtomonvwqybbmmcli/functions"
fi

