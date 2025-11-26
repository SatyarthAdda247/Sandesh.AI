#!/usr/bin/env python3
"""
Process Sample Pushes.csv to extract training patterns for AI campaign generation.
Extracts patterns by category/tonality to improve generation quality.
"""

import pandas as pd
import json
import re
from pathlib import Path
from collections import defaultdict

def clean_text(text):
    """Clean and normalize text."""
    if pd.isna(text) or not text:
        return ""
    text = str(text).strip()
    # Remove extra whitespace
    text = re.sub(r'\s+', ' ', text)
    return text

def extract_category(category_str):
    """Extract and normalize category/tonality."""
    if pd.isna(category_str) or not category_str:
        return "General"
    
    category = str(category_str).strip()
    
    # Map to standard tonalities
    category_lower = category.lower()
    if "fomo" in category_lower or "urgency" in category_lower:
        return "fomo"
    elif "breaking" in category_lower or "announcement" in category_lower:
        return "serious"
    elif "multiple" in category_lower or "value" in category_lower:
        return "celebratory"
    elif "curiosity" in category_lower or "psychological" in category_lower:
        return "friendly"
    elif "simple" in category_lower or "product" in category_lower:
        return "serious"
    elif "feel good" in category_lower:
        return "motivational"
    elif "regional" in category_lower or "fest" in category_lower:
        return "celebratory"
    else:
        return "friendly"  # Default

def process_sample_pushes(csv_path):
    """Process the Sample Pushes CSV and extract patterns."""
    
    print(f"Reading {csv_path}...")
    
    # Read CSV - handle multi-line cells
    df = pd.read_csv(csv_path, encoding='utf-8', quotechar='"', skipinitialspace=True)
    
    # Clean column names
    df.columns = df.columns.str.strip()
    
    # Get column names (first column might be unnamed)
    cols = list(df.columns)
    print(f"Found columns: {cols}")
    
    # Find the right columns
    category_col = None
    title_col = None
    desc_col = None
    cta_col = None
    
    for col in cols:
        col_lower = col.lower()
        if "category" in col_lower or col == "" or col == "Unnamed: 0":
            category_col = col
        elif "title" in col_lower:
            title_col = col
        elif "desc" in col_lower:
            desc_col = col
        elif "cta" in col_lower:
            cta_col = col
    
    print(f"Using columns: category={category_col}, title={title_col}, desc={desc_col}, cta={cta_col}")
    
    # Group by category
    patterns_by_category = defaultdict(list)
    
    for idx, row in df.iterrows():
        category = extract_category(row.get(category_col, ""))
        title = clean_text(row.get(title_col, ""))
        desc = clean_text(row.get(desc_col, ""))
        cta = clean_text(row.get(cta_col, ""))
        
        if not title and not desc:
            continue
        
        pattern = {
            "hook": title,
            "body": desc,
            "cta": cta,
            "full_message": f"{title}\n\n{desc}\n\n{cta}".strip()
        }
        
        patterns_by_category[category].append(pattern)
    
    # Convert to final structure
    training_data = {
        "categories": {},
        "statistics": {}
    }
    
    for category, patterns in patterns_by_category.items():
        training_data["categories"][category] = {
            "count": len(patterns),
            "examples": patterns[:20],  # Limit to top 20 per category
            "common_hooks": [p["hook"] for p in patterns if p["hook"]][:10],
            "common_ctas": [p["cta"] for p in patterns if p["cta"]][:10],
            "structure_patterns": {
                "avg_hook_length": sum(len(p["hook"]) for p in patterns) / max(len(patterns), 1),
                "avg_body_length": sum(len(p["body"]) for p in patterns) / max(len(patterns), 1),
                "uses_emojis": sum(1 for p in patterns if any(ord(c) > 127 for c in p["full_message"])) / max(len(patterns), 1),
                "uses_bullets": sum(1 for p in patterns if "▶" in p["body"] or "✔" in p["body"] or "👉" in p["body"]) / max(len(patterns), 1),
            }
        }
        training_data["statistics"][category] = len(patterns)
    
    return training_data

def main():
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    csv_path = project_root.parent / "Sample Pushes.csv"
    output_path = project_root / "public" / "analysis-output" / "sample_pushes_training.json"
    
    if not csv_path.exists():
        print(f"Error: {csv_path} not found!")
        return
    
    print("Processing Sample Pushes CSV...")
    training_data = process_sample_pushes(csv_path)
    
    # Save to JSON
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(training_data, f, indent=2, ensure_ascii=False)
    
    print(f"\n✅ Training data extracted successfully!")
    print(f"📊 Categories found: {list(training_data['categories'].keys())}")
    print(f"📈 Total patterns: {sum(training_data['statistics'].values())}")
    print(f"💾 Saved to: {output_path}")
    
    # Print summary
    print("\n📋 Category Summary:")
    for cat, count in training_data['statistics'].items():
        print(f"  - {cat}: {count} examples")

if __name__ == "__main__":
    main()

