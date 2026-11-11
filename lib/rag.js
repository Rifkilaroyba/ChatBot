const fs = require("fs");
const path = require("path");

class RAGEngine {
  constructor(csvPath, options = {}) {
    // Priority: options.csvPath -> csvPath -> default relative path
    this.csvPath = csvPath || path.join(__dirname, "../data/products.csv");
    this.topK = options.topK || Number(process.env.RAG_TOP_K || 8);
    this.products = [];
    this.loadData();
  }

  loadData() {
    try {
      let resolvedPath = this.csvPath;
      if (!fs.existsSync(resolvedPath)) {
        // Fallback check for serverless environments (e.g. Vercel)
        const altPath = path.join(process.cwd(), "data/products.csv");
        if (fs.existsSync(altPath)) {
          resolvedPath = altPath;
        } else {
          console.warn(`[RAG] File CSV tidak ditemukan di: ${this.csvPath} maupun ${altPath}`);
          this.products = [];
          return;
        }
      }

      const content = fs.readFileSync(resolvedPath, "utf-8");
      const lines = content.trim().split(/\r?\n/);
      if (lines.length < 2) {
        this.products = [];
        return;
      }

      // Parse headers
      const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
      
      this.products = lines.slice(1).filter(line => line.trim().length > 0).map(line => {
        // Simple comma split with basic handling
        const cols = line.split(",").map(c => c.trim());
        const row = {};
        headers.forEach((h, idx) => {
          row[h] = cols[idx] || "";
        });

        // Normalize Shopee URL key
        if (!row["contents href"] && row["contents_href"]) {
          row["contents href"] = row["contents_href"];
        }
        if (!row["contents href"] && row["url"]) {
          row["contents href"] = row["url"];
        }

        return row;
      });

      console.log(`[RAG] Berhasil memuat ${this.products.length} produk dari CSV`);
    } catch (err) {
      console.error("[RAG] Gagal memuat data CSV:", err);
      this.products = [];
    }
  }

  formatCurrency(numStr) {
    const num = Number(numStr);
    if (isNaN(num)) return numStr;
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(num);
  }

  // Deteksi apakah query hanya berupa sapaan/salam tanpa menanyakan produk
  isGreetingQuery(query) {
    if (!query) return false;
    const q = query.toLowerCase().trim();
    const greetings = [
      "halo", "hai", "hi", "hey", "hello", "p", "ping", "test",
      "pagi", "selamat pagi", "siang", "selamat siang", "sore", "selamat sore",
      "malam", "selamat malam", "assalamualaikum", "assalamu'alaikum",
      "assalamu alaikum", "permisi", "sampurasun"
    ];

    if (greetings.includes(q)) return true;

    // Deteksi salam dengan embel-embel (misal: "halo kak", "hai min") tanpa menyebut produk
    if (/^(halo|hai|hi|hey|hello|selamat\s+(pagi|siang|sore|malam)|assalamu\s*alaikum|permisi)\b/i.test(q)) {
      const productKeywords = [
        "produk", "harga", "katalog", "jual", "beli", "pupuk", "benih", "bibit",
        "pestisida", "media", "tanah", "cocopeat", "rockwool", "sprayer", "pot", "polybag",
        "kangkung", "cabe", "cabai", "tomat", "terong", "sayur", "buah"
      ];
      return !productKeywords.some(pk => q.includes(pk));
    }
    return false;
  }

  // Deteksi apakah query meminta seluruh katalog atau gambaran umum produk
  isAllProductsQuery(query) {
    if (!query) return false;
    const q = query.toLowerCase().trim();

    // Jika pengguna menanyakan kategori atau produk spesifik, BUKAN all products query
    const specificTerms = [
      "pupuk", "benih", "pestisida", "media", "alat", "sprayer", "cabai", "tomat",
      "kangkung", "bayam", "terong", "selada", "cocopeat", "rockwool", "sekam", "rekomendasi"
    ];
    if (specificTerms.some(term => q.includes(term))) {
      return false;
    }

    const allPatterns = [
      /^semua(\s+produk(nya)?)?$/,
      /^(apa|ada)\s+(aja|saja)(\s+produk(nya)?)?$/,
      /^produk\s+(apa|ada)\s+(aja|saja)$/,
      /^katalog(\s+produk)?$/,
      /^daftar\s+produk$/,
      /^list\s+produk$/,
      /^koleksi(\s+lengkap)?$/,
      /^semuanya$/,
      /^jelasin\s+produk(nya)?$/,
      /^daftar\s+harga$/
    ];

    return allPatterns.some(pattern => pattern.test(q)) || q === "semua produk" || q === "katalog lengkap";
  }

  // Cari produk relevan berdasarkan kata kunci atau kategori
  search(query, k = this.topK) {
    if (!query || this.products.length === 0) return [];
    const normalized = query.toLowerCase().trim();

    // 1. Jika query hanya berupa sapaan, jangan tampilkan produk
    if (this.isGreetingQuery(normalized)) {
      return [];
    }

    // 2. Jika meminta semua katalog
    if (this.isAllProductsQuery(normalized)) {
      return this.products.slice(0, k * 2); // Kembalikan katalog teratas
    }

    // 3. Deteksi kategori lapak Infarm
    const categoryMap = {
      "pupuk": "Pupuk",
      "poc": "Pupuk",
      "nutrisi": "Pupuk",
      "ab mix": "Pupuk",
      "booster": "Pupuk",
      "benih": "Benih",
      "bibit": "Benih",
      "biji": "Benih",
      "pestisida": "Pestisida",
      "hama": "Pestisida",
      "ulat": "Pestisida",
      "neem oil": "Pestisida",
      "jamur": "Pestisida",
      "media": "Media Tanam",
      "cocopeat": "Media Tanam",
      "rockwool": "Media Tanam",
      "sekam": "Media Tanam",
      "polybag": "Media Tanam",
      "netpot": "Media Tanam",
      "tanah": "Media Tanam",
      "alat": "Peralatan Berkebun",
      "sprayer": "Peralatan Berkebun",
      "semprotan": "Peralatan Berkebun",
      "gunting": "Peralatan Berkebun",
      "sekop": "Peralatan Berkebun",
      "ph meter": "Peralatan Berkebun",
      "tds": "Peralatan Berkebun"
    };

    let matchedCategory = null;
    for (const [kw, cat] of Object.entries(categoryMap)) {
      if (normalized.includes(kw)) {
        matchedCategory = cat.toLowerCase();
        break;
      }
    }

    // Ekstrak token pencarian
    const queryTokens = normalized
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter(t => t.length > 2);

    let candidateProducts = this.products;
    if (matchedCategory) {
      candidateProducts = this.products.filter(p => p.kategori && p.kategori.toLowerCase() === matchedCategory);
      if (candidateProducts.length === 0) {
        candidateProducts = this.products;
      }
    }

    if (queryTokens.length === 0) {
      return candidateProducts.slice(0, k);
    }

    // Hitung skor kecocokan
    const scored = candidateProducts.map(p => {
      let score = 0;
      const searchableText = `${p.nama} ${p.kategori} ${p.deskripsi} ${p.harga}`.toLowerCase();

      for (const token of queryTokens) {
        if (p.nama && p.nama.toLowerCase().includes(token)) score += 8;
        if (p.kategori && p.kategori.toLowerCase().includes(token)) score += 5;
        if (p.deskripsi && p.deskripsi.toLowerCase().includes(token)) score += 3;
        if (searchableText.includes(token)) score += 1;
      }

      return { product: p, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score);

    if (scored.length > 0) {
      return scored.slice(0, k).map(item => item.product);
    }

    if (matchedCategory && candidateProducts.length > 0) {
      return candidateProducts.slice(0, k);
    }

    return [];
  }

  // Buat context teks untuk prompt Groq LLM dengan format terstruktur
  buildContext(query) {
    const relevantProducts = this.search(query);
    if (!relevantProducts || relevantProducts.length === 0) return "";

    // Kelompokkan produk berdasarkan kategori agar konteks rapi
    const grouped = {};
    for (const p of relevantProducts) {
      const cat = p.kategori || "Lainnya";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(p);
    }

    let output = "Daftar Katalog Produk Toko Resmi Infarm.id (Shopee):\n";
    for (const [category, items] of Object.entries(grouped)) {
      output += `\n[Kategori: ${category}]\n`;
      items.forEach(p => {
        const hargaFmt = this.formatCurrency(p.harga);
        const link = p["contents href"] ? `\n  Link Shopee: ${p["contents href"]}` : "";
        output += `• ${p.nama} - Harga: ${hargaFmt}\n  Deskripsi: ${p.deskripsi}${link}\n`;
      });
    }

    return output.trim();
  }
}

module.exports = RAGEngine;

