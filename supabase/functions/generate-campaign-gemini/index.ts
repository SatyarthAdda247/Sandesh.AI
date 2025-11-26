import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || 'YOUR_GEMINI_API_KEY';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const {
      vertical,
      tonality,
      language,
      audience,
      occasion,
      offer,
      promoCode,
      sampleExamples,
      variationIndex,
      merlinMode,
      additionalContext
    } = await req.json()

    // --- PROMPT BUILDING LOGIC (Mirrors Python Backend) ---

    // Tonality Guides
    const tonalityGuides: Record<string, string> = {
      "Authoritative": "You are an authoritative expert. Speak with command, absolute confidence, and professional reliability. Use clear, direct language.",
      "Casual": "You are a relaxed friend. Keep it low-key, easygoing, and conversational. Use natural language and a warm vibe.",
      "Celebratory": "You are the life of the party! Energetic, happy, and congratulatory. Use festive language and high energy.",
      "Compassionate": "You are deeply caring and understanding. Show genuine concern, empathy, and reassurance. Validate their feelings.",
      "Curious": "You are inquisitive. Ask questions and spark wonder. Make them think and want to know more.",
      "Dramatic": "You are a storyteller. Use high stakes, strong emotions, and suspense. Build tension and anticipation.",
      "Educational": "You are a teacher. Informative, clear, and helpful. Focus on explaining value and sharing knowledge.",
      "Funny": "You are a comedian. Witty, humorous, and entertaining. Use clever wordplay and make them smile.",
      "Inspirational": "You are a guru and coach. Motivate them to achieve greatness. Use empowering language and strong verbs.",
      "Luxurious": "You are premium. Sophisticated, exclusive, and high-end. Use elegant language and focus on quality/exclusivity.",
      "Nostalgic": "You are looking back fondly. Warm memories and sentiment. Connect with the past.",
      "Persuasive": "You are a closer. Convincing, logical, and compelling. Highlight value, offers, and why they should act now.",
      "Sarcastic": "You are dry and witty. Use irony carefully to be edgy but not offensive. Appeal to a younger, smarter audience.",
      "Urgent": "You are a siren. Immediate action required. Create intense FOMO (Fear of Missing Out) and scarcity.",
      // Fallbacks
      "Friendly": "You are a relaxed friend. Keep it low-key, easygoing, and conversational.",
    }

    const languageGuide: Record<string, string> = {
      "Hindi": "Write in pure, natural Hindi (Devanagari script).",
      "English": "Write in professional, clear English.",
      "Hinglish": "Write in natural Hinglish (Hindi words in English script), popular with Indian youth.",
      "Marathi": "Write in natural Marathi.",
      "Tamil": "Write in natural Tamil.",
      "Telugu": "Write in natural Telugu.",
      "Bengali": "Write in natural Bengali.",
    }

    const COMPONENT_LIBRARY = [
      { "category": "FOMO", "desc": "Create Fear Of Missing Out. Urgency, scarcity, time-sensitive." },
      { "category": "Benefit", "desc": "Focus on the core benefit/value proposition for the user." },
      { "category": "Question", "desc": "Start with a compelling question to provoke thought." },
      { "category": "SocialProof", "desc": "Use numbers, ratings, or community size to build trust." },
      { "category": "HowTo", "desc": "Educational angle. 'How to crack X exam'." },
      { "category": "Story", "desc": "Mini-story or scenario the user can relate to." },
      { "category": "Authority", "desc": "Expert advice or official notification style." },
      { "category": "Curiosity", "desc": "Tease something interesting without revealing everything." }
    ]

    // Examples Section
    let examplesSection = ""
    if (sampleExamples && sampleExamples.length > 0) {
      // Take top 5
      const examples = sampleExamples.slice(0, 5)
      const examplesStr = examples.map((ex: any, i: number) =>
        `Example ${i + 1}:\nTitle: ${ex.title || ex.hook || ''}\nMessage: ${ex.message || ex.body || ''}\nCTA: ${ex.cta || ''}`
      ).join("\n")
      examplesSection = `\n\nREAL SUCCESSFUL APP PUSH EXAMPLES (${vertical} - ${tonality}):\n${examplesStr}\n\nStudy these examples. Notice they are SHORT, PUNCHY, and DIRECT.`
    }

    const componentGuidance = COMPONENT_LIBRARY.map(item => `- ${item.category}: ${item.desc}`).join("\n")

    const systemPrompt = `You are an expert App Push Notification copywriter for Adda247.

TONALITY: ${tonalityGuides[tonality] || tonalityGuides['Friendly']}

LANGUAGE: ${languageGuide[language] || languageGuide['Hinglish']}

LANGUAGE ENFORCEMENT: Ensure the language is natural and culturally relevant.${examplesSection}

IMPORTANT RULES FOR APP PUSH NOTIFICATIONS:
1. **NO EMOJIS ALLOWED**: Strict rule.
2. **LENGTH CONSTRAINTS**: 
   - **Title/Hook**: Max 40-50 characters. Must be catchy.
   - **Body/Message**: Max 100-120 characters. Concise value prop.
3. **STRUCTURE**:
   - Title: Grabs attention immediately.
   - Body: Explains the 'What' and 'Why'.
   - CTA: Clear instruction.
4. Include personalization tokens: {{FIRST_NAME}}, {{COURSE_NAME}}.
5. Always include contact number: {{9667589247}} (can be in body or CTA).
6. **NO FLUFF**: Every word must earn its place.
7. Create urgency or excitement.
8. Focus on benefits.

OUTPUT FORMAT REQUIREMENTS:
- Respond with VALID JSON only. Structure:
{
  "components": [
    {
      "category": "FOMO",
      "emoji": "", 
      "hook": "Short Title (<50 chars)",
      "body": ["Short Body (<120 chars)"],
      "cta": "CTA line",
      "tonality": "${tonality}"
    }
  ],
  "image_prompt": "Detailed description for an AI image generator to create a banner for this campaign. Style: Professional, Educational, Adda247 Brand Colors (Red/White).",
  "notes": "Optional single sentence reminder"
}
- Choose categories from this library:
${componentGuidance}
- Always include at least 3 variations/components.
- body MUST be an array with usually just 1 string for Push, or 2 very short lines.
`

    let userPrompt = `Create optimized APP PUSH NOTIFICATIONS for a ${req.campaignType || 'General'} campaign:

VERTICAL: ${vertical}
TONALITY: ${tonality}
LANGUAGE: ${language}
AUDIENCE: ${audience}
${occasion ? `OCCASION: ${occasion}` : ''}
${offer ? `OFFER: ${offer}` : ''}
${promoCode ? `PROMO CODE: ${promoCode}` : ''}

REQUIREMENTS:
1. **Title**: Catchy, <50 chars.
2. **Body**: Value-driven, <120 chars.
3. **CTA**: Actionable.
4. **NO EMOJIS**.
5. Include {{9667589247}}.
6. **Image Prompt**: Include a detailed prompt for generating a matching banner image.

Make it highly creative and conversion-focused!`

    if (merlinMode && additionalContext) {
      userPrompt += `\n\nADDITIONAL CONTEXT:\n${additionalContext}`
    }

    if (variationIndex > 0) {
      userPrompt += `\n\nVARIATION ${variationIndex + 1}: Make it UNIQUE from previous ones.`
    }

    // --- GEMINI API CALL ---
    const fullPrompt = `${systemPrompt}\n\nUSER REQUEST:\n${userPrompt}`

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: fullPrompt }]
        }],
        generationConfig: {
          temperature: 0.8,
          topK: 40,
          topP: 0.9,
          maxOutputTokens: 800,
          responseMimeType: "application/json"
        }
      })
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error?.message || 'Gemini API Error')
    }

    const rawMessage = data.candidates[0].content.parts[0].text

    // Parse JSON
    let parsed = {}
    try {
      const cleanJson = rawMessage.replace(/```json/g, "").replace(/```/g, "").trim()
      parsed = JSON.parse(cleanJson)
    } catch (e) {
      console.error("JSON Parse Error", e)
      parsed = { message: rawMessage } // Fallback
    }

    // Ensure image prompt exists
    if (!parsed.image_prompt) {
      parsed.image_prompt = `Professional educational banner for ${vertical} exam preparation. Red and white theme. Text: '${vertical} Exam'.`
      if (parsed.notes) parsed.notes += ` [Image Prompt: ${parsed.image_prompt}]`
      else parsed.notes = `[Image Prompt: ${parsed.image_prompt}]`
    }

    return new Response(
      JSON.stringify(parsed),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
