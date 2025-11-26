import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings as SettingsIcon, Clock, Webhook } from "lucide-react";
import { toast } from "sonner";

export default function Settings() {
  const handleSaveSettings = () => {
    toast.success("Settings saved successfully");
  };

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2">Manage platform configuration</p>
      </div>

      {/* Scheduler Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <CardTitle>Scheduler</CardTitle>
          </div>
          <CardDescription>Configure daily suggestion generation time</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="schedule-time">Daily Run Time (IST)</Label>
            <Input
              id="schedule-time"
              type="time"
              defaultValue="08:00"
            />
            <p className="text-xs text-muted-foreground">
              Suggestions will be generated daily at this time
            </p>
          </div>
          <Button onClick={handleSaveSettings}>Save Schedule</Button>
        </CardContent>
      </Card>

      {/* Webhook Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Webhook className="h-5 w-5 text-primary" />
            <CardTitle>Webhook Configuration</CardTitle>
          </div>
          <CardDescription>Set up publish webhook endpoint</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="webhook-url">Webhook URL</Label>
            <Input
              id="webhook-url"
              type="url"
              placeholder="https://api.example.com/push"
            />
            <p className="text-xs text-muted-foreground">
              Published suggestions will be sent to this endpoint
            </p>
          </div>
          <Button onClick={handleSaveSettings}>Save Webhook</Button>
        </CardContent>
      </Card>

      {/* Channel Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5 text-primary" />
            <CardTitle>Push Channels</CardTitle>
          </div>
          <CardDescription>Configure available notification channels</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <input type="checkbox" id="app-push" defaultChecked className="rounded" />
            <Label htmlFor="app-push">App Push Notifications</Label>
          </div>
          <div className="flex items-center space-x-2">
            <input type="checkbox" id="whatsapp" defaultChecked className="rounded" />
            <Label htmlFor="whatsapp">WhatsApp</Label>
          </div>
          <div className="flex items-center space-x-2">
            <input type="checkbox" id="email" className="rounded" />
            <Label htmlFor="email">Email</Label>
          </div>
          <Button onClick={handleSaveSettings}>Save Channels</Button>
        </CardContent>
      </Card>
    </div>
  );
}
