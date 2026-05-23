import React from "react";

function TestCaseRow({ index, testCase, onChange, onRemove, canRemove }) {
  const handleFieldChange = (field, value) => {
    onChange(index, { ...testCase, [field]: value });
  };

  return (
    <div className="p-4 bg-bg-surface border border-border-default rounded-xl flex flex-col gap-3 transition-colors duration-200 hover:border-primary relative animate-fade-in">
      <div className="flex justify-between items-center">
        <span className="text-xs font-semibold text-secondary tracking-wide uppercase font-sans">
          Test Case #{index + 1}
        </span>
        {canRemove && (
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="text-text-secondary hover:text-error transition-colors duration-150 p-1 rounded-lg hover:bg-bg-elevated"
            aria-label="Remove test case"
          >
            <svg
              className="w-4.5 h-4.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">
            Input Data
          </label>
          <textarea
            value={testCase.input}
            onChange={(e) => handleFieldChange("input", e.target.value)}
            placeholder="e.g. [2,7,11,15]\n9"
            rows="2"
            className="w-full bg-bg-primary border border-border-default rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-mono resize-none transition-colors duration-200"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">
            Expected Output
          </label>
          <textarea
            value={testCase.expectedOutput}
            onChange={(e) => handleFieldChange("expectedOutput", e.target.value)}
            placeholder="e.g. [0,1]"
            rows="2"
            className="w-full bg-bg-primary border border-border-default rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-mono resize-none transition-colors duration-200"
          />
        </div>
      </div>
    </div>
  );
}

export default TestCaseRow;
