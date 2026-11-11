// Configuration & API Base
const API_URL = "/api";
const WA_PHONE_NUMBER = "6281234567890"; // Nomor WhatsApp CS Toko

// State Variables
let allProducts = [];
let activeCategory = "all";
let chatHistory = [];
let currentQRCode = null;

// DOM Elements: Navigation Tabs
const tabCatalogBtn = document.getElementById("tabCatalogBtn");
const tabGatewayBtn = document.getElementById("tabGatewayBtn");
const catalogView = document.getElementById("catalogView");
const gatewayView = document.getElementById("gatewayView");

// DOM Elements: Catalog
const productsGrid = document.getElementById("productsGrid");
const searchInput = document.getElementById("searchInput");
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

// ================= FORMAT CURRENCY =================
function formatIDR(numStr) {
  const num = Number(numStr);
  if (isNaN(num)) return numStr || "Hubungi CS";
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
    productsGrid.innerHTML = `
      <div class="loading-state">
        <p style="color: #ef4444;">Gagal memuat data produk dari server.</p>
      </div>
    `;
  }
}

function renderProducts() {
  const searchTerm = searchInput.value.toLowerCase().trim();

  const filtered = allProducts.filter(p => {
    const matchCat = activeCategory === "all" || (p.kategori && p.kategori.toLowerCase() === activeCategory.toLowerCase());
    const matchSearch =
      !searchTerm ||
      (p.nama && p.nama.toLowerCase().includes(searchTerm)) ||
      (p.deskripsi && p.deskripsi.toLowerCase().includes(searchTerm)) ||
      (p.kategori && p.kategori.toLowerCase().includes(searchTerm));
    return matchCat && matchSearch;
  });

  if (productCountText) {
    productCountText.textContent = `Menampilkan ${filtered.length} produk dari total ${allProducts.length} katalog`;
  }

  if (filtered.length === 0) {
    productsGrid.innerHTML = `
      <div class="loading-state">
        <p>Tidak ada produk yang cocok dengan pencarian "<strong>${searchTerm}</strong>".</p>
      </div>
    `;
    return;
  }

  productsGrid.innerHTML = filtered.map(p => {
    const formattedPrice = formatIDR(p.harga);
    const shopeeUrl = p["contents href"] || "https://shopee.co.id/infarm.id";
    
    // Generate Pre-filled WhatsApp link using encodeURIComponent
    const waText = `Halo Infarm.id Official Shop! Saya tertarik dengan produk *${p.nama}* (Kategori: ${p.kategori}, Harga: ${formattedPrice}). Apakah produk ini masih ready stok?`;
    const waUrl = `https://wa.me/${WA_PHONE_NUMBER}?text=${encodeURIComponent(waText)}`;

    return `
      <div class="product-card">
        <div>
          <span class="product-cat-tag">${p.kategori || "Produk"}</span>
          <h4 class="product-title">${p.nama}</h4>
          <p class="product-desc">${p.deskripsi || ""}</p>
        </div>
        <div>
          <div class="product-price">${formattedPrice}</div>
          <div class="product-actions">
            <a href="${shopeeUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-shopee-sm">
              Beli di Shopee
            </a>
            <a href="${waUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-wa-sm">
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
    const shopeeLink = p["contents href"] ? `<a href="${p["contents href"]}" target="_blank">Buka Link</a>` : "-";
    return `
      <tr>
        <td><strong>${p.nama}</strong></td>
        <td><span class="tag-item">${p.kategori}</span></td>
        <td>${formatted}</td>
        <td>${p.deskripsi}</td>
        <td>${shopeeLink}</td>
      </tr>
    `;
  }).join("");
}

// Search and Category Listeners
if (searchInput) {
  searchInput.addEventListener("input", renderProducts);
}

if (categoryPills) {
  categoryPills.addEventListener("click", e => {
    if (e.target.classList.contains("pill")) {
      document.querySelectorAll("#categoryPills .pill").forEach(p => p.classList.remove("active"));
      e.target.classList.add("active");
      activeCategory = e.target.getAttribute("data-cat");
      renderProducts();
    }
  });
}

// ================= FLOATING AI CHATBOT WIDGET =================
function toggleChat() {
  chatWindow.classList.toggle("hidden");
  if (!chatWindow.classList.contains("hidden")) {
    chatInput.focus();
  }
}

chatToggleBtn.addEventListener("click", toggleChat);
chatMinimizeBtn.addEventListener("click", toggleChat);
if (openAiChatBtn) {
  openAiChatBtn.addEventListener("click", () => {
    chatWindow.classList.remove("hidden");
    chatInput.focus();
  });
}

// Quick suggestion chips
document.querySelectorAll(".chat-chips-scroll .chip").forEach(chip => {
  chip.addEventListener("click", () => {
    const msg = chip.getAttribute("data-msg");
    if (msg) {
      chatInput.value = msg;
      chatForm.dispatchEvent(new Event("submit"));
    }
  });
});

// Format markdown text for chat bubble display
function formatChatMessage(text) {
  if (!text) return "";
  // Bold: *teks* or **teks** -> <strong>teks</strong>
  let html = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.*?)\*/g, "<strong>$1</strong>");

  // Links: replace URLs with clickable links
  html = html.replace(
    /(https?:\/\/[^\s]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
  );

  // Newlines to <br>
  html = html.replace(/\n/g, "<br>");
  return html;
}

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
      "Terjadi kendala jaringan saat menghubungi server. Anda dapat langsung membuka katalog toko atau chat CS kami di WhatsApp!",
      "bot"
    );
  }
});

function appendMessage(text, sender) {
  const msgDiv = document.createElement("div");
  msgDiv.className = `message-bubble ${sender}`;

  const timeLabel = sender === "user" ? "Anda" : "AI Infarm";
  msgDiv.innerHTML = `
    <div class="bubble-content">${formatChatMessage(text)}</div>
    <span class="bubble-time">${timeLabel} &bull; ${new Date().toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' })}</span>
  `;

  chatMessages.appendChild(msgDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function appendTypingIndicator() {
  const id = `typing-${Date.now()}`;
  const typingDiv = document.createElement("div");
  typingDiv.className = "message-bubble bot";
  typingDiv.id = id;
  typingDiv.innerHTML = `
    <div class="bubble-content" style="color: #64748b; font-style: italic;">
      AI sedang mengetik...
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
      startBtn.classList.add("hidden");
      stopBtn.classList.remove("hidden");
      readySection.classList.remove("hidden");
      qrSection.classList.add("hidden");
      currentQRCode = null;
    } else if (data.hasQRCode) {
      if (botNumberText) botNumberText.textContent = "-";
      statusText.textContent = "Menunggu Scan QR";
      if (statusDot) statusDot.className = "status-indicator waiting";
      qrSection.classList.remove("hidden");
      readySection.classList.add("hidden");
      startBtn.classList.add("hidden");
      stopBtn.classList.remove("hidden");
      loadQRCode();
    } else if (data.isInitializing) {
      statusText.textContent = "Menginisialisasi Bot WhatsApp...";
      if (statusDot) statusDot.className = "status-indicator waiting";
      startBtn.classList.add("hidden");
      stopBtn.classList.remove("hidden");
      qrSection.classList.remove("hidden");
      readySection.classList.add("hidden");
    } else if (data.isVercel) {
      statusText.textContent = "Serverless Cloud (Vercel)";
      if (statusDot) statusDot.className = "status-indicator ready";
      startBtn.classList.add("hidden");
      stopBtn.classList.add("hidden");
    } else {
      statusText.textContent = "Bot Offline";
      if (statusDot) statusDot.className = "status-indicator";
      startBtn.classList.remove("hidden");
      stopBtn.classList.add("hidden");
      readySection.classList.add("hidden");
      qrSection.classList.add("hidden");
      currentQRCode = null;
    }
  } catch (error) {
    statusText.textContent = "Server Offline (Jalankan 'npm run dev')";
    if (statusDot) statusDot.className = "status-indicator";
    startBtn.classList.remove("hidden");
    stopBtn.classList.add("hidden");
  }
}

async function loadQRCode() {
  try {
    const response = await fetch(`${API_URL}/bot/qr`);
    const data = await response.json();
    if (data.qr && data.qr !== currentQRCode) {
      currentQRCode = data.qr;
      const qrContainer = document.getElementById("qrcode");
      qrContainer.innerHTML = `<img width="260" height="260" alt="QR Code WhatsApp" src="https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(data.qr)}">`;
    }
  } catch (error) {
    console.error("Gagal memuat QR Code:", error);
  }
}

if (startBtn) {
  startBtn.onclick = async () => {
    try {
      startBtn.disabled = true;
      startBtn.textContent = "Memulai...";
      await fetch(`${API_URL}/bot/start`, { method: "POST" });
    } catch (error) {
      console.error("Error memulai bot:", error);
      alert("Gagal mengirim perintah start ke server.");
    } finally {
      startBtn.disabled = false;
      startBtn.textContent = "Mulai Bot";
      checkBotStatus();
    }
  };
}

if (stopBtn) {
  stopBtn.onclick = async () => {
    try {
      stopBtn.disabled = true;
      stopBtn.textContent = "Menghentikan...";
      await fetch(`${API_URL}/bot/stop`, { method: "POST" });
    } catch (error) {
      console.error("Error menghentikan bot:", error);
      alert("Gagal mengirim perintah stop ke server.");
    } finally {
      stopBtn.disabled = false;
      stopBtn.textContent = "Hentikan Bot";
      checkBotStatus();
    }
  };
}

if (resetBtn) {
  resetBtn.onclick = async () => {
    if (!confirm("Apakah Anda yakin ingin mereset sesi WhatsApp? Anda harus scan QR ulang.")) {
      return;
    }
    try {
      resetBtn.disabled = true;
      resetBtn.textContent = "Mereset...";
      const res = await fetch(`${API_URL}/bot/reset`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        alert(data.message || "Sesi WhatsApp berhasil dibersihkan!");
      } else {
        alert("Gagal mereset: " + (data.error || "Kesalahan server"));
      }
    } catch (error) {
      console.error("Error mereset bot:", error);
      alert("Gagal menghubungi endpoint reset.");
    } finally {
      resetBtn.disabled = false;
      resetBtn.textContent = "Reset Sesi WA";
      checkBotStatus();
    }
  };
}

// Load Knowledge FAQ
async function loadKnowledgeList() {
  if (!knowledgeList) return;
  try {
    const res = await fetch(`${API_URL}/knowledge`);
    const data = await res.json();
    const responses = data.responses || {};
    const keys = Object.keys(responses);
    if (keys.length === 0) {
      knowledgeList.innerHTML = "<em>Belum ada kata kunci kustom.</em>";
      return;
    }
    knowledgeList.innerHTML = keys
      .map(k => `<span class="tag-item" title="${responses[k]}"><strong>${k}</strong></span>`)
      .join("");
  } catch (err) {
    knowledgeList.innerHTML = "<em>Gagal memuat basis pengetahuan.</em>";
  }
}

// Load Groq Quota
async function loadGroqQuota(isFresh = false) {
  try {
    const url = isFresh ? `${API_URL}/groq/quota?fresh=true` : `${API_URL}/groq/quota`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Gagal mengambil data kuota");
    const data = await res.json();

    if (data.configured) {
      if (groqModelName) groqModelName.textContent = data.model || "-";
      if (groqLastChecked) groqLastChecked.textContent = `Pembaruan: ${data.lastChecked || "Baru saja"}`;

      if (data.remainingRequests !== null && data.limitRequests !== null) {
        if (groqReqRemaining) {
          groqReqRemaining.textContent = `${Number(data.remainingRequests).toLocaleString()} / ${Number(data.limitRequests).toLocaleString()}`;
        }
        if (groqReqBar) {
          const pct = Math.max(0, Math.min(100, (data.remainingRequests / data.limitRequests) * 100));
          groqReqBar.style.width = `${pct}%`;
          groqReqBar.className = pct < 20 ? "progress-bar-fill danger" : pct < 50 ? "progress-bar-fill warning" : "progress-bar-fill";
        }
        if (groqReqReset && data.resetRequests) {
          groqReqReset.textContent = `Reset dalam: ${data.resetRequests}`;
        }
      } else {
        if (groqReqRemaining) groqReqRemaining.textContent = "Aktif (Menunggu data)";
      }

      if (data.remainingTokens !== null && data.limitTokens !== null) {
        if (groqTokenRemaining) {
          groqTokenRemaining.textContent = `${Number(data.remainingTokens).toLocaleString()} / ${Number(data.limitTokens).toLocaleString()}`;
        }
        if (groqTokenBar) {
          const pct = Math.max(0, Math.min(100, (data.remainingTokens / data.limitTokens) * 100));
          groqTokenBar.style.width = `${pct}%`;
        }
      } else {
        if (groqTokenRemaining) groqTokenRemaining.textContent = "Aktif (Menunggu data)";
      }
    } else {
      if (groqModelName) groqModelName.textContent = "Belum Dikonfigurasi (.env)";
      if (groqReqRemaining) groqReqRemaining.textContent = "-";
      if (groqTokenRemaining) groqTokenRemaining.textContent = "-";
    }
  } catch (err) {
    // console.warn("Gagal memuat kuota Groq:", err);
  }
}

if (refreshQuotaBtn) {
  refreshQuotaBtn.onclick = async () => {
    refreshQuotaBtn.disabled = true;
    refreshQuotaBtn.textContent = "Memeriksa...";
    await loadGroqQuota(true);
    refreshQuotaBtn.disabled = false;
    refreshQuotaBtn.textContent = "Perbarui Kuota";
  };
}

// ================= INITIALIZATION =================
loadProducts();
loadKnowledgeList();
checkBotStatus();
loadGroqQuota();

setInterval(checkBotStatus, 5000);
setInterval(() => loadGroqQuota(false), 20000);

