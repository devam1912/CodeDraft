import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { roomAPI } from "../services/api";
import CodeEditor from "../components/ui/CodeEditor";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import toast from "react-hot-toast";

const CODE_TEMPLATES = {
  javascript: `// Write your solution here\nfunction solve(input) {\n  \n}`,
  python: `# Write your solution here\ndef solve(stdin_str):\n    pass`,
  cpp: `#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your solution here\n    return 0;\n}`,
  java: `import java.io.*;\nimport java.util.*;\n\npublic class Main {\n    public static void main(String[] args) throws IOException {\n        // Write your solution here\n    }\n}`,
  go: `package main\n\nimport "fmt"\n\nfunc main() {\n    // Write your solution here\n}`,
  rust: `use std::io;\n\nfn main() {\n    // Write your solution here\n}`,
  c: `#include <stdio.h>\n\nint main() {\n    // Write your solution here\n    return 0;\n}`,
};

function BattleArena() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const socket = useSocket();

  const [room, setRoom] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState("javascript");
  const [sourceCode, setSourceCode] = useState(CODE_TEMPLATES.javascript);
  const [consoleTab, setConsoleTab] = useState("tests");
  const [isRunning, setIsRunning] = useState(false);
  const [runResults, setRunResults] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);

  const [playerProgress, setPlayerProgress] = useState({});
  const [coderTypingState, setCoderTypingState] = useState({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [battleFinishedState, setBattleFinishedState] = useState(null);

  const lastTypingEmit = useRef(0);
  const typingTimeoutRefs = useRef({});
  const isRemoteChange = useRef(false);
  const [teammateTyping, setTeammateTyping] = useState(false);
  const teammateTypingTimeoutRef = useRef(null);
  const [userRating, setUserRating] = useState(0);
  const [hasRated, setHasRated] = useState(false);

  useEffect(() => {
    const fetchRoom = async () => {
      try {
        const response = await roomAPI.getRoomDetails(roomId);
        setRoom(response.data);
        if (response.data.problem?.allowedLanguages?.length > 0) {
          const firstLang = response.data.problem.allowedLanguages[0];
          setSelectedLanguage(firstLang);
          setSourceCode(CODE_TEMPLATES[firstLang] || "");
        }
      } catch (err) {
        toast.error(err.message || "Failed to load battle arena");
        navigate("/dashboard");
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoom();
  }, [roomId, navigate]);

  useEffect(() => {
    if (!socket || !room) return;

    socket.emit("room:join", { roomId });

    socket.on("battle:progress", ({ userId, passedCount, totalCount }) => {
      setPlayerProgress((prev) => ({
        ...prev,
        [userId]: { passedCount, totalCount },
      }));
    });

    socket.on("battle:typing", ({ userId }) => {
      setCoderTypingState((prev) => ({
        ...prev,
        [userId]: true,
      }));

      if (typingTimeoutRefs.current[userId]) {
        clearTimeout(typingTimeoutRefs.current[userId]);
      }

      typingTimeoutRefs.current[userId] = setTimeout(() => {
        setCoderTypingState((prev) => ({
          ...prev,
          [userId]: false,
        }));
      }, 1500);
    });

    socket.on("battle:submitResult", ({ success, results }) => {
      toast.dismiss("submit-toast");
      setIsSubmitting(false);
      setConsoleTab("results");
      if (!success) {
        toast.error("Hidden test case checks failed! Keep optimizing.");
        setRunResults(results);
      }
    });

    socket.on("battle:finished", ({ winnerId, eloChanges }) => {
      toast.dismiss("submit-toast");
      setIsSubmitting(false);
      setBattleFinishedState({ winnerId, eloChanges });
    });

    socket.on("battle:codeSync", ({ sourceCode: remoteCode }) => {
      isRemoteChange.current = true;
      setSourceCode(remoteCode);
      setTeammateTyping(true);
      if (teammateTypingTimeoutRef.current) {
        clearTimeout(teammateTypingTimeoutRef.current);
      }
      teammateTypingTimeoutRef.current = setTimeout(() => {
        setTeammateTyping(false);
      }, 1500);
    });

    socket.on("error", ({ message }) => {
      toast.error(message);
      navigate("/dashboard");
    });

    return () => {
      socket.off("battle:progress");
      socket.off("battle:typing");
      socket.off("battle:submitResult");
      socket.off("battle:finished");
      socket.off("battle:codeSync");
      socket.off("error");

      Object.values(typingTimeoutRefs.current).forEach((t) => clearTimeout(t));
      if (teammateTypingTimeoutRef.current) clearTimeout(teammateTypingTimeoutRef.current);
    };
  }, [socket, room, roomId, navigate, user._id]);

  useEffect(() => {
    if (!room || !room.startedAt || battleFinishedState) return;

    const limitMinutes = room.problem?.timeLimit || 10;
    const durationMs = limitMinutes * 60 * 1000;
    const startMs = new Date(room.startedAt).getTime();
    const expiryMs = startMs + durationMs;

    const timer = setInterval(() => {
      const now = Date.now();
      const diff = expiryMs - now;

      if (diff <= 0) {
        clearInterval(timer);
        setTimeRemaining("00:00");
        toast.error("Time limit reached for this battle!");
      } else {
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        const minutesStr = String(minutes).padStart(2, "0");
        const secondsStr = String(seconds).padStart(2, "0");
        setTimeRemaining(`${minutesStr}:${secondsStr}`);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [room, battleFinishedState]);

  const handleLanguageChange = (lang) => {
    setSelectedLanguage(lang);
    setSourceCode(CODE_TEMPLATES[lang] || "");
  };

  const handleEditorChange = (val) => {
    setSourceCode(val);
    if (isRemoteChange.current) {
      isRemoteChange.current = false;
      return;
    }
    const now = Date.now();
    if (socket && now - lastTypingEmit.current > 1000) {
      lastTypingEmit.current = now;
      socket.emit("battle:keystroke", { roomId });
    }
    if (socket && room?.battleFormat === "2v2") {
      socket.emit("battle:codeUpdate", { roomId, sourceCode: val });
    }
  };

  const handleRunCode = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setConsoleTab("results");
    try {
      const testCases = room.problem.visibleExamples.map((ex) => ({
        input: ex.input,
        expectedOutput: ex.output,
      }));

      const res = await roomAPI.validateProblem(roomId, {
        sourceCode,
        language: selectedLanguage,
        testCases,
      });

      setRunResults(res.data);
      const passedCount = res.data.filter((r) => r.passed).length;

      setPlayerProgress((prev) => ({
        ...prev,
        [user._id]: { passedCount, totalCount: testCases.length },
      }));

      if (socket) {
        socket.emit("battle:progress", {
          roomId,
          passedCount,
          totalCount: testCases.length,
        });
      }

      const allPassed = res.data.every((r) => r.passed);
      if (allPassed) {
        toast.success("All visible examples passed successfully!");
      } else {
        toast.error("Some visible examples failed to pass.");
      }
    } catch (err) {
      toast.error(err.message || "Failed to execute solution");
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmitCode = () => {
    if (isSubmitting) return;
    if (!socket) {
      toast.error("Socket not connected. Please refresh the page.");
      return;
    }
    setIsSubmitting(true);
    setRunResults(null);
    setConsoleTab("results");
    toast.loading("Submitting against hidden test cases...", { id: "submit-toast", duration: 30000 });
    socket.emit("battle:submit", {
      roomId,
      sourceCode,
      language: selectedLanguage,
    });
  };

  const handleRateProblem = async (ratingVal) => {
    try {
      await roomAPI.rateProblem(roomId, { rating: ratingVal });
      setUserRating(ratingVal);
      setHasRated(true);
      toast.success("Problem rating submitted. Thank you!");
    } catch (err) {
      toast.error(err.message || "Failed to submit rating");
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-bg-primary text-text-secondary font-mono animate-pulse text-sm">
        Initializing Battle Arena environment...
      </div>
    );
  }

  if (!room) return null;

  const isCompetitor = room.players.some((p) => p && (p._id || p) === user._id);

  // Non-players cannot watch — redirect immediately
  if (!isCompetitor) {
    navigate("/dashboard");
    return null;
  }

  const opponentUser = room.players.find((p) => p && (p._id || p) !== user._id);
  const isWinner = battleFinishedState?.winnerId === user._id;
  const userEloChange = battleFinishedState?.eloChanges?.[user._id] || 0;

  return (
    <div className="min-h-screen flex flex-col bg-bg-primary font-sans text-text-primary overflow-hidden relative">
      {battleFinishedState && (
        <div className="absolute inset-0 bg-bg-primary/95 backdrop-blur-lg flex items-center justify-center z-50 animate-fade-in select-none p-6">
          <Card className="max-w-md w-full bg-bg-surface border border-border-default rounded-2xl p-8 flex flex-col items-center text-center shadow-2xl gap-6">
            <div className="flex flex-col items-center gap-3">
              <span className="text-[10px] font-bold tracking-widest text-text-muted uppercase font-mono">
                Match Concluded
              </span>
              <div className="text-7xl mt-1">
                {isWinner ? "🏆" : "💀"}
              </div>
              <h2 className={`text-3xl font-extrabold tracking-tight ${isWinner ? "text-success" : "text-error"}`}>
                {isWinner ? "Victory!" : "Defeated"}
              </h2>
              <p className="text-sm text-text-secondary">
                {isWinner
                  ? "Flawless execution. You passed all hidden test cases first!"
                  : "Opponent secured the victory. Keep refactoring and try again!"}
              </p>
            </div>

            <div className="w-full bg-bg-elevated/40 border border-border-default rounded-xl p-5 flex flex-col gap-4 font-mono text-sm">
              <div className="flex justify-between items-center">
                <span className="text-text-secondary uppercase text-[10px] tracking-wider">Current Rating:</span>
                <span className="font-bold text-text-primary">{user?.eloRating || 1000} ELO</span>
              </div>
              <div className="flex justify-between items-center border-t border-border-default pt-3">
                <span className="text-text-secondary uppercase text-[10px] tracking-wider">Rating Delta:</span>
                <span className={`font-bold flex items-center gap-1 ${userEloChange >= 0 ? "text-success" : "text-error"}`}>
                  {userEloChange >= 0 ? "+" : ""}
                  {userEloChange} ELO
                </span>
              </div>
            </div>

            {(
              <div className="w-full border-t border-border-default pt-4 flex flex-col items-center gap-3">
                <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Rate the Creator's Problem
                </span>
                {hasRated ? (
                  <div className="text-xs text-success font-medium">
                    Thank you! Your rating of {userRating} ⭐ has been registered.
                  </div>
                ) : (
                  <div className="flex gap-2.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => handleRateProblem(star)}
                        className="text-2xl hover:scale-125 transition-transform duration-150 cursor-pointer"
                        type="button"
                      >
                        ☆
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <Button className="w-full py-3.5 rounded-xl font-bold uppercase tracking-wider" onClick={() => navigate("/dashboard")}>
              Return to Dashboard
            </Button>
          </Card>
        </div>
      )}

      <header className="border-b border-border-default bg-bg-surface px-6 py-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <span className="text-xl font-extrabold tracking-tight text-primary">
            CodeDraft <span className="text-text-muted font-normal text-xs">Battle Arena</span>
          </span>
          <div className="h-4 w-px bg-border-default" />
          <div className="px-3 py-1 rounded bg-bg-elevated border border-border-default text-xs font-mono">
            Room ID: {roomId}
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-text-muted uppercase tracking-wider font-mono">
              Time Remaining
            </span>
            <span className="text-xl font-bold font-mono text-secondary animate-pulse">
              {timeRemaining || "--:--"}
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
            Quit Battle
          </Button>
        </div>
      </header>

      <main className="flex-1 flex grid grid-cols-1 md:grid-cols-2 overflow-hidden h-[calc(100vh-68px)]">
        <section className="flex flex-col border-r border-border-default overflow-y-auto p-6 gap-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">
                {room.problem?.title || "Problem Statement"}
              </h1>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                  room.problem?.difficulty === "easy"
                    ? "bg-success-muted text-success"
                    : room.problem?.difficulty === "medium"
                    ? "bg-warning-muted text-warning"
                    : "bg-error-muted text-error"
                }`}
              >
                {room.problem?.difficulty || "easy"}
              </span>
            </div>
            <p className="text-xs text-text-muted">
              Time Limit: {room.problem?.timeLimit || 10} minutes | Allowed Languages:{" "}
              {room.problem?.allowedLanguages?.join(", ") || "javascript"}
            </p>
          </div>

          {isCompetitor && opponentUser && (
            <Card className="flex flex-col gap-3 p-4 bg-bg-surface border border-border-default rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary-muted border border-primary flex items-center justify-center font-mono font-bold text-xs text-primary shadow-inner">
                    {opponentUser.avatar || opponentUser.username.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-text-primary">
                      {opponentUser.username}
                    </h4>
                    <span className="text-[10px] text-text-muted font-mono uppercase">
                      ELO: {opponentUser.eloRating || 1000} | {opponentUser.college || "Independent Coder"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${coderTypingState[opponentUser._id] ? "bg-success animate-ping" : "bg-text-muted"}`} />
                  <span className={`text-[10px] uppercase font-mono ${coderTypingState[opponentUser._id] ? "text-success font-bold" : "text-text-muted"}`}>
                    {coderTypingState[opponentUser._id] ? "Active Coding..." : "Idle"}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-1 mt-1">
                <div className="flex items-center justify-between text-[10px] font-mono text-text-secondary">
                  <span>Examples Passed:</span>
                  <span className="font-bold">
                    {playerProgress[opponentUser._id] ? `${playerProgress[opponentUser._id].passedCount} / ${playerProgress[opponentUser._id].totalCount}` : `0 / ${room.problem?.visibleExamples?.length || 0}`}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-bg-elevated rounded-full overflow-hidden border border-border-default">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-300"
                    style={{
                      width: `${
                        playerProgress[opponentUser._id]
                          ? (playerProgress[opponentUser._id].passedCount / playerProgress[opponentUser._id].totalCount) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            </Card>
          )}

          <Card className="flex flex-col gap-4 p-5 bg-bg-surface border border-border-default rounded-xl">
            <div className="text-sm text-text-primary whitespace-pre-wrap font-sans leading-relaxed">
              {room.problem?.statement}
            </div>
          </Card>

          <div className="flex flex-col gap-4">
            <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider border-b border-border-default pb-2">
              Visible Examples
            </h3>
            {room.problem?.visibleExamples?.map((ex, idx) => (
              <div
                key={idx}
                className="flex flex-col gap-3 p-4 bg-bg-surface border border-border-default rounded-xl font-mono text-xs"
              >
                <div className="flex flex-col gap-1">
                  <span className="text-text-muted uppercase text-[9px] tracking-wider">
                    Example {idx + 1} Input
                  </span>
                  <div className="p-2.5 bg-bg-elevated rounded border border-border-default text-text-primary">
                    {ex.input}
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-text-muted uppercase text-[9px] tracking-wider">
                    Expected Output
                  </span>
                  <div className="p-2.5 bg-bg-elevated rounded border border-border-default text-success">
                    {ex.output}
                  </div>
                </div>

                {ex.explanation && (
                  <div className="flex flex-col gap-1">
                    <span className="text-text-muted uppercase text-[9px] tracking-wider">
                      Explanation
                    </span>
                    <div className="p-2.5 text-text-secondary font-sans leading-relaxed text-xs">
                      {ex.explanation}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-col h-full overflow-hidden">
          {isCompetitor ? (
            <>
              <div className="flex items-center justify-between px-4 py-2 border-b border-border-default bg-bg-surface/50">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-text-muted font-semibold uppercase">Language:</span>
                  <select
                    value={selectedLanguage}
                    onChange={(e) => handleLanguageChange(e.target.value)}
                    className="px-2.5 py-1 text-xs rounded bg-bg-elevated border border-border-default font-mono focus:outline-none cursor-pointer"
                  >
                    {room.problem?.allowedLanguages?.map((lang) => (
                      <option key={lang} value={lang}>
                        {lang}
                      </option>
                    )) || <option value="javascript">javascript</option>}
                  </select>
                  {teammateTyping && (
                    <span className="text-xs text-success animate-pulse font-medium">
                      ⚡ Teammate is typing...
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSourceCode(CODE_TEMPLATES[selectedLanguage] || "")}
                  >
                    Reset Code
                  </Button>
                </div>
              </div>

              <div className="flex-1 relative overflow-hidden bg-bg-surface min-h-[350px]">
                <CodeEditor
                  value={sourceCode}
                  onChange={handleEditorChange}
                  language={selectedLanguage}
                  height="100%"
                />
              </div>

              <div className="h-64 border-t border-border-default flex flex-col bg-bg-surface">
                <div className="flex border-b border-border-default bg-bg-elevated/40 text-xs">
                  <button
                    type="button"
                    onClick={() => setConsoleTab("tests")}
                    className={`px-6 py-3 font-semibold uppercase tracking-wider border-r border-border-default ${
                      consoleTab === "tests"
                        ? "bg-bg-surface text-primary border-t-2 border-t-primary"
                        : "text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    Example Tests
                  </button>
                  <button
                    type="button"
                    onClick={() => setConsoleTab("results")}
                    className={`px-6 py-3 font-semibold uppercase tracking-wider border-r border-border-default ${
                      consoleTab === "results"
                        ? "bg-bg-surface text-primary border-t-2 border-t-primary"
                        : "text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    Execution Results
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 font-mono text-xs">
                  {consoleTab === "tests" && (
                    <div className="flex gap-3 flex-wrap">
                      <div className="text-text-secondary italic w-full mb-2">
                        Tests will run against all visible examples listed on the left panel.
                      </div>
                      <Button size="sm" onClick={handleRunCode} disabled={isRunning || isSubmitting}>
                        {isRunning ? "Executing Run..." : "Run Example Tests"}
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSubmitCode}
                        disabled={isRunning || isSubmitting}
                        style={{
                          background: isSubmitting ? undefined : "linear-gradient(135deg, #6366f1, #818cf8)",
                          color: "#fff",
                          fontWeight: 700,
                        }}
                      >
                        {isSubmitting ? (
                          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ width: 10, height: 10, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }} />
                            Submitting...
                          </span>
                        ) : "🚀 Submit Answer"}
                      </Button>
                    </div>
                  )}

                  {consoleTab === "results" && (
                    <div className="flex flex-col gap-4">
                      {isRunning && (
                        <div className="text-text-secondary animate-pulse">
                          Running validation scripts on backend compiler sandbox...
                        </div>
                      )}

                      {isSubmitting && (
                        <div className="text-primary animate-pulse font-bold">
                          Testing all hidden test cases. This matches expected outputs securely...
                        </div>
                      )}

                      {!isRunning && !isSubmitting && !runResults && (
                        <div className="text-text-muted italic">
                          No code execution records found. Click "Run Example Tests" to execute your solution.
                        </div>
                      )}

                      {!isRunning && !isSubmitting && runResults && (
                        <div className="flex flex-col gap-3">
                          {runResults.map((res, idx) => (
                            <div
                              key={idx}
                              className={`p-3 rounded-lg border flex flex-col gap-2 ${
                                res.passed
                                  ? "bg-success-muted/10 border-success/30 text-success"
                                  : "bg-error-muted/10 border-error/30 text-error"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold uppercase tracking-wider text-[10px]">
                                  Example Test Case #{idx + 1}
                                </span>
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                                    res.passed ? "bg-success text-bg-primary" : "bg-error text-bg-primary"
                                  }`}
                                >
                                  {res.passed ? "Passed" : "Failed"}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-4 text-[11px] mt-1">
                                <div>
                                  <span className="text-text-muted block text-[9px] uppercase">
                                    Expected output
                                  </span>
                                  <div className="font-semibold text-text-primary bg-bg-elevated p-1.5 rounded mt-0.5 overflow-x-auto">
                                    {res.expectedOutput || "N/A"}
                                  </div>
                                </div>
                                <div>
                                  <span className="text-text-muted block text-[9px] uppercase">
                                    Actual output
                                  </span>
                                  <div className="font-semibold bg-bg-elevated p-1.5 rounded mt-0.5 overflow-x-auto">
                                    {res.output || (res.error ? "COMPILE/RUN ERROR" : "EMPTY")}
                                  </div>
                                </div>
                              </div>

                              {res.error && (
                                <div className="text-[10px] text-error font-mono bg-error-muted/10 p-2 rounded mt-1 border border-error/20 whitespace-pre-wrap">
                                  {res.error}
                                </div>
                              )}

                              {res.executionTime !== undefined && (
                                <div className="text-[10px] text-text-secondary mt-1">
                                  Execution time: {res.executionTime}ms
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
          <></>
          )}
        </section>
      </main>
    </div>
  );
}

export default BattleArena;
