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

// 1. Încărcăm variabilele
dotenv.config();

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

// 2. Inițializăm Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const app = express(); // DEFINIT O SINGURĂ DATĂ

app.get("/", (req, res) => {
    res.send("Serverul este LIVE! 🛰️");
});

// 3. Configurare CORS
app.use(cors({
  origin: ['https://cellestial-frontend.vercel.app', 'http://localhost:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

app.use(express.json());

// 4. Configurare Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Logger
app.use((req, res, next) => {
    console.log(`🚀 Cerere primită: ${req.method} ${req.url}`);
    next();
});

const upload = multer({ dest: "/tmp/uploads/" }); // Folosim /tmp pentru servere tip Render/Vercel

// --- RUTE ---

app.get("/", (req, res) => res.send("API Cellestial is Running... 🛰️"));

// Ruta Stripe
app.post("/create-checkout-session", async (req, res) => {
  try {
    const { items } = req.body;
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
      success_url: `${FRONTEND_URL}/payment-success`,
      cancel_url: `${FRONTEND_URL}/checkout`,
    });
    res.json({ id: session.id, url: session.url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Ruta Upload Avatar
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
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
    console.log(`🔥 Server rulează pe portul ${PORT}`);
});
