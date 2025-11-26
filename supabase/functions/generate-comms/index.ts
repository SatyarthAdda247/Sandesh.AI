// deno-lint-ignore-file no-explicit-any
// Edge Function: generate-comms with deep analysis and S3 storage
// Accepts: { records, campaignSheets, mode }
// Returns: { suggestions, meta }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import {
  normalizeCampaignRecord,
  analyzeCampaigns,
  buildGenerationPrompt,
  parseCSV,
  type CampaignRecord,
} from "./analyzer.ts";
import { uploadToS3, getS3Config } from "./s3.ts";

type RevenueRecord = {
  record_date: string;
  vertical: string;
  product_name: string;
  orders: number;
  revenue: number;
  course_type?: string;
  source?: string;
  offer_discount?: string;
};

type SuggestionInput = {
  suggestion_date: string;
  vertical_id: string;
  hook: string;
  push_copy: string;
  cta: string;
  channel: string;
  urgency: string;
  link: string | null;
  score: number;
  status: string;
};

function pickUrgency(score: number): "High" | "Medium" | "Low" {
  if (score >= 0.85) return "High";
  if (score >= 0.7) return "Medium";
  return "Low";
}

function summarizeVertical(records: RevenueRecord[]): {
  totalRevenue: number;
  totalOrders: number;
  topProduct?: string;
  topProducts: Array<{ product: string; revenue: number; orders: number }>;
} {
  let totalRevenue = 0;
  let totalOrders = 0;
  const byProduct = new Map<string, { revenue: number; orders: number }>();

  for (const r of records) {
    totalRevenue += Number(r.revenue || 0);
    totalOrders += Number(r.orders || 0);
    if (r.product_name) {
      const existing = byProduct.get(r.product_name) || { revenue: 0, orders: 0 };
      byProduct.set(r.product_name, {
        revenue: existing.revenue + Number(r.revenue || 0),
        orders: existing.orders + Number(r.orders || 0),
      });
    }
  }

  const sorted = Array.from(byProduct.entries())
    .map(([product, data]) => ({ product, ...data }))
    .sort((a, b) => b.revenue - a.revenue);

  return {
    totalRevenue,
    totalOrders,
    topProduct: sorted[0]?.product,
    topProducts: sorted.slice(0, 3),
  };
}

async function ensureVerticalIds(
  supabase: ReturnType<typeof createClient>,
  verticalNames: string[]
): Promise<Record<string, string>> {
  const nameSet = Array.from(new Set(verticalNames));
  const { data, error } = await supabase.from("verticals").select("*").in("name", nameSet);
  if (error) throw error;

  const map: Record<string, string> = {};
  for (const v of data ?? []) {
    map[v.name] = v.id;
  }

  const missing = nameSet.filter((n) => !map[n]);
  if (missing.length > 0) {
    const { data: created, error: createErr } = await supabase
      .from("verticals")
      .insert(missing.map((name) => ({ name })))
      .select();
    if (createErr) throw createErr;
    for (const v of created ?? []) {
      map[v.name] = v.id;
    }
  }
  return map;
}

async function generateCopyWithAI(
  verticalName: string,
  summary: string,
  patterns: any,
  topProducts: Array<{ product: string; revenue: number; orders: number }>
): Promise<{ hook: string; push_copy: string; cta: string; channel: string; urgency: string; link: string; score: number }> {
  const endpoint = Deno.env.get("AZURE_OPENAI_ENDPOINT");
  const apiKey = Deno.env.get("AZURE_OPENAI_API_KEY");
  const apiVersion = Deno.env.get("AZURE_OPENAI_API_VERSION") ?? "2025-04-01-preview";
  const deployment = Deno.env.get("AZURE_OPENAI_DEPLOYMENT_NAME");

  // Fallback defaults
  const fallback = {
    hook: `${verticalName}: ${topProducts[0]?.product || "Trending Now"}`,
    push_copy: `Based on recent performance: ${summary}. Join thousands of successful learners.`,
    cta: "Enroll Now",
    channel: "App Push",
    urgency: "Medium",
    link: `https://adda247.com/${verticalName.toLowerCase().replace(/\s+/g, "-")}`,
    score: 0.75,
  };

  if (!endpoint || !apiKey || !deployment || !patterns) {
    return fallback;
  }

  try {
    const prompt = buildGenerationPrompt(patterns, verticalName, topProducts);
    const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;

    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content: "You are an expert marketing copywriter for Indian exam preparation platforms. Always return valid JSON.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 300,
      }),
    });

    if (!resp.ok) {
      console.error("Azure OpenAI error:", await resp.text());
      return fallback;
    }

    const data = await resp.json();
    const content = data?.choices?.[0]?.message?.content ?? "";
    const parsed = JSON.parse(content);

    return {
      hook: String(parsed.hook || fallback.hook).substring(0, 60),
      push_copy: String(parsed.push_copy || fallback.push_copy).substring(0, 120),
      cta: String(parsed.cta || fallback.cta).substring(0, 20),
      channel: String(parsed.channel || fallback.channel),
      urgency: String(parsed.urgency || fallback.urgency),
      link: String(parsed.link || fallback.link),
      score: Number(parsed.score || fallback.score),
    };
  } catch (err) {
    console.error("AI generation error:", err);
    return fallback;
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { 
        status: 405,
        headers: corsHeaders,
      });
    }

    const body = await req.json();
    const records: RevenueRecord[] = Array.isArray(body?.records) ? body.records : [];
    const campaignSheets: string[] = Array.isArray(body?.campaignSheets) ? body.campaignSheets : [];
    const mode: "quick" | "deep" = body?.mode === "deep" ? "deep" : "quick";
    const suggestionDate: string =
      typeof body?.date === "string" && body.date ? body.date : new Date().toISOString().split("T")[0]!;

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Step 1: Store campaign sheets in S3
    const s3Config = getS3Config();
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

    if (s3Config && campaignSheets.length > 0) {
      for (let i = 0; i < campaignSheets.length; i++) {
        const key = `uploads/${timestamp}/campaign-sheet-${i}.csv`;
        await uploadToS3(key, campaignSheets[i], "text/csv", s3Config);
      }
    }

    // Step 2: Deep analysis of historical campaigns
    let patterns = null;
    const historicalCampaigns: CampaignRecord[] = [];

    if (mode === "deep" && campaignSheets.length > 0) {
      for (const csv of campaignSheets) {
        const rows = parseCSV(csv);
        for (const row of rows) {
          const normalized = normalizeCampaignRecord(row);
          if (normalized.hook || normalized.pushCopy) {
            historicalCampaigns.push(normalized);
          }
        }
      }
      patterns = analyzeCampaigns(historicalCampaigns);
    }

    // Step 3: Group revenue by vertical
    const byVertical = new Map<string, RevenueRecord[]>();
    for (const r of records) {
      if (!r.vertical) continue;
      const key = r.vertical.trim();
      if (!byVertical.has(key)) byVertical.set(key, []);
      byVertical.get(key)!.push(r);
    }

    const verticalIdMap = await ensureVerticalIds(supabase, Array.from(byVertical.keys()));

    // Step 4: Generate suggestions per vertical
    const suggestions: SuggestionInput[] = [];

    for (const [verticalName, list] of byVertical) {
      const summaryData = summarizeVertical(list);
      const strength =
        summaryData.totalOrders > 0 ? Math.min(1, summaryData.totalRevenue / (summaryData.totalOrders * 1000)) : 0.5;
      const baseScore = Math.round((0.6 + 0.4 * strength) * 1000) / 1000;

      const summary =
        `Revenue ₹${summaryData.totalRevenue.toFixed(0)}, Orders ${summaryData.totalOrders}` +
        (summaryData.topProduct ? `, Top: ${summaryData.topProduct}` : "");

      const ai = await generateCopyWithAI(verticalName, summary, patterns, summaryData.topProducts);

      suggestions.push({
        suggestion_date: suggestionDate,
        vertical_id: verticalIdMap[verticalName],
        hook: ai.hook,
        push_copy: ai.push_copy,
        cta: ai.cta,
        channel: ai.channel,
        urgency: ai.urgency,
        link: ai.link,
        score: ai.score || baseScore,
        status: "pending",
      });
    }

    // Step 5: Store generated suggestions in S3
    if (s3Config && suggestions.length > 0) {
      const key = `generated/${timestamp}/suggestions.json`;
      await uploadToS3(key, JSON.stringify(suggestions, null, 2), "application/json", s3Config);
    }

    return new Response(
      JSON.stringify({
        suggestions,
        meta: {
          analyzed_campaigns: historicalCampaigns.length,
          stored_in_s3: s3Config !== null,
          mode,
          patterns_extracted: patterns !== null,
        },
      }),
      {
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (e: any) {
    console.error("Function error:", e);
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500,
      headers: { 
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  }
});
