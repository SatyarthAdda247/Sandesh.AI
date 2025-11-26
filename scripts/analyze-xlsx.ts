/**
 * Analyzer script for existing .xlsx files in MarCom Automation folder.
 * Parses Revenue Campaign and Revenue Sheet files and extracts insights.
 */

import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

interface CampaignRecord {
  date?: string;
  vertical?: string;
  hook?: string;
  offer?: string;
  pushCopy?: string;
  cta?: string;
  channel?: string;
  urgency?: string;
  link?: string;
  score?: number;
  status?: string;
  [key: string]: any;
}

interface RevenueRecord {
  date?: string;
  vertical?: string;
  product?: string;
  orders?: number;
  revenue?: number;
  courseType?: string;
  source?: string;
  offerDiscount?: string;
}

interface AnalysisReport {
  totalCampaigns: number;
  totalRevenue: number;
  verticals: string[];
  campaignPatterns: {
    topHooks: Array<{ hook: string; vertical: string; score?: number }>;
    commonCTAs: Record<string, number>;
    urgencyBreakdown: Record<string, number>;
    channelBreakdown: Record<string, number>;
  };
  revenueInsights: {
    byVertical: Record<string, { revenue: number; orders: number; topProducts: string[] }>;
    totalOrders: number;
    avgRevenuePerOrder: number;
  };
}

function normalizeKey(key: string): string {
  return key
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '');
}

function parseCampaignRow(row: any): CampaignRecord | null {
  const normalized: CampaignRecord = {};
  
  // Specific mapping for Revenue Campaign sheets format
  if (row['Category']) normalized.vertical = String(row['Category'] || '').trim();
  if (row['TE']) normalized.hook = String(row['TE'] || '').trim();
  if (row['DE']) normalized.pushCopy = String(row['DE'] || '').trim();
  if (row['Link']) normalized.link = String(row['Link'] || '').trim();
  if (row['Title']) normalized.offer = String(row['Title'] || '').trim();
  if (row['Final Link']) normalized.channel = String(row['Final Link'] || '').trim();
  if (row['__EMPTY']) {
    const scoreVal = parseFloat(String(row['__EMPTY'] || ''));
    if (!isNaN(scoreVal)) {
      normalized.score = scoreVal;
    }
  }
  if (row['ug']) {
    const dateNum = parseInt(String(row['ug'] || ''));
    if (!isNaN(dateNum) && dateNum > 40000) {
      // Excel date serial to JS date
      const excelEpoch = new Date(1899, 11, 30);
      const date = new Date(excelEpoch.getTime() + dateNum * 86400000);
      normalized.date = date.toISOString().split('T')[0];
    }
  }

  // Fallback: generic parsing for other formats
  const keys = Object.keys(row);
  for (const key of keys) {
    const nk = normalizeKey(key);
    const val = row[key];

    if (!normalized.date && (nk.includes('date') || nk.includes('day'))) {
      normalized.date = String(val || '');
    }
    if (!normalized.vertical && nk.includes('vertical')) {
      normalized.vertical = String(val || '');
    }
    if (!normalized.hook && (nk.includes('hook') || nk.includes('headline'))) {
      normalized.hook = String(val || '');
    }
    if (!normalized.cta && (nk === 'cta' || nk.includes('calltoaction'))) {
      normalized.cta = String(val || '');
    }
    if (!normalized.urgency && (nk.includes('urgency') || nk.includes('priority'))) {
      normalized.urgency = String(val || '');
    }
    if (!normalized.status && nk.includes('status')) {
      normalized.status = String(val || '');
    }
  }

  // Clean up vertical names
  if (normalized.vertical) {
    normalized.vertical = normalized.vertical
      .replace(/\d+/g, '') // remove trailing numbers
      .replace(/_/g, ' ')
      .trim();
  }

  // Only return if we have meaningful data
  if (normalized.hook || normalized.pushCopy || normalized.vertical) {
    return normalized;
  }
  return null;
}

function parseRevenueRow(row: any): RevenueRecord | null {
  const normalized: RevenueRecord = {};
  const keys = Object.keys(row);

  for (const key of keys) {
    const nk = normalizeKey(key);
    const val = row[key];

    if (nk.includes('date') || nk.includes('day')) {
      normalized.date = String(val || '');
    } else if (nk.includes('vertical')) {
      normalized.vertical = String(val || '');
    } else if (nk.includes('product') || nk.includes('name')) {
      normalized.product = String(val || '');
    } else if (nk.includes('order')) {
      const orders = parseInt(String(val || '0'));
      if (!isNaN(orders)) {
        normalized.orders = orders;
      }
    } else if (nk.includes('revenue') || nk.includes('amount')) {
      const revenue = parseFloat(String(val || '0'));
      if (!isNaN(revenue)) {
        normalized.revenue = revenue;
      }
    } else if (nk.includes('course') && nk.includes('type')) {
      normalized.courseType = String(val || '');
    } else if (nk === 'source') {
      normalized.source = String(val || '');
    } else if (nk.includes('offer') || nk.includes('discount')) {
      normalized.offerDiscount = String(val || '');
    }
  }

  if (normalized.vertical && (normalized.revenue || normalized.orders)) {
    return normalized;
  }
  return null;
}

function analyzeExcelFile(filePath: string): {
  campaigns: CampaignRecord[];
  revenue: RevenueRecord[];
  type: 'campaign' | 'revenue';
} {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet);

  const campaigns: CampaignRecord[] = [];
  const revenue: RevenueRecord[] = [];

  // Detect type based on filename
  const fileName = path.basename(filePath).toLowerCase();
  const isCampaign = fileName.includes('campaign');

  for (const row of data) {
    if (isCampaign) {
      const campaign = parseCampaignRow(row);
      if (campaign) campaigns.push(campaign);
    } else {
      const rev = parseRevenueRow(row);
      if (rev) revenue.push(rev);
    }
  }

  return {
    campaigns,
    revenue,
    type: isCampaign ? 'campaign' : 'revenue',
  };
}

function generateReport(allCampaigns: CampaignRecord[], allRevenue: RevenueRecord[]): AnalysisReport {
  const report: AnalysisReport = {
    totalCampaigns: allCampaigns.length,
    totalRevenue: 0,
    verticals: [],
    campaignPatterns: {
      topHooks: [],
      commonCTAs: {},
      urgencyBreakdown: {},
      channelBreakdown: {},
    },
    revenueInsights: {
      byVertical: {},
      totalOrders: 0,
      avgRevenuePerOrder: 0,
    },
  };

  const verticalSet = new Set<string>();

  // Analyze campaigns
  const hooksWithScore: Array<{ hook: string; vertical: string; score: number }> = [];

  for (const campaign of allCampaigns) {
    if (campaign.vertical) verticalSet.add(campaign.vertical);

    if (campaign.hook) {
      hooksWithScore.push({
        hook: campaign.hook,
        vertical: campaign.vertical || 'Unknown',
        score: campaign.score || 0,
      });
    }

    if (campaign.cta) {
      report.campaignPatterns.commonCTAs[campaign.cta] =
        (report.campaignPatterns.commonCTAs[campaign.cta] || 0) + 1;
    }

    if (campaign.urgency) {
      report.campaignPatterns.urgencyBreakdown[campaign.urgency] =
        (report.campaignPatterns.urgencyBreakdown[campaign.urgency] || 0) + 1;
    }

    if (campaign.channel) {
      report.campaignPatterns.channelBreakdown[campaign.channel] =
        (report.campaignPatterns.channelBreakdown[campaign.channel] || 0) + 1;
    }
  }

  report.campaignPatterns.topHooks = hooksWithScore.sort((a, b) => b.score - a.score).slice(0, 20);

  // Analyze revenue
  for (const rev of allRevenue) {
    if (rev.vertical) verticalSet.add(rev.vertical);

    const vertical = rev.vertical || 'Unknown';
    if (!report.revenueInsights.byVertical[vertical]) {
      report.revenueInsights.byVertical[vertical] = {
        revenue: 0,
        orders: 0,
        topProducts: [],
      };
    }

    report.revenueInsights.byVertical[vertical].revenue += rev.revenue || 0;
    report.revenueInsights.byVertical[vertical].orders += rev.orders || 0;

    report.totalRevenue += rev.revenue || 0;
    report.revenueInsights.totalOrders += rev.orders || 0;

    if (rev.product && !report.revenueInsights.byVertical[vertical].topProducts.includes(rev.product)) {
      report.revenueInsights.byVertical[vertical].topProducts.push(rev.product);
    }
  }

  report.verticals = Array.from(verticalSet);
  report.revenueInsights.avgRevenuePerOrder =
    report.revenueInsights.totalOrders > 0
      ? report.totalRevenue / report.revenueInsights.totalOrders
      : 0;

  // Limit top products to 5 per vertical
  for (const vertical of Object.keys(report.revenueInsights.byVertical)) {
    report.revenueInsights.byVertical[vertical].topProducts =
      report.revenueInsights.byVertical[vertical].topProducts.slice(0, 5);
  }

  return report;
}

async function main() {
  const baseDir = path.resolve(process.cwd(), '../');
  const xlsxFiles = [
    'JULY REVENUE CAMPAIGNS 2025.xlsx',
    'AUGUST REVENUE CAMPAIGNS 2025.xlsx',
    'SEPTEMBER REVENUE SHEET 2025.xlsx',
    'OCTOBER REVENUE SHEET 2025.xlsx',
    'NOVEMBER REVENUE SHEET 2025.xlsx',
  ];

  const allCampaigns: CampaignRecord[] = [];
  const allRevenue: RevenueRecord[] = [];

  console.log('🔍 Analyzing .xlsx files from MarCom Automation folder...\n');

  for (const fileName of xlsxFiles) {
    const filePath = path.join(baseDir, fileName);
    
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️  File not found: ${fileName}`);
      continue;
    }

    console.log(`📊 Processing: ${fileName}`);
    const result = analyzeExcelFile(filePath);
    
    console.log(`   Type: ${result.type}`);
    console.log(`   Campaigns: ${result.campaigns.length}`);
    console.log(`   Revenue Records: ${result.revenue.length}\n`);

    allCampaigns.push(...result.campaigns);
    allRevenue.push(...result.revenue);
  }

  console.log('📈 Generating analysis report...\n');
  const report = generateReport(allCampaigns, allRevenue);

  console.log('═══════════════════════════════════════════════════════');
  console.log('                    ANALYSIS REPORT                     ');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log(`📋 Total Campaigns Analyzed: ${report.totalCampaigns}`);
  console.log(`💰 Total Revenue: ₹${report.totalRevenue.toLocaleString()}`);
  console.log(`📦 Total Orders: ${report.revenueInsights.totalOrders.toLocaleString()}`);
  console.log(`💵 Avg Revenue per Order: ₹${report.revenueInsights.avgRevenuePerOrder.toFixed(2)}`);
  console.log(`🎯 Verticals: ${report.verticals.join(', ')}\n`);

  console.log('🏆 TOP 10 PERFORMING HOOKS:');
  report.campaignPatterns.topHooks.slice(0, 10).forEach((h, i) => {
    console.log(`  ${i + 1}. [${h.vertical}] ${h.hook.substring(0, 80)}${h.hook.length > 80 ? '...' : ''}`);
    console.log(`     Score: ${h.score.toFixed(2)}\n`);
  });

  console.log('📢 COMMON CTAs:');
  Object.entries(report.campaignPatterns.commonCTAs)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([cta, count]) => {
      console.log(`  "${cta}": ${count} times`);
    });

  console.log('\n🚨 URGENCY BREAKDOWN:');
  Object.entries(report.campaignPatterns.urgencyBreakdown).forEach(([urgency, count]) => {
    console.log(`  ${urgency}: ${count}`);
  });

  console.log('\n📱 CHANNEL BREAKDOWN:');
  Object.entries(report.campaignPatterns.channelBreakdown).forEach(([channel, count]) => {
    console.log(`  ${channel}: ${count}`);
  });

  console.log('\n💼 REVENUE BY VERTICAL:');
  Object.entries(report.revenueInsights.byVertical)
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .forEach(([vertical, data]) => {
      console.log(`  ${vertical}:`);
      console.log(`    Revenue: ₹${data.revenue.toLocaleString()}`);
      console.log(`    Orders: ${data.orders.toLocaleString()}`);
      console.log(`    Top Products: ${data.topProducts.slice(0, 3).join(', ')}`);
    });

  // Save report to JSON
  const outputPath = path.join(baseDir, 'sheet-spark-63', 'analysis-report.json');
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  console.log(`\n✅ Full report saved to: ${outputPath}`);
}

main().catch(console.error);

