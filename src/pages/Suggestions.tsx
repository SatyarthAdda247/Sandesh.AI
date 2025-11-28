import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit, Send, Check, Trash2, Clock, Tag, Code, Users, ShieldCheck, StickyNote, TrendingUp, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Suggestion {
  id: string;
  vertical_id?: string;
  suggestion_date: string;
  hook: string;
  push_copy: string;
  cta: string;
  channel: string;
  urgency: string;
  link: string;
  score: number;
  status: string;
  verticals: { name: string };
  promo_code?: string;
  discount?: string;
  scheduled_time?: string;
  contact_number?: string;
  personalization_tokens?: string[];
  user_count?: number;
  trend_context?: {
    title?: string;
    emoji?: string;
    rationale?: string;
    tags?: string[];
  } | null;
  insta_rationale?: string | null;
  proof_state?: string | null;
  proof_owner?: string | null;
  proof_notes?: string | null;
  lint_report?: {
    issues?: { severity: string; message: string; suggestion?: string }[];
    emojis_found?: number;
    length?: number;
  } | null;
}

const PROOF_STATES = [
  { value: "unreviewed", label: "Unreviewed" },
  { value: "reviewing", label: "Reviewing" },
  { value: "done", label: "Done" },
];

export default function Suggestions() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [verticals, setVerticals] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewDetailsId, setViewDetailsId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    hook: "",
    push_copy: "",
    cta: "",
    link: "",
  });
  const [proofNotes, setProofNotes] = useState<Record<string, string>>({});
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([loadSuggestions(), loadVerticals()]).finally(() => { });
  }, []);

  const loadVerticals = async () => {
    try {
      const { data, error } = await supabase.from("verticals").select("*");
      if (error) throw error;
      setVerticals(data || []);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const loadSuggestions = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("suggestions")
        .select("*, verticals(name)")
        .eq("suggestion_date", today)
        .order("score", { ascending: false });

      if (error) throw error;
      setSuggestions(data || []);
      const notes: Record<string, string> = {};
      (data || []).forEach((s) => {
        notes[s.id] = s.proof_notes || "";
      });
      setProofNotes(notes);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (suggestion: Suggestion) => {
    setEditingId(suggestion.id);
    setEditForm({
      hook: suggestion.hook,
      push_copy: suggestion.push_copy,
      cta: suggestion.cta,
      link: suggestion.link,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;

    try {
      const { error } = await supabase
        .from("suggestions")
        .update(editForm)
        .eq("id", editingId);

      if (error) throw error;

      toast.success("Suggestion updated");
      setEditingId(null);
      loadSuggestions();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const { error } = await supabase
        .from("suggestions")
        .update({ status: "approved", approved_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;

      toast.success("Suggestion approved");
      loadSuggestions();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleProofStateChange = async (id: string, state: string) => {
    try {
      const reviewer = user?.email || user?.user_metadata?.full_name || "offline-reviewer";
      const { error } = await supabase
        .from("suggestions")
        .update({ proof_state: state, proof_owner: reviewer })
        .eq("id", id);

      if (error) throw error;
      setSuggestions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, proof_state: state, proof_owner: reviewer } : s))
      );
      toast.success("Proof state updated");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleSaveProofNote = async (id: string) => {
    try {
      const note = proofNotes[id] ?? "";
      const { error } = await supabase
        .from("suggestions")
        .update({ proof_notes: note })
        .eq("id", id);
      if (error) throw error;
      setSuggestions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, proof_notes: note } : s))
      );
      toast.success("Proof note saved");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handlePublish = async (id: string) => {
    try {
      // Mock webhook publish
      const suggestion = suggestions.find((s) => s.id === id);
      const payload = {
        hook: suggestion?.hook,
        push_copy: suggestion?.push_copy,
        cta: suggestion?.cta,
        link: suggestion?.link,
      };

      const { error } = await supabase
        .from("suggestions")
        .update({
          status: "published",
          published_at: new Date().toISOString(),
          publish_payload: payload,
        })
        .eq("id", id);

      if (error) throw error;

      toast.success("Suggestion published");
      loadSuggestions();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;

    try {
      const { error } = await supabase
        .from("suggestions")
        .delete()
        .eq("id", deletingId);

      if (error) throw error;

      toast.success("Suggestion deleted");
      setDeletingId(null);
      loadSuggestions();
    } catch (error: any) {
      toast.error(error.message);
    }
  };



  const getUrgencyColor = (urgency: string) => {
    switch (urgency.toLowerCase()) {
      case "high":
        return "destructive";
      case "medium":
        return "default";
      default:
        return "secondary";
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
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Suggestions</h1>
          <p className="text-muted-foreground mt-2">Review and publish push notifications based on real events</p>
        </div>
        <Button
          onClick={async () => {
            setRefreshing(true);
            try {
              const response = await fetch('http://localhost:8787/edtech-events');
              const data = await response.json();
              setUpcomingEvents(data.events);
              toast.success(`Refreshed! Found ${data.events.length} upcoming events`);
              // Optionally show a preview of events
              const topEvents = data.events.slice(0, 3).map((e: any) => `${e.emoji} ${e.title}`).join(', ');
              toast.info(`Upcoming: ${topEvents}...`);
            } catch (error) {
              toast.error('Failed to refresh events. Make sure the Python service is running.');
              setUpcomingEvents([]);
            } finally {
              setRefreshing(false);
            }
          }}
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh Events
        </Button>
      </div>

      {/* Upcoming Events Section */}
      {upcomingEvents.length > 0 && (
        <Card className="border-primary/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <CardTitle>Popular & Exam Events</CardTitle>
              </div>
              <Badge variant="outline">{upcomingEvents.length} events</Badge>
            </div>
            <CardDescription>
              Real exam announcements, result dates, and trending events for campaigns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcomingEvents.slice(0, 12).map((event, index) => (
                <div
                  key={index}
                  className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-all"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{event.emoji}</span>
                        <div>
                          <h4 className="font-semibold text-sm">{event.title}</h4>
                          <p className="text-xs text-muted-foreground">
                            {new Date(event.date).toLocaleDateString('en-IN', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {event.days_until}d
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {event.relevance}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="outline" className="text-xs">
                        {event.category}
                      </Badge>
                      {event.verticals.slice(0, 2).map((vertical: string, i: number) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {vertical}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {upcomingEvents.length > 12 && (
              <p className="text-center text-sm text-muted-foreground mt-4">
                Showing 12 of {upcomingEvents.length} events
              </p>
            )}
          </CardContent>
        </Card>
      )}



      {/* Edit Dialog */}
      <Dialog open={!!editingId} onOpenChange={() => setEditingId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Suggestion</DialogTitle>
            <DialogDescription>Update the push notification content</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="hook">Hook</Label>
              <Input
                id="hook"
                value={editForm.hook}
                onChange={(e) => setEditForm({ ...editForm, hook: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="push_copy">Push Copy</Label>
              <Textarea
                id="push_copy"
                value={editForm.push_copy}
                onChange={(e) => setEditForm({ ...editForm, push_copy: e.target.value })}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cta">CTA</Label>
              <Input
                id="cta"
                value={editForm.cta}
                onChange={(e) => setEditForm({ ...editForm, cta: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="link">Link</Label>
              <Input
                id="link"
                value={editForm.link}
                onChange={(e) => setEditForm({ ...editForm, link: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingId(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>



      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Suggestion?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the suggestion.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Details Dialog */}
      <Dialog open={!!viewDetailsId} onOpenChange={() => setViewDetailsId(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Campaign Details</DialogTitle>
            <DialogDescription>Complete information about this campaign</DialogDescription>
          </DialogHeader>
          {viewDetailsId && (() => {
            const suggestion = suggestions.find(s => s.id === viewDetailsId);
            if (!suggestion) return null;

            return (
              <div className="space-y-6 py-4">
                {/* Main Content */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Vertical</Label>
                    <Badge variant="outline" className="text-base">{suggestion.verticals?.name}</Badge>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Hook</Label>
                    <p className="text-lg font-medium">{suggestion.hook}</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Push Copy</Label>
                    <p className="text-sm whitespace-pre-wrap bg-muted p-3 rounded-md">{suggestion.push_copy}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">CTA</Label>
                      <p className="text-sm">{suggestion.cta}</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Channel</Label>
                      <Badge>{suggestion.channel}</Badge>
                    </div>
                  </div>
                </div>

                {(suggestion.trend_context || suggestion.insta_rationale) && (
                  <div className="border-t pt-4 space-y-3">
                    <Label className="text-sm font-semibold flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      Trend Context
                    </Label>
                    <div className="space-y-2">
                      {suggestion.trend_context && (
                        <div className="p-3 rounded border bg-muted/50">
                          <p className="text-sm font-semibold">
                            {suggestion.trend_context.emoji} {suggestion.trend_context.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {suggestion.trend_context.rationale}
                          </p>
                          {suggestion.trend_context.tags && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {suggestion.trend_context.tags.map((tag: string) => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  #{tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      {suggestion.insta_rationale && (
                        <p className="text-xs text-muted-foreground">
                          Stakeholder note: {suggestion.insta_rationale}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Offer Details */}
                {(suggestion.promo_code || suggestion.discount || suggestion.contact_number) && (
                  <div className="border-t pt-4 space-y-3">
                    <Label className="text-sm font-semibold">Offer Details</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {suggestion.promo_code && (
                        <div className="flex items-center gap-2 bg-muted p-2 rounded">
                          <Tag className="h-4 w-4" />
                          <div>
                            <p className="text-xs text-muted-foreground">Promo Code</p>
                            <p className="font-mono font-semibold">{suggestion.promo_code}</p>
                          </div>
                        </div>
                      )}
                      {suggestion.discount && (
                        <div className="flex items-center gap-2 bg-muted p-2 rounded">
                          <Badge variant="secondary">{suggestion.discount}% Off</Badge>
                        </div>
                      )}
                      {suggestion.contact_number && (
                        <div className="flex items-center gap-2 bg-muted p-2 rounded">
                          <div>
                            <p className="text-xs text-muted-foreground">Contact</p>
                            <p className="font-semibold">{suggestion.contact_number}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Scheduling */}
                <div className="border-t pt-4 space-y-3">
                  <Label className="text-sm font-semibold">Campaign Info</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {suggestion.scheduled_time && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Scheduled Time</p>
                          <p className="text-sm font-medium">{suggestion.scheduled_time}</p>
                        </div>
                      </div>
                    )}
                    {suggestion.user_count && (
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">User Count</p>
                          <p className="text-sm font-medium">{suggestion.user_count.toLocaleString()}</p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Score</p>
                        <p className="text-sm font-medium">{suggestion.score.toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Urgency</p>
                        <Badge variant={getUrgencyColor(suggestion.urgency)}>{suggestion.urgency}</Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {suggestion.lint_report && (
                  <div className="border-t pt-4 space-y-2">
                    <Label className="text-sm font-semibold flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      Lint Summary
                    </Label>
                    <div className="bg-muted/40 rounded p-3 space-y-2 max-h-40 overflow-y-auto">
                      {(suggestion.lint_report.issues || []).map((issue, idx) => (
                        <div key={idx} className="text-xs">
                          <span className="font-semibold">{issue.severity.toUpperCase()}:</span>{" "}
                          {issue.message}
                          {issue.suggestion && (
                            <span className="block text-muted-foreground">{issue.suggestion}</span>
                          )}
                        </div>
                      ))}
                      {(!suggestion.lint_report.issues || suggestion.lint_report.issues.length === 0) && (
                        <p className="text-xs text-muted-foreground">No lint issues stored.</p>
                      )}
                      <p className="text-[11px] text-muted-foreground border-t pt-1">
                        {suggestion.lint_report.length || 0} chars • {suggestion.lint_report.emojis_found || 0} emojis
                      </p>
                    </div>
                  </div>
                )}

                <div className="border-t pt-4 space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <StickyNote className="h-4 w-4 text-violet-500" />
                    Proof Notes
                  </Label>
                  <Textarea
                    value={proofNotes[suggestion.id] ?? ""}
                    onChange={(e) =>
                      setProofNotes((prev) => ({ ...prev, [suggestion.id]: e.target.value }))
                    }
                    rows={3}
                    placeholder="Add reviewer comments or blockers..."
                  />
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      onClick={() => handleSaveProofNote(suggestion.id)}
                    >
                      Save Note
                    </Button>
                  </div>
                  {suggestion.proof_owner && (
                    <p className="text-[11px] text-muted-foreground">
                      Owned by {suggestion.proof_owner}
                    </p>
                  )}
                </div>

                {/* Personalization Tokens */}
                {suggestion.personalization_tokens && suggestion.personalization_tokens.length > 0 && (
                  <div className="border-t pt-4 space-y-3">
                    <Label className="text-sm font-semibold">Personalization Tokens</Label>
                    <div className="flex flex-wrap gap-2">
                      {suggestion.personalization_tokens.map((token, idx) => (
                        <Badge key={idx} variant="outline" className="font-mono">
                          {`{{${token}}}`}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Link */}
                {suggestion.link && (
                  <div className="border-t pt-4 space-y-2">
                    <Label className="text-sm font-semibold">Link</Label>
                    <a
                      href={suggestion.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline break-all"
                    >
                      {suggestion.link}
                    </a>
                  </div>
                )}
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDetailsId(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
