const axios = require("axios");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

async function generateSummary(resumeText) {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const prompt = `
You are an AI resume analyzer.

Read the resume and generate a professional summary.

Resume:
${resumeText}

Return:
- 1 professional headline
- 3 bullet points
`;

  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
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

module.exports = generateSummary;
