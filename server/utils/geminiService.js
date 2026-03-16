const axios = require("axios");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SUMMARY_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const REWRITE_MODEL = "gemini-1.5-flash";

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

async function generateSummary(resumeText) {
  const prompt = `
You are an AI resume analyzer.

Read the resume and generate a professional summary.

Resume:
${resumeText}

Return:
- 1 professional headline
- 3 bullet points
`;

  return generateGeminiText({
    model: SUMMARY_MODEL,
    prompt
  });
}

async function rewriteResumeWithGemini(resumeText) {
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

  return generateGeminiText({
    model: REWRITE_MODEL,
    prompt
  });
}

module.exports = {
  generateSummary,
  rewriteResumeWithGemini
};
