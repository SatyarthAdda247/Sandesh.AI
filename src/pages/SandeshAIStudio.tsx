import React, { useState, useEffect } from 'react';
import {
    LayoutDashboard,
    PenTool,
    Settings,
    LogOut,
    Plus,
    Search,
    Bell,
    ChevronDown,
    Sparkles,
    Copy,
    Download,
    Save,
    Loader2
} from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { toast } from 'sonner';

// --- Types ---
interface GeneratedComponent {
    type: 'headline' | 'body' | 'cta' | 'subject';
    content: string;
    rationale?: string;
}

interface GeneratedResult {
    message: string;
    components: GeneratedComponent[];
    headline?: string;
    body?: string;
    cta_text?: string;
    image_prompt?: string;
    notes?: string;
}

// --- Constants ---
const MOENGAGE_BLUE = '#2E5BFF';
const SIDEBAR_WIDTH = '260px';

const VERTICALS = [
    "BANKING", "E-COMMERCE", "RETAIL", "TRAVEL", "ENTERTAINMENT",
    "HEALTHCARE", "EDTECH", "FINTECH", "GAMING", "OTHER"
];

const TONALITIES = [
    { value: "urgent", label: "Urgent/FOMO" },
    { value: "playful", label: "Playful/Witty" },
    { value: "emotional", label: "Emotional/Empathetic" },
    { value: "luxury", label: "Luxury/Exclusive" },
    { value: "informative", label: "Informative/Direct" },
    { value: "neutral", label: "Neutral/Professional" },
];

const SandeshAIStudio = () => {
    const [activeTab, setActiveTab] = useState('campaigns');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    // --- State for Campaign Generation ---
    const [campaignType, setCampaignType] = useState('push');
    const [vertical, setVertical] = useState('E-COMMERCE');
    const [tonality, setTonality] = useState('urgent');
    const [language, setLanguage] = useState('English');
    const [audience, setAudience] = useState('All Users');
    const [context, setContext] = useState('');
    const [variationCount, setVariationCount] = useState(3);
    const [isGenerating, setIsGenerating] = useState(false);
    const [results, setResults] = useState<GeneratedResult[]>([]);
    const [selectedResults, setSelectedResults] = useState<Set<number>>(new Set());

    // --- Handlers ---
    const handleGenerate = async () => {
        if (!context) {
            toast.error("Please enter campaign context or details.");
            return;
        }

        setIsGenerating(true);
        setResults([]); // Clear previous results
        const promises = [];

        for (let i = 0; i < variationCount; i++) {
            promises.push(
                supabase.functions.invoke('generate-campaign-gemini', {
                    body: {
                        campaignType,
                        vertical,
                        tonality,
                        language,
                        audience,
                        trendContext: { title: context },
                        variationIndex: i
                    }
                })
            );
        }

        try {
            const responses = await Promise.all(promises);
            const newResults: GeneratedResult[] = [];

            for (const { data, error } of responses) {
                if (error) {
                    console.error("Generation error:", error);
                    continue;
                }
                if (data) {
                    newResults.push(data);
                }
            }

            if (newResults.length === 0) {
                throw new Error("No campaigns generated successfully.");
            }

            setResults(newResults);
            toast.success(`Generated ${newResults.length} campaigns!`);

        } catch (error: any) {
            console.error("Generation error:", error);
            toast.error(error.message || "Failed to generate campaigns.");
        } finally {
            setIsGenerating(false);
        }
    };

    const toggleSelection = (index: number) => {
        const newSelected = new Set(selectedResults);
        if (newSelected.has(index)) {
            newSelected.delete(index);
        } else {
            newSelected.add(index);
        }
        setSelectedResults(newSelected);
    };

    const handleSaveSelected = async () => {
        if (selectedResults.size === 0) {
            toast.error("No campaigns selected to save.");
            return;
        }

        try {
            // 1. Ensure Vertical Exists
            let verticalId;
            const { data: verticalData } = await supabase
                .from('verticals')
                .select('id')
                .eq('name', vertical)
                .single();

            if (verticalData) {
                verticalId = verticalData.id;
            } else {
                const { error: createError } = await supabase
                    .from('verticals')
                    .insert([{ name: vertical }]);

                if (createError) throw createError;

                const { data: newVertical, error: fetchError } = await supabase
                    .from('verticals')
                    .select('id')
                    .eq('name', vertical)
                    .single();

                if (fetchError) throw fetchError;
                verticalId = newVertical.id;
            }

            // 2. Prepare Insert Data
            const suggestionsToInsert = Array.from(selectedResults).map(index => {
                const result = results[index];
                return {
                    suggestion_date: new Date().toISOString().split('T')[0],
                    vertical_id: verticalId,
                    hook: result.headline || result.message.substring(0, 50),
                    push_copy: result.body || result.message,
                    cta: result.cta_text || "Learn More",
                    channel: campaignType,
                    urgency: tonality === 'urgent' ? 'High' : 'Medium',
                    score: 0.95, // Mock score
                    status: 'approved',
                    approved_at: new Date().toISOString(),
                    trend_context: { context } as any,
                    insta_rationale: result.notes || null,
                };
            });

            // 3. Insert into Supabase
            const { error } = await supabase.from('suggestions').insert(suggestionsToInsert);
            if (error) throw error;

            toast.success(`Saved ${selectedResults.size} campaigns to dashboard!`);
            setSelectedResults(new Set()); // Clear selection

        } catch (error: any) {
            console.error("Save error:", error);
            toast.error("Failed to save campaigns.");
        }
    };

    return (
        <div className="flex h-screen bg-[#F4F6F8] font-sans text-slate-800">
            {/* --- Sidebar --- */}
            <aside
                className="fixed left-0 top-0 h-full bg-white border-r border-slate-200 z-10 transition-all duration-300"
                style={{ width: SIDEBAR_WIDTH }}
            >
                <div className="flex items-center h-16 px-6 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-[#2E5BFF] rounded-lg flex items-center justify-center text-white font-bold text-xl">
                            S
                        </div>
                        <span className="font-bold text-lg tracking-tight text-slate-900">Sandesh<span className="text-[#2E5BFF]">.AI</span></span>
                    </div>
                </div>

                <nav className="p-4 space-y-1">
                    <SidebarItem icon={<LayoutDashboard size={20} />} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
                    <SidebarItem icon={<PenTool size={20} />} label="Campaigns" active={activeTab === 'campaigns'} onClick={() => setActiveTab('campaigns')} />
                    <SidebarItem icon={<Sparkles size={20} />} label="Content Studio" active={activeTab === 'studio'} onClick={() => setActiveTab('studio')} />
                    <div className="pt-4 mt-4 border-t border-slate-100">
                        <SidebarItem icon={<Settings size={20} />} label="Settings" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
                    </div>
                </nav>

                <div className="absolute bottom-0 w-full p-4 border-t border-slate-100">
                    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-medium">
                            JD
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">John Doe</p>
                            <p className="text-xs text-slate-500 truncate">john@example.com</p>
                        </div>
                        <LogOut size={16} className="text-slate-400" />
                    </div>
                </div>
            </aside>

            {/* --- Main Content --- */}
            <main
                className="flex-1 transition-all duration-300 flex flex-col min-h-screen"
                style={{ marginLeft: SIDEBAR_WIDTH }}
            >
                {/* Header */}
                <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-20">
                    <div className="flex items-center gap-4">
                        <h1 className="text-xl font-semibold text-slate-900">Campaign Generator</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search campaigns..."
                                className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2E5BFF]/20 focus:border-[#2E5BFF] transition-all w-64"
                            />
                        </div>
                        <button className="p-2 text-slate-500 hover:bg-slate-50 rounded-full relative">
                            <Bell size={20} />
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                        </button>
                        <button className="bg-[#2E5BFF] hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm shadow-blue-200">
                            <Plus size={18} />
                            New Campaign
                        </button>
                    </div>
                </header>

                {/* Content Area */}
                <div className="p-8 max-w-7xl mx-auto w-full space-y-8">

                    {/* Input Section */}
                    <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                                <Sparkles className="text-[#2E5BFF]" size={20} />
                                AI Configuration
                            </h2>
                        </div>

                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Campaign Type</label>
                                    <div className="flex p-1 bg-slate-100 rounded-lg w-fit">
                                        {['push', 'email', 'sms'].map(type => (
                                            <button
                                                key={type}
                                                onClick={() => setCampaignType(type)}
                                                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all capitalize ${campaignType === type
                                                    ? 'bg-white text-[#2E5BFF] shadow-sm'
                                                    : 'text-slate-500 hover:text-slate-700'
                                                    }`}
                                            >
                                                {type}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Vertical</label>
                                    <select
                                        value={vertical}
                                        onChange={(e) => setVertical(e.target.value)}
                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2E5BFF]/20 focus:border-[#2E5BFF]"
                                    >
                                        {VERTICALS.map(v => <option key={v} value={v}>{v}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Tonality</label>
                                    <select
                                        value={tonality}
                                        onChange={(e) => setTonality(e.target.value)}
                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2E5BFF]/20 focus:border-[#2E5BFF]"
                                    >
                                        {TONALITIES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Variations</label>
                                    <div className="flex p-1 bg-slate-100 rounded-lg w-fit">
                                        {[1, 3, 5].map(count => (
                                            <button
                                                key={count}
                                                onClick={() => setVariationCount(count)}
                                                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${variationCount === count
                                                    ? 'bg-white text-[#2E5BFF] shadow-sm'
                                                    : 'text-slate-500 hover:text-slate-700'
                                                    }`}
                                            >
                                                {count}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Context & Details</label>
                                    <textarea
                                        value={context}
                                        onChange={(e) => setContext(e.target.value)}
                                        placeholder="Describe your campaign goal, target audience, and any specific offers (e.g., 'Summer Sale 50% off for loyal customers')..."
                                        className="w-full h-40 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2E5BFF]/20 focus:border-[#2E5BFF] resize-none"
                                    />
                                </div>

                                <div className="flex justify-end">
                                    <button
                                        onClick={handleGenerate}
                                        disabled={isGenerating}
                                        className="bg-[#2E5BFF] hover:bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-all shadow-md shadow-blue-200 disabled:opacity-70 disabled:cursor-not-allowed"
                                    >
                                        {isGenerating ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                                        Generate Content
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Results Section */}
                    {results.length > 0 && (
                        <section className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-semibold text-slate-900">Generated Results</h2>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleSaveSelected}
                                        disabled={selectedResults.size === 0}
                                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Save size={16} />
                                        Save Selected ({selectedResults.size})
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {results.map((result, index) => (
                                    <div
                                        key={index}
                                        className={`bg-white rounded-xl border transition-all duration-200 cursor-pointer hover:shadow-md ${selectedResults.has(index)
                                            ? 'border-[#2E5BFF] ring-1 ring-[#2E5BFF] shadow-md'
                                            : 'border-slate-200'
                                            }`}
                                        onClick={() => toggleSelection(index)}
                                    >
                                        <div className="p-5 space-y-4">
                                            <div className="flex justify-between items-start">
                                                <span className="px-2 py-1 bg-blue-50 text-[#2E5BFF] text-xs font-semibold rounded uppercase tracking-wide">
                                                    Variation {index + 1}
                                                </span>
                                                <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${selectedResults.has(index) ? 'bg-[#2E5BFF] border-[#2E5BFF]' : 'border-slate-300'
                                                    }`}>
                                                    {selectedResults.has(index) && <div className="w-2 h-2 bg-white rounded-full" />}
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <div>
                                                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Headline</p>
                                                    <p className="text-slate-900 font-medium leading-snug">{result.headline || result.message.split('\n')[0]}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Body</p>
                                                    <p className="text-slate-600 text-sm leading-relaxed">{result.body || result.message}</p>
                                                </div>
                                                {result.cta_text && (
                                                    <div>
                                                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">CTA</p>
                                                        <span className="inline-block px-3 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-full">
                                                            {result.cta_text}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {result.image_prompt && (
                                            <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 rounded-b-xl">
                                                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                                                    <Sparkles size={12} /> Image Prompt
                                                </p>
                                                <p className="text-xs text-slate-600 italic line-clamp-3">{result.image_prompt}</p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                </div>
            </main>
        </div>
    );
};

// Helper Component for Sidebar Items
const SidebarItem = ({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void }) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${active
            ? 'bg-blue-50 text-[#2E5BFF]'
            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
    >
        {icon}
        {label}
    </button>
);

export default SandeshAIStudio;
