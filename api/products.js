const path = require("path");
const RAGEngine = require("../lib/rag");

export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");

  try {
    const csvPath = path.join(process.cwd(), "data/products.csv");
    const ragEngine = new RAGEngine(csvPath);
    ragEngine.loadData();
    res.status(200).json({ products: ragEngine.products });
  } catch (err) {
    res.status(500).json({ error: "Gagal memuat produk", details: err.message });
  }
}

