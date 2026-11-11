export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");

  res.status(200).json({
    isReady: false,
    isInitializing: false,
    isCleaning: false,
    isVercel: true,
    hasQRCode: false,
    botNumber: null,
    message: "Website & AI RAG Chatbot aktif di Vercel. Gateway WhatsApp Web berjalan di server lokal (Jalankan 'npm run dev' di komputer Anda untuk mengaktifkan bot WhatsApp)."
  });
}

