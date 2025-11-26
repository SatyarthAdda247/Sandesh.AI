// Edge Function: generate-campaign-ai
// Uses Azure OpenAI GPT-5-mini for high-quality campaign generation
// Enhanced with training data from Sample Pushes.csv

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const COMPONENT_LIBRARY = [
  { category: "FOMO", emoji: "⏰", desc: "Urgency, scarcity, countdowns." },
  { category: "Breaking News / Announcement", emoji: "🗞️", desc: "Important alerts or notifications." },
  { category: "Multiple Benefit / Value-Stack Messaging", emoji: "🎁", desc: "Stacked benefits or offers." },
  { category: "Curiosity / Psychological Hooks", emoji: "🧠", desc: "Teasers that spark curiosity." },
  { category: "Simple Product Promotion", emoji: "✨", desc: "Straightforward feature-focused promo." },
  { category: "Urgency", emoji: "🚨", desc: "Immediate action required messaging." },
  { category: "Feel Good Messages", emoji: "💌", desc: "Motivational, positive reassurance." },
  { category: "Regional Fest Oriented", emoji: "🪔", desc: "Festivals or region-specific offers." },
];

function formatComponentsToText(components: any[]) {
  if (!Array.isArray(components) || components.length === 0) return "";
  return components
    .map((component) => {
      const body = Array.isArray(component.body)
        ? component.body.join('\n')
        : component.body;
      return `${component.emoji ? `${component.emoji} ` : ""}${component.category}
${component.hook}
${body}
CTA: ${component.cta}`;
    })
    .join('\n\n');
}

// Load training data (cached)
let trainingDataCache: any = null;

async function loadTrainingData(): Promise<any> {
  if (trainingDataCache) return trainingDataCache;

  // Try multiple paths
  const paths = [
    'https://xvwtxobrztdepzxveyrs.supabase.co/storage/v1/object/public/public/sample_pushes_training.json',
    'https://xvwtxobrztdepzxveyrs.supabase.co/storage/v1/object/public/public/analysis-output/sample_pushes_training.json',
    '/sample_pushes_training.json',
    '/analysis-output/sample_pushes_training.json',
  ];

  for (const path of paths) {
    try {
      const response = await fetch(path);
      if (response.ok) {
        trainingDataCache = await response.json();
        console.log('Training data loaded from:', path);
        return trainingDataCache;
      }
    } catch (e) {
      // Continue to next path
      continue;
    }
  }

  console.warn('Could not load training data from any path, using empty structure');
  // Return empty structure if loading fails
  return { categories: {}, statistics: {} };
}

interface CampaignRequest {
  campaignType: string;
  vertical: string;
  language: string;
  tonality: string;
  audience: string;
  occasion?: string;
  offer?: string;
  promoCode?: string;
  trendContext?: {
    title?: string;
    rationale?: string;
    emoji?: string;
    tags?: string[];
  } | null;
  instaRationale?: string;
  pdpLink?: string;
  sampleExamples?: Array<{
    hook: string;
    body: string;
    cta: string;
    full_message: string;
  }>;
  variationIndex?: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response('Method Not Allowed', {
        status: 405,
        headers: corsHeaders,
      });
    }

    const body: CampaignRequest = await req.json();

    // Validate required fields
    if (!body.vertical || !body.tonality || !body.audience) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: vertical, tonality, audience' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Azure OpenAI Configuration
    const AZURE_OPENAI_API_KEY = Deno.env.get('AZURE_OPENAI_API_KEY') || 'YOUR_AZURE_OPENAI_API_KEY';
    const AZURE_OPENAI_ENDPOINT = Deno.env.get('AZURE_OPENAI_ENDPOINT') || 'https://your-resource-name.openai.azure.com';
    const AZURE_OPENAI_DEPLOYMENT = 'gpt-5-mini';
    const API_VERSION = '2025-04-01-preview';

    // Load training data for examples
    const trainingData = await loadTrainingData();

    // Use provided sample examples or fall back to training data
    const sampleExamples = body.sampleExamples || [];

    // Build comprehensive prompt with training examples
    const systemPrompt = await buildSystemPrompt(body.tonality, body.language, trainingData, sampleExamples, body.variationIndex || 0);
    const userPrompt = buildUserPrompt(body, trainingData, sampleExamples, body.variationIndex || 0);

    // Call Azure OpenAI
    const azureUrl = `${AZURE_OPENAI_ENDPOINT}/openai/deployments/${AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version=${API_VERSION}`;

    const response = await fetch(azureUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': AZURE_OPENAI_API_KEY,
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.85,
        max_tokens: 800,
        top_p: 0.95,
        frequency_penalty: 0.3,
        presence_penalty: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Azure OpenAI Error:', errorText);
      return new Response(
        JSON.stringify({ error: `Azure OpenAI API Error: ${errorText}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const rawMessage = data.choices[0].message.content?.trim() || "";

    let parsed: { components?: any[]; notes?: string } = {};
    try {
      parsed = JSON.parse(rawMessage);
    } catch (_err) {
      console.warn('Could not parse JSON response, falling back to raw text.');
    }

    const components = Array.isArray(parsed.components) ? parsed.components : [];
    const formattedMessage = components.length ? formatComponentsToText(components) : rawMessage;

    return new Response(
      JSON.stringify({
        message: formattedMessage,
        components,
        notes: parsed.notes || "",
        model: 'gpt-5-mini',
        tokens: data.usage,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});

async function buildSystemPrompt(tonality: string, language: string, trainingData: any, sampleExamples: any[] = [], variationIndex: number = 0): Promise<string> {
  const tonalityGuides = {
    funny: 'You are a witty, humorous marketing copywriter. Use Hinglish mix, funny expressions, emojis, and entertaining language. Make people laugh while promoting the course!',
    fomo: 'You are an urgency expert. Create intense FOMO (Fear of Missing Out) with countdowns, scarcity, limited spots, and urgent language. Make them feel they MUST act NOW!',
    serious: 'You are a professional, formal marketing expert. Write clear, informative, and credible copy with proper structure and professional tone.',
    celebratory: 'You are a festive celebration expert! Create exciting, joyful, party-vibe messages with celebration emojis and festive language.',
    motivational: 'You are an inspirational coach! Write powerful, motivating messages that inspire action. Use strong verbs, success stories, and empowering language.',
    friendly: 'You are a friendly buddy talking to a friend. Use casual, warm, conversational tone with friendly emojis and approachable language.',
    premium: 'You are an elite luxury brand expert. Write exclusive, high-value, VIP-focused copy that makes the offer feel premium and exclusive.',
  };

  const languageGuide: Record<string, string> = {
    English: 'Write in clear, simple English.',
    Hindi: 'Write primarily in Hindi (Devanagari script) with some English words for modern terms.',
    Hinglish: 'Write in Hinglish - a natural mix of Hindi and English that Indian youth use. Use Latin script for both.',
    Marathi: 'Write primarily in Marathi using Devanagari script with natural conversational tone.',
    Bengali: 'Write primarily in Bengali using Bengali script with natural conversational tone.',
    Tamil: 'Write primarily in Tamil using Tamil script with natural conversational tone.',
    Telugu: 'Write primarily in Telugu using Telugu script with natural conversational tone.',
    Gujarati: 'Write primarily in Gujarati using Gujarati script with natural conversational tone.',
    Kannada: 'Write primarily in Kannada using Kannada script with natural conversational tone.',
    Malayalam: 'Write primarily in Malayalam using Malayalam script with natural conversational tone.',
  };

  let languageNote: string;
  switch (language) {
    case "Hindi":
    case "Marathi":
    case "Bengali":
    case "Tamil":
    case "Telugu":
    case "Gujarati":
    case "Kannada":
    case "Malayalam":
      languageNote =
        `Write the ENTIRE message in ${language} using its native script. ` +
        "Do NOT include full English sentences except for unavoidable brand names, URLs, or promo codes.";
      break;
    case "Hinglish":
      languageNote =
        "Write the ENTIRE message in Hinglish (Hindi + English mixed) using Latin script only. " +
        "Do NOT use Devanagari or any other Indic script.";
      break;
    default:
      languageNote =
        "Write the ENTIRE message in English. Do NOT mix in other languages except for 1–2 words if absolutely needed.";
  }

  // Use provided sample examples or get from training data
  let examples: any[] = [];
  if (sampleExamples.length > 0) {
    // Use provided Sample Pushes examples
    examples = sampleExamples.slice(0, 5);
  } else {
    // Fall back to training data
    const categoryData = trainingData?.categories?.[tonality] || trainingData?.categories?.General || null;
    examples = categoryData?.examples?.slice(0, 3) || [];
  }

  let examplesSection = '';
  if (examples.length > 0) {
    examplesSection = `\n\nREAL EXAMPLES FROM SAMPLE PUSHES SHEET (${tonality.toUpperCase()}):
${examples.map((ex: any, idx: number) => `
Example ${idx + 1}:
Hook: ${ex.hook || ex["ENG TITLE"] || ""}
Body: ${ex.body || ex["ENG DESC"] || ""}
CTA: ${ex.cta || ex["CTA"] || ""}
${ex.full_message ? `Full Message:\n${ex.full_message}` : ""}
`).join('\n')}

Study these examples carefully. Notice:
- How hooks grab attention immediately
- How body text uses bullet points (✔️, ▶︎, 👉) for clarity
- How CTAs create urgency or excitement
- How emojis are used strategically
- The conversational, engaging tone
- The structure and flow of successful campaigns

Create something similar but UNIQUE for the current campaign. For variation ${variationIndex + 1}, ensure the message is distinct from previous variations while maintaining the same quality and style.`;
  }

  const componentGuidance = COMPONENT_LIBRARY.map((item) => `- ${item.category}: ${item.desc}`).join('\n');

  return `You are an expert marketing copywriter for Adda247, India's leading exam preparation platform.

TONALITY: ${tonalityGuides[tonality as keyof typeof tonalityGuides] || tonalityGuides.friendly}

LANGUAGE: ${languageGuide[language as keyof typeof languageGuide] || languageGuide.Hinglish}

LANGUAGE ENFORCEMENT: ${languageNote}${examplesSection}

IMPORTANT RULES:
1. Use emojis generously to make the message engaging (like in the examples above)
2. Include personalization tokens in {{TOKEN}} format (e.g., {{FIRST_NAME}}, {{COURSE_NAME}})
3. Always include contact number: {{9667589247}}
4. Make it WhatsApp-friendly (short paragraphs, lots of line breaks)
5. Add a strong CTA (Call-to-Action) with 👉 emoji or similar
6. Keep the message between 200-400 words
7. Be creative, unique, and engaging - inspired by examples but original
8. Focus on benefits, not just features
9. Create urgency or excitement
10. Make it shareable and memorable
11. Use bullet points (✔️, ▶︎, 👉) to structure benefits clearly

OUTPUT FORMAT REQUIREMENTS:
- Respond with VALID JSON only (no prose, no markdown). Structure:
{
  "components": [
    {
      "category": "FOMO",
      "emoji": "⏰",
      "hook": "Short hook line",
      "body": ["Bullet line 1", "Bullet line 2"],
      "cta": "CTA line with {{DEEPLINK}} or promo",
      "tonality": "${tonality}"
    }
  ],
  "notes": "Optional single sentence reminder"
}
- Choose categories from this library:
${componentGuidance}
- Always include at least 3 components. Ensure one matches the requested tonality; others should complement it.
- body MUST be an array of bullet strings (without numbering).`;
}

function buildUserPrompt(params: CampaignRequest, trainingData: any, sampleExamples: any[] = [], variationIndex: number = 0): string {
  // Get pattern insights from training data
  const categoryData = trainingData?.categories?.[params.tonality] || trainingData?.categories?.General || null;
  const patterns = categoryData?.structure_patterns || {};

  const patternTips = patterns.uses_bullets > 0.5
    ? "Use bullet points (✔️, ▶︎, 👉) to list benefits clearly, like in successful campaigns."
    : "Structure benefits clearly with line breaks or simple formatting.";

  const hookLength = patterns.avg_hook_length ? `Keep hook around ${Math.round(patterns.avg_hook_length)} characters.` : '';

  return `Create structured component blocks for a ${params.campaignType} campaign with these details:

VERTICAL/CATEGORY: ${params.vertical}
TONALITY: ${params.tonality}
LANGUAGE: ${params.language}
TARGET AUDIENCE: ${params.audience}
${params.occasion ? `OCCASION/EVENT: ${params.occasion}` : ''}
${params.offer ? `OFFER DETAILS: ${params.offer}` : ''}
${params.promoCode ? `PROMO CODE: ${params.promoCode}` : ''}
${params.trendContext ? `TREND SOURCE: ${params.trendContext.emoji || ''} ${params.trendContext.title} — ${params.trendContext.rationale}` : ''}
${params.instaRationale ? `INFLUENCER/INSTA RATIONALE: ${params.instaRationale}` : ''}
${params.pdpLink ? `PDP / TARGET LINK: ${params.pdpLink}` : ''}

STRUCTURE YOUR MESSAGE WITH COMPONENTS:
1. Each component = {category + hook + body[] + CTA}. Keep hooks punchy ${hookLength}
2. ${patternTips}
3. Include {{9667589247}} within one component.
4. Promo code ${params.promoCode ? `{{${params.promoCode}}}` : 'if provided'} must appear in body or CTA.
5. Never include metadata like "Campaign Type" or "Audience" in output.

Make it highly creative, engaging, and conversion-focused!
Use the specified tonality throughout.
Include multiple emojis strategically (like in the examples).
Make it feel personal and targeted to: ${params.audience}
If a trend source is provided, weave it naturally into the hook or body and optionally include hashtag(s) from it.
If PDP link is provided, ensure CTA line references it explicitly ({{DEEPLINK}} placeholder acceptable).
Follow the structure and style of successful campaigns shown in examples.

${variationIndex > 0 ? `IMPORTANT: This is variation #${variationIndex + 1}. Make it UNIQUE and DIFFERENT from previous variations while maintaining the same quality. Use different hooks, different phrasing, different emoji combinations, but keep the same structure and effectiveness.` : ""}`;
}

