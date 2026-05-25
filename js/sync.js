/**
 * TomCodeX Dashboard — Auto-Sync Data Engine
 * Centralized data fetch & render for all dashboard pages.
 * Reads from dashboard-data.json and dynamically updates the DOM.
 * Embeds fallback data so it works on file:// protocol too.
 */

(function () {
  "use strict";

  // ── Config ──────────────────────────────────────────────────────────────────
  const API_PATH = "/api/data";          // Online sync server
  const LOCAL_PATH = "data/dashboard-data.json";  // Local fallback
  const DATA_PATH = LOCAL_PATH;
  const DEFAULT_INTERVAL = 30000; // 30s
  let refreshInterval = DEFAULT_INTERVAL;
  let syncTimer = null;
  let isSyncing = false;
  let lastSyncTime = null;
  let syncCount = 0;

  // ── Embedded Fallback Data (renders immediately, works on file://) ──────────
  const FALLBACK = {
    systemStatus: [
      {"name":"Salesforce","status":"online","detail":"API 57.0 · 99.9% uptime"},
      {"name":"Node.js API","status":"online","detail":"Express v4 · Port 3000"},
      {"name":"Zentom AI","status":"online","detail":"FastAPI · Port 8000"},
      {"name":"Marketing Site","status":"online","detail":"Vercel · Edge CDN"},
      {"name":"TomCodeX Site","status":"online","detail":"Vercel · Edge CDN"},
      {"name":"V2 Microservices","status":"building","detail":"Docker · In Dev"},
      {"name":"PostgreSQL","status":"online","detail":"pgvector · Port 5432"},
      {"name":"Redis","status":"warning","detail":"Celery Broker · 87% mem"}
    ],
    keyMetrics: [
      {"label":"Apex Classes","value":279,"color":"var(--accent-purple)","change":"+12 this month","changeType":"up"},
      {"label":"Custom Objects","value":26,"color":"var(--accent-blue)","change":"Stable","changeType":"neutral"},
      {"label":"LWC Components","value":32,"color":"var(--accent-cyan)","change":"+5 this month","changeType":"up"},
      {"label":"API Endpoints","value":48,"color":"var(--accent-green)","change":"+8 this month","changeType":"up"},
      {"label":"AI Models","value":6,"color":"var(--accent-orange)","change":"+2 this month","changeType":"up"},
      {"label":"Open Issues","value":14,"color":"var(--accent-red)","change":"-3 this week","changeType":"down"}
    ],
    apiRequestVolume: {
      "peak":"12.4K req/hr","trend":"↑ 18% vs last week","trendType":"up",
      "dataPoints":[45,38,40,32,28,35,22,18,25,15,20,12,18,10,14]
    },
    codebaseBreakdown: [
      {"name":"Apex","pct":38,"gradient":"linear-gradient(90deg,#8b5cf6,#a78bfa)","labelColor":"#c4b5fd"},
      {"name":"JavaScript","pct":24,"gradient":"linear-gradient(90deg,#22c55e,#4ade80)","labelColor":"#86efac"},
      {"name":"Python","pct":18,"gradient":"linear-gradient(90deg,#f97316,#fb923c)","labelColor":"#fdba74"},
      {"name":"TypeScript","pct":10,"gradient":"linear-gradient(90deg,#3b82f6,#60a5fa)","labelColor":"#93bbfd"},
      {"name":"HTML/CSS","pct":7,"gradient":"linear-gradient(90deg,#eab308,#facc15)","labelColor":"#fde047"},
      {"name":"Other","pct":3,"gradient":"linear-gradient(90deg,#06b6d4,#22d3ee)","labelColor":"#67e8f9"}
    ],
    codebaseStats: {"files":142,"lines":"48.2K","commits":847},
    environments: [
      {"name":"Production","cls":"env-prod"},
      {"name":"Staging","cls":"env-staging"},
      {"name":"Development","cls":"env-dev"},
      {"name":"Local","cls":"env-local"}
    ],
    deployTargets: ["Vercel (2 projects)","Heroku (Node.js)","Render (AI Engine)","SFDX (Salesforce)","Docker (Local)"],
    aiModels: [
      {"name":"DeepSeek Chat","detail":"Primary · 1.3B params","status":"Active","statusColor":"var(--accent-green)","dotColor":"var(--accent-green)","animated":true,"delay":"0s"},
      {"name":"Groq Llama3","detail":"Fast inference · 70B","status":"Active","statusColor":"var(--accent-green)","dotColor":"var(--accent-green)","animated":true,"delay":"0.5s"},
      {"name":"Ollama (Local)","detail":"Offline · llama3.2","status":"Standby","statusColor":"var(--accent-yellow)","dotColor":"var(--accent-yellow)","animated":false,"delay":"0s"},
      {"name":"Embedding Model","detail":"pgvector · all-MiniLM-L6","status":"Active","statusColor":"var(--accent-green)","dotColor":"var(--accent-green)","animated":true,"delay":"1s"}
    ],
    recentDeployments: [
      {"time":"2m ago","msg":"✅ Salesforce metadata deployed","detail":"279 Apex classes, 32 LWC, 7 triggers · SFDX push","type":"success"},
      {"time":"18m ago","msg":"✅ Marketing site updated","detail":"Vercel auto-deploy from main · Build 3.2s","type":"success"},
      {"time":"1h ago","msg":"🔄 Zentom AI engine restarted","detail":"New DeepSeek config · FastAPI reload","type":"info"},
      {"time":"3h ago","msg":"⚠️ Redis memory warning","detail":"Celery broker at 87% memory · Consider scaling","type":"warning"},
      {"time":"5h ago","msg":"✅ Node.js API v2.4.1 deployed","detail":"Billing webhooks fix · Heroku release","type":"success"},
      {"time":"8h ago","msg":"❌ Docker build failed (zentom-policy-engine)","detail":"Dependency conflict · Resolved in commit a3f2d1","type":"error"}
    ],
    activityFeed: [
      {"icon":"⚙️","iconBg":"rgba(139,92,246,0.15)","iconColor":"#c4b5fd","service":"Apex","text":"New IncidentController methods added","time":"5m ago"},
      {"icon":"🖥️","iconBg":"rgba(34,197,94,0.15)","iconColor":"#86efac","service":"Node.js","text":"Stripe webhook handler updated","time":"12m ago"},
      {"icon":"🧠","iconBg":"rgba(249,115,22,0.15)","iconColor":"#fdba74","service":"Zentom AI","text":"Memory engine context window expanded","time":"25m ago"},
      {"icon":"🌐","iconBg":"rgba(96,165,250,0.15)","iconColor":"#93bbfd","service":"Website","text":"Pricing page updated for Q2","time":"1h ago"},
      {"icon":"☁️","iconBg":"rgba(236,72,153,0.15)","iconColor":"#f9a8d4","service":"Salesforce","text":"Permission sets patched for FLS","time":"2h ago"},
      {"icon":"🐳","iconBg":"rgba(6,182,212,0.15)","iconColor":"#67e8f9","service":"Docker","text":"zentom-api image rebuilt","time":"3h ago"},
      {"icon":"📦","iconBg":"rgba(234,179,8,0.15)","iconColor":"#fde047","service":"Packages","text":"shared-types v2.1.0 published","time":"4h ago"},
      {"icon":"🔒","iconBg":"rgba(248,113,113,0.15)","iconColor":"#f87171","service":"Security","text":"API rate limiting tightened","time":"6h ago"}
    ],
    incidents: [],
    integrations: [],
    logs: [],
    aiInsights: [],
    impactData: []
  };

  // ── Data Store (initialized from FALLBACK immediately) ──────────────────────
  const Store = JSON.parse(JSON.stringify(FALLBACK));

  // ── Helpers ─────────────────────────────────────────────────────────────────
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)); }
  function el(id) { return document.getElementById(id); }

  function escapeHtml(s) {
    const d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  // ── Sync Indicator ──────────────────────────────────────────────────────────
  let isFileProtocol = window.location.protocol === "file:";

  function updateSyncIndicator(status) {
    const indicator = el("sync-indicator");
    if (!indicator) return;
    const dot = indicator.querySelector(".sync-dot") || indicator;
    const label = indicator.querySelector(".sync-label");

    if (status === "syncing") {
      dot.style.background = "var(--accent-cyan)";
      if (label) label.textContent = "Syncing…";
    } else if (status === "ok") {
      dot.style.background = "var(--accent-green)";
      const src = dataSource === "api" ? "☁️ Live" : dataSource === "local" ? "📁 Local" : "💾 Cached";
      if (label) label.textContent = src + " · " + new Date().toLocaleTimeString();
    } else if (status === "error") {
      if (isFileProtocol) {
        dot.style.background = "var(--accent-cyan)";
        if (label) label.textContent = "💾 Offline · Open via server for live sync";
      } else {
        dot.style.background = "var(--accent-red)";
        if (label) label.textContent = "Sync failed";
      }
    }
  }

  // ── Data Fetch (tries API first, falls back to local JSON) ──────────────────
  let dataSource = "fallback"; // "api" | "local" | "fallback"

  async function fetchData() {
    try {
      isSyncing = true;
      updateSyncIndicator("syncing");

      const ts = Date.now();
      let data = null;

      // 1) Try sync API first (online mode)
      try {
        const apiRes = await fetch(API_PATH + "?t=" + ts);
        if (apiRes.ok) {
          data = await apiRes.json();
          dataSource = data._meta?.source === "live" ? "api" : "local";
          console.log("[sync] ✅ Data from API (" + dataSource + ")");
        }
      } catch (e) {
        console.log("[sync] API not available, trying local file...");
      }

      // 2) Fallback to local JSON file
      if (!data) {
        try {
          const localRes = await fetch(LOCAL_PATH + "?t=" + ts);
          if (localRes.ok) {
            data = await localRes.json();
            dataSource = "local";
            console.log("[sync] ✅ Data from local file");
          }
        } catch (e) {
          console.log("[sync] Local file not available, using embedded fallback");
        }
      }

      // 3) If nothing worked, keep fallback data
      if (!data) {
        dataSource = "fallback";
        updateSyncIndicator("error");
        isSyncing = false;
        return null;
      }

      // Merge into store (skip _meta and _push)
      Object.keys(Store).forEach((key) => {
        if (data[key] !== undefined) Store[key] = data[key];
      });

      if (data.refreshInterval) refreshInterval = data.refreshInterval;

      lastSyncTime = new Date();
      syncCount++;
      updateSyncIndicator("ok");
      isSyncing = false;

      return data;
    } catch (err) {
      console.error("[sync] Fetch error:", err);
      updateSyncIndicator("error");
      isSyncing = false;
      return null;
    }
  }

  // ── Renderers ───────────────────────────────────────────────────────────────

  /** System Status Grid */
  function renderSystemStatus() {
    const grid = el("sync-status-grid");
    if (!grid) return;
    grid.innerHTML = Store.systemStatus
      .map(
        (s) => `
      <div class="status-item">
        <div class="status-dot ${s.status}"></div>
        <div class="status-name">${escapeHtml(s.name)}</div>
        <div class="status-detail">${escapeHtml(s.detail)}</div>
      </div>`
      )
      .join("");
  }

  /** Key Metrics */
  function renderKeyMetrics() {
    const container = el("sync-metrics");
    if (!container) return;

    const row1 = Store.keyMetrics.slice(0, 3);
    const row2 = Store.keyMetrics.slice(3);

    container.innerHTML = `
      <div class="metric-row">
        ${row1
          .map(
            (m) => `
          <div class="metric">
            <div class="metric-label">${escapeHtml(m.label)}</div>
            <div class="metric-value" style="color:${m.color};" data-target="${m.value}">0</div>
            <div class="metric-change ${m.changeType}">${escapeHtml(m.change)}</div>
          </div>`
          )
          .join("")}
      </div>
      <div class="metric-row" style="margin-top:10px;">
        ${row2
          .map(
            (m) => `
          <div class="metric">
            <div class="metric-label">${escapeHtml(m.label)}</div>
            <div class="metric-value" style="color:${m.color};" data-target="${m.value}">0</div>
            <div class="metric-change ${m.changeType}">${escapeHtml(m.change)}</div>
          </div>`
          )
          .join("")}
      </div>`;

    // Re-trigger counter animation
    animateCounters();
  }

  /** API Request Volume Chart */
  function renderApiChart() {
    const svg = el("sync-api-chart");
    if (!svg || !Store.apiRequestVolume.dataPoints) return;

    const pts = Store.apiRequestVolume.dataPoints;
    const max = Math.max(...pts);
    const w = 400,
      h = 60,
      step = w / (pts.length - 1);

    const coords = pts.map((v, i) => {
      const x = i * step;
      const y = h - (v / max) * (h - 10) - 2;
      return [x, y];
    });

    const lineD = coords.map((c, i) => (i === 0 ? "M" : "L") + c[0] + "," + c[1]).join(" ");
    const areaD = lineD + ` L${coords[coords.length - 1][0]},${h} L0,${h} Z`;
    const lastPt = coords[coords.length - 1];

    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const dayLabels = days
      .map((d, i) => {
        const x = Math.round((i * w) / (days.length - 1));
        return `<text x="${x}" y="58" fill="#475569" font-size="7" font-family="JetBrains Mono">${d}</text>`;
      })
      .join("");

    svg.innerHTML = `
      <defs>
        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#60a5fa" stop-opacity="0.4"/>
          <stop offset="100%" stop-color="#60a5fa" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <line x1="0" y1="15" x2="400" y2="15" stroke="rgba(255,255,255,0.04)"/>
      <line x1="0" y1="30" x2="400" y2="30" stroke="rgba(255,255,255,0.04)"/>
      <line x1="0" y1="45" x2="400" y2="45" stroke="rgba(255,255,255,0.04)"/>
      <path class="chart-area" d="${areaD}" fill="url(#chartGradient)"/>
      <path class="chart-line" stroke="#60a5fa" fill="none" stroke-width="2" d="${lineD}"/>
      <circle class="chart-dot" cx="${lastPt[0]}" cy="${lastPt[1]}" r="3" fill="#60a5fa"/>
      ${dayLabels}`;

    // Update stats below chart
    const peakEl = el("sync-api-peak");
    const trendEl = el("sync-api-trend");
    if (peakEl) peakEl.textContent = "Peak: " + Store.apiRequestVolume.peak;
    if (trendEl) {
      trendEl.textContent = Store.apiRequestVolume.trend;
      trendEl.style.color =
        Store.apiRequestVolume.trendType === "up"
          ? "var(--accent-green)"
          : "var(--accent-red)";
    }
  }

  /** Codebase Breakdown */
  function renderCodebase() {
    const bars = el("sync-codebase-bars");
    const stats = el("sync-codebase-stats");
    if (!bars) return;

    bars.innerHTML = Store.codebaseBreakdown
      .map(
        (l) => `
      <div class="lang-bar">
        <div class="lang-bar-label" style="color:${l.labelColor};">${escapeHtml(l.name)}</div>
        <div class="lang-bar-track"><div class="lang-bar-fill" style="width:${l.pct}%;background:${l.gradient};"></div></div>
        <div class="lang-bar-pct">${l.pct}%</div>
      </div>`
      )
      .join("");

    if (stats && Store.codebaseStats) {
      const s = Store.codebaseStats;
      stats.innerHTML = `
        <span>📁 <strong style="color:var(--text);">${s.files}</strong> files</span>
        <span>📝 <strong style="color:var(--text);">${s.lines}</strong> lines</span>
        <span>🔄 <strong style="color:var(--text);">${s.commits}</strong> commits</span>`;
    }
  }

  /** Environments */
  function renderEnvironments() {
    const row = el("sync-env-row");
    const targets = el("sync-deploy-targets");
    if (!row) return;

    row.innerHTML = Store.environments
      .map(
        (e) => `
      <div class="env-badge ${e.cls}"><div class="env-dot"></div>${escapeHtml(e.name)}</div>`
      )
      .join("");

    if (targets) {
      targets.innerHTML = Store.deployTargets
        .map(
          (t) =>
            `<span style="font-size:0.65rem;padding:4px 10px;border-radius:4px;background:rgba(255,255,255,0.05);color:var(--text-mid);">${escapeHtml(t)}</span>`
        )
        .join("");
    }
  }

  /** AI Models */
  function renderAiModels() {
    const container = el("sync-ai-models");
    if (!container) return;

    container.innerHTML = Store.aiModels
      .map(
        (m) => `
      <div style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:8px;background:rgba(0,0,0,0.15);">
        <div style="width:8px;height:8px;border-radius:50%;background:${m.dotColor};${m.animated ? "animation:blink 2s infinite;animation-delay:" + m.delay + ";" : ""}"></div>
        <div style="flex:1;">
          <div style="font-size:0.75rem;font-weight:600;">${escapeHtml(m.name)}</div>
          <div style="font-size:0.62rem;color:var(--text-dim);">${escapeHtml(m.detail)}</div>
        </div>
        <div style="font-size:0.65rem;color:${m.statusColor};font-weight:600;">${escapeHtml(m.status)}</div>
      </div>`
      )
      .join("");
  }

  /** Recent Deployments */
  function renderDeployments() {
    const timeline = el("sync-deployments");
    if (!timeline) return;

    timeline.innerHTML = Store.recentDeployments
      .map(
        (d) => `
      <div class="timeline-item ${d.type}">
        <div class="timeline-time">${escapeHtml(d.time)}</div>
        <div class="timeline-body">
          <div class="timeline-msg">${escapeHtml(d.msg)}</div>
          <div class="timeline-detail">${escapeHtml(d.detail)}</div>
        </div>
      </div>`
      )
      .join("");
  }

  /** Activity Feed */
  function renderActivityFeed() {
    const list = el("sync-activity");
    if (!list) return;

    list.innerHTML = Store.activityFeed
      .map(
        (a) => `
      <div class="activity-item">
        <div class="activity-icon" style="background:${a.iconBg};color:${a.iconColor};">${a.icon}</div>
        <div class="activity-text"><strong>${escapeHtml(a.service)}</strong> — ${escapeHtml(a.text)}</div>
        <div class="activity-time">${escapeHtml(a.time)}</div>
      </div>`
      )
      .join("");
  }

  // ── Counter Animation ───────────────────────────────────────────────────────
  function animateCounters() {
    document.querySelectorAll(".metric-value[data-target]").forEach((el) => {
      const target = parseInt(el.dataset.target);
      const duration = 1200;
      const start = performance.now();
      function step(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(target * eased);
        if (progress < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }

  // ── Status Dot Flicker (realistic health check simulation) ──────────────────
  function startStatusFlicker() {
    setInterval(() => {
      document.querySelectorAll(".status-dot.online").forEach((dot) => {
        if (Math.random() > 0.95) {
          dot.style.background = "var(--accent-yellow)";
          setTimeout(() => {
            dot.style.background = "var(--accent-green)";
          }, 2000);
        }
      });
    }, 5000);
  }

  // ── Master Render ───────────────────────────────────────────────────────────
  function renderAll() {
    renderSystemStatus();
    renderKeyMetrics();
    renderApiChart();
    renderCodebase();
    renderEnvironments();
    renderAiModels();
    renderDeployments();
    renderActivityFeed();
  }

  // ── Sync Cycle ──────────────────────────────────────────────────────────────
  async function sync() {
    if (isSyncing) return;
    const data = await fetchData();
    if (data) renderAll();
  }

  function startAutoSync() {
    if (syncTimer) clearInterval(syncTimer);
    syncTimer = setInterval(sync, refreshInterval);
  }

  // ── Public API (exposed on window.TomCodeXSync) ─────────────────────────────
  window.TomCodeXSync = {
    Store,
    sync,
    startAutoSync,
    stopAutoSync() {
      clearInterval(syncTimer);
      syncTimer = null;
    },
    getLastSync() {
      return lastSyncTime;
    },
    getSyncCount() {
      return syncCount;
    },
    getDataSource() {
      return dataSource;
    },
    renderAll,
  };

  // ── Boot ────────────────────────────────────────────────────────────────────
  function boot() {
    // Debug: verify DOM elements exist
    console.log("[sync] Boot starting, readyState:", document.readyState);
    console.log("[sync] sync-status-grid:", !!document.getElementById('sync-status-grid'));
    console.log("[sync] sync-metrics:", !!document.getElementById('sync-metrics'));
    console.log("[sync] sync-activity:", !!document.getElementById('sync-activity'));
    console.log("[sync] Store.systemStatus length:", Store.systemStatus.length);
    console.log("[sync] Store.keyMetrics length:", Store.keyMetrics.length);

    // Render fallback data IMMEDIATELY (works on file:// protocol)
    renderAll();
    animateCounters();
    startStatusFlicker();
    console.log("[sync] Rendered with embedded data");

    // Then try to fetch live data in the background
    sync().then(() => {
      startAutoSync();
      console.log("[sync] Auto-sync started (30s interval)");
    });
  }

  // Handle both cases: DOM already loaded or still loading
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    // DOM already ready (script loaded at end of body)
    boot();
  }
})();
