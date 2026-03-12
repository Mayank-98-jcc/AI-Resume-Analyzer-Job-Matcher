const fs = require("fs");
const path = require("path");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const Tesseract = require("tesseract.js");
const { fromPath } = require("pdf2pic");

function buildError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function safeUnlink(filePath = "") {
  if (!filePath) return;
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error("Failed deleting temp file:", error.message);
  }
}

async function extractTextFromDocx(filePath = "") {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    const text = String(result?.value || "").trim();

    if (!text) {
      throw buildError(
        "EMPTY_RESUME_TEXT",
        "Could not extract text from resume. Please upload a clearer file."
      );
    }

    return {
      resumeText: text,
      extractionMethod: "docx"
    };
  } catch (error) {
    if (error.code) throw error;
    throw buildError(
      "DOCX_PARSE_FAILED",
      "Could not extract text from resume. Please upload a clearer file."
    );
  }
}

async function extractTextFromPdfWithOcr(filePath = "", pageCount = 1) {
  const outputDir = path.join(process.cwd(), "uploads", "ocr-temp");
  fs.mkdirSync(outputDir, { recursive: true });

  const converter = fromPath(filePath, {
    density: 170,
    saveFilename: `ocr-${Date.now()}`,
    savePath: outputDir,
    format: "png",
    width: 1600,
    height: 2200
  });

  const maxPages = Math.max(1, Number(pageCount) || 1);
  const imagePaths = [];
  let combinedText = "";

  try {
    for (let page = 1; page <= maxPages; page += 1) {
      const converted = await converter(page, { responseType: "image" });
      const imagePath = converted?.path || "";
      if (!imagePath) continue;

      imagePaths.push(imagePath);

      const ocrResult = await Tesseract.recognize(imagePath, "eng");
      const pageText = String(ocrResult?.data?.text || "").trim();
      if (pageText) {
        combinedText += `\n${pageText}`;
      }
    }
  } catch (error) {
    throw buildError(
      "OCR_FAILED",
      "Could not extract text from resume. Please upload a clearer file."
    );
  } finally {
    imagePaths.forEach((imagePath) => safeUnlink(imagePath));
  }

  const text = combinedText.trim();
  if (!text) {
    throw buildError(
      "OCR_FAILED",
      "Could not extract text from resume. Please upload a clearer file."
    );
  }

  return {
    resumeText: text,
    extractionMethod: "ocr"
  };
}

async function extractTextFromPdf(filePath = "") {
  try {
    const pdfBuffer = fs.readFileSync(filePath);
    const parsed = await pdfParse(pdfBuffer);
    const parsedText = String(parsed?.text || "").trim();

    if (parsedText) {
      return {
        resumeText: parsedText,
        extractionMethod: "pdf-parse",
        pageCount: parsed?.numpages || 1
      };
    }

    const ocrData = await extractTextFromPdfWithOcr(filePath, parsed?.numpages || 1);
    return {
      ...ocrData,
      pageCount: parsed?.numpages || 1
    };
  } catch (error) {
    if (error.code) throw error;
    throw buildError(
      "PDF_PARSE_FAILED",
      "Could not extract text from resume. Please upload a clearer file."
    );
  }
}

async function extractResumeTextFromUpload(file = {}) {
  const filePath = file.path || "";
  const extension = path.extname(file.originalname || "").toLowerCase();

  if (!filePath) {
    throw buildError("FILE_MISSING", "Resume file is missing");
  }

  if (extension === ".pdf") {
    return extractTextFromPdf(filePath);
  }

  if (extension === ".docx") {
    return extractTextFromDocx(filePath);
  }

  throw buildError(
    "UNSUPPORTED_FILE_TYPE",
    "Only .pdf and .docx files are supported."
  );
}

module.exports = extractResumeTextFromUpload;
