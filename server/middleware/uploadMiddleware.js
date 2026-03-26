const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },

  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const allowedExtensions = new Set([".pdf", ".doc", ".docx"]);
const allowedMimeTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
]);

const fileFilter = (req, file, cb) => {
  const extension = path.extname(file.originalname || "").toLowerCase();
  const mimeType = String(file.mimetype || "").toLowerCase();

  if (!allowedExtensions.has(extension) || !allowedMimeTypes.has(mimeType)) {
    return cb(new Error("Please upload a valid resume file"));
  }

  return cb(null, true);
};

const upload = multer({
  storage,
  fileFilter
});

module.exports = upload;
