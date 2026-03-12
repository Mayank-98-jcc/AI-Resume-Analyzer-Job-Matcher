const analyzeResumeSections = require("./analyzeSections");

const ACHIEVEMENT_REGEX = /\b(\d+%|\$\d+|\d+\+|increased|reduced|improved|optimized|saved|grew)\b/i;

function getSuggestionSignals({ resumeText = "", skills = [], missingSkills = [] }) {
  const normalizedText = String(resumeText || "").trim();
  const sections = analyzeResumeSections(normalizedText);
  const uniqueSkillsCount = new Set(skills).size;

  return {
    normalizedText,
    sections,
    uniqueSkillsCount,
    hasAchievements: ACHIEVEMENT_REGEX.test(normalizedText),
    hasMissingKeywords: Array.isArray(missingSkills) && missingSkills.length > 0
  };
}

function generateSuggestions({ resumeText = "", skills = [], missingSkills = [] }) {
  const suggestions = [];
  const signals = getSuggestionSignals({ resumeText, skills, missingSkills });

  if (signals.normalizedText && !signals.hasAchievements) {
    suggestions.push("Add measurable achievements in your experience section.");
  }

  if (!signals.sections.summary) {
    suggestions.push("Add a professional summary at the top.");
  }

  if (signals.uniqueSkillsCount < 5) {
    suggestions.push(`Include ${5 - signals.uniqueSkillsCount} more technical skills relevant to your role.`);
  }

  if (!signals.sections.projects) {
    suggestions.push("Add a projects section to demonstrate real-world impact.");
  }

  if (signals.hasMissingKeywords) {
    suggestions.push(`Target missing keywords for ATS: ${missingSkills.slice(0, 3).join(", ")}.`);
  }

  if (!suggestions.length) {
    suggestions.push("Resume looks strong. Add one role-specific, quantified achievement to stand out further.");
  }

  return suggestions;
}

function evaluateSuggestionProgress(previousSuggestions = [], context = {}) {
  const signals = getSuggestionSignals(context);

  const items = (previousSuggestions || [])
    .map((suggestion) => String(suggestion || "").trim())
    .filter(Boolean)
    .map((suggestion) => {
      let addressed = false;

      if (suggestion === "Add measurable achievements in your experience section.") {
        addressed = signals.hasAchievements;
      } else if (suggestion === "Add a professional summary at the top.") {
        addressed = Boolean(signals.sections.summary);
      } else if (/^Include \d+ more technical skills relevant to your role\.$/.test(suggestion)) {
        addressed = signals.uniqueSkillsCount >= 5;
      } else if (suggestion === "Add a projects section to demonstrate real-world impact.") {
        addressed = Boolean(signals.sections.projects);
      } else if (suggestion.startsWith("Target missing keywords for ATS:")) {
        addressed = !signals.hasMissingKeywords;
      } else if (suggestion === "Resume looks strong. Add one role-specific, quantified achievement to stand out further.") {
        addressed = signals.hasAchievements;
      }

      return {
        suggestion,
        status: addressed ? "addressed" : "pending"
      };
    });

  const addressedCount = items.filter((item) => item.status === "addressed").length;

  return {
    totalSuggestions: items.length,
    addressedCount,
    pendingCount: items.length - addressedCount,
    items
  };
}

module.exports = generateSuggestions;
module.exports.getSuggestionSignals = getSuggestionSignals;
module.exports.evaluateSuggestionProgress = evaluateSuggestionProgress;
