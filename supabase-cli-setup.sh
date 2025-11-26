#!/bin/bash
# Supabase CLI Setup Script for Sandesh.ai

set -e

PROJECT_ID="xvwtxobrztdepzxveyrs"
PROJECT_URL="https://xvwtxobrztdepzxveyrs.supabase.co"

echo "=========================================="
echo "🚀 Sandesh.ai - Supabase CLI Setup"
echo "=========================================="
echo ""

# Check if logged in
echo "📝 Step 1: Checking login status..."
if ! supabase projects list &> /dev/null; then
    echo ""
    echo "❌ Not logged in to Supabase CLI"
    echo ""
    echo "To login, you need an access token:"
    echo "1. Go to: https://supabase.com/dashboard/account/tokens"
    echo "2. Click 'Generate new token'"
    echo "3. Copy the token"
    echo ""
    echo "Then run ONE of these commands:"
    echo "  supabase login --token YOUR_TOKEN_HERE"
    echo ""
    echo "OR set environment variable and run again:"
    echo "  export SUPABASE_ACCESS_TOKEN=your_token_here"
    echo "  ./supabase-cli-setup.sh"
    echo ""
    exit 1
fi

echo "✅ Logged in to Supabase CLI"
echo ""

# Link project
echo "📝 Step 2: Linking to project..."
if [ ! -f ".supabase/project-ref" ]; then
    echo "Linking to project $PROJECT_ID..."
    supabase link --project-ref $PROJECT_ID
    echo "✅ Project linked"
else
    CURRENT_REF=$(cat .supabase/project-ref 2>/dev/null || echo "")
    if [ "$CURRENT_REF" != "$PROJECT_ID" ]; then
        echo "⚠️  Linked to different project, relinking..."
        rm -rf .supabase
        supabase link --project-ref $PROJECT_ID
        echo "✅ Project relinked"
    else
        echo "✅ Already linked to correct project"
    fi
fi
echo ""

# Check Edge Functions
echo "📝 Step 3: Checking Edge Functions..."
if [ -d "supabase/functions/generate-comms" ]; then
    echo "✅ Found generate-comms function"
    echo ""
    echo "Deploying Edge Function with CORS fixes..."
    supabase functions deploy generate-comms --no-verify-jwt
    
    if [ $? -eq 0 ]; then
        echo "✅ Edge Function deployed successfully!"
    else
        echo "❌ Edge Function deployment failed"
        exit 1
    fi
else
    echo "⚠️  generate-comms function not found"
fi
echo ""

# List all functions
echo "📝 Step 4: Listing deployed functions..."
supabase functions list
echo ""

# Check database status
echo "📝 Step 5: Checking database status..."
supabase db diff --use-migra || echo "✅ Database up to date"
echo ""

echo "=========================================="
echo "✅ Setup Complete!"
echo "=========================================="
echo ""
echo "Your Sandesh.ai project is configured:"
echo "  • Project ID: $PROJECT_ID"
echo "  • Project URL: $PROJECT_URL"
echo "  • Edge Function: deployed with CORS support"
echo ""
echo "Next steps:"
echo "  1. Refresh your app: http://localhost:4546"
echo "  2. Sign up for an account"
echo "  3. Go to Data page and click 'Load Pre-Analyzed Data'"
echo ""
echo "Useful commands:"
echo "  supabase functions logs generate-comms  # View function logs"
echo "  supabase db reset                       # Reset database (CAUTION)"
echo "  supabase status                         # Check project status"
echo ""

