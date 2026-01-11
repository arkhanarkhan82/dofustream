// ==========================================
// STREAMCMS ADMIN - UTF-8 FIXED VERSION
// ==========================================

// --- GITHUB CONFIGURATION ---
let GITHUB = {
    owner: '',
    repo: '',
    token: '',
    branch: 'main',
    connected: false
};

const REPO_FILES = {
    CONFIG: 'data/config.json',
    LEAGUE_MAP: 'assets/data/league_map.json',
    INDEX_HTML: 'index.html'
};

// --- STATE MANAGEMENT ---
let currentConfig = null;
let currentLeagueMap = {};
// Alias for legacy support
var configData = null; 

let currentConfigSHA = null;
let currentLeagueMapSHA = null;
let currentThemeContext = 'home';
let currentEditingPageId = null;

// --- DEFAULT DATA ---
const DEMO_CONFIG = {
    site_settings: {
        title_part_1: "Stream", title_part_2: "East", domain: "example.com",
        logo_url: "", target_country: "US"
    },
    social_sharing: {
        counts: { telegram: 1200, whatsapp: 800, reddit: 300, twitter: 500 },
        excluded_pages: "dmca,contact,about,privacy"
    },
    theme: {
        brand_primary: "#D00000", brand_dark: "#8a0000", accent_gold: "#FFD700",
        bg_body: "#050505", font_family_base: "system-ui"
    },
    menus: { header: [], hero: [], footer_static: [] },
    pages: [],
    sport_priorities: { "US": {}, "UK": {} }
};

// --- FIELD MAPPING ---
const THEME_FIELDS = {
    'font_family_base': 'themeFontBase',
    'font_family_headings': 'themeFontHeadings',
    'border_radius_base': 'themeBorderRadius',
    'container_max_width': 'themeMaxWidth',
    'static_h1_color': 'themeStaticH1Color',
    'static_h1_align': 'pageH1Align',
    'static_h1_border_width': 'themeStaticH1BorderWidth',
    'static_h1_border_color': 'themeStaticH1BorderColor',
    'sys_status_visible': 'themeSysStatusVisible',
    'sys_status_bg_opacity': 'themeSysStatusBgOpacity',
    'sys_status_bg_transparent': 'themeSysStatusBgTransparent',
    'sys_status_text_color': 'themeSysStatusText',
    'sys_status_bg_color': 'themeSysStatusBg',
    'sys_status_border_color': 'themeSysStatusBorderColor',
    'sys_status_border_width': 'themeSysStatusBorderWidth',
    'sys_status_radius': 'themeSysStatusRadius',
    'sys_status_dot_color': 'themeSysStatusDotColor',
    'sys_status_dot_size': 'themeSysStatusDotSize',
    'league_card_bg': 'themeLeagueCardBg',
    'league_card_text': 'themeLeagueCardText',
    'league_card_border_color': 'themeLeagueCardBorder',
    'league_card_border_width': 'themeLeagueCardBorderWidth',
    'league_card_radius': 'themeLeagueCardRadius',
    'league_card_hover_bg': 'themeLeagueCardHoverBg',
    'league_card_hover_text': 'themeLeagueCardHoverText',
    'league_card_hover_border_color': 'themeLeagueCardHoverBorder',
    'brand_primary': 'themeBrandPrimary',
    'brand_dark': 'themeBrandDark',
    'accent_gold': 'themeAccentGold',
    'status_green': 'themeStatusGreen',
    'bg_body': 'themeBgBody',
    'bg_panel': 'themeBgPanel',
    'text_main': 'themeTextMain',
    'text_muted': 'themeTextMuted',
    'border_color': 'themeBorderColor',
    'scrollbar_thumb_color': 'themeScrollThumb',
    'header_bg': 'themeHeaderBg',
    'header_text_color': 'themeHeaderText',
    'header_link_active_color': 'themeHeaderActive',
    'header_max_width': 'themeHeaderWidth',
    'logo_p1_color': 'themeLogoP1',
    'logo_p2_color': 'themeLogoP2',
    'header_border_bottom': 'themeHeaderBorderBottom',
    'header_layout': 'themeHeaderLayout',
    'header_icon_pos': 'themeHeaderIconPos',
    'header_link_hover_color': 'themeHeaderHover',
    'header_highlight_color': 'themeHeaderHighlightColor',
    'header_highlight_hover': 'themeHeaderHighlightHover',
    'hero_bg_style': 'themeHeroBgStyle',
    'hero_bg_solid': 'themeHeroBgSolid',
    'hero_gradient_start': 'themeHeroGradStart',
    'hero_gradient_end': 'themeHeroGradEnd',
    'hero_bg_image_url': 'themeHeroBgImage',
    'hero_bg_image_overlay_opacity': 'themeHeroOverlayOpacity',
    'hero_h1_color': 'themeHeroH1',
    'hero_intro_color': 'themeHeroIntro',
    'hero_pill_bg': 'themeHeroPillBg',
    'hero_pill_text': 'themeHeroPillText',
    'hero_pill_hover_bg': 'themeHeroPillActiveBg',
    'hero_pill_hover_text': 'themeHeroPillActiveText',
    'hero_border_bottom': 'themeHeroBorderBottom',
    'hero_layout_mode': 'themeHeroLayoutMode',
    'hero_content_align': 'themeHeroAlign',
    'hero_menu_visible': 'themeHeroMenuVisible',
    'hero_box_width': 'themeHeroBoxWidth',
    'hero_box_border_width': 'themeHeroBoxBorderWidth',
    'hero_box_border_color': 'themeHeroBoxBorderColor',
    'hero_border_top': 'themeHeroBorderTop',
    'hero_border_bottom_box': 'themeHeroBorderBottomBox',
    'hero_border_left': 'themeHeroBorderLeft',
    'hero_border_right': 'themeHeroBorderRight',
    'button_border_radius': 'themeBtnRadius',
    'hero_pill_radius': 'themeHeroPillRadius',
    'hero_main_border_width': 'themeHeroMainBorderWidth',
    'hero_main_border_color': 'themeHeroMainBorderColor',
    'hero_main_border_pos': 'themeHeroMainBorderPos',
    'text_sys_status': 'themeTextSysStatus',
    'sec_border_live_width': 'themeLiveBorderWidth',
    'sec_border_live_color': 'themeLiveBorderColor',
    'sec_border_upcoming_width': 'themeUpcomingBorderWidth',
    'sec_border_upcoming_color': 'themeUpcomingBorderColor',
    'sec_border_wildcard_width': 'themeWildcardBorderWidth',
    'sec_border_wildcard_color': 'themeWildcardBorderColor',
    'sec_border_leagues_width': 'themeLeaguesBorderWidth',
    'sec_border_leagues_color': 'themeLeaguesBorderColor',
    'sec_border_grouped_width': 'themeGroupedBorderWidth',
    'sec_border_grouped_color': 'themeGroupedBorderColor',
    'sec_border_league_upcoming_width': 'themeLeagueUpcomingBorderWidth',
    'sec_border_league_upcoming_color': 'themeLeagueUpcomingBorderColor',
    'article_bg': 'themeArticleBg',
    'article_text': 'themeArticleText',
    'article_line_height': 'themeArticleLineHeight',
    'article_bullet_color': 'themeArticleBullet',
    'article_link_color': 'themeArticleLink',
    'article_h2_color': 'themeArticleH2Color',
    'article_h2_border_width': 'themeArticleH2BorderWidth',
    'article_h2_border_color': 'themeArticleH2BorderColor',
    'article_h3_color': 'themeArticleH3Color',
    'article_h4_color': 'themeArticleH4Color',
    'match_row_bg': 'themeMatchRowBg',
    'match_row_border': 'themeMatchRowBorder',
    'match_row_team_name_color': 'themeMatchTeamColor',
    'match_row_time_main_color': 'themeMatchTimeColor',
    'match_row_live_border_left': 'themeMatchLiveBorder',
    'match_row_live_bg_start': 'themeMatchLiveBgStart',
    'match_row_live_bg_end': 'themeMatchLiveBgEnd',
    'match_row_live_text_color': 'themeMatchLiveText',
    'row_height_mode': 'themeRowHeight',
    'match_row_btn_watch_bg': 'themeBtnWatchBg',
    'match_row_btn_watch_text': 'themeBtnWatchText',
    'footer_bg_start': 'themeFooterBgStart',
    'footer_bg_end': 'themeFooterBgEnd',
    'footer_desc_color': 'themeFooterText',
    'footer_link_color': 'themeFooterLink',
    'footer_text_align_desktop': 'themeFooterAlign',
    'footer_columns': 'themeFooterCols',
    'footer_show_disclaimer': 'themeFooterShowDisclaimer',
    'footer_slot_1': 'themeFooterSlot1',
    'footer_slot_2': 'themeFooterSlot2',
    'footer_slot_3': 'themeFooterSlot3',
    'wildcard_category': 'themeWildcardCat',
    'text_live_section_title': 'themeTextLiveTitle',
    'text_wildcard_title': 'themeTextWildcardTitle',
    'text_top_upcoming_title': 'themeTextTopUpcoming',
    'text_show_more': 'themeTextShowMore',
    'text_section_link': 'themeTextSectionLink',
    'text_watch_btn': 'themeTextWatch',
    'text_hd_badge': 'themeTextHd',
    'text_section_prefix': 'themeTextSectionPrefix',
    'match_row_hover_bg': 'themeMatchRowHoverBg',
    'match_row_hover_border': 'themeMatchRowHoverBorder',
    'section_logo_size': 'themeSectionLogoSize',
    'show_more_btn_bg': 'themeShowMoreBg',
    'show_more_btn_border': 'themeShowMoreBorder',
    'show_more_btn_text': 'themeShowMoreText',
    'show_more_btn_radius': 'themeShowMoreRadius',
    'social_desktop_top': 'themeSocialDeskTop',
    'social_desktop_left': 'themeSocialDeskLeft',
    'social_desktop_scale': 'themeSocialDeskScale',
    'mobile_footer_height': 'themeMobFootHeight',
    'social_telegram_color': 'themeSocialTelegram',
    'social_whatsapp_color': 'themeSocialWhatsapp',
    'social_reddit_color': 'themeSocialReddit',
    'social_twitter_color': 'themeSocialTwitter',
    'mobile_footer_bg': 'themeMobFootBg',
    'back_to_top_bg': 'themeBttBg',
    'back_to_top_icon_color': 'themeBttIcon',
    'back_to_top_radius': 'themeBttRadius',
    'back_to_top_size': 'themeBttSize',
    'display_hero': 'themeDisplayHero',
    'watch_sidebar_swap': 'themeWatchSidebarSwap',
    'watch_show_ad1': 'themeWatchShowAd1',
    'watch_show_discord': 'themeWatchShowDiscord',
    'watch_show_ad2': 'themeWatchShowAd2',
    'watch_discord_order': 'themeWatchDiscordOrder',
    'watch_discord_title': 'themeWatchDiscordTitle',
    'watch_discord_btn_text': 'themeWatchDiscordBtnText',
    'chat_header_title': 'themeWatchChatHeaderTitle',
    'chat_header_bg': 'themeWatchChatHeaderBg',
    'chat_header_text': 'themeWatchChatHeaderText',
    'chat_dot_color': 'themeWatchChatDotColor',
    'chat_dot_size': 'themeWatchChatDotSize',
    'chat_overlay_bg': 'themeWatchChatOverlayBg',
    'chat_overlay_opacity': 'themeWatchChatOverlayOpacity',
    'chat_input_bg': 'themeWatchChatInputBg',
    'chat_input_text': 'themeWatchChatInputText',
    'chat_join_btn_text': 'themeWatchChatJoinBtnText',
    'watch_table_head_bg': 'themeWatchTableHeadBg',
    'watch_table_body_bg': 'themeWatchTableBodyBg',
    'watch_table_border': 'themeWatchTableBorder',
    'watch_table_radius': 'themeWatchTableRadius',
    'watch_team_color': 'themeWatchTeamColor',
    'watch_vs_color': 'themeWatchVsColor',
    'watch_team_size': 'themeWatchTeamSize',
    'watch_vs_size': 'themeWatchVsSize',
    'watch_btn_bg': 'themeWatchBtnBg',
    'watch_btn_text': 'themeWatchBtnText',
    'watch_btn_disabled_bg': 'themeWatchBtnDisabledBg',
    'watch_btn_disabled_text': 'themeWatchBtnDisabledText',
    'watch_btn_label': 'themeWatchBtnLabel',
    'watch_btn_disabled_label': 'themeWatchBtnDisabledLabel',
    'watch_info_btn_bg': 'themeWatchInfoBtnBg',
    'watch_info_btn_hover': 'themeWatchInfoBtnHover',
    'watch_info_btn_text': 'themeWatchInfoBtnText',
    'watch_info_btn_label': 'themeWatchInfoBtnLabel',
    'watch_server_active_bg': 'themeWatchServerActiveBg',
    'watch_server_text': 'themeWatchServerText'
};

// ====================
// AUTH & SETUP
// ====================

window.addEventListener('DOMContentLoaded', () => {
    // 1. Check for saved credentials
    const savedCreds = localStorage.getItem('gh_credentials');
    if (savedCreds) {
        try {
            const creds = JSON.parse(savedCreds);
            if(creds.owner) document.getElementById('ghOwner').value = creds.owner;
            if(creds.repo) document.getElementById('ghRepo').value = creds.repo;
            if(creds.token) document.getElementById('ghToken').value = creds.token;
            if(creds.branch) document.getElementById('ghBranch').value = creds.branch;
        } catch (e) {
            console.error('Failed to parse credentials', e);
        }
    }

    // 2. Initialize TinyMCE Editor
    if (typeof tinymce !== 'undefined') {
        tinymce.init({
            selector: '#pageContentEditor', height: 400, skin: 'oxide-dark', content_css: 'dark',
            setup: (ed) => { ed.on('change', window.saveEditorContentToMemory); }
        });
    }

    // 3. Prevent Form Submit Default
    const loginForm = document.getElementById('loginForm');
    if(loginForm) loginForm.onsubmit = handleLogin;
});

async function handleLogin(event) {
    event.preventDefault();
    const owner = document.getElementById('ghOwner').value.trim();
    const repo = document.getElementById('ghRepo').value.trim();
    const token = document.getElementById('ghToken').value.trim();
    const branch = document.getElementById('ghBranch').value.trim() || 'main';
    const loginBtn = document.getElementById('loginBtn');

    if (!owner || !repo || !token) return alert('Please fill in all fields');

    loginBtn.disabled = true;
    loginBtn.innerText = 'Connecting...';

    try {
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
            headers: { 'Authorization': `token ${token}` }
        });

        if (!response.ok) throw new Error(`GitHub Error: ${response.status} ${response.statusText}`);

        GITHUB = { owner, repo, token, branch, connected: true };
        localStorage.setItem('gh_credentials', JSON.stringify({ owner, repo, token, branch }));

        await loadConfigFromGitHub();

        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('adminPanel').style.display = 'flex';
        document.getElementById('connectedRepo').textContent = `${owner}/${repo} (${branch})`;
        
        switchTab('upload');

    } catch (error) {
        alert(error.message);
        loginBtn.disabled = false;
        loginBtn.innerText = 'Connect to GitHub';
    }
}

// ====================
// GITHUB API CORE (UTF-8 FIX)
// ====================

function b64DecodeUnicode(str) {
    // Decoding Base64 in a way that handles UTF-8 (emojis, etc.)
    try {
        return decodeURIComponent(atob(str).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
    } catch (e) {
        console.warn("UTF-8 Decode failed, falling back to atob");
        return atob(str);
    }
}

function b64EncodeUnicode(str) {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
        function toSolidBytes(match, p1) {
            return String.fromCharCode('0x' + p1);
    }));
}

async function fetchGitHubFile(path) {
    if (!GITHUB.connected) return null;
    try {
        const url = `https://api.github.com/repos/${GITHUB.owner}/${GITHUB.repo}/contents/${path}?ref=${GITHUB.branch}&ts=${Date.now()}`;
        const res = await fetch(url, { headers: { 'Authorization': `token ${GITHUB.token}` } });
        if (res.status === 404) return null;
        if (!res.ok) throw new Error('Fetch Failed');
        const data = await res.json();
        
        // USE THE UTF-8 DECODER
        const decoded = b64DecodeUnicode(data.content);
        return { content: decoded, sha: data.sha };

    } catch (e) {
        console.error(`Fetch Error (${path}):`, e);
        return null;
    }
}

async function updateGitHubFile(path, content, message, sha) {
    const url = `https://api.github.com/repos/${GITHUB.owner}/${GITHUB.repo}/contents/${path}`;
    const body = {
        message: message,
        content: b64EncodeUnicode(content), // USE UTF-8 ENCODER
        branch: GITHUB.branch
    };
    if (sha) body.sha = sha;

    const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Authorization': `token ${GITHUB.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    if (res.status === 409) {
        throw new Error('409');
    }
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Update failed');
    }
    return await res.json();
}

async function loadConfigFromGitHub() {
    try {
        const cFile = await fetchGitHubFile(REPO_FILES.CONFIG);
        if (cFile) {
            currentConfig = JSON.parse(cFile.content);
            currentConfigSHA = cFile.sha;
        } else {
            currentConfig = JSON.parse(JSON.stringify(DEMO_CONFIG));
            currentConfigSHA = null;
        }
        configData = currentConfig; // Sync alias

        const lFile = await fetchGitHubFile(REPO_FILES.LEAGUE_MAP);
        if (lFile) {
            currentLeagueMap = JSON.parse(lFile.content);
            currentLeagueMapSHA = lFile.sha;
        } else {
            currentLeagueMap = {};
            currentLeagueMapSHA = null;
        }

        // --- Data Normalization ---
        if (!currentConfig.theme) currentConfig.theme = {};
        if (!currentConfig.pages) currentConfig.pages = [];
        if (!currentConfig.menus) currentConfig.menus = { header: [], hero: [], footer_static: [] };
        if (!currentConfig.sport_priorities) currentConfig.sport_priorities = { "US": {}, "UK": {} };

        populateAllFields();
        console.log('Configuration loaded successfully');

    } catch (e) {
        alert('Error parsing JSON from GitHub: ' + e.message + "\nCheck if your GitHub files contain invalid characters.");
    }
}

// ====================
// UI RENDERING
// ====================

function populateAllFields() {
    if (!currentConfig) return;
    console.log("Populating UI Fields...");

    const safeRun = (fn, name) => {
        try { fn(); } catch(e) { console.warn(`Render Error [${name}]:`, e); }
    };

    // 1. General Settings
    const s = currentConfig.site_settings || {};
    setVal('apiUrl', s.api_url);
    setVal('titleP1', s.title_part_1);
    setVal('titleP2', s.title_part_2);
    setVal('siteDomain', s.domain);
    setVal('logoUrl', s.logo_url);
    setVal('faviconUrl', s.favicon_url);
    setVal('targetCountry', s.target_country || 'US');
    setVal('footerCopyright', s.footer_copyright);
    setVal('footerDisclaimer', s.footer_disclaimer);
    setVal('paramLive', s.param_live);
    setVal('paramInfo', s.param_info);

    // 2. Watch Settings
    const w = currentConfig.watch_settings || {};
    setVal('supaUrl', w.supabase_url);
    setVal('supaKey', w.supabase_key);
    setVal('watchPageTitle', w.meta_title);
    setVal('watchPageDesc', w.meta_desc);
    setVal('watchPageArticle', w.article);
    setVal('watchAdMobile', w.ad_mobile);
    setVal('watchAdSidebar1', w.ad_sidebar_1);
    setVal('watchAdSidebar2', w.ad_sidebar_2);

    // 3. Articles
    const a = currentConfig.articles || {};
    setVal('tplLeagueArticle', a.league);
    setVal('tplSportArticle', a.sport);
    setVal('tplExcludePages', a.excluded);
    setVal('tplLeagueH1', a.league_h1);
    setVal('tplLeagueIntro', a.league_intro);
    setVal('tplLeagueLiveTitle', a.league_live_title);
    setVal('tplLeagueUpcomingTitle', a.league_upcoming_title);

    // 4. Automation
    if(currentConfig.automation) {
        setVal('cronApiKey', currentConfig.automation.api_key);
        setVal('cronJobId', currentConfig.automation.job_id);
    }
    
    // 5. Social
    const soc = currentConfig.social_sharing || {};
    setVal('socialTelegram', soc.counts?.telegram);
    setVal('socialWhatsapp', soc.counts?.whatsapp);
    setVal('socialReddit', soc.counts?.reddit);
    setVal('socialTwitter', soc.counts?.twitter);
    setVal('socialExcluded', soc.excluded_pages);

    // 6. Run Complex Renderers
    safeRun(renderThemeSettings, 'Theme');
    safeRun(renderPriorities, 'Priorities');
    safeRun(renderMenus, 'Menus');
    safeRun(renderPageList, 'Pages');
    safeRun(renderLeagues, 'Leagues');
}

function renderThemeSettings() {
    const t = configData.theme || {};
    
    // Safe Checkbox Setter
    const setChk = (id, val) => {
        const el = document.getElementById(id);
        if(el) el.checked = (val === true);
    };

    setChk('themeHeroBorderTop', t.hero_border_top);
    setChk('themeHeroBorderBottomBox', t.hero_border_bottom_box);
    setChk('themeHeroBorderLeft', t.hero_border_left);
    setChk('themeHeroBorderRight', t.hero_border_right);
    setChk('themeFooterShowDisclaimer', t.footer_show_disclaimer);
    setChk('themeWatchSidebarSwap', t.watch_sidebar_swap);
    setChk('themeWatchShowAd1', t.watch_show_ad1);
    setChk('themeWatchShowDiscord', t.watch_show_discord);
    setChk('themeWatchShowAd2', t.watch_show_ad2);
    setChk('themeSysStatusVisible', t.sys_status_visible);
    setChk('themeSysStatusBgTransparent', t.sys_status_bg_transparent);

    // Map Fields
    for (const [jsonKey, htmlId] of Object.entries(THEME_FIELDS)) {
        const el = document.getElementById(htmlId);
        if (!el) continue;
        const val = t[jsonKey];
        if (el.type !== 'checkbox') {
            el.value = (val !== undefined && val !== null) ? val : "";
        }
    }

    // Run Toggles safely
    try { window.toggleHeroInputs && window.toggleHeroInputs(); } catch(e){}
    try { window.toggleHeaderInputs && window.toggleHeaderInputs(); } catch(e){}
    try { window.toggleHeroBoxSettings && window.toggleHeroBoxSettings(); } catch(e){}
    try { window.toggleFooterSlots && window.toggleFooterSlots(); } catch(e){}
}

// ====================
// PRIORITY LOGIC
// ====================
function renderPriorities() {
    const c = getVal('targetCountry') || 'US';
    const container = document.getElementById('priorityListContainer');
    if (!container) return;
    
    if(document.getElementById('prioLabel')) document.getElementById('prioLabel').innerText = c;
    if(!configData.sport_priorities[c]) configData.sport_priorities[c] = { _HIDE_OTHERS: false, _BOOST: "" };
    
    setVal('prioBoost', configData.sport_priorities[c]._BOOST || "");
    const isHide = configData.sport_priorities[c]._HIDE_OTHERS;

    const items = Object.entries(configData.sport_priorities[c])
        .filter(([k]) => !k.startsWith('_'))
        .map(([name, data]) => ({ name, ...data }))
        .sort((a,b) => b.score - a.score);

    let html = `
        <div style="background:rgba(239,68,68,0.1); padding:10px; margin-bottom:15px; border-radius:6px; border:1px solid rgba(239,68,68,0.3);">
            <label style="color:#fca5a5; display:flex; gap:10px; align-items:center;">
                <input type="checkbox" ${isHide?'checked':''} onchange="toggleHideOthers('${c}', this.checked)">
                Hide all others (Strict Mode)
            </label>
        </div>
    `;

    html += items.map(item => `
        <div class="menu-item-row" style="opacity:${item.isHidden?0.5:1}">
            <strong style="width:140px; overflow:hidden;">${item.name}</strong>
            <div style="flex:1; display:flex; gap:10px; align-items:center;">
                <label style="font-size:0.8rem"><input type="checkbox" ${item.isLeague?'checked':''} onchange="updatePrio('${c}','${item.name}','isLeague',this.checked)"> League</label>
                <label style="font-size:0.8rem"><input type="checkbox" ${item.hasLink?'checked':''} onchange="updatePrio('${c}','${item.name}','hasLink',this.checked)"> Link</label>
                <input type="number" value="${item.score}" onchange="updatePrio('${c}','${item.name}','score',this.value)" style="width:60px;">
                <button class="btn-icon" onclick="deletePrio('${c}','${item.name}')">×</button>
            </div>
        </div>
    `).join('');
    container.innerHTML = html;
}

window.toggleHideOthers = (c, v) => { configData.sport_priorities[c]._HIDE_OTHERS = v; };
window.updatePrio = (c, n, k, v) => { 
    if(k === 'score') v = parseInt(v);
    configData.sport_priorities[c][n][k] = v; 
    if(k==='isHidden') renderPriorities();
};
window.deletePrio = (c, n) => { 
    if(confirm('Delete?')) { delete configData.sport_priorities[c][n]; renderPriorities(); }
};
window.addPriorityRow = () => {
    const c = getVal('targetCountry');
    const n = getVal('newSportName');
    if(n) {
        if(!configData.sport_priorities[c]) configData.sport_priorities[c] = {};
        configData.sport_priorities[c][n] = { score: 50, isLeague: false, hasLink: false };
        setVal('newSportName', '');
        renderPriorities();
    }
};

// ====================
// MENU & PAGE LOGIC
// ====================
function renderMenus() {
    ['header', 'hero', 'footer_static'].forEach(sec => {
        const el = document.getElementById(`menu-${sec}`);
        if(el && configData.menus[sec]) {
            el.innerHTML = configData.menus[sec].map((item, idx) => `
                <div class="menu-item-row">
                    <div><strong>${item.title}</strong> <small>(${item.url})</small></div>
                    <button class="btn-icon" onclick="deleteMenuItem('${sec}', ${idx})">×</button>
                </div>
            `).join('');
        }
    });
}

window.openMenuModal = (sec) => {
    document.getElementById('menuTargetSection').value = sec;
    setVal('menuTitleItem', ''); setVal('menuUrlItem', '');
    document.getElementById('menuModal').style.display = 'flex';
};
window.saveMenuItem = () => {
    const sec = document.getElementById('menuTargetSection').value;
    if(!configData.menus[sec]) configData.menus[sec] = [];
    configData.menus[sec].push({ title: getVal('menuTitleItem'), url: getVal('menuUrlItem') });
    renderMenus();
    document.getElementById('menuModal').style.display = 'none';
};
window.deleteMenuItem = (sec, idx) => { configData.menus[sec].splice(idx, 1); renderMenus(); };

function renderPageList() {
    const tbody = document.querySelector('#pagesTable tbody');
    if(!tbody) return;
    tbody.innerHTML = configData.pages.map(p => `
        <tr><td>${p.title}</td><td>/${p.slug}</td><td><button class="btn-primary" onclick="editPage('${p.id}')">Edit</button></td></tr>
    `).join('');
}
window.editPage = (id) => {
    currentEditingPageId = id;
    const p = configData.pages.find(x => x.id === id);
    if(!p) return;
    document.getElementById('pageListView').style.display = 'none';
    document.getElementById('pageEditorView').style.display = 'block';
    setVal('pageTitle', p.title); setVal('pageSlug', p.slug); setVal('pageLayout', p.layout);
    setVal('pageMetaTitle', p.meta_title); setVal('pageMetaDesc', p.meta_desc);
    if(tinymce.get('pageContentEditor')) tinymce.get('pageContentEditor').setContent(p.content || '');
};
window.closePageEditor = () => {
    const p = configData.pages.find(x => x.id === currentEditingPageId);
    if(p) {
        p.title = getVal('pageTitle'); p.slug = getVal('pageSlug'); p.layout = getVal('pageLayout');
        p.meta_title = getVal('pageMetaTitle'); p.meta_desc = getVal('pageMetaDesc');
        if(tinymce.get('pageContentEditor')) p.content = tinymce.get('pageContentEditor').getContent();
    }
    document.getElementById('pageEditorView').style.display = 'none';
    document.getElementById('pageListView').style.display = 'block';
    renderPageList();
};
window.createNewPage = () => { configData.pages.push({ id: 'p_'+Date.now(), title: 'New Page', slug: 'new', layout: 'page' }); renderPageList(); };

function renderLeagues() {
    const c = document.getElementById('leaguesContainer');
    if(!c) return;
    c.innerHTML = Object.keys(currentLeagueMap).sort().map(l => `
        <div class="card"><h3>${l}</h3><textarea class="team-list-editor" data-league="${l}">${currentLeagueMap[l].join(', ')}</textarea></div>
    `).join('');
}
window.openLeagueModal = () => document.getElementById('leagueModal').style.display = 'flex';
window.saveNewLeague = () => {
    const n = document.getElementById('newLeagueNameInput').value.trim();
    if(n) { currentLeagueMap[n] = ["new"]; renderLeagues(); document.getElementById('leagueModal').style.display='none'; }
};
window.copyAllLeaguesData = () => {
    let o = ""; for (const [l, t] of Object.entries(currentLeagueMap)) o += `LEAGUE: ${l}\nTEAMS: ${t.join(', ')}\n---\n`;
    navigator.clipboard.writeText(o).then(() => alert("Copied!"));
};

// ====================
// SAVE SYSTEM
// ====================

async function saveAllChanges() {
    if (!GITHUB.connected) return alert('Not connected');

    const saveBtn = document.getElementById('saveBtn');
    saveBtn.disabled = true;
    saveBtn.innerText = "Saving...";

    // 1. Capture State
    configData.site_settings = {
        api_url: getVal('apiUrl'), title_part_1: getVal('titleP1'), title_part_2: getVal('titleP2'),
        domain: getVal('siteDomain'), logo_url: getVal('logoUrl'), favicon_url: getVal('faviconUrl'),
        target_country: getVal('targetCountry'), footer_copyright: getVal('footerCopyright'), 
        footer_disclaimer: getVal('footerDisclaimer'), param_live: getVal('paramLive'), param_info: getVal('paramInfo')
    };

    // Capture Theme Context
    const captureTheme = (target) => {
        for (const [jsonKey, htmlId] of Object.entries(THEME_FIELDS)) {
            const el = document.getElementById(htmlId);
            if(el) target[jsonKey] = (el.type === 'checkbox') ? el.checked : el.value;
        }
    };
    captureTheme(configData.theme);

    // 2. Perform Save
    try {
        await tryUpdateConfig();
        await tryUpdateLeagues();
        
        alert("Saved & Build Triggered!");
        await loadConfigFromGitHub(); // Refresh state

    } catch (e) {
        alert("Error saving: " + e.message);
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerText = "💾 Save to GitHub";
    }
}

async function tryUpdateConfig() {
    try {
        const content = JSON.stringify(configData, null, 2);
        const res = await updateGitHubFile(REPO_FILES.CONFIG, content, "Update Config", currentConfigSHA);
        currentConfigSHA = res.content.sha;
    } catch (e) {
        if (e.message === '409') {
            console.warn("409 Conflict - Retrying Config Update...");
            const latest = await fetchGitHubFile(REPO_FILES.CONFIG);
            if(latest) currentConfigSHA = latest.sha;
            const res = await updateGitHubFile(REPO_FILES.CONFIG, JSON.stringify(configData, null, 2), "Update Config (Retry)", currentConfigSHA);
            currentConfigSHA = res.content.sha;
        } else {
            throw e;
        }
    }
}

async function tryUpdateLeagues() {
    const map = {};
    document.querySelectorAll('.team-list-editor').forEach(t => {
        map[t.getAttribute('data-league')] = t.value.split(',').map(x=>x.trim()).filter(x=>x);
    });
    
    try {
        const content = JSON.stringify(map, null, 2);
        const res = await updateGitHubFile(REPO_FILES.LEAGUE_MAP, content, "Update League Map", currentLeagueMapSHA);
        currentLeagueMapSHA = res.content.sha;
    } catch (e) {
        if (e.message === '409') {
            console.warn("409 Conflict - Retrying League Update...");
            const latest = await fetchGitHubFile(REPO_FILES.LEAGUE_MAP);
            if(latest) currentLeagueMapSHA = latest.sha;
            const content = JSON.stringify(map, null, 2);
            const res = await updateGitHubFile(REPO_FILES.LEAGUE_MAP, content, "Update League Map (Retry)", currentLeagueMapSHA);
            currentLeagueMapSHA = res.content.sha;
        } else {
            throw e;
        }
    }
}

// ====================
// HELPERS
// ====================

window.switchTab = (id) => {
    document.querySelectorAll('.tab-content').forEach(e => e.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    
    const tab = document.getElementById(`tab-${id}`);
    if(tab) tab.classList.add('active');
    
    try {
        if(id === 'theme') renderThemeSettings();
        if(id === 'priorities') renderPriorities();
        if(id === 'menus') renderMenus();
        if(id === 'leagues') renderLeagues();
        if(id === 'pages') renderPageList();
    } catch(e) { console.error('Tab Render Error:', e); }
};

window.switchThemeContext = (mode) => {
    currentThemeContext = mode;
    document.querySelectorAll('.ctx-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`ctxBtn-${mode}`).classList.add('active');
    
    const watchControls = document.getElementById('watchThemeControls');
    const staticControls = document.getElementById('staticPageControls');
    
    if(watchControls) watchControls.style.display = (mode === 'watch') ? 'block' : 'none';
    if(staticControls) staticControls.style.display = (mode === 'page') ? 'block' : 'none';
    
    renderThemeSettings(); // Just refresh view
};

// UI Toggles
window.toggleHeroInputs = () => {
    const style = document.getElementById('themeHeroBgStyle')?.value;
    if(document.getElementById('heroSolidInput')) document.getElementById('heroSolidInput').style.display = style === 'solid' ? 'block' : 'none';
    if(document.getElementById('heroGradientInput')) document.getElementById('heroGradientInput').style.display = style === 'gradient' ? 'grid' : 'none';
    if(document.getElementById('heroImageInput')) document.getElementById('heroImageInput').style.display = style === 'image' ? 'block' : 'none';
};
window.toggleHeaderInputs = () => {
    const layout = document.getElementById('themeHeaderLayout')?.value;
    if(document.getElementById('headerIconPosGroup')) document.getElementById('headerIconPosGroup').style.display = (layout === 'center') ? 'block' : 'none';
};
window.toggleHeroBoxSettings = () => {
    const mode = document.getElementById('themeHeroLayoutMode')?.value;
    if(document.getElementById('heroBoxSettings')) document.getElementById('heroBoxSettings').style.display = (mode === 'box') ? 'block' : 'none';
};
window.toggleFooterSlots = () => {
    const cols = document.getElementById('themeFooterCols')?.value;
    if(document.getElementById('footerSlot3Group')) document.getElementById('footerSlot3Group').style.display = (cols === '3') ? 'block' : 'none';
};

function setVal(id, v) { if(document.getElementById(id)) document.getElementById(id).value = v || ""; }
function getVal(id) { return document.getElementById(id)?.value || ""; }

window.applyPreset = (p) => alert('Presets temporarily disabled');

// ====================
// FILE UPLOAD (RESTORED)
// ====================
window.uploadCMSFiles = async () => {
    if (!GITHUB.connected) return alert("Please Login to GitHub first.");
    if (!confirm('⚠️ Upload/Overwrite CMS files on GitHub?\n(Workflows, Scripts, Config)\n\nContinue?')) return;

    const progressDiv = document.getElementById('uploadProgress');
    if (document.getElementById('uploadStatus')) document.getElementById('uploadStatus').style.display = 'block';
    if (progressDiv) progressDiv.innerHTML = 'Preparing files...';

    const files = [
        { path: 'data/config.json', content: JSON.stringify(configData || DEMO_CONFIG, null, 2) },
        { path: 'index.html', content: `<!DOCTYPE html><html><body><h1>Building...</h1></body></html>` },
        { path: 'assets/data/league_map.json', content: JSON.stringify(currentLeagueMap, null, 2) },
        { path: 'scripts/build.py', content: getBuildScript() },
        { path: '.github/workflows/update-site.yml', content: getWorkflow() }
    ];

    try {
        for (const file of files) {
            if (progressDiv) progressDiv.innerHTML = `Uploading: ${file.path}...`;
            const existing = await fetchGitHubFile(file.path);
            await updateGitHubFile(file.path, file.content, "CMS Upload", existing ? existing.sha : null);
        }
        if (progressDiv) progressDiv.innerHTML = '<strong style="color:#22c55e">✓ Upload Success! Build Triggered.</strong>';
        alert("Upload Complete. GitHub Action is now building your site.");
        await loadConfigFromGitHub(); // Sync SHA immediately
    } catch (e) {
        alert("Upload Failed: " + e.message);
    }
};

function getWorkflow() {
    return `name: Build Site
on: [push, workflow_dispatch]
permissions: { contents: write, pages: write, id-token: write }
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with: { python-version: '3.9' }
      - run: python scripts/build.py
      - uses: peaceiris/actions-gh-pages@v3
        with: { github_token: \${{ secrets.GITHUB_TOKEN }}, publish_dir: ./, keep_files: true }`;
}

function getBuildScript() {
    return `import json, os, re
CONFIG='data/config.json'
OUT='.'
def load(p): return json.load(open(p)) if os.path.exists(p) else {}
def build():
    c = load(CONFIG)
    if not c: return
    t = "<!DOCTYPE html><html><body><h1>{{H1}}</h1>{{CONTENT}}</body></html>"
    for p in c.get('pages', []):
        d = os.path.join(OUT, p['slug']) if p['slug']!='home' else OUT
        os.makedirs(d, exist_ok=True)
        h = t.replace('{{H1}}', p['title']).replace('{{CONTENT}}', p.get('content',''))
        with open(os.path.join(d, 'index.html'), 'w') as f: f.write(h)
if __name__ == "__main__": build()`;
}
