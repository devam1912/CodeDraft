const axios = require("axios");
const { sendSuccess, sendError } = require("../utils/response");
const logger = require("../utils/logger");

const convertCode = async (req, res, next) => {
  try {
    const { fromLanguage, toLanguage, code } = req.body;

    if (!fromLanguage || !toLanguage || !code) {
      return sendError(res, 400, "fromLanguage, toLanguage, and code are required fields.");
    }

    const apiKey = process.env.GEMINI_API_KEY || "AIzaSyAdIwmHLqkMD0CNJ4KBOuEfBtgWVi0QQ8s";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const prompt = `Convert the following code from ${fromLanguage} to ${toLanguage}.
Return ONLY the executable code block for the target language. Do not include markdown code block backticks (like \`\`\`${toLanguage} or \`\`\`), explanation text, or extra descriptions. Only return the raw code.

Code to convert:
${code}`;

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
        temperature: 0.1,
      }
    };

    const response = await axios.post(url, payload, {
      headers: {
        "Content-Type": "application/json"
      }
    });

    const candidate = response.data?.candidates?.[0];
    const textResult = candidate?.content?.parts?.[0]?.text;

    if (!textResult) {
      return sendError(res, 500, "Empty or invalid response from Gemini API.");
    }

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

    const apiKey = process.env.GEMINI_API_KEY || "AIzaSyAdIwmHLqkMD0CNJ4KBOuEfBtgWVi0QQ8s";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const prompt = `Write a complete, optimal, and working reference solution in ${language} for the following programming challenge:
Title: ${title}
Statement: ${statement}

Your code should read from standard input (stdin) and print the output to standard output (stdout) as described in the problem.
Return ONLY the executable code block for the language. Do not include markdown code block backticks (like \`\`\`${language} or \`\`\`), explanation text, or extra descriptions. Only return the raw code. Do not wrap code in any wrapper classes unless it is required by the language syntax (like Java public class Main).`;

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
        temperature: 0.15,
      }
    };

    const response = await axios.post(url, payload, {
      headers: {
        "Content-Type": "application/json"
      }
    });

    const candidate = response.data?.candidates?.[0];
    const textResult = candidate?.content?.parts?.[0]?.text;

    if (!textResult) {
      return sendError(res, 500, "Empty or invalid response from Gemini API.");
    }

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
