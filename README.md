# AI Chatbot RAG Shopee (Infarm.id) & WhatsApp Gateway

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)
[![Node.js Version](https://img.shields.io/badge/Node.js-18%2B-brightgreen.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Proyek ini adalah implementasi tugas praktikum kecerdasan buatan (**Retrieval-Augmented Generation / RAG**) yang menggabungkan:
1. **Website Interaktif & Katalog Produk** lapak Shopee [**Infarm Official Shop**](https://shopee.co.id/infarmofficialshop) yang siap di-deploy secara *serverless* ke **Vercel**.
2. **Widget Floating AI Chatbot** bertenaga Groq Cloud LLM dan RAG lokal.
3. **Gateway Bot WhatsApp** berbasis `whatsapp-web.js` untuk melayani pembeli langsung via WhatsApp.
4. **Tombol Chat WhatsApp Otomatis** dengan pesan terisi sesuai produk menggunakan `encodeURIComponent`.

---

## 🌟 Fitur Utama

- **Basis Data Produk Hasil Scraping:** 35+ produk terstruktur (`data/products.csv`) dari lapak Shopee Infarm.id mencakup kategori Benih, Pupuk Organik, Pestisida Nabati, Media Tanam, dan Alat Berkebun.
- **Tautan Verifikasi Asli:** Setiap produk dilengkapi tautan langsung `contents href` ke halaman produk Shopee.
- **Arsitektur Pemrosesan Pesan Berlapis (Layered Response):**
  1. *Sapaan & Salam:* Dijawab cepat oleh sistem template tanpa memanggil LLM (hemat kuota).
  2. *Ucapan Terima Kasih:* Dijawab cepat oleh sistem template tanpa memanggil LLM.
  3. *FAQ Toko (`knowledge.json`):* Jawaban instan untuk jam operasional, alamat gudang, cara pemesanan, dan garansi.
  4. *Pertanyaan Spesifik Produk:* Dicarikan konteks relevan oleh `lib/rag.js`, lalu diproses oleh Groq AI LLM (`llama-3.3-70b-versatile` / `qwen/qwen3.8-27b`).
  5. *Fallback Cerdas:* Menampilkan produk dari RAG dan informasi kontak jika API key Groq belum disetel atau habis kuota.
- **Multi-Turn Conversation Memory:** Menyimpan riwayat percakapan per pengguna (*sliding window* 6 pesan, TTL 20 menit) agar bot memahami pertanyaan lanjutan (misal: *"berapa harganya?"*).
- **Dual Deployment Mode:**
  - **Cloud Serverless (Vercel):** Website responsif + API `/api/chat`, `/api/products`, `/api/knowledge`.
  - **Local Gateway:** Node.js Express dashboard di `http://localhost:3001` dengan QR Code login WhatsApp Web.

---

## 📁 Struktur Direktori

```
├── api/                  # Serverless function endpoint untuk deployment Vercel
│   ├── bot/status.js     # Status endpoint
│   ├── chat.js           # Serverless RAG chatbot endpoint
│   ├── knowledge.js      # FAQ API
│   └── products.js       # Katalog produk API
├── data/
│   └── products.csv      # Basis data 35+ produk Shopee Infarm.id
├── lib/
│   └── rag.js            # Mesin pencari dan generator konteks RAG
├── public/               # Frontend antarmuka pengguna
│   ├── app.js            # Logika katalog, live search, WhatsApp link & chat widget
│   ├── index.html        # Halaman utama katalog, hero banner & chatbot
│   └── style.css         # Styling modern, responsif & elegan
├── knowledge.json        # Basis pengetahuan FAQ & informasi toko
├── server-v2.js          # Backend Express & Gateway WhatsApp Web lokal
├── vercel.json           # Konfigurasi routing & bundling serverless Vercel
├── LAPORAN_TUGAS_PRAKTIKUM.md # Template draf laporan praktikum siap kumpul
├── package.json
└── nodemon.json
```

---

## 🚀 Panduan Menjalankan Secara Lokal

### 1. Pasang Dependensi
Pastikan Node.js (versi 18+) sudah terpasang, lalu jalankan:
```bash
npm install
```

### 2. Konfigurasi Environment Variables
Salin `.env.example` menjadi `.env`:
```bash
cp .env.example .env
```
Isi `GROQ_API_KEY` dengan API Key milik Anda dari [Groq Console](https://console.groq.com/keys).

### 3. Jalankan Server
```bash
npm run dev
```
Buka browser di **`http://localhost:3001`**:
- Tab **Katalog & Web**: Mencoba katalog interaktif, pencarian produk, order via WhatsApp, dan widget AI Chatbot RAG.
- Tab **WhatsApp Gateway**: Memulai bot WhatsApp dan scan QR Code melalui WhatsApp di ponsel Anda.

---

## ☁️ Panduan Deployment ke Vercel

1. Buat repository baru di GitHub dan lakukan push project ini:
   ```bash
   git remote add origin https://github.com/Rifkilaroyba/ChatBot.git
   git push -u origin main
   ```
2. Buka [https://vercel.com](https://vercel.com), login menggunakan akun GitHub Anda.
3. Klik **Add New Project** &rarr; pilih repository **ChatBot**.
4. Tambahkan Environment Variable di pengaturan Vercel:
   - `GROQ_API_KEY`: Masukkan API Key Groq Anda
   - `GROQ_MODEL`: `qwen/qwen3.8-27b`
   - `RAG_TOP_K`: `8`
5. Klik **Deploy**. Website publik Anda siap diakses (misal: `https://infarm-chatbot-rifki.vercel.app`).

---

## 📄 Laporan Praktikum
Draf laporan praktikum individu lengkap telah tersedia pada file [**`LAPORAN_TUGAS_PRAKTIKUM.md`**](LAPORAN_TUGAS_PRAKTIKUM.md).

