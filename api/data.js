const fs = require("fs");
const path = require("path");
const DATA_FILE = path.join(process.cwd(), "data", "dashboard-data.json");
const IS_VERCEL = !!process.env.VERCEL;
const LIVE_DATA_FILE = IS_VERCEL ? path.join("/tmp", "tomcodex-live-data.json") : path.join(process.cwd(), "data", "live-data.json");
module.exports = (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(204).end();
  try {
    const source = fs.existsSync(LIVE_DATA_FILE) ? LIVE_DATA_FILE : DATA_FILE;
    const raw = fs.readFileSync(source, "utf-8");
    const data = JSON.parse(raw);
    data._meta = { source: source === LIVE_DATA_FILE ? "live" : "static", serverTime: new Date().toISOString(), nextSync: 30000 };
    res.status(200).json(data);
  } catch (err) { res.status(500).json({ error: "Failed to read dashboard data" }); }
};
