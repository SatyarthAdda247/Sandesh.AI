/**
 * Load Excel files into Supabase database
 * Reads .xlsx files from parent directory and populates revenue_data and campaign_history tables
 */

import * as XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://xvwtxobrztdepzxveyrs.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2d3R4b2JyenRkZXB6eHZleXJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwOTY1MTgsImV4cCI6MjA3ODY3MjUxOH0.TutIDKkw_YWXQlgGBXIFFKiOc0fzpmJKJ7juDSytns8';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface RevenueRecord {
  record_date: string;
  vertical: string;
  product_name?: string;
  orders?: number;
  revenue?: number;
  course_type?: string;
  source?: string;
}

interface CampaignRecord {
  campaign_date: string;
  vertical: string;
  campaign_name?: string;
  hook?: string;
  push_copy?: string;
  cta?: string;
  channel?: string;
  user_segment?: string;
  scheduled_time?: string;
  promo_code?: string;
  discount?: string;
  contact_number?: string;
  trackier_link?: string;
  landing_page_url?: string;
  user_count?: number;
}

function normalizeColumnName(col: string): string {
  return col.toString().toLowerCase().trim().replace(/\s+/g, '_');
}

function extractDate(filename: string): string {
  // Extract month from filename like "NOVEMBER REVENUE SHEET 2025.xlsx"
  const months: { [key: string]: string } = {
    'january': '01', 'february': '02', 'march': '03', 'april': '04',
    'may': '05', 'june': '06', 'july': '07', 'august': '08',
    'september': '09', 'october': '10', 'november': '11', 'december': '12'
  };
  
  const lowerFilename = filename.toLowerCase();
  for (const [month, num] of Object.entries(months)) {
    if (lowerFilename.includes(month)) {
      const year = lowerFilename.match(/202[0-9]/)?.[0] || '2025';
      return `${year}-${num}-01`;
    }
  }
  
  return new Date().toISOString().split('T')[0];
}

function parseRevenue(worksheet: XLSX.WorkSheet, defaultDate: string): RevenueRecord[] {
  const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
  const records: RevenueRecord[] = [];

  for (const row of data as any[]) {
    const normalized: any = {};
    for (const key of Object.keys(row)) {
      normalized[normalizeColumnName(key)] = row[key];
    }

    // Skip if no vertical/category
    if (!normalized.vertical && !normalized.category) continue;

    records.push({
      record_date: normalized.date || normalized.record_date || defaultDate,
      vertical: normalized.vertical || normalized.category || 'Unknown',
      product_name: normalized.product_name || normalized.product || '',
      orders: parseFloat(normalized.orders || 0) || 0,
      revenue: parseFloat(normalized.revenue || normalized.amount || 0) || 0,
      course_type: normalized.course_type || '',
      source: normalized.source || '',
    });
  }

  return records;
}

function parseCampaigns(worksheet: XLSX.WorkSheet, defaultDate: string): CampaignRecord[] {
  const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
  const records: CampaignRecord[] = [];

  for (const row of data as any[]) {
    const normalized: any = {};
    for (const key of Object.keys(row)) {
      normalized[normalizeColumnName(key)] = row[key];
    }

    // Skip if no category and no message
    const vertical = normalized.vertical || normalized.category;
    const message = normalized.whatsapp_message || normalized.push_copy || normalized.hook;
    
    if (!vertical || !message) continue;

    // Extract discount from message
    const discountMatch = message.match(/(\d+)%\s*[Oo]ff/);
    const discount = discountMatch ? discountMatch[1] : null;

    // Extract promo code
    const codeMatch = message.match(/[Cc]ode[:\s]+([A-Z0-9]+)/);
    const promoCode = codeMatch ? codeMatch[1] : null;

    // Extract contact number
    const phoneMatch = message.match(/(\d{10})/);
    const contactNumber = phoneMatch ? phoneMatch[1] : null;

    records.push({
      campaign_date: normalized.date || normalized.campaign_date || defaultDate,
      vertical: vertical,
      campaign_name: normalized.campaign_name || '',
      hook: normalized.hook || normalized.campaign_name || message.substring(0, 100),
      push_copy: message,
      cta: normalized.cta || 'Learn More',
      channel: normalized.channel || 'push',
      user_segment: normalized.audience || normalized.user_segment || '',
      scheduled_time: normalized.time || normalized.scheduled_time || '',
      promo_code: promoCode || normalized.promo_code || null,
      discount: discount || null,
      contact_number: contactNumber || null,
      trackier_link: normalized.trackier_link || '',
      landing_page_url: normalized.lp || normalized.landing_page_url || '',
      user_count: parseInt(normalized.user_count || 0) || null,
    });
  }

  return records;
}

async function loadExcelFile(filePath: string) {
  console.log(`\n📊 Loading: ${filePath}`);
  
  const workbook = XLSX.readFile(filePath);
  const defaultDate = extractDate(filePath);
  
  let totalRevenue = 0;
  let totalCampaigns = 0;

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    
    // Detect sheet type by checking first row
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];
    if (data.length < 2) continue;
    
    const headerRow = data[0].map((col: any) => col.toString().toLowerCase());
    
    // Check if it's a campaign sheet (has message/whatsapp column)
    const isCampaignSheet = headerRow.some((col: string) => 
      col.includes('whatsapp') || col.includes('message') || col.includes('hook') || col.includes('push')
    );

    // Check if it's a revenue sheet
    const isRevenueSheet = headerRow.some((col: string) => 
      col.includes('revenue') || col.includes('orders') || col.includes('amount')
    );

    if (isCampaignSheet) {
      console.log(`  ✅ Campaign sheet: ${sheetName}`);
      const campaigns = parseCampaigns(worksheet, defaultDate);
      
      if (campaigns.length > 0) {
        // Insert into campaign_history table (need to create first)
        console.log(`     Extracted ${campaigns.length} campaigns`);
        totalCampaigns += campaigns.length;
        
        // For now, just log. We'll need to create the table schema first
        // const { error } = await supabase.from('campaign_history').insert(campaigns as any);
        // if (error) console.error('Error inserting campaigns:', error);
      }
    } else if (isRevenueSheet) {
      console.log(`  ✅ Revenue sheet: ${sheetName}`);
      const revenues = parseRevenue(worksheet, defaultDate);
      
      if (revenues.length > 0) {
        console.log(`     Extracted ${revenues.length} revenue records`);
        totalRevenue += revenues.length;
        
        const { error } = await supabase.from('revenue_data').insert(revenues as any);
        if (error) console.error('Error inserting revenue:', error.message);
        else console.log(`     ✅ Inserted into database`);
      }
    }
  }

  return { totalRevenue, totalCampaigns };
}

async function main() {
  console.log('=' . repeat(70));
  console.log('📥 LOADING EXCEL FILES TO DATABASE');
  console.log('='.repeat(70));

  const baseDir = join(__dirname, '..', '..');
  const files = readdirSync(baseDir).filter(f => f.endsWith('.xlsx'));

  console.log(`\nFound ${files.length} Excel files:`);
  files.forEach(f => console.log(`  - ${f}`));

  let grandTotalRevenue = 0;
  let grandTotalCampaigns = 0;

  for (const file of files) {
    const filePath = join(baseDir, file);
    const { totalRevenue, totalCampaigns } = await loadExcelFile(filePath);
    grandTotalRevenue += totalRevenue;
    grandTotalCampaigns += totalCampaigns;
  }

  console.log('\n' + '='.repeat(70));
  console.log('📊 SUMMARY');
  console.log('='.repeat(70));
  console.log(`Total Revenue Records: ${grandTotalRevenue}`);
  console.log(`Total Campaign Records: ${grandTotalCampaigns}`);
  console.log('='.repeat(70));
}

main().catch(console.error);

