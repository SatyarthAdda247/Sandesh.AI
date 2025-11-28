import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, CheckCircle, Clock } from "lucide-react";

interface PopularIdea {
    vertical: string;
    hook: string;
    channel: string;
    urgency: 'High' | 'Medium' | 'Low';
    score: number;
    status: 'pending' | 'approved';
    description: string;
}

interface PopularIdeasProps {
    ideas: PopularIdea[];
    onSelectIdea: (idea: PopularIdea) => void;
}

export function PopularIdeas({ ideas, onSelectIdea }: PopularIdeasProps) {
    const getUrgencyColor = (urgency: string) => {
        switch (urgency) {
            case 'High': return 'bg-red-500';
            case 'Medium': return 'bg-blue-500';
            case 'Low': return 'bg-gray-400';
            default: return 'bg-gray-400';
        }
    };

    return (
        <Card className="border-0 shadow-lg">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">Today's Popular Ideas</CardTitle>
                    </div>
                    <Badge variant="outline" className="text-xs">
                        {ideas.length} suggestions
                    </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                    Popular ongoing campaigns for generation
                </p>
            </CardHeader>
            <CardContent className="space-y-3">
                {ideas.map((idea, index) => (
                    <div
                        key={index}
                        className="group p-4 rounded-lg border bg-card hover:bg-accent/50 transition-all cursor-pointer"
                        onClick={() => onSelectIdea(idea)}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-2">
                                    <Badge variant="secondary" className="text-xs">
                                        {idea.vertical}
                                    </Badge>
                                    <Badge className={`${getUrgencyColor(idea.urgency)} text-white text-xs`}>
                                        {idea.urgency}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                        Score: {idea.score.toFixed(2)}
                                    </span>
                                </div>
                                <h4 className="font-semibold text-sm group-hover:text-primary transition-colors">
                                    {idea.hook}
                                </h4>
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                    {idea.description}
                                </p>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                {idea.status === 'approved' ? (
                                    <Badge variant="outline" className="text-green-600 border-green-600">
                                        <CheckCircle className="h-3 w-3 mr-1" />
                                        Approved
                                    </Badge>
                                ) : (
                                    <Badge variant="outline" className="text-amber-600 border-amber-600">
                                        <Clock className="h-3 w-3 mr-1" />
                                        Pending
                                    </Badge>
                                )}
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    Use Idea →
                                </Button>
                            </div>
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}
