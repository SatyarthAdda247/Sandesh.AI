import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Calendar, FileText } from "lucide-react";

// Mock data for push history
const mockPushHistory = [
    {
        id: "1",
        vertical: "Banking",
        campaign: "Bank Mahapack - Flash Sale",
        title: "🎯 Flash Sale Alert!",
        message: "Exclusive Banking Test Series at unbeatable prices!",
        cta: "Grab Now!",
        pushedAt: "2025-11-28 14:30",
        status: "Sent",
        count: 15234
    },
    {
        id: "2",
        vertical: "SSC",
        campaign: "SSC CGL - Last Day Offer",
        title: "⏰ Last Day to Enroll!",
        message: "SSC CGL Complete Course - Don't miss out!",
        cta: "Enroll Now",
        pushedAt: "2025-11-28 12:15",
        status: "Sent",
        count: 23456
    },
    {
        id: "3",
        vertical: "Railway",
        campaign: "Railway NTPC - Mock Test",
        title: "📝 Free Mock Test Available",
        message: "Test your preparation with our comprehensive mock test",
        cta: "Start Test",
        pushedAt: "2025-11-28 10:00",
        status: "Sent",
        count: 18765
    },
    {
        id: "4",
        vertical: "UPSC",
        campaign: "UPSC Prelims - 60 Days Left",
        title: "🚀 Prelims Countdown Begins!",
        message: "Intensive preparation strategy for last 60 days",
        cta: "Join Now",
        pushedAt: "2025-11-27 16:45",
        status: "Sent",
        count: 12345
    },
    {
        id: "5",
        vertical: "Banking",
        campaign: "IBPS PO - Registration Open",
        title: "📢 IBPS PO Notification Out!",
        message: "Start your preparation with expert guidance",
        cta: "Apply Now",
        pushedAt: "2025-11-27 14:20",
        status: "Sent",
        count: 19876
    },
    {
        id: "6",
        vertical: "SSC",
        campaign: "SSC CHSL - Crash Course",
        title: "⚡ Intensive Crash Course",
        message: "Complete SSC CHSL preparation in 30 days",
        cta: "Enroll Today",
        pushedAt: "2025-11-27 11:30",
        status: "Sent",
        count: 16543
    },
    {
        id: "7",
        vertical: "Defence",
        campaign: "NDA - Admit Card Released",
        title: "🎫 NDA Admit Card Out!",
        message: "Download your admit card and check exam details",
        cta: "Download Now",
        pushedAt: "2025-11-26 15:00",
        status: "Sent",
        count: 14321
    },
    {
        id: "8",
        vertical: "Teaching",
        campaign: "CTET - Registration Closing",
        title: "⏳ Last 2 Days to Register!",
        message: "CTET registration closing soon - Apply now",
        cta: "Register",
        pushedAt: "2025-11-26 13:45",
        status: "Sent",
        count: 11234
    }
];

const verticals = ["All", "Banking", "SSC", "Railway", "UPSC", "Defence", "Teaching"];

export default function History() {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedVertical, setSelectedVertical] = useState("All");

    const filteredHistory = mockPushHistory.filter((item) => {
        const matchesSearch =
            item.campaign.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.message.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesVertical = selectedVertical === "All" || item.vertical === selectedVertical;

        return matchesSearch && matchesVertical;
    });

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Push History</h1>
                    <p className="text-muted-foreground mt-1">
                        View all campaigns pushed to Google Sheets across all verticals
                    </p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                        <div>
                            <CardTitle>Campaign Push History</CardTitle>
                            <CardDescription>
                                {filteredHistory.length} campaigns found
                            </CardDescription>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                            <div className="relative flex-1 md:w-64">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search campaigns..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9"
                                />
                            </div>

                            <Select value={selectedVertical} onValueChange={setSelectedVertical}>
                                <SelectTrigger className="w-full sm:w-40">
                                    <SelectValue placeholder="Filter by vertical" />
                                </SelectTrigger>
                                <SelectContent>
                                    {verticals.map((vertical) => (
                                        <SelectItem key={vertical} value={vertical}>
                                            {vertical}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>

                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Vertical</TableHead>
                                    <TableHead>Campaign</TableHead>
                                    <TableHead>Title</TableHead>
                                    <TableHead>Message</TableHead>
                                    <TableHead>CTA</TableHead>
                                    <TableHead>Pushed At</TableHead>
                                    <TableHead className="text-right">Count</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredHistory.length > 0 ? (
                                    filteredHistory.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell>
                                                <Badge variant="outline">{item.vertical}</Badge>
                                            </TableCell>
                                            <TableCell className="font-medium">{item.campaign}</TableCell>
                                            <TableCell className="max-w-xs truncate">{item.title}</TableCell>
                                            <TableCell className="max-w-md truncate text-muted-foreground">
                                                {item.message}
                                            </TableCell>
                                            <TableCell>
                                                <Badge>{item.cta}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <Calendar className="h-3 w-3" />
                                                    {item.pushedAt}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                {item.count.toLocaleString()}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className="bg-green-100 text-green-800">
                                                    {item.status}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                            No campaigns found matching your criteria
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
