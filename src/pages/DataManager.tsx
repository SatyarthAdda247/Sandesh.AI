import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { FileSpreadsheet, Upload, Database, CheckCircle, AlertCircle, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface FileStatus {
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  type: 'campaign' | 'revenue' | 'unknown';
  recordsProcessed: number;
  error?: string;
}

export default function DataManager() {
  const [files, setFiles] = useState<FileStatus[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = Array.from(e.target.files || []);
    if (uploadedFiles.length === 0) return;

    // Initialize file statuses
    const initialStatuses: FileStatus[] = uploadedFiles.map(f => ({
      name: f.name,
      status: 'pending',
      type: 'unknown',
      recordsProcessed: 0,
    }));
    setFiles(initialStatuses);
    setUploading(true);
    setProgress(0);

    try {
      const campaignSheets: string[] = [];
      const revenueRecords: any[] = [];
      let processedCount = 0;

      for (const file of uploadedFiles) {
        const fileIndex = uploadedFiles.indexOf(file);
        
        // Update status to processing
        setFiles(prev => prev.map((f, idx) => 
          idx === fileIndex ? { ...f, status: 'processing' } : f
        ));

        try {
          const text = await file.text();
          const lines = text.split(/\r?\n/).filter(l => l.trim());

          if (lines.length < 2) {
            setFiles(prev => prev.map((f, idx) => 
              idx === fileIndex ? { ...f, status: 'error', error: 'Empty file' } : f
            ));
            continue;
          }

          const header = lines[0].toLowerCase();
          
          // Detect file type
          const isCampaign = header.includes('hook') || 
                            header.includes('cta') || 
                            header.includes('push') ||
                            file.name.toLowerCase().includes('campaign');
          
          const isRevenue = header.includes('revenue') || 
                           header.includes('orders') ||
                           file.name.toLowerCase().includes('revenue');

          if (isCampaign) {
            campaignSheets.push(text);
            setFiles(prev => prev.map((f, idx) => 
              idx === fileIndex ? { 
                ...f, 
                status: 'completed', 
                type: 'campaign',
                recordsProcessed: lines.length - 1 
              } : f
            ));
          } else if (isRevenue) {
            // Parse revenue data
            for (let i = 1; i < lines.length; i++) {
              const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
              if (cols.length >= 5) {
                revenueRecords.push({
                  record_date: cols[0] || new Date().toISOString().split('T')[0],
                  vertical: cols[1] || 'Unknown',
                  product_name: cols[2] || 'Product',
                  orders: parseInt(cols[3]) || 0,
                  revenue: parseFloat(cols[4]) || 0,
                });
              }
            }
            setFiles(prev => prev.map((f, idx) => 
              idx === fileIndex ? { 
                ...f, 
                status: 'completed', 
                type: 'revenue',
                recordsProcessed: lines.length - 1 
              } : f
            ));
          } else {
            setFiles(prev => prev.map((f, idx) => 
              idx === fileIndex ? { 
                ...f, 
                status: 'error', 
                error: 'Unknown file format' 
              } : f
            ));
          }

          processedCount++;
          setProgress((processedCount / uploadedFiles.length) * 100);
        } catch (error: any) {
          setFiles(prev => prev.map((f, idx) => 
            idx === fileIndex ? { 
              ...f, 
              status: 'error', 
              error: error.message 
            } : f
          ));
        }
      }

      // Generate suggestions if we have data
      if (campaignSheets.length > 0 || revenueRecords.length > 0) {
        toast.info('Generating AI recommendations...');

        const { data, error } = await (supabase as any).functions.invoke('generate-comms', {
          body: {
            records: revenueRecords,
            campaignSheets,
            mode: campaignSheets.length > 0 ? 'deep' : 'quick',
          },
        });

        if (error) throw error;

        const suggestions = data?.suggestions || [];
        if (suggestions.length > 0) {
          const { error: insertError } = await supabase
            .from('suggestions')
            .insert(suggestions as any);

          if (insertError) throw insertError;

          toast.success(
            `✅ Processed ${uploadedFiles.length} files\n` +
            `📊 ${campaignSheets.length} campaign sheets analyzed\n` +
            `💰 ${revenueRecords.length} revenue records processed\n` +
            `✨ ${suggestions.length} AI suggestions generated`
          );
        }
      }
    } catch (error: any) {
      toast.error(`Processing error: ${error.message}`);
    } finally {
      setUploading(false);
      setProgress(100);
    }
  };

  const getStatusIcon = (status: FileStatus['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'processing':
        return <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />;
      default:
        return <div className="h-4 w-4 rounded-full border-2 border-muted" />;
    }
  };

  const getTypeColor = (type: FileStatus['type']) => {
    switch (type) {
      case 'campaign':
        return 'default';
      case 'revenue':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Database className="h-8 w-8 text-primary" />
          Data Manager
        </h1>
        <p className="text-muted-foreground mt-2">
          Upload and process campaign sheets & revenue data
        </p>
      </div>

      <Tabs defaultValue="upload" className="space-y-4">
        <TabsList>
          <TabsTrigger value="upload">Upload Files</TabsTrigger>
          <TabsTrigger value="existing">Existing Data</TabsTrigger>
          <TabsTrigger value="generate">Generate Comms</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upload .xlsx / .csv Files</CardTitle>
              <CardDescription>
                Upload campaign sheets and revenue data. We'll auto-detect the file type.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center">
                <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">
                  Drop files here or click to browse
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Supports .xlsx, .csv files (Campaign sheets & Revenue data)
                </p>
                <Input
                  type="file"
                  accept=".xlsx,.csv"
                  multiple
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="max-w-sm mx-auto cursor-pointer"
                />
              </div>

              {uploading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Processing files...</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} />
                </div>
              )}

              {files.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold">Upload Status</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead>File Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Records</TableHead>
                        <TableHead>Error</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {files.map((file, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{getStatusIcon(file.status)}</TableCell>
                          <TableCell className="font-medium">{file.name}</TableCell>
                          <TableCell>
                            <Badge variant={getTypeColor(file.type)}>
                              {file.type}
                            </Badge>
                          </TableCell>
                          <TableCell>{file.recordsProcessed}</TableCell>
                          <TableCell className="text-sm text-red-500">
                            {file.error}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="existing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pre-loaded Campaign Data</CardTitle>
              <CardDescription>
                Historical data from July & August 2025
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <FileSpreadsheet className="h-8 w-8 text-primary" />
                    <div>
                      <h4 className="font-semibold">JULY REVENUE CAMPAIGNS 2025.xlsx</h4>
                      <p className="text-sm text-muted-foreground">1,828 campaigns analyzed</p>
                    </div>
                  </div>
                  <Badge variant="default">Loaded</Badge>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <FileSpreadsheet className="h-8 w-8 text-primary" />
                    <div>
                      <h4 className="font-semibold">AUGUST REVENUE CAMPAIGNS 2025.xlsx</h4>
                      <p className="text-sm text-muted-foreground">342 campaigns analyzed</p>
                    </div>
                  </div>
                  <Badge variant="default">Loaded</Badge>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm">
                    <strong>Total:</strong> 2,170 campaigns from 36 verticals
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    This data powers the AI recommendation engine
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="generate" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Generate Communications
              </CardTitle>
              <CardDescription>
                Use uploaded data to generate AI-powered suggestions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm">
                  After uploading files, suggestions are automatically generated using:
                </p>
                <ul className="text-sm space-y-1 ml-6 list-disc text-muted-foreground">
                  <li>Revenue data for scoring and prioritization</li>
                  <li>Campaign sheets for pattern learning</li>
                  <li>2,170 historical campaigns for context</li>
                  <li>Azure OpenAI (GPT-5-mini) for content generation</li>
                </ul>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => window.location.href = '/recommendations'}>
                  View AI Recommendations
                </Button>
                <Button variant="outline" onClick={() => window.location.href = '/suggestions'}>
                  View Generated Suggestions
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

