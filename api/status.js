const fs = require("fs");
const path = require("path");
const DATA_FILE = path.join(process.cwd(), "data", "dashboard-data.json");
const IS_VERCEL = !!process.env.VERCEL;
const LIVE_DATA_FILE = IS_VERCEL ? path.join("/tmp", "tomcodex-live-data.json") : path.join(process.cwd(), "data", "live-data.json");
module.exports = (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(204).end();
  const hasLiveData = fs.existsSync(LIVE_DATA_FILE);
  let lastPush = null, pushCount = 0;
  if (hasLiveData) { try { const live = JSON.parse(fs.readFileSync(LIVE_DATA_FILE, "utf-8")); lastPush = live._push?.pushedAt || null; pushCount = live._push?.pushCount || 0; } catch {} }
  res.status(200).json({ status: "online", hasLiveData, lastPush, pushCount, staticDataExists: fs.existsSync(DATA_FILE) });
};
