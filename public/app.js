// =====================================================================
// INFARM OFFICIAL SHOP — APPLICATION SCRIPT
// Store Catalog, RAG Search, Floating AI Assistant, & Gateway Monitor
// =====================================================================

const API_URL = "/api";
const WA_PHONE_NUMBER = "6281331208493"; // CS Resmi Infarm
const SHOPEE_STORE_URL = "https://shopee.co.id/infarmofficialshop";

// Global State
let allProducts = [];
let activeCategory = "all";
let activeSort = "default";
let chatHistory = [];
let currentQRCode = null;

// DOM Elements: Navigation
const tabCatalogBtn = document.getElementById("tabCatalogBtn");
const tabGatewayBtn = document.getElementById("tabGatewayBtn");
const catalogView = document.getElementById("catalogView");
const gatewayView = document.getElementById("gatewayView");

// DOM Elements: Catalog
const productsGrid = document.getElementById("productsGrid");
const searchInput = document.getElementById("searchInput");
const searchClearBtn = document.getElementById("searchClearBtn");
const sortSelect = document.getElementById("sortSelect");
const categoryPills = document.getElementById("categoryPills");
const productCountText = document.getElementById("productCountText");
const productsBody = document.getElementById("productsBody");

// DOM Elements: Floating Chatbot
const chatToggleBtn = document.getElementById("chatToggleBtn");
const chatWindow = document.getElementById("chatWindow");
const chatMinimizeBtn = document.getElementById("chatMinimizeBtn");
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const chatMessages = document.getElementById("chatMessages");
const openAiChatBtn = document.getElementById("openAiChatBtn");

// DOM Elements: Gateway Dashboard
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const resetBtn = document.getElementById("resetBtn");
const statusText = document.getElementById("statusText");
const statusDot = document.getElementById("statusDot");
const qrSection = document.getElementById("qrSection");
const readySection = document.getElementById("readySection");
const botNumberText = document.getElementById("botNumberText");
const knowledgeList = document.getElementById("knowledgeList");
const refreshQuotaBtn = document.getElementById("refreshQuotaBtn");
const groqReqRemaining = document.getElementById("groqReqRemaining");
const groqReqBar = document.getElementById("groqReqBar");
const groqReqReset = document.getElementById("groqReqReset");
const groqTokenRemaining = document.getElementById("groqTokenRemaining");
const groqTokenBar = document.getElementById("groqTokenBar");
const groqModelName = document.getElementById("groqModelName");
const groqLastChecked = document.getElementById("groqLastChecked");

// ================= TAB NAVIGATION =================
if (tabCatalogBtn && tabGatewayBtn) {
  tabCatalogBtn.addEventListener("click", () => {
    tabCatalogBtn.classList.add("active");
    tabGatewayBtn.classList.remove("active");
    catalogView.classList.add("active");
    gatewayView.classList.remove("active");
  });

  tabGatewayBtn.addEventListener("click", () => {
    tabGatewayBtn.classList.add("active");
    tabCatalogBtn.classList.remove("active");
    gatewayView.classList.add("active");
    catalogView.classList.remove("active");
    checkBotStatus();
  });
}

// ================= FORMAT CURRENCY =================
function formatIDR(numVal) {
  const num = Number(numVal);
  if (isNaN(num)) return numVal || "Hubungi CS";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(num);
}

// ================= LOAD & RENDER PRODUCTS =================
async function loadProducts() {
  try {
    const res = await fetch(`${API_URL}/products`);
    const data = await res.json();
    allProducts = data.products || [];
    renderProducts();
    renderProductsTable();
  } catch (err) {
    console.error("Gagal memuat produk:", err);
    if (productsGrid) {
      productsGrid.innerHTML = `
        <div class="loading-state">
          <p style="color: #ef4444;">Gagal memuat data produk dari server.</p>
        </div>
      `;
    }
  }
}

function renderProducts() {
  if (!productsGrid) return;
  const searchTerm = (searchInput ? searchInput.value : "").toLowerCase().trim();

  // Toggle clear search button
  if (searchClearBtn) {
    if (searchTerm.length > 0) {
      searchClearBtn.classList.remove("hidden");
    } else {
      searchClearBtn.classList.add("hidden");
    }
  }

  // Filter
  let filtered = allProducts.filter(p => {
    const matchCat =
      activeCategory === "all" ||
      (p.kategori && p.kategori.toLowerCase() === activeCategory.toLowerCase());

    const matchSearch =
      !searchTerm ||
      (p.nama && p.nama.toLowerCase().includes(searchTerm)) ||
      (p.deskripsi && p.deskripsi.toLowerCase().includes(searchTerm)) ||
      (p.kategori && p.kategori.toLowerCase().includes(searchTerm));

    return matchCat && matchSearch;
  });

  // Sort
  if (activeSort === "price-asc") {
    filtered.sort((a, b) => Number(a.harga) - Number(b.harga));
  } else if (activeSort === "price-desc") {
    filtered.sort((a, b) => Number(b.harga) - Number(a.harga));
  } else if (activeSort === "name-asc") {
    filtered.sort((a, b) => (a.nama || "").localeCompare(b.nama || ""));
  }

  // Update Counter
  if (productCountText) {
    productCountText.textContent = `Menampilkan ${filtered.length} produk resmi dari total ${allProducts.length} katalog`;
  }

  if (filtered.length === 0) {
    productsGrid.innerHTML = `
      <div class="loading-state">
        <p>Tidak ada produk yang cocok dengan kata kunci "<strong>${searchTerm}</strong>".</p>
      </div>
    `;
    return;
  }

  productsGrid.innerHTML = filtered.map(p => {
    const formattedPrice = formatIDR(p.harga);
    const shopeeUrl = p["contents href"] || SHOPEE_STORE_URL;
    
    // Pre-filled WhatsApp link
    const waText = `Halo CS Infarm Official Shop, saya tertarik dengan produk *${p.nama}* (${formattedPrice}). Apakah produk ini masih ready stok?`;
    const waUrl = `https://wa.me/${WA_PHONE_NUMBER}?text=${encodeURIComponent(waText)}`;

    return `
      <div class="product-card">
        <div>
          <div class="product-card-top">
            <span class="product-category-tag">${p.kategori || "Produk"}</span>
            <span class="product-stock-tag">Ready Stok</span>
          </div>
          <h4 class="product-title" title="${p.nama}">${p.nama}</h4>
          <p class="product-desc">${p.deskripsi || ""}</p>
        </div>
        <div class="product-card-bottom">
          <div class="product-price-row">
            <span class="product-price">${formattedPrice}</span>
            <span class="product-price-sub">Harga Shopee</span>
          </div>
          <div class="product-card-actions">
            <a href="${shopeeUrl}" target="_blank" rel="noopener noreferrer" class="btn-card-shopee">
              Beli di Shopee
            </a>
            <a href="${waUrl}" target="_blank" rel="noopener noreferrer" class="btn-card-wa">
              Tanya via WA
            </a>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

function renderProductsTable() {
  if (!productsBody) return;
  if (allProducts.length === 0) {
    productsBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Tidak ada data produk.</td></tr>';
    return;
  }
  productsBody.innerHTML = allProducts.map(p => {
    const formatted = formatIDR(p.harga);
    const shopeeLink = p["contents href"]
      ? `<a href="${p["contents href"]}" target="_blank" rel="noopener noreferrer" style="color:#ee4d2d; font-weight:600;">Lihat di Shopee</a>`
      : "-";
    return `
      <tr>
        <td><strong>${p.nama}</strong></td>
        <td><span class="tag-badge">${p.kategori}</span></td>
        <td style="font-weight:700; color:#15803d;">${formatted}</td>
        <td>${p.deskripsi}</td>
        <td>${shopeeLink}</td>
      </tr>
    `;
  }).join("");
}

// Search, Clear & Category Listeners
if (searchInput) {
  searchInput.addEventListener("input", renderProducts);
}

if (searchClearBtn) {
  searchClearBtn.addEventListener("click", () => {
    searchInput.value = "";
    renderProducts();
    searchInput.focus();
  });
}

if (sortSelect) {
  sortSelect.addEventListener("change", e => {
    activeSort = e.target.value;
    renderProducts();
  });
}

if (categoryPills) {
  categoryPills.addEventListener("click", e => {
    const pill = e.target.closest(".pill");
    if (pill) {
      document.querySelectorAll("#categoryPills .pill").forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      activeCategory = pill.getAttribute("data-cat");
      renderProducts();
    }
  });
}

// ================= FLOATING AI CHATBOT WIDGET =================
function toggleChat() {
  if (!chatWindow) return;
  chatWindow.classList.toggle("hidden");
  if (!chatWindow.classList.contains("hidden") && chatInput) {
    chatInput.focus();
  }
}

if (chatToggleBtn) chatToggleBtn.addEventListener("click", toggleChat);
if (chatMinimizeBtn) chatMinimizeBtn.addEventListener("click", toggleChat);

if (openAiChatBtn) {
  openAiChatBtn.addEventListener("click", () => {
    if (!chatWindow) return;
    chatWindow.classList.remove("hidden");
    if (chatInput) chatInput.focus();
  });
}

// Quick suggestion chips
document.querySelectorAll(".chat-chips-scroll .chip").forEach(chip => {
  chip.addEventListener("click", () => {
    const msg = chip.getAttribute("data-msg");
    if (msg && chatInput && chatForm) {
      chatInput.value = msg;
      chatForm.dispatchEvent(new Event("submit"));
    }
  });
});

// Format markdown text for chat bubble display
function formatChatMessage(text) {
  if (!text) return "";
  let html = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.*?)\*/g, "<strong>$1</strong>");

  // Format bullet points
  html = html.replace(/^[•\-*]\s+(.*)$/gm, "<li>$1</li>");
  if (html.includes("<li>")) {
    html = html.replace(/(<li>.*?<\/li>)/gs, "<ul style='margin: 6px 0 6px 18px;'>$1</ul>");
  }

  // Format URLs
  html = html.replace(
    /(https?:\/\/[^\s]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
  );

  html = html.replace(/\n/g, "<br>");
  return html;
}

if (chatForm) {
  chatForm.addEventListener("submit", async e => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;

    // 1. Render User Message
    appendMessage(text, "user");
    chatInput.value = "";

    // 2. Add Typing Indicator
    const typingId = appendTypingIndicator();

    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: chatHistory
        })
      });

      const data = await res.json();
      removeTypingIndicator(typingId);

      const reply = data.reply || "Mohon maaf, terjadi gangguan saat menghubungi asisten AI.";
      appendMessage(reply, "bot");

      // Save to local session history
      chatHistory.push({ role: "user", content: text });
      chatHistory.push({ role: "assistant", content: reply });
      if (chatHistory.length > 6) {
        chatHistory = chatHistory.slice(-6);
      }
    } catch (err) {
      console.error("Chat error:", err);
      removeTypingIndicator(typingId);
      appendMessage(
        "Terjadi kendala jaringan saat menghubungi server. Anda dapat langsung membuka katalog toko atau chat CS kami di WhatsApp: 081331208493!",
        "bot"
      );
    }
  });
}

function appendMessage(text, sender) {
  if (!chatMessages) return;
  const msgDiv = document.createElement("div");
  msgDiv.className = `message-bubble ${sender}`;

  const timeLabel = sender === "user" ? "Anda" : "Konsultan Infarm";
  msgDiv.innerHTML = `
    <div class="bubble-content">${formatChatMessage(text)}</div>
    <span class="bubble-time">${timeLabel} &bull; ${new Date().toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' })}</span>
  `;

  chatMessages.appendChild(msgDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function appendTypingIndicator() {
  if (!chatMessages) return null;
  const id = `typing-${Date.now()}`;
  const typingDiv = document.createElement("div");
  typingDiv.className = "message-bubble bot";
  typingDiv.id = id;
  typingDiv.innerHTML = `
    <div class="bubble-content" style="color: #64748b; font-style: italic;">
      Konsultan AI sedang mengetik...
    </div>
  `;
  chatMessages.appendChild(typingDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return id;
}

function removeTypingIndicator(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

// ================= GATEWAY & BOT DASHBOARD CONTROLS =================
async function checkBotStatus() {
  try {
    const response = await fetch(`${API_URL}/bot/status`);
    if (!response.ok) throw new Error("Gagal memeriksa status bot");
    const data = await response.json();

    if (data.isReady) {
      if (data.botNumber) {
        statusText.textContent = `Bot Terhubung (${data.botNumber})`;
        if (botNumberText) botNumberText.textContent = data.botNumber;
      } else {
        statusText.textContent = "Bot Terhubung";
        if (botNumberText) botNumberText.textContent = "Aktif";
      }
      if (statusDot) statusDot.className = "status-indicator ready";
      if (startBtn) startBtn.classList.add("hidden");
      if (stopBtn) stopBtn.classList.remove("hidden");
      if (readySection) readySection.classList.remove("hidden");
      if (qrSection) qrSection.classList.add("hidden");
      currentQRCode = null;
    } else if (data.hasQRCode) {
      if (botNumberText) botNumberText.textContent = "-";
      statusText.textContent = "Menunggu Scan QR";
      if (statusDot) statusDot.className = "status-indicator waiting";
      if (qrSection) qrSection.classList.remove("hidden");
      if (readySection) readySection.classList.add("hidden");
      if (startBtn) startBtn.classList.add("hidden");
      if (stopBtn) stopBtn.classList.remove("hidden");
      loadQRCode();
    } else if (data.isInitializing) {
      statusText.textContent = "Menginisialisasi Bot WhatsApp...";
      if (statusDot) statusDot.className = "status-indicator waiting";
      if (startBtn) startBtn.classList.add("hidden");
      if (stopBtn) stopBtn.classList.remove("hidden");
      if (qrSection) qrSection.classList.remove("hidden");
      if (readySection) readySection.classList.add("hidden");
      const qrEl = document.getElementById("qrcode");
      if (qrEl) qrEl.innerHTML = '<div class="loading-spinner">Mempersiapkan browser & QR code...</div>';
    } else {
      statusText.textContent = "Bot Offline";
      if (statusDot) statusDot.className = "status-indicator";
      if (startBtn) startBtn.classList.remove("hidden");
      if (stopBtn) stopBtn.classList.add("hidden");
      if (qrSection) qrSection.classList.add("hidden");
      if (readySection) readySection.classList.add("hidden");
    }
  } catch (err) {
    if (statusText) statusText.textContent = "Server Serverless (Vercel Mode)";
    if (statusDot) statusDot.className = "status-indicator";
  }
}

async function loadQRCode() {
  try {
    const response = await fetch(`${API_URL}/bot/qr`);
    const data = await response.json();
    const qrContainer = document.getElementById("qrcode");
    if (!qrContainer) return;

    if (data.qrCode) {
      if (currentQRCode !== data.qrCode) {
        currentQRCode = data.qrCode;
        qrContainer.innerHTML = "";
        if (window.QRCode) {
          new window.QRCode(qrContainer, {
            text: data.qrCode,
            width: 256,
            height: 256,
            colorDark: "#0f172a",
            colorLight: "#ffffff",
            correctLevel: window.QRCode.CorrectLevel.M
          });
        } else {
          qrContainer.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(data.qrCode)}" alt="QR WhatsApp" style="max-width:256px; border-radius:8px;">`;
        }
      }
    } else {
      qrContainer.innerHTML = '<div class="loading-spinner">Menunggu QR Code dari WhatsApp Web...</div>';
    }
  } catch (err) {
    console.error("Gagal load QR:", err);
  }
}

// Bot Control Handlers
if (startBtn) {
  startBtn.addEventListener("click", async () => {
    try {
      startBtn.disabled = true;
      startBtn.textContent = "Memulai...";
      const res = await fetch(`${API_URL}/bot/start`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) alert(data.error || "Gagal memulai bot");
      checkBotStatus();
    } catch (e) {
      alert("Error: " + e.message);
    } finally {
      startBtn.disabled = false;
      startBtn.textContent = "Mulai Bot WA";
    }
  });
}

if (stopBtn) {
  stopBtn.addEventListener("click", async () => {
    try {
      stopBtn.disabled = true;
      stopBtn.textContent = "Menghentikan...";
      await fetch(`${API_URL}/bot/stop`, { method: "POST" });
      checkBotStatus();
    } catch (e) {
      alert("Error: " + e.message);
    } finally {
      stopBtn.disabled = false;
      stopBtn.textContent = "Hentikan Bot";
    }
  });
}

if (resetBtn) {
  resetBtn.addEventListener("click", async () => {
    if (!confirm("Yakin ingin mereset sesi WhatsApp? Anda perlu scan QR ulang.")) return;
    try {
      resetBtn.disabled = true;
      await fetch(`${API_URL}/bot/reset`, { method: "POST" });
      alert("Sesi WhatsApp berhasil direset.");
      checkBotStatus();
    } catch (e) {
      alert("Error: " + e.message);
    } finally {
      resetBtn.disabled = false;
    }
  });
}

// Load Quota & Knowledge
async function loadQuota() {
  try {
    const res = await fetch(`${API_URL}/quota`);
    if (!res.ok) return;
    const q = await res.json();
    if (groqReqRemaining) groqReqRemaining.textContent = q.requestsRemaining || "14.400";
    if (groqTokenRemaining) groqTokenRemaining.textContent = q.tokensRemaining || "6.000";
    if (groqModelName) groqModelName.textContent = q.currentModel || "qwen/qwen3.8-27b";
    if (groqReqReset) groqReqReset.textContent = `Reset dalam: ${q.requestsReset || "24 jam"}`;
    if (groqLastChecked) groqLastChecked.textContent = `Pembaruan: ${new Date().toLocaleTimeString("id-ID")}`;
  } catch (e) {
    console.warn("Gagal memuat kuota:", e);
  }
}

if (refreshQuotaBtn) {
  refreshQuotaBtn.addEventListener("click", loadQuota);
}

async function loadKnowledgeTags() {
  if (!knowledgeList) return;
  try {
    const res = await fetch("/knowledge.json");
    if (!res.ok) return;
    const k = await res.json();
    const keywords = Object.keys(k.keywords || {});
    if (keywords.length === 0) return;
    knowledgeList.innerHTML = keywords.map(kw => `<span class="tag-badge">${kw}</span>`).join("");
  } catch (e) {
    console.warn("Gagal load knowledge.json:", e);
  }
}

// Initialize on DOM Ready
document.addEventListener("DOMContentLoaded", () => {
  loadProducts();
  loadKnowledgeTags();
  loadQuota();
});
