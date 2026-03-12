const analyzeResumeSections = require("./analyzeSections");
const extractSkills = require("./extractSkills");

const ACTION_VERBS = [
  "achieved",
  "built",
  "created",
  "delivered",
  "designed",
  "developed",
  "drove",
  "enhanced",
  "improved",
  "implemented",
  "increased",
  "launched",
  "led",
  "managed",
  "optimized",
  "reduced",
  "resolved",
  "streamlined"
];

function clamp(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getFormattingScore(resumeText = "") {
  const sections = analyzeResumeSections(resumeText);
  const headingCount = Object.values(sections).filter(Boolean).length;
  const headingCoverageScore = (headingCount / 6) * 100;

  const structureSignals = [
    /(?:^|\n)\s*[-*•]\s+\w+/m.test(resumeText),
    /\b(19|20)\d{2}\b/.test(resumeText),
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(resumeText)
  ];
  const structureScore = (structureSignals.filter(Boolean).length / structureSignals.length) * 100;

  return clamp((headingCoverageScore * 0.7) + (structureScore * 0.3));
}

function getContentScore(resumeText = "") {
  const sentences = String(resumeText)
    .split(/(?<=[.!?])\s+|\n+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 12);

  if (!sentences.length) {
    return 0;
  }

  const actionVerbRegex = new RegExp(`\\b(${ACTION_VERBS.join("|")})\\b`, "i");
  const achievementRegex = /\b(\d+%|\$\d+|\d+\+|increased|reduced|improved|optimized|saved)\b/i;

  let actionCount = 0;
  let achievementCount = 0;

  sentences.forEach((sentence) => {
    if (actionVerbRegex.test(sentence)) actionCount += 1;
    if (achievementRegex.test(sentence)) achievementCount += 1;
  });

  const actionScore = (actionCount / sentences.length) * 100;
  const achievementScore = (achievementCount / sentences.length) * 100;

  return clamp((actionScore * 0.6) + (achievementScore * 0.4));
}

function getSkillsScore(foundSkills = []) {
  const uniqueSkillsCount = new Set(foundSkills).size;
  return clamp((uniqueSkillsCount / 20) * 100);
}

function getAtsCompatibilityScore(foundSkills = [], jobDescription = "", fallbackAtsScore = 0) {
  if (!String(jobDescription).trim()) {
    return clamp(fallbackAtsScore);
  }

  const jobSkills = extractSkills(jobDescription);
  if (!jobSkills.length) {
    return clamp(fallbackAtsScore);
  }

  const matchedSkills = jobSkills.filter((skill) => foundSkills.includes(skill));
  return clamp((matchedSkills.length / jobSkills.length) * 100);
}

function calculateResumeStrength({
  resumeText = "",
  foundSkills = [],
  jobDescription = "",
  fallbackAtsScore = 0
}) {
  return {
    formatting: getFormattingScore(resumeText),
    content: getContentScore(resumeText),
    skills: getSkillsScore(foundSkills),
    atsCompatibility: getAtsCompatibilityScore(foundSkills, jobDescription, fallbackAtsScore)
  };
}

module.exports = calculateResumeStrength;
