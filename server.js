import express from "express";
import cors from "cors";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import Stripe from "stripe";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Încărcăm variabilele din .env.local
dotenv.config({ path: path.join(__dirname, '.env.local') });

// 2. Inițializăm Stripe (acum process.env.STRIPE_SECRET_KEY este populat)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const app = express();

// 3. Configurare CORS și JSON
app.use(cors({
    origin: "http://localhost:5173" 
}));
app.use(express.json());

// 4. Configurare Cloudinary (folosind variabilele din .env.local)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Logger pentru cereri
app.use((req, res, next) => {
    console.log(`🚀 Cerere primită: ${req.method} ${req.url}`);
    next();
});

console.log("--- 🛰️ STATUS SERVER ---");
console.log("Stripe Key exists:", !!process.env.STRIPE_SECRET_KEY);
console.log("Cloud Name:", process.env.CLOUDINARY_CLOUD_NAME);
console.log("API Key loaded:", !!process.env.CLOUDINARY_API_KEY);
console.log("-----------------------");

const upload = multer({ dest: "uploads/" });

// --- RUTA STRIPE ---
app.post("/create-checkout-session", async (req, res) => {
  try {
    const { items } = req.body;
    console.log("🛒 Produse primite:", items);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: items.map(item => ({
        price_data: {
          currency: "eur",
          product_data: { name: item.title },
          unit_amount: Math.round(Number(item.price) * 100),
        },
        quantity: item.quantity,
      })),
      success_url: "http://localhost:5173/payment-success",
      cancel_url: "http://localhost:5173/checkout",
    });

    // TRIMITEM URL-UL SESIUNII ÎNAPOI
    res.json({ id: session.id, url: session.url });
  } catch (error) {
    console.error("❌ STRIPE ERROR:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// --- RUTA UPLOAD AVATAR ---
app.post("/api/upload-avatar", upload.single("avatar"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "avatars",
      transformation: [{ width: 300, height: 300, crop: "fill" }],
    });

    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

    res.json({ url: result.secure_url });
  } catch (err) {
    console.error("❌ UPLOAD ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(5000, () => console.log("🔥 Server-ul Cellestial rulează pe portul 5000"));