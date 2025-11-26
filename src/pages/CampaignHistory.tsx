import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Database, Search, Download, Filter } from 'lucide-react';
import analysisReport from '../../analysis-report.json';

interface CampaignRow {
  date: string;
  vertical: string;
  hook: string;
  pushCopy: string;
  score: number;
  channel: string;
}

export default function CampaignHistory() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVertical, setSelectedVertical] = useState<string>('all');
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [sortBy, setSortBy] = useState<'score' | 'date'>('score');

  // Convert analysis data to table rows
  const campaigns: CampaignRow[] = useMemo(() => {
    return analysisReport.campaignPatterns.topHooks.map((hook) => ({
      date: '2025-07-01', // Default date from July campaigns
      vertical: hook.vertical,
      hook: hook.hook,
      pushCopy: hook.hook, // Using hook as copy for now
      score: hook.score,
      channel: analysisReport.campaignPatterns.channelBreakdown[hook.vertical] ? hook.vertical : 'App Push',
    }));
  }, []);

  // Filter and sort campaigns
  const filteredCampaigns = useMemo(() => {
    let filtered = campaigns;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (c) =>
          c.hook.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.vertical.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.pushCopy.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Vertical filter
    if (selectedVertical !== 'all') {
      filtered = filtered.filter((c) => c.vertical === selectedVertical);
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'score') {
        return b.score - a.score;
      }
      return b.date.localeCompare(a.date);
    });

    return filtered;
  }, [campaigns, searchTerm, selectedVertical, sortBy]);

  const exportToCSV = () => {
    const headers = ['Date', 'Vertical', 'Hook', 'Push Copy', 'Score', 'Channel'];
    const rows = filteredCampaigns.map((c) => [
      c.date,
      c.vertical,
      `"${c.hook.replace(/"/g, '""')}"`,
      `"${c.pushCopy.replace(/"/g, '""')}"`,
      c.score,
      c.channel,
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `campaigns-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const uniqueVerticals = useMemo(() => {
    return Array.from(new Set(campaigns.map((c) => c.vertical))).sort();
  }, [campaigns]);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Database className="h-8 w-8 text-primary" />
            Campaign History
          </h1>
          <p className="text-muted-foreground mt-2">
            Browse 2,170 historical campaigns from July & August 2025
          </p>
        </div>
        <Button onClick={exportToCSV}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaigns.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Verticals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueVerticals.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(campaigns.reduce((sum, c) => sum + c.score, 0) / campaigns.length).toFixed(2)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Filtered Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredCampaigns.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters & Search</CardTitle>
          <CardDescription>Filter campaigns by vertical, search, or sort</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search hooks, verticals..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Vertical</label>
              <select
                className="w-full h-10 px-3 rounded-md border border-input bg-background"
                value={selectedVertical}
                onChange={(e) => setSelectedVertical(e.target.value)}
              >
                <option value="all">All Verticals</option>
                {uniqueVerticals.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Sort By</label>
              <select
                className="w-full h-10 px-3 rounded-md border border-input bg-background"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'score' | 'date')}
              >
                <option value="score">Score (High to Low)</option>
                <option value="date">Date (Recent First)</option>
              </select>
            </div>
          </div>
          {(searchTerm || selectedVertical !== 'all') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchTerm('');
                setSelectedVertical('all');
              }}
            >
              Clear Filters
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Data</CardTitle>
          <CardDescription>
            Showing {filteredCampaigns.length} of {campaigns.length} campaigns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Date</TableHead>
                  <TableHead className="w-[150px]">Vertical</TableHead>
                  <TableHead>Hook</TableHead>
                  <TableHead className="w-[100px]">Score</TableHead>
                  <TableHead className="w-[120px]">Channel</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCampaigns.length > 0 ? (
                  filteredCampaigns.slice(0, 100).map((campaign, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-mono text-xs">{campaign.date}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{campaign.vertical}</Badge>
                      </TableCell>
                      <TableCell className="max-w-md truncate">{campaign.hook}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            campaign.score >= 0.85
                              ? 'default'
                              : campaign.score >= 0.7
                              ? 'secondary'
                              : 'outline'
                          }
                        >
                          {campaign.score.toFixed(2)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {campaign.channel}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedCampaign(campaign)}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No campaigns found matching your filters
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {filteredCampaigns.length > 100 && (
            <p className="text-sm text-muted-foreground mt-4 text-center">
              Showing first 100 results. Use filters to narrow down.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedCampaign} onOpenChange={() => setSelectedCampaign(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Campaign Details</DialogTitle>
            <DialogDescription>{selectedCampaign?.vertical}</DialogDescription>
          </DialogHeader>
          {selectedCampaign && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold text-sm mb-1">Date</h3>
                  <p className="text-sm">{selectedCampaign.date}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-sm mb-1">Score</h3>
                  <Badge variant="default">{selectedCampaign.score.toFixed(3)}</Badge>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-sm mb-1">Hook</h3>
                <p className="text-sm bg-muted p-3 rounded">{selectedCampaign.hook}</p>
              </div>
              <div>
                <h3 className="font-semibold text-sm mb-1">Push Copy</h3>
                <p className="text-sm bg-muted p-3 rounded whitespace-pre-wrap">
                  {selectedCampaign.pushCopy}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold text-sm mb-1">Channel</h3>
                  <p className="text-sm">{selectedCampaign.channel}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-sm mb-1">Vertical</h3>
                  <Badge variant="outline">{selectedCampaign.vertical}</Badge>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

