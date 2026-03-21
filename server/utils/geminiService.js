const axios = require("axios");
const {
  enqueuePremiumTask,
  enqueueNormalTask
} = require("./aiQueue");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SUMMARY_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const REWRITE_MODEL = "gemini-1.5-flash";

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function generateGeminiText({ model, prompt }) {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ]
      },
      {
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": GEMINI_API_KEY
        },
        timeout: 15000
      }
    );

    return response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  } catch (error) {
    const apiMessage =
      error.response?.data?.error?.message ||
      error.response?.statusText ||
      error.message;

    throw new Error(`Gemini API error: ${apiMessage}`);
  }
}

async function fastAIResponse(input) {
  return generateGeminiText(input);
}

async function normalAIResponse(input) {
  await delay(2000);
  return generateGeminiText(input);
}

async function processAI(input, user = {}, options = {}) {
  const isPremium = user?.plan === "premium" || Boolean(options.priority);
  const runner = () => (isPremium ? fastAIResponse(input) : normalAIResponse(input));

  return isPremium ? enqueuePremiumTask(runner) : enqueueNormalTask(runner);
}

async function generateSummary(resumeText, user, options = {}) {
  const prompt = `
You are an AI resume analyzer.

Read the resume and generate a professional summary.

Resume:
${resumeText}

Return:
- 1 professional headline
- 3 bullet points
`;

  return processAI({
    model: SUMMARY_MODEL,
    prompt
  }, user, options);
}

async function rewriteResumeWithGemini(resumeText, user, options = {}) {
  const prompt = `You are a professional resume writer.

Rewrite the following resume content to improve clarity,
professional tone and ATS optimization.

Rules:

- Do NOT invent new skills or experience
- Keep the same meaning
- Use strong action verbs
- Make bullet points impactful
- Keep it concise

Return result in structured format.

FORMAT:

Professional Summary

Improved Bullet Points

Skills Section

Resume Content:

${resumeText}`;

  return processAI({
    model: REWRITE_MODEL,
    prompt
  }, user, options);
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
  rewriteResumeWithGemini,
  compareResumeWithJobDescription
};
