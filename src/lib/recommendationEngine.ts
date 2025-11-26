/**
 * Recommendation Engine for MarCom Automation
 * Scores and ranks push notification suggestions based on multiple factors
 */

import { getCampaignPatterns, getHooksForVertical } from './campaignPatterns';

export interface RecommendationInput {
  vertical: string;
  revenueData?: {
    totalRevenue: number;
    totalOrders: number;
    topProducts: Array<{ product: string; revenue: number; orders: number }>;
  };
  historicalPerformance?: {
    avgScore: number;
    topHooks: string[];
  };
  timeContext?: {
    dayOfWeek: string;
    isMonthEnd: boolean;
    isWeekend: boolean;
  };
}

export interface ScoredRecommendation {
  vertical: string;
  hook: string;
  pushCopy: string;
  cta: string;
  channel: string;
  urgency: 'High' | 'Medium' | 'Low';
  link: string;
  score: number;
  scoreBreakdown: {
    revenueWeight: number;
    historicalPerformance: number;
    timingBoost: number;
    verticalPriority: number;
    total: number;
  };
  reasoning: string[];
}

/**
 * Calculate revenue-based weight (0-1 scale)
 */
function calculateRevenueWeight(revenue: number, orders: number): number {
  // Higher revenue and orders = higher weight
  const revenueScore = Math.min(1, revenue / 1000000); // Cap at 10L
  const orderScore = Math.min(1, orders / 1000); // Cap at 1000 orders
  return (revenueScore * 0.6 + orderScore * 0.4);
}

/**
 * Get historical performance score for a vertical
 */
function getHistoricalScore(vertical: string): number {
  const patterns = getCampaignPatterns();
  const verticalHooks = patterns.topHooks.filter(
    (h) => h.vertical.toLowerCase().includes(vertical.toLowerCase()) ||
           vertical.toLowerCase().includes(h.vertical.toLowerCase())
  );
  
  if (verticalHooks.length === 0) return 0.5; // Default mid-score
  
  const avgScore = verticalHooks.reduce((sum, h) => sum + h.score, 0) / verticalHooks.length;
  return avgScore;
}

/**
 * Calculate timing boost based on context
 */
function getTimingBoost(timeContext?: RecommendationInput['timeContext']): number {
  if (!timeContext) return 0;
  
  let boost = 0;
  
  // Month-end campaigns tend to perform better (urgency)
  if (timeContext.isMonthEnd) boost += 0.15;
  
  // Weekday vs weekend
  if (!timeContext.isWeekend) boost += 0.05;
  
  // Specific day preferences
  if (['Monday', 'Tuesday', 'Wednesday'].includes(timeContext.dayOfWeek)) {
    boost += 0.05;
  }
  
  return Math.min(boost, 0.25); // Cap at 0.25
}

/**
 * Get vertical priority based on campaign volume
 */
function getVerticalPriority(vertical: string): number {
  const patterns = getCampaignPatterns();
  const channelCount = patterns.channelBreakdown[vertical] || 0;
  const maxCount = Math.max(...Object.values(patterns.channelBreakdown));
  
  return channelCount / maxCount; // Normalize 0-1
}

/**
 * Generate hook based on patterns and context
 */
function generateHook(input: RecommendationInput): string {
  const historicalHooks = getHooksForVertical(input.vertical, 5);
  const patterns = getCampaignPatterns();
  
  if (historicalHooks.length > 0) {
    // Select best hook based on context
    if (input.timeContext?.isMonthEnd) {
      // Prefer urgency-driven hooks for month-end
      const urgentHook = historicalHooks.find(h => 
        h.includes('⏰') || h.includes('🚨') || h.includes('Last') || h.includes('Final')
      );
      if (urgentHook) return urgentHook;
    }
    
    // Return highest scoring hook
    return historicalHooks[0];
  }
  
  // Fallback: use patterns from similar verticals
  const similarVertical = patterns.topHooks.find(h => 
    h.vertical.toLowerCase().includes(input.vertical.toLowerCase()) ||
    input.vertical.toLowerCase().includes(h.vertical.toLowerCase())
  );
  
  if (similarVertical) {
    return similarVertical.hook.replace(similarVertical.vertical, input.vertical);
  }
  
  // Last resort: generic hook
  const topProduct = input.revenueData?.topProducts[0]?.product || 'Course';
  return `🚀 ${input.vertical}: ${topProduct} Trending Now!`;
}

/**
 * Generate push copy based on context
 */
function generatePushCopy(input: RecommendationInput): string {
  const topProduct = input.revenueData?.topProducts[0];
  
  if (topProduct) {
    return `Join ${topProduct.orders}+ students! ${topProduct.product} @ Best Price. Limited time offer.`;
  }
  
  return `Complete prep for ${input.vertical} exams. Start your journey today!`;
}

/**
 * Generate CTA based on vertical and context
 */
function generateCTA(input: RecommendationInput): string {
  const commonCTAs = ['Enroll Now', 'Join Now', 'Get Started', 'Claim Offer', 'View Details'];
  
  if (input.timeContext?.isMonthEnd) {
    return 'Claim Offer';
  }
  
  return commonCTAs[0];
}

/**
 * Determine urgency based on score and context
 */
function determineUrgency(score: number, timeContext?: RecommendationInput['timeContext']): 'High' | 'Medium' | 'Low' {
  if (timeContext?.isMonthEnd || score >= 0.85) return 'High';
  if (score >= 0.7) return 'Medium';
  return 'Low';
}

/**
 * Main recommendation scoring function
 */
export function scoreRecommendation(input: RecommendationInput): ScoredRecommendation {
  const reasoning: string[] = [];
  
  // 1. Revenue Weight (40%)
  const revenueWeight = input.revenueData
    ? calculateRevenueWeight(input.revenueData.totalRevenue, input.revenueData.totalOrders)
    : 0.5;
  reasoning.push(`Revenue: ₹${input.revenueData?.totalRevenue.toLocaleString() || 0} (${(revenueWeight * 100).toFixed(0)}%)`);
  
  // 2. Historical Performance (30%)
  const historicalPerformance = getHistoricalScore(input.vertical);
  reasoning.push(`Historical avg: ${(historicalPerformance * 100).toFixed(0)}%`);
  
  // 3. Timing Boost (15%)
  const timingBoost = getTimingBoost(input.timeContext);
  if (timingBoost > 0) {
    reasoning.push(`Timing boost: +${(timingBoost * 100).toFixed(0)}%`);
  }
  
  // 4. Vertical Priority (15%)
  const verticalPriority = getVerticalPriority(input.vertical);
  reasoning.push(`Vertical priority: ${(verticalPriority * 100).toFixed(0)}%`);
  
  // Calculate total score
  const totalScore = (
    revenueWeight * 0.4 +
    historicalPerformance * 0.3 +
    timingBoost * 0.15 +
    verticalPriority * 0.15
  );
  
  const hook = generateHook(input);
  const pushCopy = generatePushCopy(input);
  const cta = generateCTA(input);
  const urgency = determineUrgency(totalScore, input.timeContext);
  
  return {
    vertical: input.vertical,
    hook,
    pushCopy,
    cta,
    channel: 'App Push',
    urgency,
    link: `https://adda247.com/${input.vertical.toLowerCase().replace(/\s+/g, '-')}`,
    score: Math.round(totalScore * 1000) / 1000,
    scoreBreakdown: {
      revenueWeight: Math.round(revenueWeight * 1000) / 1000,
      historicalPerformance: Math.round(historicalPerformance * 1000) / 1000,
      timingBoost: Math.round(timingBoost * 1000) / 1000,
      verticalPriority: Math.round(verticalPriority * 1000) / 1000,
      total: Math.round(totalScore * 1000) / 1000,
    },
    reasoning,
  };
}

/**
 * Generate recommendations for multiple verticals and rank them
 */
export function generateRecommendations(
  inputs: RecommendationInput[]
): ScoredRecommendation[] {
  const recommendations = inputs.map(scoreRecommendation);
  
  // Sort by score (highest first)
  return recommendations.sort((a, b) => b.score - a.score);
}

/**
 * Get time context for current moment
 */
export function getCurrentTimeContext(): RecommendationInput['timeContext'] {
  const now = new Date();
  const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });
  const dayOfMonth = now.getDate();
  const isMonthEnd = dayOfMonth >= 25; // Last week of month
  const isWeekend = dayOfWeek === 'Saturday' || dayOfWeek === 'Sunday';
  
  return {
    dayOfWeek,
    isMonthEnd,
    isWeekend,
  };
}

