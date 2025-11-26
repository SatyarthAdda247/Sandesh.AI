import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Zap, Calendar, TrendingUp, Users, Sparkles, Clock,
  Play, Pause, RefreshCw, Download, CheckCircle2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Event {
  name: string;
  date: string;
  days_until: number;
  urgency: 'high' | 'medium' | 'low';
  tags: string[];
}

interface Campaign {
  vertical: string;
  event_name: string;
  hook: string;
  push_copy: string;
  promo_code: string;
  discount: string;
  scheduled_time: string;
  days_until_event: number;
  personalization_tokens: string[];
}

export default function AutomationHub() {
  const { toast } = useToast();
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [generatedCampaigns, setGeneratedCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState({
    historicalCampaigns: 0,
    verticalsAnalyzed: 0,
    eventsDetected: 0,
    campaignsGenerated: 0,
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    // Load from local storage or API
    const events = localStorage.getItem('upcoming_events');
    const campaigns = localStorage.getItem('generated_campaigns');
    
    if (events) {
      setUpcomingEvents(JSON.parse(events));
    }
    
    if (campaigns) {
      setGeneratedCampaigns(JSON.parse(campaigns));
    }
    
    // Mock stats
    setStats({
      historicalCampaigns: 693,
      verticalsAnalyzed: 15,
      eventsDetected: 5,
      campaignsGenerated: generatedCampaigns.length,
    });
  };

  const runAutomation = async () => {
    setIsRunning(true);
    setProgress(0);
    
    toast({
      title: "🚀 Starting Automation Pipeline",
      description: "Analyzing historical data and generating campaigns...",
    });

    try {
      // Simulate pipeline stages
      const stages = [
        { name: 'Loading historical data', progress: 20 },
        { name: 'Analyzing patterns', progress: 40 },
        { name: 'Detecting events', progress: 60 },
        { name: 'Generating campaigns with GPT-5-mini', progress: 80 },
        { name: 'Finalizing output', progress: 100 },
      ];

      for (const stage of stages) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        setProgress(stage.progress);
        
        toast({
          title: stage.name,
          description: `Progress: ${stage.progress}%`,
        });
      }

      // In production, call actual backend API
      // const response = await fetch('/api/run-automation');
      
      // Mock data for now
      const mockEvents: Event[] = [
        { name: "Children's Day", date: '2025-11-14', days_until: 0, urgency: 'high', tags: ['festive', 'student'] },
        { name: "Jharkhand Foundation Day", date: '2025-11-15', days_until: 1, urgency: 'high', tags: ['state'] },
        { name: "World AIDS Day", date: '2025-12-01', days_until: 17, urgency: 'medium', tags: ['awareness'] },
        { name: "SSC CGL Exam Season", date: '2025-12-01', days_until: 17, urgency: 'medium', tags: ['exam'] },
        { name: "Christmas", date: '2025-12-25', days_until: 41, urgency: 'low', tags: ['festive'] },
      ];

      const mockCampaigns: Campaign[] = [
        {
          vertical: 'SSC',
          event_name: "Children's Day",
          hook: "🎓 Hello {{Username}}, Special Children's Day Offer Inside! 🎉",
          push_copy: "Celebrate Children's Day with SSC preparation that works! Get FLAT 60% Off + Double Validity on all SSC CGL courses. Use code CHILD60. Contact: 9667589247. Limited time offer!",
          promo_code: 'CHILD60',
          discount: '60% Off',
          scheduled_time: '7:00 PM',
          days_until_event: 0,
          personalization_tokens: ['Username'],
        },
        {
          vertical: 'Banking',
          event_name: "World AIDS Day",
          hook: "💪 {{Username}}, Your Banking Career Awaits! Special Offer 🚀",
          push_copy: "This World AIDS Day, invest in your future! Get 50% Off + Extra Validity on Banking Mahapacks. Code: BANK50. Call 9667589247 for details. Hurry!",
          promo_code: 'BANK50',
          discount: '50% Off',
          scheduled_time: '7:00 PM',
          days_until_event: 17,
          personalization_tokens: ['Username'],
        },
      ];

      setUpcomingEvents(mockEvents);
      setGeneratedCampaigns(mockCampaigns);
      
      localStorage.setItem('upcoming_events', JSON.stringify(mockEvents));
      localStorage.setItem('generated_campaigns', JSON.stringify(mockCampaigns));
      
      setStats(prev => ({ ...prev, eventsDetected: mockEvents.length, campaignsGenerated: mockCampaigns.length }));

      toast({
        title: "✅ Automation Complete!",
        description: `Generated ${mockCampaigns.length} campaigns for ${mockEvents.length} upcoming events.`,
      });

    } catch (error) {
      toast({
        title: "❌ Error",
        description: "Failed to run automation pipeline. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Zap className="h-8 w-8 text-primary" />
          MarCom Automation Hub
        </h1>
        <p className="text-muted-foreground mt-2">
          End-to-end automation for Adda247's Marketing Communication Department
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Historical Campaigns</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.historicalCampaigns}</div>
            <p className="text-xs text-muted-foreground">Analyzed for patterns</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verticals</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.verticalsAnalyzed}</div>
            <p className="text-xs text-muted-foreground">Active verticals</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Events</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.eventsDetected}</div>
            <p className="text-xs text-muted-foreground">Next 45 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Campaigns</CardTitle>
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.campaignsGenerated}</div>
            <p className="text-xs text-muted-foreground">Generated</p>
          </CardContent>
        </Card>
      </div>

      {/* Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle>Automation Control</CardTitle>
          <CardDescription>
            Run the complete pipeline to analyze data, detect events, and generate campaigns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button 
                onClick={runAutomation} 
                disabled={isRunning}
                className="flex items-center gap-2"
              >
                {isRunning ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                {isRunning ? 'Running...' : 'Run Full Pipeline'}
              </Button>
              <Button variant="outline" disabled>
                <Pause className="h-4 w-4 mr-2" />
                Schedule
              </Button>
              <Button variant="outline" disabled>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>

            {isRunning && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="events" className="space-y-4">
        <TabsList>
          <TabsTrigger value="events">Upcoming Events</TabsTrigger>
          <TabsTrigger value="campaigns">Generated Campaigns</TabsTrigger>
          <TabsTrigger value="calendar">Campaign Calendar</TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="space-y-4">
          {upcomingEvents.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                No events loaded. Run the pipeline to detect upcoming events.
              </CardContent>
            </Card>
          ) : (
            upcomingEvents.map((event, idx) => (
              <Card key={idx}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        {event.name}
                      </CardTitle>
                      <CardDescription>{event.date}</CardDescription>
                    </div>
                    <Badge variant={getUrgencyColor(event.urgency)}>
                      {event.urgency} urgency
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{event.days_until} days away</span>
                    </div>
                    <div className="flex gap-1">
                      {event.tags.map((tag, i) => (
                        <Badge key={i} variant="outline">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4">
          {generatedCampaigns.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                No campaigns generated yet. Run the pipeline to create campaigns.
              </CardContent>
            </Card>
          ) : (
            generatedCampaigns.map((campaign, idx) => (
              <Card key={idx}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge>{campaign.vertical}</Badge>
                        <Badge variant="outline">{campaign.event_name}</Badge>
                        {campaign.days_until_event <= 7 && (
                          <Badge variant="destructive">Urgent</Badge>
                        )}
                      </div>
                      <CardTitle className="text-lg">{campaign.hook}</CardTitle>
                    </div>
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {campaign.push_copy}
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">Code: {campaign.promo_code}</Badge>
                    <Badge variant="secondary">{campaign.discount}</Badge>
                    <Badge variant="outline">⏰ {campaign.scheduled_time}</Badge>
                  </div>

                  <div className="flex gap-1">
                    {campaign.personalization_tokens.map((token, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {`{{${token}}}`}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="calendar">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Calendar</CardTitle>
              <CardDescription>
                Upcoming campaigns scheduled by event date
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-8">
                Calendar view coming soon...
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

