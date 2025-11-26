/**
 * Deep analyzer for Revenue Campaigns sheets.
 * Extracts patterns, hooks, CTAs, and scoring logic to inform generation.
 */

export interface CampaignRecord {
  date?: string;
  vertical?: string;
  hook?: string;
  offer?: string;
  pushCopy?: string;
  cta?: string;
  channel?: string;
  urgency?: string;
  link?: string;
  score?: number;
  status?: string;
  productIds?: string[];
  appLink?: string;
  webLink?: string;
  imageLink?: string;
  contactNumber?: string;
  promoCode?: string;
  discount?: string;
  validity?: string;
  personalizationTokens?: string[];
  userSegment?: string;
  scheduledTime?: string;
  trackingLinks?: string[];
  campaignPlatform?: string; // MoEngage, Firebase, etc.
  [key: string]: any;
}

export interface CampaignPatterns {
  hookStyles: string[];
  ctaTemplates: string[];
  urgencyDistribution: Record<string, number>;
  channelPreferences: Record<string, number>;
  avgScoreByVertical: Record<string, number>;
  topPerformingHooks: Array<{ hook: string; score: number; vertical: string }>;
  commonOfferTypes: string[];
  timingPatterns: Record<string, number>; // day of week → count
}

/**
 * Extract personalization tokens from text ({{token}})
 */
function extractTokens(text: string): string[] {
  const tokenRegex = /\{\{([^}]+)\}\}/g;
  const tokens: string[] = [];
  let match;
  while ((match = tokenRegex.exec(text)) !== null) {
    tokens.push(match[1].trim());
  }
  return tokens;
}

/**
 * Extract product IDs from comma-separated string
 */
function extractProductIds(text: string): string[] {
  if (!text) return [];
  return text
    .split(',')
    .map(id => id.trim())
    .filter(id => id && /^\d+$/.test(id));
}

/**
 * Extract promo code from text
 */
function extractPromoCode(text: string): string | undefined {
  const codeMatch = text.match(/code\s+(\w+)/i) || text.match(/\{\{(\w+)\}\}/);
  return codeMatch ? codeMatch[1] : undefined;
}

/**
 * Extract discount percentage
 */
function extractDiscount(text: string): string | undefined {
  const discountMatch = text.match(/(\d+)%\s*off/i);
  return discountMatch ? `${discountMatch[1]}%` : undefined;
}

/**
 * Extract contact number
 */
function extractContactNumber(text: string): string | undefined {
  const phoneMatch = text.match(/(\d{10})/);
  return phoneMatch ? phoneMatch[1] : undefined;
}

/**
 * Normalize various column name variations into a standard structure.
 */
export function normalizeCampaignRecord(row: Record<string, any>): CampaignRecord {
  const normalized: CampaignRecord = {};

  // Date variations
  const dateKeys = ['date', 'Date', 'suggestion_date', 'Suggestion Date', 'Day'];
  for (const key of dateKeys) {
    if (row[key]) {
      normalized.date = String(row[key]);
      break;
    }
  }

  // Vertical variations
  const verticalKeys = ['vertical', 'Vertical', 'Vertical Name', 'vertical_name'];
  for (const key of verticalKeys) {
    if (row[key]) {
      normalized.vertical = String(row[key]);
      break;
    }
  }

  // Hook variations
  const hookKeys = ['hook', 'Hook', 'Title', 'Headline'];
  for (const key of hookKeys) {
    if (row[key]) {
      normalized.hook = String(row[key]);
      break;
    }
  }

  // Offer variations
  const offerKeys = ['offer', 'Offer', 'Offer Title', 'offer_title', 'Product'];
  for (const key of offerKeys) {
    if (row[key]) {
      normalized.offer = String(row[key]);
      break;
    }
  }

  // Push Copy variations
  const copyKeys = ['push_copy', 'Push Copy', 'Copy', 'Message', 'push copy'];
  for (const key of copyKeys) {
    if (row[key]) {
      normalized.pushCopy = String(row[key]);
      break;
    }
  }

  // CTA variations
  const ctaKeys = ['cta', 'CTA', 'Call to Action', 'Button Text'];
  for (const key of ctaKeys) {
    if (row[key]) {
      normalized.cta = String(row[key]);
      break;
    }
  }

  // Channel variations
  const channelKeys = ['channel', 'Channel', 'Platform'];
  for (const key of channelKeys) {
    if (row[key]) {
      normalized.channel = String(row[key]);
      break;
    }
  }

  // Urgency variations
  const urgencyKeys = ['urgency', 'Urgency', 'Priority'];
  for (const key of urgencyKeys) {
    if (row[key]) {
      normalized.urgency = String(row[key]);
      break;
    }
  }

  // Link variations
  const linkKeys = ['link', 'Link', 'URL', 'url', 'Landing Page'];
  for (const key of linkKeys) {
    if (row[key]) {
      normalized.link = String(row[key]);
      break;
    }
  }

  // Score variations
  const scoreKeys = ['score', 'Score', 'Rating', 'Performance Score'];
  for (const key of scoreKeys) {
    if (row[key]) {
      const val = parseFloat(String(row[key]));
      if (!isNaN(val)) {
        normalized.score = val;
      }
      break;
    }
  }

  // Status variations
  const statusKeys = ['status', 'Status', 'State'];
  for (const key of statusKeys) {
    if (row[key]) {
      normalized.status = String(row[key]);
      break;
    }
  }

  // Extract additional metadata from push copy
  if (normalized.pushCopy) {
    const tokens = extractTokens(normalized.pushCopy);
    if (tokens.length > 0) {
      normalized.personalizationTokens = tokens;
    }
    
    const promoCode = extractPromoCode(normalized.pushCopy);
    if (promoCode) normalized.promoCode = promoCode;
    
    const discount = extractDiscount(normalized.pushCopy);
    if (discount) normalized.discount = discount;
    
    const contact = extractContactNumber(normalized.pushCopy);
    if (contact) normalized.contactNumber = contact;
    
    // Extract validity (Double Validity, 2X Validity, etc.)
    const validityMatch = normalized.pushCopy.match(/(double|2x|3x)\s*validity/i);
    if (validityMatch) normalized.validity = validityMatch[0];
  }

  // Product IDs from dedicated column
  const productIdKeys = ['product_ids', 'Product IDs', 'productIds'];
  for (const key of productIdKeys) {
    if (row[key]) {
      normalized.productIds = extractProductIds(String(row[key]));
      break;
    }
  }

  // App link
  const appLinkKeys = ['app_link', 'App Link', 'appLink', 'deeplink'];
  for (const key of appLinkKeys) {
    if (row[key]) {
      normalized.appLink = String(row[key]);
      break;
    }
  }

  // Web link (different from general link)
  const webLinkKeys = ['web_link', 'Web Link', 'webLink', 'landing_page'];
  for (const key of webLinkKeys) {
    if (row[key]) {
      normalized.webLink = String(row[key]);
      break;
    }
  }

  // Image link
  const imageLinkKeys = ['image_link', 'Image Link', 'imageLink', 'banner'];
  for (const key of imageLinkKeys) {
    if (row[key]) {
      normalized.imageLink = String(row[key]);
      break;
    }
  }

  // User segment
  const segmentKeys = ['user_segment', 'User Segment', 'segment', 'audience', 'target'];
  for (const key of segmentKeys) {
    if (row[key]) {
      normalized.userSegment = String(row[key]);
      break;
    }
  }

  // Scheduled time
  const timeKeys = ['scheduled_time', 'Scheduled Time', 'time', 'send_time'];
  for (const key of timeKeys) {
    if (row[key]) {
      normalized.scheduledTime = String(row[key]);
      break;
    }
  }

  // Tracking links (MoEngage, Analytics, etc.)
  const trackingKeys = Object.keys(row).filter(k => 
    k.toLowerCase().includes('moengage') || 
    k.toLowerCase().includes('tracking') ||
    k.toLowerCase().includes('analytics') ||
    k.toLowerCase().includes('utm')
  );
  
  if (trackingKeys.length > 0) {
    normalized.trackingLinks = trackingKeys
      .map(k => row[k])
      .filter(v => v && String(v).trim())
      .map(v => String(v));
  }

  // Campaign platform (detect from tracking links)
  if (normalized.trackingLinks && normalized.trackingLinks.length > 0) {
    const firstLink = normalized.trackingLinks[0].toLowerCase();
    if (firstLink.includes('moengage')) {
      normalized.campaignPlatform = 'MoEngage';
    } else if (firstLink.includes('firebase')) {
      normalized.campaignPlatform = 'Firebase';
    } else if (firstLink.includes('clevertap')) {
      normalized.campaignPlatform = 'CleverTap';
    }
  }

  return normalized;
}

/**
 * Analyzes a collection of campaign records and extracts actionable patterns.
 */
export function analyzeCampaigns(records: CampaignRecord[]): CampaignPatterns {
  const patterns: CampaignPatterns = {
    hookStyles: [],
    ctaTemplates: [],
    urgencyDistribution: {},
    channelPreferences: {},
    avgScoreByVertical: {},
    topPerformingHooks: [],
    commonOfferTypes: [],
    timingPatterns: {},
  };

  const verticalScores: Record<string, number[]> = {};
  const hooksWithScores: Array<{ hook: string; score: number; vertical: string }> = [];

  for (const rec of records) {
    // Extract hook styles (first 50 chars or until punctuation)
    if (rec.hook) {
      const hookPrefix = rec.hook.substring(0, 50).split(/[.!?]/)[0];
      if (hookPrefix && !patterns.hookStyles.includes(hookPrefix)) {
        patterns.hookStyles.push(hookPrefix);
      }

      if (rec.score && rec.score > 0) {
        hooksWithScores.push({
          hook: rec.hook,
          score: rec.score,
          vertical: rec.vertical || 'Unknown',
        });
      }
    }

    // Extract CTA templates
    if (rec.cta && !patterns.ctaTemplates.includes(rec.cta)) {
      patterns.ctaTemplates.push(rec.cta);
    }

    // Urgency distribution
    if (rec.urgency) {
      patterns.urgencyDistribution[rec.urgency] =
        (patterns.urgencyDistribution[rec.urgency] || 0) + 1;
    }

    // Channel preferences
    if (rec.channel) {
      patterns.channelPreferences[rec.channel] =
        (patterns.channelPreferences[rec.channel] || 0) + 1;
    }

    // Score by vertical
    if (rec.vertical && rec.score && rec.score > 0) {
      if (!verticalScores[rec.vertical]) {
        verticalScores[rec.vertical] = [];
      }
      verticalScores[rec.vertical].push(rec.score);
    }

    // Offer types
    if (rec.offer && !patterns.commonOfferTypes.includes(rec.offer)) {
      patterns.commonOfferTypes.push(rec.offer);
    }

    // Timing patterns (day of week if date is parseable)
    if (rec.date) {
      try {
        const d = new Date(rec.date);
        if (!isNaN(d.getTime())) {
          const day = d.toLocaleDateString('en-US', { weekday: 'long' });
          patterns.timingPatterns[day] = (patterns.timingPatterns[day] || 0) + 1;
        }
      } catch {
        // ignore
      }
    }
  }

  // Compute average scores by vertical
  for (const [vertical, scores] of Object.entries(verticalScores)) {
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    patterns.avgScoreByVertical[vertical] = avg;
  }

  // Top performing hooks (top 10 by score)
  patterns.topPerformingHooks = hooksWithScores
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  return patterns;
}

/**
 * Generate a detailed prompt for LLM that includes patterns and examples
 * extracted from historical campaigns.
 */
export function buildGenerationPrompt(
  patterns: CampaignPatterns,
  vertical: string,
  revenueData?: { product: string; revenue: number; orders: number }[]
): string {
  const examples = patterns.topPerformingHooks
    .filter((h) => h.vertical === vertical || patterns.topPerformingHooks.length < 5)
    .slice(0, 3)
    .map((h) => `- "${h.hook}" (Score: ${h.score.toFixed(2)})`)
    .join('\n');

  const ctaExamples = patterns.ctaTemplates.slice(0, 5).join(', ');
  const avgScore = patterns.avgScoreByVertical[vertical] || 0.5;

  let revenueContext = '';
  if (revenueData && revenueData.length > 0) {
    const topProducts = revenueData
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 3)
      .map((p) => `${p.product} (₹${p.revenue.toLocaleString()}, ${p.orders} orders)`)
      .join('; ');
    revenueContext = `\n\nTop performing products in ${vertical}: ${topProducts}`;
  }

  return `You are an expert marketing copywriter for exam preparation platforms in India.
Your task is to generate a highly engaging push notification for the "${vertical}" vertical.

**Historical High-Performing Examples for ${vertical}:**
${examples || 'No historical data available; use best practices.'}

**Common CTAs used:** ${ctaExamples || 'Enroll Now, Get Started, Claim Offer'}

**Average score for ${vertical}:** ${avgScore.toFixed(2)}

**Urgency distribution:** ${JSON.stringify(patterns.urgencyDistribution)}
**Channel preferences:** ${JSON.stringify(patterns.channelPreferences)}
${revenueContext}

Generate a push notification with:
1. **Hook**: A catchy, urgency-driven headline (max 60 chars)
2. **Push Copy**: Compelling body text (max 120 chars)
3. **CTA**: Clear call-to-action button text (max 20 chars)
4. **Channel**: Preferred channel (App Push, WhatsApp, Email)
5. **Urgency**: High, Medium, or Low
6. **Link**: A plausible deep link or landing page URL
7. **Score**: Predicted performance score (0.0 to 1.0)

Return JSON:
{
  "hook": "...",
  "push_copy": "...",
  "cta": "...",
  "channel": "...",
  "urgency": "...",
  "link": "...",
  "score": 0.85
}`;
}

/**
 * Parse CSV text into records (simple implementation).
 */
export function parseCSV(csv: string): Record<string, any>[] {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  const records: Record<string, any>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
    const record: Record<string, any> = {};
    headers.forEach((h, idx) => {
      record[h] = values[idx] || '';
    });
    records.push(record);
  }

  return records;
}

