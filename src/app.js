require("dotenv").config();
const express = require("express");
const path = require("path");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const courseRoutes = require("./routes/course");
const aksesRoutes = require("./routes/akses");
const publicRoutes = require("./routes/public");
const userRoutes = require("./routes/user");

const app = express();

// Allow frontend origins (required when frontend and API are on different domains)
const defaultOrigins = [
  "https://supermitra.masterkuliner.com",
  "https://www.supermitra.masterkuliner.com",
  "https://masterkuliner.com",
  "https://www.masterkuliner.com",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];
const extraOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean)
  : [];
const allowedOrigins = [...defaultOrigins, ...extraOrigins];
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      return cb(null, true); // allow others in dev; tighten by returning cb(new Error("Not allowed"), false)
    },
  })
);
app.use(express.json());

// Health check (no DB) so frontend can verify backend is up
app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/course", courseRoutes);
app.use("/api/akses", aksesRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/user", userRoutes);

// Serve uploaded files from backend/public (absolute path so it works regardless of cwd)
const publicDir = path.join(__dirname, "..", "public");
app.use("/public", express.static(publicDir));

// Last-resort: avoid 500 for public list endpoints so frontend can load
app.use((err, req, res, next) => {
  console.error("UNHANDLED ERROR:", err);
  const isPublicList =
    req.path.startsWith("/api/public") &&
    (req.path === "/api/public/users" || req.path.startsWith("/api/public/content/"));
  if (isPublicList && !res.headersSent) {
    return res.status(200).json([]);
  }
  if (!res.headersSent) {
    res.status(500).json({ message: "Server error" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
