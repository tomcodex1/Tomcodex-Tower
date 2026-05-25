
/**
 * TomCodeX Dashboard — Sync API Server
 * Lightweight Express server that:
 *   - Serves the dashboard UI
 *   - Accepts data pushes from your local machine
 *   - Serves live data to any connected browser
 *   - Falls back to local file when no push has happened
 * 
 * Usage:
 *   npm install
 *   npm start          → runs on port 3000
 *   npm run dev        → runs with nodemon auto-reload
 */

const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// Load .env if present (local dev)
try { require("dotenv").config(); } catch {}

const app = express();
const PORT = process.env.PORT || 3000;

// ── Auth Token (set SYNC_TOKEN env var, defaults to a random one printed on startup) ──
const SYNC_TOKEN = process.env.SYNC_TOKEN || crypto.randomBytes(16).toString("hex");

// ── Paths ──────────────────────────────────────────────────────────────────────
const DASHBOARD_DIR = path.resolve(__dirname);
const DATA_FILE = path.join(DASHBOARD_DIR, "data", "dashboard-data.json");
// Use /tmp for live data on Vercel (serverless), local dir otherwise
const IS_VERCEL = !!process.env.VERCEL;
const LIVE_DATA_FILE = IS_VERCEL
  ? path.join("/tmp", "tomcodex-live-data.json")
  : path.join(DASHBOARD_DIR, "data", "live-data.json");

// ── Middleware ──────────────────────────────────────────────────────────────────
app.use(express.json({ limit: "2mb" }));
app.use(express.static(DASHBOARD_DIR));

// ── CORS (allow local scripts to push data) ────────────────────────────────────
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, X-Sync-Token");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// ── Auth Middleware for write endpoints ─────────────────────────────────────────
function requireToken(req, res, next) {
  const token = req.headers["x-sync-token"] || req.query.token;
  if (token !== SYNC_TOKEN) {
    return res.status(401).json({ error: "Invalid sync token" });
  }
  next();
}

// ── GET /api/data — Serve live data to dashboard ──────────────────────────────
app.get("/api/data", (req, res) => {
  try {
    // Prefer live data (pushed from local), fallback to static file
    const source = fs.existsSync(LIVE_DATA_FILE) ? LIVE_DATA_FILE : DATA_FILE;
    const raw = fs.readFileSync(source, "utf-8");
    const data = JSON.parse(raw);

    // Add sync metadata
    data._meta = {
      source: source === LIVE_DATA_FILE ? "live" : "static",
      serverTime: new Date().toISOString(),
      nextSync: 30000,
    };

    res.json(data);
  } catch (err) {
    console.error("[api] Error reading data:", err.message);
    res.status(500).json({ error: "Failed to read dashboard data" });
  }
});

// ── POST /api/push — Push data from local machine ─────────────────────────────
app.post("/api/push", requireToken, (req, res) => {
  try {
    const data = req.body;

    if (!data || typeof data !== "object") {
      return res.status(400).json({ error: "Invalid data payload" });
    }

    // Add push metadata
    data._push = {
      pushedAt: new Date().toISOString(),
      pushCount: (getPushCount() + 1),
    };

    // Write to live data file
    fs.writeFileSync(LIVE_DATA_FILE, JSON.stringify(data, null, 2), "utf-8");

    console.log(`[push] Data updated at ${new Date().toLocaleTimeString()} (push #${data._push.pushCount})`);

    res.json({
      success: true,
      receivedAt: data._push.pushedAt,
      pushCount: data._push.pushCount,
    });
  } catch (err) {
    console.error("[push] Error:", err.message);
    res.status(500).json({ error: "Failed to save data" });
  }
});

// ── GET /api/status — Server health check ──────────────────────────────────────
app.get("/api/status", (req, res) => {
  const hasLiveData = fs.existsSync(LIVE_DATA_FILE);
  let lastPush = null;
  let pushCount = 0;

  if (hasLiveData) {
    try {
      const live = JSON.parse(fs.readFileSync(LIVE_DATA_FILE, "utf-8"));
      lastPush = live._push?.pushedAt || null;
      pushCount = live._push?.pushCount || 0;
    } catch {}
  }

  res.json({
    status: "online",
    uptime: process.uptime(),
    hasLiveData,
    lastPush,
    pushCount,
    staticDataExists: fs.existsSync(DATA_FILE),
  });
});

// ── POST /api/reset — Clear live data, revert to static ───────────────────────
app.post("/api/reset", requireToken, (req, res) => {
  try {
    if (fs.existsSync(LIVE_DATA_FILE)) {
      fs.unlinkSync(LIVE_DATA_FILE);
      console.log("[reset] Live data cleared, reverting to static");
    }
    res.json({ success: true, message: "Live data cleared" });
  } catch (err) {
    res.status(500).json({ error: "Failed to reset" });
  }
});

// ── Helper ─────────────────────────────────────────────────────────────────────
function getPushCount() {
  if (!fs.existsSync(LIVE_DATA_FILE)) return 0;
  try {
    const live = JSON.parse(fs.readFileSync(LIVE_DATA_FILE, "utf-8"));
    return live._push?.pushCount || 0;
  } catch {
    return 0;
  }
}

// ── Start ──────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log("");
  console.log("  ╔══════════════════════════════════════════════════╗");
  console.log("  ║        TomCodeX Dashboard — Sync Server         ║");
  console.log("  ╠══════════════════════════════════════════════════╣");
  console.log(`  ║  Dashboard:  http://localhost:${PORT}            ║`);
  console.log(`  ║  API:        http://localhost:${PORT}/api/data   ║`);
  console.log(`  ║  Push:       POST /api/push                  ║`);
  console.log("  ╠══════════════════════════════════════════════════╣");
  console.log(`  ║  Sync Token: ${SYNC_TOKEN}      ║`);
  console.log("  ╚══════════════════════════════════════════════════╝");
  console.log("");
  console.log("  Use this token in your local push script:");
  console.log(`     X-Sync-Token: ${SYNC_TOKEN}`);
  console.log("");
});
