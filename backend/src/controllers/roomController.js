const Room = require("../models/Room");
const generateRoomId = require("../utils/generateRoomId");
const { sendSuccess, sendError } = require("../utils/response");
const { executeJS, executePython, executeCPP, executeC } = require("../utils/codeExecutor");
const logger = require("../utils/logger");
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

const getUserId = (p) => {
  if (!p) return "";
  if (typeof p === "string") return p;
  if (p._id) return p._id.toString();
  return p.toString();
};


const createRoom = async (req, res, next) => {
  try {
    const { battleFormat, creatorCompeting, isBlitz } = req.body;

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

    const room = new Room({
      roomId,
      creatorId: req.userId,
      status: "waiting_for_players",
      players: isCompeting ? [req.userId] : [],
      teamA: isCompeting ? [req.userId] : [],
      creatorCompeting: isCompeting,
    });
    if (battleFormat !== undefined) {
      room.battleFormat = battleFormat;
    }
    if (isBlitz !== undefined) {
      room.isBlitz = isBlitz === true;
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

    if (testCases.length < 1) {
      return sendError(res, 400, "At least 1 test case is required.");
    }

    const room = await Room.findOne({ roomId });
    if (!room) {
      return sendError(res, 404, "Room not found.");
    }

    const isPlayer = room.players.some((p) => getUserId(p) === req.userId.toString());
    if (!isPlayer) {
      return sendError(res, 403, "You are not a participant in this battle room.");
    }

    const results = [];

    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i];
      const input = tc.input;
      const expectedOutput = tc.expectedOutput.trim();

      if (language === "javascript") {
        const localResult = await executeJS(sourceCode, input);
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
              timeout: Number(process.env.JUDGE0_TIMEOUT_MS) || 15000,
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
          // Fallback: try local execution
          if (language === "python") {
            const localResult = await executePython(sourceCode, input);
            const actualOutput = (localResult.output || "").trim();
            const passed = localResult.success && actualOutput === expectedOutput;
            results.push({
              passed,
              output: actualOutput,
              expectedOutput,
              executionTime: localResult.executionTime,
              error: localResult.error,
            });
          } else if (language === "cpp") {
            const localResult = await executeCPP(sourceCode, input);
            const actualOutput = (localResult.output || "").trim();
            const passed = localResult.success && actualOutput === expectedOutput;
            results.push({
              passed,
              output: actualOutput,
              expectedOutput,
              executionTime: localResult.executionTime,
              error: localResult.error,
            });
          } else if (language === "c") {
            const localResult = await executeC(sourceCode, input);
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
            results.push({
              passed: false,
              output: "",
              expectedOutput,
              executionTime: 0,
              error: `Code compilation server temporarily unavailable for ${language}. Try using JavaScript, Python, C++, or C for local execution.`,
            });
          }
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

    if (typeof title !== "string" || title.trim().length > 100) {
      return sendError(res, 400, "Problem title must be a string not exceeding 100 characters.");
    }
    if (typeof statement !== "string" || statement.trim().length > 5000) {
      return sendError(res, 400, "Problem statement must be a string not exceeding 5000 characters.");
    }

    const room = await Room.findOne({ roomId });
    if (!room) {
      return sendError(res, 404, "Room not found.");
    }

    const isPlayer = room.players.some((p) => getUserId(p) === req.userId.toString());
    if (!isPlayer) {
      return sendError(res, 403, "You are not a participant in this battle room.");
    }

    if (room.status !== "waiting_for_players") {
      return sendError(res, 400, "Room is not in lobby phase.");
    }

    const escapeHTML = (str) => {
      if (typeof str !== "string") return str;
      return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#x27;")
        .replace(/\//g, "&#x2F;");
    };

    const sanitizedVisibleExamples = (visibleExamples || []).map(ex => ({
      input: escapeHTML(ex.input),
      output: escapeHTML(ex.output),
      explanation: escapeHTML(ex.explanation || ""),
    }));

    const sanitizedHiddenTestCases = (hiddenTestCases || []).map(tc => ({
      input: escapeHTML(tc.input),
      expectedOutput: escapeHTML(tc.expectedOutput),
    }));

    const newProblem = {
      title: escapeHTML(title.trim()),
      statement: escapeHTML(statement.trim()),
      visibleExamples: sanitizedVisibleExamples,
      hiddenTestCases: sanitizedHiddenTestCases,
      timeLimit,
      difficulty,
      allowedLanguages,
      validatedAt: new Date(),
    };

    const isTeamA = room.teamA.some((p) => getUserId(p) === req.userId.toString());

    if (isTeamA) {
      room.problemA = newProblem;
    } else {
      room.problemB = newProblem;
    }

    // Set default problem fallback
    if (!room.problem) {
      room.problem = newProblem;
    }

    await room.save();

    logger.info(`Problem submitted for Team ${isTeamA ? "A" : "B"} in Room: ${roomId}`);

    const io = req.app.get("io");
    if (io) {
      io.to(roomId).emit("room:problemSubmitted", {
        team: isTeamA ? "A" : "B",
        problemTitle: title,
        problemDifficulty: difficulty,
      });
    }

    return sendSuccess(
      res,
      200,
      {
        roomId: room.roomId,
        status: room.status,
        teamSubmitted: isTeamA ? "A" : "B",
        problem: {
          title,
          difficulty,
          timeLimit,
        },
      },
      "Problem submitted successfully"
    );
  } catch (error) {
    logger.error(`Error in submitProblem: ${error.message}`);
    next(error);
  }
};

const getRoom = async (req, res, next) => {
  try {
    const { roomId } = req.params;

    const room = await Room.findOne({ roomId })
      .populate("creatorId", "username eloRating college avatar")
      .populate("players", "username eloRating college avatar")
      .populate("teamA", "username eloRating college avatar")
      .populate("teamB", "username eloRating college avatar");

    if (!room) {
      return sendError(res, 404, "Room not found.");
    }

    if (room.status === "expired" || (room.status === "setting_up" && room.setupExpiresAt <= new Date())) {
      if (room.status !== "expired") {
        room.status = "expired";
        await room.save();
      }
      return sendError(res, 400, "Room has expired");
    }

    const isParticipant = room.players.some((p) => getUserId(p) === req.userId.toString());
    const isCreator = getUserId(room.creatorId) === req.userId.toString();
    if (!isParticipant && !isCreator && (room.status === "active" || room.status === "finished")) {
      return sendError(res, 403, "Access denied. You are not a participant in this match.");
    }

    const roomObj = room.toObject();

    if (req.userId) {
      const isTeamA = room.teamA.some((p) => getUserId(p) === req.userId.toString());
      if (room.status === "active" || room.status === "finished") {
        roomObj.problem = isTeamA ? roomObj.problemB : roomObj.problemA;
      } else {
        roomObj.problem = isTeamA ? roomObj.problemA : roomObj.problemB;
      }
    }

    return sendSuccess(res, 200, roomObj, "Room details retrieved successfully");
  } catch (error) {
    logger.error(`Error in getRoom: ${error.message}`);
    next(error);
  }
};

const rateProblem = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const { rating } = req.body;

    if (!rating || typeof rating !== "number" || rating < 1 || rating > 5) {
      return sendError(res, 400, "Invalid rating value. Must be a number between 1 and 5.");
    }

    const room = await Room.findOne({ roomId });
    if (!room) {
      return sendError(res, 404, "Room not found.");
    }

    if (room.status !== "finished") {
      return sendError(res, 400, "You can only rate a problem after the battle concludes.");
    }

    const alreadyRated = room.problemRatings.some(
      (r) => getUserId(r.userId) === req.userId.toString()
    );

    if (alreadyRated) {
      return sendError(res, 400, "You have already rated this problem.");
    }

    room.problemRatings.push({
      userId: req.userId,
      rating,
    });

    await room.save();

    logger.info(`User ${req.userId} rated problem in room ${roomId} as ${rating}`);

    return sendSuccess(res, 200, { problemRatingsCount: room.problemRatings.length }, "Problem rated successfully");
  } catch (error) {
    logger.error(`Error in rateProblem: ${error.message}`);
    next(error);
  }
};

module.exports = {
  createRoom,
  validateReferenceSolution,
  submitProblem,
  getRoom,
  rateProblem,
};
