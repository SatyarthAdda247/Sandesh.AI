import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { RefreshCw, Sparkles, X, Image as ImageIcon, Copy, Check, Download, Loader2, Save, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { TrendingSuggestions } from "@/components/TrendingSuggestions";
import { getTrendingIdeas } from "@/data/trending-ideas";

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
    const [usecase, setUsecase] = useState("");
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [trendingIdeas, setTrendingIdeas] = useState<Array<{
        vertical: string;
        hook: string;
        channel: string;
        urgency: 'High' | 'Medium' | 'Low';
        score: number;
        status: 'pending' | 'approved';
        description: string;
    }>>([]);

    // Adda247-specific campaign suggestions based on input
    const getCampaignSuggestions = (input: string): string[] => {
        const allSuggestions = [
            // Flash Sales & Discounts
            "Flash Sale - Limited Time Discount on Test Series",
            "Exclusive Weekend Offer - Flat 80% Off",
            "Early Bird Discount - New Course Launch",
            "Mega Sale - All Courses at Lowest Price",
            "Clearance Sale - Last Day to Enroll",

            // Test Series & Practice
            "New Test Series Launch - IBPS RRB PO",
            "Free Mock Test - SSC CGL 2024",
            "Daily Quiz Challenge - Win Rewards",
            "Full Length Mock Test - Banking Exams",
            "Sectional Test Series - Quantitative Aptitude",

            // Course Launches
            "New Course Alert - UPSC Prelims 2025",
            "Mahapack Launch - Complete Exam Preparation",
            "Live Classes Starting - Railway NTPC",
            "Crash Course - Last Month Revision",
            "Foundation Course - Banking Beginners",

            // Exam Reminders & Updates
            "Exam Date Announced - SSC CHSL 2024",
            "Registration Closing Soon - IBPS PO",
            "Admit Card Released - Check Now",
            "Result Declared - Download Scorecard",
            "Exam Pattern Changed - Important Update",

            // Engagement & Retention
            "Complete Your Pending Course - Resume Learning",
            "You're 80% Done - Finish Your Test Series",
            "New Study Material Added - Check Now",
            "Doubt Clearing Session - Join Live",
            "Weekly Performance Report - Track Progress",

            // Referral & Community
            "Refer & Earn - Get ₹500 per Friend",
            "Join Study Group - Connect with Peers",
            "Success Story - Student Cracked Exam",
            "Expert Tips - Exam Preparation Strategy",
            "Free Webinar - Career Guidance Session",

            // Seasonal & Event-based
            "Republic Day Sale - Special Discount",
            "New Year Offer - Start Fresh",
            "Diwali Dhamaka - Festive Discounts",
            "Independence Day Sale - Freedom to Learn",
            "Back to School - Resume Preparation"
        ];

        if (!input.trim()) return [];

        const lowerInput = input.toLowerCase();
        return allSuggestions
            .filter(suggestion =>
                suggestion.toLowerCase().includes(lowerInput) ||
                lowerInput.split(' ').some(word =>
                    word.length > 2 && suggestion.toLowerCase().includes(word)
                )
            )
            .slice(0, 5);
    };

    const handleUsecaseChange = (value: string) => {
        setUsecase(value);
        if (value.trim().length > 2) {
            const newSuggestions = getCampaignSuggestions(value);
            setSuggestions(newSuggestions);
            setShowSuggestions(newSuggestions.length > 0);
        } else {
            setShowSuggestions(false);
            setSuggestions([]);
        }
    };

    const selectSuggestion = (suggestion: string) => {
        setUsecase(suggestion);
        setShowSuggestions(false);
        setSuggestions([]);
    };

    // Keyword recommendations based on vertical and usecase
    const getKeywordRecommendations = (vertical: string, usecase: string): string[] => {
        const recommendations: Record<string, string[]> = {
            'BANKING': ['IBPS', 'SBI', 'RRB', 'PO', 'Clerk', 'Mock Test', 'Previous Year', 'Free PDF'],
            'SSC': ['CGL', 'CHSL', 'MTS', 'GD', 'CPO', 'Tier 1', 'Tier 2', 'Practice Set'],
            'RAILWAYS': ['RRB', 'NTPC', 'Group D', 'ALP', 'RPF', 'TC', 'Mock Test', 'Free Quiz'],
            'UPSC': ['Prelims', 'Mains', 'IAS', 'IPS', 'Current Affairs', 'Essay', 'Optional', 'Answer Writing'],
            'DEFENCE': ['NDA', 'CDS', 'AFCAT', 'Army', 'Navy', 'Air Force', 'Physical Test', 'SSB'],
            'CTET': ['Paper 1', 'Paper 2', 'Child Development', 'Pedagogy', 'EVS', 'Mathematics', 'Hindi'],
        };

        const usecaseKeywords: Record<string, string[]> = {
            'sale': ['Limited Time', 'Flat Off', 'Discount', 'Offer', 'Deal', 'Save Now'],
            'test': ['Mock Test', 'Practice', 'Full Length', 'Sectional', 'Free Test', 'Quiz'],
            'course': ['Enroll Now', 'New Launch', 'Live Classes', 'Video Lectures', 'Study Material'],
            'exam': ['Exam Date', 'Registration', 'Admit Card', 'Syllabus', 'Pattern', 'Cutoff'],
        };

        let keywords = recommendations[vertical] || [];

        // Add usecase-specific keywords
        Object.keys(usecaseKeywords).forEach(key => {
            if (usecase.toLowerCase().includes(key)) {
                keywords = [...keywords, ...usecaseKeywords[key]];
            }
        });

        return [...new Set(keywords)].slice(0, 8);
    };

    // Audience recommendations
    const getAudienceRecommendations = (): string[] => {
        return [
            'Active Learners (Last 7 Days)',
            'Premium Members',
            'Free Users',
            'Test Takers (Last 30 Days)',
            'Course Enrolled Students',
            'Inactive Users (30+ Days)',
            'New Users (Last 7 Days)',
            'High Engagement Users',
            'Cart Abandoners',
            'Exam Aspirants 2024-25'
        ];
    };

    // Tone recommendations
    const getToneRecommendations = (): string[] => {
        return [
            'Urgent & Action-Oriented',
            'Motivational & Inspiring',
            'Friendly & Conversational',
            'Professional & Informative',
            'Exciting & Enthusiastic',
            'Empathetic & Supportive',
            'Confident & Authoritative',
            'FOMO-Driven (Fear of Missing Out)'
        ];
    };

    // Style recommendations
    const getStyleRecommendations = (): string[] => {
        return [
            'Storytelling with Narrative',
            'Direct & To-the-Point',
            'Question-Based Engagement',
            'Benefit-Focused Features',
            'Social Proof & Testimonials',
            'Scarcity & Urgency',
            'Problem-Solution Format',
            'List-Based (Bullet Points)'
        ];
    };

    // Language recommendations
    const getLanguageRecommendations = (): string[] => {
        return [
            'Hinglish (Hindi + English Mix)',
            'Simple English',
            'Hindi',
            'Digital Slang & Emojis',
            'Professional English',
            'Youth-Oriented Language',
            'Formal Hindi',
            'Regional Language Mix'
        ];
    };
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
    const [generateImages, setGenerateImages] = useState(false);

    const [numVariations, setNumVariations] = useState([1]); // Slider uses array
    const [generating, setGenerating] = useState(false);
    const [saving, setSaving] = useState(false);
    const [pushing, setPushing] = useState(false);
    const [results, setResults] = useState<GeneratedResult[]>([]);
    const [selectedResults, setSelectedResults] = useState<number[]>([]);
    const [progress, setProgress] = useState(0);

    // Load trending ideas on mount
    useEffect(() => {
        const ideas = getTrendingIdeas();
        setTrendingIdeas(ideas);
    }, []);

    // Handler to select a trending idea
    const handleSelectTrendingIdea = (idea: any) => {
        setVertical(idea.vertical);
        setUsecase(idea.hook);
        // Optionally set other fields based on the idea
        if (idea.urgency === 'High') {
            setTone('Urgent');
        } else if (idea.urgency === 'Medium') {
            setTone('Persuasive');
        }
        toast.success(`Applied trending idea: ${idea.hook}`);
    };

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
                                // Call Gemini API directly
                                const GEMINI_API_KEY = 'AIzaSyA7Ue38eVLxAZpeosiAeZGlAgLnL28Hb6Y';

                                const prompt = `You are generating push notifications for Adda247, an exam preparation app.

Here are real examples of Adda247 push notifications:

Example 1:
Title: "No More Exam Fear😇😇"
Message: "when Adda247 is here 🤩🤩\n⏰Less Than 4 Days Left for Exam\n✔️Enrol in IBPS RRB PO Test Series\n✔️At the lowest price of Rs.149/-\n✔️Use Code:JOB15"
CTA: "Be Revision Ready!!"

Example 2:
Title: "We Have 4 Good News for you!🥳"
Message: "▶︎JAIIB Registration Started\n▶︎JAIIB Mahapack 2.0 is here\n▶︎At Flat 80% Off\n▶︎With Double Validity!!"
CTA: "Code: JC80"

Example 3:
Title: "UPSC Dream? Ab hoga Sach! 🚀"
Message: "UPSC ki mushkil journey ab banegi aasaan! 😍 Aapka apna 'UPSC Mahapack' aa gaya hai! ✔️ Complete Prelims, Mains & Interview Prep ✔️ Live Classes, Mock Tests & Detailed Notes ✔️ Top Educators ka guidance Special Launch Offer! 🤑 ▶ Flat 75% Off ▶ Double Validity ke saath! 🎊 Ye Mauka phir nahi milega!"
CTA: "Grab Offer Now!"

Now generate a NEW push notification for:
- Usecase: ${usecase}
- Vertical: ${vertical || 'General'}
- Keywords to include: ${keywords.join(', ')}
- Avoid keywords: ${excludeKeywords.join(', ')}
- Target audience: ${audience}
- Tone: ${tone}
- Style: ${style}
- Language: ${language}
- Personalization: ${personalization}
${coupon ? `- Promo Code (include in message): ${coupon}` : ''}
- Include emojis: ${includeEmoji ? 'Yes' : 'No'}

CRITICAL FORMATTING RULES:
1. **Message body**: Use bullet points with symbols like ✔️, ▶, ►, ⏰ for readability and line breaks (\\n)
2. **CTA (Call to Action)**: MUST be an ACTION phrase that motivates users to click
   - Good examples: "Enroll Now!", "Grab Offer!", "Start Learning!", "Be Exam Ready!", "Join Now!", "Get Started!"
   - BAD examples: "Code: XYZ", "Use Code: ABC" (these should go in the message body, NOT in the CTA)
   - If there's a promo code, mention it in the MESSAGE BODY with "Use Code: ${coupon || 'PROMO'}", NOT in the CTA
3. **Emojis**: Use relevant emojis throughout for engagement
4. **Line breaks**: Use \\n for line breaks in the message

Return ONLY valid JSON with this exact structure:
{
  "headline": "Catchy title with emojis",
  "body": "Message with bullet points and line breaks using \\n",
  "cta_text": "Action-oriented CTA phrase (NOT a coupon code)"
}` + (generateImages ? `,\n  \"image_prompt\": \"Detailed image description for banner\"` : '') + `,\n  \"notes\": \"Any additional notes\"\n}`;

                                const response = await fetch(
                                    `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
                                    {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            contents: [{ parts: [{ text: prompt }] }],
                                            generationConfig: {
                                                temperature: 0.9,
                                                maxOutputTokens: 8192  // Increased to accommodate thinking tokens
                                            }
                                        })
                                    }
                                );

                                if (!response.ok) {
                                    throw new Error(`Gemini API error: ${response.status}`);
                                }

                                const data = await response.json();
                                console.log('Gemini API Response:', data);

                                const textContent = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
                                console.log('Extracted text content:', textContent);

                                if (!textContent) {
                                    console.error('Empty response from Gemini. Full data:', JSON.stringify(data, null, 2));
                                    throw new Error('No content received from Gemini. Check console for details.');
                                }

                                // Parse JSON response (strip markdown if present)
                                let cleanedText = textContent.trim();
                                if (cleanedText.startsWith('```json')) {
                                    cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
                                } else if (cleanedText.startsWith('```')) {
                                    cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
                                }

                                console.log('Cleaned text for parsing:', cleanedText);

                                let parsed;
                                try {
                                    parsed = JSON.parse(cleanedText);
                                } catch (parseError: any) {
                                    console.error('JSON parse error:', parseError);
                                    console.log('Failed text:', cleanedText);

                                    // Try to fix common JSON issues
                                    try {
                                        // Fix unterminated strings by finding the last complete JSON object
                                        const lastBraceIndex = cleanedText.lastIndexOf('}');
                                        if (lastBraceIndex > 0) {
                                            const truncated = cleanedText.substring(0, lastBraceIndex + 1);
                                            console.log('Trying truncated JSON:', truncated);
                                            parsed = JSON.parse(truncated);
                                        } else {
                                            throw new Error('Could not find valid JSON structure');
                                        }
                                    } catch (retryError) {
                                        // If still failing, create a fallback response
                                        console.error('Retry parse also failed:', retryError);
                                        throw new Error(`JSON parsing failed: ${parseError.message}. The AI response may be incomplete.`);
                                    }
                                }

                                headline = parsed.headline || "Campaign generated";
                                body = parsed.body || headline;
                                cta_text = parsed.cta_text || 'Get Started!';
                                image_prompt = parsed.image_prompt || `Professional banner for ${vertical} exam preparation`;
                                notes = parsed.notes || '';
                                status = "success";
                                message = `${headline}\n\n${body}\n\nCTA: ${cta_text}`; // Update message for display

                            } catch (e: any) {
                                console.error(`Error generating item ${j + 1}:`, e);
                                console.error('Error details:', e.message, e.stack);
                                message = `Generation failed: ${e.message}`;
                                status = "error";
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

        // Escape quotes and commas for CSV
        const escapeCSV = (str: string) => {
            if (!str) return '""';
            // If string contains comma, quote, or newline, wrap in quotes and escape internal quotes
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        };

        const csvContent = [
            headers.join(","),
            ...selected.map((r, index) => {
                // Generate ID: {VERTICAL}{counter} (e.g., "BANKING1", "SSC2")
                const verticalId = vertical.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');
                const rowId = `${verticalId}${index + 1}`;

                // Link will be auto-fetched from Google Sheet based on vertical
                const link = "https://www.adda247.com/testprime/79075/TEST-PRIME"; // Default fallback

                // Title and image_link are placeholders as per sample
                const title = "title";
                const imageLink = "image_link";

                // Message: the main campaign body
                const message = r.body || r.message || "";

                // Message Summary: defaults to "Mock Test"
                const messageSummary = "Mock Test";

                // Message title: the headline/hook
                const messageTitle = r.headline || r.message.substring(0, 50) || "";

                // CTA: the call-to-action text or promo code
                const cta = r.cta_text || (coupon ? `Use Code: ${coupon}` : "Use Code: TPFLASH");

                return [
                    rowId,
                    link,
                    title,
                    imageLink,
                    escapeCSV(message),
                    messageSummary,
                    escapeCSV(messageTitle),
                    escapeCSV(cta)
                ].join(",");
            })
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const linkElement = document.createElement("a");
        linkElement.setAttribute("href", url);
        linkElement.setAttribute("download", `Sandesh_AI_Campaigns_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(linkElement);
        linkElement.click();
        document.body.removeChild(linkElement);
        toast.success(`Exported ${selected.length} campaigns to CSV! Ready to upload to Google Sheets.`);
    };

    const pushToGoogleSheets = async () => {
        const selected = results.filter(r => selectedResults.includes(r.id) && r.status === "success");
        if (selected.length === 0) {
            toast.error("Please select at least one campaign to push.");
            return;
        }

        setPushing(true);
        try {
            // Prepare campaigns for Google Sheets in Test Prime format
            const campaigns = selected.map((r, index) => ({
                id: `${vertical || 'GENERAL'}${index + 1}`,
                link: 'https://www.adda247.com/testprime/79075/TEST-PRIME',
                title: 'title',
                image_link: r.image_prompt || 'image_link',
                Message: r.body || r.message || '',
                'Message Summary': usecase || 'Campaign',
                'Message title': r.headline || r.message?.substring(0, 50) || '',
                CTA: r.cta_text || (coupon ? `Use Code: ${coupon}` : 'Use Code: TPFLASH')
            }));

            // Use Google Apps Script Web App as webhook (simpler than OAuth)
            // You'll need to create a simple Apps Script and deploy it as a web app
            const APPS_SCRIPT_URL = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL;

            if (!APPS_SCRIPT_URL) {
                // Fallback: Download as CSV for manual upload
                const csvContent = [
                    ['id', 'link', 'title', 'image_link', 'Message', 'Message Summary', 'Message title', 'CTA'],
                    ...campaigns.map(c => [
                        c.id,
                        c.link,
                        c.title,
                        c.image_link,
                        c.Message,
                        c['Message Summary'],
                        c['Message title'],
                        c.CTA
                    ])
                ].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');

                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.setAttribute('href', url);
                link.setAttribute('download', `campaigns_${new Date().toISOString().slice(0, 10)}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                toast.success(`Downloaded CSV! Upload it to your Google Sheet manually.`);
                return;
            }

            // Send to Apps Script webhook
            const response = await fetch(APPS_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors', // Apps Script requires this
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    campaigns: campaigns
                })
            });

            // Note: no-cors mode means we can't read the response
            // We assume success if no error was thrown
            toast.success(`Successfully pushed ${selected.length} campaigns to Google Sheets! 🎉`);

        } catch (error: any) {
            console.error("Push to Sheets error:", error);
            toast.error(`Failed to push to Google Sheets: ${error.message}`);
        } finally {
            setPushing(false);
        }
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
                link: "",
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

                    <div className="space-y-6">
                        {/* Usecase Input */}
                        <div className="space-y-2">
                            <Label htmlFor="usecase" className="text-sm font-medium">
                                For campaign usecase*
                                <span className="text-xs text-muted-foreground ml-2">Type to see suggestions</span>
                            </Label>
                            <div className="relative">
                                <Input
                                    id="usecase"
                                    value={usecase}
                                    onChange={(e) => handleUsecaseChange(e.target.value)}
                                    onFocus={() => {
                                        if (usecase.trim().length > 2) {
                                            const newSuggestions = getCampaignSuggestions(usecase);
                                            setSuggestions(newSuggestions);
                                            setShowSuggestions(newSuggestions.length > 0);
                                        }
                                    }}
                                    onBlur={() => {
                                        setTimeout(() => setShowSuggestions(false), 200);
                                    }}
                                    placeholder="e.g. Flash Sale, Test Series, Exam Reminder"
                                    className="text-base"
                                />
                                {usecase && (
                                    <button
                                        onClick={() => {
                                            setUsecase('');
                                            setShowSuggestions(false);
                                            setSuggestions([]);
                                        }}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xl"
                                    >
                                        ✕
                                    </button>
                                )}

                                {/* AI Suggestions Dropdown */}
                                {showSuggestions && suggestions.length > 0 && (
                                    <div className="absolute z-50 w-full mt-2 bg-background border-2 border-primary/20 rounded-lg shadow-xl max-h-80 overflow-y-auto">
                                        {suggestions.map((suggestion, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => selectSuggestion(suggestion)}
                                                className="w-full text-left px-4 py-3 hover:bg-muted transition-colors border-b last:border-b-0 group"
                                            >
                                                <div className="font-semibold text-base group-hover:text-primary transition-colors">
                                                    {suggestion.split(' - ')[0]}
                                                </div>
                                                {suggestion.includes(' - ') && (
                                                    <div className="text-sm text-muted-foreground mt-1">
                                                        {suggestion.split(' - ')[1]}
                                                    </div>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Vertical Selector */}
                        <div className="space-y-2">
                            <Label htmlFor="vertical" className="text-sm font-medium">
                                For vertical / category
                            </Label>
                            <Select value={vertical} onValueChange={setVertical}>
                                <SelectTrigger id="vertical">
                                    <SelectValue placeholder="Select Vertical" />
                                </SelectTrigger>
                                <SelectContent className="max-h-[300px]">
                                    {VERTICALS.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Keywords */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-sm font-medium">
                                    And include high performing keywords
                                </Label>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const recommended = getKeywordRecommendations(vertical, usecase);
                                        setKeywords([...new Set([...keywords, ...recommended])]);
                                    }}
                                    className="text-xs px-3 py-1.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium"
                                >
                                    Add Recommended
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-2 items-center border rounded-md px-3 py-2 bg-background min-h-[42px]">
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

                        {/* Exclude Keywords */}
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">And exclude keywords</Label>
                            <div className="flex flex-wrap gap-2 items-center border rounded-md px-3 py-2 bg-background min-h-[42px]">
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

                        {/* Audience */}
                        <div className="space-y-2">
                            <Label htmlFor="audience" className="text-sm font-medium">And convert this for</Label>
                            <Select value={audience} onValueChange={setAudience}>
                                <SelectTrigger id="audience">
                                    <SelectValue placeholder="Select Audience" />
                                </SelectTrigger>
                                <SelectContent>
                                    {AUDIENCES.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Tone */}
                        <div className="space-y-2">
                            <Label htmlFor="tone" className="text-sm font-medium">With voice/tone</Label>
                            <Select value={tone} onValueChange={setTone}>
                                <SelectTrigger id="tone">
                                    <SelectValue placeholder="Select Tone" />
                                </SelectTrigger>
                                <SelectContent className="max-h-[300px]">
                                    {TONALITIES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Style */}
                        <div className="space-y-2">
                            <Label htmlFor="style" className="text-sm font-medium">In the writing style of</Label>
                            <Select value={style} onValueChange={setStyle}>
                                <SelectTrigger className="w-[250px]">
                                    <SelectValue placeholder="Select Style" />
                                </SelectTrigger>
                                <SelectContent className="max-h-[300px]">
                                    {getStyleRecommendations().map(s => (
                                        <SelectItem key={s} value={s}>{s}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <span>in language</span>
                            <Select value={language} onValueChange={setLanguage}>
                                <SelectTrigger className="w-[250px]">
                                    <SelectValue placeholder="Select Language" />
                                </SelectTrigger>
                                <SelectContent className="max-h-[300px]">
                                    {getLanguageRecommendations().map(lang => (
                                        <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                                    ))}
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

                        {/* Image Generation Toggle */}
                        <div className="flex items-center gap-2 pt-4">
                            <input
                                type="checkbox"
                                id="generateImages"
                                checked={generateImages}
                                onChange={(e) => setGenerateImages(e.target.checked)}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <label htmlFor="generateImages" className="text-sm font-medium text-gray-700">
                                Generate image prompts
                            </label>
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
                        {selectedResults.length > 0 && (
                            <div className="flex gap-3">
                                <Button
                                    onClick={pushToGoogleSheets}
                                    disabled={pushing}
                                    className="bg-green-600 hover:bg-green-700"
                                >
                                    {pushing ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Pushing...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="mr-2 h-4 w-4" />
                                            Push to Google Sheets
                                        </>
                                    )}
                                </Button>
                                <Button
                                    onClick={saveSelectedCampaigns}
                                    disabled={saving}
                                    variant="outline"
                                >
                                    {saving ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="mr-2 h-4 w-4" />
                                            Save to Database
                                        </>
                                    )}
                                </Button>
                            </div>
                        )}
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
                                            <div className="space-y-6">
                                                {/* Headline Section */}
                                                {result.headline && (
                                                    <div className="space-y-2">
                                                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                                            Headline
                                                        </div>
                                                        <h3 className="font-bold text-xl text-foreground leading-tight">
                                                            {result.headline}
                                                        </h3>
                                                    </div>
                                                )}

                                                {/* Message Body Section */}
                                                {result.body && (
                                                    <div className="space-y-2">
                                                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                                            Message
                                                        </div>
                                                        <p className="text-sm text-foreground leading-relaxed whitespace-pre-line bg-muted/30 p-4 rounded-lg border">
                                                            {typeof result.body === 'string'
                                                                ? result.body
                                                                : Array.isArray(result.body)
                                                                    ? result.body.join('\n')
                                                                    : result.message}
                                                        </p>
                                                    </div>
                                                )}

                                                {/* CTA Section */}
                                                {result.cta_text && (
                                                    <div className="space-y-2">
                                                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                                            Call to Action
                                                        </div>
                                                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md font-semibold text-sm">
                                                            {result.cta_text}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Image Prompt Section */}
                                                {result.image_prompt && (
                                                    <div className="space-y-2">
                                                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                                                            <span>🖼️</span>
                                                            <span>Image Prompt</span>
                                                        </div>
                                                        <p className="text-sm text-primary bg-primary/5 p-4 rounded-lg border border-primary/20">
                                                            {result.image_prompt}
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Action Buttons */}
                                                <div className="flex gap-2 pt-4 border-t">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => {
                                                            const text = `${result.headline}\n\n${typeof result.body === 'string' ? result.body : Array.isArray(result.body) ? result.body.join('\n') : result.message}\n\nCTA: ${result.cta_text}`;
                                                            navigator.clipboard.writeText(text);
                                                        }}
                                                        className="flex-1"
                                                    >
                                                        <Copy className="w-4 h-4 mr-2" />
                                                        Copy
                                                    </Button>
                                                    <Button
                                                        variant="default"
                                                        size="sm"
                                                        onClick={() => toggleSelection(result.id)}
                                                        className="flex-1"
                                                    >
                                                        {selectedResults.includes(result.id) ? 'Selected' : 'Select'}
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : result.status === "generating" ? (
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                <span className="text-sm">Generating...</span>
                                            </div>
                                        ) : (
                                            <div className="text-sm text-destructive">{result.message}</div>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
}
