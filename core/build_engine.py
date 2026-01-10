import json
import os
import urllib.request
import ssl
import re

# ==========================================
# 1. CONFIGURATION
# ==========================================
# file is in: production_output/New CMS/scripts/build_engine.py
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
CMS_ROOT = os.path.dirname(CURRENT_DIR) # production_output/New CMS
CONFIG_PATH = os.path.join(CMS_ROOT, 'data', 'config.json')
OUTPUT_PREVIEW_JSON = os.path.join(CMS_ROOT, '_debug', 'temp_build_data.json')

API_URL = "https://vercelapi-olive.vercel.app/api/sync-nodes?country=us"

# ==========================================
# 2. DATA UTILS
# ==========================================

def slugify(text):
    return re.sub(r'[^a-z0-9]', '', text.lower())

def load_json(path):
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"❌ Error: Config file not found at {path}")
        return None
    except json.JSONDecodeError:
        print(f"❌ Error: Invalid JSON in {path}")
        return None

def fetch_live_data():
    """
    Fetches raw node data from Vercel API.
    """
    print(f"🌍 Fetching live data from {API_URL}...")
    try:
        # Create unverified context to avoid SSL errors with urllib if certs are missing
        context = ssl._create_unverified_context()
        with urllib.request.urlopen(API_URL, context=context, timeout=10) as response:
            if response.status == 200:
                raw = response.read().decode('utf-8')
                try:
                    data = json.loads(raw)
                    print(f"✅ Successfully fetched data.")
                    return data
                except json.JSONDecodeError:
                    print(f"❌ JSON Decode Error. Raw partial: {raw[:100]}")
                    return []
            else:
                print(f"❌ API Error: Status {response.status}")
                return []
    except Exception as e:
        print(f"❌ Network Error: {e}")
        return []

def organize_entity_stack(raw_nodes):
    """
    Transforms flat list into Dictionary:
    {
        "soccer": {
            "premier-league": [Match1, Match2, ...],
            "la-liga": [...]
        },
        "basketball": { ... }
    }
    """
    print("🏗️  Organizing Entity Stack...")
    stack = {}

    raw_list = []
    if isinstance(raw_nodes, list):
        raw_list = raw_nodes
    elif isinstance(raw_nodes, dict) and 'matches' in raw_nodes:
        print("🔍 Found 'matches' key in response.")
        raw_list = raw_nodes['matches']
    else:
        print(f"⚠️  Unknown API structure. Type: {type(raw_nodes)}")
        return stack

    for node in raw_list:
        if not isinstance(node, dict):
            continue

        # Extract Fields
        # We need to handle potential missing keys gracefully
        sport = node.get('sport')
        league = node.get('league')
        
        if not sport: 
            # Try to infer or skip
            sport = 'uncategorized'
        
        if not league:
            league = 'other'

        sport_slug = str(sport).lower().strip().replace(' ', '-')
        league_slug = str(league).lower().strip().replace(' ', '-')

        # Init Dicts
        if sport_slug not in stack:
            stack[sport_slug] = {}
        
        if league_slug not in stack[sport_slug]:
            stack[sport_slug][league_slug] = []
            
        stack[sport_slug][league_slug].append(node)

    return stack

def generate_match_row(match):
    """
    Creates the HTML string for a single match row.
    Matches the Structure expected by CSS: .match-row
    """
    mid = match.get('id', '')
    home = match.get('home_team', 'Home')
    away = match.get('away_team', 'Away')
    time_str = match.get('status_text', 'VS') # Default to VS if no time
    
    # Images (Handling different sources in the dict)
    h_img_obj = match.get('home_team_image', {})
    a_img_obj = match.get('away_team_image', {})
    
    # Priority: sport-tv-guide (Full URL) > streamed (Likely hash/slug, requires handling)
    h_img = h_img_obj.get('sport-tv-guide') or h_img_obj.get('streamed') or ''
    a_img = a_img_obj.get('sport-tv-guide') or a_img_obj.get('streamed') or ''
    
    # Check if live
    is_live = match.get('is_live', False)
    live_class = "live" if is_live else ""
    
    # Action Button Logic (Hydrated but with static fallback)
    # NOTE: Phase 3 Upgrade - we want a valid link immediately if possible.
    # We will point to the watch page with a query param.
    link = f"/watch/?streams={mid}"
    btn_html = f'<a href="{link}" class="btn-watch">Watch</a>'

    html = f'''
    <div class="match-row {live_class}" data-match-id="{mid}">
        <div class="col-time">
            <span class="time-main">{time_str}</span>
        </div>
        <div class="teams-wrapper">
            <div class="team-name">
                <div class="logo-box"><img src="{h_img}" class="t-img" loading="lazy" alt="{home}"></div>
                {home}
            </div>
            <div class="team-name">
                <div class="logo-box"><img src="{a_img}" class="t-img" loading="lazy" alt="{away}"></div>
                {away}
            </div>
        </div>
        <div class="col-meta">
            <span class="meta-top">{match.get('league', '')}</span>
        </div>
        <div class="col-action">
            {btn_html}
        </div>
    </div>
    '''
    return html

def generate_static_schema(matches, site_domain):
    """
    Generates a full JSON-LD schema block for the matched list.
    Phase 3 Requirement: Static First.
    """
    items = []
    for i, m in enumerate(matches):
        mid = m.get('id')
        home = m.get('home_team', 'Home')
        away = m.get('away_team', 'Away')
        # ... Basic Schema Construction ...
        # This is a simplified version for the demo to match what JS was doing
        
        item = {
            "@type": "ListItem",
            "position": i + 1,
            "item": {
                "@type": "SportsEvent",
                "name": f"{home} vs {away}",
                "description": f"Watch {home} vs {away} live stream.",
                "url": f"https://{site_domain}/watch/?streams={mid}",
                "startDate": m.get("startTime", ""), # ideally convert regex to ISO
                "homeTeam": { "@type": "SportsTeam", "name": home },
                "awayTeam": { "@type": "SportsTeam", "name": away }
            }
        }
        items.append(item)

    schema = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "itemListElement": items
    }
    return json.dumps(schema)

# ==========================================
# 3. MAIN
# ==========================================
def main():
    print("🚀 Starting Build Engine... [SEO Skeleton Mode]")
    print(f"📂 CMS Root: {CMS_ROOT}")
    
    # 1. Load Config 
    config = load_json(CONFIG_PATH)
    if not config:
        print("⚠️  Warning: proceeding without local config.")

    # 2. Fetch API
    raw_data = fetch_live_data()
    if not raw_data:
        print("❌ Build Failed: No data fetched.")
        return

    # 3. Organize Data
    entity_stack = organize_entity_stack(raw_data)
    
    # DEBUG: Dump Raw
    RAW_DEBUG = os.path.join(CMS_ROOT, '_debug', 'raw_fetch.json')
    try:
        os.makedirs(os.path.dirname(RAW_DEBUG), exist_ok=True)
        with open(RAW_DEBUG, 'w', encoding='utf-8') as f:
            json.dump(raw_data, f, indent=4)
        print(f"🐛 Saved raw data to {RAW_DEBUG}")
    except: pass

    # --- NEW: Load Config for Filtering ---
    config = load_json(os.path.join(CMS_ROOT, 'data', 'config.json'))
    target_country = config.get('site_settings', {}).get('target_country', 'US')
    priorities = config.get('sport_priorities', {}).get(target_country, {})
    
    # Build Allowed List (Normalized)
    allowed_leagues = {}
    for name, data in priorities.items():
        if isinstance(data, dict) and data.get('hasLink'):
            # simple normalization to match API keys if possible
            # We map "Display Name" -> Data
            allowed_leagues[name.lower()] = data

    print(f"📋 Admin Panel Rules: Found {len(allowed_leagues)} enabled leagues for {target_country}")

    # 4. Generate HTML Pages
    print("🔨 Generating Static HTML...")
    template_path = os.path.join(CMS_ROOT, 'assets', 'master_template.html')
    if not os.path.exists(template_path):
        print(f"❌ Template not found at {template_path}")
        return

    with open(template_path, 'r', encoding='utf-8') as f:
        master_html = f.read()

    # Create Pages
    processed_count = 0
    for sport, leagues in entity_stack.items():
        for league, matches in leagues.items():
            
            # --- FILTERING LOGIC ---
            # Check if this league is in the allowed list
            # We try exact match first, then fuzzy or partial
            is_allowed = False
            config_league_name = league # Default to API name
            
            # 1. Direct key match (lowercased)
            if league.lower() in allowed_leagues:
                is_allowed = True
                config_league_name = league.title() 
            else:
                # 2. Search in allowed keys
                for allowed_name in allowed_leagues.keys():
                    if allowed_name in league.lower() or league.lower() in allowed_name:
                        is_allowed = True
                        config_league_name = allowed_name.title() # Use the Config's pretty name
                        break
            
            if not is_allowed:
                # print(f"  ⏩ Skipping {league} (Not checked in Admin Panel)")
                continue

            # Generate Match Rows
            rows_html = ""
            current_matches = matches # matches is already the list for this league
            
            # Retrieve settings for domain usage
            settings = config.get('site_settings', {})
            
            for i, m in enumerate(current_matches):
                try:
                    rows_html += generate_match_row(m)
                except Exception as e:
                    print(f"⚠️  Skipping match index {i} in {sport}/{league}: {e}")
            
            # Inject into Template
            # We replace the grouped-container with the actual content
            page_html = master_html.replace(
                '<div id="grouped-container"></div>', 
                f'<div id="grouped-container" class="static-stack">{rows_html}</div>'
            )
            
            # Schema Injection (Phase 3)
            # We construct the domain from settings or default
            domain = settings.get('domain', 'streameast.guru')
            static_schema_json = generate_static_schema(current_matches, domain)
            
            # We need to inject this into the HEAD. 
            # The template has a placeholder or we append to head.
            # For now, we'll append before </head>
            schema_script = f'<script type="application/ld+json">{static_schema_json}</script>'
            page_html = page_html.replace('</head>', f'{schema_script}\n</head>')
            
            # Basic SEO Injection (Placeholder for now)
            page_html = page_html.replace('{{META_TITLE}}', f"{config_league_name} Live Stream - {sport.title()}")
            page_html = page_html.replace('{{META_DESC}}', f"Watch {config_league_name} live. Full match schedule and streaming links.")
            
            # Cleanup other placeholders to avoid ugly tags
            page_html = page_html.replace('{{HERO_TEXT}}', f"Live {config_league_name} Matches")
            page_html = page_html.replace('{{H1_TITLE}}', config_league_name)

            # --- NEW: Variable Injection Loop ---
            # We assume config has 'theme', 'site_settings', 'social_sharing' etc.
            # We flatten the config to find keys matching {{KEY}}
            
            # 1. Fill Theme Variables
            theme = config.get('theme', {})
            for k, v in theme.items():
                key_upper = f"THEME_{k.upper()}"
                page_html = page_html.replace(f'{{{{{key_upper}}}}}', str(v))
                
            # 2. Fill Site Settings
            settings = config.get('site_settings', {})
            for k, v in settings.items():
                key_upper = k.upper() # e.g. DOMAIN
                page_html = page_html.replace(f'{{{{{key_upper}}}}}', str(v))
                
            # 3. Fill specific known placeholders that might use mixed keys
            page_html = page_html.replace('{{SITE_NAME}}', settings.get('title_part_1', 'Sport') + settings.get('title_part_2', 'Stream'))
            page_html = page_html.replace('{{CANONICAL_URL}}', f"https://{settings.get('domain', '')}/{slugify(config_league_name)}-streams/")
            
            # 4. Clean leftover common placeholders (Text, etc)
            # This is a brute-force cleanup for demo purposes to avoid {{...}} showing up
            page_html = re.sub(r'\{\{[A-Z0-9_]+\}\}', '', page_html)
            
            # Write File with Legacy Slug Logic
            # Legacy: normalize_key(name) + "-streams"
            # Using config_league_name which is the "Pretty Name" from config if matched
            
            slug = slugify(config_league_name) + "-streams"
            if slug == "-streams": slug = slugify(league) + "-streams" # Fallback
            
            # Since user wants "folder per league", we stick to our cleaner structure 
            # BUT we should probably output to `slug` folder to match legacy URLs if they were /slug/index.html
            out_dir = os.path.join(CMS_ROOT, slug) 
            os.makedirs(out_dir, exist_ok=True)
            out_file = os.path.join(out_dir, 'index.html')
            
            try:
                with open(out_file, 'w', encoding='utf-8') as f:
                    f.write(page_html)
                processed_count += 1
            except Exception as e:
                print(f"❌ Failed to write {out_file}: {e}")

    print(f"✅ Generated {processed_count} pages based on Admin Panel settings.")
    
    # Debug Stats
    print(f"📊 Processed {len(entity_stack)} sports.")
    for s, leagues in entity_stack.items():
        print(f"   - {s}: {len(leagues)} leagues")

    # 4. Save to System Core for Inspection
    print(f"💾 Saving processed data to {OUTPUT_PREVIEW_JSON}...")
    try:
        os.makedirs(os.path.dirname(OUTPUT_PREVIEW_JSON), exist_ok=True)
        with open(OUTPUT_PREVIEW_JSON, 'w', encoding='utf-8') as f:
            json.dump(entity_stack, f, indent=4)
        print("✅ Success! Data inspection ready.")
    except Exception as e:
        print(f"❌ File Save Error: {e}")

if __name__ == "__main__":
    main()
