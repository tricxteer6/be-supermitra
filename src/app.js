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

/* =========================
   CORS CONFIG (FIXED)
========================= */

const allowedOrigins = [
  "https://supermitra.masterkuliner.com",
  "https://www.supermitra.masterkuliner.com",
  "https://masterkuliner.com",
  "https://www.masterkuliner.com",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

const corsOptions = {
  origin: function (origin, callback) {
    // allow non-browser requests (like curl, postman)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

/* =========================
   MIDDLEWARE
========================= */

app.use(express.json());

/* =========================
   HEALTH CHECK
========================= */

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

/* =========================
   ROUTES
========================= */

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/course", courseRoutes);
app.use("/api/akses", aksesRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/user", userRoutes);

/* =========================
   STATIC FILES
========================= */

const publicDir = path.join(__dirname, "..", "public");
app.use("/public", express.static(publicDir));

/* =========================
   ERROR HANDLER
========================= */

app.use((err, req, res, next) => {
  console.error("UNHANDLED ERROR:", err);

  if (!res.headersSent) {
    res.status(500).json({
      message: "Server error",
    });
  }
});

/* =========================
   START SERVER
========================= */

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
