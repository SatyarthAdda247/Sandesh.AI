// Trending campaign ideas data
// These are popular ongoing trends for exam preparation campaigns

export const TRENDING_IDEAS = [
    {
        vertical: 'Banking',
        hook: 'Big exam update just dropped!',
        channel: 'push',
        urgency: 'High' as const,
        score: 0.92,
        status: 'pending' as const,
        description: 'IBPS RRB PO exam date announcement - create urgency around preparation'
    },
    {
        vertical: 'SSC',
        hook: 'Top-scoring SSC bundle discount',
        channel: 'push',
        urgency: 'Medium' as const,
        score: 0.81,
        status: 'approved' as const,
        description: 'Limited-time discount on comprehensive SSC preparation packages'
    },
    {
        vertical: 'Railway',
        hook: 'Railway mock test marathon',
        channel: 'push',
        urgency: 'Low' as const,
        score: 0.73,
        status: 'pending' as const,
        description: 'Marathon mock test series for Railway exam preparation'
    },
    {
        vertical: 'UPSC',
        hook: 'UPSC Prelims countdown begins!',
        channel: 'push',
        urgency: 'High' as const,
        score: 0.89,
        status: 'pending' as const,
        description: 'Final preparation push for UPSC Prelims with expert guidance'
    },
    {
        vertical: 'SSC',
        hook: 'SSC CGL crash course alert',
        channel: 'push',
        urgency: 'High' as const,
        score: 0.87,
        status: 'approved' as const,
        description: 'Intensive crash course for SSC CGL exam - last chance enrollment'
    },
    {
        vertical: 'Banking',
        hook: 'SBI PO application deadline approaching',
        channel: 'push',
        urgency: 'High' as const,
        score: 0.94,
        status: 'pending' as const,
        description: 'Reminder about SBI PO application deadline with preparation tips'
    },
    {
        vertical: 'Teaching',
        hook: 'CTET exam pattern changed!',
        channel: 'push',
        urgency: 'Medium' as const,
        score: 0.78,
        status: 'pending' as const,
        description: 'New CTET exam pattern - updated study materials available'
    },
    {
        vertical: 'Defence',
        hook: 'NDA physical test preparation',
        channel: 'push',
        urgency: 'Medium' as const,
        score: 0.75,
        status: 'approved' as const,
        description: 'Complete guide for NDA physical fitness test preparation'
    }
];

export function getTrendingIdeas() {
    return TRENDING_IDEAS;
}

export function getTrendingIdeasByVertical(vertical: string) {
    return TRENDING_IDEAS.filter(idea =>
        idea.vertical.toLowerCase() === vertical.toLowerCase()
    );
}
