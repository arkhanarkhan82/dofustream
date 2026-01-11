import json
import os
import re

# CONFIGURATION
CONFIG_PATH = 'data/config.json'
LEAGUE_MAP_PATH = 'assets/data/league_map.json'
TEMPLATE_PATH = 'assets/master_template.html'
OUTPUT_DIR = '.' 

def load_json(path):
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as f: return json.load(f)
    return {}

def normalize_key(s):
    return re.sub(r'[^a-z0-9]', '', s.lower())

def render_page(template, config, page_data):
    html = template
    # Basic replacements
    for k, v in config.get('site_settings', {}).items():
        html = html.replace(f'{{{{{k.upper()}}}}}', str(v))
    
    # Page specific
    html = html.replace('{{META_TITLE}}', page_data.get('meta_title', ''))
    html = html.replace('{{META_DESC}}', page_data.get('meta_desc', ''))
    html = html.replace('{{H1_TITLE}}', page_data.get('title', ''))
    html = html.replace('{{ARTICLE_CONTENT}}', page_data.get('content', ''))
    
    return html

def build_site():
    print("Building site...")
    config = load_json(CONFIG_PATH)
    if not config: return print("No config found")

    # Create dummy template if missing
    if not os.path.exists(TEMPLATE_PATH):
        os.makedirs(os.path.dirname(TEMPLATE_PATH), exist_ok=True)
        with open(TEMPLATE_PATH, 'w') as f: f.write("<!DOCTYPE html><html><head><title>{{META_TITLE}}</title></head><body><h1>{{H1_TITLE}}</h1>{{ARTICLE_CONTENT}}</body></html>")

    with open(TEMPLATE_PATH, 'r', encoding='utf-8') as f: template = f.read()

    # Build Pages
    for page in config.get('pages', []):
        slug = page.get('slug')
        if not slug: continue
        
        html = render_page(template, config, page)
        
        out_dir = os.path.join(OUTPUT_DIR, slug) if slug != 'home' else OUTPUT_DIR
        os.makedirs(out_dir, exist_ok=True)
        with open(os.path.join(out_dir, 'index.html'), 'w', encoding='utf-8') as f:
            f.write(html)
            
    print("Build complete.")

if __name__ == "__main__":
    build_site()
