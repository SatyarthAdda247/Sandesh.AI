import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileText, TrendingUp, Calendar, CheckCircle, Sparkles, Zap, FileSpreadsheet, RefreshCw, ExternalLink, Search } from "lucide-react";
import { toast } from "sonner";

interface RevenueData {
  vertical: string;
  revenue: number;
  percentage: number;
}

interface SuggestionSummary {
  vertical: string;
  count: number;
  urgency: string;
}

interface SheetRow {
  id: string;
  link: string;
  title: string;
  image_link: string;
  Message: string;
  "Message Summary": string;
  "Message title": string;
  CTA: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestionSummary[]>([]);
  const [suggestionDetails, setSuggestionDetails] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [sheetData, setSheetData] = useState<SheetRow[]>([]);
  const [loadingSheet, setLoadingSheet] = useState(false);
  const [sheetSearch, setSheetSearch] = useState("");
  const [openSuggestionVertical, setOpenSuggestionVertical] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
    loadGoogleSheet();
  }, []);

  // Extract vertical from ID
  const extractVertical = (id: string): string => {
    return id.replace(/\d+$/, "").replace(/_/g, " ");
  };

  // Load Google Sheet data
  const loadGoogleSheet = async () => {
    const sheetUrl = "https://docs.google.com/spreadsheets/d/1nQO6M5jDPqJDRjZPlxVyIl670dzEJuEWsBgXvNSvmKg/edit?usp=sharing";
    setLoadingSheet(true);
    try {
      const sheetId = sheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)?.[1];
      if (!sheetId) {
        throw new Error("Invalid Google Sheets URL");
      }

      const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=0`;
      const response = await fetch(csvUrl);
      if (!response.ok) {
        throw new Error("Failed to fetch sheet data");
      }

      const csvText = await response.text();
      const rows = parseCSV(csvText);
      
      const validRows: SheetRow[] = rows
        .filter((row: any) => row.id && row.id.trim() !== "")
        .slice(0, 50); // Show first 50 rows

      setSheetData(validRows);
    } catch (error: any) {
      console.error("Sheet loading error:", error);
      // Don't show error toast on initial load, just log it
    } finally {
      setLoadingSheet(false);
    }
  };

  // Parse CSV text
  const parseCSV = (text: string): any[] => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) return [];

    const headers = parseCSVLine(lines[0]).map((h) => h.trim().replace(/^"|"$/g, ""));
    const rows: any[] = [];

    const columnMap: Record<string, string> = {
      "id": "id",
      "link": "link",
      "title": "title",
      "image_link": "image_link",
      "image link": "image_link",
      "Message": "Message",
      "message": "Message",
      "Message Summary": "Message Summary",
      "message summary": "Message Summary",
      "Message title": "Message title",
      "message title": "Message title",
      "CTA": "CTA",
      "cta": "CTA",
    };

    const normalizedHeaders = headers.map((h) => columnMap[h.toLowerCase()] || h);

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length === 0) continue;

      const row: any = {};
      normalizedHeaders.forEach((header, idx) => {
        if (header) {
          const value = values[idx]?.trim().replace(/^"|"$/g, "") || "";
          row[header] = value;
        }
      });

      if (row.id && row.id.trim() !== "") {
        rows.push(row);
      }
    }

    return rows;
  };

  // Parse CSV line handling quoted values
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

  // Filter sheet data based on search
  const filteredSheetData = sheetData.filter((row) => {
    if (!sheetSearch) return true;
    const searchLower = sheetSearch.toLowerCase();
    return (
      row.id.toLowerCase().includes(searchLower) ||
      extractVertical(row.id).toLowerCase().includes(searchLower) ||
      (row["Message title"] || "").toLowerCase().includes(searchLower) ||
      (row.Message || "").toLowerCase().includes(searchLower) ||
      (row.CTA || "").toLowerCase().includes(searchLower)
    );
  });

  const loadDashboardData = async () => {
    try {
      // Load revenue summary
      const { data: verticals } = await supabase.from("verticals").select("*");
      
      // Load today's suggestions
      const today = new Date().toISOString().split("T")[0];
      const { data: todaySuggestions } = await supabase
        .from("suggestions")
        .select("*, verticals(name)")
        .eq("suggestion_date", today);

      // Mock revenue data for demo
      const mockRevenue: RevenueData[] = (verticals || []).map((v, i) => ({
        vertical: v.name,
        revenue: Math.random() * 1000000,
        percentage: Math.random() * 100,
      }));

      setRevenueData(mockRevenue);

      // Group suggestions by vertical
      const suggestionsByVertical = (todaySuggestions || []).reduce((acc, s) => {
        const key = s.verticals?.name || "Unknown";
        if (!acc[key]) acc[key] = [];
        acc[key].push(s);
        return acc;
      }, {} as Record<string, any[]>);

      const summary: SuggestionSummary[] = Object.entries(suggestionsByVertical).map(
        ([vertical, items]) => ({
          vertical,
          count: items.length,
          urgency: items[0]?.urgency || "Low",
        })
      );

      setSuggestions(summary);
      setSuggestionDetails(suggestionsByVertical);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateToday = async () => {
    try {
      setGenerating(true);
      const today = new Date().toISOString().split("T")[0];
      const { data: verticals } = await supabase.from("verticals").select("*");
      if (!verticals || verticals.length === 0) {
        toast.error("No verticals available");
        return;
      }
      // Create 1 suggestion per vertical
      const rows = verticals.map((v: any) => ({
        suggestion_date: today,
        vertical_id: v.id,
        hook: `Today's top pick for ${v.name}`,
        push_copy: `Fresh offer and practice plan curated for ${v.name}.`,
        cta: "View Now",
        channel: "push",
        urgency: ["High", "Medium", "Low"][Math.floor(Math.random() * 3)],
        link: null,
        score: Math.round((Math.random() * 0.5 + 0.5) * 1000) / 1000,
        status: "pending",
      }));
      const { error } = await supabase.from("suggestions").insert(rows as any);
      if (error) throw error;
      toast.success("Today's comms generated");
      await loadDashboardData();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Sandesh.ai Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          AI-Powered MarCom Automation for Adda247
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Verticals</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{revenueData.length}</div>
            <p className="text-xs text-muted-foreground">Active marketing verticals</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Suggestions</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {suggestions.reduce((sum, s) => sum + s.count, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Ready for review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Awaiting publish</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Schedule</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">08:00</div>
            <p className="text-xs text-muted-foreground">Daily generation time (IST)</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Vertical Revenue Distribution</CardTitle>
          <CardDescription>Last 3 months revenue share</CardDescription>
        </CardHeader>
        <CardContent>
          {revenueData.length > 0 ? (
            <div className="space-y-3">
              {revenueData.map((item) => (
                <div key={item.vertical} className="flex items-center justify-between">
                  <span className="font-medium">{item.vertical}</span>
                  <div className="flex items-center gap-4">
                    <div className="w-48 h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground w-16 text-right">
                      {item.percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No revenue data available. Upload Google Sheets to get started.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Today's Suggestions Preview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Today's Suggestions</CardTitle>
            <CardDescription>Top 3 suggestions per vertical</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.location.href = "/suggestions"}>
              View All
            </Button>
            <Button onClick={handleGenerateToday} disabled={generating}>
              {generating ? "Generating..." : "Generate Today's Comms"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {suggestions.length > 0 ? (
            <div className="space-y-4">
              {suggestions.map((item) => (
                <button
                  key={item.vertical}
                  className="flex w-full items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors text-left"
                  onClick={() => setOpenSuggestionVertical(item.vertical)}
                >
                  <div>
                    <h4 className="font-medium">{item.vertical}</h4>
                    <p className="text-sm text-muted-foreground">
                      {item.count} suggestions ready
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        item.urgency === "High"
                          ? "bg-destructive/10 text-destructive"
                          : item.urgency === "Medium"
                          ? "bg-warning/10 text-warning-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {item.urgency}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No suggestions generated yet. Check back at 08:00 IST daily.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Google Sheets Viewer */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Test Prime Push Automation Sheet
            </CardTitle>
            <CardDescription>
              View and manage campaign data from Google Sheets
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadGoogleSheet}
              disabled={loadingSheet}
            >
              {loadingSheet ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => navigate("/generate/bulk")}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Bulk Generate
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingSheet ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Loading sheet data...</span>
            </div>
          ) : sheetData.length > 0 ? (
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by ID, vertical, message, or CTA..."
                  value={sheetSearch}
                  onChange={(e) => setSheetSearch(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Table */}
              <div className="border rounded-lg overflow-hidden">
                <div className="max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-muted">
                      <TableRow>
                        <TableHead className="w-32">ID</TableHead>
                        <TableHead>Vertical</TableHead>
                        <TableHead>Message Title</TableHead>
                        <TableHead className="max-w-xs">Message Preview</TableHead>
                        <TableHead>CTA</TableHead>
                        <TableHead className="w-24">Link</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSheetData.length > 0 ? (
                        filteredSheetData.map((row, idx) => (
                          <TableRow key={idx} className="hover:bg-muted/50">
                            <TableCell className="font-mono text-xs">
                              <Badge variant="outline">{row.id}</Badge>
                            </TableCell>
                            <TableCell>
                              <span className="font-medium">{extractVertical(row.id)}</span>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm">{row["Message title"] || "-"}</span>
                            </TableCell>
                            <TableCell className="max-w-xs">
                              <p className="text-xs text-muted-foreground truncate">
                                {row.Message || row["Message Summary"] || "-"}
                              </p>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">{row.CTA || "-"}</Badge>
                            </TableCell>
                            <TableCell>
                              {row.link ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => window.open(row.link, "_blank")}
                                  className="h-8 w-8 p-0"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            No campaigns found matching your search
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Summary */}
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  Showing {filteredSheetData.length} of {sheetData.length} campaigns
                </span>
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => window.open("https://docs.google.com/spreadsheets/d/1nQO6M5jDPqJDRjZPlxVyIl670dzEJuEWsBgXvNSvmKg/edit?usp=sharing", "_blank")}
                >
                  Open in Google Sheets
                  <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                No sheet data loaded. Click Refresh to load from Google Sheets.
              </p>
              <Button onClick={loadGoogleSheet} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Load Sheet Data
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!openSuggestionVertical} onOpenChange={(open) => !open && setOpenSuggestionVertical(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{openSuggestionVertical} Suggestions</DialogTitle>
            <DialogDescription>Latest comms for this vertical</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {(openSuggestionVertical ? suggestionDetails[openSuggestionVertical] : [])?.map((suggestion) => (
              <Card key={suggestion.id || suggestion.hook}>
                <CardHeader className="space-y-1">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{suggestion.hook}</CardTitle>
                    <Badge
                      variant={
                        suggestion.urgency === "High"
                          ? "destructive"
                          : suggestion.urgency === "Medium"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {suggestion.urgency || "Low"}
                    </Badge>
                  </div>
                  <CardDescription>{suggestion.channel?.toUpperCase()}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm whitespace-pre-wrap">{suggestion.push_copy}</p>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    {suggestion.cta && (
                      <Badge variant="outline" className="font-medium">
                        CTA: {suggestion.cta}
                      </Badge>
                    )}
                    {suggestion.score && (
                      <span className="text-muted-foreground">Score: {Number(suggestion.score).toFixed(2)}</span>
                    )}
                    {suggestion.status && (
                      <Badge variant="outline" className="capitalize">
                        {suggestion.status}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            {openSuggestionVertical && (!suggestionDetails[openSuggestionVertical] || suggestionDetails[openSuggestionVertical].length === 0) && (
              <p className="text-sm text-muted-foreground">No suggestions found for this vertical.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
