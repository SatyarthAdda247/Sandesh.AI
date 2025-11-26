import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
import { Sparkles, TrendingUp, Clock, Target } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  generateRecommendations,
  getCurrentTimeContext,
  type ScoredRecommendation,
  type RecommendationInput,
} from '@/lib/recommendationEngine';

export default function Recommendations() {
  const [recommendations, setRecommendations] = useState<ScoredRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRec, setSelectedRec] = useState<ScoredRecommendation | null>(null);

  useEffect(() => {
    loadRecommendations();
  }, []);

  const loadRecommendations = async () => {
    setLoading(true);
    try {
      // Get verticals
      const { data: verticals } = await supabase.from('verticals').select('*');

      if (!verticals || verticals.length === 0) {
        toast.info('No verticals found. Please add data first.');
        return;
      }

      // Mock revenue data for demo (in production, fetch from revenue_records)
      const inputs: RecommendationInput[] = verticals.map((v) => ({
        vertical: v.name,
        revenueData: {
          totalRevenue: Math.random() * 500000 + 100000,
          totalOrders: Math.floor(Math.random() * 500 + 50),
          topProducts: [
            {
              product: `${v.name} Mahapack`,
              revenue: Math.random() * 200000 + 50000,
              orders: Math.floor(Math.random() * 200 + 20),
            },
          ],
        },
        timeContext: getCurrentTimeContext(),
      }));

      const recs = generateRecommendations(inputs);
      setRecommendations(recs);
      toast.success(`Generated ${recs.length} recommendations`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (rec: ScoredRecommendation) => {
    try {
      // Get vertical ID
      const { data: verticals } = await supabase
        .from('verticals')
        .select('id')
        .eq('name', rec.vertical)
        .single();

      if (!verticals) {
        toast.error('Vertical not found');
        return;
      }

      // Insert as suggestion
      const { error } = await supabase.from('suggestions').insert([
        {
          suggestion_date: new Date().toISOString().split('T')[0],
          vertical_id: verticals.id,
          hook: rec.hook,
          push_copy: rec.pushCopy,
          cta: rec.cta,
          channel: rec.channel,
          urgency: rec.urgency,
          link: rec.link,
          score: rec.score,
          status: 'pending',
        },
      ] as any);

      if (error) throw error;

      toast.success('Recommendation approved and added to suggestions');
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve');
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'High':
        return 'destructive';
      case 'Medium':
        return 'default';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-primary" />
            AI Recommendations
          </h1>
          <p className="text-muted-foreground mt-2">
            Smart suggestions powered by 2,170 historical campaigns
          </p>
        </div>
        <Button onClick={loadRecommendations} disabled={loading}>
          {loading ? 'Generating...' : 'Refresh Recommendations'}
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Recommendations</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recommendations.length}</div>
            <p className="text-xs text-muted-foreground">Ranked by score</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Priority</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {recommendations.filter((r) => r.urgency === 'High').length}
            </div>
            <p className="text-xs text-muted-foreground">Score ≥ 0.85</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Score</CardTitle>
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {recommendations.length > 0
                ? (
                    recommendations.reduce((sum, r) => sum + r.score, 0) /
                    recommendations.length
                  ).toFixed(2)
                : '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">Across all verticals</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Time Context</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {getCurrentTimeContext().isMonthEnd ? 'Month-End' : 'Regular'}
            </div>
            <p className="text-xs text-muted-foreground">
              {getCurrentTimeContext().dayOfWeek}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Ranked Recommendations</CardTitle>
          <CardDescription>
            AI-scored push notifications based on revenue, historical performance, and timing
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : recommendations.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Vertical</TableHead>
                  <TableHead>Hook</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Urgency</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recommendations.map((rec, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-bold">#{idx + 1}</TableCell>
                    <TableCell className="font-medium">{rec.vertical}</TableCell>
                    <TableCell className="max-w-xs truncate">{rec.hook}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={rec.score * 100} className="w-16" />
                        <span className="text-sm font-medium">{rec.score.toFixed(2)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getUrgencyColor(rec.urgency)}>{rec.urgency}</Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedRec(rec)}
                      >
                        Details
                      </Button>
                      <Button size="sm" onClick={() => handleApprove(rec)}>
                        Approve
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-12">
              No recommendations yet. Click "Refresh Recommendations" to generate.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={!!selectedRec} onOpenChange={() => setSelectedRec(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Recommendation Details</DialogTitle>
            <DialogDescription>{selectedRec?.vertical}</DialogDescription>
          </DialogHeader>
          {selectedRec && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Hook</h3>
                <p className="text-sm bg-muted p-3 rounded">{selectedRec.hook}</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Push Copy</h3>
                <p className="text-sm bg-muted p-3 rounded">{selectedRec.pushCopy}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">CTA</h3>
                  <p className="text-sm">{selectedRec.cta}</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Channel</h3>
                  <p className="text-sm">{selectedRec.channel}</p>
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Score Breakdown</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Revenue Weight (40%)</span>
                    <span className="font-medium">
                      {selectedRec.scoreBreakdown.revenueWeight.toFixed(3)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Historical Performance (30%)</span>
                    <span className="font-medium">
                      {selectedRec.scoreBreakdown.historicalPerformance.toFixed(3)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Timing Boost (15%)</span>
                    <span className="font-medium">
                      {selectedRec.scoreBreakdown.timingBoost.toFixed(3)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Vertical Priority (15%)</span>
                    <span className="font-medium">
                      {selectedRec.scoreBreakdown.verticalPriority.toFixed(3)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm font-bold border-t pt-2">
                    <span>Total Score</span>
                    <span>{selectedRec.score.toFixed(3)}</span>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Reasoning</h3>
                <ul className="text-sm space-y-1">
                  {selectedRec.reasoning.map((reason, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

