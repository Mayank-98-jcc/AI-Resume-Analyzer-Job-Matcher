const calculateATS = require("../utils/calculateATS");
const fs = require("fs");
const Resume = require("../models/Resume");
const extractSkills = require("../utils/extractSkills");
const generateSuggestions = require("../utils/generateSuggestions");
const { evaluateSuggestionProgress } = require("../utils/generateSuggestions");
const analyzeResumeSections = require("../utils/analyzeSections");
const calculateResumeStrength = require("../utils/calculateResumeStrength");
const extractResumeTextFromUpload = require("../utils/extractResumeText");
const { logActivity } = require("../utils/activityLogger");
const {
  generateSummary: generateSummaryAI,
  rewriteResumeWithGroq
} = require("../utils/geminiService");

function safeUnlink(filePath = "") {
  if (!filePath) return;
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (unlinkError) {
    console.error("Failed to clean uploaded file:", unlinkError.message);
  }
}

function isLikelyResumeText(text = "", fileName = "", pageCount = 1) {
  const source = String(text || "");
  const normalized = source.toLowerCase();
  const words = normalized.match(/[a-z]+/g) || [];

  const hasEmail = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(source);
  const hasPhone = /(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b/.test(source);

  const sectionKeywords = [
    "experience",
    "education",
    "skills",
    "projects",
    "summary",
    "objective",
    "certifications",
    "internship",
    "employment"
  ];
  const sectionHits = sectionKeywords.filter((keyword) => normalized.includes(keyword)).length;
  const hasYearPattern = /\b(19|20)\d{2}\b/.test(source);
  const hasBulletPoints = /(?:^|\n)\s*[-*•]\s+/.test(source);

  let score = 0;
  if (hasEmail) score += 2;
  if (hasPhone) score += 2;
  if (sectionHits >= 2) score += 2;
  if (sectionHits >= 4) score += 1;
  if (hasYearPattern) score += 1;
  if (hasBulletPoints) score += 1;
  if (words.length >= 120) score += 1;

  if (score >= 4 && words.length >= 60) {
    return true;
  }

  // Fallback for scanned/image resumes where PDF text extraction is empty.
  const looksLikeResumeFileName = /\b(resume|cv)\b/i.test(String(fileName || ""));
  const isShortPdf = Number(pageCount) > 0 && Number(pageCount) <= 3;
  const isTextExtractionPoor = words.length < 20;

  return looksLikeResumeFileName && isShortPdf && isTextExtractionPoor;
}

function hasResumeCoreContent(text = "") {
  const normalized = String(text || "").toLowerCase();
  const minLengthMet = normalized.trim().length >= 200;
  const contentKeywords = ["experience", "skills", "education"];
  const keywordHits = contentKeywords.filter((keyword) => normalized.includes(keyword)).length;

  return minLengthMet && keywordHits >= 2;
}

function toFileNameSlug(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
}

function getResumeFileNameSuggestion(fileName = "", userName = "") {
  const originalFileName = String(fileName || "").trim();
  const extension = String(originalFileName.match(/\.[^.]+$/)?.[0] || "").toLowerCase();

  if (![".pdf", ".docx"].includes(extension)) {
    return null;
  }

  const baseName = originalFileName.slice(0, -extension.length).trim();
  const normalizedBaseName = toFileNameSlug(baseName);
  const preferredPattern = /^[a-z0-9]+(?:_[a-z0-9]+)+$/;

  if (preferredPattern.test(normalizedBaseName) && normalizedBaseName === baseName.toLowerCase()) {
    return null;
  }

  const normalizedUserName = toFileNameSlug(userName) || "your_name";
  const inferredCourse =
    normalizedBaseName
      .split("_")
      .filter(Boolean)
      .find((part) => /^[a-z]{2,}\d{0,4}$/i.test(part) && part !== normalizedUserName)
    || "course";

  const suggestedFileName = `${normalizedUserName}_${inferredCourse}${extension}`;

  return {
    message: `Your resume was accepted, but rename it to something like ${suggestedFileName} so it is easier to identify.`,
    suggestedFileName
  };
}

function generateResumeSummary(resumeText = "") {
  const normalizedText = String(resumeText || "").replace(/\r/g, "");
  const text = normalizedText.toLowerCase();

  const domainKeywords = {
    software: [
      "javascript", "react", "node", "java", "python", "mongodb",
      "sql", "docker", "aws", "developer", "programming"
    ],
    marketing: [
      "marketing", "seo", "campaign", "branding",
      "social media", "digital marketing"
    ],
    finance: [
      "finance", "accounting", "audit", "financial analysis",
      "budget", "tax", "investment"
    ],
    hr: [
      "human resources", "recruitment", "talent acquisition",
      "employee relations", "training"
    ],
    management: [
      "management", "leadership", "strategy",
      "operations", "business development"
    ],
    writing: [
      "content writing", "editing", "copywriting",
      "journalism", "creative writing"
    ],
    sales: [
      "sales", "lead generation", "client acquisition",
      "customer relationship", "business growth"
    ]
  };

  let detectedDomain = "professional";

  for (const domain of Object.keys(domainKeywords)) {
    if (domainKeywords[domain].some((keyword) => text.includes(keyword))) {
      detectedDomain = domain;
      break;
    }
  }

  const skillList = [
    "javascript", "react", "node", "java", "python",
    "seo", "marketing", "accounting", "excel", "sql",
    "aws", "docker", "firebase", "flutter", "mongodb"
  ];

  const detectedSkills = skillList.filter((skill) => text.includes(skill));

  const certificationKeywords = [
    "certification",
    "certificate",
    "certified",
    "aws",
    "google certificate",
    "coursera",
    "nptel",
    "udemy",
    "cloud foundations"
  ];

  const certifications = normalizedText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 2)
    .filter((line) =>
      certificationKeywords.some((keyword) => line.toLowerCase().includes(keyword))
    )
    .slice(0, 3);

  let headline = "Professional";

  if (detectedDomain === "software") headline = "Software Developer";
  if (detectedDomain === "marketing") headline = "Marketing Professional";
  if (detectedDomain === "finance") headline = "Finance Professional";
  if (detectedDomain === "hr") headline = "Human Resources Professional";
  if (detectedDomain === "management") headline = "Business Professional";
  if (detectedDomain === "writing") headline = "Content Writer";
  if (detectedDomain === "sales") headline = "Sales Professional";

  const points = [];

  points.push(`Motivated professional with strong interest in the ${detectedDomain} domain`);

  if (detectedSkills.length) {
    points.push(
      `Experienced with tools and skills including ${detectedSkills.slice(0, 4).join(", ")}`
    );
  }

  if (certifications.length) {
    points.push(
      `Earned certifications such as ${certifications.slice(0, 2).join(", ")}`
    );
  }

  points.push("Strong analytical, communication and problem solving abilities");
  points.push("Committed to continuous learning and professional growth");

  return {
    headline,
    points: points.slice(0, 4),
    certifications
  };
}

function generateCareerSuggestions(skills = []) {
  // Map extracted skills to likely career paths.
  const careerMap = {
    react: [
      "Frontend Developer",
      "React Developer"
    ],
    node: [
      "Backend Developer",
      "Full Stack Developer"
    ],
    mongodb: [
      "Database Developer",
      "Full Stack Developer"
    ],
    flutter: [
      "Mobile App Developer"
    ],
    java: [
      "Java Developer",
      "Backend Developer"
    ],
    javascript: [
      "Web Developer",
      "Frontend Developer"
    ],
    python: [
      "Python Developer",
      "Software Engineer"
    ],
    sql: [
      "Database Developer",
      "Data Analyst"
    ],
    aws: [
      "Cloud Engineer",
      "DevOps Engineer"
    ],
    marketing: [
      "Marketing Executive",
      "Digital Marketing Specialist"
    ],
    seo: [
      "SEO Specialist",
      "Digital Marketing Specialist"
    ],
    accounting: [
      "Accountant",
      "Finance Associate"
    ],
    excel: [
      "Data Analyst",
      "Operations Analyst"
    ],
    firebase: [
      "Mobile App Developer",
      "Full Stack Developer"
    ]
  };

  const suggestions = new Set();

  skills.forEach((skill) => {
    Object.keys(careerMap).forEach((key) => {
      if (String(skill || "").toLowerCase().includes(key)) {
        careerMap[key].forEach((role) => suggestions.add(role));
      }
    });
  });

  return Array.from(suggestions);
}

function normalizeSummaryPoints(summaryResponse, fallbackPoints = []) {
  if (Array.isArray(summaryResponse)) {
    return summaryResponse
      .map((item) => String(item || "").trim())
      .filter(Boolean)
      .slice(0, 4);
  }

  if (summaryResponse && Array.isArray(summaryResponse.summary)) {
    return summaryResponse.summary
      .map((item) => String(item || "").trim())
      .filter(Boolean)
      .slice(0, 4);
  }

  const summaryText = String(summaryResponse || "");

  return summaryText
    .split("\n")
    .map((line) => line.replace(/^[\s\-*•\d.]+/, "").trim())
    .filter(Boolean)
    .slice(0, 4)
    .concat(fallbackPoints)
    .slice(0, 4);
}

exports.uploadResume = async (req, res) => {
  const filePath = req.file?.path || "";
  const mimeType = String(req.file?.mimetype || "").toLowerCase();

  try {
    if (!filePath) {
      return res.status(400).json({
        error: "Resume file is required"
      });
    }

    if (
      ![
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ].includes(mimeType)
    ) {
      safeUnlink(filePath);
      return res.status(400).json({
        code: "INVALID_RESUME",
        error: "Please upload a valid resume file"
      });
    }

    const extraction = await extractResumeTextFromUpload(req.file);
    const resumeText = String(extraction?.resumeText || "");
    const fileNamingSuggestion = getResumeFileNameSuggestion(
      req.file.originalname,
      req.user?.name || req.user?.email || ""
    );

    if (
      !isLikelyResumeText(resumeText, req.file.originalname, extraction?.pageCount || 1) ||
      !hasResumeCoreContent(resumeText)
    ) {
      safeUnlink(filePath);
      return res.status(400).json({
        code: "INVALID_RESUME",
        error: "This file does not appear to be a resume"
      });
    }

    const skills = extractSkills(resumeText);
    const atsData = calculateATS(skills);
    const suggestions = generateSuggestions({
      resumeText,
      skills,
      missingSkills: atsData.missingSkills
    });
    const strengthMeter = calculateResumeStrength({
      resumeText,
      foundSkills: skills,
      fallbackAtsScore: atsData.score
    });
    const previousResume = await Resume.findOne({
      userId: req.user._id
    }).sort({ uploadedAt: -1 });

    const suggestionProgress =
      previousResume?.suggestions?.length
        ? {
            comparedResumeId: previousResume._id,
            reviewedAt: new Date(),
            ...evaluateSuggestionProgress(previousResume.suggestions, {
              resumeText,
              skills,
              missingSkills: atsData.missingSkills
            })
          }
        : undefined;

    const resume = new Resume({
      userId: req.user._id,
      fileName: req.file.originalname,
      fileStorageName: req.file.filename,
      fileMime: req.file.mimetype,
      fileSize: req.file.size,
      extractedText: resumeText,
      skills,
      atsScore: atsData.score,
      missingSkills: atsData.missingSkills,
      strengthMeter,
      suggestions,
      suggestionProgress
    });

    await resume.save();

    await logActivity({
      type: "resume_uploaded",
      userId: req.user?._id,
      description: `${req.user?.name || req.user?.email || "A user"} uploaded a resume`
    });

    if (req.user.plan === "free") {
      req.user.resumeUsageCount += 1;
      await req.user.save();
    }

    res.json({
      message: "Resume analyzed successfully",
      resumeId: resume._id,
      resumeText,
      skills,
      atsScore: atsData.score,
      missingSkills: atsData.missingSkills,
      strengthMeter,
      suggestions,
      suggestionProgress: resume.suggestionProgress || null,
      fileNamingSuggestion,
      usage: {
        plan: req.user.plan,
        resumeUsageCount: req.user.resumeUsageCount,
        resumeLimit: 3
      },
      textPreview: resumeText.substring(0, 500)
    });
  } catch (error) {
    safeUnlink(filePath);
    if (
      ["OCR_FAILED", "PDF_PARSE_FAILED", "DOCX_PARSE_FAILED", "EMPTY_RESUME_TEXT"].includes(error.code)
    ) {
      return res.status(400).json({
        error: "Could not extract text from resume. Please upload a clearer file."
      });
    }

    if (error.code === "UNSUPPORTED_FILE_TYPE") {
      return res.status(400).json({
        error: "Please upload a valid resume file"
      });
    }

    res.status(500).json({
      error: error.message
    });
  }
};

exports.getResumeHistory = async (req, res) => {
  try {
    const resumes = await Resume.find({
      userId: req.user._id
    }).sort({ uploadedAt: -1 });

    res.json(resumes);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
};

exports.getResumeSuggestions = async (req, res) => {
  try {
    const { resumeId } = req.body;

    if (!resumeId) {
      return res.status(400).json({
        error: "resumeId is required"
      });
    }

    const resume = await Resume.findOne({
      _id: resumeId,
      userId: req.user._id
    });

    if (!resume) {
      return res.status(404).json({
        error: "Resume not found"
      });
    }

    let suggestions = resume.suggestions || [];

    if (!suggestions.length) {
      suggestions = generateSuggestions({
        resumeText: resume.extractedText || "",
        skills: resume.skills || [],
        missingSkills: resume.missingSkills || []
      });
      resume.suggestions = suggestions;
      await resume.save();
    }

    return res.json({
      suggestions,
      suggestionProgress: resume.suggestionProgress || null
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
};

exports.analyzeResumeSections = async (req, res) => {
  try {
    const { resumeId } = req.body;

    if (!resumeId) {
      return res.status(400).json({
        error: "resumeId is required"
      });
    }

    const resume = await Resume.findOne({
      _id: resumeId,
      userId: req.user._id
    });

    if (!resume) {
      return res.status(404).json({
        error: "Resume not found"
      });
    }

    const sections = analyzeResumeSections(resume.extractedText || "");

    return res.json({
      sections
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
};

exports.getResumeStrengthMeter = async (req, res) => {
  try {
    const { resumeId, jobDescription = "" } = req.body;

    if (!resumeId) {
      return res.status(400).json({
        error: "resumeId is required"
      });
    }

    const resume = await Resume.findOne({
      _id: resumeId,
      userId: req.user._id
    });

    if (!resume) {
      return res.status(404).json({
        error: "Resume not found"
      });
    }

    const strengthMeter = calculateResumeStrength({
      resumeText: resume.extractedText || "",
      foundSkills: resume.skills || [],
      jobDescription,
      fallbackAtsScore: resume.atsScore || 0
    });

    resume.strengthMeter = strengthMeter;
    await resume.save();

    return res.json(strengthMeter);
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
};

exports.getResumeRanking = async (req, res) => {
  try {
    const { atsScore } = req.body;
    const numericAtsScore = Number(atsScore);

    if (!Number.isFinite(numericAtsScore)) {
      return res.status(400).json({
        error: "Valid atsScore is required"
      });
    }

    const [totalResumes, lowerCount] = await Promise.all([
      Resume.countDocuments({}),
      Resume.countDocuments({ atsScore: { $lt: numericAtsScore } })
    ]);

    const percentile = totalResumes
      ? Math.round((lowerCount / totalResumes) * 100)
      : 0;

    return res.json({
      percentile
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
};

exports.generateSummary = async (req, res) => {
  try {
    const { resumeText } = req.body;
    const isPremium = req.user?.plan === "premium";
    const normalizedResumeText = String(resumeText || "").trim();

    if (!normalizedResumeText) {
      return res.status(400).json({
        error: "Resume text missing"
      });
    }

    const fallbackSummary = generateResumeSummary(normalizedResumeText);
    let summaryResponse = fallbackSummary.points;

    try {
      summaryResponse = await generateSummaryAI(normalizedResumeText, req.user, {
        priority: isPremium
      });
    } catch (aiError) {
      console.error("SUMMARY AI FALLBACK:", aiError.message);
    }

    const summary = normalizeSummaryPoints(
      summaryResponse,
      fallbackSummary.points
    );

    return res.json({
      summary,
      certifications: fallbackSummary.certifications
    });
  } catch (error) {
    console.error("SUMMARY ERROR:", error.message);

    return res.status(500).json({
      error: error.message || "Failed to generate summary"
    });
  }
};

exports.rewriteResume = async (req, res) => {
  try {
    const { resumeText } = req.body;
    const isPremium = req.user?.plan === "premium";
    const normalizedResumeText = String(resumeText || "").trim();

    if (!normalizedResumeText) {
      return res.status(400).json({
        success: false,
        message: "Resume text missing"
      });
    }

    const rewritten = await rewriteResumeWithGroq(normalizedResumeText, req.user, {
      priority: isPremium
    });

    return res.json({
      success: true,
      data: rewritten,
      rewrittenResume: rewritten
    });
  } catch (error) {
    console.error("Rewrite Error:", error.message);

    const message = error.message || "Unable to rewrite resume right now";
    const statusCode =
      message === "Invalid resume content"
        ? 400
        : message === "GROQ_API_KEY is not configured"
          ? 500
          : 500;

    return res.status(statusCode).json({
      success: false,
      message,
      error: message
    });
  }
};

exports.getCareerSuggestions = async (req, res) => {
  try {
    const { skills = [] } = req.body;

    if (!Array.isArray(skills)) {
      return res.status(400).json({
        error: "skills must be an array"
      });
    }

    const careers = generateCareerSuggestions(skills);

    return res.json({
      careers
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
};
