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

const allowedExtensions = new Set([".pdf", ".docx"]);

const fileFilter = (req, file, cb) => {
  const extension = path.extname(file.originalname || "").toLowerCase();

  if (!allowedExtensions.has(extension)) {
    return cb(new Error("Only .pdf and .docx files are allowed"));
  }

  return cb(null, true);
};

const upload = multer({
  storage,
  fileFilter
});

module.exports = upload;
