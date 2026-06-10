const axios = require("axios");
const { sendSuccess, sendError } = require("../utils/response");
const logger = require("../utils/logger");

const callGeminiWithFallback = async (prompt, temperature = 0.15) => {
  const apiKey = process.env.GEMINI_API_KEY;
  
  // List of models to try in sequence
  const models = [
    "gemini-flash-latest",
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash-lite",
    "gemini-2.5-flash"
  ];

  let lastError = null;

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const payload = {
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature,
        }
      };

      const response = await axios.post(url, payload, {
        headers: {
          "Content-Type": "application/json"
        },
        timeout: 10000 // 10 second timeout per model
      });

      const candidate = response.data?.candidates?.[0];
      const textResult = candidate?.content?.parts?.[0]?.text;
      
      if (textResult) {
        logger.info(`Successfully generated content using model: ${model}`);
        return textResult;
      }
    } catch (err) {
      const errMsg = err.response?.data?.error?.message || err.message;
      logger.error(`Gemini model ${model} failed: ${errMsg}`);
      lastError = err;
    }
  }

  throw lastError || new Error("All fallback Gemini models failed.");
};

const convertCode = async (req, res, next) => {
  try {
    const { fromLanguage, toLanguage, code } = req.body;

    if (!fromLanguage || !toLanguage || !code) {
      return sendError(res, 400, "fromLanguage, toLanguage, and code are required fields.");
    }

    const prompt = `Convert the following code from ${fromLanguage} to ${toLanguage}.
Return ONLY the executable code block for the target language. Do not include markdown code block backticks (like \`\`\`${toLanguage} or \`\`\`), explanation text, or extra descriptions. Only return the raw code.

CRITICAL: If the target language is JavaScript, you MUST read standard input (stdin) using:
const fs = require('fs');
const input = fs.readFileSync(0, 'utf-8');
Do NOT use the 'readline' module or any other external/unsupported library, as they are disabled in the execution sandbox.

Code to convert:
${code}`;

    const textResult = await callGeminiWithFallback(prompt, 0.1);

    // Clean up any potential markdown code blocks if the model ignored instructions
    let cleanCode = textResult.trim();
    if (cleanCode.startsWith("```")) {
      const lines = cleanCode.split("\n");
      if (lines[0].startsWith("```")) {
        lines.shift();
      }
      if (lines[lines.length - 1].trim() === "```") {
        lines.pop();
      }
      cleanCode = lines.join("\n").trim();
    }

    return sendSuccess(res, 200, { convertedCode: cleanCode }, "Code converted successfully.");
  } catch (error) {
    logger.error(`Error in convertCode: ${error.message}`);
    const apiErrorMsg = error.response?.data?.error?.message || error.message;
    return sendError(res, 500, `AI translation failed: ${apiErrorMsg}`);
  }
};

const generateSolution = async (req, res, next) => {
  try {
    const { title, statement, language } = req.body;

    if (!title || !statement || !language) {
      return sendError(res, 400, "title, statement, and language are required fields.");
    }

    const prompt = `Write a complete, optimal, and working reference solution in ${language} for the following programming challenge:
Title: ${title}
Statement: ${statement}

Your code should read from standard input (stdin) and print the output to standard output (stdout) as described in the problem.
Return ONLY the executable code block for the language. Do not include markdown code block backticks (like \`\`\`${language} or \`\`\`), explanation text, or extra descriptions. Only return the raw code. Do not wrap code in any wrapper classes unless it is required by the language syntax (like Java public class Main).

CRITICAL: If the language is JavaScript, you MUST read standard input (stdin) using:
const fs = require('fs');
const input = fs.readFileSync(0, 'utf-8');
Do NOT use the 'readline' module or any other external/unsupported library, as they are disabled in the execution sandbox.`;

    const textResult = await callGeminiWithFallback(prompt, 0.15);

    // Clean up any potential markdown code blocks
    let cleanCode = textResult.trim();
    if (cleanCode.startsWith("```")) {
      const lines = cleanCode.split("\n");
      if (lines[0].startsWith("```")) {
        lines.shift();
      }
      if (lines[lines.length - 1].trim() === "```") {
        lines.pop();
      }
      cleanCode = lines.join("\n").trim();
    }

    return sendSuccess(res, 200, { solution: cleanCode }, "Reference solution generated successfully.");
  } catch (error) {
    logger.error(`Error in generateSolution: ${error.message}`);
    const apiErrorMsg = error.response?.data?.error?.message || error.message;
    return sendError(res, 500, `AI generation failed: ${apiErrorMsg}`);
  }
};

module.exports = {
  convertCode,
  generateSolution
};
