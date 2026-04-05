const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const axios = require("axios");
const {
  enqueuePremiumTask,
  enqueueNormalTask
} = require("./aiQueue");

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const SUMMARY_MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
const REWRITE_MODEL = process.env.GROQ_REWRITE_MODEL || process.env.GROQ_MODEL || "llama-3.1-8b-instant";

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function buildFallbackResumeRewrite(resumeText = "") {
  const normalizedText = String(resumeText || "").replace(/\r/g, "").trim();
  const lines = normalizedText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const lowerLines = lines.map((line) => line.toLowerCase());
  const skillsLine = lines.find((line) => /skills?/i.test(line)) || "";
  const experienceLines = lines
    .filter((line) => /(^[-*•])|(\bdeveloped\b|\bmanaged\b|\bcreated\b|\bbuilt\b|\bled\b|\bdesigned\b|\bimplemented\b|\banalyzed\b|\bworked\b|\bintern\b|\bproject\b)/i.test(line))
    .map((line) => line.replace(/^[-*•]\s*/, "").trim())
    .filter((line) => line.length > 20)
    .slice(0, 5);

  const summarySeed = lines
    .filter((line) => line.length > 40 && !/^(education|skills|experience|projects|certifications?)$/i.test(line))
    .slice(0, 2)
    .join(" ");

  const improvedBullets = (experienceLines.length ? experienceLines : lines.slice(0, 5))
    .map((line) => line.replace(/^[\d.\-\s•*]+/, "").trim())
    .filter(Boolean)
    .map((line) => {
      const cleaned = line.charAt(0).toUpperCase() + line.slice(1);
      return cleaned.endsWith(".") ? cleaned : `${cleaned}.`;
    })
    .slice(0, 4);

  const skillTokens = skillsLine
    ? skillsLine
        .split(":")
        .slice(1)
        .join(":")
        .split(/[|,]/)
        .map((token) => token.trim())
        .filter(Boolean)
    : [];

  const professionalSummary = summarySeed
    ? `Professional Summary\n${summarySeed}`
    : "Professional Summary\nResults-driven candidate with relevant experience and a focus on clear, ATS-friendly resume presentation.";

  const improvementNotes = [];

  if (lowerLines.some((line) => line.includes("objective"))) {
    improvementNotes.push("Replace the Objective section with a short Professional Summary focused on your skills and target role.");
  }

  if (!experienceLines.length) {
    improvementNotes.push("Your resume does not show strong project or work-experience bullet points. Add 2 to 4 bullets describing what you built, used, or improved.");
  }

  if (!skillTokens.length) {
    improvementNotes.push("Add a dedicated Skills section so recruiters can quickly see your technical strengths.");
  }

  if (normalizedText.length < 250) {
    improvementNotes.push("Your resume content looks very short. Add projects, tools, coursework, internships, or achievements to make it stronger.");
  }

  if (!/\b(19|20)\d{2}\b/.test(normalizedText)) {
    improvementNotes.push("Add dates for education, projects, or internships so your timeline is clearer.");
  }

  if (!improvementNotes.length) {
    improvementNotes.push("Make each section more specific by adding tools used, measurable results, and clear action verbs.");
  }

  const improvementSection = improvementNotes
    .map((note) => `- ${note}`)
    .join("\n");

  const bulletFixes = [];

  if (improvedBullets.length) {
    bulletFixes.push(
      ...improvedBullets.map((bullet) => `- Rewrite a weak line like this in a stronger way: ${bullet}`)
    );
  } else {
    bulletFixes.push("- Your resume does not have strong project or experience bullets yet. Add 2 to 4 bullet points under projects, internship, or coursework.");
    bulletFixes.push("- Start each bullet with an action verb like Built, Developed, Designed, Implemented, or Created.");
    bulletFixes.push("- In each bullet, mention the tool, technology, or topic you worked with.");
    bulletFixes.push("- If possible, add an outcome such as what problem you solved, what feature you completed, or what result you improved.");
  }

  if (lowerLines.some((line) => line.includes("objective"))) {
    bulletFixes.push("- Do not use your Objective text as an experience point. Keep it in the summary section only.");
  }

  const bulletSection = bulletFixes.join("\n");

  const skillsSection = skillTokens.length
    ? skillTokens.join(", ")
    : "Add your strongest technical, analytical, and communication skills here.";

  return `${professionalSummary}\n\nWhat To Improve\n${improvementSection}\n\nSuggested Bullet Points\n${bulletSection}\n\nSkills To Highlight\n${skillsSection}`;
}

async function generateGroqText({ model, prompt }) {
  if (!GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not configured");
  }

  try {
    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model,
        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${GROQ_API_KEY}`
        },
        timeout: 15000
      }
    );

    return response.data?.choices?.[0]?.message?.content || "";
  } catch (error) {
    const apiMessage =
      error.response?.data?.error?.message ||
      error.response?.statusText ||
      error.message;

    throw new Error(`Groq API error: ${apiMessage}`);
  }
}

async function fastAIResponse(input) {
  return generateGroqText(input);
}

async function normalAIResponse(input) {
  await delay(2000);
  return generateGroqText(input);
}

async function processAI(input, user = {}, options = {}) {
  const isPremium = user?.plan === "premium" || Boolean(options.priority);
  const runner = () => (isPremium ? fastAIResponse(input) : normalAIResponse(input));

  return isPremium ? enqueuePremiumTask(runner) : enqueueNormalTask(runner);
}

async function generateSummary(resumeText, user, options = {}) {
  const prompt = `
You are an AI resume analyzer.

Read the resume and generate a clean, professional summary for the user.

Rules:
- Use only the information present in the resume
- Keep the format plain and clean
- Do not use markdown
- Do not use bold text, headings, asterisks, or labels like "Headline:"
- Return exactly 4 lines total
- Line 1 should be a short professional summary sentence
- Lines 2 to 4 should be short bullet-style points, but write them as plain sentences without bullet symbols

Resume:
${resumeText}

Return:
- 4 plain lines only
`;

  return processAI({
    model: SUMMARY_MODEL,
    prompt
  }, user, options);
}

async function rewriteResumeWithGroq(resumeText, user, options = {}) {
  if (!resumeText || String(resumeText).trim().length < 50) {
    throw new Error("Invalid resume content");
  }

  const prompt = `You are a professional resume writer.

Read the following resume carefully and improve it in a way that is easy for the user to understand.

You must base every suggestion only on the content that actually exists in the resume.

Rules:

- Do NOT invent new skills or experience
- Keep the same meaning
- Use strong action verbs
- Keep the language simple and clear
- If something is missing, explain that clearly
- Do not include vague filler points
- Do not use markdown
- Do not use bold text
- Do not use asterisks
- Do not return labels like "**Professional Summary:**"
- Write clean plain text only

Return result in structured format.

FORMAT:

Professional Summary

What To Improve

Suggested Bullet Points

Skills To Highlight

In "What To Improve", clearly explain mistakes or missing parts in simple language.
In "Suggested Bullet Points", do this:
- read the user's current resume lines
- find weak, unclear, incomplete, or missing bullet points
- write better bullet points that fix those exact mistakes
- keep them realistic and based only on the resume content
- if the resume has no real project or experience content, clearly tell the user what kind of bullet points they need to add

Do not give random bullet points.
Do not repeat the user's name, headings, or objective as bullet points.
Do not invent fake experience.
Only use these exact plain section headings:
Professional Summary
What To Improve
Suggested Bullet Points
Skills To Highlight

Resume Content:

${resumeText}`;

  try {
    const rewrittenText = await processAI({
      model: REWRITE_MODEL,
      prompt
    }, user, options);

    return rewrittenText;
  } catch (error) {
    console.error("Groq Error:", error.message);
    return buildFallbackResumeRewrite(resumeText);
  }
}

async function compareResumeWithJobDescription({ resumeText, jobDescription }, user, options = {}) {
  const prompt = `Compare this resume with job description and return JSON only with:
{
  "score": 0,
  "missingSkills": ["skill 1"],
  "suggestions": "short improvement suggestions"
}

Rules:
- Score must be an integer from 0 to 100
- missingSkills must contain only concrete missing skills or keywords
- suggestions must be concise and actionable
- Base the comparison on skills, keywords, and experience alignment
- Do not include markdown fences

Resume:
${resumeText}

Job Description:
${jobDescription}`;

  return processAI({
    model: SUMMARY_MODEL,
    prompt
  }, user, options);
}

module.exports = {
  processAI,
  fastAIResponse,
  normalAIResponse,
  generateSummary,
  rewriteResumeWithGroq,
  compareResumeWithJobDescription
};
