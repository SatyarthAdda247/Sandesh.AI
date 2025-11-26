"""
End-to-End Marketing Communication Automation Pipeline for Adda247
Automates: Planning → Analysis → Generation → Scheduling → Tracking
"""

import pandas as pd
import json
import os
from pathlib import Path
from datetime import datetime, timedelta
from collections import defaultdict
import re
import requests

# Azure OpenAI Configuration
AZURE_OPENAI_API_KEY = "YOUR_AZURE_OPENAI_API_KEY"
AZURE_OPENAI_ENDPOINT = "https://adda-mfuvs7bm-eastus.cognitiveservices.azure.com"
AZURE_OPENAI_API_VERSION = "2025-04-01-preview"
AZURE_OPENAI_DEPLOYMENT_NAME = "gpt-5-mini"

class MarComAutomationPipeline:
    def __init__(self, base_dir):
        self.base_dir = Path(base_dir)
        self.historical_data = []
        self.patterns_by_vertical = {}
        self.upcoming_events = []
        self.user_segments = {}
        self.generated_campaigns = []
        
    def load_historical_data(self):
        """Load and parse all historical .xlsx files"""
        print("📚 Loading Historical Data...")
        
        xlsx_files = [
            'MAY REVENUE CAMPAIGNS 2025.xlsx',
            'JUNE REVENUE CAMPAIGNS 2025.xlsx',
            'JULY REVENUE CAMPAIGNS 2025.xlsx',
            'AUGUST REVENUE CAMPAIGNS 2025.xlsx',
            'SEPTEMBER REVENUE SHEET 2025.xlsx',
            'OCTOBER REVENUE SHEET 2025.xlsx',
            'NOVEMBER REVENUE SHEET 2025.xlsx',
        ]
        
        for file_name in xlsx_files:
            file_path = self.base_dir / file_name
            if file_path.exists():
                try:
                    df = pd.read_excel(file_path)
                    self._parse_campaign_data(df, file_name)
                    print(f"  ✅ {file_name}: {len(df)} rows")
                except Exception as e:
                    print(f"  ⚠️ {file_name}: {str(e)}")
        
        print(f"  📊 Total campaigns loaded: {len(self.historical_data)}")
    
    def _parse_campaign_data(self, df, source_file):
        """Parse campaign data with all fields"""
        for idx, row in df.iterrows():
            campaign = {'source': source_file, 'row': idx}
            
            for col in df.columns:
                val = row[col]
                if pd.isna(val):
                    continue
                
                col_str = str(col).strip()
                val_str = str(val).strip()
                
                # Map columns
                if col_str in ['Date', 'date']:
                    campaign['date'] = val_str
                elif col_str in ['Revenue', 'Type']:
                    campaign['type'] = val_str
                elif col_str in ['Vertical', 'vertical']:
                    campaign['vertical'] = val_str
                elif 'segment' in col_str.lower() or 'audience' in col_str.lower():
                    campaign['user_segment'] = val_str
                elif 'product' in col_str.lower() and 'id' in col_str.lower():
                    campaign['product_ids'] = self._extract_product_ids(val_str)
                elif 'time' in col_str.lower() or 'schedule' in col_str.lower():
                    campaign['scheduled_time'] = val_str
                elif 'copy' in col_str.lower() or 'message' in col_str.lower():
                    campaign['push_copy'] = val_str
                    campaign['tokens'] = self._extract_tokens(val_str)
                    campaign['promo_code'] = self._extract_promo_code(val_str)
                    campaign['discount'] = self._extract_discount(val_str)
                    campaign['contact'] = self._extract_contact(val_str)
                elif 'link' in col_str.lower():
                    if 'app' in col_str.lower():
                        campaign['app_link'] = val_str
                    elif 'web' in col_str.lower():
                        campaign['web_link'] = val_str
                    elif 'image' in col_str.lower():
                        campaign['image_link'] = val_str
                elif 'moengage' in col_str.lower() or 'tracking' in col_str.lower():
                    if 'tracking_links' not in campaign:
                        campaign['tracking_links'] = []
                    campaign['tracking_links'].append(val_str)
            
            if 'push_copy' in campaign or 'vertical' in campaign:
                self.historical_data.append(campaign)
    
    def _extract_tokens(self, text):
        """Extract {{tokens}}"""
        return re.findall(r'\{\{([^}]+)\}\}', text)
    
    def _extract_product_ids(self, text):
        """Extract product IDs"""
        ids = re.findall(r'\b\d{5,6}\b', text)
        return list(set(ids))
    
    def _extract_promo_code(self, text):
        """Extract promo code"""
        match = re.search(r'[Cc]ode[:\s]+([A-Z0-9]+)', text)
        if match:
            return match.group(1)
        # Look for standalone uppercase tokens
        tokens = self._extract_tokens(text)
        for token in tokens:
            if len(token) <= 10 and token.isupper() and not any(x in token for x in ['USERNAME', 'NAME', 'DAY']):
                return token
        return None
    
    def _extract_discount(self, text):
        """Extract discount"""
        match = re.search(r'(\d+)%\s*[Oo]ff', text)
        return match.group(1) + '% Off' if match else None
    
    def _extract_contact(self, text):
        """Extract contact number"""
        match = re.search(r'(\d{10})', text)
        return match.group(1) if match else None
    
    def analyze_patterns(self):
        """Analyze patterns by vertical"""
        print("\n🔍 Analyzing Patterns by Vertical...")
        
        by_vertical = defaultdict(list)
        for campaign in self.historical_data:
            vertical = campaign.get('vertical', 'Unknown')
            by_vertical[vertical].append(campaign)
        
        for vertical, campaigns in by_vertical.items():
            pattern = {
                'vertical': vertical,
                'total_campaigns': len(campaigns),
                'top_hooks': [],
                'common_tokens': defaultdict(int),
                'typical_discounts': defaultdict(int),
                'promo_codes': [],
                'user_segments': set(),
                'product_ids': set(),
                'best_time': defaultdict(int),
                'contact_numbers': set(),
            }
            
            for camp in campaigns:
                if 'tokens' in camp:
                    for token in camp['tokens']:
                        pattern['common_tokens'][token] += 1
                
                if 'discount' in camp:
                    pattern['typical_discounts'][camp['discount']] += 1
                
                if 'promo_code' in camp:
                    pattern['promo_codes'].append(camp['promo_code'])
                
                if 'user_segment' in camp:
                    pattern['user_segments'].add(camp['user_segment'])
                
                if 'product_ids' in camp:
                    pattern['product_ids'].update(camp['product_ids'])
                
                if 'scheduled_time' in camp:
                    pattern['best_time'][camp['scheduled_time']] += 1
                
                if 'contact' in camp:
                    pattern['contact_numbers'].add(camp['contact'])
                
                if 'push_copy' in camp:
                    pattern['top_hooks'].append(camp['push_copy'][:100])
            
            # Get top items
            pattern['common_tokens'] = dict(sorted(pattern['common_tokens'].items(), key=lambda x: x[1], reverse=True)[:15])
            pattern['typical_discounts'] = dict(sorted(pattern['typical_discounts'].items(), key=lambda x: x[1], reverse=True)[:5])
            pattern['best_time'] = dict(sorted(pattern['best_time'].items(), key=lambda x: x[1], reverse=True)[:3])
            pattern['user_segments'] = list(pattern['user_segments'])
            pattern['product_ids'] = list(pattern['product_ids'])[:20]
            pattern['contact_numbers'] = list(pattern['contact_numbers'])
            pattern['promo_codes'] = list(set(pattern['promo_codes']))[:10]
            
            self.patterns_by_vertical[vertical] = pattern
        
        print(f"  ✅ Analyzed {len(self.patterns_by_vertical)} verticals")
    
    def detect_upcoming_events(self):
        """Detect upcoming events and holidays"""
        print("\n📅 Detecting Upcoming Events...")
        
        today = datetime.now()
        
        # Indian exam calendar & festivals (2025-2026)
        events = [
            {'date': '2025-11-14', 'name': "Children's Day", 'tags': ['festive', 'student']},
            {'date': '2025-11-15', 'name': "Jharkhand Foundation Day", 'tags': ['state', 'regional']},
            {'date': '2025-12-01', 'name': "World AIDS Day", 'tags': ['awareness']},
            {'date': '2025-12-25', 'name': "Christmas", 'tags': ['festive', 'holiday']},
            {'date': '2025-12-31', 'name': "New Year Eve", 'tags': ['festive', 'sale']},
            {'date': '2026-01-01', 'name': "New Year", 'tags': ['festive', 'new_start']},
            {'date': '2026-01-15', 'name': "Makar Sankranti", 'tags': ['festive']},
            {'date': '2026-01-26', 'name': "Republic Day", 'tags': ['national', 'patriotic']},
            {'date': '2026-02-14', 'name': "Valentine's Day", 'tags': ['festive']},
            {'date': '2026-03-08', 'name': "International Women's Day", 'tags': ['special', 'women']},
            {'date': '2026-03-14', 'name': "Holi", 'tags': ['festive', 'colorful']},
            {'date': '2026-04-14', 'name': "Ambedkar Jayanti", 'tags': ['national']},
            {'date': '2026-05-01', 'name': "Labour Day", 'tags': ['national']},
            {'date': '2026-08-15', 'name': "Independence Day", 'tags': ['national', 'patriotic']},
            {'date': '2026-08-26', 'name': "Janmashtami", 'tags': ['festive']},
            {'date': '2026-09-05', 'name': "Teachers' Day", 'tags': ['education', 'teachers']},
            {'date': '2026-10-02', 'name': "Gandhi Jayanti", 'tags': ['national']},
            {'date': '2026-10-24', 'name': "Dussehra", 'tags': ['festive']},
            {'date': '2026-11-13', 'name': "Diwali", 'tags': ['festive', 'sale', 'biggest']},
        ]
        
        # Exam seasons
        exam_events = [
            {'date': '2025-12-01', 'name': "SSC CGL Exam Season", 'tags': ['exam', 'ssc']},
            {'date': '2026-01-01', 'name': "Banking Exam Season", 'tags': ['exam', 'banking']},
            {'date': '2026-02-01', 'name': "CTET Exam Season", 'tags': ['exam', 'teaching']},
            {'date': '2026-03-01', 'name': "Railway Exam Season", 'tags': ['exam', 'railway']},
            {'date': '2026-04-01', 'name': "State PSC Season", 'tags': ['exam', 'state']},
        ]
        
        events.extend(exam_events)
        
        # Filter upcoming events (next 45 days)
        for event in events:
            event_date = datetime.strptime(event['date'], '%Y-%m-%d')
            days_until = (event_date - today).days
            
            if 0 <= days_until <= 45:
                event['days_until'] = days_until
                event['urgency'] = 'high' if days_until <= 7 else 'medium' if days_until <= 21 else 'low'
                self.upcoming_events.append(event)
        
        self.upcoming_events.sort(key=lambda x: x['days_until'])
        
        print(f"  🎯 Found {len(self.upcoming_events)} upcoming events")
        for event in self.upcoming_events[:5]:
            print(f"    - {event['name']} in {event['days_until']} days ({event['urgency']} urgency)")
    
    def generate_campaign_with_ai(self, vertical, event=None, context=None):
        """Generate campaign using GPT-5-mini"""
        pattern = self.patterns_by_vertical.get(vertical)
        if not pattern:
            return None
        
        # Build context-aware prompt
        tokens_str = ', '.join(list(pattern['common_tokens'].keys())[:10]) if pattern['common_tokens'] else 'Username, Name'
        discounts_str = ', '.join([str(k) for k in pattern['typical_discounts'].keys() if k][:3]) if pattern['typical_discounts'] else '50% Off'
        times_str = ', '.join([str(k) for k in pattern['best_time'].keys() if k][:2]) if pattern['best_time'] else '7:00 PM'
        contact = pattern['contact_numbers'][0] if pattern['contact_numbers'] else '9667589247'
        
        prompt = f"""You are creating a push notification campaign for {vertical} vertical at Adda247 (Indian exam prep platform).

HISTORICAL DATA FOR {vertical}:
- Total past campaigns: {pattern['total_campaigns']}
- Common personalization tokens: {tokens_str}
- Typical discounts: {discounts_str}
- Best send time: {times_str}
- Contact: {contact}
"""
        
        if event:
            prompt += f"""

UPCOMING EVENT:
- Event: {event['name']}
- Days until event: {event['days_until']}
- Urgency: {event['urgency']}
- Tags: {', '.join(event['tags'])}

MAKE THE CAMPAIGN RELEVANT TO THIS EVENT!
"""
        
        if context:
            prompt += f"""

ADDITIONAL CONTEXT:
{json.dumps(context, indent=2)}
"""
        
        prompt += """

GENERATE A CAMPAIGN WITH:
1. Hook (engaging, max 80 chars, use emojis strategically)
2. Push Copy (compelling, 100-150 words, include personalization tokens, event tie-in)
3. CTA (action-oriented, max 20 chars)
4. Promo Code (catchy, 4-8 chars, event-themed if applicable)
5. Discount (attractive percentage)
6. User Segment (target audience description)
7. Scheduled Time (best time based on historical data)
8. Product IDs (sample 3-5 relevant product IDs from historical data)

REQUIREMENTS:
- Use {{Username}} and other personalization tokens
- Include contact number if relevant: 9667589247
- Make it urgent but not spammy
- Tie to the event naturally
- Use emoji strategically (2-4 emojis max)

Return ONLY valid JSON:
{
  "hook": "...",
  "push_copy": "...",
  "cta": "...",
  "promo_code": "...",
  "discount": "...",
  "user_segment": "...",
  "scheduled_time": "...",
  "product_ids": ["...", "..."],
  "personalization_tokens": ["Username", "..."],
  "contact_number": "9667589247",
  "event_context": "..."
}
"""
        
        url = f"{AZURE_OPENAI_ENDPOINT}/openai/deployments/{AZURE_OPENAI_DEPLOYMENT_NAME}/chat/completions?api-version={AZURE_OPENAI_API_VERSION}"
        
        headers = {
            "Content-Type": "application/json",
            "api-key": AZURE_OPENAI_API_KEY
        }
        
        payload = {
            "messages": [
                {"role": "system", "content": "You are an expert marketing copywriter for Indian exam preparation platforms. Always return valid JSON."},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.8,
            "max_tokens": 800,
            "top_p": 0.95
        }
        
        try:
            response = requests.post(url, headers=headers, json=payload, timeout=30)
            response.raise_for_status()
            
            result = response.json()
            content = result['choices'][0]['message']['content']
            
            # Extract JSON from markdown code blocks if present
            if '```json' in content:
                content = content.split('```json')[1].split('```')[0].strip()
            elif '```' in content:
                content = content.split('```')[1].split('```')[0].strip()
            
            generated = json.loads(content)
            generated['vertical'] = vertical
            generated['generated_at'] = datetime.now().isoformat()
            
            if event:
                generated['event_name'] = event['name']
                generated['event_date'] = event['date']
                generated['days_until_event'] = event['days_until']
            
            return generated
            
        except Exception as e:
            print(f"    ⚠️ Error generating for {vertical}: {str(e)}")
            return None
    
    def run_full_automation(self):
        """Run complete automation pipeline"""
        print("\n" + "="*70)
        print("🚀 MARCOM AUTOMATION PIPELINE - FULL RUN")
        print("="*70)
        
        # Step 1: Load historical data
        self.load_historical_data()
        
        # Step 2: Analyze patterns
        self.analyze_patterns()
        
        # Step 3: Detect upcoming events
        self.detect_upcoming_events()
        
        # Step 4: Generate campaigns for top verticals
        print("\n🤖 Generating AI Campaigns...")
        
        top_verticals = sorted(
            self.patterns_by_vertical.items(),
            key=lambda x: x[1]['total_campaigns'],
            reverse=True
        )[:10]  # Top 10 verticals
        
        for vertical, pattern in top_verticals:
            print(f"\n  📝 {vertical} ({pattern['total_campaigns']} historical campaigns)")
            
            # Generate for next 3 most urgent events
            for event in self.upcoming_events[:3]:
                if event['urgency'] in ['high', 'medium']:
                    print(f"    🎯 Event: {event['name']} (in {event['days_until']} days)")
                    
                    campaign = self.generate_campaign_with_ai(vertical, event)
                    
                    if campaign:
                        self.generated_campaigns.append(campaign)
                        print(f"    ✅ Generated campaign")
                        print(f"       Hook: {campaign.get('hook', 'N/A')[:60]}...")
                        print(f"       Code: {campaign.get('promo_code', 'N/A')}")
                        print(f"       Discount: {campaign.get('discount', 'N/A')}")
        
        # Step 5: Save output
        output_dir = self.base_dir / 'sheet-spark-63' / 'marcom-output'
        output_dir.mkdir(exist_ok=True)
        
        # Save patterns
        with open(output_dir / 'patterns_by_vertical.json', 'w', encoding='utf-8') as f:
            json.dump(self.patterns_by_vertical, f, indent=2, ensure_ascii=False)
        
        # Save upcoming events
        with open(output_dir / 'upcoming_events.json', 'w', encoding='utf-8') as f:
            json.dump(self.upcoming_events, f, indent=2, ensure_ascii=False)
        
        # Save generated campaigns
        with open(output_dir / 'ai_generated_campaigns.json', 'w', encoding='utf-8') as f:
            json.dump(self.generated_campaigns, f, indent=2, ensure_ascii=False)
        
        # Create campaign calendar
        calendar = self._create_campaign_calendar()
        with open(output_dir / 'campaign_calendar.json', 'w', encoding='utf-8') as f:
            json.dump(calendar, f, indent=2, ensure_ascii=False)
        
        # Generate Excel export
        self._export_to_excel(output_dir)
        
        print("\n" + "="*70)
        print("📊 PIPELINE SUMMARY")
        print("="*70)
        print(f"Historical Campaigns Analyzed: {len(self.historical_data)}")
        print(f"Verticals Identified: {len(self.patterns_by_vertical)}")
        print(f"Upcoming Events Detected: {len(self.upcoming_events)}")
        print(f"AI Campaigns Generated: {len(self.generated_campaigns)}")
        print(f"Output Directory: {output_dir}")
        print("="*70)
        
        return {
            'campaigns_generated': len(self.generated_campaigns),
            'output_dir': str(output_dir)
        }
    
    def _create_campaign_calendar(self):
        """Create a campaign calendar"""
        calendar = defaultdict(list)
        
        for campaign in self.generated_campaigns:
            event_date = campaign.get('event_date', 'Unknown')
            calendar[event_date].append({
                'vertical': campaign.get('vertical'),
                'hook': campaign.get('hook'),
                'promo_code': campaign.get('promo_code'),
                'discount': campaign.get('discount'),
                'scheduled_time': campaign.get('scheduled_time'),
                'event_name': campaign.get('event_name'),
            })
        
        return dict(calendar)
    
    def _export_to_excel(self, output_dir):
        """Export campaigns to Excel for easy review"""
        if not self.generated_campaigns:
            return
        
        df = pd.DataFrame(self.generated_campaigns)
        
        # Reorder columns for readability
        col_order = ['vertical', 'event_name', 'days_until_event', 'hook', 'push_copy', 
                     'cta', 'promo_code', 'discount', 'user_segment', 'scheduled_time',
                     'contact_number', 'product_ids', 'personalization_tokens']
        
        for col in col_order:
            if col not in df.columns:
                df[col] = None
        
        df = df[[col for col in col_order if col in df.columns]]
        
        output_file = output_dir / 'generated_campaigns.xlsx'
        df.to_excel(output_file, index=False, engine='openpyxl')
        
        print(f"\n💾 Exported to Excel: {output_file}")

def main():
    base_dir = Path(__file__).parent.parent.parent
    pipeline = MarComAutomationPipeline(base_dir)
    pipeline.run_full_automation()

if __name__ == "__main__":
    main()

