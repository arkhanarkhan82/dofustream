const API_URL = "https://vercelapi-olive.vercel.app/api/sync-nodes?country=us";

async function hydrate() {
    console.log("💧 Hydrating content...");
    try {
        const response = await fetch(API_URL);
        const data = await response.json();

        // Handle both list and dict response formats (legacy vs new API)
        const matches = Array.isArray(data) ? data : (data.matches || []);

        if (matches.length > 0) {
            updateMatches(matches);
        } else {
            console.log("No live matches found to hydrate.");
        }

    } catch (e) {
        console.error("Hydration failed:", e);
    }
}

function updateMatches(matches) {
    // Index live data by ID for O(1) lookup
    const liveMap = {};
    matches.forEach(m => liveMap[m.id] = m);

    // Find all static rows
    const rows = document.querySelectorAll('.match-row');

    rows.forEach(row => {
        const mid = row.getAttribute('data-match-id');
        const liveData = liveMap[mid];

        if (liveData) {
            updateRow(row, liveData);
        }
    });
}

function updateRow(row, data) {
    // 1. Update Status/Time
    const timeCol = row.querySelector('.col-time');
    if (data.is_live) {
        if (!row.classList.contains('live')) row.classList.add('live');
        timeCol.innerHTML = `<span class="live-txt">LIVE</span><span class="time-sub">${data.status_text || 'Now'}</span>`;
    } else {
        row.classList.remove('live');
        const ft = formatTime(data.startTimeUnix);
        timeCol.innerHTML = `<span class="time-main">${ft.time}</span><span class="time-sub">${ft.date}</span>`;
    }

    // 2. Update Live Meta (Viewers/Score)
    const metaCol = row.querySelector('.col-meta');

    // Only update meta if live, otherwise keep static league name or update if needed
    if (data.is_live) {
        const v = data.live_viewers || 0;
        let vText = v > 1000 ? `👀 ${(v / 1000).toFixed(1)}k` : "⚡ Live";
        // If we have score, maybe show it? For now, viewers.
        metaCol.innerHTML = `<span class="meta-top" style="color:var(--brand-primary)">${vText}</span>`;
    }

    // 3. Update Action Button to Direct Link
    const actionCol = row.querySelector('.col-action');
    if (data.is_live) {
        // Hydrate Watch Button with direct link
        // We use a simple query param structure compatible with existing watch page
        const link = `/watch/?streams=${data.id}`;
        actionCol.innerHTML = `<a href="${link}" class="btn-watch">Watch Live</a>`;
    }
}

function formatTime(unix) {
    if (!unix) return { time: "--:--", date: "" };
    try {
        const d = new Date(unix);
        const time = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).format(d);
        const date = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(d);
        return { time, date };
    } catch { return { time: "--:--", date: "" }; }
}

// Start Hydration
// Run immediately if DOM is ready, or on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        hydrate();
        // Poll every 60s
        setInterval(hydrate, 60000);
    });
} else {
    hydrate();
    setInterval(hydrate, 60000);
}
