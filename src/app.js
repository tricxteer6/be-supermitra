require("dotenv").config();
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const courseRoutes = require("./routes/course");
const publicRoutes = require("./routes/public");
const userRoutes = require("./routes/user");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/course", courseRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/user", userRoutes);
app.use("/public", express.static("public"));

app.listen(process.env.PORT, () => {
  console.log("Server running on port", process.env.PORT);
});
