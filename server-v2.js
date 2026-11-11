require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const Groq = require("groq-sdk");
const fs = require("fs");
const path = require("path");
const RAGEngine = require("./lib/rag");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// ================= INISIALISASI GROQ SDK =================
let groq = null;
const isGroqConfigured = () => {
  return Boolean(
    process.env.GROQ_API_KEY &&
    process.env.GROQ_API_KEY.trim() !== "" &&
    !process.env.GROQ_API_KEY.includes("your_groq_api_key")
  );
};

if (isGroqConfigured()) {
  groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
}

// ================= INISIALISASI RAG ENGINE =================
const ragEngine = new RAGEngine(path.join(__dirname, "data/products.csv"));

// ================= LOAD KNOWLEDGE BASE =================
const KNOWLEDGE_PATH = path.join(__dirname, "knowledge.json");
let knowledge = { keywords: {}, responses: {} };

function loadKnowledge() {
  try {
    if (fs.existsSync(KNOWLEDGE_PATH)) {
      knowledge = JSON.parse(fs.readFileSync(KNOWLEDGE_PATH, "utf-8"));
    }
  } catch (err) {
    console.error("Gagal membaca knowledge.json:", err);
  }
}
loadKnowledge();

// ================= STATE WHATSAPP BOT =================
let client = null;
let qrCodeData = null;
let isReady = false;
let isInitializing = false;
let isCleaning = false;

// ================= KUOTA & RATE LIMIT GROQ AI =================
let groqQuota = {
  model: process.env.GROQ_MODEL || "qwen/qwen3.8-27b",
  remainingRequests: null,
  limitRequests: null,
  remainingTokens: null,
  limitTokens: null,
  resetRequests: null,
  lastChecked: null,
  configured: isGroqConfigured()
};

function updateGroqQuotaFromHeaders(headers, modelName) {
  if (!headers) return;
  groqQuota.model = modelName || process.env.GROQ_MODEL || "qwen/qwen3.8-27b";
  const remReq = headers.get ? headers.get("x-ratelimit-remaining-requests") : headers["x-ratelimit-remaining-requests"];
  const limReq = headers.get ? headers.get("x-ratelimit-limit-requests") : headers["x-ratelimit-limit-requests"];
  const remTok = headers.get ? headers.get("x-ratelimit-remaining-tokens") : headers["x-ratelimit-remaining-tokens"];
  const limTok = headers.get ? headers.get("x-ratelimit-limit-tokens") : headers["x-ratelimit-limit-tokens"];
  const rstReq = headers.get ? headers.get("x-ratelimit-reset-requests") : headers["x-ratelimit-reset-requests"];

  if (remReq) groqQuota.remainingRequests = Number(remReq);
  if (limReq) groqQuota.limitRequests = Number(limReq);
  if (remTok) groqQuota.remainingTokens = Number(remTok);
  if (limTok) groqQuota.limitTokens = Number(limTok);
  if (rstReq) groqQuota.resetRequests = rstReq;
  groqQuota.lastChecked = new Date().toLocaleTimeString("id-ID");
  groqQuota.configured = true;
}

async function fetchGroqQuotaFresh() {
  if (!groq) {
    if (isGroqConfigured()) {
      groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    } else {
      return groqQuota;
    }
  }
  const modelToUse = process.env.GROQ_MODEL || "qwen/qwen3.8-27b";
  try {
    const { response } = await groq.chat.completions.create({
      model: modelToUse,
      messages: [{ role: "user", content: "ping" }],
      max_tokens: 1
    }).withResponse();
    updateGroqQuotaFromHeaders(response.headers, modelToUse);
  } catch (err) {
    console.warn("Gagal mengecek kuota Groq:", err.message);
  }
  return groqQuota;
}

// ================= CONVERSATION HISTORY (MULTI-TURN MEMORY) =================
const conversationHistory = new Map();
const MAX_HISTORY_MESSAGES = 6;
const SESSION_TTL_MS = 20 * 60 * 1000; // 20 menit

function getUserHistory(senderId) {
  if (!senderId) return [];
  const session = conversationHistory.get(senderId);
  const now = Date.now();
  if (!session) return [];
  if (now - session.lastActive > SESSION_TTL_MS) {
    conversationHistory.delete(senderId);
    return [];
  }
  return session.messages || [];
}

function appendUserHistory(senderId, userMsg, botReply) {
  if (!senderId) return;
  const now = Date.now();
  let session = conversationHistory.get(senderId);
  if (!session || (now - session.lastActive > SESSION_TTL_MS)) {
    session = { messages: [], lastActive: now };
  }
  session.messages.push({ role: "user", content: userMsg });
  session.messages.push({ role: "assistant", content: botReply });
  if (session.messages.length > MAX_HISTORY_MESSAGES) {
    session.messages = session.messages.slice(-MAX_HISTORY_MESSAGES);
  }
  session.lastActive = now;
  conversationHistory.set(senderId, session);
}

// ================= INITIALIZE WHATSAPP CLIENT =================
function initializeClient() {
  if (client) return client;

  const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  const puppeteerConfig = {
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--disable-gpu"
    ]
  };

  if (fs.existsSync(chromePath)) {
    puppeteerConfig.executablePath = chromePath;
  }

  client = new Client({
    authStrategy: new LocalAuth({
      clientId: "infarm-shopee-bot"
    }),
    puppeteer: puppeteerConfig
  });

  client.on("qr", qr => {
    qrCodeData = qr;
    isInitializing = false;
    console.log("\n================ KODE QR WHATSAPP ================");
    qrcode.generate(qr, { small: true });
    console.log("Pindai QR code di atas atau melalui web dashboard.");
    console.log("==================================================\n");
  });

  client.on("authenticated", () => {
    console.log("Autentikasi WhatsApp berhasil.");
  });

  client.on("auth_failure", msg => {
    console.error("Autentikasi WhatsApp gagal:", msg);
    isInitializing = false;
  });

  client.on("ready", () => {
    isReady = true;
    isInitializing = false;
    qrCodeData = null;
    console.log("Bot WhatsApp siap digunakan (Infarm.id Official Shop)");
  });

  client.on("disconnected", reason => {
    console.log("WhatsApp terputus:", reason);
    isReady = false;
    qrCodeData = null;
    client = null;
  });

  // Handler Pesan Masuk WhatsApp
  client.on("message", async msg => {
    try {
      if (msg.fromMe || !msg.body) return;
      const isPersonalChat =
        msg.from.endsWith("@c.us") ||
        msg.from.endsWith("@lid");
      const isNotStatus = !msg.from.endsWith("@status");
      if (!isPersonalChat || !isNotStatus) {
        console.log("Pesan grup/status diabaikan:", msg.from);
        return;
      }

      const message = msg.body.trim();
      console.log(`[Pesan Masuk dari ${msg.from}]: ${message}`);

      const reply = await getAIResponse(msg.from, message);
      await msg.reply(reply);
      console.log(`[Balasan Terkirim]:\n${reply}\n`);
    } catch (err) {
      console.error("Error memproses pesan:", err);
      try {
        await msg.reply("Mohon maaf, sistem asisten sedang mengalami kendala jaringan. Silakan hubungi kami via Shopee: https://shopee.co.id/infarm.id atau coba beberapa saat lagi.");
      } catch (replyErr) {
        console.error("Gagal mengirim pesan error fallback:", replyErr);
      }
    }
  });

  return client;
}

// ================= HELPER FORMAT TEKS & DETEKSI =================
function formatWhatsAppMessage(text) {
  if (!text) return "";
  let formatted = text.replace(/\*\*(.*?)\*\*/g, "*$1*");
  formatted = formatted.replace(/\n{3,}/g, "\n\n").trim();
  return formatted;
}

function isGreetingMessage(text) {
  if (!text) return false;
  const q = text.toLowerCase().trim();
  const greetings = [
    "halo", "hai", "hi", "hey", "hello", "hei", "p", "ping", "test",
    "pagi", "selamat pagi", "siang", "selamat siang", "sore", "selamat sore",
    "malam", "selamat malam", "assalamualaikum", "assalamu'alaikum",
    "assalamu alaikum", "permisi", "sampurasun"
  ];
  if (greetings.includes(q)) return true;
  if (/^(halo|hai|hi|hey|hello|selamat\s+(pagi|siang|sore|malam)|assalamu\s*alaikum|permisi)\b/i.test(q)) {
    const productKeywords = [
      "produk", "harga", "katalog", "jual", "beli", "pupuk", "benih", "bibit",
      "pestisida", "media", "tanah", "cocopeat", "rockwool", "sprayer"
    ];
    return !productKeywords.some(pk => q.includes(pk));
  }
  return false;
}

function isGratitudeMessage(text) {
  if (!text) return false;
  const q = text.toLowerCase().trim();
  const gratitudeList = [
    "terima kasih", "terimakasih", "makasih", "makasi", "thx", "thanks", "thank you",
    "matur nuwun", "nuhun", "syukron", "terima kasih banyak", "terimakasih banyak", "makasih banyak"
  ];
  if (gratitudeList.includes(q)) return true;
  return /^(terima\s*kasih|makasih|makasi|thanks|thank\s*you|thx|matur\s*nuwun|nuhun|syukron)\b/i.test(q);
}

// ================= LOGIKA UTAMA RESPONSE CHATBOT RAG =================
async function getAIResponse(senderId, message) {
  const normalized = message.toLowerCase().trim();

  // 1. Template Sapaan
  if (isGreetingMessage(normalized)) {
    console.log("[Template Sapaan]: Menggunakan template cepat tanpa memanggil AI");
    const greetingReply = "Halo! Selamat datang di *Infarm.id Official Shop* 🌱\n\nPusat benih unggul, pupuk organik, pestisida alami, dan perlengkapan urban farming terlengkap.\n\nAda yang bisa kami bantu seputar kebutuhan berkebun Anda hari ini?";
    if (senderId) appendUserHistory(senderId, message, greetingReply);
    return greetingReply;
  }

  // 2. Template Ucapan Terima Kasih
  if (isGratitudeMessage(normalized)) {
    console.log("[Template Terima Kasih]: Menggunakan template cepat tanpa memanggil AI");
    const gratitudeReply = "Sama-sama Kak! Senang bisa membantu Anda di *Infarm.id Official Shop* 🌱\n\nSelamat berkebun dan semoga tanamannya tumbuh subur! Jika ada pertanyaan lain atau ingin order produk, jangan ragu untuk chat kami kembali ya.";
    if (senderId) appendUserHistory(senderId, message, gratitudeReply);
    return gratitudeReply;
  }

  // 3. Cek respons langsung dari knowledge.json
  if (knowledge.responses && knowledge.responses[normalized]) {
    console.log("[Knowledge Match]: Menggunakan jawaban langsung knowledge.json");
    const manualReply = formatWhatsAppMessage(knowledge.responses[normalized]);
    if (senderId) appendUserHistory(senderId, message, manualReply);
    return manualReply;
  }

  // 4. Cek keyword alias di knowledge.keywords
  if (knowledge.keywords) {
    for (const [kw, targetKey] of Object.entries(knowledge.keywords)) {
      if (normalized.includes(kw.toLowerCase())) {
        if (knowledge.responses && knowledge.responses[targetKey]) {
          console.log(`[Knowledge Keyword Match]: Cocok dengan kata kunci '${kw}'`);
          const manualReply = formatWhatsAppMessage(knowledge.responses[targetKey]);
          if (senderId) appendUserHistory(senderId, message, manualReply);
          return manualReply;
        }
      }
    }
  }

  // 5. Riwayat percakapan sebelumnya
  const history = senderId ? getUserHistory(senderId) : [];

  // 6. RAG Context dari CSV produk lapak Shopee
  let ragContext = ragEngine.buildContext(message);
  if (!ragContext && history.length > 0) {
    const prevUserQueries = history
      .filter(h => h.role === "user")
      .slice(-2)
      .map(h => h.content)
      .join(" ");
    ragContext = ragEngine.buildContext(`${prevUserQueries} ${message}`);
  }

  // 7. Panggil Groq AI dengan Prompt Konsultan Pertanian Infarm.id
  try {
    if (!groq) {
      if (isGroqConfigured()) {
        groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
      } else {
        // Fallback jika API Key Groq belum diisi
        if (ragContext) {
          const fallbackWithRag = `Halo Kak! Berikut katalog produk resmi *Infarm.id Official Shop* yang sesuai dengan pencarian Anda:\n\n${ragContext}\n\nUntuk pemesanan dengan gratis ongkir, Anda dapat langsung checkout di toko Shopee kami: https://shopee.co.id/infarm.id atau balas pesan ini! 🌱`;
          if (senderId) appendUserHistory(senderId, message, fallbackWithRag);
          return formatWhatsAppMessage(fallbackWithRag);
        }
        return "Halo! Selamat datang di Infarm.id Official Shop. Saat ini sistem asisten AI sedang dalam mode katalog lokal. Anda dapat langsung mengunjungi toko resmi kami di Shopee: https://shopee.co.id/infarm.id";
      }
    }

    const systemPrompt = `Anda adalah Customer Service & Konsultan Berkebun resmi dari "Infarm.id Official Shop", toko spesialis urban farming, benih tanaman, pupuk organik, media tanam, dan perlengkapan hidroponik terpercaya di Shopee. Jawab dalam Bahasa Indonesia yang ramah, hangat, solutif, to the point, dan sangat rapi.

PRINSIP KEAKURATAN DATA PRODUK (BERPIJAK KETAT PADA KATALOG RESMI INFARM):
1. Keaslian & Kebenaran Data:
 - Jawab HANYA berdasarkan informasi produk resmi yang tertera pada Konteks Katalog di bawah.
 - JANGAN PERNAH mengarang, berspekulasi, atau berasumsi tentang spesifikasi, harga, varian, atau bahan yang tidak ada di katalog.
 - Selalu cantumkan nama produk persis, harga resmi dalam Rupiah, deskripsi singkat keunggulannya, dan Link Shopee jika tersedia.
2. Karakter Konsultan:
 - JANGAN PERNAH menyebut istilah internal sistem seperti: "di file CSV", "di database kami", "konteks di atas", atau "sistem AI".
 - Bertindaklah selayaknya staf konsultan pertanian profesional toko yang antusias membantu pelanggan berkebun.
3. Jawab Ringkas, Padat, & Rapi:
 - Jawab pertanyaan spesifik langsung dalam 1-2 paragraf singkat.
 - Jika pelanggan meminta "semua produk" atau "katalog", kelompokkan berdasarkan kategori (*Koleksi Benih*, *Koleksi Pupuk & Nutrisi*, *Koleksi Pestisida Nabati*, *Koleksi Media Tanam*, *Peralatan Berkebun*).
 - Jika menanyakan barang di luar katalog, jawab sopan bahwa produk tersebut belum tersedia di katalog saat ini dan sarankan menghubungi CS resmi kami:
   *WhatsApp CS:* +62 812-3456-7890
   *Toko Shopee:* https://shopee.co.id/infarm.id
   *Jam Operasional:* Senin - Sabtu (08.00 - 17.00 WIB)
4. Format Tampilan Pesan:
 - Gunakan SATU bintang untuk cetak tebal (*teks*). Jangan gunakan dua bintang (**teks**).
 - Gunakan bullet point (•) untuk mendaftar produk.
 - Sertakan emoji bertema tanaman dan pertanian (🌱, 🌿, 🌾, 🍅, 🪴, ✨) secukupnya.

${ragContext ? ragContext : "Konteks Katalog: (Tidak ada katalog spesifik yang cocok. Jawab dengan ramah seputar kebutuhan berkebun dan tawarkan bantuan produk Infarm)."}`;

    const messagesPayload = [
      { role: "system", content: systemPrompt },
      ...history,
      { role: "user", content: message }
    ];

    const candidateModels = [
      process.env.GROQ_MODEL || "qwen/qwen3.8-27b",
      "openai/gpt-oss-20b",
      "allam-2-7b",
      "openai/gpt-oss-120b"
    ];

    let lastError = null;
    for (const modelName of candidateModels) {
      try {
        const { data: completion, response } = await groq.chat.completions.create({
          model: modelName,
          messages: messagesPayload,
          max_tokens: Number(process.env.GROQ_MAX_TOKENS || 1500)
        }).withResponse();

        if (response && response.headers) {
          updateGroqQuotaFromHeaders(response.headers, modelName);
        }

        if (completion.choices && completion.choices[0] && completion.choices[0].message) {
          const rawAiReply = completion.choices[0].message.content;
          const aiReply = formatWhatsAppMessage(rawAiReply);
          if (senderId) {
            appendUserHistory(senderId, message, aiReply);
          }
          return aiReply;
        }
      } catch (err) {
        lastError = err;
        console.warn(`[Groq Model ${modelName}] Gagal: ${err.message}. Mencoba model alternatif...`);
      }
    }

    throw lastError || new Error("Semua model Groq gagal merespon.");
  } catch (error) {
    console.error("Error Groq API:", error.message || error);
    if (ragContext) {
      const fallbackReply = formatWhatsAppMessage(`Halo Kak! Berikut katalog produk resmi *Infarm.id Official Shop*:\n\n${ragContext}\n\nAda yang bisa kami bantu seputar produk berkebun di atas? Kunjungi juga Shopee kami di https://shopee.co.id/infarm.id 🌱`);
      if (senderId) appendUserHistory(senderId, message, fallbackReply);
      return fallbackReply;
    }
    return formatWhatsAppMessage("Halo! Terima kasih telah menghubungi *Infarm.id Official Shop* 🌱.\n\nKami menyediakan beragam benih unggul, pupuk organik, media tanam, dan alat hidroponik.\n\nKunjungi toko resmi kami di Shopee: https://shopee.co.id/infarm.id untuk info produk dan promo lengkap!");
  }
}

// Helper Masking Nomor Telepon
function maskPhoneNumber(rawNumber) {
  if (!rawNumber) return null;
  let formatted = String(rawNumber).replace(/^62/, "08");
  if (formatted.length >= 8) {
    const prefix = formatted.slice(0, 2);
    const suffix = formatted.slice(-4);
    const maskedLength = formatted.length - 6;
    return `${prefix}${"x".repeat(maskedLength)}${suffix}`;
  }
  return formatted;
}

// ================= API ENDPOINTS =================
// 1. Status Bot
app.get("/api/bot/status", (req, res) => {
  let botNumber = null;
  if (isReady && client && client.info && client.info.wid) {
    botNumber = maskPhoneNumber(client.info.wid.user);
  }
  res.json({
    isReady,
    isInitializing,
    isCleaning,
    hasQRCode: Boolean(qrCodeData),
    botNumber
  });
});

// 2. Kuota & Rate Limit Groq AI
app.get("/api/groq/quota", async (req, res) => {
  try {
    const isFresh = req.query.fresh === "true" || groqQuota.remainingRequests === null;
    if (isFresh && isGroqConfigured()) {
      await fetchGroqQuotaFresh();
    }
    res.json(groqQuota);
  } catch (err) {
    console.error("Error cek kuota Groq:", err);
    res.status(500).json({ error: err.message, ...groqQuota });
  }
});

// 3. QR Code Data
app.get("/api/bot/qr", (req, res) => {
  res.json({ qr: qrCodeData });
});

// 4. Start Bot
app.post("/api/bot/start", async (req, res) => {
  try {
    if (isReady) {
      return res.json({ success: true, message: "Bot sudah berjalan." });
    }
    if (isInitializing) {
      return res.json({ success: true, message: "Bot sedang proses inisialisasi..." });
    }
    isInitializing = true;
    const waClient = initializeClient();
    await waClient.initialize();
    res.json({ success: true });
  } catch (err) {
    isInitializing = false;
    console.error("Gagal memulai bot:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Stop Bot
app.post("/api/bot/stop", async (req, res) => {
  try {
    isCleaning = true;
    isReady = false;
    qrCodeData = null;
    if (client) {
      await client.destroy();
    }
    client = null;
    isCleaning = false;
    res.json({ success: true });
  } catch (err) {
    isCleaning = false;
    console.error("Gagal menghentikan bot:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Reset Sesi WhatsApp
app.post("/api/bot/reset", async (req, res) => {
  try {
    isCleaning = true;
    isReady = false;
    isInitializing = false;
    qrCodeData = null;
    if (client) {
      try {
        await client.destroy();
      } catch (e) {
        console.warn("Peringatan saat destroy client:", e.message);
      }
      client = null;
    }
    const authDir = path.join(__dirname, ".wwebjs_auth");
    const cacheDir = path.join(__dirname, ".wwebjs_cache");
    if (fs.existsSync(authDir)) {
      fs.rmSync(authDir, { recursive: true, force: true });
      console.log("[Reset Session]: Folder .wwebjs_auth berhasil dihapus");
    }
    if (fs.existsSync(cacheDir)) {
      fs.rmSync(cacheDir, { recursive: true, force: true });
      console.log("[Reset Session]: Folder .wwebjs_cache berhasil dihapus");
    }
    conversationHistory.clear();
    console.log("[Reset Session]: Seluruh riwayat obrolan berhasil dibersihkan");
    isCleaning = false;
    res.json({ success: true, message: "Sesi WhatsApp berhasil dibersihkan. Anda dapat memindai QR baru." });
  } catch (err) {
    isCleaning = false;
    console.error("Gagal mereset sesi bot:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. Ambil Basis Pengetahuan
app.get("/api/knowledge", (req, res) => {
  loadKnowledge();
  res.json(knowledge);
});

// 8. Ambil Daftar Produk CSV
app.get("/api/products", (req, res) => {
  ragEngine.loadData();
  res.json({ products: ragEngine.products });
});

// 9. Chatbot API untuk Web Front-End (Website RAG Chatbot)
app.post("/api/chat", async (req, res) => {
  try {
    const { message, senderId = "web-user" } = req.body;
    if (!message || message.trim() === "") {
      return res.status(400).json({ error: "Pesan tidak boleh kosong" });
    }
    const reply = await getAIResponse(senderId, message.trim());
    res.json({ reply });
  } catch (err) {
    console.error("Error pada /api/chat:", err);
    res.status(500).json({
      error: "Terjadi kesalahan saat memproses chat",
      reply: "Mohon maaf, sistem asisten AI sedang mengalami kendala. Silakan cek produk di katalog atau hubungi kami langsung via WhatsApp!"
    });
  }
});

// ================= JALANKAN SERVER =================
const server = app.listen(PORT, () => {
  console.log(`Server Infarm.id Bot & Web berjalan di http://localhost:${PORT}`);
  if (process.env.AUTO_START_BOT === "true") {
    console.log("AUTO_START_BOT aktif, memulai inisialisasi bot WhatsApp...");
    isInitializing = true;
    const waClient = initializeClient();
    waClient.initialize().catch(err => {
      isInitializing = false;
      console.error("Auto start gagal:", err);
    });
  }
});

// Graceful shutdown
async function gracefulShutdown(signal) {
  console.log(`\nMenerima sinyal ${signal}, membersihkan proses...`);
  if (client) {
    try {
      await client.destroy();
      console.log("Koneksi WhatsApp & browser Chrome berhasil ditutup.");
    } catch (e) {
      // ignore
    }
  }
  server.close(() => {
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 3000);
}

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
