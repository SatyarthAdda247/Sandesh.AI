import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar, Filter } from 'lucide-react';

interface HistoryPush {
    id: string;
    vertical: string;
    title: string;
    message: string;
    cta: string;
    date: string;
    status: string;
}

export default function CampaignHistory() {
    const [pushes, setPushes] = useState<HistoryPush[]>([]);
    const [selectedVertical, setSelectedVertical] = useState<string>('all');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPushHistory();
    }, []);

    const fetchPushHistory = async () => {
        try {
            setLoading(true);
            // Fetch from Google Sheets
            const SHEET_ID = '1SrKyVoOeldvL4PYQWq8X3pL-BGW6SweZ7y0l0Unrn8k';
            const API_KEY = 'AIzaSyA7Ue38eVLxAZpeosiAeZGlAgLnL28Hb6Y';
            const response = await fetch(
                `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Sheet1?key=${API_KEY}`
            );

            const data = await response.json();

            if (data.values && data.values.length > 1) {
                // Skip header row
                const rows = data.values.slice(1);
                const formattedPushes: HistoryPush[] = rows.map((row: any[]) => ({
                    id: row[0] || '',
                    vertical: extractVerticalFromId(row[0] || ''),
                    title: row[6] || '', // Message title column
                    message: row[4] || '', // Message column
                    cta: row[7] || '', // CTA column
                    date: new Date().toISOString().split('T')[0], // Current date as placeholder
                    status: 'sent'
                }));

                setPushes(formattedPushes);
            }
        } catch (error) {
            console.error('Error fetching push history:', error);
        } finally {
            setLoading(false);
        }
    };

    const extractVerticalFromId = (id: string): string => {
        // Extract vertical from ID like "BANKING1" -> "BANKING"
        return id.replace(/\d+$/, '').replace(/_/g, ' ');
    };

    const filteredPushes = selectedVertical === 'all'
        ? pushes
        : pushes.filter(p => p.vertical === selectedVertical);

    const uniqueVerticals = Array.from(new Set(pushes.map(p => p.vertical))).filter(Boolean);

    return (
        <div className="space-y-6 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Campaign History</h2>
                    <p className="text-muted-foreground">View all past push notifications</p>
                </div>

                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-muted-foreground" />
                    <Select value={selectedVertical} onValueChange={setSelectedVertical}>
                        <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Filter by vertical" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Verticals</SelectItem>
                            {uniqueVerticals.map(vertical => (
                                <SelectItem key={vertical} value={vertical}>
                                    {vertical}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12">
                    <p className="text-muted-foreground">Loading push history...</p>
                </div>
            ) : filteredPushes.length === 0 ? (
                <div className="text-center py-12">
                    <p className="text-muted-foreground">No pushes found</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {filteredPushes.map((push, index) => (
                        <Card key={index} className="p-4 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between">
                                <div className="flex-1 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline">{push.vertical}</Badge>
                                        <Badge variant="secondary">{push.status}</Badge>
                                    </div>

                                    <h3 className="font-semibold text-lg">{push.title}</h3>

                                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                        {push.message}
                                    </p>

                                    {push.cta && (
                                        <div className="pt-2">
                                            <Badge className="bg-blue-500">{push.cta}</Badge>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Calendar className="w-3 h-3" />
                                    {push.date}
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
