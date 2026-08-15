const axios = require("axios");

const LANGUAGE_IDS = {
  javascript: 63,
  python: 71,
  cpp: 54,
  java: 62,
  go: 60,
  rust: 73,
  c: 50,
};

const getJudge0LanguageId = (language) => LANGUAGE_IDS[language];

const executeWithJudge0 = async (sourceCode, language, input) => {
  const languageId = getJudge0LanguageId(language);
  if (!languageId) {
    const error = new Error("Unsupported programming language.");
    error.code = "UNSUPPORTED_LANGUAGE";
    throw error;
  }

  const response = await axios.post(
    `${process.env.JUDGE0_BASE_URL}/submissions?base64_encoded=false&wait=true`,
    {
      source_code: sourceCode,
      language_id: languageId,
      stdin: input,
    },
    {
      headers: {
        "x-rapidapi-key": process.env.JUDGE0_API_KEY,
        "x-rapidapi-host": "judge0-ce.p.rapidapi.com",
        "Content-Type": "application/json",
      },
      timeout: Number(process.env.JUDGE0_TIMEOUT_MS) || 15000,
    }
  );

  const { stdout, stderr, compile_output, status } = response.data;
  return {
    success: status.id === 3,
    output: (stdout || "").trim(),
    executionTime: response.data.time ? Math.round(response.data.time * 1000) : 0,
    error: stderr || compile_output || (status.id !== 3 ? status.description : null),
    status,
  };
};

module.exports = {
  LANGUAGE_IDS,
  getJudge0LanguageId,
  executeWithJudge0,
};
