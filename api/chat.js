const fs = require("fs");
const path = require("path");
const Groq = require("groq-sdk");

let RAGEngine;
try {
  RAGEngine = require("../lib/rag");
} catch (e) {
  RAGEngine = require(path.join(process.cwd(), "lib/rag.js"));
}

// Load Knowledge
let knowledge = { keywords: {}, responses: {} };
try {
  const kp = path.join(process.cwd(), "knowledge.json");
  if (fs.existsSync(kp)) {
    knowledge = JSON.parse(fs.readFileSync(kp, "utf-8"));
  }
} catch (e) {
  console.error("Gagal load knowledge:", e);
}

// Inisialisasi RAG
const csvPath = path.join(process.cwd(), "data/products.csv");
const ragEngine = new RAGEngine(csvPath);

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

async function handler(req, res) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  let ragContext = "";
  try {
    const { message, history = [] } = req.body || {};
    if (!message || message.trim() === "") {
      return res.status(400).json({ error: "Pesan tidak boleh kosong" });
    }

    const normalized = message.toLowerCase().trim();

    // 1. Template Sapaan
    if (isGreetingMessage(normalized)) {
      return res.json({
        reply: "Halo! Selamat datang di *Infarm.id Official Shop* 🌱\n\nPusat benih unggul, pupuk organik, pestisida alami, dan perlengkapan urban farming terlengkap.\n\nAda yang bisa kami bantu seputar kebutuhan berkebun Anda hari ini?",
        source: "template_greeting"
      });
    }

    // 2. Template Terima Kasih
    if (isGratitudeMessage(normalized)) {
      return res.json({
        reply: "Sama-sama Kak! Senang bisa membantu Anda di *Infarm.id Official Shop* 🌱\n\nSelamat berkebun dan semoga tanamannya tumbuh subur! Jika ada pertanyaan lain atau ingin order produk, silakan hubungi kami kapan saja ya.",
        source: "template_gratitude"
      });
    }

    // 3. Knowledge base FAQ langsung
    if (knowledge.responses && knowledge.responses[normalized]) {
      return res.json({
        reply: formatWhatsAppMessage(knowledge.responses[normalized]),
        source: "knowledge_direct"
      });
    }

    // 4. Keyword alias FAQ
    if (knowledge.keywords) {
      for (const [kw, targetKey] of Object.entries(knowledge.keywords)) {
        if (normalized.includes(kw.toLowerCase())) {
          if (knowledge.responses && knowledge.responses[targetKey]) {
            return res.json({
              reply: formatWhatsAppMessage(knowledge.responses[targetKey]),
              source: "knowledge_keyword"
            });
          }
        }
      }
    }

    // 5. RAG Retrieval dari katalog CSV
    ragEngine.loadData();
    ragContext = ragEngine.buildContext(message);
    if (!ragContext && Array.isArray(history) && history.length > 0) {
      const prevQueries = history
        .filter(h => h.role === "user")
        .slice(-2)
        .map(h => h.content)
        .join(" ");
      ragContext = ragEngine.buildContext(`${prevQueries} ${message}`);
    }

    // 6. Cek API Key Groq
    const hasGroqKey = Boolean(
      process.env.GROQ_API_KEY &&
      process.env.GROQ_API_KEY.trim() !== "" &&
      !process.env.GROQ_API_KEY.includes("your_groq_api_key")
    );

    if (!hasGroqKey) {
      if (ragContext) {
        return res.json({
          reply: formatWhatsAppMessage(`Halo Kak! Berikut katalog produk resmi *Infarm.id Official Shop* yang cocok:\n\n${ragContext}\n\nUntuk pemesanan dengan gratis ongkir, Anda dapat langsung checkout di toko resmi Shopee: https://shopee.co.id/infarm.id 🌱`),
          source: "rag_fallback"
        });
      }
      return res.json({
        reply: formatWhatsAppMessage("Halo! Selamat datang di *Infarm.id Official Shop* 🌱.\n\nKami menyediakan beragam benih tanaman, pupuk organik, dan media tanam.\n\nKunjungi toko resmi kami di Shopee: https://shopee.co.id/infarm.id"),
        source: "default_fallback"
      });
    }

    // 7. Panggil Groq AI
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
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

    const candidateModels = [
      process.env.GROQ_MODEL || "qwen/qwen3.8-27b",
      "openai/gpt-oss-20b",
      "allam-2-7b",
      "openai/gpt-oss-120b"
    ];

    const messagesPayload = [
      { role: "system", content: systemPrompt },
      ...(Array.isArray(history) ? history.slice(-6) : []),
      { role: "user", content: message }
    ];

    let lastError = null;
    for (const model of candidateModels) {
      try {
        const completion = await groq.chat.completions.create({
          model,
          messages: messagesPayload,
          max_tokens: Number(process.env.GROQ_MAX_TOKENS || 1500)
        });

        if (completion.choices && completion.choices[0] && completion.choices[0].message) {
          const raw = completion.choices[0].message.content;
          return res.json({
            reply: formatWhatsAppMessage(raw),
            source: "groq_rag",
            model
          });
        }
      } catch (err) {
        lastError = err;
        console.warn(`[Groq Model ${model}] Error: ${err.message}`);
      }
    }

    throw lastError || new Error("Semua model Groq gagal");
  } catch (err) {
    console.error("Handler error:", err);
    if (ragContext) {
      return res.json({
        reply: formatWhatsAppMessage(`Halo Kak! Berikut katalog produk resmi *Infarm.id Official Shop*:\n\n${ragContext}\n\nAda yang bisa kami bantu seputar produk berkebun di atas? Kunjungi Shopee kami di https://shopee.co.id/infarm.id 🌱`),
        source: "error_fallback_with_rag"
      });
    }
    return res.status(500).json({
      error: err.message,
      reply: "Mohon maaf, sistem sedang sibuk. Silakan kunjungi https://shopee.co.id/infarm.id atau hubungi CS kami di +62 812-3456-7890."
    });
  }
}

module.exports = handler;
module.exports.default = handler;
