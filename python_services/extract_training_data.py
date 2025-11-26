import pandas as pd
import json
import os
from pathlib import Path

# Define paths
base_dir = Path("/Users/adda247/Downloads/MarCom Automation")
files = [
    base_dir / "AUGUST REVENUE CAMPAIGNS 2025.xlsx",
    base_dir / "JULY REVENUE CAMPAIGNS 2025.xlsx",
    base_dir / "MAY REVENUE CAMPAIGNS 2025.xlsx"
]

output_file = Path("/Users/adda247/Downloads/MarCom Automation/sheet-spark-63/python_services/campaign_knowledge_base.json")

def clean_text(text):
    if pd.isna(text):
        return ""
    return str(text).strip()

knowledge_base = {}

for file_path in files:
    if not file_path.exists():
        print(f"Skipping {file_path} (not found)")
        continue
    
    print(f"Processing {file_path}...")
    try:
        # Read all sheets
        xls = pd.ExcelFile(file_path)
        for sheet_name in xls.sheet_names:
            df = pd.read_excel(file_path, sheet_name=sheet_name)
            
            # Normalize columns
            df.columns = [str(col).strip().lower() for col in df.columns]
            
            # Identify relevant columns
            # We look for common variations of Title, Message, CTA, Vertical
            title_col = next((c for c in df.columns if 'title' in c or 'header' in c), None)
            message_col = next((c for c in df.columns if 'message' in c or 'body' in c or 'desc' in c), None)
            cta_col = next((c for c in df.columns if 'cta' in c or 'call to action' in c), None)
            vertical_col = next((c for c in df.columns if 'vertical' in c or 'category' in c), None)
            
            if not (title_col and message_col):
                continue
                
            for _, row in df.iterrows():
                vertical = clean_text(row[vertical_col]) if vertical_col else "General"
                title = clean_text(row[title_col])
                message = clean_text(row[message_col])
                cta = clean_text(row[cta_col]) if cta_col else ""
                
                if not message:
                    continue
                
                if vertical not in knowledge_base:
                    knowledge_base[vertical] = []
                
                knowledge_base[vertical].append({
                    "title": title,
                    "message": message,
                    "cta": cta,
                    "source": file_path.name
                })
                
    except Exception as e:
        print(f"Error processing {file_path}: {e}")

# Save to JSON
with open(output_file, "w") as f:
    json.dump(knowledge_base, f, indent=2)

print(f"Extracted {sum(len(v) for v in knowledge_base.values())} examples to {output_file}")
