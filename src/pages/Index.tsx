import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const Index = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <div className="max-w-2xl text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-5xl font-bold tracking-tight">
            Sandesh.ai
          </h1>
          <p className="text-xl text-muted-foreground">
            AI-Powered Marketing Communication Automation
          </p>
        </div>

        <div className="space-y-4">
          <p className="text-muted-foreground">
            Generate data-driven push notifications based on revenue trends, live events, and Google Trends.
            Review, edit, and publish suggestions in minutes.
          </p>
        </div>

        <div className="flex gap-4 justify-center">
          <Button size="lg" onClick={() => navigate("/auth")}>
            Get Started
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate("/auth")}>
            Sign In
          </Button>
        </div>

        <div className="pt-8 grid gap-4 md:grid-cols-3 text-sm">
          <div className="space-y-2">
            <h3 className="font-semibold">Automated Scoring</h3>
            <p className="text-muted-foreground">
              Vertical weights, event boosts, and trend analysis combined
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">Easy Review</h3>
            <p className="text-muted-foreground">
              Edit suggestions inline and approve with one click
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">Fast Publish</h3>
            <p className="text-muted-foreground">
              Webhook integration for instant push delivery
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
