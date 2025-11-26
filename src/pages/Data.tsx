import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Database, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function Data() {
  const [files, setFiles] = useState<FileList | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleGoogleSheetsConnect = () => {
    toast.info("Google Sheets OAuth integration coming soon");
  };

  const handleLoadSampleData = async () => {
    try {
      setLoading(true);
      toast.info("Loading sample data from Excel files...");

      // Load the analysis output data
      const campaignsResponse = await fetch('/analysis-output/campaigns_detailed.json');
      const revenueResponse = await fetch('/analysis-output/revenue_detailed.json');
      
      if (!campaignsResponse.ok || !revenueResponse.ok) {
        toast.error("Analysis files not found. Please run the Python analyzer first.");
        return;
      }

      const campaigns = await campaignsResponse.json();
      const revenues = await revenueResponse.json();

      toast.info(`Found ${campaigns.length} campaigns and ${revenues.length} revenue records`);

      // Transform and insert revenue data
      const revenueRecords = revenues.map((r: any) => ({
        record_date: r.date || new Date().toISOString().split('T')[0],
        vertical: r.vertical || 'Unknown',
        product_name: r.product_name || '',
        orders: r.orders || 0,
        revenue: r.revenue || 0,
        source: r.source || '',
      })).filter((r: any) => r.vertical && r.vertical !== 'Unknown');

      if (revenueRecords.length > 0) {
        const { error: revError } = await supabase
          .from('revenue_data')
          .upsert(revenueRecords, { onConflict: 'record_date,vertical' });
        
        if (revError) {
          console.error('Revenue insert error:', revError);
          toast.error(`Error loading revenue: ${revError.message}`);
        } else {
          toast.success(`Loaded ${revenueRecords.length} revenue records`);
        }
      }

      // Get or create verticals
      const uniqueVerticals = [...new Set(campaigns.map((c: any) => c.vertical).filter(Boolean))];
      const { data: existingVerticals } = await supabase
        .from('verticals')
        .select('id, name');

      const existingNames = new Set((existingVerticals || []).map((v: any) => v.name));
      const newVerticals = uniqueVerticals
        .filter(v => !existingNames.has(v))
        .map(name => ({ name }));

      if (newVerticals.length > 0) {
        await supabase.from('verticals').insert(newVerticals);
      }

      // Refresh verticals list
      const { data: allVerticals } = await supabase
        .from('verticals')
        .select('id, name');

      const verticalMap = new Map((allVerticals || []).map((v: any) => [v.name, v.id]));

      // Transform and insert campaign data as suggestions
      const today = new Date().toISOString().split('T')[0];
      const suggestions = campaigns
        .filter((c: any) => c.vertical && (c.hook || c.push_copy))
        .slice(0, 100) // Limit to 100 to avoid overwhelming
        .map((c: any) => ({
          suggestion_date: today,
          vertical_id: verticalMap.get(c.vertical),
          hook: c.hook || c.campaign_name || 'Sample Campaign',
          push_copy: c.push_copy || 'Sample push notification content',
          cta: c.cta || 'Learn More',
          channel: c.platform?.toLowerCase() || 'push',
          urgency: c.urgency || 'Medium',
          link: c.app_link || c.web_link || c.link || '',
          score: Math.random() * 0.4 + 0.6, // Random score between 0.6-1.0
          status: 'pending',
          promo_code: c.promo_code || null,
          discount: c.discount || null,
          scheduled_time: c.scheduled_time || null,
          contact_number: c.contact_number || null,
          user_count: c.user_count || null,
        }))
        .filter((s: any) => s.vertical_id);

      if (suggestions.length > 0) {
        const { error: suggError } = await supabase
          .from('suggestions')
          .insert(suggestions as any);
        
        if (suggError) {
          console.error('Suggestions insert error:', suggError);
          toast.error(`Error loading suggestions: ${suggError.message}`);
        } else {
          toast.success(`Loaded ${suggestions.length} campaign suggestions`);
        }
      }

      toast.success("Sample data loaded successfully! Check Dashboard.");
      
    } catch (error: any) {
      console.error('Load error:', error);
      toast.error(`Failed to load sample data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const parseCsv = async (file: File) => {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return [];
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const idx = (name: string) => headers.indexOf(name.toLowerCase());
    const out: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",");
      if (cols.length < headers.length) continue;
      out.push({
        record_date: cols[idx("date")]?.trim() || cols[idx("record_date")]?.trim() || "",
        vertical: cols[idx("vertical")]?.trim() || "",
        product_name: cols[idx("product name")]?.trim() || cols[idx("product_name")]?.trim() || "",
        orders: Number(cols[idx("orders")] ?? 0),
        revenue: Number(cols[idx("revenue")] ?? 0),
        course_type: cols[idx("course type")]?.trim() || cols[idx("course_type")]?.trim() || "",
        source: cols[idx("source")]?.trim() || "",
        offer_discount: cols[idx("offer/discount")]?.trim() || cols[idx("offer_discount")]?.trim() || "",
      });
    }
    return out.filter((r) => r.vertical && r.record_date);
  };

  const handleAnalyzeAndGenerate = async () => {
    try {
      if (!files || files.length === 0) {
        toast.error("Please select one or more CSV files");
        return;
      }
      setAnalyzing(true);
      
      const revenueRecords: any[] = [];
      const campaignSheets: string[] = [];

      // Parse each file and detect type
      for (const file of Array.from(files)) {
        const text = await file.text();
        const lines = text.split(/\r?\n/).filter((l) => l.trim());
        
        if (lines.length < 2) continue;

        const header = lines[0].toLowerCase();
        
        // Detect Revenue Campaign sheets (have hook, cta, push columns)
        if (header.includes("hook") || header.includes("cta") || header.includes("push")) {
          campaignSheets.push(text);
          toast.info(`Detected campaign sheet: ${file.name}`);
        } else {
          // Parse as revenue data
          const rows = await parseCsv(file);
          revenueRecords.push(...rows);
        }
      }

      if (revenueRecords.length === 0 && campaignSheets.length === 0) {
        toast.error("No valid data detected");
        return;
      }

      toast.info(
        `Analyzing ${revenueRecords.length} revenue records and ${campaignSheets.length} campaign sheets...`
      );

      // Call edge function with deep mode if campaign sheets exist
      const { data, error } = await (supabase as any).functions.invoke("generate-comms", {
        body: {
          records: revenueRecords,
          campaignSheets,
          mode: campaignSheets.length > 0 ? "deep" : "quick",
        },
      });
      
      if (error) throw error;
      
      const suggestions = data?.suggestions ?? [];
      const meta = data?.meta || {};

      if (suggestions.length === 0) {
        toast.error("No suggestions generated");
        return;
      }

      // Insert suggestions
      const { error: insertErr } = await supabase.from("suggestions").insert(suggestions as any);
      if (insertErr) throw insertErr;
      
      toast.success(
        `Generated ${suggestions.length} suggestions! ` +
          (meta.analyzed_campaigns > 0
            ? `Analyzed ${meta.analyzed_campaigns} historical campaigns. `
            : "") +
          (meta.stored_in_s3 ? "Stored in S3." : "")
      );
      
      setFiles(null);
    } catch (e: any) {
      toast.error(e?.message || "Failed to generate");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Data Sources</h1>
        <p className="text-muted-foreground mt-2">
          Connect and manage your revenue data sources
        </p>
      </div>

      {/* Load Analyzed Data */}
      <Card className="border-primary/50 bg-primary/5">
        <CardHeader>
          <CardTitle>Load Pre-Analyzed Data</CardTitle>
          <CardDescription>
            Load campaigns and revenue data from the analyzed Excel files (May-November 2025)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The Python analyzer has already processed your Excel files. Click below to load this data into the database
            and start generating AI-powered campaigns immediately.
          </p>
          <Button 
            onClick={handleLoadSampleData} 
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? "Loading Data..." : "Load Analyzed Data"}
          </Button>
        </CardContent>
      </Card>

      {/* Google Sheets Connection */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            <CardTitle>Google Sheets Integration</CardTitle>
          </div>
          <CardDescription>
            Connect to your revenue Google Sheets (July - November)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sheet-url">Google Sheet URLs</Label>
            <div className="space-y-2">
              {["July", "August", "September", "October", "November"].map((month) => (
                <Input
                  key={month}
                  placeholder={`${month} 2025 Revenue Sheet URL`}
                  disabled
                />
              ))}
            </div>
          </div>
          <Button onClick={handleGoogleSheetsConnect} className="w-full">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Connect Google Sheets
          </Button>
          <p className="text-xs text-muted-foreground">
            Required columns: Date, Vertical, Product Name, Orders, Revenue, Course Type, Source, Offer/Discount
          </p>
        </CardContent>
      </Card>

      {/* CSV Upload + Generate */}
      <Card>
        <CardHeader>
          <CardTitle>Analyze CSVs and Generate Comms</CardTitle>
          <CardDescription>Upload exported CSVs from Google Sheets</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="csv-files">CSV Files (Revenue + Campaign Sheets)</Label>
            <Input
              id="csv-files"
              type="file"
              accept=".csv"
              multiple
              onChange={(e) => setFiles(e.target.files)}
            />
            <p className="text-xs text-muted-foreground">
              Upload revenue CSVs AND Revenue Campaign sheets. We'll auto-detect which is which.
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleAnalyzeAndGenerate} disabled={analyzing}>
              {analyzing ? "Analyzing..." : "Analyze & Generate"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Deep analysis extracts patterns from your campaign sheets to generate similar high-quality notifications.
            Results are stored in S3 under marcom-automation/ prefix (won't disturb existing files).
          </p>
        </CardContent>
      </Card>

      {/* Revenue Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            <CardTitle>Revenue Data</CardTitle>
          </div>
          <CardDescription>Current database statistics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Records</p>
              <p className="text-2xl font-bold">0</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Date Range</p>
              <p className="text-2xl font-bold">-</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Last Upload</p>
              <p className="text-2xl font-bold">-</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
