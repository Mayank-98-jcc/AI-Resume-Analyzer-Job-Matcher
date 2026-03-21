const Resume = require("../models/Resume");

const SKILL_DICTIONARY = [
  "javascript",
  "typescript",
  "react",
  "next.js",
  "node",
  "node.js",
  "express",
  "mongodb",
  "mongoose",
  "sql",
  "postgres",
  "postgresql",
  "mysql",
  "redis",
  "docker",
  "kubernetes",
  "aws",
  "gcp",
  "azure",
  "rest",
  "graphql",
  "html",
  "css",
  "tailwind",
  "python",
  "django",
  "flask",
  "java",
  "spring",
  "c#",
  ".net",
  "php",
  "laravel",
  "git",
  "linux",
  "microservices",
  "ci/cd",
  "cicd"
];

function normalizeToken(value = "") {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/\u2019/g, "'")
    .replace(/[()]/g, " ")
    .replace(/\s+/g, " ");
}

function uniq(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function extractSkillsFromJobDescription(jobDescription = "") {
  const text = normalizeToken(jobDescription);
  if (!text) return [];

  const dictionary = SKILL_DICTIONARY.map((skill) => normalizeToken(skill));
  const detected = [];

  for (const skill of dictionary) {
    if (!skill) continue;

    const exact = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(^|[^a-z0-9+.#/])${exact}([^a-z0-9+.#/]|$)`, "i");
    if (regex.test(text)) detected.push(skill);
  }

  // Normalize common variants so we match resume skills better.
  const normalized = detected.map((skill) => {
    if (skill === "node.js") return "node";
    if (skill === "next.js") return "nextjs";
    if (skill === "postgresql") return "postgres";
    if (skill === "ci/cd") return "cicd";
    return skill.replace(/\s+/g, "_");
  });

  const primary = uniq(normalized);
  if (primary.length) return primary;

  const stopwords = new Set([
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "but",
    "by",
    "for",
    "from",
    "have",
    "in",
    "is",
    "it",
    "of",
    "on",
    "or",
    "our",
    "that",
    "the",
    "their",
    "to",
    "we",
    "with",
    "you",
    "your"
  ]);

  const tokens = text
    .split(/[^a-z0-9+.#/]+/i)
    .map((token) => token.trim())
    .filter(Boolean)
    .filter((token) => token.length >= 2 && token.length <= 24)
    .filter((token) => !stopwords.has(token));

  return uniq(tokens).slice(0, 12);
}

function intersect(a = [], b = []) {
  const setB = new Set(b);
  return a.filter((value) => setB.has(value));
}

exports.matchCandidatesWithJob = async (req, res) => {
  try {
    const jobDescription = req.body?.jobDescription;

    if (!jobDescription || !String(jobDescription).trim()) {
      return res.status(400).json({ message: "jobDescription is required" });
    }

    const requiredSkills = extractSkillsFromJobDescription(jobDescription);

    const resumes = await Resume.find({})
      .populate("userId", "name email plan")
      .sort({ uploadedAt: -1 });

    const candidates = resumes
      .map((resume) => {
        const resumeSkills = uniq((resume.skills || []).map((skill) => normalizeToken(skill).replace(/\s+/g, "_")));
        const matchedSkills = requiredSkills.length ? intersect(requiredSkills, resumeSkills) : [];
        const matchScore = requiredSkills.length
          ? Math.round((matchedSkills.length / requiredSkills.length) * 100)
          : 0;

        return {
          _id: resume._id,
          resumeId: resume._id,
          name: resume.userId?.name || "Unknown",
          email: resume.userId?.email || "",
          plan: resume.userId?.plan || "free",
          resumeFile: resume.fileName || "Untitled Resume",
          atsScore: resume.atsScore ?? 0,
          matchScore,
          matchedSkills
        };
      })
      .sort((a, b) => {
        if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
        return (b.atsScore ?? 0) - (a.atsScore ?? 0);
      });

    return res.json({
      requiredSkills,
      candidates
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to match candidates",
      error: error.message
    });
  }
};
