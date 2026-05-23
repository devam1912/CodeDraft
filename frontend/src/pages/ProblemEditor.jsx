import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ExampleRow from "../components/problem-editor/ExampleRow";
import TestCaseRow from "../components/problem-editor/TestCaseRow";
import CodeEditor from "../components/ui/CodeEditor";
import { roomAPI } from "../services/api";
import toast from "react-hot-toast";

const STARTER_CODES = {
  javascript: `const fs = require('fs');
const input = fs.readFileSync(0, 'utf-8').trim();

// Solve the challenge here and print the result!
console.log(input);`,

  python: `import sys
input_data = sys.stdin.read().strip()

# Solve the challenge here and print the result!
print(input_data)`,

  cpp: `#include <iostream>
#include <string>
using namespace std;

int main() {
    string input_data;
    if (getline(cin, input_data)) {
        // Solve the challenge here and print the result!
        cout << input_data << endl;
    }
    return 0;
}`,
};

function ProblemEditor() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [statement, setStatement] = useState("");
  const [difficulty, setDifficulty] = useState("easy");
  const [timeLimit, setTimeLimit] = useState(10);
  const [allowedLanguages, setAllowedLanguages] = useState(["javascript"]);
  const [activeLanguage, setActiveLanguage] = useState("javascript");
  const [referenceSolution, setReferenceSolution] = useState(STARTER_CODES.javascript);

  const [visibleExamples, setVisibleExamples] = useState([
    { input: "", output: "", explanation: "" },
  ]);
  const [hiddenTestCases, setHiddenTestCases] = useState([
    { input: "", expectedOutput: "" },
    { input: "", expectedOutput: "" },
    { input: "", expectedOutput: "" },
    { input: "", expectedOutput: "" },
  ]);

  const [isValidating, setIsValidating] = useState(false);
  const [validationResults, setValidationResults] = useState([]);
  const [isValidated, setIsValidated] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setReferenceSolution(STARTER_CODES[activeLanguage] || "");
  }, [activeLanguage]);

  const handleExampleChange = (index, updatedExample) => {
    const updated = [...visibleExamples];
    updated[index] = updatedExample;
    setVisibleExamples(updated);
  };

  const handleAddExample = () => {
    setVisibleExamples([
      ...visibleExamples,
      { input: "", output: "", explanation: "" },
    ]);
  };

  const handleRemoveExample = (index) => {
    if (visibleExamples.length > 1) {
      const updated = visibleExamples.filter((_, i) => i !== index);
      setVisibleExamples(updated);
    }
  };

  const handleTestCaseChange = (index, updatedTestCase) => {
    const updated = [...hiddenTestCases];
    updated[index] = updatedTestCase;
    setHiddenTestCases(updated);
    setIsValidated(false);
    setValidationResults([]);
  };

  const handleAddTestCase = () => {
    setHiddenTestCases([
      ...hiddenTestCases,
      { input: "", expectedOutput: "" },
    ]);
    setIsValidated(false);
    setValidationResults([]);
  };

  const handleRemoveTestCase = (index) => {
    if (hiddenTestCases.length > 4) {
      const updated = hiddenTestCases.filter((_, i) => i !== index);
      setHiddenTestCases(updated);
      setIsValidated(false);
      setValidationResults([]);
    } else {
      toast.error("A minimum of 4 hidden test cases is required");
    }
  };

  const handleLanguageToggle = (lang) => {
    if (allowedLanguages.includes(lang)) {
      if (allowedLanguages.length > 1) {
        setAllowedLanguages(allowedLanguages.filter((l) => l !== lang));
        if (activeLanguage === lang) {
          const nextLang = allowedLanguages.find((l) => l !== lang);
          setActiveLanguage(nextLang);
        }
      } else {
        toast.error("At least one language must be allowed");
      }
    } else {
      setAllowedLanguages([...allowedLanguages, lang]);
    }
  };

  const validateForm = () => {
    const errors = [];
    if (!title.trim()) errors.push("Problem Title is required.");
    if (!statement.trim()) errors.push("Problem Statement details are required.");
    
    const hasValidVisibleExample = visibleExamples.some(ex => ex.input.trim() && ex.output.trim());
    if (!hasValidVisibleExample) {
      errors.push("At least 1 visible Example with complete input/output is required.");
    }

    if (hiddenTestCases.length < 4) {
      errors.push(`A minimum of 4 test cases is required (currently have ${hiddenTestCases.length}).`);
    }

    const incompleteTestCases = hiddenTestCases.some(
      (tc) => !tc.input.trim() || !tc.expectedOutput.trim()
    );
    if (incompleteTestCases) {
      errors.push("All defined test cases must have complete input and expected output.");
    }

    return errors;
  };

  const validationErrors = validateForm();
  const isFormValid = validationErrors.length === 0;

  const handleValidateReferenceSolution = async () => {
    if (!isFormValid) return;
    setIsValidating(true);
    setValidationResults([]);
    setIsValidated(false);

    try {
      const results = await roomAPI.validateProblem(roomId, {
        sourceCode: referenceSolution,
        language: activeLanguage,
        testCases: hiddenTestCases,
      });

      setValidationResults(results.data);
      setIsValidated(true);

      const allPassed = results.data.every((r) => r.passed);
      if (allPassed) {
        toast.success("Validation successful! All test cases passed!");
      } else {
        toast.error("Validation failed. Some test cases returned errors or mismatched output.");
      }
    } catch (err) {
      toast.error(err.message || "Failed to validate code execution");
    } finally {
      setIsValidating(false);
    }
  };

  const handleSubmitProblem = async () => {
    const allPassed = validationResults.length > 0 && validationResults.every((r) => r.passed);
    if (!isFormValid || !isValidated || !allPassed) return;

    setIsSubmitting(true);
    try {
      await roomAPI.submitProblem(roomId, {
        title,
        statement,
        visibleExamples: visibleExamples.filter(ex => ex.input.trim() && ex.output.trim()),
        hiddenTestCases,
        timeLimit,
        difficulty,
        allowedLanguages,
        referenceSolution,
      });

      toast.success("Room created and challenge activated! Redirecting to Dashboard.");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.message || "Failed to submit challenge and create room");
    } finally {
      setIsSubmitting(false);
    }
  };

  const allPassed = validationResults.length > 0 && validationResults.every((r) => r.passed);

  return (
    <div className="min-height-100vh flex flex-col bg-bg-primary font-sans text-text-primary">
      <header className="border-b border-border-default bg-bg-surface px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors duration-150 text-sm font-medium"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Dashboard
          </button>
          <div className="h-4 w-px bg-border-default" />
          <span className="text-sm font-semibold text-secondary tracking-wide uppercase">
            Room: {roomId}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-full bg-primary-muted border border-primary text-xs font-semibold text-primary font-mono animate-pulse-glow">
            Lobby Setup Mode
          </div>
        </div>
      </header>

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-2 overflow-hidden h-[calc(100vh-69px)]">
        <section className="p-6 overflow-y-auto border-r border-border-default flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-bold tracking-tight text-text-primary">
              Create Coding Challenge
            </h1>
            <p className="text-xs text-text-secondary">
              Step 1: Write the challenge statement, visible examples, and hidden test cases.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Challenge Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Two Sum"
                className="w-full bg-bg-surface border border-border-default rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-200"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Difficulty
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full bg-bg-surface border border-border-default rounded-xl px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-200"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Time Limit (minutes)
                </label>
                <select
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(Number(e.target.value))}
                  className="w-full bg-bg-surface border border-border-default rounded-xl px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-200"
                >
                  <option value={5}>5 mins (Blitz)</option>
                  <option value={10}>10 mins</option>
                  <option value={15}>15 mins</option>
                  <option value={20}>20 mins</option>
                  <option value={30}>30 mins</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                Allowed Programming Languages
              </label>
              <div className="flex gap-3">
                {["javascript", "python", "cpp"].map((lang) => {
                  const isActive = allowedLanguages.includes(lang);
                  return (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => handleLanguageToggle(lang)}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider border transition-all duration-150 ${
                        isActive
                          ? "bg-primary border-primary text-text-primary"
                          : "bg-bg-surface border-border-default text-text-secondary hover:border-border-hover hover:text-text-primary"
                      }`}
                    >
                      {lang === "cpp" ? "C++" : lang}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Problem Statement (Markdown Supported)
              </label>
              <textarea
                value={statement}
                onChange={(e) => setStatement(e.target.value)}
                placeholder="Write the details of the problem here. Explain the constraints, input formats, and requirements..."
                rows="8"
                className="w-full bg-bg-surface border border-border-default rounded-xl px-4 py-3 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-200 font-mono"
              />
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <label className="block text-sm font-medium text-text-secondary">
                  Visible Example Cases
                </label>
                <button
                  type="button"
                  onClick={handleAddExample}
                  className="flex items-center gap-1.5 text-xs text-primary font-semibold hover:text-primary-hover transition-colors duration-150"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Add Example
                </button>
              </div>

              <div className="flex flex-col gap-4">
                {visibleExamples.map((example, idx) => (
                  <ExampleRow
                    key={idx}
                    index={idx}
                    example={example}
                    onChange={handleExampleChange}
                    onRemove={handleRemoveExample}
                    canRemove={visibleExamples.length > 1}
                  />
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3 mt-4">
              <div className="flex justify-between items-center">
                <div>
                  <label className="block text-sm font-medium text-text-secondary">
                    Hidden Test Cases
                  </label>
                  <span className="text-[10px] text-text-muted block mt-0.5">
                    Opponents run code against these. Minimum 4 required.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleAddTestCase}
                  className="flex items-center gap-1.5 text-xs text-primary font-semibold hover:text-primary-hover transition-colors duration-150"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Add Case
                </button>
              </div>

              <div className="flex flex-col gap-4">
                {hiddenTestCases.map((testCase, idx) => (
                  <TestCaseRow
                    key={idx}
                    index={idx}
                    testCase={testCase}
                    onChange={handleTestCaseChange}
                    onRemove={handleRemoveTestCase}
                    canRemove={hiddenTestCases.length > 4}
                  />
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3 mt-6 border-t border-border-default pt-6">
              <div className="flex justify-between items-center mb-1">
                <div>
                  <h3 className="text-sm font-bold text-text-primary">
                    Reference Solution Validator
                  </h3>
                  <span className="text-[10px] text-text-muted block mt-0.5">
                    Write code that passes 100% of your own test cases above.
                  </span>
                </div>
                <div className="flex gap-2">
                  {allowedLanguages.map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => setActiveLanguage(lang)}
                      className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-colors duration-150 ${
                        activeLanguage === lang
                          ? "bg-secondary text-bg-primary"
                          : "bg-bg-surface border border-border-default text-text-secondary hover:border-border-hover"
                      }`}
                    >
                      {lang === "cpp" ? "C++" : lang}
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-[300px] w-full">
                <CodeEditor
                  value={referenceSolution}
                  onChange={setReferenceSolution}
                  language={activeLanguage}
                  height="300px"
                />
              </div>

              <button
                type="button"
                onClick={handleValidateReferenceSolution}
                disabled={!isFormValid || isValidating}
                className={`py-3 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all duration-200 mt-2 ${
                  isFormValid && !isValidating
                    ? "bg-bg-surface border border-primary text-primary hover:bg-primary hover:text-text-primary active:scale-[0.99] cursor-pointer"
                    : "bg-bg-surface border border-border-default text-text-muted cursor-not-allowed"
                }`}
              >
                {isValidating ? "Validating Execution Sandbox..." : "Validate Reference Solution"}
              </button>

              {isValidated && validationResults.length > 0 && (
                <div className="p-4 bg-bg-surface border border-border-default rounded-xl flex flex-col gap-3 mt-2 animate-fade-in">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                      Validator Execution Report
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        allPassed
                          ? "bg-success-muted text-success"
                          : "bg-error-muted text-error"
                      }`}
                    >
                      {allPassed ? "100% Passed" : "Failed Cases"}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2">
                    {validationResults.map((res, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-bg-primary border border-border-default rounded-lg flex flex-col gap-1.5 font-mono text-xs"
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-text-secondary font-sans font-semibold">
                            Test Case #{idx + 1}
                          </span>
                          <span
                            className={`font-semibold ${
                              res.passed ? "text-success" : "text-error"
                            }`}
                          >
                            {res.passed ? "🟢 PASS" : "🔴 FAIL"}
                          </span>
                        </div>
                        {res.error ? (
                          <div className="text-error bg-error-muted/20 p-2 rounded border border-error/20 overflow-x-auto whitespace-pre-wrap">
                            {res.error}
                          </div>
                        ) : (
                          <>
                            <div className="grid grid-cols-2 gap-4 mt-1 border-t border-border-default pt-2 text-[10px] text-text-secondary">
                              <div>
                                <span className="text-text-muted">Expected:</span>{" "}
                                <span className="block mt-0.5 bg-bg-surface px-2 py-1 rounded truncate">
                                  {res.expectedOutput || <span className="italic">none</span>}
                                </span>
                              </div>
                              <div>
                                <span className="text-text-muted">Actual Output:</span>{" "}
                                <span className="block mt-0.5 bg-bg-surface px-2 py-1 rounded truncate">
                                  {res.output || <span className="italic">none</span>}
                                </span>
                              </div>
                            </div>
                            <div className="text-[9px] text-text-muted text-right mt-1">
                              Time: {res.executionTime}ms
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 border-t border-border-default pt-6 flex flex-col gap-4">
              {!isFormValid && (
                <div className="p-4 bg-error-muted border border-error rounded-xl flex flex-col gap-2 animate-fade-in text-xs text-error font-sans leading-relaxed">
                  <span className="font-bold uppercase tracking-wider text-[10px]">
                    Action Required Before Submission:
                  </span>
                  <ul className="list-disc pl-4 flex flex-col gap-1">
                    {validationErrors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {isFormValid && !allPassed && (
                <div className="p-3 bg-warning-muted border border-warning rounded-xl text-xs text-warning leading-relaxed font-sans">
                  ⚠️ Your reference solution must compile and pass **all hidden test cases** before you can activate the lobby match!
                </div>
              )}

              <button
                type="button"
                onClick={handleSubmitProblem}
                disabled={!isFormValid || !isValidated || !allPassed || isSubmitting}
                className={`w-full py-3.5 rounded-xl text-sm font-bold tracking-wide uppercase transition-all duration-200 ${
                  isFormValid && isValidated && allPassed && !isSubmitting
                    ? "bg-primary text-text-primary hover:brightness-110 active:scale-[0.99] cursor-pointer"
                    : "bg-bg-surface border border-border-default text-text-muted cursor-not-allowed"
                }`}
              >
                {isSubmitting ? "Activating Room Lobby..." : "Validate & Activate Lobby Room"}
              </button>
            </div>
          </div>
        </section>

        <section className="bg-[#0e0e15] p-6 overflow-y-auto flex flex-col gap-6 select-none">
          <div className="flex justify-between items-center border-b border-border-default pb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-text-secondary">
              Live Preview
            </h2>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-xs font-medium text-text-secondary font-mono">Syncing Live</span>
            </div>
          </div>

          <div className="flex flex-col gap-4 bg-bg-surface border border-border-default rounded-xl p-5 shadow-xl">
            <div className="flex justify-between items-start gap-4">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-text-primary">
                  {title || "Untitled Challenge"}
                </h2>
                <div className="flex gap-2 mt-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      difficulty === "easy"
                        ? "bg-success-muted text-success"
                        : difficulty === "medium"
                        ? "bg-warning-muted text-warning"
                        : "bg-error-muted text-error"
                    }`}
                  >
                    {difficulty}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-bg-elevated text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                    {timeLimit} Mins
                  </span>
                </div>
              </div>
            </div>

            <div className="h-px bg-border-default" />

            <div className="prose max-w-none text-sm text-text-secondary leading-relaxed whitespace-pre-wrap min-h-24">
              {statement || (
                <span className="italic text-text-muted">
                  Type a description in the editor statement panel on the left to see it render here...
                </span>
              )}
            </div>

            {visibleExamples.some((ex) => ex.input.trim() || ex.output.trim()) && (
              <div className="flex flex-col gap-4 mt-2">
                <h3 className="text-sm font-bold text-text-primary">Examples</h3>
                {visibleExamples.map((ex, idx) => {
                  if (!ex.input.trim() && !ex.output.trim()) return null;
                  return (
                    <div
                      key={idx}
                      className="bg-bg-primary border border-border-default rounded-xl p-4 flex flex-col gap-2 font-mono text-xs"
                    >
                      <div className="font-semibold text-secondary text-[10px] uppercase tracking-wider">
                        Example {idx + 1}
                      </div>
                      <div className="text-text-secondary">
                        <span className="text-text-muted select-none">Input:</span>{" "}
                        {ex.input || <span className="italic text-text-muted">none</span>}
                      </div>
                      <div className="text-text-secondary">
                        <span className="text-text-muted select-none">Output:</span>{" "}
                        {ex.output || <span className="italic text-text-muted">none</span>}
                      </div>
                      {ex.explanation && (
                        <div className="text-text-secondary font-sans leading-relaxed border-t border-border-default pt-2 mt-1">
                          <span className="text-text-muted font-mono text-[10px] uppercase tracking-wider select-none block mb-0.5">
                            Explanation:
                          </span>
                          {ex.explanation}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default ProblemEditor;
