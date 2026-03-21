const extractSkills = require("../utils/extractSkills");
const {
  compareResumeWithJobDescription
} = require("../utils/geminiService");

function clampScore(score) {
  const numeric = Number(score);

  if (!Number.isFinite(numeric)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(numeric)));
}

function normalizeSkills(skills = []) {
  return Array.from(
    new Set(
      (Array.isArray(skills) ? skills : [])
        .map((skill) => String(skill || "").trim())
        .filter(Boolean)
    )
  );
}

function parseGeminiJobMatchResponse(rawText = "") {
  const source = String(rawText || "").trim();

  if (!source) {
    return null;
  }

  const jsonMatch = source.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    return null;
  }

  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }
}

function buildFallbackJobMatch({ resumeText, jobDescription }) {
  const resumeSkills = normalizeSkills(extractSkills(String(resumeText || "").toLowerCase()));
  const jobSkills = normalizeSkills(extractSkills(String(jobDescription || "").toLowerCase()));
  const missingSkills = jobSkills.filter((skill) => !resumeSkills.includes(skill));
  const matchedSkills = jobSkills.filter((skill) => resumeSkills.includes(skill));
  const score = jobSkills.length
    ? Math.round((matchedSkills.length / jobSkills.length) * 100)
    : 0;

  const suggestions = missingSkills.length
    ? `Add evidence for ${missingSkills.slice(0, 3).join(", ")} in your skills, projects, or experience sections.`
    : "Your resume aligns well. Add one role-specific quantified achievement to strengthen the match further.";

  return {
    score,
    missingSkills,
    suggestions
  };
}

exports.matchJob = async (req, res) => {
  try {
    const { resumeText, jobDescription } = req.body;
    const isPremium = req.user?.plan === "premium";

    if (!String(resumeText || "").trim()) {
      return res.status(400).json({
        error: "resumeText is required"
      });
    }

    if (!String(jobDescription || "").trim()) {
      return res.status(400).json({
        error: "jobDescription is required"
      });
    }

    const fallbackResult = buildFallbackJobMatch({ resumeText, jobDescription });
    const aiResponse = await compareResumeWithJobDescription({
      resumeText: String(resumeText).trim(),
      jobDescription: String(jobDescription).trim()
    }, req.user, {
      priority: isPremium
    });
    const parsed = parseGeminiJobMatchResponse(aiResponse);

    return res.json({
      score: clampScore(parsed?.score ?? fallbackResult.score),
      missingSkills: normalizeSkills(parsed?.missingSkills ?? fallbackResult.missingSkills),
      suggestions: String(parsed?.suggestions || fallbackResult.suggestions).trim()
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Failed to analyze job match"
    });
  }
};
