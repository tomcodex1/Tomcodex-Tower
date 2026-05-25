const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const SYNC_TOKEN = process.env.SYNC_TOKEN || crypto.randomBytes(16).toString("hex");
const IS_VERCEL = !!process.env.VERCEL;
const LIVE_DATA_FILE = IS_VERCEL ? path.join("/tmp", "tomcodex-live-data.json") : path.join(process.cwd(), "data", "live-data.json");
module.exports = (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Sync-Token");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const token = req.headers["x-sync-token"] || req.query.token;
  if (token !== SYNC_TOKEN) return res.status(401).json({ error: "Invalid sync token" });
  try {
    const data = req.body;
    if (!data || typeof data !== "object") return res.status(400).json({ error: "Invalid data payload" });
    let pushCount = 0;
    if (fs.existsSync(LIVE_DATA_FILE)) { try { pushCount = JSON.parse(fs.readFileSync(LIVE_DATA_FILE, "utf-8"))._push?.pushCount || 0; } catch {} }
    data._push = { pushedAt: new Date().toISOString(), pushCount: pushCount + 1 };
    fs.writeFileSync(LIVE_DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
    res.status(200).json({ success: true, receivedAt: data._push.pushedAt, pushCount: data._push.pushCount });
  } catch (err) { res.status(500).json({ error: "Failed to save data" }); }
};
