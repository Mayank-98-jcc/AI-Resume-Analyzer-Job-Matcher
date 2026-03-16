const Resume = require("../models/Resume");
const extractSkills = require("./extractSkills");
const calculateResumeStrength = require("./calculateResumeStrength");
const skillList = require("./skillList");

const SKILL_ALIASES = {
  "node.js": "node",
  nodejs: "node",
  js: "javascript",
  ts: "typescript",
  "amazon web services": "aws"
};

const DISPLAY_LABELS = {
  javascript: "JavaScript",
  react: "React",
  node: "Node.js",
  express: "Express",
  mongodb: "MongoDB",
  python: "Python",
  java: "Java",
  sql: "SQL",
  mysql: "MySQL",
  docker: "Docker",
  aws: "AWS",
  html: "HTML",
  css: "CSS",
  git: "Git",
  github: "GitHub",
  typescript: "TypeScript"
};

function normalizeSkill(raw = "") {
  const value = String(raw || "").trim().toLowerCase();
  return SKILL_ALIASES[value] || value;
}

function toDisplaySkill(skill = "") {
  const normalized = normalizeSkill(skill);
  return DISPLAY_LABELS[normalized] || normalized;
}

function extractJobKeywords(jobDescription = "") {
  const rawSkills = extractSkills(jobDescription);
  const jdText = String(jobDescription || "").toLowerCase();
  const extraMatches = skillList.filter((skill) => {
    const canonical = normalizeSkill(skill);

    if (canonical === "node") {
      return /\bnode(?:\.js|js)?\b/i.test(jdText);
    }

    if (canonical === "aws") {
      return /\baws\b|\bamazon web services\b/i.test(jdText);
    }

    return jdText.includes(String(skill).toLowerCase());
  });

  return Array.from(
    new Set([...rawSkills, ...extraMatches].map((skill) => normalizeSkill(skill)))
  );
}

function normalizeResumeSkills(resumeSkills = []) {
  return Array.from(new Set((resumeSkills || []).map((skill) => normalizeSkill(skill))));
}

exports.matchJob = async (req, res) => {
  try {

    const { resumeId, jobDescription } = req.body;

    const resume = await Resume.findOne({
      _id: resumeId,
      userId: req.user._id
    });

    if (!resume) {
      return res.status(404).json({
        message: "Resume not found"
      });
    }

    const jobSkills = extractJobKeywords(jobDescription);
    const resumeSkills = normalizeResumeSkills(resume.skills || []);

    const matchedSkills = resumeSkills.filter((skill) => jobSkills.includes(skill));

    const missingSkills = jobSkills.filter((skill) => !resumeSkills.includes(skill));

    const matchScore = jobSkills.length
      ? Math.round((matchedSkills.length / jobSkills.length) * 100)
      : 0;

    const strengthMeter = calculateResumeStrength({
      resumeText: resume.extractedText || "",
      foundSkills: resume.skills || [],
      jobDescription,
      fallbackAtsScore: resume.atsScore || 0
    });

    resume.strengthMeter = strengthMeter;
    await resume.save();

    res.json({
      matchScore,
      matchedSkills: matchedSkills.map(toDisplaySkill),
      missingSkills: missingSkills.map(toDisplaySkill),
      strengthMeter
    });

  } catch (error) {

    res.status(500).json({
      error: error.message
    });

  }
};

exports.highlightKeywords = async (req, res) => {
  try {

    const { resumeId } = req.body;

    const resume = await Resume.findOne({
      _id: resumeId,
      userId: req.user._id
    });

    if (!resume) {
      return res.status(404).json({
        message: "Resume not found"
      });
    }

    let text = resume.extractedText;

    resume.missingSkills.forEach(skill => {
      const regex = new RegExp(skill, "gi");
      text = text.replace(regex, `**${skill.toUpperCase()}**`);
    });

    res.json({
      highlightedText: text.substring(0, 1000)
    });

  } catch (error) {

    res.status(500).json({
      error: error.message
    });

  }
};
