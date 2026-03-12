function hasSectionHeading(text, patterns) {
  return patterns.some((pattern) => {
    const regex = new RegExp(`(?:^|\\n)\\s*${pattern}\\s*(?:[:\\-|\\n]|$)`, "i");
    return regex.test(text);
  });
}

function analyzeResumeSections(resumeText = "") {
  const normalizedText = String(resumeText || "").toLowerCase();

  return {
    summary: hasSectionHeading(normalizedText, [
      "summary",
      "professional summary",
      "profile",
      "career objective",
      "objective"
    ]),
    skills: hasSectionHeading(normalizedText, [
      "skills",
      "technical skills",
      "core competencies",
      "competencies"
    ]),
    experience: hasSectionHeading(normalizedText, [
      "experience",
      "work experience",
      "professional experience",
      "employment history"
    ]),
    education: hasSectionHeading(normalizedText, [
      "education",
      "academic background",
      "academic qualifications"
    ]),
    projects: hasSectionHeading(normalizedText, [
      "projects",
      "personal projects",
      "academic projects"
    ]),
    certifications: hasSectionHeading(normalizedText, [
      "certifications",
      "certification",
      "licenses",
      "licenses & certifications"
    ])
  };
}

module.exports = analyzeResumeSections;
