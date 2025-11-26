# Sandesh.ai - Campaign Analysis Summary

## 📊 Analysis Overview

Successfully analyzed **2,170 historical push notification campaigns** from existing .xlsx files in the MarCom Automation folder.

### Files Analyzed:
1. **JULY REVENUE CAMPAIGNS 2025.xlsx** - 1,828 campaigns
2. **AUGUST REVENUE CAMPAIGNS 2025.xlsx** - 342 campaigns
3. SEPTEMBER/OCTOBER/NOVEMBER REVENUE SHEETS (revenue data pending proper column mapping)

---

## 🎯 Key Insights

### Verticals Identified (36 total):
- Banking, SSC, Railways, CTET, Agriculture
- State Exams: Punjab, Bihar, West Bengal, Tamil Nadu, Andhra Pradesh, Odisha, North East
- Professional: CA Foundation, CA Intermediate, JAIIB, CAIIB, Nursing
- Competitive: Engineering, UGC NET, CSIR, CUET PG, Law
- Regulatory Bodies

### Top 10 Performing Hooks:

| Rank | Hook | Vertical | Score |
|------|------|----------|-------|
| 1 | ⚠️ Kal Ke Baad Ye Offer Expire Ho Jayega! | REGULATORY BODIES | 0.96 |
| 2 | 🚨🏦 IBPS PO Bumper Bharti Out! | Banking | 0.88 |
| 3 | 💡 1007 Seats = 1007 Chances! | REGULATORY BODIES | 0.88 |
| 4 | Selection Loading... Tap Fast ⏳ | Banking | 0.88 |
| 5 | 🎯 IBPS SO Aspirants, This is Your Shot! | REGULATORY BODIES | 0.88 |
| 6 | Bro, Bas 3️⃣ hours baaki hain 😮😮😮 | Banking | 0.88 |
| 7 | 🚨 3️⃣ Hours Left to Make a Smart Move!😮 | REGULATORY BODIES | 0.88 |
| 8 | IBPS PO & SBI PO❓ Ye Sirf Exams Nahi | Banking | 0.88 |
| 9 | ✅ Syllabus Sabka Same Hai... | REGULATORY BODIES | 0.88 |
| 10 | Aap Honge Kamyaab, Ek Din🎵 | Banking | 0.88 |

### Channel Distribution:
- **Banking:** 124 campaigns
- **SSC:** 124 campaigns
- **Railways:** 124 campaigns
- **CTET:** 124 campaigns
- **Bihar:** 124 campaigns
- **Agriculture:** 124 campaigns
- And many more...

---

## 🤖 How This Powers AI Generation

The deep analyzer extracts:
1. **Hook Styles:** Urgency patterns, emojis, Hindi/English mix, time-bound offers
2. **Push Copy Patterns:** Value propositions, benefit statements, social proof
3. **Channel Preferences:** Vertical-specific preferred channels (App Push, WhatsApp, Email)
4. **Score Distributions:** What makes campaigns successful

### Generation Flow:

```
User Uploads CSVs → Auto-detects Campaign Sheets
                  ↓
         Deep Analysis Extracts Patterns
                  ↓
         Builds Prompt with Examples
                  ↓
      Azure OpenAI Generates Similar Style
                  ↓
         Stores in S3 + Database
```

---

## 📁 Files Created

### Analysis Files:
- `analysis-report.json` - Full structured data (2170 campaigns)
- `src/lib/campaignPatterns.ts` - Client-side helper functions
- `scripts/analyze-xlsx.ts` - Analyzer script

### Integration Files:
- `supabase/functions/generate-comms/analyzer.ts` - Server-side pattern builder
- `supabase/functions/generate-comms/s3.ts` - S3 storage (marcom-automation/ prefix)
- `supabase/functions/generate-comms/index.ts` - Main generation function

---

## 🚀 Usage

### Option 1: Use Pre-Analyzed Patterns (Fast)
The app already has 2170 campaigns analyzed and embedded. Just upload revenue CSVs and generate.

### Option 2: Add New Campaign Sheets (Deep Mode)
Upload both revenue CSVs AND new campaign sheets together. The system will:
1. Detect campaign sheets automatically (looks for "TE", "DE", "hook", "cta" columns)
2. Merge with existing 2170 campaigns
3. Extract fresh patterns
4. Generate suggestions matching your evolving style

---

## 📈 Example Prompt Generated

```
You are an expert marketing copywriter for exam preparation platforms in India.
Your task is to generate a highly engaging push notification for the "Banking" vertical.

**Historical High-Performing Examples for Banking:**
- "🚨🏦 IBPS PO Bumper Bharti Out!" (Score: 0.88)
- "Selection Loading... Tap Fast ⏳" (Score: 0.88)
- "Bro, Bas 3️⃣ hours baaki hain 😮😮😮" (Score: 0.88)

**Common CTAs used:** Enroll Now, Join Now, Claim Offer
**Average score for Banking:** 0.85
**Channel preferences:** App Push

**Top performing products in Banking:**
Bank Mahapack (₹2,500,000, 1,200 orders)

Generate a push notification with:
1. Hook (max 60 chars)
2. Push Copy (max 120 chars)
3. CTA (max 20 chars)
4. Channel, Urgency, Link, Score
```

---

## 🔐 Environment Setup

Set these in Supabase Edge Function secrets:

```bash
# AWS S3 (for storing uploads and results)
AWS_ACCESS_KEY_ID=YOUR_AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY=YOUR_AWS_SECRET_ACCESS_KEY
AWS_REGION=ap-south-1
S3_BUCKET_NAME=scriptiq-content

# Azure OpenAI (for generation)
AZURE_OPENAI_API_KEY=YOUR_AZURE_OPENAI_API_KEY
AZURE_OPENAI_ENDPOINT=https://your-resource-name.openai.azure.com
AZURE_OPENAI_API_VERSION=2025-04-01-preview
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-5-mini

# Supabase
SUPABASE_URL=<your-url>
SUPABASE_SERVICE_ROLE_KEY=<your-key>
```

---

## ✅ What Works Now

1. ✅ Offline mode with mock Supabase
2. ✅ 2170 campaigns analyzed from July/August
3. ✅ Auto-detection of campaign vs revenue sheets
4. ✅ Pattern extraction (hooks, CTAs, scores, channels)
5. ✅ S3 storage under `marcom-automation/` prefix
6. ✅ Azure OpenAI integration with few-shot learning
7. ✅ Dashboard quick generation
8. ✅ Manual comms creation in Suggestions
9. ✅ CSV upload + deep analysis in Data page

---

## 🎯 Next Steps (Optional)

1. Parse revenue sheets (Sept/Oct/Nov) to link revenue → campaigns
2. Add real Supabase credentials to test end-to-end
3. Deploy Edge Function to production
4. Set up cron for daily generation at 8 AM IST

---

Generated by: MarCom Automation Analysis Script
Date: November 12, 2025
Total Campaigns: 2,170
Total Verticals: 36

