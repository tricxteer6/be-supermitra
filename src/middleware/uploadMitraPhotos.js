const multer = require("multer");
const path = require("path");
const fs = require("fs");

const dir = path.join(__dirname, "../../public/mitra-photos");
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, dir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, `photo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (!file.mimetype.startsWith("image/")) {
    cb(new Error("File harus berupa gambar"), false);
  } else {
    cb(null, true);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3MB per file
}).array("photos", 10); // max 10 photos

module.exports = upload;
