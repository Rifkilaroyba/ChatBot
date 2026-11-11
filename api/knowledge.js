const fs = require("fs");
const path = require("path");

function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");

  try {
    const kp = path.join(process.cwd(), "knowledge.json");
    if (fs.existsSync(kp)) {
      const knowledge = JSON.parse(fs.readFileSync(kp, "utf-8"));
      return res.status(200).json(knowledge);
    }
    res.status(200).json({ keywords: {}, responses: {} });
  } catch (err) {
    res.status(500).json({ error: "Gagal memuat knowledge", details: err.message });
  }
}

module.exports = handler;
module.exports.default = handler;
