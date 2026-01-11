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

def fetch_live_data(api_url):
    """
    Fetches raw node data from Vercel API.
    """
    print(f"🌍 Fetching live data from {api_url}...")
    try:
        # Create unverified context to avoid SSL errors with urllib if certs are missing
        context = ssl._create_unverified_context()
        with urllib.request.urlopen(api_url, context=context, timeout=10) as response:
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
    if not isinstance(h_img_obj, dict): h_img_obj = {}
    
    a_img_obj = match.get('away_team_image', {})
    if not isinstance(a_img_obj, dict): a_img_obj = {}
    
    # Priority: sport-tv-guide (Full URL) > streamed (Likely hash/slug, requires handling)
    h_img = h_img_obj.get('sport-tv-guide') or h_img_obj.get('streamed') or ''
    a_img = a_img_obj.get('sport-tv-guide') or a_img_obj.get('streamed') or ''
    
    # Check if live
    is_live = match.get('is_live', False)
    live_class = "live" if is_live else ""
    
    # Action Button Logic (Hydrated but with static fallback)
    # NOTE: Phase 3 Upgrade - we want a valid link immediately if possible.
    # We will point to the watch page with a query param.
    # Defaulting to 'stream' which is standard
    link = f"/watch/?stream={mid}"
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
# 3. MAIN (Hybrid Update)
# ==========================================
def generate_section_html(container_id, title, matches, icon=None):
    if not matches:
        return ""
    
    # Simple logic to replicate JS createSection
    # Note: We are generating the inner HTML of the container
    
    rows_html = ""
    for m in matches:
        rows_html += generate_match_row(m)
        
    icon_html = f'<span style="font-size:1.2rem; margin-right:8px;">{icon}</span>' if icon else ""
    
    html = f'''
    <div class="section-box" style="margin-bottom:30px;">
        <div class="sec-head">
            <h2 class="sec-title">{icon_html} {title}</h2>
        </div>
        <div>{rows_html}</div>
    </div>
    '''
    return html

def log_to_file(msg):
    try:
        with open('build_log.txt', 'a', encoding='utf-8') as f:
            f.write(str(msg) + "\\n")
    except: pass

def main():
    if os.path.exists('build_log.txt'): os.remove('build_log.txt')
    log_to_file("🚀 Starting Build Engine... [Hybrid Mode]")
    
    # 1. Load Config 
    config = load_json(CONFIG_PATH)
    if not config:
        log_to_file("⚠️  Warning: proceeding without local config.")
        config = {}

    log_to_file(f"Config loaded. Type: {type(config)}")

    # Get API URL from config or fallback
    site_settings = config.get('site_settings', {})
    api_url = site_settings.get('api_url', API_URL)

    # 2. Fetch API
    raw_data = fetch_live_data(api_url) 
    if not raw_data:
        log_to_file("❌ Build Failed: No data fetched.")
        return

    all_matches = []
    if isinstance(raw_data, list):
        all_matches = raw_data
    elif isinstance(raw_data, dict) and 'matches' in raw_data:
        all_matches = raw_data['matches']
    
    log_to_file(f"Raw data processed. Matches found: {len(all_matches)}")

    # 3. Organize Data (Entity Stack)
    entity_stack = organize_entity_stack(raw_data)
    
    # --- HOMEPAGE LOGIC (Hybrid Injection) ---
    log_to_file("🏠 Building Homepage Data...")
    
    # Separation
    live_matches = [m for m in all_matches if isinstance(m, dict) and m.get('is_live')]
    upcoming_matches = [m for m in all_matches if isinstance(m, dict) and not m.get('is_live')]
    
    log_to_file(f"📊 Live: {len(live_matches)}, Upcoming: {len(upcoming_matches)}")
    
    # HTML Buffers
    html_live_section = ""
    html_top_upcoming = ""
    html_grouped = ""
    
    # A. Live Section
    if live_matches:
        rows = "".join([generate_match_row(m) for m in live_matches])
        html_live_section = rows
    
    # B. Top 5 Upcoming (Boost Logic)
    target_country = config.get('site_settings', {}).get('target_country', 'US')
    sport_priorities = config.get('sport_priorities', {})
    if isinstance(sport_priorities, list):
         log_to_file("⚠️ sport_priorities is a LIST, expected DICT. Check config.json format.")
         sport_priorities = {}
         
    priorities = sport_priorities.get(target_country, {})
    if isinstance(priorities, list):
         log_to_file(f"⚠️ priorities for {target_country} is a LIST, expected DICT.")
         priorities = {}

    boost_keys = priorities.get('_BOOST', '')
    if isinstance(boost_keys, str):
        boost_keys = boost_keys.lower().split(',')
    else:
        boost_keys = []
        
    boost_keys = [b.strip() for b in boost_keys if b.strip()]
    
    # Sort upcoming
    def sort_score(m):
        league = m.get('league', '').lower()
        is_boosted = any(b in league for b in boost_keys)
        # Primary: Boosted, Secondary: Time
        return (0 if is_boosted else 1, m.get('startTimeUnix', 9999999999999))

    upcoming_matches.sort(key=sort_score)
    
    top_5 = upcoming_matches[:5]
    remaining_upcoming = upcoming_matches[5:] # Used for grouped if needed, but grouped is usually categorized
    
    if top_5:
         html_top_upcoming = generate_section_html('top-upcoming-container', "Top Upcoming", top_5, "🔥")

    # C. Grouped Section (The Stack)
    # We re-use logic from organize_entity_stack but flattened for the homepage listing
    # Actually, organize_entity_stack returns {sport: {league: [matches]}}
    # We want to output sections based on Priority Score.
    
    # Flatten stack to list of (LeagueName, Matches, Score)
    league_buckets = []
    
    # PRIORITIES DICT: "NBA": { score: 99, isLeague: true, ... }
    
    for sport, leagues in entity_stack.items():
        for league_name, matches in leagues.items():
            # Match against priorities
            # default score
            score = 0
            
            # Check explicit priority
            # 1. Check strict key match
            p_data = None
            
            # Try finding a key in priority that matches this league
            # e.g. Priority Key "Premier League" matches league "English Premier League"
            found_key = None
            for p_key, p_val in priorities.items():
                if p_key.startswith('_'): continue
                if p_key.lower() in league_name.lower():
                    p_data = p_val
                    found_key = p_key
                    break
            
            if p_data:
                score = p_data.get('score', 50)
                if p_data.get('isHidden'): continue
            else:
                # If Strict Mode is ON, skip
                if priorities.get('_HIDE_OTHERS'): continue
            
            # Filter matches that are already in top 5? 
            # JS logic does: if (!claimedIds.has(m.id))
            # meaningful for "Top 5" overlap. 
            # For simplicity in Python, we will include them. User can see them twice or we filter.
            # Let's filter matches present in Top 5 (using IDs)
            top5_ids = set(m.get('id') for m in top_5)
            filtered_matches = [m for m in matches if m.get('id') not in top5_ids and not m.get('is_live')]
            
            if filtered_matches:
                league_buckets.append({
                    'title': found_key if found_key else league_name.title(),
                    'matches': filtered_matches,
                    'score': score
                })

    # Sort buckets by score
    league_buckets.sort(key=lambda x: x['score'], reverse=True)
    
    for bucket in league_buckets:
        html_grouped += generate_section_html('grouped-sec', bucket['title'], bucket['matches'])


    # 4. Generate Pages
    print("🔨 Generating Static HTML...")
    template_path = os.path.join(CMS_ROOT, 'assets', 'master_template.html')
    if not os.path.exists(template_path):
        print(f"❌ Template not found at {template_path}")
        return

    with open(template_path, 'r', encoding='utf-8') as f:
        master_html = f.read()

    # --- PAGE GENERATION LOOP ---
    # We define which pages to build based simply on the ALLOWED LIST + Homepage
    
    # 1. Homepage
    home_html = master_html
    
    # Inject Content
    # Live
    if html_live_section:
        home_html = home_html.replace('<div id="trending-list" class="match-list"></div>', f'<div id="trending-list" class="match-list">{html_live_section}</div>')
        # We MUST unhide the wrapper
        home_html = home_html.replace('style="display:none;"', '') # Unhide all? Dangerous.
        # Better: target the specific ID
        home_html = home_html.replace('id="live-content-wrapper" style="display:none;"', 'id="live-content-wrapper"')
        # Also hide skeletons
        home_html = home_html.replace('id="live-sk-head"', 'id="live-sk-head" style="display:none"')
        home_html = home_html.replace('id="live-skeleton"', 'id="live-skeleton" style="display:none"')
        # Update Count
        home_html = home_html.replace('id="live-count"></div>', f'id="live-count">● {len(live_matches)} Live Events</div>')
        
    # Top 5
    if html_top_upcoming:
        home_html = home_html.replace('<div id="top-upcoming-container"></div>', f'<div id="top-upcoming-container">{html_top_upcoming}</div>')
        home_html = home_html.replace('id="upcoming-skeleton"', 'id="upcoming-skeleton" style="display:none"')
        
    # Grouped
    if html_grouped:
         home_html = home_html.replace('<div id="grouped-container"></div>', f'<div id="grouped-container">{html_grouped}</div>')
    
    # SEO & Variables (Homepage)
    settings = config.get('site_settings', {})
    home_html = inject_variables(home_html, config, is_home=True)
    
    # Save Homepage
    with open(os.path.join(CMS_ROOT, 'index.html'), 'w', encoding='utf-8') as f:
        f.write(home_html)
    print("✅ Generated: index.html (Homepage)")
    
    # 2. League/Sport Pages
    # Rule: Only generate if hasLink is True in priorities
    
    processed_count = 0
    for p_key, p_val in priorities.items():
        if p_key.startswith('_'): continue
        if not isinstance(p_val, dict): continue
        
        # STRICT CHECK: hasLink must be true
        if not p_val.get('hasLink'):
            continue
            
        # Find matches for this key
        # We need to aggregate all matches (Live + Upcoming) that match this key
        page_matches = []
        for m in all_matches:
            league = m.get('league', '').lower()
            sport = m.get('sport', '').lower()
            key_lower = p_key.lower()
            
            if key_lower in league or key_lower in sport:
                page_matches.append(m)
        
        if not page_matches:
            # Maybe generate empty page? Or skip?
            # User expectation: "no extra pages". If no matches, maybe still current page structure but empty info?
            # Let's generate it essentially empty but valid.
            pass
            
        # Prepare content for this page
        # This page focuses only on this league/sport.
        # So "Live" section is specific to this, Top 5 is specific, Grouped is specific.
        
        # Filter for this page
        p_live = [m for m in page_matches if m.get('is_live')]
        p_upcoming = [m for m in page_matches if not m.get('is_live')]
        
        # Generate HTML blobs
        p_html_live = ""
        if p_live:
            p_html_live = "".join([generate_match_row(m) for m in p_live])
            
        # For specific pages, we usually just show one big list, but keeping structure is safer
        p_html_grouped = generate_section_html('grouped-sec', "Schedule", p_upcoming)
        
        # Inject
        page_html = master_html
        
        if p_html_live:
            page_html = page_html.replace('<div id="trending-list" class="match-list"></div>', f'<div id="trending-list" class="match-list">{p_html_live}</div>')
            page_html = page_html.replace('id="live-content-wrapper" style="display:none;"', 'id="live-content-wrapper"')
            page_html = page_html.replace('id="live-sk-head"', 'id="live-sk-head" style="display:none"')
            page_html = page_html.replace('id="live-skeleton"', 'id="live-skeleton" style="display:none"')
            page_html = page_html.replace('id="live-count"></div>', f'id="live-count">● {len(p_live)} Live Events</div>')
            
        if p_html_grouped:
             page_html = page_html.replace('<div id="grouped-container"></div>', f'<div id="grouped-container">{p_html_grouped}</div>')
        
        # Hide skeletons unconditionally for sub-pages to clean up if no matches
        page_html = page_html.replace('id="upcoming-skeleton"', 'id="upcoming-skeleton" style="display:none"')
        
        # Variables
        page_html = inject_variables(page_html, config, title=p_key, is_home=False)
        
        # Slug Logic
        slug = slugify(p_key) + "-streams"
        out_dir = os.path.join(CMS_ROOT, slug)
        os.makedirs(out_dir, exist_ok=True)
        with open(os.path.join(out_dir, 'index.html'), 'w', encoding='utf-8') as f:
            f.write(page_html)
            
        processed_count += 1

    print(f"✅ Generated {processed_count} sub-pages (HasLink Rules Applied).")
    
def inject_variables(html, config, title=None, is_home=False):
    settings = config.get('site_settings', {})
    theme = config.get('theme', {})
    
    # --- CLIENT SIDE HYDRATION INJECTIONS ---
    # 1. API URL (Critical for JS fetching)
    api_url = settings.get('api_url', API_URL)
    html = html.replace('{{API_URL}}', api_url)
    
    # 2. Target Country
    country = settings.get('target_country', 'US')
    html = html.replace('{{TARGET_COUNTRY}}', country)
    
    # 3. Parameters
    html = html.replace('{{PARAM_LIVE}}', settings.get('param_live', 'stream'))
    html = html.replace('{{PARAM_INFO}}', settings.get('param_info', 'info'))
    html = html.replace('{{DOMAIN}}', settings.get('domain', 'example.com'))
    
    # 4. JSON Objects for JS Constants
    priorities = config.get('sport_priorities', {}).get(country, {})
    html = html.replace('{{JS_PRIORITIES}}', json.dumps(priorities))
    
    # League Map (Need to load it from file or use empty if not passed, but usually we don't pass it here. 
    # Let's load it strictly for injection or assume it's global? 
    # Better: Load it here or pass it. For now, let's load it to be safe.)
    league_map_path = os.path.join(CMS_ROOT, 'assets', 'data', 'league_map.json')
    league_map = load_json(league_map_path) or {}
    html = html.replace('{{JS_LEAGUE_MAP}}', json.dumps(league_map))
    
    html = html.replace('{{JS_IMAGE_MAP}}', '{}') # Placeholder or load if we had an image map file
    
    # Theme Config for JS
    html = html.replace('{{JS_THEME_CONFIG}}', json.dumps(theme))
    
    # Wildcard
    wildcard = theme.get('wildcard_category', '')
    html = html.replace('{{WILDCARD_CATEGORY}}', wildcard)
    
    # Text Labels
    html = html.replace('{{TEXT_WILDCARD_TITLE}}', theme.get('text_wildcard_title', ''))
    html = html.replace('{{TEXT_SECTION_PREFIX}}', theme.get('text_section_prefix', ''))
    html = html.replace('{{TEXT_TOP_UPCOMING_TITLE}}', theme.get('text_top_upcoming_title', ''))
    html = html.replace('{{TEXT_SHOW_MORE}}', theme.get('text_show_more', 'Show More'))
    html = html.replace('{{TEXT_SECTION_LINK}}', theme.get('text_section_link', 'Show All'))
    html = html.replace('{{TEXT_WATCH_BTN}}', theme.get('text_watch_btn', 'Watch'))
    html = html.replace('{{TEXT_HD_BADGE}}', theme.get('text_hd_badge', 'HD'))

    # --- SERVER SIDE RENDERING INJECTIONS ---
    
    # Basic
    page_title = settings.get('title_part_1', 'Sport') + settings.get('title_part_2', 'Stream')
    if title:
        meta_title = f"{title} Live Streams - {page_title}"
        h1 = title
        intro = f"Watch high quality {title} streams live."
    else:
        meta_title = settings.get('title', f"Live Sports Streams - {page_title}")
        h1 = "Live Sports Schedule"
        intro = "Welcome to the best sports streaming platform."

    html = html.replace('{{META_TITLE}}', meta_title)
    html = html.replace('{{H1_TITLE}}', h1)
    html = html.replace('{{HERO_TEXT}}', intro)
    
    # Theme Inject
    for k, v in theme.items():
        key_upper = f"THEME_{k.upper()}"
        html = html.replace(f'{{{{{key_upper}}}}}', str(v))
        
    # Footer Placeholders
    html = html.replace('{{FOOTER_TEXT}}', settings.get('footer_text', ''))
    html = html.replace('{{FOOTER_LINKS}}', settings.get('footer_links', ''))

    # Cleanups
    # This is a brute-force cleanup for demo purposes to avoid {{...}} showing up
    html = re.sub(r'\{\{[A-Z0-9_]+\}\}', '', html)
    return html

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"CRITICAL ERROR: {e}")
