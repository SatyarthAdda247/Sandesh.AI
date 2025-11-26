"""
Lightweight FastAPI service that powers trend intelligence, linting, and
MoEngage payload preparation for Sandesh.ai. Run locally with:

  cd python_services
  uvicorn marcom_service:app --reload --host 0.0.0.0 --port 8787

The frontend reads VITE_TREND_SERVICE_URL (default http://localhost:8787)
to call these endpoints.
"""

from __future__ import annotations

import json
import random
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).parent
TREND_CACHE_PATH = BASE_DIR / "trend_cache.json"
MOENGAGE_LOG_PATH = BASE_DIR / "moengage_payloads.log"

app = FastAPI(title="Sandesh.ai Intelligence API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class TrendItem(BaseModel):
    title: str
    category: str = Field(description="exam | event | influencer | trend")
    emoji: str = "🔥"
    summary: str
    rationale: str
    source: str = "internal"
    tags: List[str] = Field(default_factory=list)


class TrendResponse(BaseModel):
    updated_at: str
    items: List[TrendItem]


class LintRequest(BaseModel):
    text: str
    max_length: int = 480
    min_emojis: int = 1
    max_emojis: int = 12
    require_cta: bool = True
    banned_words: List[str] = Field(default_factory=lambda: ["free job", "lottery"])


class LintIssue(BaseModel):
    severity: str
    message: str
    suggestion: Optional[str] = None


class LintResponse(BaseModel):
    issues: List[LintIssue]
    emojis_found: int
    length: int


class MoEngageRequest(BaseModel):
    vertical: str
    tonality: str
    audience: str
    trend: Optional[str] = None
    pdp_link: Optional[str] = None
    campaign_text: str
    cta: str
    tags: List[str] = Field(default_factory=list)
    schedule_hint: Optional[str] = None


class MoEngageResponse(BaseModel):
    payload: dict
    metadata: dict
    recommended_send_time: str


class EdTechEvent(BaseModel):
    title: str
    date: str  # ISO format date
    category: str = Field(description="exam | festival | national_day | seasonal | special")
    emoji: str = "📅"
    description: str
    relevance: str  # Why it's relevant for EdTech campaigns
    suggested_tonality: List[str] = Field(default_factory=list)
    verticals: List[str] = Field(default_factory=list)  # Which verticals can use this
    days_until: int


class EventsResponse(BaseModel):
    events: List[EdTechEvent]
    updated_at: str


def _load_trend_cache() -> List[TrendItem]:
    if TREND_CACHE_PATH.exists():
        try:
            data = json.loads(TREND_CACHE_PATH.read_text())
            return [TrendItem(**item) for item in data]
        except Exception:
            pass

    # Default curated examples
    today = datetime.utcnow().date()
    defaults = [
        TrendItem(
            title="SSC CGL Tier-1 Answer Key Buzz",
            category="exam",
            emoji="📊",
            summary="Lakhs of aspirants discussing expected cutoffs after answer key release.",
            rationale="Capitalize on anxious aspirants refreshing Telegram & Insta reels for cutoff leaks.",
            source="internal-scan",
            tags=["ssc", "tier1", "cutoff"],
        ),
        TrendItem(
            title="UP Police Constable Fresh Vacancy",
            category="news",
            emoji="🚨",
            summary="State cabinet cleared 15k+ constable seats with notification expected in 7 days.",
            rationale="Use urgency + service pride tone, highlight hometown postings.",
            source="hindustan-hindi",
            tags=["uppolice", "defence", "hometown"],
        ),
        TrendItem(
            title="Insta Reel Trend • #MissionTopper",
            category="influencer",
            emoji="🎬",
            summary="Education creators using slo-mo desk setup + lo-fi beat to show exam grind.",
            rationale="Repurpose the vibe for reels/notification hero image; mention #MissionTopper to ride algorithm.",
            source="instagram",
            tags=["insta", "missiontopper"],
        ),
        TrendItem(
            title="Navratri + Bank MAHAPACK Combo",
            category="event",
            emoji="🪔",
            summary="Festive buying spike for multilingual banking aspirants.",
            rationale="Blend celebration copy + premium offer; add emoji separators.",
            source="internal-offer-desk",
            tags=["navratri", "banking", "offers"],
        ),
    ]
    TREND_CACHE_PATH.write_text(json.dumps([item.dict() for item in defaults], indent=2))
    return defaults


@app.get("/trend-insights", response_model=TrendResponse)
def trend_insights() -> TrendResponse:
    items = _load_trend_cache()
    return TrendResponse(updated_at=datetime.utcnow().isoformat(), items=items)


@app.post("/lint", response_model=LintResponse)
def lint_message(req: LintRequest) -> LintResponse:
    issues: List[LintIssue] = []
    text = req.text.strip()
    emoji_count = sum(
        ch in "😀😁😂🤣😃😄😅😆😉😊😍😘😜🤩🤗🤔🤩🙏🔥⚡️🚀🎯🎉💥💪📣📢📈📚📖📝🪔🚨✅" for ch in text
    )

    if len(text) > req.max_length:
        issues.append(
            LintIssue(
                severity="warning",
                message=f"Message is {len(text)} chars (max {req.max_length}). Trim the body.",
            )
        )

    if req.require_cta and "👉" not in text and "http" not in text.lower():
        issues.append(
            LintIssue(
                severity="error",
                message="CTA missing. Add 👉 line with action + link/promo code.",
                suggestion="Example: 👉 Join live now: {{DEEPLINK}}",
            )
        )

    if emoji_count < req.min_emojis:
        issues.append(
            LintIssue(
                severity="warning",
                message=f"Add at least {req.min_emojis} emojis (currently {emoji_count}).",
            )
        )

    if emoji_count > req.max_emojis:
        issues.append(
            LintIssue(
                severity="warning",
                message=f"Too many emojis ({emoji_count}). Keep under {req.max_emojis}.",
            )
        )

    lowered = text.lower()
    for banned in req.banned_words:
        if banned in lowered:
            issues.append(
                LintIssue(
                    severity="error",
                    message=f"Contains blocked phrase '{banned}'. Remove or rephrase.",
                )
            )

    token_placeholders = [token for token in ["{{FIRST_NAME}}", "{{COURSE_NAME}}", "{{9667589247}}"] if token in text]
    if "{{9667589247}}" not in text:
        issues.append(
            LintIssue(
                severity="info",
                message="Contact number {{9667589247}} missing.",
                suggestion="Add support line near CTA.",
            )
        )

    return LintResponse(issues=issues, emojis_found=emoji_count, length=len(text))


@app.post("/moengage/payload", response_model=MoEngageResponse)
def build_moengage_payload(req: MoEngageRequest) -> MoEngageResponse:
    now = datetime.utcnow()
    recommended_time = now + timedelta(minutes=random.randint(30, 180))

    payload = {
        "campaign_name": f"{req.vertical}-{now.strftime('%Y%m%d-%H%M')}",
        "target_segment": {
            "audience_query": req.audience,
            "tags": list(set(req.tags + [req.vertical.lower(), req.tonality])),
        },
        "content": {
            "message": req.campaign_text,
            "cta": req.cta,
            "trend": req.trend,
            "pdp_link": req.pdp_link,
        },
        "settings": {
            "priority": "high" if req.tonality == "fomo" else "normal",
            "throttle_per_user": 10,
        },
    }

    metadata = {
        "tonality": req.tonality,
        "audience": req.audience,
        "trend": req.trend,
        "generated_at": now.isoformat(),
    }

    with MOENGAGE_LOG_PATH.open("a") as fh:
        fh.write(json.dumps({"payload": payload, "metadata": metadata}, ensure_ascii=False) + "\n")

    return MoEngageResponse(
        payload=payload,
        metadata=metadata,
        recommended_send_time=recommended_time.isoformat(),
    )


def _get_upcoming_edtech_events() -> List[EdTechEvent]:
    """Generate upcoming Indian EdTech-relevant events for the next 90 days."""
    today = datetime.utcnow().date()
    events: List[EdTechEvent] = []
    
    # Exam dates (2025 calendar - key competitive exams)
    exam_dates = [
        ("SSC CGL Tier-2", "2025-02-15", ["SSC", "GOVT JOBS"], ["fomo", "serious"]),
        ("UPSC Prelims 2025", "2025-05-25", ["UPSC"], ["fomo", "motivational"]),
        ("Banking PO Mains", "2025-03-10", ["BANKING"], ["fomo", "premium"]),
        ("Railway NTPC CBT-2", "2025-04-20", ["RAILWAYS"], ["fomo", "friendly"]),
        ("CTET July 2025", "2025-07-20", ["CTET", "Teaching"], ["serious", "friendly"]),
        ("CUET UG 2025", "2025-05-15", ["CUET UG", "K12 & CUET UG"], ["fomo", "celebratory"]),
        ("CUET PG 2025", "2025-03-18", ["CUET PG"], ["fomo", "serious"]),
        ("SSC CHSL Tier-2", "2025-05-05", ["SSC"], ["fomo", "friendly"]),
        ("Defence NDA-1", "2025-04-18", ["DEFENCE"], ["motivational", "premium"]),
        ("UGC NET June 2025", "2025-06-15", ["UGC_NET"], ["serious", "premium"]),
    ]
    
    for title, date_str, verticals, tonalities in exam_dates:
        event_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        days_until = (event_date - today).days
        if 0 <= days_until <= 90:
            events.append(EdTechEvent(
                title=title,
                date=date_str,
                category="exam",
                emoji="📝",
                description=f"{title} exam scheduled. Perfect timing for last-minute prep campaigns.",
                relevance=f"High engagement window {days_until} days before exam. Target aspirants with revision packs, mock tests, and quick tips.",
                suggested_tonality=tonalities,
                verticals=verticals,
                days_until=days_until,
            ))
    
    # Festivals & National Days (2025-2026)
    festivals = [
        ("Republic Day", "2026-01-26", ["celebratory", "friendly"], ["SSC", "UPSC", "BANKING", "RAILWAYS"]),
        ("Dayanand Anniversary", "2026-02-12", ["celebratory", "motivational"], ["Teaching", "CTET", "UGC_NET", "ALL"]),
        ("Holi", "2026-03-14", ["celebratory", "friendly"], ["ALL"]),
        ("Ram Navami", "2026-04-07", ["celebratory", "motivational"], ["ALL"]),
        ("Eid al-Fitr", "2026-03-31", ["celebratory", "friendly"], ["ALL"]),
        ("Guru Purnima", "2026-07-10", ["celebratory", "motivational"], ["Teaching", "CTET", "UGC_NET"]),
        ("Independence Day", "2026-08-15", ["celebratory", "motivational"], ["DEFENCE", "UPSC", "ALL"]),
        ("Teachers Day", "2026-09-05", ["celebratory", "friendly"], ["Teaching", "CTET", "UGC_NET"]),
        ("Dussehra", "2026-10-02", ["celebratory", "motivational"], ["ALL"]),
        ("Diwali", "2026-10-20", ["celebratory", "premium"], ["ALL"]),
        ("Children's Day", "2026-11-14", ["celebratory", "friendly"], ["K12 & CUET UG", "Teaching", "CTET", "ALL"]),
        ("Christmas", "2025-12-25", ["celebratory", "friendly"], ["ALL"]),
        ("New Year 2026 Prep", "2025-12-31", ["motivational", "fomo"], ["ALL"]),
    ]
    
    # Emoji mapping for specific events
    event_emojis = {
        "Children's Day": "🎈",
        "Christmas": "🎄",
        "Dayanand Anniversary": "📚",
        "Teachers Day": "👨‍🏫",
        "Republic Day": "🇮🇳",
        "Independence Day": "🇮🇳",
    }
    
    # Custom relevance descriptions for specific events
    event_relevance = {
        "Children's Day": "Perfect for K12 campaigns! Parents actively seek educational gifts and courses for their children. Use child-friendly language and family-focused offers.",
        "Christmas": "Year-end festive season drives gift purchases and course enrollments. Combine celebration messaging with special offers and New Year prep themes.",
        "Dayanand Anniversary": "Honor the founder of Arya Samaj and education reformer. Ideal for teaching verticals - emphasize values, knowledge, and educational excellence.",
        "Teachers Day": "High engagement for teaching courses and educator training. Parents and students show appreciation - perfect for CTET, UGC NET, and teaching verticals.",
    }
    
    for title, date_str, tonalities, verticals in festivals:
        event_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        days_until = (event_date - today).days
        if 0 <= days_until <= 90:
            # Use specific emoji if available, otherwise default logic
            emoji = event_emojis.get(title, "🎉" if "Day" in title else "🪔")
            category = "national_day" if "Day" in title or "Anniversary" in title else "festival"
            relevance = event_relevance.get(
                title,
                f"Festive buying behavior + emotional connection. Use celebration-themed offers and motivational messaging."
            )
            
            events.append(EdTechEvent(
                title=title,
                date=date_str,
                category=category,
                emoji=emoji,
                description=f"{title} celebration. Great opportunity for themed campaigns.",
                relevance=relevance,
                suggested_tonality=tonalities,
                verticals=verticals,
                days_until=days_until,
            ))
    
    # Seasonal/Strategic dates
    seasonal = [
        ("New Year Resolution Push", "2025-01-01", ["motivational", "fomo"], ["ALL"]),
        ("Summer Prep Season", "2025-03-01", ["fomo", "friendly"], ["ALL"]),
        ("Monsoon Study Boost", "2025-06-15", ["motivational", "serious"], ["ALL"]),
        ("Year-End Sale Prep", "2025-11-15", ["fomo", "premium"], ["ALL"]),
    ]
    
    for title, date_str, tonalities, verticals in seasonal:
        event_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        days_until = (event_date - today).days
        if 0 <= days_until <= 90:
            events.append(EdTechEvent(
                title=title,
                date=date_str,
                category="seasonal",
                emoji="📅",
                description=f"{title} - strategic campaign window.",
                relevance=f"Seasonal behavior patterns. Align messaging with user mindset during this period.",
                suggested_tonality=tonalities,
                verticals=verticals,
                days_until=days_until,
            ))
    
    # Sort by days_until (soonest first)
    events.sort(key=lambda e: e.days_until)
    return events[:30]  # Return top 30 upcoming events


@app.get("/edtech-events", response_model=EventsResponse)
def upcoming_edtech_events() -> EventsResponse:
    """Get upcoming Indian EdTech-relevant events for campaign generation."""
    events = _get_upcoming_edtech_events()
    return EventsResponse(
        events=events,
        updated_at=datetime.utcnow().isoformat(),
    )


@app.get("/health")
def health():
    return {"status": "ok", "time": datetime.utcnow().isoformat()}


# --- Campaign Generation Logic ---

class CampaignRequest(BaseModel):
    campaignType: str
    vertical: str
    language: str
    tonality: str
    audience: str
    occasion: Optional[str] = None
    offer: Optional[str] = None
    promoCode: Optional[str] = None
    trendContext: Optional[dict] = None
    instaRationale: Optional[str] = None
    pdpLink: Optional[str] = None
    sampleExamples: Optional[List[dict]] = None
    variationIndex: Optional[int] = 0
    additionalContext: Optional[str] = None # For Merlin mode
    merlinMode: Optional[bool] = False


class CampaignResponse(BaseModel):
    message: str
    components: List[dict] = []
    notes: str = ""
    model: str
    tokens: dict = {}


COMPONENT_LIBRARY = [
    {"category": "FOMO", "emoji": "⏰", "desc": "Urgency, scarcity, countdowns."},
    {"category": "Breaking News / Announcement", "emoji": "🗞️", "desc": "Important alerts or notifications."},
    {"category": "Multiple Benefit / Value-Stack Messaging", "emoji": "🎁", "desc": "Stacked benefits or offers."},
    {"category": "Curiosity / Psychological Hooks", "emoji": "🧠", "desc": "Teasers that spark curiosity."},
    {"category": "Simple Product Promotion", "emoji": "✨", "desc": "Straightforward feature-focused promo."},
    {"category": "Urgency", "emoji": "🚨", "desc": "Immediate action required messaging."},
    {"category": "Feel Good Messages", "emoji": "💌", "desc": "Motivational, positive reassurance."},
    {"category": "Regional Fest Oriented", "emoji": "🪔", "desc": "Festivals or region-specific offers."},
]

KNOWLEDGE_BASE_PATH = BASE_DIR / "campaign_knowledge_base.json"

def _load_knowledge_base() -> dict:
    if KNOWLEDGE_BASE_PATH.exists():
        try:
            return json.loads(KNOWLEDGE_BASE_PATH.read_text())
        except Exception:
            pass
    return {}

def build_system_prompt(tonality: str, language: str, sample_examples: List[dict] = [], variation_index: int = 0, merlin_mode: bool = False, additional_context: str = None, vertical: str = "General") -> str:
    # Expanded Tonality Guides
    tonality_guides = {
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
        
        # Fallbacks for backward compatibility
        "Friendly": "You are a relaxed friend. Keep it low-key, easygoing, and conversational.",
        "Professional": "You are an authoritative expert. Speak with command and absolute confidence.",
        "Humorous": "You are a comedian. Witty, humorous, and entertaining.",
        "Motivational": "You are a guru and coach. Motivate them to achieve greatness.",
        "Sophisticated": "You are premium. Sophisticated, exclusive, and high-end.",
        "Promotional": "You are a closer. Convincing, logical, and compelling.",
        "FOMO": "You are a siren. Immediate action required. Create intense FOMO.",
    }

    language_guide = {
        "English": 'Write in clear, simple English.',
        "Hindi": 'Write primarily in Hindi (Devanagari script) with some English words for modern terms.',
        "Hinglish": 'Write in Hinglish - a natural mix of Hindi and English that Indian youth use. Use Latin script for both.',
        "Marathi": 'Write primarily in Marathi using Devanagari script with natural conversational tone.',
        "Bengali": 'Write primarily in Bengali using Bengali script with natural conversational tone.',
        "Tamil": 'Write primarily in Tamil using Tamil script with natural conversational tone.',
        "Telugu": 'Write primarily in Telugu using Telugu script with natural conversational tone.',
        "Gujarati": 'Write primarily in Gujarati using Gujarati script with natural conversational tone.',
        "Kannada": 'Write primarily in Kannada using Kannada script with natural conversational tone.',
        "Malayalam": 'Write primarily in Malayalam using Malayalam script with natural conversational tone.',
        "Digital Slang": 'Write in Gen-Z internet slang, using abbreviations, memes, and casual vibes.',
    }

    lang_note = ""
    if language in ["Hindi", "Marathi", "Bengali", "Tamil", "Telugu", "Gujarati", "Kannada", "Malayalam"]:
        lang_note = f"Write the ENTIRE message in {language} using its native script. Do NOT include full English sentences except for unavoidable brand names, URLs, or promo codes."
    elif language == "Hinglish":
        lang_note = "Write the ENTIRE message in Hinglish (Hindi + English mixed) using Latin script only. Do NOT use Devanagari or any other Indic script."
    else:
        lang_note = "Write the ENTIRE message in English. Do NOT mix in other languages except for 1–2 words if absolutely needed."

    # Load Knowledge Base Examples
    kb = _load_knowledge_base()
    kb_examples = kb.get(vertical, [])
    if not kb_examples and vertical != "General":
        # Try partial match
        for k in kb:
            if vertical.lower() in k.lower() or k.lower() in vertical.lower():
                kb_examples = kb[k]
                break
    
    # Combine provided samples with KB samples
    all_examples = sample_examples + kb_examples
    # Randomly select a few if too many
    if len(all_examples) > 5:
        import random
        all_examples = random.sample(all_examples, 5)

    examples_section = ""
    if all_examples:
        examples_str = "\n".join([
            f"Example {i+1}:\nTitle: {ex.get('title', ex.get('hook', ''))}\nMessage: {ex.get('message', ex.get('body', ''))}\nCTA: {ex.get('cta', '')}"
            for i, ex in enumerate(all_examples)
        ])
        examples_section = f"\n\nREAL SUCCESSFUL APP PUSH EXAMPLES ({vertical} - {tonality}):\n{examples_str}\n\nStudy these examples. Notice they are SHORT, PUNCHY, and DIRECT."

    component_guidance = "\n".join([f"- {item['category']}: {item['desc']}" for item in COMPONENT_LIBRARY])

    base_prompt = f"""You are an expert App Push Notification copywriter for Adda247.

TONALITY: {tonality_guides.get(tonality, tonality_guides.get('Friendly'))}

LANGUAGE: {language_guide.get(language, language_guide.get('Hinglish'))}

LANGUAGE ENFORCEMENT: {lang_note}{examples_section}

IMPORTANT RULES FOR APP PUSH NOTIFICATIONS:
1. **NO EMOJIS ALLOWED**: Strict rule.
2. **LENGTH CONSTRAINTS**: 
   - **Title/Hook**: Max 40-50 characters. Must be catchy.
   - **Body/Message**: Max 100-120 characters. Concise value prop.
3. **STRUCTURE**:
   - Title: Grabs attention immediately.
   - Body: Explains the 'What' and 'Why'.
   - CTA: Clear instruction.
4. Include personalization tokens: {{{{FIRST_NAME}}}}, {{{{COURSE_NAME}}}}.
5. Always include contact number: {{{{9667589247}}}} (can be in body or CTA).
6. **NO FLUFF**: Every word must earn its place.
7. Create urgency or excitement.
8. Focus on benefits.

OUTPUT FORMAT REQUIREMENTS:
- Respond with VALID JSON only. Structure:
{{
  "components": [
    {{
      "category": "FOMO",
      "emoji": "", 
      "hook": "Short Title (<50 chars)",
      "body": ["Short Body (<120 chars)"],
      "cta": "CTA line",
      "tonality": "{tonality}"
    }}
  ],
  "image_prompt": "Detailed description for an AI image generator to create a banner for this campaign. Style: Professional, Educational, Adda247 Brand Colors (Red/White).",
  "notes": "Optional single sentence reminder"
}}
- Choose categories from this library:
{component_guidance}
- Always include at least 3 variations/components.
- body MUST be an array with usually just 1 string for Push, or 2 very short lines.
"""

    if merlin_mode and additional_context:
        try:
            context_json = json.loads(additional_context)
            format_instruction = context_json.get("format_instruction", "")
            if format_instruction:
                base_prompt += f"\n\nOVERRIDE INSTRUCTION: {format_instruction}\nIgnore the standard component structure if the instruction asks for a specific JSON format (e.g. headline, body, cta_text)."
        except:
            pass

    return base_prompt


def build_user_prompt(params: CampaignRequest, variation_index: int = 0) -> str:
    prompt = f"""Create optimized APP PUSH NOTIFICATIONS for a {params.campaignType} campaign:

VERTICAL: {params.vertical}
TONALITY: {params.tonality}
LANGUAGE: {params.language}
AUDIENCE: {params.audience}
{f'OCCASION: {params.occasion}' if params.occasion else ''}
{f'OFFER: {params.offer}' if params.offer else ''}
{f'PROMO CODE: {params.promoCode}' if params.promoCode else ''}

REQUIREMENTS:
1. **Title**: Catchy, <50 chars.
2. **Body**: Value-driven, <120 chars.
3. **CTA**: Actionable.
4. **NO EMOJIS**.
5. Include {{{{9667589247}}}}.
6. **Image Prompt**: Include a detailed prompt for generating a matching banner image.

Make it highly creative and conversion-focused!
"""

    if params.merlinMode and params.additionalContext:
        prompt += f"\n\nADDITIONAL CONTEXT:\n{params.additionalContext}"

    if variation_index > 0:
        prompt += f"\n\nVARIATION {variation_index + 1}: Make it UNIQUE from previous ones."

    return prompt


@app.post("/generate-campaign-ai", response_model=CampaignResponse)
async def generate_campaign_ai(req: CampaignRequest):
    import google.generativeai as genai
    import os
    import datetime
    
    # Gemini Configuration
    # Using the key provided by the user
    gemini_key = os.getenv("GEMINI_API_KEY", "YOUR_GEMINI_API_KEY")
    genai.configure(api_key=gemini_key)

    # Model Configuration
    # Using gemini-1.5-flash for speed and quality, or gemini-pro
    model = genai.GenerativeModel('gemini-1.5-flash')

    system_prompt = build_system_prompt(
        req.tonality, 
        req.language, 
        req.sampleExamples or [], 
        req.variationIndex or 0,
        req.merlinMode,
        req.additionalContext,
        req.vertical
    )
    user_prompt = build_user_prompt(req, req.variationIndex or 0)

    # Combine system and user prompt for Gemini (or use system_instruction if supported by lib version)
    # For simplicity and compatibility, we'll combine them.
    full_prompt = f"{system_prompt}\n\nUSER REQUEST:\n{user_prompt}"

    try:
        response = model.generate_content(
            full_prompt,
            generation_config=genai.types.GenerationConfig(
                candidate_count=1,
                max_output_tokens=800,
                temperature=0.8,
                top_p=0.9,
                top_k=40,
                response_mime_type="application/json" # Enforce JSON output
            )
        )

        raw_message = response.text.strip()
        
        # Try to parse JSON
        components = []
        notes = ""
        image_prompt = ""
        try:
            clean_json = raw_message.replace("```json", "").replace("```", "").strip()
            parsed = json.loads(clean_json)
            components = parsed.get("components", [])
            notes = parsed.get("notes", "")
            image_prompt = parsed.get("image_prompt", "")
        except:
            print("Failed to parse JSON response, falling back to raw text")
        
        formatted_message = raw_message
        if components:
            formatted_message = format_components_to_text(components)

        # Generate Image Prompt if missing (Gemini might have skipped it)
        if not image_prompt:
             image_prompt = f"Professional educational banner for {req.vertical} exam preparation. Red and white theme. Text: '{req.vertical} Exam'."

        # LOGGING / STORAGE
        try:
            log_entry = {
                "timestamp": datetime.datetime.now().isoformat(),
                "request": req.dict(),
                "response_raw": raw_message,
                "components": components,
                "image_prompt": image_prompt,
                "model": "gemini-1.5-flash"
            }
            with open(BASE_DIR / "generation_history.jsonl", "a", encoding="utf-8") as f:
                f.write(json.dumps(log_entry, ensure_ascii=False) + "\n")
        except Exception as log_err:
            print(f"Logging failed: {log_err}")

        # Inject image prompt into notes
        if image_prompt:
            notes += f" [Image Prompt: {image_prompt}]"

        return CampaignResponse(
            message=formatted_message if not req.merlinMode else raw_message,
            components=components,
            notes=notes,
            model="gemini-1.5-flash",
            tokens={"total_tokens": 0} # Gemini doesn't always return token usage in simple response
        )

    except Exception as e:
        print(f"Error generating campaign: {e}")
        return CampaignResponse(
            message=f"Error generating campaign: {str(e)}",
            model="error"
        )


