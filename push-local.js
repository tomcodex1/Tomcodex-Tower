
#!/usr/bin/env node
/**
 * TomCodeX Dashboard — Local Data Pusher
 * Watches dashboard-data.json for changes and pushes to the sync server.
 * 
 * Usage:
 *   node push-local.js                    → push once
 *   node push-local.js --watch            → watch & auto-push on changes
 *   node push-local.js --watch --interval 10   → check every 10s
 */

const fs = require("fs");
const path = require("path");

// ── Config ─────────────────────────────────────────────────────────────────────
const SERVER_URL = process.env.SYNC_SERVER || "http://localhost:3000";
const SYNC_TOKEN = process.env.SYNC_TOKEN || "CHANGE_ME";  // Set your token here
const DATA_FILE = path.join(__dirname, "data", "dashboard-data.json");
const WATCH_INTERVAL = parseInt(process.argv.includes("--interval")
  ? process.argv[process.argv.indexOf("--interval") + 1]
  : "15") * 1000;

const isWatch = process.argv.includes("--watch");

// ── Push Data ──────────────────────────────────────────────────────────────────
async function pushData() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      console.error("[push] Data file not found:", DATA_FILE);
      return false;
    }

    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    const data = JSON.parse(raw);

    console.log(`[push] Pushing data to ${SERVER_URL}/api/push ...`);

    const res = await fetch(`${SERVER_URL}/api/push`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Sync-Token": SYNC_TOKEN,
      },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`[push] Server responded ${res.status}: ${err}`);
      return false;
    }

    const result = await res.json();
    console.log(`[push] Success! Push #${result.pushCount} at ${result.receivedAt}`);
    return true;
  } catch (err) {
    console.error("[push] Error:", err.message);
    return false;
  }
}

// ── Watch Mode ─────────────────────────────────────────────────────────────────
let lastMtime = 0;

async function watchLoop() {
  try {
    const stat = fs.statSync(DATA_FILE);
    if (stat.mtimeMs > lastMtime) {
      lastMtime = stat.mtimeMs;
      await pushData();
    }
  } catch (err) {
    console.error("[watch] Error:", err.message);
  }
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  console.log("");
  console.log("  ╔═══════════════════════════════════════════╗");
  console.log("  ║   TomCodeX — Local Data Pusher            ║");
  console.log("  ╠═══════════════════════════════════════════╣");
  console.log(`  ║  Server: ${SERVER_URL.padEnd(30)}║`);
  console.log(`  ║  Mode:   ${isWatch ? "Watch (auto-push)".padEnd(30) : "One-time push".padEnd(30)}║`);
  if (isWatch) {
  console.log(`  ║  Check:  Every ${WATCH_INTERVAL / 1000}s`.padEnd(46) + "║");
  }
  console.log("  ╚═══════════════════════════════════════════╝");
  console.log("");

  if (isWatch) {
    // Initial push
    await pushData();

    // Get initial mtime
    try {
      lastMtime = fs.statSync(DATA_FILE).mtimeMs;
    } catch {}

    console.log(`[watch] Watching for changes (every ${WATCH_INTERVAL / 1000}s)...
`);
    setInterval(watchLoop, WATCH_INTERVAL);
  } else {
    const ok = await pushData();
    process.exit(ok ? 0 : 1);
  }
}

main();
