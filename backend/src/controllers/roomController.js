const Room = require("../models/Room");
const generateRoomId = require("../utils/generateRoomId");
const { sendSuccess, sendError } = require("../utils/response");
const { executeJS } = require("../utils/codeExecutor");
const logger = require("../utils/logger");
const axios = require("axios");

const LANGUAGE_IDS = {
  javascript: 63,
  python: 71,
  cpp: 54,
};

const createRoom = async (req, res, next) => {
  try {
    const { battleFormat, creatorCompeting } = req.body;

    if (!battleFormat || !["1v1", "2v2"].includes(battleFormat)) {
      return sendError(res, 400, "Invalid battle format. Must be 1v1 or 2v2.");
    }

    const isCompeting = creatorCompeting === true;
    let roomId = "";
    let roomExists = true;

    while (roomExists) {
      roomId = generateRoomId();
      const existingRoom = await Room.findOne({ roomId }).lean();
      if (!existingRoom) {
        roomExists = false;
      }
    }

    const setupExpiresAt = new Date(Date.now() + 30 * 60 * 1000);

    const room = new Room({
      roomId,
      creatorId: req.userId,
      status: "setting_up",
      setupExpiresAt,
    });

    if (creatorCompeting !== undefined) {
      room.creatorCompeting = isCompeting;
    }
    if (battleFormat !== undefined) {
      room.battleFormat = battleFormat;
    }

    await room.save();

    logger.info(`Room created successfully: ${roomId} by user ${req.userId}`);

    return sendSuccess(
      res,
      201,
      {
        roomId: room.roomId,
        creatorId: room.creatorId,
        status: room.status,
        setupExpiresAt: room.setupExpiresAt,
      },
      "Room created successfully"
    );
  } catch (error) {
    logger.error(`Error in createRoom: ${error.message}`);
    next(error);
  }
};

const validateReferenceSolution = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const { sourceCode, language, testCases } = req.body;

    if (!sourceCode || !language || !testCases || !Array.isArray(testCases)) {
      return sendError(res, 400, "Missing required validation parameters.");
    }

    if (testCases.length < 4) {
      return sendError(res, 400, "A minimum of 4 test cases is required.");
    }

    const room = await Room.findOne({ roomId, creatorId: req.userId });
    if (!room) {
      return sendError(res, 404, "Room not found or you are not the creator.");
    }

    const results = [];

    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i];
      const input = tc.input;
      const expectedOutput = tc.expectedOutput.trim();

      if (language === "javascript") {
        const localResult = executeJS(sourceCode, input);
        const actualOutput = (localResult.output || "").trim();
        const passed = localResult.success && actualOutput === expectedOutput;
        results.push({
          passed,
          output: actualOutput,
          expectedOutput,
          executionTime: localResult.executionTime,
          error: localResult.error,
        });
      } else {
        const langId = LANGUAGE_IDS[language];
        if (!langId) {
          return sendError(res, 400, "Unsupported programming language.");
        }

        try {
          const response = await axios.post(
            `${process.env.JUDGE0_BASE_URL}/submissions?base64_encoded=false&wait=true`,
            {
              source_code: sourceCode,
              language_id: langId,
              stdin: input,
            },
            {
              headers: {
                "x-rapidapi-key": process.env.JUDGE0_API_KEY,
                "x-rapidapi-host": "judge0-ce.p.rapidapi.com",
                "Content-Type": "application/json",
              },
              timeout: Number(process.env.JUDGE0_TIMEOUT_MS) || 5000,
            }
          );

          const { stdout, stderr, compile_output, status } = response.data;
          const actualOutput = (stdout || "").trim();
          const passed = status.id === 3 && actualOutput === expectedOutput;
          const errorMsg =
            stderr || compile_output || (status.id !== 3 ? status.description : null);

          results.push({
            passed,
            output: actualOutput,
            expectedOutput,
            executionTime: response.data.time ? Math.round(response.data.time * 1000) : 0,
            error: errorMsg,
          });
        } catch (apiError) {
          logger.error(`Judge0 API error: ${apiError.message}`);
          results.push({
            passed: false,
            output: "",
            expectedOutput,
            executionTime: 0,
            error: "Code compilation server temporarily unavailable. Fall back to JavaScript for local execution.",
          });
        }
      }
    }

    return sendSuccess(res, 200, results, "Reference solution validation completed");
  } catch (error) {
    logger.error(`Error in validateReferenceSolution: ${error.message}`);
    next(error);
  }
};

const submitProblem = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const { title, statement, visibleExamples, hiddenTestCases, timeLimit, difficulty, allowedLanguages, referenceSolution } = req.body;

    if (!title || !statement || !visibleExamples || !hiddenTestCases || !timeLimit || !difficulty || !allowedLanguages || !referenceSolution) {
      return sendError(res, 400, "Missing required parameters for problem submission.");
    }

    const room = await Room.findOne({ roomId, creatorId: req.userId });
    if (!room) {
      return sendError(res, 404, "Room not found or you are not the creator.");
    }

    if (room.status !== "setting_up") {
      return sendError(res, 400, "Room is not in setting up phase.");
    }

    room.problem = {
      title,
      statement,
      visibleExamples,
      hiddenTestCases,
      timeLimit,
      difficulty,
      allowedLanguages,
      validatedAt: new Date(),
    };
    room.status = "waiting_for_players";
    room.players = [req.userId];
    
    if (room.battleFormat === "2v2") {
      room.teamA = [req.userId];
    }

    await room.save();

    logger.info(`Problem submitted and lobby activated for Room: ${roomId}`);

    return sendSuccess(
      res,
      200,
      {
        roomId: room.roomId,
        status: room.status,
        problem: {
          title: room.problem.title,
          difficulty: room.problem.difficulty,
          timeLimit: room.problem.timeLimit,
        },
      },
      "Problem submitted and room activated"
    );
  } catch (error) {
    logger.error(`Error in submitProblem: ${error.message}`);
    next(error);
  }
};

module.exports = {
  createRoom,
  validateReferenceSolution,
  submitProblem,
};
