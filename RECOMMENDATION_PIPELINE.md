# 🎯 AI Recommendation Pipeline

## Overview

The recommendation pipeline uses **2,170 analyzed revenue campaign sheets** (July + August 2025) to generate smart, data-driven push notification suggestions.

---

## 📊 How It Works

### 1. **Data Foundation**
- **2,170 historical campaigns** analyzed from `.xlsx` files
- **36 verticals** identified (Banking, SSC, Railways, State Exams, etc.)
- **Top-performing hooks** extracted with scores (0.0 - 1.0)
- **Channel preferences** mapped per vertical

### 2. **Scoring Algorithm**

Each recommendation is scored using 4 weighted factors:

| Factor | Weight | Description |
|--------|--------|-------------|
| **Revenue Weight** | 40% | Based on total revenue and order volume |
| **Historical Performance** | 30% | Average score of past campaigns for this vertical |
| **Timing Boost** | 15% | Month-end, weekday, optimal day bonuses |
| **Vertical Priority** | 15% | Campaign volume indicates vertical importance |

**Formula:**
```
Total Score = (Revenue × 0.4) + (Historical × 0.3) + (Timing × 0.15) + (Priority × 0.15)
```

### 3. **Content Generation**

#### Hook Selection:
1. **First Priority**: Use top-performing hooks from the same vertical
2. **Month-End Context**: Prefer urgency-driven hooks (🚨, ⏰, "Last", "Final")
3. **Fallback**: Adapt hooks from similar verticals
4. **Last Resort**: Generate generic hook with product name

#### Push Copy:
- Includes order count for social proof
- Highlights top product
- Adds urgency for month-end campaigns

#### CTA:
- Month-end → "Claim Offer"
- Regular → "Enroll Now", "Join Now", "Get Started"

#### Urgency:
- **High**: Score ≥ 0.85 OR month-end
- **Medium**: Score ≥ 0.70
- **Low**: Score < 0.70

---

## 🚀 Usage

### Access Recommendations:
1. Navigate to **Dashboard**
2. Click "View AI Recommendations" in the highlighted card
3. Or use sidebar: **Recommendations** (✨ icon)

### Features:
- **Ranked Table**: All verticals sorted by score
- **Score Breakdown**: See exactly how each score was calculated
- **Reasoning**: Understand why each recommendation was made
- **One-Click Approve**: Send recommendations to Suggestions queue
- **Details View**: Full breakdown of hook, copy, CTA, and scoring

---

## 📈 Example Recommendation

### Banking Vertical

**Input:**
- Revenue: ₹450,000
- Orders: 320
- Top Product: Bank Mahapack
- Context: Month-End, Tuesday

**Output:**
```json
{
  "vertical": "Banking",
  "hook": "🚨🏦 IBPS PO Bumper Bharti Out!",
  "pushCopy": "Join 320+ students! Bank Mahapack @ Best Price. Limited time offer.",
  "cta": "Claim Offer",
  "channel": "App Push",
  "urgency": "High",
  "score": 0.887,
  "scoreBreakdown": {
    "revenueWeight": 0.756,
    "historicalPerformance": 0.875,
    "timingBoost": 0.150,
    "verticalPriority": 0.924,
    "total": 0.887
  },
  "reasoning": [
    "Revenue: ₹450,000 (76%)",
    "Historical avg: 88%",
    "Timing boost: +15%",
    "Vertical priority: 92%"
  ]
}
```

---

## 🎨 Historical Campaign Insights

### Top 10 Performing Hooks (from 2,170 campaigns):

1. **⚠️ Kal Ke Baad Ye Offer Expire Ho Jayega!** (0.96) - Regulatory Bodies
2. **🚨🏦 IBPS PO Bumper Bharti Out!** (0.88) - Banking
3. **💡 1007 Seats = 1007 Chances!** (0.88) - Regulatory Bodies
4. **Selection Loading... Tap Fast ⏳** (0.88) - Banking
5. **🎯 IBPS SO Aspirants, This is Your Shot!** (0.88) - Regulatory Bodies
6. **Bro, Bas 3️⃣ hours baaki hain 😮😮😮** (0.88) - Banking
7. **🚨 3️⃣ Hours Left to Make a Smart Move!😮** (0.88) - Regulatory Bodies
8. **IBPS PO & SBI PO❓ Ye Sirf Exams Nahi** (0.88) - Banking
9. **✅ Syllabus Sabka Same Hai...** (0.88) - Regulatory Bodies
10. **Aap Honge Kamyaab, Ek Din🎵** (0.88) - Banking

### Key Patterns Identified:
- ✅ **Emojis**: 🚨, ⏰, 🎯, 💡, ✨ drive engagement
- ✅ **Urgency**: Time-bound offers ("3 hours left", "Last day")
- ✅ **Hindi/English Mix**: Resonates with Indian audience
- ✅ **Social Proof**: "Join 1000+ students"
- ✅ **Numbers**: Specific counts create credibility

---

## 🔄 Daily Automation (Future)

### Cron Schedule:
```
0 8 * * * # Run at 8:00 AM IST daily
```

### Automated Flow:
1. Fetch yesterday's revenue data
2. Calculate scores for all verticals
3. Generate top 10 recommendations
4. Auto-approve High urgency (score ≥ 0.85)
5. Queue Medium/Low for manual review
6. Send notification to marketing team

---

## 📊 Performance Metrics

### Current Coverage:
- **Campaigns Analyzed**: 2,170
- **Verticals Covered**: 36
- **Date Range**: July - August 2025
- **Avg Campaign Score**: 0.72

### Recommendation Accuracy:
- Uses proven hooks with 0.85+ scores
- Context-aware (timing, revenue, history)
- Learns from 2,170 real campaigns

---

## 🛠️ Technical Stack

### Frontend:
- `src/lib/recommendationEngine.ts` - Scoring algorithm
- `src/lib/campaignPatterns.ts` - Historical data access
- `src/pages/Recommendations.tsx` - UI component
- `analysis-report.json` - 2,170 campaigns data

### Backend (Edge Function):
- `supabase/functions/generate-comms/analyzer.ts` - Deep analysis
- `supabase/functions/generate-comms/index.ts` - Generation with Azure OpenAI
- `supabase/functions/generate-comms/s3.ts` - Storage

### Data Sources:
- JULY REVENUE CAMPAIGNS 2025.xlsx (1,828 campaigns)
- AUGUST REVENUE CAMPAIGNS 2025.xlsx (342 campaigns)
- Revenue sheets (Sept/Oct/Nov) - pending integration

---

## 🎯 Next Steps

### Phase 1: ✅ Complete
- [x] Analyze 2,170 campaigns
- [x] Build scoring engine
- [x] Create recommendation UI
- [x] Integrate with Dashboard

### Phase 2: 🚧 In Progress
- [ ] Parse revenue sheets (Sept/Oct/Nov)
- [ ] Link revenue → campaign performance
- [ ] A/B test recommendations vs manual

### Phase 3: 📅 Planned
- [ ] Deploy to production
- [ ] Set up daily cron job
- [ ] Add feedback loop (track which recommendations perform best)
- [ ] Auto-tune scoring weights based on results

---

## 💡 Pro Tips

1. **Month-End Campaigns**: System automatically boosts urgency and selects time-sensitive hooks
2. **New Verticals**: System adapts hooks from similar verticals
3. **Score Breakdown**: Click "Details" to see exactly how each score was calculated
4. **Bulk Approve**: Filter by urgency and approve all High priority at once
5. **Historical Learning**: More campaigns = better recommendations

---

## 📞 Support

For questions or improvements, refer to:
- `ANALYSIS_SUMMARY.md` - Full analysis details
- `scripts/analyze-xlsx.ts` - Analyzer source code
- `src/lib/recommendationEngine.ts` - Scoring logic

---

**Generated**: November 12, 2025  
**Pipeline Status**: ✅ Active  
**Data Source**: 2,170 Revenue Campaign Sheets (July + August 2025)

