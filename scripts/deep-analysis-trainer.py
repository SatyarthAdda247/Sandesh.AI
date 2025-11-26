"""
Deep Analysis & GPT-5-mini Training Pipeline
Analyzes all .xlsx files using pandas and creates training prompts for Azure OpenAI
"""

import pandas as pd
import json
import os
import re
from pathlib import Path
from collections import defaultdict
from datetime import datetime
import requests

# Azure OpenAI Configuration
AZURE_OPENAI_API_KEY = "YOUR_AZURE_OPENAI_API_KEY"
AZURE_OPENAI_ENDPOINT = "https://adda-mfuvs7bm-eastus.cognitiveservices.azure.com"
AZURE_OPENAI_API_VERSION = "2025-04-01-preview"
AZURE_OPENAI_DEPLOYMENT_NAME = "gpt-5-mini"

class CampaignAnalyzer:
    def __init__(self, base_dir):
        self.base_dir = Path(base_dir)
        self.campaigns = []
        self.revenue_data = []
        self.patterns = defaultdict(list)
        
    def extract_tokens(self, text):
        """Extract personalization tokens like {{token}}"""
        if not isinstance(text, str):
            return []
        return re.findall(r'\{\{([^}]+)\}\}', text)
    
    def extract_product_ids(self, text):
        """Extract product IDs from text"""
        if not isinstance(text, str):
            return []
        # Find sequences of digits separated by whitespace or commas
        ids = re.findall(r'\b\d{5,6}\b', text)
        return list(set(ids))
    
    def extract_discount(self, text):
        """Extract discount percentage"""
        if not isinstance(text, str):
            return None
        match = re.search(r'(\d+)%\s*[Oo]ff', text)
        return match.group(1) if match else None
    
    def extract_promo_code(self, text):
        """Extract promo code"""
        if not isinstance(text, str):
            return None
        # Look for "Code: XXXX" or {{XXXX}} patterns
        match = re.search(r'[Cc]ode[:\s]+([A-Z0-9]+)', text)
        if match:
            return match.group(1)
        # Look for standalone tokens that might be codes
        tokens = self.extract_tokens(text)
        if tokens:
            # Codes are usually short and uppercase
            for token in tokens:
                if len(token) <= 10 and token.isupper():
                    return token
        return None
    
    def extract_contact_number(self, text):
        """Extract contact number"""
        if not isinstance(text, str):
            return None
        match = re.search(r'(\d{10})', text)
        return match.group(1) if match else None
    
    def analyze_xlsx_file(self, file_path):
        """Deep analysis of a single .xlsx file"""
        print(f"\n📊 Analyzing: {file_path.name}")
        
        try:
            # Read all sheets
            xl_file = pd.ExcelFile(file_path)
            
            for sheet_name in xl_file.sheet_names:
                df = pd.read_excel(file_path, sheet_name=sheet_name)
                print(f"  Sheet: {sheet_name} ({len(df)} rows, {len(df.columns)} columns)")
                
                # Detect file type
                columns_lower = [str(col).lower() for col in df.columns]
                
                is_campaign = any('hook' in col or 'push' in col or 'cta' in col or 'whatsapp' in col or 'message' in col
                                 for col in columns_lower)
                is_revenue = any('revenue' in col or 'orders' in col 
                                for col in columns_lower)
                
                if is_campaign:
                    self._process_campaign_sheet(df, file_path.name)
                elif is_revenue:
                    self._process_revenue_sheet(df, file_path.name)
                else:
                    print(f"  ⚠️  Unknown sheet type")
                    
        except Exception as e:
            print(f"  ❌ Error: {str(e)}")
    
    def _process_campaign_sheet(self, df, file_name):
        """Process campaign data sheet"""
        print(f"  ✅ Campaign Sheet Detected")
        
        campaigns_before = len(self.campaigns)
        
        for idx, row in df.iterrows():
            campaign = {
                'source_file': file_name,
                'row_index': idx,
            }
            
            # Extract all available fields
            for col in df.columns:
                col_lower = str(col).lower()
                col_str = str(col).strip()
                value = row[col]
                
                if pd.isna(value):
                    continue
                    
                value_str = str(value).strip()
                
                # Campaign Type
                if 'campaign type' in col_lower or 'campaign_type' in col_lower:
                    campaign['campaign_type'] = value_str
                
                # Date
                elif 'date' in col_lower or 'day' in col_lower:
                    campaign['date'] = value_str
                
                # Vertical / Category
                elif 'vertical' in col_lower or 'category' in col_lower:
                    campaign['vertical'] = value_str
                
                # Language
                elif 'language' in col_lower or 'lang' in col_lower:
                    campaign['language'] = value_str
                
                # Aligned by
                elif 'aligned by' in col_lower or 'aligned_by' in col_lower:
                    campaign['aligned_by'] = value_str
                
                # Landing Page P_id
                elif 'landing page' in col_lower and 'p_id' in col_lower:
                    campaign['landing_page_pid'] = value_str
                
                # Sent Number
                elif 'sent no' in col_lower or 'sent_no' in col_lower:
                    campaign['sent_no'] = value_str
                
                # Campaign Name
                elif 'campaign_name' in col_lower or 'campaign name' in col_lower:
                    campaign['campaign_name'] = value_str
                    if 'personalization_tokens' not in campaign:
                        campaign['personalization_tokens'] = []
                    campaign['personalization_tokens'].extend(self.extract_tokens(value_str))
                
                # Template ID
                elif 'template' in col_lower and 'id' in col_lower:
                    campaign['template_id'] = value_str
                
                # Audience / User Segment
                elif 'segment' in col_lower or 'audience' in col_lower or 'target' in col_lower:
                    campaign['user_segment'] = value_str
                
                # Product IDs
                elif 'product' in col_lower and 'id' in col_lower:
                    campaign['product_ids'] = self.extract_product_ids(value_str)
                
                # Scheduled Time
                elif 'time' in col_lower and 'Unnamed' not in col_str:
                    campaign['scheduled_time'] = value_str
                
                # Hook / Title
                elif 'hook' in col_lower or 'title' in col_lower or col_lower == 'te':
                    campaign['hook'] = value_str
                    if 'personalization_tokens' not in campaign:
                        campaign['personalization_tokens'] = []
                    campaign['personalization_tokens'].extend(self.extract_tokens(value_str))
                
                # Push Copy / WhatsApp Message
                elif 'push' in col_lower or 'copy' in col_lower or 'description' in col_lower or 'whatsapp' in col_lower or 'message' in col_lower or col_lower == 'de':
                    campaign['push_copy'] = value_str
                    campaign['promo_code'] = self.extract_promo_code(value_str)
                    campaign['discount'] = self.extract_discount(value_str)
                    campaign['contact_number'] = self.extract_contact_number(value_str)
                    if 'personalization_tokens' not in campaign:
                        campaign['personalization_tokens'] = []
                    campaign['personalization_tokens'].extend(self.extract_tokens(value_str))
                
                # CTA
                elif 'cta' in col_lower:
                    campaign['cta'] = value_str
                
                # Trackier Link
                elif 'trackier' in col_lower:
                    campaign['trackier_link'] = value_str
                
                # Landing Page URL
                elif col_str == 'LP' or (col_lower == 'lp' and 'Unnamed' not in col_str):
                    campaign['landing_page_url'] = value_str
                
                # Creative Link
                elif 'creative' in col_lower and 'link' in col_lower:
                    campaign['creative_link'] = value_str
                
                # MoEngage Link (@ column)
                elif col_str == '@' or (col_lower == '@' and 'Unnamed' not in col_str):
                    campaign['moengage_link'] = value_str
                    campaign['platform'] = 'MoEngage'
                
                # User Count
                elif 'user count' in col_lower or 'user_count' in col_lower:
                    try:
                        campaign['user_count'] = int(float(value_str))
                    except:
                        campaign['user_count'] = value_str
                
                # Generic Links
                elif 'link' in col_lower or 'url' in col_lower:
                    if 'app' in col_lower or 'deeplink' in col_lower:
                        campaign['app_link'] = value_str
                    elif 'web' in col_lower:
                        campaign['web_link'] = value_str
                    elif 'image' in col_lower or 'banner' in col_lower:
                        campaign['image_link'] = value_str
                    elif 'moengage' in value_str.lower():
                        campaign['moengage_link'] = value_str
                        campaign['platform'] = 'MoEngage'
                    else:
                        campaign['generic_link'] = value_str
            
            # Remove duplicate tokens
            if 'personalization_tokens' in campaign:
                campaign['personalization_tokens'] = list(set(campaign['personalization_tokens']))
            
            if 'hook' in campaign or 'push_copy' in campaign or 'campaign_name' in campaign:
                self.campaigns.append(campaign)
        
        campaigns_added = len(self.campaigns) - campaigns_before
        if campaigns_added > 0:
            verticals = set([c.get('vertical', 'Unknown') for c in self.campaigns[-campaigns_added:]])
            print(f"    Extracted {campaigns_added} campaigns")
            print(f"    Verticals found: {', '.join(verticals)}")
        else:
            print(f"    ⚠️  No campaigns extracted")
    
    def _process_revenue_sheet(self, df, file_name):
        """Process revenue data sheet"""
        print(f"  ✅ Revenue Sheet Detected")
        
        for idx, row in df.iterrows():
            revenue = {
                'source_file': file_name,
                'row_index': idx,
            }
            
            for col in df.columns:
                col_lower = str(col).lower()
                value = row[col]
                
                if pd.isna(value):
                    continue
                
                if 'date' in col_lower:
                    revenue['date'] = str(value)
                elif 'vertical' in col_lower:
                    revenue['vertical'] = str(value)
                elif 'product' in col_lower and 'name' in col_lower:
                    revenue['product_name'] = str(value)
                elif 'order' in col_lower:
                    revenue['orders'] = float(value)
                elif 'revenue' in col_lower or 'amount' in col_lower:
                    revenue['revenue'] = float(value)
                elif 'source' in col_lower:
                    revenue['source'] = str(value)
            
            if 'revenue' in revenue or 'orders' in revenue:
                self.revenue_data.append(revenue)
        
        print(f"    Extracted {len([r for r in self.revenue_data if r['source_file'] == file_name])} revenue records")
    
    def analyze_patterns(self):
        """Analyze patterns across all campaigns"""
        print("\n🔍 Analyzing Patterns...")
        print(f"Total campaigns to analyze: {len(self.campaigns)}")
        
        # Group by vertical
        by_vertical = defaultdict(list)
        for campaign in self.campaigns:
            vertical = campaign.get('vertical', 'Unknown')
            by_vertical[vertical].append(campaign)
        
        print(f"Found {len(by_vertical)} unique verticals: {list(by_vertical.keys())}")
        
        # Extract patterns
        for vertical, campaigns in by_vertical.items():
            patterns = {
                'vertical': vertical,
                'total_campaigns': len(campaigns),
                'common_hooks': [],
                'common_tokens': defaultdict(int),
                'promo_codes': [],
                'discounts': [],
                'contact_numbers': set(),
                'platforms': set(),
                'user_segments': set(),
            }
            
            for campaign in campaigns:
                if 'hook' in campaign:
                    patterns['common_hooks'].append(campaign['hook'])
                
                if 'personalization_tokens' in campaign:
                    for token in campaign['personalization_tokens']:
                        patterns['common_tokens'][token] += 1
                
                if 'promo_code' in campaign:
                    patterns['promo_codes'].append(campaign['promo_code'])
                
                if 'discount' in campaign:
                    patterns['discounts'].append(campaign['discount'])
                
                if 'contact_number' in campaign:
                    patterns['contact_numbers'].add(campaign['contact_number'])
                
                if 'platform' in campaign:
                    patterns['platforms'].add(campaign['platform'])
                
                if 'user_segment' in campaign:
                    patterns['user_segments'].add(campaign['user_segment'])
            
            # Convert sets to lists for JSON serialization
            patterns['contact_numbers'] = list(patterns['contact_numbers'])
            patterns['platforms'] = list(patterns['platforms'])
            patterns['user_segments'] = list(patterns['user_segments'])
            patterns['common_tokens'] = dict(sorted(
                patterns['common_tokens'].items(), 
                key=lambda x: x[1], 
                reverse=True
            )[:20])  # Top 20 tokens
            
            self.patterns[vertical] = patterns
        
        print(f"  ✅ Analyzed {len(self.patterns)} verticals")
        if self.patterns:
            print(f"  Verticals: {', '.join(self.patterns.keys())}")
    
    def generate_training_prompt(self, vertical):
        """Generate GPT-5-mini training prompt for a vertical"""
        pattern = self.patterns.get(vertical, {})
        
        if not pattern:
            return None
        
        # Get top hooks
        top_hooks = pattern.get('common_hooks', [])[:5]
        
        # Get common tokens
        common_tokens = pattern.get('common_tokens', {})
        
        # Get typical offers
        discounts = list(set(pattern.get('discounts', [])))
        promo_codes = list(set(pattern.get('promo_codes', [])))
        
        prompt = f"""You are an expert marketing copywriter for {vertical} vertical in Indian exam preparation platforms.

HISTORICAL HIGH-PERFORMING EXAMPLES:
"""
        
        for i, hook in enumerate(top_hooks, 1):
            prompt += f"{i}. \"{hook}\"\n"
        
        prompt += f"""

COMMON PERSONALIZATION TOKENS (use these in your copy):
"""
        for token, count in list(common_tokens.items())[:10]:
            prompt += f"- {{{{{token}}}}} (used {count} times)\n"
        
        if discounts:
            prompt += f"""

TYPICAL DISCOUNT PATTERNS:
{', '.join(discounts[:5])}
"""
        
        if promo_codes:
            prompt += f"""

PROMO CODE EXAMPLES:
{', '.join(promo_codes[:5])}
"""
        
        prompt += f"""

YOUR TASK:
Generate a compelling push notification campaign for {vertical} with:
1. Hook (max 60 chars, engaging, use emojis if appropriate)
2. Push Copy (max 150 words, include personalization tokens, offer details)
3. CTA (max 20 chars)
4. Promo Code (if applicable)
5. Contact Number: 9667589247 (if relevant)

FORMAT:
Return JSON:
{{
  "hook": "...",
  "push_copy": "...",
  "cta": "...",
  "promo_code": "...",
  "discount": "...",
  "personalization_tokens": ["token1", "token2"]
}}
"""
        
        return prompt
    
    def train_with_azure_openai(self, vertical, context_data=None):
        """Call Azure OpenAI GPT-5-mini with training prompt"""
        prompt = self.generate_training_prompt(vertical)
        
        if not prompt:
            print(f"❌ No pattern data for {vertical}")
            return None
        
        # Add context if provided
        if context_data:
            prompt += f"\n\nCONTEXT:\n"
            if 'revenue' in context_data:
                prompt += f"Recent Revenue: ₹{context_data['revenue']:,.0f}\n"
            if 'orders' in context_data:
                prompt += f"Recent Orders: {context_data['orders']}\n"
            if 'top_product' in context_data:
                prompt += f"Top Product: {context_data['top_product']}\n"
        
        url = f"{AZURE_OPENAI_ENDPOINT}/openai/deployments/{AZURE_OPENAI_DEPLOYMENT_NAME}/chat/completions?api-version={AZURE_OPENAI_API_VERSION}"
        
        headers = {
            "Content-Type": "application/json",
            "api-key": AZURE_OPENAI_API_KEY
        }
        
        payload = {
            "messages": [
                {
                    "role": "system",
                    "content": "You are an expert marketing copywriter for Indian exam preparation platforms. Always return valid JSON."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "temperature": 0.7,
            "max_tokens": 500,
            "top_p": 0.95
        }
        
        try:
            print(f"\n🤖 Training GPT-5-mini for {vertical}...")
            response = requests.post(url, headers=headers, json=payload)
            response.raise_for_status()
            
            result = response.json()
            content = result['choices'][0]['message']['content']
            
            # Parse JSON response
            generated = json.loads(content)
            generated['vertical'] = vertical
            
            print(f"  ✅ Generated campaign for {vertical}")
            return generated
            
        except Exception as e:
            print(f"  ❌ Error: {str(e)}")
            return None
    
    def save_analysis(self, output_dir):
        """Save analysis results"""
        output_path = Path(output_dir)
        output_path.mkdir(exist_ok=True)
        
        # Save campaigns
        with open(output_path / 'campaigns_detailed.json', 'w', encoding='utf-8') as f:
            json.dump(self.campaigns, f, indent=2, ensure_ascii=False)
        
        # Save revenue
        with open(output_path / 'revenue_detailed.json', 'w', encoding='utf-8') as f:
            json.dump(self.revenue_data, f, indent=2, ensure_ascii=False)
        
        # Save patterns
        with open(output_path / 'patterns_by_vertical.json', 'w', encoding='utf-8') as f:
            json.dump(dict(self.patterns), f, indent=2, ensure_ascii=False)
        
        # Save training prompts
        prompts = {}
        for vertical in self.patterns.keys():
            prompts[vertical] = self.generate_training_prompt(vertical)
        
        with open(output_path / 'training_prompts.json', 'w', encoding='utf-8') as f:
            json.dump(prompts, f, indent=2, ensure_ascii=False)
        
        print(f"\n💾 Saved analysis to {output_path}")

def main():
    print("=" * 70)
    print("🚀 DEEP ANALYSIS & GPT-5-MINI TRAINING PIPELINE")
    print("=" * 70)
    
    # Base directory with .xlsx files
    base_dir = Path(__file__).parent.parent.parent
    
    # Initialize analyzer
    analyzer = CampaignAnalyzer(base_dir)
    
    # Find all .xlsx files
    xlsx_files = [
        'MAY REVENUE CAMPAIGNS 2025.xlsx',
        'JUNE REVENUE CAMPAIGNS 2025.xlsx',
        'JULY REVENUE CAMPAIGNS 2025.xlsx',
        'AUGUST REVENUE CAMPAIGNS 2025.xlsx',
        'SEPTEMBER REVENUE SHEET 2025.xlsx',
        'OCTOBER REVENUE SHEET 2025.xlsx',
        'NOVEMBER REVENUE SHEET 2025.xlsx',
    ]
    
    # Analyze each file
    for file_name in xlsx_files:
        file_path = base_dir / file_name
        if file_path.exists():
            analyzer.analyze_xlsx_file(file_path)
        else:
            print(f"\n⚠️  File not found: {file_name}")
    
    # Analyze patterns
    print(f"\n📊 Total campaigns collected: {len(analyzer.campaigns)}")
    print(f"📊 Total revenue records collected: {len(analyzer.revenue_data)}")
    
    if len(analyzer.campaigns) == 0:
        print("\n❌ ERROR: No campaigns were extracted!")
        print("   This usually means the column names don't match expected patterns.")
        print("   Please check your Excel files have columns like:")
        print("   - Category/Vertical (for vertical classification)")
        print("   - Whatsapp Message/Push Copy (for campaign content)")
        return
    
    analyzer.analyze_patterns()
    
    # Save analysis
    output_dir = base_dir / 'sheet-spark-63' / 'analysis-output'
    analyzer.save_analysis(output_dir)
    
    # Generate sample campaigns for top 3 verticals
    print("\n" + "=" * 70)
    print("🤖 GENERATING SAMPLE CAMPAIGNS WITH GPT-5-MINI")
    print("=" * 70)
    
    top_verticals = sorted(
        analyzer.patterns.items(),
        key=lambda x: x[1]['total_campaigns'],
        reverse=True
    )[:3]
    
    generated_campaigns = []
    for vertical, pattern in top_verticals:
        campaign = analyzer.train_with_azure_openai(vertical)
        if campaign:
            generated_campaigns.append(campaign)
    
    # Save generated campaigns
    if generated_campaigns:
        with open(output_dir / 'ai_generated_campaigns.json', 'w', encoding='utf-8') as f:
            json.dump(generated_campaigns, f, indent=2, ensure_ascii=False)
        print(f"\n💾 Saved {len(generated_campaigns)} AI-generated campaigns")
    
    # Print summary
    print("\n" + "=" * 70)
    print("📊 ANALYSIS SUMMARY")
    print("=" * 70)
    print(f"Total Campaigns: {len(analyzer.campaigns)}")
    print(f"Total Revenue Records: {len(analyzer.revenue_data)}")
    print(f"Verticals Analyzed: {len(analyzer.patterns)}")
    print(f"Output Directory: {output_dir}")
    print("=" * 70)

if __name__ == "__main__":
    main()

