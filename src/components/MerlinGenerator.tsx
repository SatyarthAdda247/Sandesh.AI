import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { RefreshCw, Sparkles, X, Image as ImageIcon, Copy, Check, Download, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface MerlinGeneratorProps {
    onSelect?: (campaign: any) => void;
}

const TONALITIES = [
    "Authoritative", "Casual", "Celebratory", "Compassionate", "Curious",
    "Dramatic", "Educational", "Funny", "Inspirational", "Luxurious",
    "Nostalgic", "Persuasive", "Sarcastic", "Urgent"
];
const STYLES = ["Storytelling", "Direct", "Question", "Benefit-led", "Curiosity"];
const LANGUAGES = ["English", "Hindi", "Hinglish", "Marathi", "Tamil", "Digital Slang"];
const AUDIENCES = ["Gen Z Enthusiasts", "Professionals", "Students", "Parents", "New Users", "Dormant Users"];
const VERTICALS = [
    "CUET PG", "SSC", "BANKING", "UPSC", "CUET Hindi", "CTET", "DEFENCE",
    "RAILWAYS", "UTTAR_PRADESH", "BIHAR", "ENGINEERING", "RAJASTHAN",
    "K12 & CUET UG", "JAIIB_CAIIB", "MADHYA_PRADESH", "ODISHA_STATE_EXAMS",
    "REGULATORY_BODIES", "WEST_BENGAL", "ANDHRA_PRADESH", "HARYANA",
    "बैंकिंग", "AGRICULTURE", "MAHARASHTRA", "Teaching", "GUJARAT",
    "UGC_NET", "SKILL_DEVELOPMENT", "एस.एस.सी", "TAMIL_NADU", "KERALA",
    "FCI", "UTTARAKHAND", "एसएससी", "NORTH_EAST_STATE_EXAMS", "JHARKHAND"
];

interface GeneratedResult {
    id: number;
    message: string;
    image: string | null;
    status: "pending" | "success" | "error" | "generating";
    headline?: string;
    body?: string;
    cta_text?: string;
    type?: string;
    image_prompt?: string;
    notes?: string;
}

export function MerlinGenerator({ onSelect }: MerlinGeneratorProps) {
    const [usecase, setUsecase] = useState("Exclusive Content Access");
    const [vertical, setVertical] = useState("");
    const [keywords, setKeywords] = useState<string[]>(["claims"]);
    const [keywordInput, setKeywordInput] = useState("");
    const [excludeKeywords, setExcludeKeywords] = useState<string[]>(["expert-led"]);
    const [excludeInput, setExcludeInput] = useState("");
    const [audience, setAudience] = useState("Gen Z Enthusiasts");
    const [tone, setTone] = useState("Friendly");
    const [style, setStyle] = useState("Storytelling");
    const [language, setLanguage] = useState("Digital Slang");
    const [personalization, setPersonalization] = useState("Reachability Push");
    const [coupon, setCoupon] = useState("GET50");
    const [includeEmoji, setIncludeEmoji] = useState(true);

    const [numVariations, setNumVariations] = useState([1]); // Slider uses array
    const [generating, setGenerating] = useState(false);
    const [saving, setSaving] = useState(false);
    const [results, setResults] = useState<GeneratedResult[]>([]);
    const [selectedResults, setSelectedResults] = useState<number[]>([]);
    const [pdpLink, setPdpLink] = useState("");
    const [progress, setProgress] = useState(0);

    const handleAddKeyword = (e: React.KeyboardEvent, list: string[], setList: (s: string[]) => void, input: string, setInput: (s: string) => void) => {
        if (e.key === 'Enter' && input.trim()) {
            e.preventDefault();
            if (!list.includes(input.trim())) {
                setList([...list, input.trim()]);
            }
            setInput("");
        }
    };

    const removeKeyword = (keyword: string, list: string[], setList: (s: string[]) => void) => {
        setList(list.filter(k => k !== keyword));
    };

    const generateContent = async () => {
        setGenerating(true);
        setResults([]);
        setSelectedResults([]);
        setProgress(0);

        const count = numVariations[0];
        const newResults: GeneratedResult[] = [];

        // Initialize placeholders
        for (let i = 0; i < count; i++) {
            newResults.push({ id: i + 1, message: "", image: null, status: "generating" });
        }
        setResults([...newResults]);

        try {
            const promptContext = {
                usecase,
                keywords,
                excludeKeywords,
                audience,
                tone,
                style,
                language,
                personalization,
                coupon,
                includeEmoji,
                format_instruction: "RETURN JSON ONLY with keys: headline, body, cta_text. Do not include markdown formatting like ```json."
            };

            // Generate in parallel batches of 5
            const BATCH_SIZE = 5;
            for (let i = 0; i < count; i += BATCH_SIZE) {
                const batchPromises = [];
                for (let j = i; j < Math.min(i + BATCH_SIZE, count); j++) {
                    batchPromises.push(
                        (async () => {
                            let message = "Failed to generate.";
                            let headline = "";
                            let body = "";
                            let cta_text = "";
                            let image_prompt = "";
                            let notes = "";
                            let status: "success" | "error" = "error";

                            try {
                                // Call Supabase Edge Function
                                const { data, error } = await supabase.functions.invoke('generate-campaign-gemini', {
                                    body: {
                                        usecase,
                                        vertical,
                                        tonality: tone,
                                        language,
                                        audience,
                                        keywords,
                                        excludeKeywords,
                                        variationIndex: j,
                                        merlinMode: true,
                                        additionalContext: JSON.stringify(promptContext),
                                        sampleExamples: []
                                    }
                                });

                                if (error) throw error;

                                message = data?.message || "Failed to generate.";
                                image_prompt = data?.image_prompt || "";
                                notes = data?.notes || "";

                                // Parse components if available
                                if (data?.components && Array.isArray(data.components) && data.components.length > 0) {
                                    const comp = data.components[0];
                                    headline = comp.hook || "";
                                    body = Array.isArray(comp.body) ? comp.body.join("\n") : (comp.body || "");
                                    cta_text = comp.cta || "";
                                    message = `${headline}\n\n${body}\n\nCTA: ${cta_text}`;
                                }
                                status = "success";

                            } catch (e) {
                                console.error(`Error generating item ${j}:`, e);
                                message = "Generation failed";
                            }

                            setResults(prev => {
                                const updated = [...prev];
                                if (updated[j]) {
                                    updated[j] = {
                                        ...updated[j],
                                        message,
                                        headline,
                                        body,
                                        cta_text,
                                        type: usecase,
                                        status,
                                        image_prompt, // Add image prompt to result
                                        notes
                                    };
                                }
                                return updated;
                            });
                        })()
                    );
                }
                await Promise.all(batchPromises);
                setProgress(Math.min(((i + BATCH_SIZE) / count) * 100, 100));
            }

            toast.success(`Generated ${count} variations successfully!`);
        } catch (error: any) {
            console.error("Generation error:", error);
            toast.error(error.message || "Failed to generate content");
        } finally {
            setGenerating(false);
            setProgress(100);
        }
    };

    const toggleSelection = (id: number) => {
        setSelectedResults(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        const successfulIds = results.filter(r => r.status === "success").map(r => r.id);
        if (selectedResults.length === successfulIds.length) {
            setSelectedResults([]);
        } else {
            setSelectedResults(successfulIds);
        }
    };

    const downloadSelectedCSV = () => {
        const selected = results.filter(r => selectedResults.includes(r.id) && r.status === "success");
        if (selected.length === 0) {
            toast.error("Please select at least one campaign to export.");
            return;
        }

        // CSV Headers matching Test_Prime_Push_Automation
        const headers = ["id", "link", "title", "image_link", "Message", "Message Summary", "Message title", "CTA"];

        const csvContent = [
            headers.join(","),
            ...selected.map((r, index) => {
                // Construct fields
                const rowId = `CAMPAIGN_${r.id}`; // Or generate a more specific ID
                const link = pdpLink || "https://www.adda247.com";
                const title = "title"; // Hardcoded as per request/sample
                const imageLink = "image_link"; // Hardcoded as per request/sample

                // Escape quotes for CSV
                const escape = (str: string) => `"${(str || "").replace(/"/g, '""')}"`;

                return [
                    rowId,
                    link,
                    title,
                    imageLink,
                    escape(r.body || r.message),
                    escape(r.type || usecase),
                    escape(r.headline),
                    escape(r.cta_text || coupon)
                ].join(",");
            })
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `campaign_export_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success(`Exported ${selected.length} campaigns to CSV!`);
    };

    const saveSelectedCampaigns = async () => {
        const selected = results.filter(r => selectedResults.includes(r.id) && r.status === "success");
        if (selected.length === 0) {
            toast.error("Please select at least one campaign to save.");
            return;
        }

        if (!vertical) {
            toast.error("Please select a Vertical before saving.");
            return;
        }

        setSaving(true);
        try {
            // 1. Get or Create Vertical ID
            const { data: verticalData } = await supabase
                .from("verticals")
                .select("id")
                .eq("name", vertical)
                .single();

            let verticalId = verticalData?.id;

            if (!verticalData) {
                const { data: newVertical } = await supabase
                    .from("verticals")
                    .insert([{ name: vertical }])
                    .select("id")
                    .single();
                verticalId = newVertical?.id;
            }

            const today = new Date().toISOString().split("T")[0];

            // 2. Map campaigns to suggestions table
            const suggestions = selected.map((campaign) => ({
                suggestion_date: today,
                vertical_id: verticalId,
                hook: campaign.headline || campaign.message.substring(0, 50),
                push_copy: campaign.body || campaign.message,
                cta: campaign.cta_text || coupon || "Check App",
                channel: "push",
                urgency: tone === "Urgent" ? "High" : tone === "Professional" ? "Low" : "Medium",
                link: pdpLink || "",
                score: 0.85,
                status: "pending",
                promo_code: coupon || null,
                trend_context: null, // Merlin doesn't use trend context yet
                insta_rationale: null,
            }));

            const { error } = await supabase.from("suggestions").insert(suggestions);
            if (error) throw error;

            toast.success(`Saved ${selected.length} campaigns to database!`);
        } catch (error: any) {
            console.error("Save error:", error);
            toast.error(`Failed to save: ${error.message}`);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="flex flex-col lg:flex-row gap-8 p-6 bg-background min-h-[600px]">
            {/* Left Column: Sentence Builder Form */}
            <div className="flex-1 space-y-8">
                <div>
                    <h2 className="text-lg font-semibold mb-4">Generate with Merlin AI</h2>

                    <div className="space-y-6 text-base leading-loose">
                        <div className="flex items-center gap-2">
                            <span className="whitespace-nowrap font-medium">For campaign usecase*</span>
                        </div>
                        <Input
                            value={usecase}
                            onChange={(e) => setUsecase(e.target.value)}
                            className="text-lg p-6 font-medium border-muted-foreground/20"
                            placeholder="e.g. Exclusive Content Access"
                        />

                        <div className="flex flex-wrap items-center gap-3">
                            <span>for vertical / category</span>
                            <Select value={vertical} onValueChange={setVertical}>
                                <SelectTrigger className="w-[250px]">
                                    <SelectValue placeholder="Select Vertical" />
                                </SelectTrigger>
                                <SelectContent className="max-h-[300px]">
                                    {VERTICALS.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* ... Keywords and other inputs (same as before) ... */}
                        <div className="flex flex-wrap items-center gap-3">
                            <span>and include high performing keywords</span>
                            <div className="flex flex-wrap gap-2 items-center border rounded-md px-3 py-2 bg-background min-w-[200px]">
                                {keywords.map(k => (
                                    <Badge key={k} variant="secondary" className="gap-1">
                                        {k}
                                        <X className="h-3 w-3 cursor-pointer" onClick={() => removeKeyword(k, keywords, setKeywords)} />
                                    </Badge>
                                ))}
                                <input
                                    className="outline-none bg-transparent flex-1 min-w-[100px]"
                                    placeholder="Type & Enter..."
                                    value={keywordInput}
                                    onChange={(e) => setKeywordInput(e.target.value)}
                                    onKeyDown={(e) => handleAddKeyword(e, keywords, setKeywords, keywordInput, setKeywordInput)}
                                />
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <span>and exclude keywords</span>
                            <div className="flex flex-wrap gap-2 items-center border rounded-md px-3 py-2 bg-background min-w-[200px]">
                                {excludeKeywords.map(k => (
                                    <Badge key={k} variant="secondary" className="gap-1">
                                        {k}
                                        <X className="h-3 w-3 cursor-pointer" onClick={() => removeKeyword(k, excludeKeywords, setExcludeKeywords)} />
                                    </Badge>
                                ))}
                                <input
                                    className="outline-none bg-transparent flex-1 min-w-[100px]"
                                    placeholder="Type & Enter..."
                                    value={excludeInput}
                                    onChange={(e) => setExcludeInput(e.target.value)}
                                    onKeyDown={(e) => handleAddKeyword(e, excludeKeywords, setExcludeKeywords, excludeInput, setExcludeInput)}
                                />
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <span>and convert this for</span>
                            <Select value={audience} onValueChange={setAudience}>
                                <SelectTrigger className="w-[200px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {AUDIENCES.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <span>with voice/tone</span>
                            <Select value={tone} onValueChange={setTone}>
                                <SelectTrigger className="w-[150px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="max-h-[300px]">
                                    {TONALITIES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <span>in the writing style of</span>
                            <Select value={style} onValueChange={setStyle}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {STYLES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <span>in language</span>
                            <Select value={language} onValueChange={setLanguage}>
                                <SelectTrigger className="w-[160px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {LANGUAGES.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <span>with personalization attribute</span>
                            <Input
                                value={personalization}
                                onChange={(e) => setPersonalization(e.target.value)}
                                className="w-[250px]"
                                placeholder="User Attribute"
                            />
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <span>and add coupon</span>
                            <Input
                                value={coupon}
                                onChange={(e) => setCoupon(e.target.value)}
                                className="w-[150px]"
                                placeholder="Coupon Code"
                            />
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <span>Link for CSV</span>
                            <Input
                                value={pdpLink}
                                onChange={(e) => setPdpLink(e.target.value)}
                                className="w-[250px]"
                                placeholder="https://..."
                            />
                        </div>

                        {/* Variations Slider */}
                        <div className="pt-6 space-y-4">
                            <div className="flex justify-between items-center">
                                <Label className="font-medium">Number of variations: {numVariations[0]}</Label>
                                <span className="text-xs text-muted-foreground">1 - 50</span>
                            </div>
                            <Slider
                                value={numVariations}
                                onValueChange={setNumVariations}
                                min={1}
                                max={50}
                                step={1}
                                className="w-full"
                            />
                        </div>
                    </div>

                    <div className="flex gap-4 pt-6">
                        <Button
                            onClick={generateContent}
                            disabled={generating}
                            className="bg-teal-600 hover:bg-teal-700 text-white min-w-[180px]"
                        >
                            {generating ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Generating {Math.round(progress)}%...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="mr-2 h-4 w-4" />
                                    Generate {numVariations[0]} variations
                                </>
                            )}
                        </Button>
                        {results.some(r => r.status === "success") && (
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={saveSelectedCampaigns} disabled={saving}>
                                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                    Save Selected
                                </Button>
                                <Button variant="outline" onClick={downloadSelectedCSV}>
                                    <Download className="mr-2 h-4 w-4" />
                                    Push Selected to Sheet
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Right Column: Preview */}
            <div className="flex-1 bg-muted/30 rounded-xl p-8 flex flex-col items-center justify-start overflow-y-auto max-h-[800px]">
                {results.length === 0 ? (
                    <div className="py-24 text-center text-muted-foreground">
                        <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p>Ready to generate magic ✨</p>
                    </div>
                ) : (
                    <div className="w-full space-y-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-semibold text-lg">Results ({results.filter(r => r.status === "success").length})</h3>
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="sm" onClick={toggleSelectAll}>
                                    {selectedResults.length === results.filter(r => r.status === "success").length ? "Deselect All" : "Select All"}
                                </Button>
                            </div>
                        </div>

                        {results.map((result) => (
                            <Card
                                key={result.id}
                                className={`overflow-hidden border-0 shadow-md animate-in fade-in slide-in-from-bottom-4 duration-500 ${selectedResults.includes(result.id) ? 'ring-2 ring-teal-500' : ''}`}
                            >
                                <CardContent className="p-6 space-y-4">
                                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                                        <div className="flex items-center gap-2">
                                            {result.status === "success" && (
                                                <Checkbox
                                                    checked={selectedResults.includes(result.id)}
                                                    onCheckedChange={() => toggleSelection(result.id)}
                                                />
                                            )}
                                            <div className="w-4 h-4 rounded bg-primary/20" />
                                            <span>Adda-247 • {usecase} • Variation #{result.id}</span>
                                        </div>
                                        {result.status === "generating" && <Loader2 className="h-3 w-3 animate-spin" />}
                                        {result.status === "error" && <Badge variant="destructive">Error</Badge>}
                                    </div>

                                    {result.status === "success" ? (
                                        <div className="space-y-4">
                                            <div className="space-y-1">
                                                {result.headline && (
                                                    <h3 className="font-bold text-lg text-foreground">
                                                        {result.headline}
                                                    </h3>
                                                )}
                                                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                                    {result.body || result.message}
                                                </p>
                                                {result.cta_text && (
                                                    <Badge variant="outline" className="mt-2">
                                                        CTA: {result.cta_text}
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="flex justify-end gap-2">
                                                <Button size="sm" variant="ghost" className="h-8">
                                                    <Copy className="h-3 w-3 mr-1" /> Copy
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    className={`h-8 ${selectedResults.includes(result.id) ? 'bg-teal-700' : 'bg-teal-600 hover:bg-teal-700'}`}
                                                    onClick={() => toggleSelection(result.id)}
                                                >
                                                    {selectedResults.includes(result.id) ? <Check className="h-3 w-3 mr-1" /> : null}
                                                    {selectedResults.includes(result.id) ? "Selected" : "Select"}
                                                </Button>
                                            </div>
                                        </div>
                                    ) : result.status === "generating" ? (
                                        <div className="h-24 flex items-center justify-center">
                                            <span className="text-sm text-muted-foreground animate-pulse">Generating content...</span>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-destructive">Failed to generate this variation.</p>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
