/**
 * Pre-analyzed campaign patterns from historical .xlsx files
 * Auto-generated from analyze-xlsx script
 */

import analysisReport from '../../analysis-report.json';

export interface CampaignPatterns {
  topHooks: Array<{ hook: string; vertical: string; score: number }>;
  channelBreakdown: Record<string, number>;
  verticals: string[];
  totalCampaigns: number;
}

export function getCampaignPatterns(): CampaignPatterns {
  return {
    topHooks: analysisReport.campaignPatterns.topHooks,
    channelBreakdown: analysisReport.campaignPatterns.channelBreakdown,
    verticals: analysisReport.verticals,
    totalCampaigns: analysisReport.totalCampaigns,
  };
}

/**
 * Get top hooks for a specific vertical
 */
export function getHooksForVertical(vertical: string, limit = 5): string[] {
  const normalized = vertical.toLowerCase().trim();
  return analysisReport.campaignPatterns.topHooks
    .filter((h) => h.vertical.toLowerCase().includes(normalized) || normalized.includes(h.vertical.toLowerCase()))
    .slice(0, limit)
    .map((h) => h.hook);
}

/**
 * Get channel preference for a vertical
 */
export function getChannelForVertical(vertical: string): string {
  const normalized = vertical.toLowerCase().trim();
  const entries = Object.entries(analysisReport.campaignPatterns.channelBreakdown);
  
  for (const [channel, _count] of entries) {
    if (channel.toLowerCase().includes(normalized) || normalized.includes(channel.toLowerCase())) {
      return channel;
    }
  }
  
  return "App Push";
}

