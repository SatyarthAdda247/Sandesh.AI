import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Sparkles,
  Copy,
  RefreshCw,
  Send,
  Save,
  Edit3,
  Check,
  CheckCircle2,
  X,
  Image as ImageIcon,
  Loader2,
  Compass,
  ShieldAlert,
  TrendingUp,
  Activity,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { MerlinGenerator } from "@/components/MerlinGenerator";
import CampaignHistory from "@/components/CampaignHistory";

const VERTICALS = [
  "CUET PG", "SSC", "BANKING", "UPSC", "CUET Hindi", "CTET", "DEFENCE",
  "RAILWAYS", "UTTAR_PRADESH", "BIHAR", "ENGINEERING", "RAJASTHAN",
  "K12 & CUET UG", "JAIIB_CAIIB", "MADHYA_PRADESH", "ODISHA_STATE_EXAMS",
  "REGULATORY_BODIES", "WEST_BENGAL", "ANDHRA_PRADESH", "HARYANA",
  "बैंकिंग", "AGRICULTURE", "MAHARASHTRA", "Teaching", "GUJARAT",
  "UGC_NET", "SKILL_DEVELOPMENT", "एस.एस.सी", "TAMIL_NADU", "KERALA",
  "FCI", "UTTARAKHAND", "एसएससी", "NORTH_EAST_STATE_EXAMS", "JHARKHAND"
];

const CAMPAIGN_TYPES = [
  { value: "Revenue", label: "Revenue" },
  { value: "Engagement", label: "Engagement" },
  { value: "Retention", label: "Retention" },
  { value: "Activation", label: "Activation" }
];

const LANGUAGES = [
  { value: "English", label: "English" },
  { value: "Hindi", label: "Hindi" },
  { value: "Hinglish", label: "Hinglish (Mix)" },
  { value: "Marathi", label: "Marathi" },
  { value: "Bengali", label: "Bengali" },
  { value: "Tamil", label: "Tamil" },
  { value: "Telugu", label: "Telugu" },
  { value: "Gujarati", label: "Gujarati" },
  { value: "Kannada", label: "Kannada" },
  { value: "Malayalam", label: "Malayalam" },
];

interface BulkGeneratedCampaign {
  id: number;
  message: string;
  hook: string;
  cta: string;
  status: "pending" | "generating" | "success" | "error";
  error?: string;
  components?: GeneratedComponent[];
}

interface SamplePushExample {
  hook: string;
  body: string;
  cta: string;
  full_message: string;
}

interface TrendInsight {
  title: string;
  category: string;
  emoji: string;
  summary: string;
  rationale: string;
  tags?: string[];
}

interface LintIssue {
  severity: "info" | "warning" | "error";
  message: string;
  suggestion?: string;
}

interface LintReport {
  issues: LintIssue[];
  emojis_found: number;
  length: number;
}

interface GeneratedComponent {
  category: string;
  hook: string;
  body: string | string[];
  cta: string;
  emoji?: string;
  tonality?: string;
}

const TONALITIES = [
  { value: "funny", label: "😂 Funny", desc: "Humorous and entertaining" },
  { value: "fomo", label: "⏰ FOMO", desc: "Urgency and scarcity" },
  { value: "serious", label: "📚 Serious", desc: "Professional and informative" },
  { value: "celebratory", label: "🎉 Celebratory", desc: "Festive and exciting" },
  { value: "motivational", label: "💪 Motivational", desc: "Inspiring and encouraging" },
  { value: "friendly", label: "😊 Friendly", desc: "Warm and conversational" },
  { value: "premium", label: "✨ Premium", desc: "Exclusive and high-value" }
];

export default function CampaignGenerator() {
  const [activeTab, setActiveTab] = useState<'merlin' | 'history'>('merlin');
  const [campaignType, setCampaignType] = useState("Revenue");
  const [vertical, setVertical] = useState("");
  const [language, setLanguage] = useState("Hinglish");
  const [tonality, setTonality] = useState("");
  const [audience, setAudience] = useState("");
  const [occasion, setOccasion] = useState("");
  const [offer, setOffer] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [pdpLink, setPdpLink] = useState("");
  const [generatedMessage, setGeneratedMessage] = useState("");
  const [editedMessage, setEditedMessage] = useState("");
  const [generating, setGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generateImage, setGenerateImage] = useState(false);
  const [imageWebhookUrl, setImageWebhookUrl] = useState("");
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [generatingImage, setGeneratingImage] = useState(false);

  // Bulk generation states
  const [bulkBatchSize, setBulkBatchSize] = useState(25);
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [bulkCampaigns, setBulkCampaigns] = useState<BulkGeneratedCampaign[]>([]);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [sampleExamples, setSampleExamples] = useState<SamplePushExample[]>([]);
  const [loadingExamples, setLoadingExamples] = useState(false);
  const [customSampleText, setCustomSampleText] = useState("");

  // Event recommendations
  const [edtechEvents, setEdtechEvents] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [trendInsights, setTrendInsights] = useState<TrendInsight[]>([]);
  const [selectedTrend, setSelectedTrend] = useState<TrendInsight | null>(null);
  const [instaRationale, setInstaRationale] = useState("");
  const [lintReport, setLintReport] = useState<LintReport | null>(null);
  const [linting, setLinting] = useState(false);
  const [moengagePayload, setMoengagePayload] = useState<any | null>(null);
  const [moengageRecommendation, setMoengageRecommendation] = useState<string | null>(null);
  const [generatedComponents, setGeneratedComponents] = useState<GeneratedComponent[]>([]);

  const trendServiceUrl =
    (import.meta.env.VITE_TREND_SERVICE_URL as string | undefined)?.trim() || "";
  const trendServiceEnabled = trendServiceUrl.length > 0;
  const [trendServiceHealthy, setTrendServiceHealthy] = useState(trendServiceEnabled);
  const recentMessagesRef = useRef<Set<string>>(new Set());

  const normalizeMessage = (message: string) => message.replace(/\s+/g, " ").trim().toLowerCase();
  const hasSeenMessage = (message: string | null | undefined) => {
    if (!message) return false;
    return recentMessagesRef.current.has(normalizeMessage(message));
  };
  const rememberMessage = (message: string | null | undefined) => {
    if (!message) return;
    const normalized = normalizeMessage(message);
    recentMessagesRef.current.add(normalized);
    if (recentMessagesRef.current.size > 120) {
      const recentList = Array.from(recentMessagesRef.current).slice(-80);
      recentMessagesRef.current = new Set(recentList);
    }
  };

  const formatComponentsToText = (components: GeneratedComponent[]) => {
    if (!components || components.length === 0) return "";
    return components
      .map((component) => {
        const bodyText = Array.isArray(component.body)
          ? component.body.map((item) => (item.startsWith("👉") || item.startsWith("✔") ? item : `👉 ${item}`)).join("\n")
          : component.body;
        return `${component.emoji ? `${component.emoji} ` : ""}${component.category}\n${component.hook}\n${bodyText}\nCTA: ${component.cta}`;
      })
      .join("\n\n");
  };

  useEffect(() => {
    loadSamplePushesExamples();
    if (trendServiceEnabled) {
      loadTrendInsights();
      loadEdTechEvents();
    } else {
      setTrendServiceHealthy(false);
    }
  }, [trendServiceUrl]);

  const loadSamplePushesExamples = async () => {
    setLoadingExamples(true);
    try {
      const response = await fetch("/analysis-output/sample_pushes_training.json");
      if (response.ok) {
        const data = await response.json();
        const examples: SamplePushExample[] = [];
        Object.values(data.categories || {}).forEach((category: any) => {
          if (category.examples) {
            category.examples.forEach((ex: any) => {
              examples.push({
                hook: ex.hook || "",
                body: ex.body || "",
                cta: ex.cta || "",
                full_message: ex.full_message || `${ex.hook}\n\n${ex.body}\n\n${ex.cta}`,
              });
            });
          }
        });
        setSampleExamples(examples);
      } else {
        await loadSamplePushesFromCSV();
      }
    } catch (error) {
      console.error("Failed to load training examples:", error);
      await loadSamplePushesFromCSV();
    } finally {
      setLoadingExamples(false);
    }
  };

  const loadSamplePushesFromCSV = async () => {
    try {
      const response = await fetch("/Sample Pushes.csv");
      if (!response.ok) return;
      const csv = await response.text();
      setSampleExamples(parseSamplePushesCSV(csv));
    } catch (error) {
      console.error("Failed to load Sample Pushes CSV:", error);
    }
  };

  const parseSamplePushesCSV = (text: string): SamplePushExample[] => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) return [];
    const headers = parseCSVLine(lines[0]).map((h) => h.trim().replace(/^"|"$/g, ""));
    const examples: SamplePushExample[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length < headers.length) continue;
      const row: any = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx]?.trim().replace(/^"|"$/g, "") || "";
      });
      if (row["ENG TITLE"] || row["ENG DESC"] || row["CTA"]) {
        examples.push({
          hook: row["ENG TITLE"] || "",
          body: row["ENG DESC"] || "",
          cta: row["CTA"] || "",
          full_message: `${row["ENG TITLE"] || ""}\n\n${row["ENG DESC"] || ""}\n\n${row["CTA"] || ""}`.trim(),
        });
      }
    }
    return examples.filter((ex) => ex.full_message.length > 0);
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        result.push(current);
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  };

  const addCustomSample = () => {
    if (!customSampleText.trim()) {
      toast.error("Paste a sample push before adding");
      return;
    }

    const lines = customSampleText.trim().split(/\r?\n/).filter((line) => line.trim());
    const hook = lines[0] || "Custom Hook";
    const cta = lines.length > 1 ? lines[lines.length - 1] : "CTA";
    const body =
      lines.length > 2 ? lines.slice(1, lines.length - 1).join("\n") : lines.slice(1).join("\n");

    const newExample: SamplePushExample = {
      hook,
      body,
      cta,
      full_message: customSampleText.trim(),
    };

    setSampleExamples((prev) => [newExample, ...prev]);
    setCustomSampleText("");
    toast.success("Custom sample added for GPT-5-mini");
  };

  const loadTrendInsights = async () => {
    try {
      const response = await fetch(`${trendServiceUrl}/trend-insights`);
      if (!response.ok) throw new Error("Trend service unavailable");
      const data = await response.json();
      setTrendInsights(data.items || []);
      setTrendServiceHealthy(true);
    } catch (error) {
      console.warn("Trend insights fallback:", error);
      setTrendInsights([]);
      setTrendServiceHealthy(false);
    }
  };

  const loadEdTechEvents = async () => {
    setLoadingEvents(true);
    try {
      const response = await fetch(`${trendServiceUrl}/edtech-events`);
      if (!response.ok) throw new Error("Events service unavailable");
      const data = await response.json();
      setEdtechEvents(data.events || []);
    } catch (error) {
      console.warn("EdTech events fallback:", error);
      setEdtechEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  };

  const handleSelectEvent = (event: any | null) => {
    setSelectedEvent(event);
    if (event) {
      setOccasion(event.title);
      // Auto-suggest tonality if event has recommendations
      if (event.suggested_tonality && event.suggested_tonality.length > 0 && !tonality) {
        setTonality(event.suggested_tonality[0]);
      }
      toast.success(`Selected: ${event.title} (${event.days_until} days away)`);
    } else {
      setOccasion("");
    }
  };

  const runLintCheck = async (text: string) => {
    if (!text) return;
    if (!trendServiceEnabled || !trendServiceHealthy) {
      toast.message("Linting unavailable while trend service is offline.");
      return;
    }
    setLinting(true);
    try {
      const response = await fetch(`${trendServiceUrl}/lint`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!response.ok) throw new Error("Lint service unavailable");
      const data = (await response.json()) as LintReport;
      setLintReport(data);
    } catch (error: any) {
      console.error("Lint error", error);
      toast.error(`Linting failed: ${error.message || error}`);
      setTrendServiceHealthy(false);
    } finally {
      setLinting(false);
    }
  };

  const prepareMoEngagePayload = async (message: string, ctaText: string) => {
    if (!message) return;
    if (!trendServiceEnabled || !trendServiceHealthy) {
      toast.message("MoEngage payload helper disabled (trend service offline).");
      return;
    }
    try {
      const response = await fetch(`${trendServiceUrl}/moengage/payload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vertical,
          tonality,
          audience,
          trend: selectedTrend?.title,
          pdp_link: pdpLink || null,
          campaign_text: message,
          cta: ctaText || "Learn More",
          tags: selectedTrend?.tags || [],
        }),
      });
      if (!response.ok) throw new Error("MoEngage helper unavailable");
      const data = await response.json();
      setMoengagePayload(data.payload);
      setMoengageRecommendation(data.recommended_send_time);
    } catch (error: any) {
      console.error("MoEngage payload error", error);
      toast.error(`MoEngage prep failed: ${error.message || error}`);
      setTrendServiceHealthy(false);
    }
  };

  const handleSelectTrend = (trend: TrendInsight | null) => {
    setSelectedTrend(trend);
    if (trend) {
      setInstaRationale(trend.rationale);
    } else {
      setInstaRationale("");
    }
  };

  const copyMoEngagePayload = () => {
    if (!moengagePayload) return;
    navigator.clipboard.writeText(JSON.stringify(moengagePayload, null, 2));
    toast.success("MoEngage payload copied!");
  };

  const lintSeverityClass = (severity: string) => {
    switch (severity) {
      case "error":
        return "text-red-500";
      case "warning":
        return "text-amber-500";
      default:
        return "text-muted-foreground";
    }
  };

  const generateCampaign = async () => {
    if (!vertical || !tonality || !audience) {
      toast.error("Please fill in Vertical, Tonality, and Audience");
      return;
    }

    setLintReport(null);
    setMoengagePayload(null);
    setMoengageRecommendation(null);
    setGenerating(true);
    setGeneratedComponents([]);

    try {
      const MAX_UNIQUE_ATTEMPTS = 3;
      let finalMessage: string | null = null;
      let finalTokens: any = null;
      let finalComponents: GeneratedComponent[] = [];

      for (let attempt = 0; attempt < MAX_UNIQUE_ATTEMPTS; attempt++) {
        const { data: genData, error: genError } = await supabase.functions.invoke('generate-campaign-gemini', {
          body: {
            campaignType,
            vertical,
            language,
            tonality,
            audience,
            occasion,
            offer,
            promoCode,
            trendContext: selectedTrend,
            instaRationale,
            pdpLink,
            variationIndex: attempt,
            sampleExamples: []
          }
        });

        if (genError) {
          console.error('Generation error:', genError);
          toast.error(`Failed to generate: ${genError.message}`);
          return;
        }

        const candidateComponents: GeneratedComponent[] = genData?.components || [];
        const candidateMessage =
          formatComponentsToText(candidateComponents) || genData?.message || "";

        if (candidateMessage && !hasSeenMessage(candidateMessage)) {
          finalMessage = candidateMessage;
          finalTokens = data.tokens;
          finalComponents = candidateComponents;
          rememberMessage(candidateMessage);
          break;
        }
      }

      if (!finalMessage) {
        toast.error("Could not generate a unique message. Please try again.");
        return;
      }

      setGeneratedMessage(finalMessage);
      setEditedMessage(finalMessage);
      setIsEditing(false);
      setGeneratedComponents(finalComponents);
      toast.success(`Campaign generated with GPT-5-mini! (${finalTokens?.total_tokens || 0} tokens)`);
      runLintCheck(finalMessage);
      prepareMoEngagePayload(finalMessage, extractCTA(finalMessage));

      if (generateImage && imageWebhookUrl) {
        handleGenerateImage(finalMessage);
      }
    } catch (error: any) {
      console.error('Campaign generation error:', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateImage = async (campaignText: string) => {
    if (!imageWebhookUrl) {
      toast.error("Please provide image generation webhook URL");
      return;
    }

    setGeneratingImage(true);
    setGeneratedImageUrl(null);

    try {
      const response = await fetch(imageWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          campaign_text: campaignText,
          vertical: vertical,
          tonality: tonality,
          language: language,
          occasion: occasion || null,
          offer: offer || null,
          promo_code: promoCode || null,
        }),
      });

      if (!response.ok) {
        throw new Error(`Webhook returned ${response.status}`);
      }

      const data = await response.json();

      // Handle different response formats
      const imageUrl = data.image_url || data.url || data.image || data.data?.image_url || data.data?.url;

      if (imageUrl) {
        setGeneratedImageUrl(imageUrl);
        toast.success("Image generated successfully!");
      } else {
        throw new Error("No image URL in response");
      }
    } catch (error: any) {
      console.error('Image generation error:', error);
      toast.error(`Failed to generate image: ${error.message}`);
    } finally {
      setGeneratingImage(false);
    }
  };

  const copyToClipboard = () => {
    const textToCopy = isEditing ? editedMessage : generatedMessage;
    navigator.clipboard.writeText(textToCopy);
    toast.success("Copied to clipboard!");
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditedMessage(generatedMessage);
    setIsEditing(false);
  };

  const handleSaveEdit = () => {
    setGeneratedMessage(editedMessage);
    setIsEditing(false);
    toast.success("Changes saved!");
  };

  const handleSaveToDraft = async () => {
    if (!generatedMessage) {
      toast.error("Generate a campaign first!");
      return;
    }

    setSaving(true);
    try {
      // Get or create vertical
      const { data: verticalData, error: verticalError } = await supabase
        .from('verticals')
        .select('id')
        .eq('name', vertical)
        .single();

      let verticalId = verticalData?.id;

      if (!verticalData) {
        const { data: newVertical, error: createError } = await supabase
          .from('verticals')
          .insert([{ name: vertical }])
          .select('id')
          .single();

        if (createError) throw createError;
        verticalId = newVertical.id;
      }

      // Save to suggestions table
      const { error } = await supabase.from('suggestions').insert({
        suggestion_date: new Date().toISOString().split('T')[0],
        vertical_id: verticalId,
        hook: extractHook(isEditing ? editedMessage : generatedMessage),
        push_copy: isEditing ? editedMessage : generatedMessage,
        cta: extractCTA(isEditing ? editedMessage : generatedMessage),
        channel: 'push',
        urgency: tonality === 'fomo' ? 'High' : tonality === 'serious' ? 'Low' : 'Medium',
        link: pdpLink || '',
        score: 0.85,
        status: 'pending',
        promo_code: promoCode || null,
        trend_context: selectedTrend,
        insta_rationale: instaRationale || null,
        lint_report: lintReport,
        proof_state: 'unreviewed',
      });

      if (error) throw error;

      toast.success("Campaign saved to drafts!");
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error(`Failed to save: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handlePushToMoEngage = async () => {
    if (!generatedMessage) {
      toast.error("Generate a campaign first!");
      return;
    }

    if (!moengagePayload) {
      await prepareMoEngagePayload(isEditing ? editedMessage : generatedMessage, extractCTA(isEditing ? editedMessage : generatedMessage));
    }

    // Save with approved status for future MoEngage push
    setSaving(true);
    try {
      const { data: verticalData } = await supabase
        .from('verticals')
        .select('id')
        .eq('name', vertical)
        .single();

      let verticalId = verticalData?.id;

      if (!verticalData) {
        const { data: newVertical } = await supabase
          .from('verticals')
          .insert([{ name: vertical }])
          .select('id')
          .single();
        verticalId = newVertical?.id;
      }

      const messageToSave = isEditing ? editedMessage : generatedMessage;

      const { data: inserted, error } = await supabase.from('suggestions').insert([{
        suggestion_date: new Date().toISOString().split('T')[0],
        vertical_id: verticalId,
        hook: extractHook(messageToSave),
        push_copy: messageToSave,
        cta: extractCTA(messageToSave),
        channel: 'push',
        urgency: tonality === 'fomo' ? 'High' : 'Medium',
        link: pdpLink || '',
        score: 0.90,
        status: 'approved',
        approved_at: new Date().toISOString(),
        promo_code: promoCode || null,
        trend_context: selectedTrend as any,
        insta_rationale: instaRationale || null,
        lint_report: lintReport,
        publish_payload: moengagePayload,
        proof_state: 'reviewing',
      }]).select().single();

      if (error) throw error;

      await supabase.from('audits').insert([{
        action: 'moengage_payload_ready',
        object_type: 'suggestion',
        object_id: inserted?.id || null,
        details: {
          payload: moengagePayload,
          recommendation: moengageRecommendation,
        },
      }]);

      toast.success("Campaign ready for MoEngage push and logged!");
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Helper functions
  const extractHook = (message: string): string => {
    const lines = message.split('\n');
    return lines[0].substring(0, 100);
  };

  const extractCTA = (message: string): string => {
    const ctaMatch = message.match(/👉[^}]*(Code|Call|Click|Join|Get|Unlock)[^}]*?(?=\n|$)/i);
    return ctaMatch ? ctaMatch[0].replace('👉', '').trim().substring(0, 30) : 'Learn More';
  };

  const generateBulkCampaigns = async () => {
    if (!vertical || !tonality || !audience) {
      toast.error("Please fill in Vertical, Tonality, and Audience");
      setActiveTab("bulk");
      return;
    }
    if (sampleExamples.length === 0) {
      toast.error("Sample Pushes examples not loaded yet");
      return;
    }
    if (bulkBatchSize < 1 || bulkBatchSize > 50) {
      toast.error("Batch size must be between 1 and 50");
      return;
    }

    setBulkGenerating(true);
    setBulkProgress(0);
    const initialCampaigns: BulkGeneratedCampaign[] = Array.from({ length: bulkBatchSize }, (_, i) => ({
      id: i + 1,
      message: "",
      hook: "",
      cta: "",
      status: "pending",
    }));
    setBulkCampaigns(initialCampaigns);

    let successCounter = 0;
    const seenMessages = new Set<string>(recentMessagesRef.current);
    const MAX_RETRIES = 3;

    for (let i = 0; i < bulkBatchSize; i++) {
      setBulkCampaigns((prev) => {
        const updated = [...prev];
        updated[i].status = "generating";
        return updated;
      });

      let attempts = 0;
      let generatedSuccessfully = false;

      while (attempts < MAX_RETRIES && !generatedSuccessfully) {
        try {
          const exampleSubset = sampleExamples.slice(
            (i + attempts) % sampleExamples.length,
            (i + attempts) % sampleExamples.length + 5
          );
          const { data: genData, error: genError } = await supabase.functions.invoke('generate-campaign-gemini', {
            body: {
              campaignType,
              vertical,
              language,
              tonality,
              audience,
              occasion: occasion || undefined,
              offer: offer || undefined,
              promoCode: promoCode || undefined,
              trendContext: selectedTrend,
              instaRationale,
              sampleExamples: exampleSubset.length > 0 ? exampleSubset : sampleExamples.slice(0, 5),
              variationIndex: i * MAX_RETRIES + attempts,
            }
          });

          if (genError) throw genError;

          const candidateComponents: GeneratedComponent[] = genData?.components || [];
          const candidateMessage = formatComponentsToText(candidateComponents) || genData?.message || "";
          if (!candidateMessage) throw new Error("No response from GPT-5-mini");

          const normalized = normalizeMessage(candidateMessage);
          if (seenMessages.has(normalized) || hasSeenMessage(candidateMessage)) {
            attempts++;
            continue;
          }

          const message = candidateMessage;
          const hook = message.split("\n").filter((l: string) => l.trim())[0] || message.substring(0, 100);
          const cta = extractCTA(message);

          seenMessages.add(normalized);
          rememberMessage(message);

          setBulkCampaigns((prev) => {
            const updated = [...prev];
            updated[i] = { ...updated[i], message, hook, cta, components: genData?.components || [], status: "success" };
            return updated;
          });
          successCounter += 1;
          generatedSuccessfully = true;
        } catch (error: any) {
          console.error(`Bulk generation error #${i + 1} attempt ${attempts + 1}:`, error);
          attempts++;
          if (attempts >= MAX_RETRIES) {
            setBulkCampaigns((prev) => {
              const updated = [...prev];
              updated[i].status = "error";
              updated[i].error = error.message || "GPT-5-mini failed";
              return updated;
            });
          }
        }
      }

      setBulkProgress(((i + 1) / bulkBatchSize) * 100);
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    recentMessagesRef.current = seenMessages;
    setBulkGenerating(false);
    toast.success(`Bulk generation completed with ${successCounter}/${bulkBatchSize} successes.`);
  };

  const saveBulkCampaigns = async () => {
    const successful = bulkCampaigns.filter((c) => c.status === "success");
    if (successful.length === 0) {
      toast.error("No successful campaigns to save");
      return;
    }

    setBulkSaving(true);
    try {
      const { data: verticalData } = await supabase
        .from("verticals")
        .select("id")
        .eq("name", vertical)
        .single();

      let verticalId = verticalData?.id;

      if (!verticalData) {
        const { data: newVertical } = await supabase
          .from("verticals")
          .insert({ name: vertical })
          .select("id")
          .single();
        verticalId = newVertical?.id;
      }

      const today = new Date().toISOString().split("T")[0];
      const suggestions = successful.map((campaign) => ({
        suggestion_date: today,
        vertical_id: verticalId,
        hook: campaign.hook,
        push_copy: campaign.message,
        cta: campaign.cta,
        channel: "push",
        urgency: tonality === "fomo" ? "High" : tonality === "serious" ? "Low" : "Medium",
        link: pdpLink || "",
        score: 0.85,
        status: "pending",
        promo_code: promoCode || null,
        trend_context: selectedTrend,
        insta_rationale: instaRationale || null,
      }));

      const { error } = await supabase.from("suggestions").insert(suggestions);
      if (error) throw error;

      toast.success(`Saved ${successful.length} campaigns to database!`);
    } catch (error: any) {
      console.error("Bulk save error:", error);
      toast.error(`Failed to save: ${error.message}`);
    } finally {
      setBulkSaving(false);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">AI Campaign Lab</h1>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "merlin" | "history")} className="space-y-6">
        <TabsList>
          <TabsTrigger value="merlin">Sandesh.AI</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="merlin" className="space-y-6">
          <MerlinGenerator />
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <CampaignHistory />
        </TabsContent>

        <TabsContent value="single" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Campaign Details</CardTitle>
                <CardDescription>Configure your campaign parameters</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Campaign Type */}
                <div className="space-y-2">
                  <Label>Campaign Type</Label>
                  <Select value={campaignType} onValueChange={setCampaignType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CAMPAIGN_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Vertical */}
                <div className="space-y-2">
                  <Label>Category / Vertical *</Label>
                  <Select value={vertical} onValueChange={setVertical}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select vertical" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {VERTICALS.map((v) => (
                        <SelectItem key={v} value={v}>
                          {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Language */}
                <div className="space-y-2">
                  <Label>Language</Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map((lang) => (
                        <SelectItem key={lang.value} value={lang.value}>
                          {lang.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Tonality */}
                <div className="space-y-2">
                  <Label>Tonality *</Label>
                  <Select value={tonality} onValueChange={setTonality}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select tonality" />
                    </SelectTrigger>
                    <SelectContent>
                      {TONALITIES.map((tone) => (
                        <SelectItem key={tone.value} value={tone.value}>
                          {tone.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Audience */}
                <div className="space-y-2">
                  <Label>Audience Type *</Label>
                  <Textarea
                    value={audience}
                    onChange={(e) => setAudience(e.target.value)}
                    placeholder="e.g., Last 3 month users who have done PDP, ATC, PG, Abandon, uninstall"
                    rows={3}
                  />
                </div>

                {/* Optional Fields */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Occasion / Event (Optional)</Label>
                    {selectedEvent && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleSelectEvent(null)}
                        className="h-6 text-xs"
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                  <Input
                    value={occasion}
                    onChange={(e) => setOccasion(e.target.value)}
                    placeholder="e.g., Teachers Day, Diwali, New Year"
                  />

                  {/* Event Recommendations */}
                  {trendServiceHealthy && edtechEvents.length > 0 && (
                    <div className="mt-2 space-y-2">
                      <Label className="text-xs text-muted-foreground flex items-center gap-2">
                        <Compass className="h-3 w-3" />
                        Recommended Events for Indian EdTech
                      </Label>
                      <div className="max-h-32 overflow-y-auto border rounded p-2 space-y-1">
                        {loadingEvents ? (
                          <div className="text-xs text-muted-foreground flex items-center gap-2">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Loading events...
                          </div>
                        ) : (
                          edtechEvents
                            .filter((e) => !vertical || e.verticals.includes(vertical) || e.verticals.includes("ALL"))
                            .slice(0, 8)
                            .map((event) => (
                              <Button
                                key={event.title}
                                type="button"
                                size="sm"
                                variant={selectedEvent?.title === event.title ? "default" : "outline"}
                                onClick={() => handleSelectEvent(selectedEvent?.title === event.title ? null : event)}
                                className="w-full justify-start text-xs h-auto py-1.5"
                              >
                                <span className="mr-2">{event.emoji}</span>
                                <div className="flex-1 text-left">
                                  <div className="font-medium">{event.title}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {event.days_until === 0
                                      ? "Today"
                                      : event.days_until === 1
                                        ? "Tomorrow"
                                        : `${event.days_until} days`}
                                    {" • "}
                                    {event.category}
                                  </div>
                                </div>
                              </Button>
                            ))
                        )}
                      </div>
                      {selectedEvent && (
                        <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                          <strong>{selectedEvent.title}:</strong> {selectedEvent.relevance}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Offer Details (Optional)</Label>
                  <Input
                    value={offer}
                    onChange={(e) => setOffer(e.target.value)}
                    placeholder="e.g., 50% Off + 1% Extra with Coin"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Promo Code (Optional)</Label>
                  <Input
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    placeholder="e.g., PGWA, SALE50"
                  />
                </div>

                <div className="space-y-2">
                  <Label>PDP / Deep Link (Optional)</Label>
                  <Input
                    value={pdpLink}
                    onChange={(e) => setPdpLink(e.target.value)}
                    placeholder="https://adda247.com/product-page"
                  />
                </div>

                <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        Trend Intelligence
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Pulls daily exam / influencer buzz to justify the push
                      </p>
                    </div>
                    <Badge variant={trendServiceHealthy ? "outline" : "destructive"}>
                      {trendServiceEnabled
                        ? trendServiceHealthy
                          ? selectedTrend
                            ? `${selectedTrend.emoji} ${selectedTrend.title}`
                            : "Auto-select"
                          : "Service offline"
                        : "Disabled"}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {trendInsights.length === 0 && trendServiceHealthy && (
                      <span className="text-xs text-muted-foreground">No trends loaded</span>
                    )}
                    {!trendServiceHealthy && (
                      <span className="text-xs text-destructive">
                        Trend intelligence disabled. Start helper service on :8787.
                      </span>
                    )}
                    {trendInsights.map((trend) => (
                      <Button
                        key={trend.title}
                        type="button"
                        size="sm"
                        variant={selectedTrend?.title === trend.title ? "default" : "outline"}
                        onClick={() =>
                          handleSelectTrend(
                            selectedTrend?.title === trend.title ? null : trend
                          )
                        }
                        className="text-xs"
                      >
                        {trend.emoji} {trend.title}
                      </Button>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      Insta / social rationale
                    </Label>
                    <Textarea
                      value={instaRationale}
                      onChange={(e) => setInstaRationale(e.target.value)}
                      rows={3}
                      placeholder="Explain how this push ties back to current Insta or influencer trend."
                    />
                  </div>
                </div>

                {/* Image Generation */}
                <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="generate-image"
                      checked={generateImage}
                      onCheckedChange={(checked) => setGenerateImage(checked as boolean)}
                    />
                    <Label htmlFor="generate-image" className="font-medium cursor-pointer">
                      Generate Campaign Image
                    </Label>
                  </div>
                  {generateImage && (
                    <div className="space-y-2 pl-6">
                      <Label htmlFor="image-webhook">Image Generation Webhook URL</Label>
                      <Input
                        id="image-webhook"
                        value={imageWebhookUrl}
                        onChange={(e) => setImageWebhookUrl(e.target.value)}
                        placeholder="https://your-webhook-url.com/generate-image"
                        type="url"
                      />
                      <p className="text-xs text-muted-foreground">
                        Webhook will receive campaign details and return an image URL
                      </p>
                    </div>
                  )}
                </div>

                <Button
                  onClick={generateCampaign}
                  disabled={generating || !vertical || !tonality || !audience}
                  className="w-full"
                  size="lg"
                >
                  {generating ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Campaign
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Generated Output */}
            <Card>
              <CardHeader>
                <CardTitle>Generated Campaign</CardTitle>
                <CardDescription>Your AI-powered creative message</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {generatedMessage ? (
                  <>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between mb-2">
                        <Label>Campaign Message</Label>
                        <div className="flex gap-2">
                          {isEditing ? (
                            <>
                              <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                                <X className="h-4 w-4 mr-1" />
                                Cancel
                              </Button>
                              <Button variant="default" size="sm" onClick={handleSaveEdit}>
                                <Check className="h-4 w-4 mr-1" />
                                Save
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button variant="outline" size="sm" onClick={handleEdit}>
                                <Edit3 className="h-4 w-4 mr-1" />
                                Edit
                              </Button>
                              <Button variant="outline" size="sm" onClick={copyToClipboard}>
                                <Copy className="h-4 w-4 mr-1" />
                                Copy
                              </Button>
                            </>
                          )}
                        </div>
                      </div>

                      {isEditing ? (
                        <Textarea
                          value={editedMessage}
                          onChange={(e) => setEditedMessage(e.target.value)}
                          rows={15}
                          className="font-mono text-sm"
                        />
                      ) : (
                        <div className="p-4 rounded-lg bg-muted whitespace-pre-wrap font-mono text-sm">
                          {generatedMessage}
                        </div>
                      )}
                    </div>

                    {/* Generated Image */}
                    {(generateImage || generatedImageUrl) && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between mb-2">
                          <Label>Campaign Image</Label>
                          {generatedImageUrl && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleGenerateImage(generatedMessage)}
                              disabled={generatingImage || !imageWebhookUrl}
                            >
                              {generatingImage ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                  Regenerating...
                                </>
                              ) : (
                                <>
                                  <ImageIcon className="h-4 w-4 mr-1" />
                                  Regenerate
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                        {generatingImage ? (
                          <div className="flex items-center justify-center p-8 border rounded-lg bg-muted">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <span className="ml-2 text-sm text-muted-foreground">Generating image...</span>
                          </div>
                        ) : generatedImageUrl ? (
                          <div className="space-y-2">
                            <img
                              src={generatedImageUrl}
                              alt="Generated campaign image"
                              className="w-full rounded-lg border object-contain max-h-96"
                              onError={() => {
                                toast.error("Failed to load image");
                                setGeneratedImageUrl(null);
                              }}
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                window.open(generatedImageUrl, '_blank');
                              }}
                              className="w-full"
                            >
                              <ImageIcon className="h-4 w-4 mr-2" />
                              Open Image in New Tab
                            </Button>
                          </div>
                        ) : (
                          <div className="p-4 border rounded-lg bg-muted text-center text-sm text-muted-foreground">
                            Image will be generated after campaign text is created
                          </div>
                        )}
                      </div>
                    )}

                    {generatedComponents.length > 0 && (
                      <div className="space-y-3">
                        <Label className="text-sm font-semibold">Component Blocks</Label>
                        <div className="grid gap-3">
                          {generatedComponents.map((component, index) => (
                            <div key={`${component.category}-${index}`} className="border rounded-lg p-3 bg-muted/50 space-y-1">
                              <div className="flex items-center justify-between">
                                <Badge variant="outline" className="uppercase tracking-wide">
                                  {component.emoji ? `${component.emoji} ` : ""}{component.category}
                                </Badge>
                                {component.tonality && (
                                  <span className="text-xs text-muted-foreground">{component.tonality}</span>
                                )}
                              </div>
                              <p className="font-semibold text-sm">{component.hook}</p>
                              <div className="text-sm whitespace-pre-wrap text-muted-foreground">
                                {Array.isArray(component.body)
                                  ? component.body.map((line, idx) => (
                                    <div key={idx}>{line}</div>
                                  ))
                                  : component.body}
                              </div>
                              <div className="text-sm font-medium text-primary mt-2">
                                CTA: {component.cta}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Button
                        onClick={handleSaveToDraft}
                        disabled={saving}
                        variant="outline"
                        className="flex-1"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {saving ? "Saving..." : "Save to Drafts"}
                      </Button>
                      <Button
                        onClick={handlePushToMoEngage}
                        disabled={saving}
                        className="flex-1"
                      >
                        <Send className="h-4 w-4 mr-2" />
                        {saving ? "Pushing..." : "Push to MoEngage"}
                      </Button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{campaignType}</Badge>
                      <Badge variant="outline">{vertical}</Badge>
                      <Badge variant="outline">{language}</Badge>
                      <Badge>{tonality}</Badge>
                    </div>

                    <div className="space-y-2">
                      <Label>Quick Stats</Label>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="p-2 rounded bg-muted">
                          <div className="text-muted-foreground">Characters</div>
                          <div className="font-semibold">{generatedMessage.length}</div>
                        </div>
                        <div className="p-2 rounded bg-muted">
                          <div className="text-muted-foreground">Tokens Used</div>
                          <div className="font-semibold">
                            {(generatedMessage.match(/\{\{[^}]+\}\}/g) || []).length}
                          </div>
                        </div>
                      </div>
                    </div>

                    {selectedTrend && (
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-sm font-semibold">
                          <Compass className="h-4 w-4 text-primary" />
                          Trend Rationale
                        </Label>
                        <div className="p-3 rounded border bg-background">
                          <p className="text-sm font-medium">
                            {selectedTrend.emoji} {selectedTrend.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {instaRationale || selectedTrend.rationale}
                          </p>
                          {selectedTrend.tags && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {selectedTrend.tags.map((tag) => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  #{tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-2 text-sm font-semibold">
                          <ShieldAlert className="h-4 w-4 text-amber-500" />
                          Automated Proofreading
                        </Label>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => runLintCheck(isEditing ? editedMessage : generatedMessage)}
                          disabled={linting || !generatedMessage}
                        >
                          {linting ? (
                            <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                          ) : (
                            <span>Re-run</span>
                          )}
                          Lint
                        </Button>
                      </div>
                      {lintReport ? (
                        <div className="space-y-2 max-h-40 overflow-y-auto border rounded p-3 bg-muted/50">
                          {lintReport.issues.length > 0 ? (
                            lintReport.issues.map((issue, idx) => (
                              <div key={idx} className={`text-sm ${lintSeverityClass(issue.severity)}`}>
                                • {issue.message}
                                {issue.suggestion && (
                                  <span className="block text-xs text-muted-foreground">{issue.suggestion}</span>
                                )}
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-green-600">No issues detected 🎯</p>
                          )}
                          <div className="text-xs text-muted-foreground pt-2 border-t">
                            {lintReport.length} chars • {lintReport.emojis_found} emojis
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          {trendServiceHealthy
                            ? "Run lint to detect missing CTA, banned words, or emoji balance before sending."
                            : "Lint disabled because helper service is offline."}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-2 text-sm font-semibold">
                          <Activity className="h-4 w-4 text-green-600" />
                          MoEngage Handoff
                        </Label>
                        <div className="flex items-center gap-2">
                          {moengageRecommendation && (
                            <Badge variant="secondary">
                              Send @ {new Date(moengageRecommendation).toLocaleTimeString()}
                            </Badge>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={copyMoEngagePayload}
                            disabled={!moengagePayload}
                          >
                            Copy Payload
                          </Button>
                        </div>
                      </div>
                      <div className="bg-muted border rounded p-3 text-xs font-mono max-h-48 overflow-y-auto">
                        {moengagePayload ? (
                          <pre className="whitespace-pre-wrap text-left">
                            {JSON.stringify(moengagePayload, null, 2)}
                          </pre>
                        ) : trendServiceHealthy ? (
                          <p className="text-muted-foreground">
                            Generate a campaign to preview the auto-built MoEngage payload.
                          </p>
                        ) : (
                          <p className="text-destructive">
                            Helper offline. Start python service to enable payload preview.
                          </p>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>Configure your campaign and click Generate to see the magic!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="bulk" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Bulk Campaign Details</CardTitle>
                <CardDescription>
                  Configure parameters for all campaigns in this batch (same inputs as single generation)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Campaign Type */}
                <div className="space-y-2">
                  <Label>Campaign Type</Label>
                  <Select value={campaignType} onValueChange={setCampaignType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CAMPAIGN_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Vertical */}
                <div className="space-y-2">
                  <Label>Category / Vertical *</Label>
                  <Select value={vertical} onValueChange={setVertical}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select vertical" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {VERTICALS.map((v) => (
                        <SelectItem key={v} value={v}>
                          {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Language */}
                <div className="space-y-2">
                  <Label>Language</Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map((lang) => (
                        <SelectItem key={lang.value} value={lang.value}>
                          {lang.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Tonality */}
                <div className="space-y-2">
                  <Label>Tonality *</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {TONALITIES.map((tone) => (
                      <button
                        key={tone.value}
                        type="button"
                        onClick={() => setTonality(tone.value)}
                        className={`p-3 rounded-lg border text-left transition-all ${tonality === tone.value
                          ? "border-primary bg-primary/10 ring-2 ring-primary"
                          : "border-border hover:border-primary/50"
                          }`}
                      >
                        <div className="font-medium text-sm">{tone.label}</div>
                        <div className="text-xs text-muted-foreground">{tone.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Audience */}
                <div className="space-y-2">
                  <Label>Audience Type *</Label>
                  <Textarea
                    value={audience}
                    onChange={(e) => setAudience(e.target.value)}
                    placeholder="e.g., Last 3 month users who have done PDP, ATC, PG, Abandon, uninstall"
                    rows={3}
                  />
                </div>

                {/* Occasion with Event Recommendations */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Occasion / Event (Optional)</Label>
                    {selectedEvent && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleSelectEvent(null)}
                        className="h-6 text-xs"
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                  <Input
                    value={occasion}
                    onChange={(e) => setOccasion(e.target.value)}
                    placeholder="e.g., Teachers Day, Diwali, New Year"
                  />

                  {/* Event Recommendations */}
                  {trendServiceHealthy && edtechEvents.length > 0 && (
                    <div className="mt-2 space-y-2">
                      <Label className="text-xs text-muted-foreground flex items-center gap-2">
                        <Compass className="h-3 w-3" />
                        Recommended Events for Indian EdTech
                      </Label>
                      <div className="max-h-32 overflow-y-auto border rounded p-2 space-y-1">
                        {loadingEvents ? (
                          <div className="text-xs text-muted-foreground flex items-center gap-2">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Loading events...
                          </div>
                        ) : (
                          edtechEvents
                            .filter((e) => !vertical || e.verticals.includes(vertical) || e.verticals.includes("ALL"))
                            .slice(0, 8)
                            .map((event) => (
                              <Button
                                key={event.title}
                                type="button"
                                size="sm"
                                variant={selectedEvent?.title === event.title ? "default" : "outline"}
                                onClick={() => handleSelectEvent(selectedEvent?.title === event.title ? null : event)}
                                className="w-full justify-start text-xs h-auto py-1.5"
                              >
                                <span className="mr-2">{event.emoji}</span>
                                <div className="flex-1 text-left">
                                  <div className="font-medium">{event.title}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {event.days_until === 0
                                      ? "Today"
                                      : event.days_until === 1
                                        ? "Tomorrow"
                                        : `${event.days_until} days`}
                                    {" • "}
                                    {event.category}
                                  </div>
                                </div>
                              </Button>
                            ))
                        )}
                      </div>
                      {selectedEvent && (
                        <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                          <strong>{selectedEvent.title}:</strong> {selectedEvent.relevance}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Offer */}
                <div className="space-y-2">
                  <Label>Offer Details (Optional)</Label>
                  <Input
                    value={offer}
                    onChange={(e) => setOffer(e.target.value)}
                    placeholder="e.g., 50% Off + 1% Extra with Coin"
                  />
                </div>

                {/* Promo Code */}
                <div className="space-y-2">
                  <Label>Promo Code (Optional)</Label>
                  <Input
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    placeholder="e.g., PGWA, SALE50"
                  />
                </div>

                {/* PDP Link */}
                <div className="space-y-2">
                  <Label>PDP Link (Optional)</Label>
                  <Input
                    value={pdpLink}
                    onChange={(e) => setPdpLink(e.target.value)}
                    placeholder="https://adda247.com/product-page"
                  />
                </div>

                {/* Batch Size */}
                <div className="space-y-2">
                  <Label>Number of Campaigns to Generate</Label>
                  <Input
                    type="number"
                    value={bulkBatchSize}
                    onChange={(e) => setBulkBatchSize(parseInt(e.target.value) || 25)}
                    min={1}
                    max={50}
                  />
                  <p className="text-xs text-muted-foreground">
                    Generate up to 50 unique campaigns per batch
                  </p>
                </div>

                {/* Sample Pushes Examples Info */}
                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Sample Pushes Examples</span>
                    {loadingExamples ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Badge variant="outline">{sampleExamples.length} loaded</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    These examples guide GPT-5-mini for consistent tone and structure
                  </p>
                </div>

                <Button
                  onClick={generateBulkCampaigns}
                  disabled={bulkGenerating || !vertical || !tonality || !audience}
                  className="w-full"
                  size="lg"
                >
                  {bulkGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating {bulkCampaigns.filter((c) => c.status === "generating" || c.status === "success").length}/{bulkBatchSize}...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate {bulkBatchSize} Campaigns with GPT-5-mini
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Bulk Results</CardTitle>
                <CardDescription>
                  {bulkCampaigns.length > 0
                    ? `${bulkCampaigns.filter((c) => c.status === "success").length} of ${bulkCampaigns.length} ready`
                    : "Generate campaigns to see results here"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {bulkGenerating && (
                  <div className="space-y-2">
                    <Progress value={bulkProgress} />
                    <p className="text-sm text-muted-foreground text-center">
                      {Math.round(bulkProgress)}% complete
                    </p>
                  </div>
                )}

                {bulkCampaigns.length > 0 ? (
                  <div className="space-y-4 max-h-[32rem] overflow-y-auto pr-1">
                    {bulkCampaigns.map((campaign) => (
                      <div key={campaign.id} className="border rounded-lg p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Campaign #{campaign.id}</span>
                          {campaign.status === "success" && (
                            <Badge className="bg-green-500">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Success
                            </Badge>
                          )}
                          {campaign.status === "error" && (
                            <Badge variant="destructive">
                              <X className="h-3 w-3 mr-1" />
                              Error
                            </Badge>
                          )}
                          {campaign.status === "generating" && (
                            <Badge variant="outline">
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              Generating
                            </Badge>
                          )}
                        </div>
                        {campaign.status === "success" ? (
                          <div className="space-y-1">
                            <p className="text-sm font-semibold">{campaign.hook}</p>
                            <p className="text-xs text-muted-foreground line-clamp-3">
                              {campaign.message}
                            </p>
                            <p className="text-xs font-medium text-primary">{campaign.cta}</p>
                          </div>
                        ) : campaign.status === "error" ? (
                          <p className="text-xs text-destructive">{campaign.error}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>Generate campaigns to see the GPT-5-mini output here.</p>
                  </div>
                )}

                {!bulkGenerating && bulkCampaigns.some((c) => c.status === "success") && (
                  <Button onClick={saveBulkCampaigns} disabled={bulkSaving} className="w-full">
                    {bulkSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Successful Campaigns
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
