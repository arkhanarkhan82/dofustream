import os
import json
import time
import re
import urllib.request
import ssl
from datetime import datetime

# ==========================================
# 1. CONFIGURATION & CONSTANTS
# ==========================================
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
CMS_ROOT = os.path.dirname(CURRENT_DIR)  # production_output/live cms
DATA_DIR = os.path.join(CMS_ROOT, 'data')
ASSETS_DIR = os.path.join(CMS_ROOT, 'assets')
OUTPUT_DIR = CMS_ROOT  # Root of the site

CONFIG_PATH = os.path.join(DATA_DIR, 'config.json')
TEMPLATE_PATH = os.path.join(ASSETS_DIR, 'master_template.html')
LEAGUE_MAP_PATH = os.path.join(ASSETS_DIR, 'data', 'league_map.json')

# Output Files
INDEX_PATH = os.path.join(OUTPUT_DIR, 'index.html')
WATCH_DIR = os.path.join(OUTPUT_DIR, 'watch')

# Default API URL (Fallback)
DEFAULT_API_URL = "https://vercelapi-olive.vercel.app/api/sync-nodes?country=us"
API_URL = DEFAULT_API_URL  # Will be overwritten by config

# Image Directories
TSDB_DIR = os.path.join(ASSETS_DIR, "logos", "tsdb")
STREAMED_DIR = os.path.join(ASSETS_DIR, "logos", "streamed")
LEAGUE_DIR = os.path.join(ASSETS_DIR, "logos", "leagues")
STREAMED_HASH_BASE = "https://streamed.pk/api/images/badge/"

# SSL Context
SSL_CONTEXT = ssl._create_unverified_context()
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

# League Whitelist for Cleaning
ALLOWED_LEAGUES_INPUT = """
NFL, NBA, MLB, NHL, College Football, College-Football, College Basketball, College-Basketball, 
NCAAB, NCAAF, NCAA Men, NCAA-Men, NCAA Women, NCAA-Women, Premier League, Premier-League, 
Champions League, Champions-League, MLS, Bundesliga, Serie-A, Serie A, American-Football, American Football, 
Ice Hockey, Ice-Hockey, Championship, Scottish Premiership, Scottish-Premiership, 
Europa League, Europa-League, A League, A-League, A League Men, A League Women, 
Ligue 1, La Liga, Eredivisie, Primeira Liga, Saudi Pro League, F1, UFC, Rugby
"""
VALID_LEAGUES = {x.strip().lower() for x in ALLOWED_LEAGUES_INPUT.split(',') if x.strip()}


# ==========================================
# 2. UTILS
# ==========================================
def load_json(path):
    if not os.path.exists(path):
        return {}
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"⚠️ Error loading JSON {path}: {e}")
        return {}

def save_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"💾 Saved: {os.path.basename(path)}")

def slugify(text):
    if not text: return ""
    text = text.lower()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s_-]+', '-', text)
    return text.strip('-')

# --- IMAGE DOWNLOADER UTILS ---
def clean_display_name(name):
    if not name: return None
    # Rule 1: Colon
    if ':' in name:
        parts = name.split(':', 1)
        if len(parts) > 1:
            cleaned = parts[1].strip()
            if cleaned and len(cleaned) > 1:
                return cleaned
    # Rule 2: Whitelist
    lower_name = name.lower()
    for league in VALID_LEAGUES:
        if lower_name.startswith(league):
            remainder = name[len(league):]
            clean_remainder = re.sub(r"^[\s-]+", "", remainder)
            if clean_remainder and len(clean_remainder.strip()) > 1:
                return clean_remainder.strip()
    return name.strip()

def resolve_url(source_val):
    if not source_val: return None
    if source_val.startswith("http"): return source_val
    return f"{STREAMED_HASH_BASE}{source_val}.webp"

def download_file(url, save_path):
    # Simple check: 60 days
    if os.path.exists(save_path):
        age = (time.time() - os.path.getmtime(save_path)) / (24 * 3600)
        if age < 60: return False # Skip if fresh

    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, context=SSL_CONTEXT, timeout=8) as response:
            if response.status == 200:
                data = response.read()
                with open(save_path, "wb") as f:
                    f.write(data)
                return True
    except:
        pass
    return False

def sync_images(matches):
    print("--- 🖼️ Starting Image Sync ---")
    os.makedirs(STREAMED_DIR, exist_ok=True)
    os.makedirs(LEAGUE_DIR, exist_ok=True)
    
    count = 0
    for m in matches:
        # Teams
        for raw_name, img_obj in [(m.get('home_team'), m.get('home_team_image')), 
                                  (m.get('away_team'), m.get('away_team_image'))]:
            name = clean_display_name(raw_name)
            slug = slugify(name)
            if not slug: continue
            
            # Save Path
            path = os.path.join(STREAMED_DIR, f"{slug}.webp")
            
            # Get URL list
            urls = []
            if isinstance(img_obj, dict): urls = list(img_obj.values())
            elif isinstance(img_obj, list): urls = img_obj
            elif isinstance(img_obj, str): urls = [img_obj]
            
            # Download first valid
            for u in urls:
                final_url = resolve_url(u)
                if final_url and download_file(final_url, path):
                    count += 1
                    break
        
        # League
        l_raw = m.get('league')
        l_imgs = m.get('league_image')
        if l_raw and l_imgs:
            l_slug = slugify(l_raw)
            if l_slug:
                 path = os.path.join(LEAGUE_DIR, f"{l_slug}.webp")
                 urls = []
                 if isinstance(l_imgs, dict): urls = list(l_imgs.values())
                 elif isinstance(l_imgs, list): urls = l_imgs
                 elif isinstance(l_imgs, str): urls = [l_imgs]
                 
                 for u in urls:
                    final_url = resolve_url(u)
                    if final_url and download_file(final_url, path):
                        count += 1
                        break
                        
    print(f"✅ Images Synced: {count} new/updated files.")


# ==========================================
# 3. CORE PROCESSING
# ==========================================
def fetch_live_data(api_url):
    print(f"🌍 Fetching Data from {api_url}...")
    try:
        req = urllib.request.Request(api_url, headers=HEADERS)
        with urllib.request.urlopen(req, context=SSL_CONTEXT, timeout=15) as response:
            if response.status == 200:
                data = json.loads(response.read().decode('utf-8'))
                return data.get('matches', [])
            else:
                print(f"❌ API Error: {response.status}")
                return []
    except Exception as e:
        print(f"❌ Connection Failed: {e}")
        return []

def inject_variables(html, config, title=None, is_home=False):
    """
    Robust injection of variables into the template.
    Refactored to avoid regex stripping of un-replaced variables.
    """
    settings = config.get('site_settings', {})
    theme = config.get('theme', {})
    
    # 1. Basic Strings
    replacements = {
        '{{SITE_NAME}}': f"{settings.get('title_part_1','Stream')}{settings.get('title_part_2','East')}",
        '{{API_URL}}': settings.get('api_url', DEFAULT_API_URL),
        '{{TARGET_COUNTRY}}': settings.get('target_country', 'US'),
        '{{PARAM_LIVE}}': settings.get('param_live', 'stream'),
        '{{PARAM_INFO}}': settings.get('param_info', 'livestream'),
        '{{SITE_DOMAIN}}': settings.get('domain', ''), 
        
        # SEO
        '{{META_TITLE}}': settings.get('title_part_1','') + settings.get('title_part_2','') if not title else title,
        '{{META_DESC}}': "Live sports streaming schedule.",
        '{{CANONICAL_URL}}': f"https://{settings.get('domain','')}",
        '{{FAVICON}}': settings.get('favicon_url', '/favicon.ico'),
        '{{OG_IMAGE}}': settings.get('logo_url', ''),
        
        # Theme Colors (Default fallbacks if missing)
        '{{THEME_BRAND_PRIMARY}}': theme.get('brand_primary', '#d00000'),
        '{{THEME_BRAND_DARK}}': theme.get('brand_dark', '#8a0000'),
        '{{THEME_STATUS_GREEN}}': theme.get('status_green', '#00e676'),
        '{{THEME_ACCENT_GOLD}}': theme.get('accent_gold', '#ffd700'),
        '{{THEME_BG_BODY}}': theme.get('bg_body', '#050505'),
        '{{THEME_BG_PANEL}}': theme.get('bg_panel', '#0f0f0f'),
        '{{THEME_TEXT_MAIN}}': theme.get('text_main', '#ffffff'),
        '{{THEME_TEXT_MUTED}}': theme.get('text_muted', '#888888'),
        '{{THEME_BORDER_COLOR}}': theme.get('border_color', '#222222'),

        # Placeholders to prevent 404s if missing
        '{{HEADER_MENUS}}': '',
        '{{HERO_MENUS}}': '',
        '{{FOOTER_MENUS}}': '',
        '{{LOGO_PRELOAD}}': '',
        '{{SCHEMA_BLOCK}}': '',
        '{{THEME_BG_GLASS}}': 'rgba(0,0,0,0.5)', # Fallback
        '{{META_KEYWORDS}}': '',
        '{{THEME_META_COLOR}}': '#000000',
        '{{OG_MIME}}': 'image/png'
    }
    
    # Apply Basic Replacements
    for tag, value in replacements.items():
        if value is None: value = ""
        html = html.replace(tag, str(value))

    # 2. JSON Objects (Safe Injection)
    # JS Priorities
    priorities = config.get('sport_priorities', {})
    html = html.replace('{{JS_PRIORITIES}}', json.dumps(priorities))
    
    # JS Theme Config
    html = html.replace('{{JS_THEME_CONFIG}}', json.dumps(theme))
    
    # League Map
    league_map = load_json(LEAGUE_MAP_PATH)
    html = html.replace('{{JS_LEAGUE_MAP}}', json.dumps(league_map))

    # 3. Clean remaining tags (CAREFULLY)
    # Only remove Uppercase tags that look like {{TAG}}
    html = re.sub(r'\{\{[A-Z0-9_]+\}\}', '', html)
    
    return html

# ==========================================
# 4. MAIN BUILD
# ==========================================
def main():
    print("--- 🚀 Starting Build Engine ---")
    
    # 1. Load Config
    config = load_json(CONFIG_PATH)
    if not config:
        print("⚠️ Config missing/empty. Using defaults.")
        config = {} # fallback
        
    api_url = config.get('site_settings', {}).get('api_url', DEFAULT_API_URL)
    
    # 2. Fetch Data
    matches = fetch_live_data(api_url)
    if not matches:
        print("⚠️ No match data found. Generating empty index.")
    
    # 3. Download Images (Merged Step)
    sync_images(matches)
    
    # 4. Load Template
    if not os.path.exists(TEMPLATE_PATH):
        print("❌ Master Template Not Found!")
        return
        
    with open(TEMPLATE_PATH, 'r', encoding='utf-8') as f:
        template_html = f.read()

    # 5. Generate Index
    print("🔨 Generating Index...")
    final_html = inject_variables(template_html, config, is_home=True)
    save_file(INDEX_PATH, final_html)
    
    print("--- ✅ Build Complete ---")

if __name__ == "__main__":
    main()
