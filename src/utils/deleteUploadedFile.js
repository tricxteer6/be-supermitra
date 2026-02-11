const fs = require("fs");
const path = require("path");

/**
 * Deletes an uploaded file from disk if the path is a local /public/ path.
 * Safe to call with null/undefined or external URLs; only deletes files under backend/public.
 * @param {string | null | undefined} imagePath - e.g. "/public/course/foo.jpg" or "/public/profile/avatar.jpg"
 */
function deleteUploadedFile(imagePath) {
  try {
    if (typeof imagePath !== "string" || !imagePath.startsWith("/public/")) return;
    const fullPath = path.join(__dirname, "../..", imagePath.replace(/^\//, ""));
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  } catch {
    // ignore (e.g. file already missing, permission)
  }
}

module.exports = { deleteUploadedFile };
