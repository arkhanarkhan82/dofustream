// ==========================================
// STREAMCMS ADMIN - GITHUB INTEGRATED
// Professional Login & File Management System
// ==========================================

// GitHub Configuration
let GITHUB = {
    owner: '',
    repo: '',
    token: '',
    branch: 'main',
    connected: false
};

// File paths in repository
const REPO_FILES = {
    CONFIG: 'data/config.json',
    LEAGUE_MAP: 'assets/data/league_map.json',
    INDEX_HTML: 'index.html',
    WATCH_HTML: 'watch/index.html'
};

// Current loaded data
let currentConfig = null;
let currentLeagueMap = {};
// Legacy compatibility
var configData = null;


// ====================
// LOGIN & AUTHENTICATION
// ====================

async function handleLogin(event) {
    event.preventDefault();

    const owner = document.getElementById('ghOwner').value.trim();
    const repo = document.getElementById('ghRepo').value.trim();
    const token = document.getElementById('ghToken').value.trim();
    const branch = document.getElementById('ghBranch').value.trim() || 'main';

    const loginBtn = document.getElementById('loginBtn');
    const errorDiv = document.getElementById('loginError');

    // Clear previous errors
    errorDiv.style.display = 'none';
    errorDiv.textContent = '';

    // Validate inputs
    if (!owner || !repo || !token) {
        showLoginError('Please fill in all required fields');
        return;
    }

    // Show loading
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<span class="loading-spinner"></span>Connecting...';

    try {
        // Test GitHub connection
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('Invalid GitHub token. Please check your credentials.');
            } else if (response.status === 404) {
                throw new Error('Repository not found. Please check the owner and repository name.');
            } else {
                throw new Error(`GitHub error: ${response.status}`);
            }
        }

        const repoData = await response.json();

        // Connection successful!
        GITHUB = { owner, repo, token, branch, connected: true };

        // Save credentials to localStorage
        localStorage.setItem('gh_credentials', JSON.stringify({ owner, repo, token, branch }));

        // Load existing config from GitHub
        await loadConfigFromGitHub();

        // Show admin panel
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('adminPanel').style.display = 'flex';

        // Update UI with connection info
        document.getElementById('connectedRepo').textContent = `${owner}/${repo} (${branch})`;

        // Show upload tab by default
        switchTab('upload');

    } catch (error) {
        showLoginError(error.message);
        loginBtn.disabled = false;
        loginBtn.innerHTML = 'Connect to GitHub';
    }
}

function showLoginError(message) {
    const errorDiv = document.getElementById('loginError');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('gh_credentials');
        location.reload();
    }
}

// --- CRON JOBS AUTOMATION ---

function loadCronSettings() {
    if (!currentConfig || !currentConfig.automation) return;
    const auto = currentConfig.automation;
    setValue('cronApiKey', auto.api_key);
    setValue('cronJobId', auto.job_id);
}

async function saveCronSettings() {
    if (!currentConfig) return;

    const apiKey = getValue('cronApiKey');
    const jobId = getValue('cronJobId');

    if (!apiKey || !jobId) {
        showStatus('Please enter both API Key and Job ID', 'error');
        return;
    }

    // Save to Config
    currentConfig.automation = {
        api_key: apiKey,
        job_id: jobId
    };

    // Save config persistence (Local & GitHub)
    showStatus('Saving credentials...', 'loading');
    try {
        await updateGitHubFile(REPO_FILES.CONFIG, JSON.stringify(currentConfig, null, 2), 'Update automation credentials', currentConfigSHA);
        await loadConfigFromGitHub(); // Refresh SHA
        showStatus('Automation credentials saved!', 'success');
        testCronConnection(); // Auto-test after save
    } catch (e) {
        showStatus('Error saving: ' + e.message, 'error');
    }
}

async function testCronConnection() {
    const apiKey = getValue('cronApiKey');
    if (!apiKey) {
        showStatus('Enter API Key to test', 'error');
        return;
    }

    try {
        showStatus('Testing connection...', 'info');
        const response = await fetch('https://api.cron-job.org/jobs', {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });

        if (response.ok) {
            const data = await response.json();
            const jobCount = data.jobs ? data.jobs.length : 0;
            document.getElementById('cron-status').innerHTML = `<span style="color:var(--status-green)">✅ Connected! Found ${jobCount} jobs.</span>`;
            showStatus('Connection Successful', 'success');
        } else {
            throw new Error('Invalid API Key or Permissions');
        }
    } catch (e) {
        document.getElementById('cron-status').innerHTML = `<span style="color:var(--brand-primary)">❌ Connection Failed: ${e.message}</span>`;
        showStatus('Connection Failed', 'error');
    }
}

// Check for saved credentials on load
// Check for saved credentials on load
window.addEventListener('DOMContentLoaded', () => {
    // Check if running on file protocol
    if (window.location.protocol === 'file:') {
        const errorDiv = document.getElementById('loginError');
        errorDiv.innerHTML = '<strong>⚠️ Warning:</strong> You are opening this file directly.<br>Please use <code>Start_Admin.bat</code> to run the server, otherwise uploads will fail.';
        errorDiv.style.display = 'block';
    }

    const savedCreds = localStorage.getItem('gh_credentials');
    if (savedCreds) {
        try {
            const creds = JSON.parse(savedCreds);
            document.getElementById('ghOwner').value = creds.owner || '';
            document.getElementById('ghRepo').value = creds.repo || '';
            document.getElementById('ghToken').value = creds.token || '';
            document.getElementById('ghBranch').value = creds.branch || 'main';
        } catch (e) {
            console.error('Failed to load saved credentials:', e);
        }
    }
});

// ==========================================
// 2. DEFAULT DATA & CONSTANTS
// ==========================================
const DEFAULT_PRIORITIES = {
    US: {
        _HIDE_OTHERS: false,
        _BOOST: "Super Bowl, Playoffs, Finals",
        "NFL": { score: 100, isLeague: true, hasLink: true, isHidden: false },
        "NBA": { score: 99, isLeague: true, hasLink: true, isHidden: false },
        "NCAA": { score: 98, isLeague: true, hasLink: true, isHidden: false },
        "MLB": { score: 97, isLeague: true, hasLink: true, isHidden: false },
        "NHL": { score: 96, isLeague: true, hasLink: true, isHidden: false },
        "UFC": { score: 95, isLeague: true, hasLink: true, isHidden: false },
        "Premier League": { score: 90, isLeague: true, hasLink: true, isHidden: false },
        "Champions League": { score: 89, isLeague: true, hasLink: true, isHidden: false },
        "Formula 1": { score: 88, isLeague: true, hasLink: true, isHidden: false },
        "MLS": { score: 87, isLeague: true, hasLink: true, isHidden: false },
        "Africa Cup of Nations": { score: 86, isLeague: true, hasLink: true, isHidden: false },
        "La Liga": { score: 85, isLeague: true, hasLink: true, isHidden: false }
    },
    UK: {
        _HIDE_OTHERS: false,
        _BOOST: "Final, Derby",
        "Premier League": { score: 100, isLeague: true, hasLink: true, isHidden: false },
        "Champions League": { score: 99, isLeague: true, hasLink: true, isHidden: false },
        "Championship": { score: 98, isLeague: true, hasLink: true, isHidden: false },
        "Formula 1": { score: 84, isLeague: true, hasLink: true, isHidden: false },
        "Rugby": { score: 80, isLeague: false, hasLink: true, isHidden: false },
        "Cricket": { score: 79, isLeague: false, hasLink: true, isHidden: false }
    }
};

const DEMO_CONFIG = {
    site_settings: {
        title_part_1: "Stream", title_part_2: "East", domain: "streameast.to",
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
    theme_league: {},
    articles: { league: "", sport: "", excluded: "" },
    sport_priorities: JSON.parse(JSON.stringify(DEFAULT_PRIORITIES)),
    menus: { header: [], hero: [], footer_static: [] },
    pages: [
        { id: "p_home", title: "Home", slug: "home", layout: "home", meta_title: "Live Sports", content: "Welcome", schemas: { org: true, website: true } }
    ]
};

const THEME_FIELDS = {
    'font_family_base': 'themeFontBase', 'font_family_headings': 'themeFontHeadings', 'border_radius_base': 'themeBorderRadius',
    'container_max_width': 'themeMaxWidth', 'static_h1_color': 'themeStaticH1Color', 'static_h1_align': 'pageH1Align',
    'static_h1_border_width': 'themeStaticH1BorderWidth', 'static_h1_border_color': 'themeStaticH1BorderColor',
    'sys_status_visible': 'themeSysStatusVisible', 'sys_status_bg_opacity': 'themeSysStatusBgOpacity', 'sys_status_bg_transparent': 'themeSysStatusBgTransparent',
    'sys_status_text_color': 'themeSysStatusText', 'sys_status_bg_color': 'themeSysStatusBg', 'sys_status_border_color': 'themeSysStatusBorderColor',
    'sys_status_border_width': 'themeSysStatusBorderWidth', 'sys_status_radius': 'themeSysStatusRadius', 'sys_status_dot_color': 'themeSysStatusDotColor',
    'sys_status_dot_size': 'themeSysStatusDotSize',
    'league_card_bg': 'themeLeagueCardBg', 'league_card_text': 'themeLeagueCardText', 'league_card_border_color': 'themeLeagueCardBorder',
    'league_card_border_width': 'themeLeagueCardBorderWidth', 'league_card_radius': 'themeLeagueCardRadius', 'league_card_hover_bg': 'themeLeagueCardHoverBg',
    'league_card_hover_text': 'themeLeagueCardHoverText', 'league_card_hover_border_color': 'themeLeagueCardHoverBorder',
    'brand_primary': 'themeBrandPrimary', 'brand_dark': 'themeBrandDark', 'accent_gold': 'themeAccentGold', 'status_green': 'themeStatusGreen',
    'bg_body': 'themeBgBody', 'bg_panel': 'themeBgPanel', 'text_main': 'themeTextMain', 'text_muted': 'themeTextMuted', 'border_color': 'themeBorderColor',
    'scrollbar_thumb_color': 'themeScrollThumb', 'header_bg': 'themeHeaderBg', 'header_text_color': 'themeHeaderText', 'header_link_active_color': 'themeHeaderActive',
    'header_max_width': 'themeHeaderWidth', 'logo_p1_color': 'themeLogoP1', 'logo_p2_color': 'themeLogoP2', 'header_border_bottom': 'themeHeaderBorderBottom',
    'header_layout': 'themeHeaderLayout', 'header_icon_pos': 'themeHeaderIconPos', 'header_link_hover_color': 'themeHeaderHover', 'header_highlight_color': 'themeHeaderHighlightColor',
    'header_highlight_hover': 'themeHeaderHighlightHover', 'hero_bg_style': 'themeHeroBgStyle', 'hero_bg_solid': 'themeHeroBgSolid', 'hero_gradient_start': 'themeHeroGradStart',
    'hero_gradient_end': 'themeHeroGradEnd', 'hero_bg_image_url': 'themeHeroBgImage', 'hero_bg_image_overlay_opacity': 'themeHeroOverlayOpacity',
    'hero_h1_color': 'themeHeroH1', 'hero_intro_color': 'themeHeroIntro', 'hero_pill_bg': 'themeHeroPillBg', 'hero_pill_text': 'themeHeroPillText',
    'hero_pill_hover_bg': 'themeHeroPillActiveBg', 'hero_pill_hover_text': 'themeHeroPillActiveText', 'hero_border_bottom': 'themeHeroBorderBottom',
    'hero_layout_mode': 'themeHeroLayoutMode', 'hero_content_align': 'themeHeroAlign', 'hero_menu_visible': 'themeHeroMenuVisible', 'hero_box_width': 'themeHeroBoxWidth',
    'hero_box_border_width': 'themeHeroBoxBorderWidth', 'hero_box_border_color': 'themeHeroBoxBorderColor', 'hero_border_top': 'themeHeroBorderTop',
    'hero_border_bottom_box': 'themeHeroBorderBottomBox', 'hero_border_left': 'themeHeroBorderLeft', 'hero_border_right': 'themeHeroBorderRight',
    'button_border_radius': 'themeBtnRadius', 'hero_pill_radius': 'themeHeroPillRadius', 'hero_main_border_width': 'themeHeroMainBorderWidth',
    'hero_main_border_color': 'themeHeroMainBorderColor', 'hero_main_border_pos': 'themeHeroMainBorderPos', 'text_sys_status': 'themeTextSysStatus',
    'sec_border_live_width': 'themeLiveBorderWidth', 'sec_border_live_color': 'themeLiveBorderColor', 'sec_border_upcoming_width': 'themeUpcomingBorderWidth',
    'sec_border_upcoming_color': 'themeUpcomingBorderColor', 'sec_border_wildcard_width': 'themeWildcardBorderWidth', 'sec_border_wildcard_color': 'themeWildcardBorderColor',
    'sec_border_leagues_width': 'themeLeaguesBorderWidth', 'sec_border_leagues_color': 'themeLeaguesBorderColor', 'sec_border_grouped_width': 'themeGroupedBorderWidth',
    'sec_border_grouped_color': 'themeGroupedBorderColor', 'sec_border_league_upcoming_width': 'themeLeagueUpcomingBorderWidth', 'sec_border_league_upcoming_color': 'themeLeagueUpcomingBorderColor',
    'article_bg': 'themeArticleBg', 'article_text': 'themeArticleText', 'article_line_height': 'themeArticleLineHeight', 'article_bullet_color': 'themeArticleBullet',
    'article_link_color': 'themeArticleLink', 'article_h2_color': 'themeArticleH2Color', 'article_h2_border_width': 'themeArticleH2BorderWidth', 'article_h2_border_color': 'themeArticleH2BorderColor',
    'article_h3_color': 'themeArticleH3Color', 'article_h4_color': 'themeArticleH4Color', 'match_row_bg': 'themeMatchRowBg', 'match_row_border': 'themeMatchRowBorder',
    'match_row_team_name_color': 'themeMatchTeamColor', 'match_row_time_main_color': 'themeMatchTimeColor', 'match_row_live_border_left': 'themeMatchLiveBorder',
    'match_row_live_bg_start': 'themeMatchLiveBgStart', 'match_row_live_bg_end': 'themeMatchLiveBgEnd', 'match_row_live_text_color': 'themeMatchLiveText',
    'row_height_mode': 'themeRowHeight', 'match_row_btn_watch_bg': 'themeBtnWatchBg', 'match_row_btn_watch_text': 'themeBtnWatchText',
    'footer_bg_start': 'themeFooterBgStart', 'footer_bg_end': 'themeFooterBgEnd', 'footer_desc_color': 'themeFooterText', 'footer_link_color': 'themeFooterLink',
    'footer_text_align_desktop': 'themeFooterAlign', 'footer_columns': 'themeFooterCols', 'footer_show_disclaimer': 'themeFooterShowDisclaimer',
    'footer_slot_1': 'themeFooterSlot1', 'footer_slot_2': 'themeFooterSlot2', 'footer_slot_3': 'themeFooterSlot3', 'wildcard_category': 'themeWildcardCat',
    'text_live_section_title': 'themeTextLiveTitle', 'text_wildcard_title': 'themeTextWildcardTitle', 'text_top_upcoming_title': 'themeTextTopUpcoming',
    'text_show_more': 'themeTextShowMore', 'text_section_link': 'themeTextSectionLink', 'text_watch_btn': 'themeTextWatch', 'text_hd_badge': 'themeTextHd',
    'text_section_prefix': 'themeTextSectionPrefix', 'match_row_hover_bg': 'themeMatchRowHoverBg', 'match_row_hover_border': 'themeMatchRowHoverBorder',
    'section_logo_size': 'themeSectionLogoSize', 'show_more_btn_bg': 'themeShowMoreBg', 'show_more_btn_border': 'themeShowMoreBorder',
    'show_more_btn_text': 'themeShowMoreText', 'show_more_btn_radius': 'themeShowMoreRadius', 'social_desktop_top': 'themeSocialDeskTop',
    'social_desktop_left': 'themeSocialDeskLeft', 'social_desktop_scale': 'themeSocialDeskScale', 'mobile_footer_height': 'themeMobFootHeight',
    'social_telegram_color': 'themeSocialTelegram', 'social_whatsapp_color': 'themeSocialWhatsapp', 'social_reddit_color': 'themeSocialReddit',
    'social_twitter_color': 'themeSocialTwitter', 'mobile_footer_bg': 'themeMobFootBg', 'back_to_top_bg': 'themeBttBg', 'back_to_top_icon_color': 'themeBttIcon',
    'back_to_top_radius': 'themeBttRadius', 'back_to_top_size': 'themeBttSize', 'display_hero': 'themeDisplayHero', 'watch_sidebar_swap': 'themeWatchSidebarSwap',
    'watch_show_ad1': 'themeWatchShowAd1', 'watch_show_discord': 'themeWatchShowDiscord', 'watch_show_ad2': 'themeWatchShowAd2', 'watch_discord_order': 'themeWatchDiscordOrder',
    'watch_discord_title': 'themeWatchDiscordTitle', 'watch_discord_btn_text': 'themeWatchDiscordBtnText', 'chat_header_title': 'themeWatchChatHeaderTitle',
    'chat_header_bg': 'themeWatchChatHeaderBg', 'chat_header_text': 'themeWatchChatHeaderText', 'chat_dot_color': 'themeWatchChatDotColor',
    'chat_dot_size': 'themeWatchChatDotSize', 'chat_overlay_bg': 'themeWatchChatOverlayBg', 'chat_overlay_opacity': 'themeWatchChatOverlayOpacity',
    'chat_input_bg': 'themeWatchChatInputBg', 'chat_input_text': 'themeWatchChatInputText', 'chat_join_btn_text': 'themeWatchChatJoinBtnText',
    'watch_table_head_bg': 'themeWatchTableHeadBg', 'watch_table_body_bg': 'themeWatchTableBodyBg', 'watch_table_border': 'themeWatchTableBorder',
    'watch_table_radius': 'themeWatchTableRadius', 'watch_team_color': 'themeWatchTeamColor', 'watch_vs_color': 'themeWatchVsColor',
    'watch_team_size': 'themeWatchTeamSize', 'watch_vs_size': 'themeWatchVsSize', 'watch_btn_bg': 'themeWatchBtnBg', 'watch_btn_text': 'themeWatchBtnText',
    'watch_btn_disabled_bg': 'themeWatchBtnDisabledBg', 'watch_btn_disabled_text': 'themeWatchBtnDisabledText', 'watch_btn_label': 'themeWatchBtnLabel',
    'watch_btn_disabled_label': 'themeWatchBtnDisabledLabel', 'watch_info_btn_bg': 'themeWatchInfoBtnBg', 'watch_info_btn_hover': 'themeWatchInfoBtnHover',
    'watch_info_btn_text': 'themeWatchInfoBtnText', 'watch_info_btn_label': 'themeWatchInfoBtnLabel', 'watch_server_active_bg': 'themeWatchServerActiveBg',
    'watch_server_text': 'themeWatchServerText'
};



// ====================
// GITHUB API FUNCTIONS
// ====================

async function fetchGitHubFile(path) {
    if (!GITHUB.connected) throw new Error('Not connected to GitHub');

    const url = `https://api.github.com/repos/${GITHUB.owner}/${GITHUB.repo}/contents/${path}?ref=${GITHUB.branch}`;

    try {
        const response = await fetch(url, {
            headers: {
                'Authorization': `token ${GITHUB.token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (response.status === 404) return null; // File doesn't exist

        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status}`);
        }

        const data = await response.json();
        return {
            content: atob(data.content),
            sha: data.sha
        };
    } catch (error) {
        console.error(`Error fetching ${path}:`, error);
        return null;
    }
}

async function updateGitHubFile(path, content, message, sha = null) {
    if (!GITHUB.connected) throw new Error('Not connected to GitHub');

    // If sha not provided, try to fetch it
    if (!sha) {
        const existing = await fetchGitHubFile(path);
        if (existing) sha = existing.sha;
    }

    const url = `https://api.github.com/repos/${GITHUB.owner}/${GITHUB.repo}/contents/${path}`;

    const body = {
        message: message,
        content: btoa(unescape(encodeURIComponent(content))),
        branch: GITHUB.branch
    };

    if (sha) body.sha = sha;

    const response = await fetch(url, {
        method: 'PUT',
        headers: {
            'Authorization': `token ${GITHUB.token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Failed to update ${path}`);
    }

    return await response.json();
}

// ====================
// CONFIG MANAGEMENT
// ====================
let currentConfigSHA = null;
let currentLeagueMapSHA = null;
let currentThemeContext = 'home';
let isBuilding = false;

async function loadConfigFromGitHub() {
    showStatus('Loading configuration...', 'loading');

    // Init TinyMCE here if needed, or in listener
    if (typeof tinymce !== 'undefined' && !tinymce.get('pageContentEditor')) {
        tinymce.init({
            selector: '#pageContentEditor', height: 400, skin: 'oxide-dark', content_css: 'dark',
            setup: (ed) => { ed.on('change', window.saveEditorContentToMemory); }
        });
    }

    try {
        // Load config.json
        const configFile = await fetchGitHubFile(REPO_FILES.CONFIG);
        if (configFile) {
            currentConfig = JSON.parse(configFile.content);
            currentConfigSHA = configFile.sha;
            console.log(' Loaded config');
        } else {
            currentConfig = JSON.parse(JSON.stringify(DEMO_CONFIG));
            console.log('Using default config');
        }

        // Load league_map.json
        const leagueFile = await fetchGitHubFile(REPO_FILES.LEAGUE_MAP);
        if (leagueFile) {
            currentLeagueMap = JSON.parse(leagueFile.content);
            currentLeagueMapSHA = leagueFile.sha;
            console.log(' Loaded league map');
        } else {
            currentLeagueMap = {};
        }

        // Normalization
        if (!currentConfig) {
            console.warn('Config was null, resetting to default');
            currentConfig = JSON.parse(JSON.stringify(DEMO_CONFIG));
        }

        // Sync configData for legacy functions
        configData = currentConfig;

        if (!currentConfig.pages) currentConfig.pages = DEMO_CONFIG.pages;
        if (!currentConfig.sport_priorities) currentConfig.sport_priorities = JSON.parse(JSON.stringify(DEFAULT_PRIORITIES));
        if (!currentConfig.social_sharing) currentConfig.social_sharing = DEMO_CONFIG.social_sharing;
        if (!currentConfig.theme) currentConfig.theme = {};

        populateAllFields();
        showStatus(' Configuration loaded', 'success');

        // Populate Upload Status
        const upStatus = document.getElementById('uploadProgress');
        if (upStatus) {
            upStatus.innerHTML = "<strong style='color:#22c55e'> Config Loaded</strong><br> Leagues";
            document.getElementById('uploadStatus').style.display = 'block';
        }

    } catch (error) {
        showStatus('Error loading: ' + error.message, 'error');
    }
}

function getDefaultConfig() { return DEMO_CONFIG; }

function populateAllFields() {
    if (!currentConfig) return;
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

    // Legacy mapping
    if (typeof injectMissingThemeUI === 'function') injectMissingThemeUI();
    if (typeof renderThemeSettings === 'function') renderThemeSettings();
    if (typeof renderPriorities === 'function') renderPriorities();
    if (typeof renderMenus === 'function') renderMenus();
    if (typeof renderPageList === 'function') renderPageList();
    if (typeof renderLeagues === 'function') renderLeagues();

    // Watch
    const w = currentConfig.watch_settings || {};
    setVal('supaUrl', w.supabase_url);
    setVal('supaKey', w.supabase_key);
    setVal('watchPageTitle', w.meta_title);
    setVal('watchPageDesc', w.meta_desc);
    setVal('watchPageArticle', w.article);
    setVal('watchAdMobile', w.ad_mobile);
    setVal('watchAdSidebar1', w.ad_sidebar_1);
    setVal('watchAdSidebar2', w.ad_sidebar_2);

    // Social
    const soc = currentConfig.social_sharing || {};
    setVal('socialTelegram', soc.counts?.telegram);
    setVal('socialWhatsapp', soc.counts?.whatsapp);
    setVal('socialReddit', soc.counts?.reddit);
    setVal('socialTwitter', soc.counts?.twitter);
    setVal('socialExcluded', soc.excluded_pages);

    // Articles
    const a = currentConfig.articles || {};
    setVal('tplLeagueArticle', a.league);
    setVal('tplSportArticle', a.sport);
    setVal('tplExcludePages', a.excluded);
    setVal('tplLeagueH1', a.league_h1);
    setVal('tplLeagueIntro', a.league_intro);
    setVal('tplLeagueUpcomingTitle', a.league_upcoming_title);

    // Automation
    loadCronSettings();
}

function setValue(id, value) {
    if (document.getElementById(id)) document.getElementById(id).value = value || '';
}

function getValue(id) {
    return document.getElementById(id)?.value || '';
}

// Global aliases for legacy support
window.setVal = setValue;
window.getVal = getValue;

async function saveAllChanges() {
    if (!GITHUB.connected) {
        alert('Please login to GitHub first');
        return;
    }

    if (!confirm('Save all changes to GitHub?')) return;
    showStatus('Saving to GitHub...', 'loading');

    try {
        const configToSave = buildConfigFromUI();

        // 1. Save config.json
        await updateGitHubFile(
            REPO_FILES.CONFIG,
            JSON.stringify(configToSave, null, 2),
            'Update config [Admin Panel]',
            currentConfigSHA
        );

        // 2. Save league_map.json
        await updateGitHubFile(
            REPO_FILES.LEAGUE_MAP,
            JSON.stringify(currentLeagueMap, null, 2),
            'Update league map [Admin Panel]',
            currentLeagueMapSHA
        );

        showStatus(' All changes saved successfully!', 'success');
        // Reload
        await loadConfigFromGitHub();

    } catch (error) {
        showStatus('Error saving: ' + error.message, 'error');
        alert('Failed to save changes: ' + error.message);
    }
}

function buildConfigFromUI() {
    const config = JSON.parse(JSON.stringify(currentConfig || getDefaultConfig()));

    config.site_settings = {
        title_part_1: getValue('titleP1'),
        title_part_2: getValue('titleP2'),
        domain: getValue('siteDomain'),
        target_country: getValue('targetCountry'),
        logo_url: getValue('logoUrl'),
        favicon_url: getValue('faviconUrl'),
        api_url: getValue('apiUrl'),
        footer_copyright: getValue('footerCopyright'),
        footer_disclaimer: getValue('footerDisclaimer'),
        param_live: getValue('paramLive'),
        param_info: getValue('paramInfo')
    };

    if (typeof captureThemeState === 'function') captureThemeState(currentThemeContext);

    config.watch_settings = {
        supabase_url: getValue('supaUrl'),
        supabase_key: getValue('supaKey'),
        meta_title: getValue('watchPageTitle'),
        meta_desc: getValue('watchPageDesc'),
        article: getValue('watchPageArticle'),
        ad_mobile: getValue('watchAdMobile'),
        ad_sidebar_1: getValue('watchAdSidebar1'),
        ad_sidebar_2: getValue('watchAdSidebar2')
    };

    config.social_sharing = {
        counts: {
            telegram: parseInt(getValue('socialTelegram')) || 0,
            whatsapp: parseInt(getValue('socialWhatsapp')) || 0,
            reddit: parseInt(getValue('socialReddit')) || 0,
            twitter: parseInt(getValue('socialTwitter')) || 0
        },
        excluded_pages: getValue('socialExcluded')
    };

    config.articles = {
        league: getValue('tplLeagueArticle'), sport: getValue('tplSportArticle'), excluded: getValue('tplExcludePages'),
        league_h1: getValue('tplLeagueH1'), league_intro: getValue('tplLeagueIntro'),
        league_live_title: getValue('tplLeagueLiveTitle'), league_upcoming_title: getValue('tplLeagueUpcomingTitle')
    };

    config.automation = {
        api_key: getValue('cronApiKey'),
        job_id: getValue('cronJobId')
    };

    return config;
}
// ====================
// FILE UPLOAD SYSTEM
// ====================

async function uploadCMSFiles() {
    if (!GITHUB.connected) {
        alert('Please login to GitHub first');
        return;
    }

    if (!confirm('This will upload all CMS files to your GitHub repository.\n\nNOTE: This will continuously sync your local CMS folder with the GitHub repository. Any files not on your PC will be removed from the repository.')) {
        return;
    }

    const statusDiv = document.getElementById('uploadStatus');
    const progressDiv = document.getElementById('uploadProgress');
    statusDiv.style.display = 'block';
    progressDiv.innerHTML = 'Starting upload process...';

    const uploadBtn = document.querySelector('button[onclick="uploadCMSFiles()"]');
    if (uploadBtn) uploadBtn.disabled = true;

    try {
        // Trigger server-side deployment
        const response = await fetch('/api/deploy', {
            method: 'POST'
        });

        const result = await response.json();

        if (result.status === 'success') {
            progressDiv.innerHTML = `<strong style="color: #22c55e;">✓ ${result.message}</strong>`;
            alert(result.message);
        } else {
            throw new Error(result.message);
        }

    } catch (error) {
        progressDiv.innerHTML = `<strong style="color: #ef4444;">✗ Upload failed: ${error.message}</strong>`;
        alert('Upload failed: ' + error.message);
    } finally {
        if (uploadBtn) uploadBtn.disabled = false;
    }
}




async function prepareCMSFiles() {
    const files = [];
    let leagueMapData = {};

    // 1. Load League Map
    try {
        const response = await fetch('../assets/data/league_map.json');
        if (response.ok) {
            leagueMapData = await response.json();
            console.log('✓ Loaded league data:', Object.keys(leagueMapData).length, 'leagues');
        }
    } catch (e) {
        console.error('Error loading league map:', e);
    }

    // 2. Load Master Template
    let templateContent = '';
    try {
        const response = await fetch('../assets/master_template.html');
        if (response.ok) {
            templateContent = await response.text();
            console.log('✓ Loaded master template');
        } else {
            throw new Error('Template file not found');
        }
    } catch (e) {
        console.error('Error loading template:', e);
        throw e;
    }

    // 3. Load Build Script
    let buildScript = '';
    try {
        const response = await fetch('../core/build_engine.py');
        if (response.ok) {
            buildScript = await response.text();
            console.log('✓ Loaded build script');
        } else {
            throw new Error('Build script not found');
        }
    } catch (e) {
        console.error('Error loading build script:', e);
        throw e;
    }

    files.push({
        path: 'data/config.json',
        content: JSON.stringify(currentConfig || getDefaultConfig(), null, 2)
    });

    files.push({
        path: 'assets/data/league_map.json',
        content: JSON.stringify(leagueMapData, null, 2)
    });

    files.push({
        path: 'assets/master_template.html',
        content: templateContent
    });

    files.push({
        path: 'index.html',
        content: getIndexHTMLTemplate()
    });

    files.push({
        path: '.github/workflows/update-site.yml',
        content: getGitHubWorkflowTemplate()
    });

    files.push({
        path: 'scripts/build.py',
        content: buildScript
    });

    files.push({
        path: 'README.md',
        content: '# Sports Streaming Website\n\nGenerated by StreamCMS'
    });

    console.log(`✓ Prepared ${files.length} files for upload`);
    return files;
}

function getIndexHTMLTemplate() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Live Sports Streams</title>
</head>
<body>
    <h1>Sports Streaming Site</h1>
    <p>This site is powered by StreamCMS. Configure via the admin panel.</p>
</body>
</html>`;
}

function getGitHubWorkflowTemplate() {
    return `name: Update Site
on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.9'
          
      - name: Run Build Script
        run: |
          python scripts/build.py
          
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: \${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./
          keep_files: true
`;
}

// ====================
// UI HELPERS
// ====================

function switchTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    // Remove active from all nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Show selected tab
    const selectedTab = document.getElementById(`tab-${tabName}`);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }

    // Highlight active nav button
    event.target.classList.add('active');
}

function showStatus(message, type = 'info') {
    const statusText = document.getElementById('buildStatusText');
    const statusBox = document.getElementById('buildStatusBox');

    if (statusText) statusText.textContent = message;

    if (statusBox) {
        statusBox.className = 'build-box ' + type;
    }

    console.log(`[${type}] ${message} `);
}


// ==========================================
// 5. THEME DESIGNER FUNCTIONS (UPDATED)
// ==========================================
function injectMissingThemeUI() {
    const themeTab = document.getElementById('tab-theme');
    if (!themeTab) return;

    // Clean up old injections
    const existingInput = document.getElementById('themeWildcardCat');
    if (existingInput) {
        const container = existingInput.closest('.grid-3');
        if (container) container.remove();
    }

    const newSection = document.createElement('div');
    newSection.className = 'grid-3';
    newSection.innerHTML = `
        <!-- CARD 1: CONTENT & LOGIC -->
        <div class="card">
            <h3>⚡ Content & Logic</h3>
            <div class="range-wrapper" style="margin-bottom:15px; border-bottom:1px solid #333; padding-bottom:10px;">
                <label style="color:#facc15;">🔥 Wildcard Category</label>
                <input type="text" id="themeWildcardCat" placeholder="e.g. NFL, Premier League">
            </div>

            <h4 style="margin:15px 0 5px 0; font-size:0.8rem; color:#aaa;">Titles</h4>
            <div class="grid-2" style="gap:10px;">
                <div style="grid-column: span 2;"><input type="text" id="themeTextWildcardTitle" placeholder="Wildcard Title"></div>
                <div style="grid-column: span 2;"><input type="text" id="themeTextTopUpcoming" placeholder="Top 5 Title"></div>
                <div><label>Status Text</label><input type="text" id="themeTextSysStatus" placeholder="System Status: Online"></div>
                <div><label>Live</label><input type="text" id="themeTextLiveTitle"></div>
                <div><label>Show More</label><input type="text" id="themeTextShowMore"></div>
                <div><label>Btn</label><input type="text" id="themeTextWatch"></div>
                <div><label>Badge</label><input type="text" id="themeTextHd"></div>
                <div><label>Link</label><input type="text" id="themeTextSectionLink"></div>
                <div><label>Prefix</label><input type="text" id="themeTextSectionPrefix"></div>
            </div>
        </div>

        <!-- CARD 2: STYLING & BORDERS (UPDATED) -->
        <div class="card">
            <h3>🎨 Section Borders</h3>
            <p style="font-size:0.75rem; color:#aaa; margin-bottom:15px;">Customize bottom borders for specific sections.</p>

            <!-- Live -->
            <label>Trending Live</label>
            <div class="input-group">
                <input type="number" id="themeLiveBorderWidth" placeholder="Width (px)" value="1">
                <input type="color" id="themeLiveBorderColor" value="#334155">
            </div>

            <!-- Upcoming -->
            <label>Top 5 Upcoming</label>
            <div class="input-group">
                <input type="number" id="themeUpcomingBorderWidth" placeholder="Width (px)" value="1">
                <input type="color" id="themeUpcomingBorderColor" value="#334155">
            </div>

            <!-- Wildcard -->
            <label>Wildcard Section</label>
            <div class="input-group">
                <input type="number" id="themeWildcardBorderWidth" placeholder="Width (px)" value="1">
                <input type="color" id="themeWildcardBorderColor" value="#334155">
            </div>
            <!-- Grouped Sports (Main List) -->
            <label>Grouped Sports/Leagues</label>
            <div class="input-group">
                <input type="number" id="themeGroupedBorderWidth" placeholder="Width (px)" value="1">
                <input type="color" id="themeGroupedBorderColor" value="#334155">
            </div>

            <!-- Footer Leagues -->
            <label>Footer Popular Leagues</label>
            <div class="input-group">
                <input type="number" id="themeLeaguesBorderWidth" placeholder="Width (px)" value="1">
                <input type="color" id="themeLeaguesBorderColor" value="#334155">
            </div>
            
            <h4 style="margin:15px 0 5px 0; font-size:0.8rem; color:#aaa;">Buttons</h4>
            <div class="color-grid">
                <div><label>Show More BG</label><input type="color" id="themeShowMoreBg"></div>
                <div><label>Text</label><input type="color" id="themeShowMoreText"></div>
            </div>
            <div class="range-wrapper"><label>Radius</label><input type="text" id="themeShowMoreRadius" placeholder="30px"></div>
        </div>

        <!-- CARD 3: FLOATING ELEMENTS -->
        <div class="card">
            <h3>📍 Floating & Extras</h3>
            <h4 style="margin:5px 0 5px 0; font-size:0.8rem; color:#aaa;">Back to Top</h4>
            <div class="color-grid">
                <div><label>BG</label><input type="color" id="themeBttBg"></div>
                <div><label>Icon</label><input type="color" id="themeBttIcon"></div>
            </div>
            
            <h4 style="margin:10px 0 5px 0; font-size:0.8rem; color:#aaa;">Section Logo Size</h4>
             <input type="range" id="themeSectionLogoSize" min="0" max="60" step="1">

            <h4 style="margin:10px 0 5px 0; font-size:0.8rem; color:#aaa;">Social Sidebar</h4>
            <div class="grid-2" style="gap:10px;">
                <div><label>Top</label><input type="text" id="themeSocialDeskTop"></div>
                <div><label>Left</label><input type="text" id="themeSocialDeskLeft"></div>
                <div><label>Scale</label><input type="text" id="themeSocialDeskScale"></div>
            </div>
            <h4 style="margin:10px 0 5px 0; font-size:0.8rem; color:#aaa;">Social Colors</h4>
            <div class="color-grid">
                <div><label>Telegram</label><input type="color" id="themeSocialTelegram"></div>
                <div><label>WhatsApp</label><input type="color" id="themeSocialWhatsapp"></div>
                <div><label>Reddit</label><input type="color" id="themeSocialReddit"></div>
                <div><label>Twitter</label><input type="color" id="themeSocialTwitter"></div>
            </div>
             <h4 style="margin:10px 0 5px 0; font-size:0.8rem; color:#aaa;">Match Hover</h4>
            <div class="color-grid">
                <div><label>Hover BG</label><input type="color" id="themeMatchRowHoverBg"></div>
                <div><label>Hover Border</label><input type="color" id="themeMatchRowHoverBorder"></div>
            </div>
        </div>
    `;
    themeTab.appendChild(newSection);
}

function renderThemeSettings() {
    const t = configData.theme || {};
    // Checkbox Logic for Hero Borders
    if (document.getElementById('themeHeroBorderTop')) document.getElementById('themeHeroBorderTop').checked = t.hero_border_top === true;
    if (document.getElementById('themeHeroBorderBottomBox')) document.getElementById('themeHeroBorderBottomBox').checked = t.hero_border_bottom_box === true; // NEW
    if (document.getElementById('themeHeroBorderLeft')) document.getElementById('themeHeroBorderLeft').checked = t.hero_border_left === true;
    if (document.getElementById('themeHeroBorderRight')) document.getElementById('themeHeroBorderRight').checked = t.hero_border_right === true;
    if (document.getElementById('val_btnRadius')) document.getElementById('val_btnRadius').innerText = (t.button_border_radius || '4') + 'px';
    if (document.getElementById('val_pillRadius')) document.getElementById('val_pillRadius').innerText = (t.hero_pill_radius || '50') + 'px';
    if (document.getElementById('val_headerWidth')) document.getElementById('val_headerWidth').innerText = (t.header_max_width || '1100') + 'px';

    // Check if THEME_FIELDS is defined, if not, wait or skip
    if (typeof THEME_FIELDS !== 'undefined') {
        for (const [jsonKey, htmlId] of Object.entries(THEME_FIELDS)) {
            if (t[jsonKey]) setVal(htmlId, t[jsonKey]);
        }
    }

    if (document.getElementById('val_borderRadius')) document.getElementById('val_borderRadius').innerText = (t.border_radius_base || '6') + 'px';
    if (document.getElementById('val_maxWidth')) document.getElementById('val_maxWidth').innerText = (t.container_max_width || '1100') + 'px';
    if (document.getElementById('val_secLogo')) document.getElementById('val_secLogo').innerText = (t.section_logo_size || '24') + 'px';

    if (typeof toggleHeroInputs === 'function') toggleHeroInputs();
    if (typeof toggleHeaderInputs === 'function') toggleHeaderInputs();
    if (typeof toggleHeroBoxSettings === 'function') toggleHeroBoxSettings();
    if (typeof toggleFooterSlots === 'function') toggleFooterSlots();
}

// Helpers
window.toggleHeroBoxSettings = () => {
    const mode = document.getElementById('themeHeroLayoutMode').value;
    const settings = document.getElementById('heroBoxSettings');
    settings.style.display = (mode === 'box') ? 'block' : 'none';
    const posSelect = document.getElementById('themeHeroMainBorderPos');
    const boxOption = posSelect.querySelector('.opt-box-only');
    if (boxOption) {
        if (mode === 'box') {
            boxOption.disabled = false;
            boxOption.innerText = "Match Box Width";
        } else {
            boxOption.disabled = true;
            boxOption.innerText = "Match Box Width (Box Layout Only)";
            if (posSelect.value === 'box') posSelect.value = 'full';
        }
    }
};

window.toggleHeroInputs = () => {
    const style = document.getElementById('themeHeroBgStyle').value;
    document.getElementById('heroSolidInput').style.display = style === 'solid' ? 'block' : 'none';
    document.getElementById('heroGradientInput').style.display = style === 'gradient' ? 'grid' : 'none';
    document.getElementById('heroImageInput').style.display = style === 'image' ? 'block' : 'none';
};
window.toggleHeaderInputs = () => {
    const layout = document.getElementById('themeHeaderLayout').value;
    const iconGroup = document.getElementById('headerIconPosGroup');
    if (iconGroup) iconGroup.style.display = (layout === 'center') ? 'block' : 'none';
};
window.toggleFooterSlots = () => {
    const cols = document.getElementById('themeFooterCols').value;
    const slot3 = document.getElementById('footerSlot3Group');
    if (slot3) slot3.style.display = (cols === '3') ? 'block' : 'none';
};

// ==========================================
// 1. FIXED THEME PRESETS
// ==========================================
const THEME_PRESETS = {
    red: {
        themeBrandPrimary: '#D00000', themeBrandDark: '#8a0000', themeAccentGold: '#FFD700', themeStatusGreen: '#00e676',
        themeBgBody: '#050505', themeBgPanel: '#0f0f0f', themeTextMain: '#ffffff', themeTextMuted: '#888888',
        themeBorderColor: '#222222', themeScrollThumb: '#333333', themeHeaderBg: '#050505', themeHeaderText: '#aaaaaa',
        themeHeaderActive: '#ffffff', themeLogoP1: '#ffffff', themeLogoP2: '#D00000', themeHeaderBorderBottom: '1px solid var(--border)',
        themeHeroBgStyle: 'gradient', themeHeroGradStart: '#2a0505', themeHeroGradEnd: '#000000', themeHeroH1: '#ffffff',
        themeHeroIntro: '#999999', themeHeroPillBg: '#111111', themeHeroPillText: '#cccccc', themeHeroPillActiveBg: '#2a0a0a',
        themeHeroPillActiveText: '#ffffff', themeMatchRowBg: '#121212', themeMatchRowBorder: '#222222', themeMatchTeamColor: '#ffffff',
        themeMatchTimeColor: '#888888', themeMatchLiveBgStart: '#1a0505', themeMatchLiveBgEnd: '#141414', themeMatchLiveText: '#D00000',
        themeMatchLiveBorder: '3px solid var(--brand-primary)', themeBtnWatchBg: '#D00000', themeBtnWatchText: '#ffffff',
        themeFooterBgStart: '#0e0e0e', themeFooterBgEnd: '#050505', themeFooterText: '#64748b', themeFooterLink: '#94a3b8',
        themeShowMoreBg: '#151515', themeShowMoreText: '#cccccc', themeShowMoreBorder: '#333333', themeMatchRowHoverBg: '#1a1a1a',
        themeMatchRowHoverBorder: '#444444', themeBttBg: '#D00000', themeBttIcon: '#ffffff', themeMobFootBg: '#0a0a0a'
    },
    blue: {
        themeBrandPrimary: '#2563EB', themeBrandDark: '#1e3a8a', themeAccentGold: '#38bdf8', themeStatusGreen: '#00e676',
        themeBgBody: '#020617', themeBgPanel: '#0f172a', themeTextMain: '#f8fafc', themeTextMuted: '#94a3b8',
        themeBorderColor: '#1e293b', themeScrollThumb: '#334155', themeHeaderBg: '#020617', themeHeaderText: '#94a3b8',
        themeHeaderActive: '#ffffff', themeLogoP1: '#f8fafc', themeLogoP2: '#2563EB', themeHeaderBorderBottom: '1px solid var(--border)',
        themeHeroBgStyle: 'gradient', themeHeroGradStart: '#0f172a', themeHeroGradEnd: '#020617', themeHeroH1: '#ffffff',
        themeHeroIntro: '#94a3b8', themeHeroPillBg: '#1e293b', themeHeroPillText: '#cbd5e1', themeHeroPillActiveBg: '#172554',
        themeHeroPillActiveText: '#ffffff', themeMatchRowBg: '#0f172a', themeMatchRowBorder: '#1e293b', themeMatchTeamColor: '#f1f5f9',
        themeMatchTimeColor: '#94a3b8', themeMatchLiveBgStart: '#172554', themeMatchLiveBgEnd: '#0f172a', themeMatchLiveText: '#60a5fa',
        themeMatchLiveBorder: '3px solid var(--brand-primary)', themeBtnWatchBg: '#2563EB', themeBtnWatchText: '#ffffff',
        themeFooterBgStart: '#0f172a', themeFooterBgEnd: '#020617', themeFooterText: '#64748b', themeFooterLink: '#94a3b8',
        themeShowMoreBg: '#1e293b', themeShowMoreText: '#cbd5e1', themeShowMoreBorder: '#334155', themeMatchRowHoverBg: '#1e293b',
        themeMatchRowHoverBorder: '#38bdf8', themeBttBg: '#2563EB', themeBttIcon: '#ffffff', themeMobFootBg: '#020617'
    },
    green: {
        themeBrandPrimary: '#16a34a', themeBrandDark: '#14532d', themeAccentGold: '#facc15', themeStatusGreen: '#22c55e',
        themeBgBody: '#050505', themeBgPanel: '#111111', themeTextMain: '#ffffff', themeTextMuted: '#a3a3a3',
        themeBorderColor: '#262626', themeScrollThumb: '#404040', themeHeaderBg: '#050505', themeHeaderText: '#a3a3a3',
        themeHeaderActive: '#ffffff', themeLogoP1: '#ffffff', themeLogoP2: '#16a34a', themeHeaderBorderBottom: '1px solid var(--border)',
        themeHeroBgStyle: 'gradient', themeHeroGradStart: '#052e16', themeHeroGradEnd: '#000000', themeHeroH1: '#ffffff',
        themeHeroIntro: '#a3a3a3', themeHeroPillBg: '#262626', themeHeroPillText: '#d4d4d4', themeHeroPillActiveBg: '#064e3b',
        themeHeroPillActiveText: '#ffffff', themeMatchRowBg: '#111111', themeMatchRowBorder: '#262626', themeMatchTeamColor: '#f5f5f5',
        themeMatchTimeColor: '#737373', themeMatchLiveBgStart: '#052e16', themeMatchLiveBgEnd: '#111111', themeMatchLiveText: '#22c55e',
        themeMatchLiveBorder: '3px solid var(--brand-primary)', themeBtnWatchBg: '#16a34a', themeBtnWatchText: '#ffffff',
        themeFooterBgStart: '#111111', themeFooterBgEnd: '#000000', themeFooterText: '#737373', themeFooterLink: '#a3a3a3',
        themeShowMoreBg: '#171717', themeShowMoreText: '#d4d4d4', themeShowMoreBorder: '#262626', themeMatchRowHoverBg: '#262626',
        themeMatchRowHoverBorder: '#16a34a', themeBttBg: '#16a34a', themeBttIcon: '#ffffff', themeMobFootBg: '#050505'
    }
};

window.applyPreset = (presetName) => {
    if (!THEME_PRESETS[presetName]) return;
    const p = THEME_PRESETS[presetName];
    if (!confirm(`Apply ${presetName.toUpperCase()} preset? This will overwrite current color settings.`)) return;
    Object.keys(p).forEach(id => { setVal(id, p[id]); });
    if (p.themeHeroGradStart) setVal('themeHeroGradStart', p.themeHeroGradStart);
    if (p.themeHeroGradEnd) setVal('themeHeroGradEnd', p.themeHeroGradEnd);
    if (typeof toggleHeroInputs === 'function') toggleHeroInputs();
    if (document.getElementById('val_borderRadius')) document.getElementById('val_borderRadius').innerText = getVal('themeBorderRadius') + 'px';
    alert(`${presetName.toUpperCase()} preset loaded! click 'Save' to build.`);
};

// ==========================================
// 6. PRIORITIES & BOOST
// ==========================================
function renderPriorities() {
    const c = getVal('targetCountry') || 'US';
    const container = document.getElementById('priorityListContainer');
    if (!container) return;
    if (document.getElementById('prioLabel')) document.getElementById('prioLabel').innerText = c;

    if (!configData.sport_priorities[c]) configData.sport_priorities[c] = { _HIDE_OTHERS: false, _BOOST: "" };
    const isHideOthers = !!configData.sport_priorities[c]._HIDE_OTHERS;
    setVal('prioBoost', configData.sport_priorities[c]._BOOST || "");

    const items = Object.entries(configData.sport_priorities[c])
        .filter(([name]) => name !== '_HIDE_OTHERS' && name !== '_BOOST')
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.score - a.score);

    let html = `
        <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); padding: 15px; border-radius: 6px; margin-bottom: 20px;">
            <label style="margin:0; font-weight:700; color:#fca5a5; display:flex; align-items:center; gap:10px;">
                <input type="checkbox" ${isHideOthers ? 'checked' : ''} onchange="toggleHideOthers('${c}', this.checked)"> 
                🚫 Hide all others (Strict Mode)
            </label>
            <p style="margin:5px 0 0 26px; font-size:0.8rem; color:#aaa;">Only listed sports displayed.</p>
        </div>
    `;

    html += items.map(item => `
        <div class="menu-item-row" style="flex-wrap:wrap; opacity: ${item.isHidden ? '0.5' : '1'};">
            <strong style="width:140px; overflow:hidden;">${item.name}</strong>
            <div style="flex:1; display:flex; gap:10px; align-items:center;">
                <label style="margin:0; font-size:0.75rem;"><input type="checkbox" ${item.isLeague ? 'checked' : ''} onchange="updatePrioMeta('${c}','${item.name}','isLeague',this.checked)"> League</label>
                <label style="margin:0; font-size:0.75rem;"><input type="checkbox" ${item.hasLink ? 'checked' : ''} onchange="updatePrioMeta('${c}','${item.name}','hasLink',this.checked)"> Link</label>
                <label style="margin:0; font-size:0.75rem; color:#ef4444;"><input type="checkbox" ${item.isHidden ? 'checked' : ''} onchange="updatePrioMeta('${c}','${item.name}','isHidden',this.checked)"> Hide</label>
                <input type="number" value="${item.score}" onchange="updatePrioMeta('${c}','${item.name}','score',this.value)" style="width:60px; margin:0;">
                <button class="btn-icon" onclick="deletePriority('${c}', '${item.name}')">×</button>
            </div>
        </div>
    `).join('');
    container.innerHTML = html;
}

window.toggleHideOthers = (c, checked) => {
    if (!configData.sport_priorities[c]) configData.sport_priorities[c] = {};
    configData.sport_priorities[c]._HIDE_OTHERS = checked;
};
window.resetPriorities = () => {
    const c = getVal('targetCountry');
    if (!confirm(`Reset priorities for ${c}?`)) return;
    configData.sport_priorities[c] = JSON.parse(JSON.stringify(DEFAULT_PRIORITIES[c] || DEFAULT_PRIORITIES['US']));
    renderPriorities();
};
window.addPriorityRow = () => {
    const c = getVal('targetCountry');
    const name = getVal('newSportName');
    if (name) {
        if (!configData.sport_priorities[c]) configData.sport_priorities[c] = { _HIDE_OTHERS: false, _BOOST: "" };
        const isLikelyLeague = name.toLowerCase().match(/league|nba|nfl/);
        configData.sport_priorities[c][name] = { score: 50, isLeague: !!isLikelyLeague, hasLink: false, isHidden: false };
        setVal('newSportName', '');
        renderPriorities();
    }
};
window.updatePrioMeta = (c, name, key, val) => {
    const item = configData.sport_priorities[c][name];
    if (key === 'score') item.score = parseInt(val);
    else item[key] = val;
    if (key === 'isHidden') renderPriorities();
};
window.deletePriority = (c, name) => {
    if (confirm(`Remove ${name}?`)) {
        delete configData.sport_priorities[c][name];
        renderPriorities();
    }
};

// ==========================================
// 7. PAGES & MENUS (STANDARD)
// ==========================================
function renderPageList() {
    const tbody = document.querySelector('#pagesTable tbody');
    if (!tbody) return;
    if (!configData.pages) configData.pages = [];
    tbody.innerHTML = configData.pages.map(p => `
        <tr>
            <td><strong>${p.title}</strong></td>
            <td>/${p.slug}</td>
            <td>${p.layout}</td>
            <td>
                <button class="btn-primary" onclick="editPage('${p.id}')">Edit</button>
                ${p.slug !== 'home' ? `<button class="btn-danger" onclick="deletePage('${p.id}')">Del</button>` : ''}
            </td>
        </tr>
    `).join('');
}

window.editPage = (id) => {
    currentEditingPageId = id;
    const p = configData.pages.find(x => x.id === id);
    if (!p) return;
    document.getElementById('pageListView').style.display = 'none';
    document.getElementById('pageEditorView').style.display = 'block';
    document.getElementById('editorPageTitleDisplay').innerText = `Editing: ${p.title}`;
    setVal('pageTitle', p.title);
    setVal('pageH1Align', p.h1_align || 'left');
    setVal('pageSlug', p.slug);
    setVal('pageLayout', p.layout || 'page');
    setVal('pageMetaTitle', p.meta_title);
    setVal('pageMetaDesc', p.meta_desc);
    setVal('pageMetaKeywords', p.meta_keywords);
    setVal('pageCanonical', p.canonical_url);

    if (!p.schemas) p.schemas = {};
    if (!p.schemas.faq_list) p.schemas.faq_list = [];

    document.querySelector('#pageEditorView .checkbox-group').innerHTML = `
        <label style="color:#facc15; font-weight:700;">Static Schemas (SEO)</label>
        <label><input type="checkbox" id="schemaOrg" ${p.schemas.org ? 'checked' : ''}> Organization (The Entity)</label>
        <label><input type="checkbox" id="schemaWebsite" ${p.schemas.website ? 'checked' : ''}> WebSite</label>
        <label><input type="checkbox" id="schemaAbout" ${p.schemas.about ? 'checked' : ''}> About Page (Links to Org)</label> 
        <label><input type="checkbox" id="schemaFaq" ${p.schemas.faq ? 'checked' : ''} onchange="toggleFaqEditor(this.checked)"> FAQ</label>
        <div id="faqEditorContainer" style="display:${p.schemas.faq ? 'block' : 'none'}; margin-top:10px;">
            <div style="display:flex;justify-content:space-between;"><h4 style="margin:0">FAQ Items</h4><button class="btn-primary" onclick="addFaqItem()">+ Add</button></div>
            <div id="faqList" style="display:flex;flex-direction:column;gap:10px;margin-top:10px;"></div>
        </div>
    `;
    renderFaqItems(p.schemas.faq_list);
    if (tinymce.get('pageContentEditor')) tinymce.get('pageContentEditor').setContent(p.content || '');
    document.getElementById('pageSlug').disabled = (p.slug === 'home');
};

window.toggleFaqEditor = (isChecked) => { document.getElementById('faqEditorContainer').style.display = isChecked ? 'block' : 'none'; };
window.renderFaqItems = (list) => {
    document.getElementById('faqList').innerHTML = list.map((item, idx) => `
        <div style="background:rgba(0,0,0,0.2); padding:10px; border:1px solid #333;">
            <input type="text" class="faq-q" value="${item.q || ''}" placeholder="Question" style="font-weight:bold;margin-bottom:5px;">
            <textarea class="faq-a" rows="2" placeholder="Answer" style="margin-bottom:5px;">${item.a || ''}</textarea>
            <button class="btn-danger" style="padding:4px 8px;font-size:0.7rem;" onclick="removeFaqItem(${idx})">Remove</button>
        </div>
    `).join('');
};
window.addFaqItem = () => { saveCurrentFaqState(); configData.pages.find(x => x.id === currentEditingPageId).schemas.faq_list.push({ q: "", a: "" }); renderFaqItems(configData.pages.find(x => x.id === currentEditingPageId).schemas.faq_list); };
window.removeFaqItem = (idx) => { saveCurrentFaqState(); configData.pages.find(x => x.id === currentEditingPageId).schemas.faq_list.splice(idx, 1); renderFaqItems(configData.pages.find(x => x.id === currentEditingPageId).schemas.faq_list); };
function saveCurrentFaqState() {
    if (!currentEditingPageId) return;
    const p = configData.pages.find(x => x.id === currentEditingPageId);
    const div = document.getElementById('faqList');
    if (!div) return;
    p.schemas.faq_list = Array.from(div.querySelectorAll('.faq-q')).map((q, i) => ({ q: q.value, a: div.querySelectorAll('.faq-a')[i].value }));
}
window.saveEditorContentToMemory = () => {
    if (!currentEditingPageId) return;
    const p = configData.pages.find(x => x.id === currentEditingPageId);
    p.h1_align = getVal('pageH1Align');
    p.title = getVal('pageTitle'); p.slug = getVal('pageSlug'); p.layout = getVal('pageLayout');
    p.meta_title = getVal('pageMetaTitle'); p.meta_desc = getVal('pageMetaDesc'); p.meta_keywords = getVal('pageMetaKeywords'); p.canonical_url = getVal('pageCanonical');
    if (tinymce.get('pageContentEditor')) p.content = tinymce.get('pageContentEditor').getContent();
    saveCurrentFaqState();
    if (!p.schemas) p.schemas = {};
    p.schemas.org = document.getElementById('schemaOrg').checked;
    p.schemas.website = document.getElementById('schemaWebsite').checked;
    p.schemas.about = document.getElementById('schemaAbout').checked;
    p.schemas.faq = document.getElementById('schemaFaq').checked;
};
window.closePageEditor = () => { saveEditorContentToMemory(); document.getElementById('pageEditorView').style.display = 'none'; document.getElementById('pageListView').style.display = 'block'; renderPageList(); };
window.createNewPage = () => { configData.pages.push({ id: 'p_' + Date.now(), title: "New", slug: "new", layout: "page", content: "", schemas: { org: true } }); renderPageList(); };
window.deletePage = (id) => { if (confirm("Del?")) { configData.pages = configData.pages.filter(p => p.id !== id); renderPageList(); } };

function renderMenus() {
    ['header', 'hero', 'footer_static'].forEach(sec => {
        if (document.getElementById(`menu-${sec}`)) {
            document.getElementById(`menu-${sec}`).innerHTML = (configData.menus[sec] || []).map((item, idx) => `
                <div class="menu-item-row"><div>${item.highlight ? '<span style="color:#facc15">★</span>' : ''} <strong>${item.title}</strong> <small>(${item.url})</small></div><button class="btn-icon" onclick="deleteMenuItem('${sec}', ${idx})">×</button></div>
            `).join('');
        }
    });
}
window.openMenuModal = (sec) => {
    document.getElementById('menuTargetSection').value = sec;
    setVal('menuTitleItem', ''); setVal('menuUrlItem', '');
    const chk = document.getElementById('menuHighlightCheck'); if (chk) chk.parentNode.remove();
    if (sec === 'header') {
        const w = document.createElement('div'); w.innerHTML = `<label style="display:inline-flex;gap:5px;margin-top:10px;"><input type="checkbox" id="menuHighlightCheck"> Highlight</label>`;
        document.querySelector('#menuModal .modal-content').insertBefore(w, document.querySelector('#menuModal .modal-actions'));
    }
    document.getElementById('menuModal').style.display = 'flex';
};
window.saveMenuItem = () => {
    const sec = document.getElementById('menuTargetSection').value;
    if (!configData.menus[sec]) configData.menus[sec] = [];
    configData.menus[sec].push({ title: getVal('menuTitleItem'), url: getVal('menuUrlItem'), highlight: document.getElementById('menuHighlightCheck')?.checked });
    renderMenus(); document.getElementById('menuModal').style.display = 'none';
};
window.deleteMenuItem = (sec, idx) => { configData.menus[sec].splice(idx, 1); renderMenus(); };

function getGroupedLeagues() { return currentLeagueMap || {}; }
function renderLeagues() {
    const c = document.getElementById('leaguesContainer'); if (!c) return;
    const g = getGroupedLeagues();
    c.innerHTML = Object.keys(g).sort().map(l => `<div class="card"><div class="league-card-header"><h3>${l}</h3><span>${g[l].length} Teams</span></div><label>Teams</label><textarea class="team-list-editor" rows="6" data-league="${l}">${g[l].join(', ')}</textarea></div>`).join('');
}
window.copyAllLeaguesData = () => {
    let o = ""; for (const [l, t] of Object.entries(getGroupedLeagues())) o += `LEAGUE: ${l}\nTEAMS: ${t.join(', ')}\n---\n`;
    navigator.clipboard.writeText(o).then(() => alert("Copied!"));
};
window.openLeagueModal = () => document.getElementById('leagueModal').style.display = 'flex';
window.saveNewLeague = () => {
    const n = document.getElementById('newLeagueNameInput').value.trim();
    if (n) { if (!currentLeagueMap) currentLeagueMap = {}; currentLeagueMap[n] = ["new"]; renderLeagues(); document.getElementById('leagueModal').style.display = 'none'; }
};
function rebuildLeagueMapFromUI() {
    const map = {}; document.querySelectorAll('.team-list-editor').forEach(t => { map[t.getAttribute('data-league')] = t.value.split(',').map(x => x.trim().toLowerCase().replace(/\s+/g, '-')).filter(x => x.length > 0); });
    return map;
}

// ==========================================
// NEW: THEME CONTEXT SWITCHER LOGIC
// ==========================================
window.switchThemeContext = (mode) => {
    captureThemeState(currentThemeContext);
    currentThemeContext = mode;

    document.querySelectorAll('.ctx-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`ctxBtn-${mode}`).classList.add('active');

    const staticControls = document.getElementById('staticPageControls');
    const watchControls = document.getElementById('watchThemeControls');

    if (staticControls) staticControls.style.display = (mode === 'page') ? 'block' : 'none';
    if (mode === 'watch') {
        if (watchControls) watchControls.style.display = 'block';
        document.getElementById('ctxDesc').innerHTML = "Editing specific styles for the <strong>Watch Page</strong> + Global Styles.";
    } else {
        if (watchControls) watchControls.style.display = 'none';
        let desc = "Editing global styles.";
        if (mode === 'home') desc = "Editing global styles for the <strong>Homepage</strong>.";
        else if (mode === 'league') desc = "Editing styles for <strong>Inner League Pages</strong> (e.g. /nba-streams/).";
        else if (mode === 'page') desc = "Editing styles for <strong>Static Pages</strong> (About, Contact, etc).";
        document.getElementById('ctxDesc').innerHTML = desc;
    }

    let targetData;
    if (mode === 'home') targetData = configData.theme;
    else if (mode === 'league') targetData = configData.theme_league || {};
    else if (mode === 'page') targetData = configData.theme_page || {};
    else if (mode === 'watch') targetData = configData.theme_watch || {};

    if (!targetData || Object.keys(targetData).length === 0) targetData = configData.theme;
    applyThemeState(targetData);
};

function captureThemeState(mode) {
    if (!configData.theme) configData.theme = {};
    if (!configData.theme_league) configData.theme_league = {};
    if (!configData.theme_page) configData.theme_page = {};
    if (!configData.theme_watch) configData.theme_watch = {};

    const target = (mode === 'home') ? configData.theme :
        (mode === 'league') ? configData.theme_league :
            (mode === 'page') ? configData.theme_page :
                configData.theme_watch;

    if (typeof THEME_FIELDS === 'undefined') return;
    for (const [jsonKey, htmlId] of Object.entries(THEME_FIELDS)) {
        const el = document.getElementById(htmlId);
        if (!el) continue;
        target[jsonKey] = (el.type === 'checkbox') ? el.checked : el.value;
    }
}

function applyThemeState(data) {
    if (typeof THEME_FIELDS === 'undefined') return;
    for (const [jsonKey, htmlId] of Object.entries(THEME_FIELDS)) {
        const el = document.getElementById(htmlId);
        if (!el) continue;
        const val = data[jsonKey];
        if (el.type === 'checkbox') el.checked = (val === true);
        else el.value = (val !== undefined && val !== null) ? val : "";
    }
    if (window.toggleHeroInputs) toggleHeroInputs();
    if (window.toggleHeaderInputs) toggleHeaderInputs();
    if (window.toggleHeroBoxSettings) toggleHeroBoxSettings();

    // Refresh Sliders text
    ['themeBorderRadius', 'themeMaxWidth', 'themeSectionLogoSize', 'themeBtnRadius', 'themeHeroPillRadius', 'themeLeagueCardBorderWidth', 'themeLeagueCardRadius', 'themeSysStatusDotSize'].forEach(id => {
        const el = document.getElementById(id);
        const displayId = id === 'themeLeagueCardBorderWidth' ? 'val_lcBorderW' :
            id === 'themeLeagueCardRadius' ? 'val_lcRadius' :
                id === 'themeSysStatusDotSize' ? 'val_sysDot' :
                    id.replace('theme', 'val_').replace('BorderRadius', 'borderRadius').replace('MaxWidth', 'maxWidth').replace('SectionLogoSize', 'secLogo').replace('BtnRadius', 'btnRadius').replace('HeroPillRadius', 'pillRadius');
        const display = document.getElementById(displayId);
        if (el && display) display.innerText = el.value + 'px';
    });
}
// ====================
// INITIALIZATION
// ====================

console.log('StreamCMS Admin loaded');
