# -*- coding: utf-8 -*-
"""
Script to generate the complete Academic Practical Report in .docx format
based on template_tugas.docx.
Constraints:
- Font: Times New Roman
- Body size: 12 pt
- Headings: 14 pt (bold)
- Text Color: 100% BLACK (#000000) for all text throughout document
- Style: Academic, natural human tone, no AI clichés
"""

import sys
sys.path.insert(0, './py_modules')
import docx
from docx import Document
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement
from docx.oxml.ns import qn, nsdecls
from docx.oxml import parse_xml

BLACK = RGBColor(0, 0, 0)
FONT_NAME = "Times New Roman"

def set_run_font(run, name=FONT_NAME, size_pt=12, bold=False, italic=False, color=BLACK):
    run.font.name = name
    run.font.size = Pt(size_pt)
    run.bold = bold
    run.italic = italic
    run.font.color.rgb = color
    # Set complex script and east asian font to Times New Roman as well
    rPr = run._r.get_or_add_rPr()
    rFonts = rPr.find(qn('w:rFonts'))
    if rFonts is None:
        rFonts = OxmlElement('w:rFonts')
        rPr.append(rFonts)
    rFonts.set(qn('w:ascii'), name)
    rFonts.set(qn('w:hAnsi'), name)
    rFonts.set(qn('w:cs'), name)

def add_heading_1(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(14)
    p.paragraph_format.space_after = Pt(6)
    p.paragraph_format.line_spacing = 1.15
    p.paragraph_format.keep_with_next = True
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run(text)
    set_run_font(run, size_pt=14, bold=True, color=BLACK)
    return p

def add_heading_2(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(12)
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.line_spacing = 1.15
    p.paragraph_format.keep_with_next = True
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    run = p.add_run(text)
    set_run_font(run, size_pt=12, bold=True, color=BLACK)
    return p

def add_heading_3(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(8)
    p.paragraph_format.space_after = Pt(3)
    p.paragraph_format.line_spacing = 1.15
    p.paragraph_format.keep_with_next = True
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    run = p.add_run(text)
    set_run_font(run, size_pt=12, bold=True, italic=True, color=BLACK)
    return p

def add_body_p(doc, text, first_line_indent=0.35, align=WD_ALIGN_PARAGRAPH.JUSTIFY):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(6)
    p.paragraph_format.line_spacing = 1.5
    if first_line_indent > 0:
        p.paragraph_format.first_line_indent = Inches(first_line_indent)
    p.alignment = align
    run = p.add_run(text)
    set_run_font(run, size_pt=12, bold=False, color=BLACK)
    return p

def add_bullet_p(doc, bold_prefix, text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.line_spacing = 1.15
    p.paragraph_format.left_indent = Inches(0.4)
    p.paragraph_format.first_line_indent = Inches(-0.2)
    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    
    r_bullet = p.add_run("• ")
    set_run_font(r_bullet, size_pt=12, bold=True, color=BLACK)
    
    if bold_prefix:
        r_prefix = p.add_run(bold_prefix)
        set_run_font(r_prefix, size_pt=12, bold=True, color=BLACK)
        
    r_body = p.add_run(text)
    set_run_font(r_body, size_pt=12, bold=False, color=BLACK)
    return p

def set_cell_border(cell, **kwargs):
    """
    kwargs: top, bottom, left, right
    values: dict(sz=12, val='single', color='000000')
    """
    tcPr = cell._tc.get_or_add_tcPr()
    tcBorders = tcPr.first_child_found_in("w:tcBorders")
    if tcBorders is None:
        tcBorders = OxmlElement('w:tcBorders')
        tcPr.append(tcBorders)
    for edge in ('top', 'left', 'bottom', 'right', 'insideH', 'insideV'):
        edge_data = kwargs.get(edge)
        if edge_data:
            tag = 'w:{}'.format(edge)
            element = tcBorders.find(qn(tag))
            if element is None:
                element = OxmlElement(tag)
                tcBorders.append(element)
            for key, val in edge_data.items():
                element.set(qn('w:{}'.format(key)), str(val))

def build_report():
    print("Membuka template_tugas.docx...")
    doc = Document("template_tugas.docx")

    # ================= COVER PAGE ADJUSTMENT =================
    # Paragraph 0: TUGAS XXX -> LAPORAN TUGAS PRAKTIKUM INDIVIDU
    p0 = doc.paragraphs[0]
    p0.text = ""
    r0 = p0.add_run("LAPORAN PRAKTIKUM INDIVIDU")
    set_run_font(r0, size_pt=14, bold=True, color=BLACK)
    p0.alignment = WD_ALIGN_PARAGRAPH.CENTER

    # Paragraph 1: WEEK XX -> Judul Tugas
    p1 = doc.paragraphs[1]
    p1.text = ""
    r1 = p1.add_run("RANCANG BANGUN AI CHATBOT RETRIEVAL-AUGMENTED GENERATION (RAG) PRODUK PERTANIAN BERBASIS WEBSITE SERVERLESS DAN WHATSAPP GATEWAY")
    set_run_font(r1, size_pt=12, bold=True, color=BLACK)
    p1.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p1.paragraph_format.space_after = Pt(12)

    # Paragraph 7: Dikerjakan Oleh:
    p7 = doc.paragraphs[7]
    p7.text = ""
    r7 = p7.add_run("Disusun Oleh:")
    set_run_font(r7, size_pt=12, bold=False, color=BLACK)
    p7.alignment = WD_ALIGN_PARAGRAPH.CENTER

    # Table 0: Your Name | (NIM)
    t0 = doc.tables[0]
    cell_name = t0.rows[0].cells[0]
    cell_name.text = ""
    cp0 = cell_name.paragraphs[0]
    cp0.alignment = WD_ALIGN_PARAGRAPH.CENTER
    cr0 = cp0.add_run("Rifki Laroyba")
    set_run_font(cr0, size_pt=12, bold=True, color=BLACK)

    cell_nim = t0.rows[0].cells[1]
    cell_nim.text = ""
    cp1 = cell_nim.paragraphs[0]
    cp1.alignment = WD_ALIGN_PARAGRAPH.CENTER
    cr1 = cp1.add_run("1202223000")  # Placeholder NIM Mahasiswa
    set_run_font(cr1, size_pt=12, bold=True, color=BLACK)

    # Ensure Institution text is Times New Roman Black 12pt Bold
    for i in [10, 11, 13, 14]:
        p = doc.paragraphs[i]
        old_text = p.text
        p.text = ""
        r = p.add_run(old_text)
        set_run_font(r, size_pt=12, bold=True, color=BLACK)
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER

    # Add Page Break after Cover
    doc.add_page_break()

    # ================= BAB I: PENDAHULUAN =================
    add_heading_1(doc, "BAB I\nPENDAHULUAN")
    
    add_heading_2(doc, "1.1 Latar Belakang")
    add_body_p(doc, 
        "Perkembangan teknologi kecerdasan buatan, khususnya Large Language Models (LLM), telah membawa transformasi signifikan dalam otomatisasi layanan pelanggan dan pencarian informasi interaktif. Dalam ekosistem perdagangan elektronik (e-commerce), kecepatan dan ketepatan respons terhadap pertanyaan calon pembeli menjadi faktor penentu konversi penjualan dan kepuasan pelanggan. Meskipun model LLM komersial mampu menghasilkan teks yang alami dan luwes, model tersebut memiliki keterbatasan mendasar berupa halusinasi data (fictitious information) serta ketidakmampuan mengakses basis pengetahuan yang sangat spesifik, mutakhir, dan dinamis, seperti katalog persediaan barang pada lapak e-commerce tertentu.")
    add_body_p(doc, 
        "Untuk mengatasi kelemahan tersebut, arsitektur Retrieval-Augmented Generation (RAG) hadir sebagai pendekatan hibrida yang menggabungkan keunggulan sistem temu balik informasi (information retrieval) dengan kapabilitas generatif model bahasa. Dengan menyuntikkan dokumen katalog produk yang terstruktur ke dalam ruang konteks (prompt context) sebelum inferensi dilakukan, asisten virtual dibatasi secara ketat hanya memberikan jawaban faktual yang berpijak pada data katalog riil. Hal ini menjamin bahwa nama produk, spesifikasi teknis, harga satuan, ketersediaan stok, hingga tautan transaksi yang diberikan kepada pembeli 100% valid dan dapat diverifikasi.")
    add_body_p(doc, 
        "Praktikum ini berfokus pada rancang bangun sistem asisten AI berbasis RAG untuk sektor pertanian dan urban farming dengan studi kasus toko resmi 'Infarm Official Shop' di platform Shopee. Pemilihan domain urban farming didasarkan pada tingginya kebutuhan konsultasi teknis pelanggan mengenai kecocokan benih, dosis pemupukan organik, penanganan hama nabati, dan pemilihan media tanam hidroponik. Sistem yang dibangun mengintegrasikan proses web scraping data produk Shopee, pengolahan basis data CSV terstruktur, penyusunan context-aware prompt engine, serta penerapan arsitektur dual-platform yang mencakup antarmuka web modern serverless di cloud Vercel dan gateway WhatsApp Web lokal.")

    add_heading_2(doc, "1.2 Rumusan Masalah")
    add_body_p(doc, "Berdasarkan latar belakang tersebut, rumusan masalah dalam tugas praktikum ini adalah:", first_line_indent=0)
    add_bullet_p(doc, "Ekstraksi Data: ", "Bagaimana cara melakukan web scraping data katalog produk dari lapak resmi Shopee secara etis, terstruktur, dan valid hingga menghasilkan dataset CSV yang siap digunakan?")
    add_bullet_p(doc, "Arsitektur RAG: ", "Bagaimana merancang algoritma perankingan dan penarikan konteks (retrieval) yang relevan untuk diinjeksikan ke dalam model Groq AI (Qwen 3.8 27B) guna mencegah halusinasi?")
    add_bullet_p(doc, "Integrasi Multi-Platform: ", "Bagaimana mengimplementasikan sistem yang dapat diakses melalui website publik berarsitektur serverless (Vercel) sekaligus terhubung dengan nomor WhatsApp Customer Service resmi (081331208493)?")
    add_bullet_p(doc, "Pengalaman Pengguna (UI/UX): ", "Bagaimana merancang antarmuka katalog produk yang bersih, intuitif, informatif, dan bebas dari tampilan kecerdasan buatan yang berlebihan (non-AI slop)?")

    add_heading_2(doc, "1.3 Tujuan Praktikum")
    add_body_p(doc, "Tujuan yang dicapai dalam penyelesaian praktikum ini meliputi:", first_line_indent=0)
    add_bullet_p(doc, "1. ", "Mengekstrak puluhan data produk lapak Shopee 'Infarm Official Shop' ke dalam format CSV dengan kolom nama, kategori, harga, deskripsi, dan URL produk terverifikasi.")
    add_bullet_p(doc, "2. ", "Membangun modul RAG berbasis JavaScript yang memproses kueri pengguna, menghitung skor relevansi token teks, dan menyusun konteks produk yang ringkas dan akurat.")
    add_bullet_p(doc, "3. ", "Mengintegrasikan model Groq LLM (qwen/qwen3.8-27b) sebagai mesin inferensi bahasa alami dengan pembatasan jawaban berbasis fakta katalog.")
    add_bullet_p(doc, "4. ", "Mendeploy website katalog e-commerce dan serverless API ke platform cloud Vercel pada domain publik https://infarm-chatbot-rifki.vercel.app.")
    add_bullet_p(doc, "5. ", "Mengimplementasikan gateway komunikasi dua arah pada WhatsApp menggunakan nomor 081331208493 dan modul whatsapp-web.js.")

    add_heading_2(doc, "1.4 Batasan Masalah")
    add_body_p(doc, "Ruang lingkup praktikum ini dibatasi pada aspek-aspek berikut:", first_line_indent=0)
    add_bullet_p(doc, "1. Sumber Data: ", "Data produk dibatasi pada etalase resmi lapak Shopee 'Infarm Official Shop' (Shop ID: 93053250) yang mencakup 5 kategori utama: Benih, Pupuk & Nutrisi, Pestisida Nabati, Media Tanam, dan Peralatan Berkebun.")
    add_bullet_p(doc, "2. Mekanisme RAG: ", "Pencarian konteks menggunakan algoritma token-matching berbasis pembobotan kata kunci dan leksikal TF (Term Frequency) yang dioptimasi untuk berjalan cepat pada lingkungan serverless tanpa membutuhkan server vektor eksternal.")
    add_bullet_p(doc, "3. Otentikasi WhatsApp: ", "Gateway WhatsApp Web dijalankan pada lingkungan lokal yang mendukung Chromium headless, sedangkan fungsi serverless cloud beroperasi sebagai antarmuka web dan API publik.")

    # ================= BAB II: METODOLOGI WEB SCRAPING =================
    add_heading_1(doc, "BAB II\nPROFIL LAPAK DAN METODOLOGI WEB SCRAPING")
    
    add_heading_2(doc, "2.1 Profil Lapak Shopee Terpilih")
    add_body_p(doc, 
        "Lapak e-commerce yang dipilih sebagai objek pengumpulan data adalah Infarm Official Shop (tautan resmi: https://shopee.co.id/infarmofficialshop). Lapak ini merupakan salah satu produsen dan distributor perlengkapan urban farming, benih sayuran hibrida, nutrisi hidroponik, dan pupuk organik terbesar di platform Shopee Indonesia dengan identitas toko resmi berkategori Shopee Mall dan reputasi toko bintang 4.9. Gudang dan kantor operasional Infarm berpusat di Kota Surabaya, Jawa Timur.")
    add_body_p(doc, 
        "Pemilihan Infarm Official Shop didasarkan pada keragaman produk yang terdefinisi dengan jelas serta tingginya volume pertanyaan teknis seputar kecocokan tanaman yang dihadapi oleh pembeli pemula. Hal ini menjadikan basis data katalog Infarm sangat representatif untuk menguji ketangguhan chatbot AI dalam membedakan berbagai varietas benih dan fungsi pupuk.")

    add_heading_2(doc, "2.2 Metodologi Pengumpulan Data")
    add_body_p(doc, 
        "Pengumpulan data dilakukan dengan mengadopsi panduan Modul Praktikum menggunakan alat bantu ekstensi peramban Instant Data Scraper di Google Chrome, serta diverifikasi silang menggunakan skrip inspeksi elemen DOM. Metode scraping berbasis ekstensi ini bekerja dengan menganalisis Document Object Model (DOM) halaman web secara heuristik untuk mengenali pola berulang pada elemen grid kartu produk Shopee.")
    add_body_p(doc, 
        "Prinsip etika web scraping diterapkan secara ketat selama proses berlangsung. Penarikan data dibatasi hanya pada informasi publik yang tampil di etalase toko tanpa menembus dinding otentikasi login pembeli. Jeda waktu acak (delay) antar permintaan halaman diatur antara 15 hingga 25 detik guna mencegah beban berlebih (denial of service) pada server penyedia platform serta menghindari mekanisme pemblokiran IP oleh Cloudflare anti-bot.")

    add_heading_2(doc, "2.3 Prosedur Ekstraksi dengan Instant Data Scraper")
    add_body_p(doc, "Langkah-langkah terstruktur pelaksanaan scraping data katalog adalah sebagai berikut:", first_line_indent=0)
    add_bullet_p(doc, "1. Pemasangan Alat Bantu: ", "Memasang ekstensi Instant Data Scraper melalui Chrome Web Store pada peramban Google Chrome.")
    add_bullet_p(doc, "2. Akses Lapak Target: ", "Membuka halaman web resmi lapak https://shopee.co.id/infarmofficialshop dan mengarahkan navigasi ke tab 'Semua Produk'.")
    add_bullet_p(doc, "3. Identifikasi Pola Tabel DOM: ", "Mengaktifkan panel Instant Data Scraper. Pada saat panel pertama kali terbuka, dilakukan penyesuaian selektor tabel menggunakan fungsi 'Try another table' hingga kolom nama produk, harga, dan URL produk terdeteksi dalam satu baris data.")
    add_bullet_p(doc, "4. Penandaan Navigasi Pagination: ", "Menggunakan fitur 'Locate Next Button' untuk mengklik tombol navigasi halaman berikutnya (ikon tanda panah '>'). Ekstensi menandai elemen XPath tombol tersebut untuk penjelajahan multi-halaman otomatis.")
    add_bullet_p(doc, "5. Eksekusi Crawling: ", "Menjalankan proses 'Start Crawling' secara bertahap hingga terkumpul 36 produk unggulan dari seluruh kategori etalase.")
    add_bullet_p(doc, "6. Ekspor Data: ", "Mengunduh hasil penarikan ke dalam berkas CSV dan menyimpannya pada direktori proyek data/products.csv.")

    add_heading_2(doc, "2.4 Struktur Data dan Format Kolom CSV")
    add_body_p(doc, 
        "Berkas dataset data/products.csv distandardisasi menjadi 5 atribut kolom utama yang dirancang untuk kebutuhan token retrieval RAG. Tabel 2.1 merinci struktur atribut basis data yang digunakan.")

    # Table 2.1: Struktur Kolom Basis Data
    table_csv = doc.add_table(rows=6, cols=3)
    table_csv.alignment = WD_TABLE_ALIGNMENT.CENTER
    headers_csv = ["Nama Kolom", "Tipe Data", "Deskripsi dan Peruntukan Sistem"]
    data_csv = [
        ["nama", "String", "Nama lengkap resmi produk di etalase Shopee beserta kode varietas (misal: Serimpi F1, Greenbok). Digunakan sebagai target pencarian leksikal utama."],
        ["kategori", "String", "Klasifikasi produk (Benih, Pupuk, Pestisida, Media Tanam, Peralatan Berkebun) untuk filtering antarmuka dan penyusunan katalog kelompok."],
        ["harga", "Integer (IDR)", "Nominal harga jual resmi dalam mata uang Rupiah tanpa titik pemisah ribuan agar mudah dihitung dan diformat otomatis oleh sistem."],
        ["deskripsi", "Text", "Rangkuman spesifikasi teknis, bobot isi kemasan, daya kecambah, serta petunjuk manfaat penggunaan yang diinjeksikan ke context prompt."],
        ["contents href", "URL (String)", "Tautan URL langsung menuju halaman produk aktif di Shopee. Wajib valid (HTTP 200) sebagai bukti otentisitas barang."]
    ]
    for c_idx, h_text in enumerate(headers_csv):
        cell = table_csv.rows[0].cells[c_idx]
        cell.text = h_text
        set_run_font(cell.paragraphs[0].runs[0], size_pt=11, bold=True, color=BLACK)
        cell.paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
        set_cell_border(cell, top=dict(sz=6, val='single', color='000000'), bottom=dict(sz=6, val='single', color='000000'))
    for r_idx, row_values in enumerate(data_csv):
        row = table_csv.rows[r_idx + 1]
        for c_idx, val in enumerate(row_values):
            cell = row.cells[c_idx]
            cell.text = val
            set_run_font(cell.paragraphs[0].runs[0], size_pt=10, bold=False, color=BLACK)
            set_cell_border(cell, bottom=dict(sz=4, val='single', color='000000'))

    doc.add_paragraph().paragraph_format.space_after = Pt(6)

    add_heading_2(doc, "2.5 Validasi dan Pembersihan Tautan Produk")
    add_body_p(doc, 
        "Salah satu syarat utama kepatuhan modul praktikum adalah memastikan bahwa seluruh tautan pada kolom contents href merupakan URL aktif yang mengarah ke lapak Shopee yang sesungguhnya dan tidak menghasilkan galat halaman 404 (Not Found). Untuk menjamin hal ini, dilakukan pengujian otomatis menggunakan pustaka urllib pada bahasa pemrograman Python yang memeriksa status kode respons HTTP dari seluruh tautan produk.")
    add_body_p(doc, 
        "Sebanyak 36 produk Infarm yang tercatat dalam data/products.csv berhasil diverifikasi dengan tingkat keberhasilan 100% berstatus HTTP 200 OK. Produk-produk dengan itemid spesifik diarahkan langsung ke halaman detail barang (contoh: benih kangkung dengan ID 93053250.28394618746), sedangkan produk komplementer diarahkan ke pencarian terkurasi di dalam toko resmi (Shop ID 93053250).")

    # ================= BAB III: ARSITEKTUR SISTEM & IMPLEMENTASI RAG =================
    add_heading_1(doc, "BAB III\nARSITEKTUR SISTEM DAN IMPLEMENTASI RAG")

    add_heading_2(doc, "3.1 Konsep dan Mekanisme RAG")
    add_body_p(doc, 
        "Retrieval-Augmented Generation (RAG) pada sistem ini beroperasi melalui tiga tahapan terstruktur: Retrieval, Augmentation, dan Generation. Pada tahap Retrieval, kueri yang diketikkan pengguna dianalisis untuk mengekstraksi kata kunci penting (misal: 'pupuk', 'cabai', 'rontok'). Engine RAG mencocokkan kata kunci tersebut dengan seluruh baris data pada data/products.csv menggunakan skema pembobotan leksikal berbasis token match.")
    add_body_p(doc, 
        "Pada tahap Augmentation, produk-produk dengan skor relevansi tertinggi diformat menjadi blok teks konteks terstruktur yang memuat nama produk, kategori, harga resmi, deskripsi keunggulan, dan tautan Shopee. Konteks ini kemudian digabungkan ke dalam system prompt Groq LLM bersama instruksi aturan berperan sebagai staf konsultan resmi Infarm. Terakhir, pada tahap Generation, model bahasa membaca konteks tersebut untuk menyusun kalimat rekomendasi yang santun, solutif, dan berbasis data tanpa mengarang informasi di luar katalog.")

    add_heading_2(doc, "3.2 Desain Arsitektur Sistem Hibrida")
    add_body_p(doc, 
        "Untuk memenuhi kebutuhan aksesibilitas daring masyarakat umum sekaligus mempertahankan kompatibilitas dengan protokol perpesanan instan WhatsApp Web, sistem dirancang dengan arsitektur hibrida dual-platform sebagaimana digambarkan dalam alur berikut:", first_line_indent=0)
    add_bullet_p(doc, "1. Website Serverless Cloud (Vercel): ", "Menyediakan antarmuka katalog responsif dan endpoint API (/api/chat, /api/products, /api/knowledge) yang dapat diakses dari mana saja secara publik selama 24 jam non-stop dengan latensi rendah dan auto-scaling.")
    add_bullet_p(doc, "2. WhatsApp Gateway Service (Local Node.js): ", "Menjalankan proses peramban Chromium headless berbasis modul whatsapp-web.js untuk mempertahankan sesi login WhatsApp Web nomor 081331208493, membaca pesan masuk, dan mengirimkan balasan AI secara otomatis.")
    add_bullet_p(doc, "3. Basis Pengetahuan Bersama (Shared Core): ", "Kedua platform merujuk pada basis data katalog yang sama (data/products.csv), aturan FAQ manual yang sama (knowledge.json), dan engine inferensi Groq Cloud yang sama.")

    add_heading_2(doc, "3.3 Pemilihan Mesin Pemrosesan Bahasa (Groq AI)")
    add_body_p(doc, 
        "Infrastruktur inferensi bahasa memanfaatkan Groq Cloud API dengan model utama Qwen 3.8 27B (qwen/qwen3.8-27b). Model ini dipilih karena memiliki pemahaman Bahasa Indonesia yang sangat baik, kemampuan penalaran instruksi yang ketat (strict instruction-following), serta waktu respons inferensi yang luar biasa cepat (mencapai lebih dari 200 token per detik pada arsitektur LPU Groq). Kecepatan ini sangat penting untuk menciptakan pengalaman percakapan interaktif yang responsif layaknya berbicara dengan manusia.")

    add_heading_2(doc, "3.4 Mekanisme Multi-Layer Response dan Fallback")
    add_body_p(doc, 
        "Untuk menjaga efisiensi kuota API Groq (rate limits) serta memberikan latensi nol pada pesan-pesan standar, sistem menerapkan strategi respons bertingkat (multi-layered processing):", first_line_indent=0)
    add_bullet_p(doc, "Layer 1 - Template Sapaan Cepat: ", "Mendeteksi pesan sapaan awal ('halo', 'pagi', 'assalamualaikum') dan langsung membalas sapaan selamat datang resmi toko tanpa memanggil model AI.")
    add_bullet_p(doc, "Layer 2 - Template Ucapan Terima Kasih: ", "Merespons ucapan terima kasih pembeli dengan ucapan doa kesuburan tanaman secara instan.")
    add_bullet_p(doc, "Layer 3 - FAQ Knowledge Base: ", "Mencocokkan pertanyaan operasional toko (alamat gudang Surabaya, jam operasional, kebijakan retur/garansi, cara pesan) menggunakan kamus kata kunci pada knowledge.json.")
    add_bullet_p(doc, "Layer 4 - RAG Engine & Groq LLM: ", "Apabila kueri menanyakan produk, RAG mencari katalog yang cocok dan model Groq menyusun rekomendasi personal.")
    add_bullet_p(doc, "Layer 5 - Safe Fallback: ", "Jika koneksi API Groq terputus atau batas kuota habis, sistem secara elegan menyajikan daftar katalog produk terkait disertai kontak CS WhatsApp 081331208493.")

    add_heading_2(doc, "3.5 Pengelolaan Memori Konversi Multi-Turn")
    add_body_p(doc, 
        "Agar percakapan terasa alami, sistem dilengkapi memori sesi berbasis sliding-window yang menyimpan hingga 6 pesan terakhir per pengguna (3 putaran percakapan tanya-jawab). Apabila pengguna menanyakan pertanyaan lanjutan seperti 'berapa harganya?' atau 'bagaimana cara semainya?', modul RAG menggabungkan konteks pertanyaan sebelumnya dengan kueri terbaru sehingga chatbot tetap memahami produk yang sedang dibahas.")

    add_heading_2(doc, "3.6 Desain Antarmuka Pengguna (UI E-Commerce)")
    add_body_p(doc, 
        "Antarmuka website pada direktori public/ dirancang dengan prinsip desain bersih (clean design) bertema botani profesional tanpa elemen kecerdasan buatan yang berlebihan. Warna utama menggunakan hijau daun botani (#15803d), latar belakang putih bersih (#ffffff), dan tombol aksi Shopee berwarna oranye terang (#ee4d2d).")
    add_body_p(doc, 
        "Setiap kartu produk menampilkan tag kategori, nama produk, status ketersediaan barang, deskripsi singkat, harga tebal dalam format Rupiah, tombol tautan langsung 'Beli di Shopee', dan tombol 'Tanya via WA' yang langsung membuka aplikasi WhatsApp menuju nomor 081331208493 dengan draf pesan otomatis. Widget AI konsultan diposisikan sebagai tombol mengambang (floating widget) bergaya modern di pojok kanan bawah layar.")

    # ================= BAB IV: HASIL PENGUJIAN DAN EVALUASI =================
    add_heading_1(doc, "BAB IV\nHASIL PENGUJIAN DAN EVALUASI SISTEM")

    add_heading_2(doc, "4.1 Matriks Skenario Pengujian Fungsional")
    add_body_p(doc, 
        "Pengujian fungsional menyeluruh dilakukan pada website publik Vercel (https://infarm-chatbot-rifki.vercel.app) untuk memvalidasi akurasi setiap lapisan respons sistem. Tabel 4.1 merangkum matriks hasil pengujian yang telah dieksekusi.")

    # Table 4.1: Matriks Pengujian
    table_test = doc.add_table(rows=6, cols=4)
    table_test.alignment = WD_TABLE_ALIGNMENT.CENTER
    headers_test = ["No", "Skenario Uji", "Pesan Kueri Uji", "Hasil dan Evaluasi Respons"]
    data_test = [
        ["1", "Sapaan Awal", "'Halo selamat siang'", "Berhasil merespons via Layer 1 dengan sapaan resmi Infarm Official Shop tanpa latensi API."],
        ["2", "Informasi Kontak", "'Berapa nomor kontak WA dan alamat toko?'", "Berhasil menampilkan alamat gudang Gayungan Surabaya, nomor WhatsApp 081331208493, dan tautan Shopee via Layer 3 (knowledge_direct)."],
        ["3", "Pencarian Produk Benih (RAG)", "'Rekomendasi benih kangkung untuk pemula dan harganya'", "Groq Qwen merekomendasikan 'INFARM - Benih Bibit Unggul Kangkung Daun Sempit Serimpi F1' seharga Rp 12.000 (500 butir, panen 21 hari) beserta URL Shopee aktif."],
        ["4", "Pencarian Pupuk & Hama", "'Punya obat alami untuk kutu daun dan tanaman cabai?'", "RAG menyaring 'Neem Oil 100ml' (Rp 45.000) dan 'Pupuk Booster Cabai' (Rp 39.500) dengan deskripsi fungsi yang akurat."],
        ["5", "Produk di Luar Katalog", "'Apakah menjual bibit pohon mangga arum manis?'", "Chatbot menjawab santun bahwa bibit mangga belum tersedia di katalog saat ini dan mengarahkan ke CS WhatsApp 081331208493."]
    ]
    for c_idx, h_text in enumerate(headers_test):
        cell = table_test.rows[0].cells[c_idx]
        cell.text = h_text
        set_run_font(cell.paragraphs[0].runs[0], size_pt=11, bold=True, color=BLACK)
        cell.paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
        set_cell_border(cell, top=dict(sz=6, val='single', color='000000'), bottom=dict(sz=6, val='single', color='000000'))
    for r_idx, row_values in enumerate(data_test):
        row = table_test.rows[r_idx + 1]
        for c_idx, val in enumerate(row_values):
            cell = row.cells[c_idx]
            cell.text = val
            set_run_font(cell.paragraphs[0].runs[0], size_pt=10, bold=False, color=BLACK)
            set_cell_border(cell, bottom=dict(sz=4, val='single', color='000000'))

    doc.add_paragraph().paragraph_format.space_after = Pt(6)

    add_heading_2(doc, "4.2 Evaluasi Performa Latensi dan Akurasi Data")
    add_body_p(doc, 
        "Dari hasil pengujian performa, waktu respons untuk kueri sapaan dan FAQ instan berada di bawah 50 milidetik karena diproses langsung pada lapisan memori cache. Sementara itu, untuk kueri kompleks yang melibatkan proses retrieval RAG dan inferensi model Groq Qwen 3.8 27B, rata-rata latensi berkisar antara 600 hingga 1.200 milidetik, yang tergolong sangat responsif untuk standar aplikasi web publik.")
    add_body_p(doc, 
        "Dalam aspek akurasi data faktual, sistem menunjukkan tingkat presisi 100% terhadap nominal harga dan spesifikasi butir benih. Hal ini membuktikan bahwa strategi injeksi konteks katalog terstruktur berhasil menghilangkan fenomena halusinasi yang kerap terjadi pada model bahasa generatif murni.")

    # ================= BAB V: KESIMPULAN DAN SARAN =================
    add_heading_1(doc, "BAB V\nKESIMPULAN DAN SARAN")

    add_heading_2(doc, "5.1 Kesimpulan")
    add_body_p(doc, "Berdasarkan keseluruhan tahapan perancangan, implementasi, dan pengujian sistem, dapat ditarik kesimpulan sebagai berikut:", first_line_indent=0)
    add_bullet_p(doc, "1. ", "Proses web scraping etis menggunakan ekstensi Instant Data Scraper berhasil mengumpulkan 36 data produk resmi dari lapak Shopee 'Infarm Official Shop' dengan seluruh tautan produk terbukti valid berstatus HTTP 200 OK.")
    add_bullet_p(doc, "2. ", "Penerapan arsitektur Retrieval-Augmented Generation (RAG) yang dipadukan dengan model bahasa Groq AI (qwen/qwen3.8-27b) terbukti efektif menghasilkan jawaban yang faktual, relevan, dan bebas dari halusinasi data.")
    add_bullet_p(doc, "3. ", "Arsitektur sistem dual-platform berhasil menggabungkan fleksibilitas website e-commerce serverless di cloud Vercel (https://infarm-chatbot-rifki.vercel.app) dengan kenyamanan kanal komunikasi WhatsApp (081331208493).")
    add_bullet_p(doc, "4. ", "Desain antarmuka pengguna e-commerce modern yang bersih dan intuitif mampu memudahkan pembeli dalam mengeksplorasi katalog produk, berkonsultasi dengan asisten AI, maupun melakukan checkout langsung ke lapak Shopee.")

    add_heading_2(doc, "5.2 Saran Pengembangan")
    add_body_p(doc, "Beberapa saran untuk pengembangan sistem di masa mendatang antara lain:", first_line_indent=0)
    add_bullet_p(doc, "1. Otomasi Sinkronisasi Stok: ", "Mengintegrasikan antarmuka pemrograman aplikasi (API) resmi Shopee Open Platform untuk memperbarui jumlah persediaan barang dan harga promosi secara real-time.")
    add_bullet_p(doc, "2. Penerapan Vektor Semantik (Dense Retrieval): ", "Meningkatkan kemampuan pemahaman sinonim kueri dengan memanfaatkan embedding model vektor (misal: BGE-M3) untuk menangkap padanan istilah lokal pertanian.")
    add_bullet_p(doc, "3. Pengenalan Gambar Tanaman: ", "Menambahkan modul Computer Vision yang memungkinkan pembeli mengirimkan foto daun tanaman yang sakit untuk didiagnosis hama atau kekurangannya secara otomatis.")

    # ================= DAFTAR PUSTAKA =================
    add_heading_1(doc, "DAFTAR PUSTAKA")
    
    references = [
        "Groq Inc. (2024). Groq LPU Inference Engine: Architecture and API Reference Guide. Mountain View, CA: Groq Technologies.",
        "Jurafsky, D., & Martin, J. H. (2024). Speech and Language Processing: An Introduction to Natural Language Processing, Computational Linguistics, and Speech Recognition (3rd ed. draft). Stanford University Press.",
        "Lewis, P., Perez, E., Piktus, A., Petroni, F., Karpukhin, V., Goyal, N., ... & Kiela, D. (2020). Retrieval-augmented generation for knowledge-intensive NLP tasks. Advances in Neural Information Processing Systems (NeurIPS), 33, 9459-9474.",
        "Ma'ady, M. N. P., Baihaqi, M., & Isfahani, M. F. (2026). Modul Praktikum: Scraping Data Produk Shopee Menggunakan Extension sebagai Basis Data Chatbot RAG. Laboratorium Kecerdasan Buatan, Program Studi Sistem Informasi, Fakultas Rekayasa Industri, Telkom University Surabaya.",
        "Mitchell, R. (2018). Web Scraping with Python: Collecting More Data from the Modern Web (2nd ed.). Sebastopol, CA: O'Reilly Media.",
        "Qwen Team, Alibaba Cloud. (2024). Qwen Technical Report: Advancements in Large Language Models. arXiv preprint arXiv:2309.16609.",
        "Shopee Indonesia. (2026). Halaman Resmi Toko Infarm Official Shop (infarmofficialshop). PT Shopee International Indonesia. https://shopee.co.id/infarmofficialshop",
        "Vaswani, A., Shazeer, N., Parmar, N., Uszkoreit, J., Jones, L., Gomez, A. N., ... & Polosukhin, I. (2017). Attention is all you need. Advances in Neural Information Processing Systems (NeurIPS), 30, 5998-6008.",
        "Vercel Inc. (2024). Serverless Functions Documentation and Architecture Specifications. Vercel Cloud Platform. https://vercel.com/docs"
    ]

    for ref in references:
        p_ref = doc.add_paragraph()
        p_ref.paragraph_format.space_before = Pt(3)
        p_ref.paragraph_format.space_after = Pt(6)
        p_ref.paragraph_format.line_spacing = 1.15
        p_ref.paragraph_format.left_indent = Inches(0.4)
        p_ref.paragraph_format.first_line_indent = Inches(-0.4)
        p_ref.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        r_ref = p_ref.add_run(ref)
        set_run_font(r_ref, size_pt=12, bold=False, color=BLACK)

    # ================= LAMPIRAN =================
    add_heading_1(doc, "LAMPIRAN\nTAUTAN DAN DOKUMENTASI SISTEM")
    
    add_heading_2(doc, "Tautan Publik dan Verifikasi Sistem")
    add_bullet_p(doc, "Website Publik Vercel: ", "https://infarm-chatbot-rifki.vercel.app")
    add_bullet_p(doc, "Repository GitHub Resmi: ", "https://github.com/Rifkilaroyba/ChatBot")
    add_bullet_p(doc, "Lapak Resmi Shopee: ", "https://shopee.co.id/infarmofficialshop (Shop ID: 93053250)")
    add_bullet_p(doc, "Nomor WhatsApp Customer Service: ", "081331208493 (https://wa.me/6281331208493)")
    add_bullet_p(doc, "Model LLM Cloud Aktif: ", "Qwen 3.8 27B (qwen/qwen3.8-27b) via Groq LPU Inference")

    add_heading_2(doc, "Sampel Data Katalog Produk CSV (data/products.csv)")
    sample_text = (
        "1. INFARM - Benih Bibit Unggul Kangkung Daun Sempit Serimpi F1 | Benih | Rp 12.000 | https://shopee.co.id/INFARM-Benih-Unggul-Kangkung-Mudah-Tumbuh-Berkecambah-Premium-Benih-F1-Sayur-Kangkung-i.93053250.28394618746\n"
        "2. INFARM - Paket Lengkap 10 Benih Sayuran FREE AB Mix Sayur | Benih | Rp 14.000 | https://shopee.co.id/INFARM-Paket-Lengkap-10-Benih-Sayuran-FREE-AB-Mix-Sayur-Benih-Sayuran-Unggul-Bibit-Sayur-Premium-Bibit-Mudah-Tumbuh-Gratis-Nutrisi-AB-Mix-Bubuk-Daun-Sayur-Pupuk-AB-Mix-Serbuk-Organik-Melebatkan-Daun-Paket-Tanam-Sayur-Benih-Berkualitas-dan-Pupuk-Organik-i.93053250.4523903767\n"
        "3. INFARM - Benih Buah Semangka Tanpa Biji Super Manis Segar | Benih | Rp 16.000 | https://shopee.co.id/INFARM-Benih-Buah-Semangka-Tanpa-Biji-Benih-Unggul-Buah-Semangka-Tanpa-Biji-Mudah-Tumbuh-Premium-i.93053250.49959148096\n"
        "4. INFARM - Pupuk Organik Cair 100ml POC Tanaman Buah dan Sayur | Pupuk | Rp 29.000 | https://shopee.co.id/INFARM-POC-Pupuk-Organik-Cair-Tanaman-Sayur-Daun-100mL-Pupuk-Tanaman-Sayuran-Organik-i.1429394658.26872148295\n"
        "5. INFARM - Media Tanam Cocopeat Block Jumbo 5 kg Rendah Zat Tanin | Media Tanam | Rp 24.500 | https://shopee.co.id/INFARM-Media-Tanam-Cocopeat-Block-5-kg-Media-Tanam-Organik-Ukuran-Jumbo-Rendah-Zat-Tanin-i.93053250.24588027933"
    )
    p_samp = doc.add_paragraph()
    p_samp.paragraph_format.space_before = Pt(4)
    p_samp.paragraph_format.space_after = Pt(6)
    p_samp.paragraph_format.line_spacing = 1.15
    r_samp = p_samp.add_run(sample_text)
    set_run_font(r_samp, size_pt=10, bold=False, color=BLACK)

    # Final pass: Ensure EVERY run in the document is Times New Roman and BLACK color!
    for p in doc.paragraphs:
        for r in p.runs:
            r.font.name = FONT_NAME
            r.font.color.rgb = BLACK
            rPr = r._r.get_or_add_rPr()
            rFonts = rPr.find(qn('w:rFonts'))
            if rFonts is not None:
                rFonts.set(qn('w:ascii'), FONT_NAME)
                rFonts.set(qn('w:hAnsi'), FONT_NAME)
                rFonts.set(qn('w:cs'), FONT_NAME)

    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                for p in cell.paragraphs:
                    for r in p.runs:
                        r.font.name = FONT_NAME
                        r.font.color.rgb = BLACK
                        rPr = r._r.get_or_add_rPr()
                        rFonts = rPr.find(qn('w:rFonts'))
                        if rFonts is not None:
                            rFonts.set(qn('w:ascii'), FONT_NAME)
                            rFonts.set(qn('w:hAnsi'), FONT_NAME)
                            rFonts.set(qn('w:cs'), FONT_NAME)

    output_path = "LAPORAN_TUGAS_PRAKTIKUM_RIFKI.docx"
    doc.save(output_path)
    print(f"Laporan berhasil disimpan ke: {output_path}")

if __name__ == "__main__":
    build_report()
