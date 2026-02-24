const router = require("express").Router();
const auth = require("../middleware/auth");
const uploadProfile = require("../middleware/uploadProfileImage");
const uploadMitraPhotos = require("../middleware/uploadMitraPhotos");
const {
  getMe,
  updateMe,
  uploadAvatar,
  uploadPhotos,
  deletePhoto,
  changePassword,
} = require("../controllers/userController");

router.get("/me", auth, getMe);
router.put("/me", auth, updateMe);
router.put("/me/password", auth, changePassword);
router.put("/me/avatar", auth, (req, res, next) => {
  uploadProfile.single("avatar")(req, res, (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({ message: "File terlalu besar (maks 2MB)" });
      }
      return res.status(400).json({
        message: err.message || "Gagal mengunggah foto profil",
      });
    }
    next();
  });
}, uploadAvatar);
router.post("/me/photos", auth, uploadMitraPhotos, uploadPhotos);
router.delete("/me/photos", auth, deletePhoto);

module.exports = router;

