# LAPORAN TUGAS PRAKTIKUM INDIVIDU
**Mata Kuliah:** Artificial Intelligence and Its Application  
**Dosen Pengampu:** M. Nizar P. Ma'ady, S.Kom., M.IM., M.Kom.  
**Tim Asisten Praktikum:** Muhammad Baihaqi & Mohamad Fikri Isfahani  
**Semester:** Ganjil 2026–2027  

---

## 1. Identitas Mahasiswa & Informasi Tugas

- **Nama Mahasiswa:** [Nama Lengkap Anda]
- **NIM:** [NIM Anda]
- **Kelas:** [Kelas Anda]
- **Topik Tugas:** Rancang Bangun AI Chatbot RAG Shopee via Website Serverless (Vercel) & Gateway WhatsApp

---

## 2. Ringkasan & Tautan Verifikasi

| Komponen | Informasi / Tautan |
| :--- | :--- |
| **Nama Lapak Shopee** | **Infarm.id Official Shop** (Pusat Urban Farming & Pertanian) |
| **Link Lapak Shopee** | [https://shopee.co.id/infarm.id](https://shopee.co.id/infarm.id) |
| **Link Repository GitHub** | `[Isi dengan link repository GitHub Anda setelah di-push]` |
| **Link Website Publik (Vercel)** | `[Isi dengan link URL Vercel hasil deployment]` |
| **Nomor CS WhatsApp Bot** | `+62 812-3456-7890` (atau nomor HP tertaut Anda) |

---

## 3. Profil Lapak Shopee & Kategori Produk

Lapak Shopee yang dipilih sebagai basis data adalah **Infarm.id Official Shop**. Lapak ini merupakan salah satu toko resmi kategori pertanian dan *urban farming* terlengkap di Indonesia dengan rating 4.9.

### Kategori Produk yang Diekstrak:
1. **Benih Sayur & Buah:** Benih kangkung, bayam hijau, terong ungu, tomat cherry, cabai rawit merah unggul, selada keriting hidroponik, pakcoy, timun baby, hingga semangka non-biji.
2. **Pupuk & Nutrisi Organik:** Pupuk Organik Cair (POC) 100ml & 500ml, Nutrisi Hidroponik AB Mix Sayur Daun 250ml, Nutrisi Akar Tanaman (B1 + Auksin), Pupuk Sanjungan Buah, dan Pupuk Booster Cabai.
3. **Pestisida Nabati Alami:** Pestisida Organik Neem Oil (Minyak Nimba), Insektisida Nabati Ekstrak Tembakau, dan Fungisida Organik Anti Jamur.
4. **Media Tanam:** Cocopeat halus steril, Rockwool hidroponik Cultilene 16 semai, Sekam hitam bakar karbon, Tanah organik 7in1 siap pakai, Netpot hidroponik 5cm, Tali cocofiber, dan Polybag tanaman 25x25.
5. **Peralatan Berkebun:** Sprayer manual mist 1L, Pressure sprayer 2L, Gunting dahan & pruning baja, Sekop mini kebun 3in1, pH & Moisture soil tester, TDS digital meter PPM, dan label tanaman waterproof.

---

## 4. Metodologi Web Scraping Data Produk

Pengambilan data produk lapak Shopee dilakukan sesuai instruksi modul pendukung menggunakan **Instant Data Scraper** (Chrome Extension) dan opsi alternatif *Python BeautifulSoup/API*:

### Langkah-langkah Scraping:
1. Membuka peramban Google Chrome dan memasang ekstensi **Instant Data Scraper** dari Chrome Web Store.
2. Membuka halaman produk resmi Infarm di Shopee: `https://shopee.co.id/infarm.id`.
3. Membuka panel ekstensi dan menggunakan fitur **Try another table** hingga data nama produk, harga, dan URL produk terdeteksi dengan tepat.
4. Menemukan pagination dengan fitur **Locate 'Next' Button** (tombol navigasi `>`).
5. Menjalankan proses ekstraksi (*crawling*) hingga terkumpul puluhan baris data produk.
6. Mengunduh data ke format CSV dan menyimpannya di direktori `data/products.csv`.

### Struktur Kolom Basis Data CSV (`data/products.csv`):
- `nama`: Nama resmi produk di etalase Shopee
- `kategori`: Klasifikasi produk (Benih, Pupuk, Pestisida, Media Tanam, Peralatan Berkebun)
- `harga`: Nilai harga satuan produk dalam angka (IDR)
- `deskripsi`: Deskripsi ringkas spesifikasi, isi butir/volume, dan fungsi produk
- `contents href`: Tautan URL langsung menuju halaman produk di Shopee (sebagai bukti verifikasi keaslian katalog)

---

## 5. Arsitektur Sistem Dual-Platform

Sistem dirancang dengan arsitektur hibrida untuk mengakomodasi kebutuhan aksesibilitas publik (cloud) dan persistensi sesi WhatsApp Web:

```
                          [ Pengguna / Pembeli ]
                                │            │
                 (Akses Browser)│            │(Chat Pesan WA)
                                ▼            ▼
┌─────────────────────────────────┐        ┌───────────────────────────────────┐
│     WEBSITE PUBLIK (VERCEL)     │        │     GATEWAY WHATSAPP LOKAL        │
│  - Antarmuka Katalog Interaktif │        │  - whatsapp-web.js Client         │
│  - Serverless API (/api/chat)   │        │  - Express Dashboard Local:3001   │
│  - Tombol WA Direct Chat        │        │  - Sliding Window Memory (6 msg)  │
└────────────────┬────────────────┘        └─────────────────┬─────────────────┘
                 │                                           │
                 └─────────────────────┬─────────────────────┘
                                       ▼
                       ┌───────────────────────────────┐
                       │      LAYER PEMROSESAN RAG     │
                       ├───────────────────────────────┤
                       │ 1. Filter Sapaan & Terima Kasih│
                       │ 2. Keyword Match (FAQ JSON)   │
                       │ 3. RAG Retrieval Engine       │
                       │    (Scoring Match CSV Produk) │
                       │ 4. Groq Cloud LLM             │
                       │    (Llama-3.3 / Qwen / Mixtral│
                       └───────────────────────────────┘
```

### Komponen Teknis:
1. **Frontend Website (`public/`):**
   - Tampilan katalog responsif dengan live search dan filter kategori.
   - Tombol **Beli di Shopee** terhubung langsung ke URL `contents href`.
   - Tombol **Tanya via WhatsApp** menghasilkan tautan dinamis `https://wa.me/62xxxxxxxxxx?text=...` dengan template pesan otomatis via `encodeURIComponent()`.
   - Widget **AI Konsultan Infarm** terintegrasi secara *floating* di pojok kanan bawah.
2. **Serverless RAG Chatbot API (`api/chat.js`):**
   - Mendukung deployment di Vercel secara *serverless*.
   - Mengambil konteks data produk secara instan dari `data/products.csv` dan `knowledge.json`.
   - Fallback otomatis bila kuota/koneksi model LLM Groq terbatas.
3. **Gateway WhatsApp Web (`server-v2.js`):**
   - Mengontrol sesi WhatsApp Web menggunakan `whatsapp-web.js` dan otentikasi `LocalAuth`.
   - Dilengkapi dashboard monitoring kuota Groq, status QR Code login, dan tabel data produk di `http://localhost:3001`.

---

## 6. Skenario Pengujian Chatbot RAG

| No | Pesan Pengguna (Input) | Lapisan Penjawab | Output Jawaban Chatbot | Analisis Hasil |
|:---|:---|:---|:---|:---|
| 1 | `Halo kak, selamat pagi` | Template Sapaan Cepat | "Halo! Selamat datang di *Infarm.id Official Shop* 🌱 Pusat benih unggul, pupuk organik, pestisida alami, dan perlengkapan urban farming terlengkap..." | Terjawab instan tanpa memanggil API Groq (hemat kuota). |
| 2 | `Alamat gudangnya dimana ya?` | FAQ (`knowledge.json`) | "Kantor & Gudang Utama kami berlokasi di Jl. Raya Ketintang No. 45, Gayungan, Kota Surabaya, Jawa Timur 60231..." | Cocok dengan *keyword alias* `alamat` / `gudang`. |
| 3 | `Ada rekomendasi pupuk untuk tanaman cabai?` | RAG + Groq AI LLM | Menampilkan *INFARM - Pupuk Booster Cabai Rawit Anti Rontok 250ml* seharga Rp 39.500 beserta deskripsi fungsi pencegah rontok bunga & patek, lengkap dengan link Shopee. | Data akurat sesuai katalog CSV, tidak mengarang harga. |
| 4 | `Berapa harganya dan ada kemasan berapa saja?` *(pertanyaan lanjutan)* | RAG + Multi-turn Memory + Groq LLM | Bot mengingat produk yang dibahas sebelumnya (*Pupuk Booster Cabai*) dan menjelaskan harganya Rp 39.500 kemasan 250ml serta opsi POC Super 500ml (Rp 38.300). | Memori *sliding window* berhasil membawa konteks dialog sebelumnya. |
| 5 | `Apakah jual bibit pohon durian montong?` | RAG + Fallback Kontak Toko | Bot menyampaikan dengan sopan bahwa bibit pohon durian belum tersedia di katalog Infarm, lalu mengarahkan ke layanan CS resmi dan link katalog Shopee. | Menolak secara halus tanpa berhalusinasi barang fiktif. |
| 6 | `Terima kasih banyak infonya min` | Template Terima Kasih | "Sama-sama Kak! Senang bisa membantu Anda di *Infarm.id Official Shop* 🌱 Selamat berkebun dan semoga tanamannya tumbuh subur!..." | Ditutup dengan ramah secara instan tanpa memanggil AI. |

---

## 7. Panduan Langkah Deployment ke Vercel

1. **Inisialisasi Git & Unggah ke GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Chatbot RAG Shopee Infarm.id"
   git branch -M main
   git remote add origin https://github.com/USERNAME/REPO_NAME.git
   git push -u origin main
   ```
2. **Import ke Vercel:**
   - Buka `https://vercel.com` dan lakukan login akun GitHub.
   - Klik **Add New...** &rarr; **Project**.
   - Pilih repository GitHub yang baru saja diunggah.
3. **Konfigurasi Environment Variables di Vercel:**
   - `GROQ_API_KEY`: Masukkan API Key Groq Anda dari console.groq.com.
   - `GROQ_MODEL`: `llama-3.3-70b-versatile` (atau `qwen/qwen3.8-27b`).
   - `RAG_TOP_K`: `8`
4. **Deploy:**
   - Klik tombol **Deploy**.
   - Setelah selesai, salin URL publik yang dihasilkan (contoh: `https://infarm-rag-chatbot.vercel.app`) dan sertakan pada laporan.

---

## 8. Kesimpulan

Penerapan arsitektur **Retrieval-Augmented Generation (RAG)** pada chatbot e-commerce Shopee terbukti efektif dalam membatasi ruang halusinasi model AI, memastikan integritas harga dan spesifikasi barang sesuai katalog resmi, serta menekan biaya kuota API melalui sistem berjenjang (*layered response*). Penggabungan website serverless Vercel dan gateway WhatsApp Web memberikan fleksibilitas akses optimal bagi pembeli maupun pengelola toko.

